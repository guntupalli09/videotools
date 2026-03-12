/**
 * YouTube ingestion service.
 *
 * Responsibilities:
 *   1. URL validation — strict hostname allow-list, no regex tricks (prevents subdomain spoofing)
 *   2. Metadata fetch — YouTube Data API v3 (primary, official, zero bot-detection) with
 *      yt-dlp --dump-json fallback when no API key is configured.
 *   3. Audio streaming — yt-dlp (audio-only stdout) → FFmpeg stdin → 16 kHz mono WAV (PCM)
 *      WAV/PCM is lossless and avoids MP3 compression artefacts that reduce Whisper accuracy.
 *
 * Architecture:
 *   Metadata:  YouTube Data API v3 → (fallback) yt-dlp --dump-json
 *   Streaming: yt-dlp -f bestaudio -o - | ffmpeg → 16 kHz mono WAV
 *
 * Bot-detection strategy (same approach used by Descript, Otter.ai, etc.):
 *   - Metadata: YouTube Data API v3 is an official OAuth2/API-key endpoint — never blocked.
 *     Set YOUTUBE_API_KEY env var. Free quota: 10,000 units/day; video.list costs 1 unit.
 *   - Streaming: yt-dlp with a real account cookies file bypasses all bot checks.
 *     Set YOUTUBE_COOKIES_FILE env var to the path of a Netscape-format cookies.txt exported
 *     from a real Google account (e.g. via "Get cookies.txt LOCALLY" Chrome extension).
 *     Without cookies, yt-dlp still works for most public videos but may fail on some regions.
 *
 * The API layer only calls getYoutubeMetadata() (< 2 s, no download).
 * The worker calls streamYoutubeAudioToFile() which does the full stream → encode.
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

// ─── YouTube Data API v3 metadata (primary — official, zero bot-detection) ───

/**
 * Fetch metadata via YouTube Data API v3.
 * Returns null when YOUTUBE_API_KEY is not set (caller falls back to yt-dlp).
 * Throws on API errors (invalid key, quota exceeded, video not found).
 */
async function getMetadataViaDataApi(videoId: string): Promise<YoutubeMetadata | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return null

  const url = `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(videoId)}&part=snippet,contentDetails,liveStreamingDetails&key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(`YouTube Data API error ${res.status}: ${body?.error?.message ?? res.statusText}`)
  }

  const data = await res.json() as {
    items?: Array<{
      id: string
      snippet: { title: string; thumbnails: Record<string, { url: string; width: number }> }
      contentDetails: { duration: string }  // ISO 8601, e.g. PT1H3M42S
      liveStreamingDetails?: { actualEndTime?: string }
    }>
  }

  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found. It may be private, deleted, or region-restricted.')
  }

  const item = data.items[0]
  const isLive = !item.liveStreamingDetails?.actualEndTime &&
    item.contentDetails.duration === 'P0D'
  if (isLive) {
    throw new Error('Live streams cannot be transcribed. Wait for the recording to be published, then try again.')
  }

  // Parse ISO 8601 duration (PT1H3M42S) to seconds
  const iso = item.contentDetails.duration
  const durationSec = (() => {
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!m) return 0
    return (parseInt(m[1] || '0') * 3600) + (parseInt(m[2] || '0') * 60) + parseInt(m[3] || '0')
  })()

  if (durationSec === 0) {
    throw new Error('Could not determine video duration. The video may be unavailable or still processing.')
  }

  const thumbs = item.snippet.thumbnails
  const thumb = thumbs.medium ?? thumbs.high ?? thumbs.default ?? Object.values(thumbs)[0]

  return {
    title: item.snippet.title,
    durationSec,
    thumbnailUrl: thumb?.url,
    videoId: item.id,
  }
}

// ─── yt-dlp metadata fallback ─────────────────────────────────────────────────

/**
 * Extract the real error from yt-dlp stderr.
 * yt-dlp often prints "[youtube] Extracting URL: ..." first; the actual error is usually on a later line.
 * When it fails early, stderr may only contain "Extracting URL" (silent-fail) — use full stderr then.
 */
function extractYtDlpErrorMessage(stderr: string, exitCode: number): string {
  const cleaned = stderr.replace(/\x1b\[[0-9;]*m/g, '').trim()
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean)
  const errorLine = lines.find((l) => /^ERROR:/i.test(l) || /error:/i.test(l))
  if (errorLine) return errorLine
  if (lines.length > 1) return lines[lines.length - 1]
  const first = lines[0] || ''
  // Silent-fail: only "Extracting URL" — stderr has no useful error; include full output for debugging
  if (/\[youtube\]\s*Extracting URL/i.test(first) && lines.length <= 1) {
    const full = cleaned.slice(-1200).trim()
    return full ? `extraction failed (stderr): ${full}` : `yt-dlp exited ${exitCode} (no error text). Try YOUTUBE_COOKIES_FILE or update yt-dlp.`
  }
  return first || `yt-dlp exited with code ${exitCode}`
}

/** Build yt-dlp args array, injecting --cookies if YOUTUBE_COOKIES_FILE is set. */
function ytDlpArgs(extra: string[]): string[] {
  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE
  const cookiesArgs = cookiesFile && fs.existsSync(cookiesFile)
    ? ['--cookies', cookiesFile]
    : []
  // Deno for YouTube n/sig challenge solving (required since ~2025)
  const jsRuntime = ['--js-runtimes', 'deno']
  // Try android then web — often bypasses web bot detection (March 2026). Set YOUTUBE_PLAYER_CLIENT="" to disable.
  const playerClient = process.env.YOUTUBE_PLAYER_CLIENT
  const extractorArgs = playerClient !== ''  // undefined or custom value → add; "" → disable
    ? ['--extractor-args', `youtube:player_client=${playerClient || 'android,web'}`]
    : []
  return [...cookiesArgs, ...jsRuntime, ...extractorArgs, ...extra]
}

async function getMetadataViaYtDlp(url: string): Promise<YoutubeMetadata> {
  const raw = await new Promise<string>((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const proc = spawn(YT_DLP_BIN, ytDlpArgs([
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout', '15',
      url.trim(),
    ]))
    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('error', (err) => reject(new Error(`yt-dlp spawn error: ${err.message}`)))
    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        const msg = extractYtDlpErrorMessage(stderr, code)
        reject(new Error(msg))
      } else {
        resolve(stdout)
      }
    })
  })

  let info: Record<string, any>
  try { info = JSON.parse(raw) } catch { throw new Error('Failed to parse yt-dlp metadata output.') }

  if (info.is_live) {
    throw new Error('Live streams cannot be transcribed. Wait for the recording to be published, then try again.')
  }

  const durationSec = Math.round(Number(info.duration) || 0)
  if (durationSec === 0) {
    throw new Error('Could not determine video duration. The video may be unavailable or still processing.')
  }

  const thumbs: Array<{ url: string; width?: number }> = info.thumbnails || []
  const thumb = thumbs.find((t) => t.width && t.width <= 640) ?? thumbs[thumbs.length - 1]

  return {
    title: String(info.title || info.fulltitle || 'YouTube video'),
    durationSec,
    thumbnailUrl: thumb?.url ?? (typeof info.thumbnail === 'string' ? info.thumbnail : undefined),
    videoId: String(info.id),
  }
}

// ─── Public metadata entry point ─────────────────────────────────────────────

/**
 * Fetch video metadata from YouTube without downloading any media (~1–2 s).
 *
 * Strategy (same as Descript / Otter.ai):
 *   1. YouTube Data API v3 — official, quota-based, never blocked. Requires YOUTUBE_API_KEY env.
 *   2. yt-dlp --dump-json — reliable fallback; uses YOUTUBE_COOKIES_FILE if set.
 *
 * Throws a human-readable error for livestreams, private, deleted, or region-blocked videos.
 */
export async function getYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const videoId = extractYoutubeVideoId(url)

  // Primary: YouTube Data API v3 (zero bot-detection, official quota)
  if (videoId && process.env.YOUTUBE_API_KEY) {
    return getMetadataViaDataApi(videoId) as Promise<YoutubeMetadata>
  }

  // Fallback: yt-dlp (with cookies if configured)
  return getMetadataViaYtDlp(url)
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
      ytDlpArgs([
        '--no-playlist',
        '--no-warnings',
        '-f', 'bestaudio/best',
        '-o', '-',           // write to stdout
        '--socket-timeout', '30',
        url.trim(),
      ]),
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )

    const ytStderrChunks: string[] = []
    ytProc.stderr.on('data', (chunk: Buffer) => ytStderrChunks.push(chunk.toString()))

    ytProc.on('error', (err) => {
      try { ffmpegProc.stdin!.destroy() } catch { /* ignore */ }
      done(new Error(`yt-dlp spawn error: ${err.message}`))
    })

    ytProc.on('close', (code) => {
      if (code !== 0 && code !== null && !settled) {
        const stderr = ytStderrChunks.join('')
        const msg = extractYtDlpErrorMessage(stderr, code)
        log.error({ msg: 'yt_stream_stderr', stderr: stderr.slice(-2000), url: url.slice(0, 80) })
        try { ffmpegProc.stdin!.destroy() } catch { /* ignore */ }
        done(new Error(`yt-dlp error: ${msg}`))
      }
    })

    // ── 3. Pipe yt-dlp stdout → FFmpeg stdin ─────────────────────────────────
    ytProc.stdout.pipe(ffmpegProc.stdin!)

    log.info({ msg: 'yt_stream_started', url: url.slice(0, 50) })
  })
}
