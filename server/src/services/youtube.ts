/**
 * YouTube ingestion service.
 *
 * Responsibilities:
 *   1. URL validation (regex, no network call)
 *   2. Metadata fetch — title, duration, thumbnail via @distube/ytdl-core (quick info call, no download)
 *   3. Audio streaming — ytdl audio-only Node stream → FFmpeg stdin → 16 kHz mono MP3 on disk
 *
 * Architecture:
 *   YouTube stream → Node.js Readable → FFmpeg stdin (pipe:0) → 16 kHz mono MP3
 *
 * The API layer only calls getYoutubeMetadata() (< 2 s, no download).
 * The worker calls streamYoutubeAudioToFile() which does the full stream → encode.
 * This keeps the API thread non-blocking and satisfies the distributed-worker constraint —
 * the job queue carries only the URL; the worker fetches the audio itself.
 *
 * Docker note: no system binaries required — @distube/ytdl-core is pure Node.js.
 * For maximum reliability in production you can swap the stream source to yt-dlp by
 * replacing ytdl(...) with spawn('yt-dlp', ['--no-playlist', '-x', '-o', '-', url]).stdout
 * and installing yt-dlp in your Docker image (apt-get install yt-dlp or pip install yt-dlp).
 */

import ytdl from '@distube/ytdl-core'
import { spawn } from 'child_process'
import { getLogger } from '../lib/logger'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import fs from 'fs'

const log = getLogger('worker')

/** Resolve FFmpeg binary: prefer FFMPEG_PATH env (Docker-installed binary), else npm installer. */
export const FFMPEG_BIN: string = (() => {
  const envPath = process.env.FFMPEG_PATH
  if (envPath && fs.existsSync(envPath)) return envPath
  return ffmpegInstaller.path
})()

// ─── URL Validation ──────────────────────────────────────────────────────────

const YOUTUBE_URL_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/(watch\?.*[?&]v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{11}/

/** Fast regex check — no network call. */
export function isValidYoutubeUrl(url: string): boolean {
  return YOUTUBE_URL_RE.test(url.trim())
}

/** Extract video ID from a YouTube URL. Returns null when not found. */
export function extractYoutubeVideoId(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{11})/) ||
    url.match(/youtu\.be\/([\w-]{11})/) ||
    url.match(/shorts\/([\w-]{11})/) ||
    url.match(/embed\/([\w-]{11})/)
  return m ? m[1] : null
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export interface YoutubeMetadata {
  title: string
  durationSec: number
  thumbnailUrl: string | undefined
  videoId: string
}

/**
 * Fetch video metadata from YouTube without downloading any media.
 * Makes one network call (~1–2 s).  Throws on private/age-gated/deleted videos.
 */
export async function getYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const info = await ytdl.getInfo(url.trim())
  const durationSec = parseInt(info.videoDetails.lengthSeconds, 10) || 0
  // Prefer a medium-quality thumbnail; fall back to the last (highest res) entry
  const thumbs = info.videoDetails.thumbnails || []
  const thumb =
    thumbs.find((t) => t.width && t.width <= 640) ?? thumbs[thumbs.length - 1]
  return {
    title: info.videoDetails.title,
    durationSec,
    thumbnailUrl: thumb?.url,
    videoId: info.videoDetails.videoId,
  }
}

// ─── Audio Streaming ─────────────────────────────────────────────────────────

/** Timeout (ms) for the full YouTube stream + FFmpeg encode. Matches HUNG_JOB_MS. */
const STREAM_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes max

/**
 * Stream YouTube audio directly into FFmpeg and write a 16 kHz mono MP3 to outputPath.
 *
 * Flow: ytdl (audio-only Node stream) → FFmpeg stdin (pipe:0) → 16 kHz mono MP3
 *
 * No full video download; only the audio track is streamed.
 * Works with any audio format YouTube serves (webm/opus, mp4/aac, etc.) — FFmpeg auto-detects.
 */
export function streamYoutubeAudioToFile(
  url: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    const done = (err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutHandle)
      if (err) reject(err)
      else resolve()
    }

    // Hard timeout: if the stream stalls, reject so the worker can fail + retry
    const timeoutHandle = setTimeout(() => {
      log.error({ msg: 'yt_stream_timeout', outputPath })
      try { ffmpegProc.kill('SIGKILL') } catch { /* ignore */ }
      done(new Error('YouTube stream timed out after 10 minutes'))
    }, STREAM_TIMEOUT_MS)

    // ── 1. Start FFmpeg first so stdin is ready before bytes arrive ──────────
    const ffmpegProc = spawn(
      FFMPEG_BIN,
      [
        '-loglevel', 'error',          // quiet; errors still reach stderr
        '-i', 'pipe:0',                // read from stdin
        '-vn',                         // drop video
        '-acodec', 'libmp3lame',
        '-ar', '16000',                // 16 kHz — optimal for Whisper
        '-ac', '1',                    // mono
        '-q:a', '5',                   // VBR ~130 kbps — good quality/size balance
        '-f', 'mp3',
        '-y',                          // overwrite
        outputPath,
      ],
      { stdio: ['pipe', 'ignore', 'pipe'] }
    )

    const stderrChunks: string[] = []
    ffmpegProc.stderr.on('data', (chunk: Buffer) =>
      stderrChunks.push(chunk.toString())
    )

    ffmpegProc.on('close', (code) => {
      if (code === 0) {
        done()
      } else {
        const stderr = stderrChunks.join('').slice(-1500)
        done(new Error(`FFmpeg exited ${code}. stderr: ${stderr}`))
      }
    })

    ffmpegProc.on('error', (err) => done(new Error(`FFmpeg spawn error: ${err.message}`)))

    // EPIPE: ffmpeg exited before we finished writing — handle silently; 'close' fires next
    ffmpegProc.stdin!.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') {
        done(new Error(`FFmpeg stdin error: ${err.message}`))
      }
    })

    // ── 2. Request audio-only stream from YouTube ────────────────────────────
    let audioStream: ReturnType<typeof ytdl>
    try {
      audioStream = ytdl(url.trim(), {
        quality: 'lowestaudio',
        filter: 'audioonly',
        // Raise high-water mark so ytdl buffers more aggressively — reduces stalls
        highWaterMark: 1 << 25, // 32 MB
      })
    } catch (err) {
      done(new Error(`ytdl init error: ${(err as Error).message}`))
      return
    }

    audioStream.on('error', (err) => {
      try { ffmpegProc.stdin!.destroy() } catch { /* ignore */ }
      done(new Error(`YouTube stream error: ${err.message}`))
    })

    // ── 3. Pipe YouTube audio → FFmpeg stdin ─────────────────────────────────
    audioStream.pipe(ffmpegProc.stdin!)

    log.info({ msg: 'yt_stream_started', url: url.slice(0, 50) })
  })
}
