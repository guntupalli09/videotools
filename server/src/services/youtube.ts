/**
 * YouTube ingestion service.
 *
 * Responsibilities:
 *   1. URL validation — strict hostname allow-list, no regex tricks (prevents subdomain spoofing)
 *   2. Metadata fetch — title, duration, thumbnail via @distube/ytdl-core (no download)
 *      Rejects: livestreams, private videos, zero-duration (deleted/unavailable)
 *   3. Audio streaming — ytdl audio-only Node stream → FFmpeg stdin → 16 kHz mono WAV (PCM)
 *      WAV/PCM is lossless and avoids MP3 compression artefacts that reduce Whisper accuracy.
 *
 * Architecture:
 *   YouTube stream → Node.js Readable → FFmpeg stdin (pipe:0) → 16 kHz mono WAV
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

/** Resolve yt-dlp binary: prefer YT_DLP_PATH env, then Docker default, then PATH. */
const YT_DLP_BIN: string = (() => {
  const envPath = process.env.YT_DLP_PATH
  if (envPath && fs.existsSync(envPath)) return envPath
  if (fs.existsSync('/usr/local/bin/yt-dlp')) return '/usr/local/bin/yt-dlp'
  return 'yt-dlp'
})()

// ─── URL Validation ──────────────────────────────────────────────────────────

/**
 * Strict allow-list of YouTube hostnames.
 * Using URL.hostname prevents subdomain-spoofing attacks like youtube.com.evil.com.
 */
const ALLOWED_YT_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
])

const VIDEO_ID_RE = /^[\w-]{11}$/

/** Parse hostname from URL; returns null on malformed input. */
function parseYoutubeHostname(url: string): string | null {
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

/**
 * Extract the 11-character video ID from any accepted YouTube URL form.
 * Returns null when no valid ID is found (playlists, channel pages, etc.).
 */
export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname

    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0]
      return VIDEO_ID_RE.test(id) ? id : null
    }

    if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
      // /watch?v=XXXXXXXXXXX
      const v = parsed.searchParams.get('v')
      if (v && VIDEO_ID_RE.test(v)) return v
      // /shorts/XXXXXXXXXXX
      const shorts = parsed.pathname.match(/^\/shorts\/([\w-]{11})/)
      if (shorts) return shorts[1]
      // /embed/XXXXXXXXXXX
      const embed = parsed.pathname.match(/^\/embed\/([\w-]{11})/)
      if (embed) return embed[1]
    }
  } catch {
    /* malformed URL */
  }
  return null
}

/**
 * Fast client-side URL check — no network call.
 * Validates hostname against the strict allow-list AND checks that a video ID is present.
 */
export function isValidYoutubeUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  const host = parseYoutubeHostname(trimmed)
  if (!host || !ALLOWED_YT_HOSTS.has(host)) return false
  return extractYoutubeVideoId(trimmed) !== null
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export interface YoutubeMetadata {
  title: string
  durationSec: number
  thumbnailUrl: string | undefined
  videoId: string
}

/**
 * Fetch video metadata from YouTube without downloading any media (~1–2 s).
 * Uses yt-dlp --dump-json which bypasses bot-detection far more reliably than ytdl-core.
 *
 * Throws a human-readable error for:
 *   - Livestreams (no fixed duration — would stream indefinitely in the worker)
 *   - Videos with zero/unknown duration (deleted, region-blocked, or unavailable)
 *   - Private/unavailable videos (yt-dlp exits non-zero; we surface the message)
 */
export async function getYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const raw = await new Promise<string>((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const proc = spawn(YT_DLP_BIN, [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout', '15',
      url.trim(),
    ])
    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('error', (err) => reject(new Error(`yt-dlp spawn error: ${err.message}`)))
    proc.on('close', (code) => {
      if (code !== 0) {
        // Surface the first meaningful yt-dlp error line (strip ANSI codes)
        const msg = stderr.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').find(Boolean) || `yt-dlp exited with code ${code}`
        reject(new Error(msg))
      } else {
        resolve(stdout)
      }
    })
  })

  let info: Record<string, any>
  try {
    info = JSON.parse(raw)
  } catch {
    throw new Error('Failed to parse yt-dlp metadata output.')
  }

  if (info.is_live) {
    throw new Error('Live streams cannot be transcribed. Wait for the recording to be published, then try again.')
  }

  const durationSec = Math.round(Number(info.duration) || 0)
  if (durationSec === 0) {
    throw new Error('Could not determine video duration. The video may be unavailable or still processing.')
  }

  // Prefer a medium-quality thumbnail (≤640px wide) to avoid huge images
  const thumbs: Array<{ url: string; width?: number }> = info.thumbnails || []
  const thumb = thumbs.find((t) => t.width && t.width <= 640) ?? thumbs[thumbs.length - 1]

  return {
    title: String(info.title || info.fulltitle || 'YouTube video'),
    durationSec,
    thumbnailUrl: thumb?.url ?? (typeof info.thumbnail === 'string' ? info.thumbnail : undefined),
    videoId: String(info.id),
  }
}

// ─── Audio Streaming ─────────────────────────────────────────────────────────

/** Hard timeout for the full YouTube stream + FFmpeg encode (10 minutes). */
const STREAM_TIMEOUT_MS = 10 * 60 * 1000

/**
 * Stream YouTube audio directly into FFmpeg and write a 16 kHz mono WAV to outputPath.
 *
 * Flow: ytdl (audio-only Node stream) → FFmpeg stdin (pipe:0) → 16 kHz mono PCM WAV
 *
 * WAV/PCM is chosen over MP3 because:
 *   - Lossless: no compression artefacts that reduce Whisper transcription accuracy
 *   - Whisper models natively expect PCM audio; WAV is the zero-overhead wrapper
 *   - The temp file is deleted immediately after transcription — file size is not a concern
 *
 * No full video download; only the audio track is streamed.
 * Works with any audio format YouTube serves (webm/opus, mp4/aac, …) — FFmpeg auto-detects.
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

    // Hard timeout: reject so the worker can fail + retry rather than hang forever
    const timeoutHandle = setTimeout(() => {
      log.error({ msg: 'yt_stream_timeout', outputPath })
      try { ffmpegProc.kill('SIGKILL') } catch { /* ignore */ }
      done(new Error('YouTube stream timed out after 10 minutes'))
    }, STREAM_TIMEOUT_MS)

    // ── 1. Start FFmpeg first so stdin is ready before bytes arrive ──────────
    const ffmpegProc = spawn(
      FFMPEG_BIN,
      [
        '-loglevel', 'error',   // quiet; errors still reach stderr
        '-i', 'pipe:0',         // read audio from stdin
        '-vn',                  // drop video track
        '-acodec', 'pcm_s16le', // 16-bit PCM — lossless, Whisper-native
        '-ar', '16000',         // 16 kHz sample rate — Whisper optimum
        '-ac', '1',             // mono
        '-f', 'wav',            // WAV container
        '-y',                   // overwrite if exists
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

    // EPIPE: FFmpeg exited before we finished writing — handle silently; 'close' fires next
    ffmpegProc.stdin!.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code !== 'EPIPE') {
        done(new Error(`FFmpeg stdin error: ${err.message}`))
      }
    })

    // ── 2. Stream audio-only from YouTube via yt-dlp → FFmpeg stdin ──────────
    const ytProc = spawn(
      YT_DLP_BIN,
      [
        '--no-playlist',
        '--no-warnings',
        '-f', 'bestaudio/best',
        '-o', '-',           // write to stdout
        '--socket-timeout', '30',
        url.trim(),
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )

    const ytStderrChunks: string[] = []
    ytProc.stderr.on('data', (chunk: Buffer) => ytStderrChunks.push(chunk.toString()))

    ytProc.on('error', (err) => {
      try { ffmpegProc.stdin!.destroy() } catch { /* ignore */ }
      done(new Error(`yt-dlp spawn error: ${err.message}`))
    })

    ytProc.on('close', (code) => {
      if (code !== 0 && !settled) {
        const msg = ytStderrChunks.join('').replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').find(Boolean) || `yt-dlp exited with code ${code}`
        try { ffmpegProc.stdin!.destroy() } catch { /* ignore */ }
        done(new Error(`yt-dlp error: ${msg}`))
      }
    })

    // ── 3. Pipe yt-dlp stdout → FFmpeg stdin ─────────────────────────────────
    ytProc.stdout.pipe(ffmpegProc.stdin!)

    log.info({ msg: 'yt_stream_started', url: url.slice(0, 50) })
  })
}
