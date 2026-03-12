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
 * Bot-detection strategy (same approach used by Descript, <Otter.ai>, etc.):
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

import { spawn } from 'child_process'
import path from 'path'
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
 * Using URL.hostname prevents subdomain-spoofing attacks like <youtube.com.evil.com>.
 */
const ALLOWED_YT_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
])

const VIDEO_ID_RE = /^[\w-]{11}$/

/**
 * Normalize to canonical URL with only video ID. Avoids playlist/list params (?si=, ?list=, &t=).
 */
export function normalizeYoutubeUrl(url: string): string {
  const trimmed = url.trim()
  try {
    const u = new URL(trimmed)
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.slice(1).split('/')[0]
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : trimmed
    }
    const id = u.searchParams.get('v')
    if (id && /^[\w-]{11}$/.test(id)) return `https://www.youtube.com/watch?v=${id}`
    return trimmed
  } catch {
    return trimmed
  }
}

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

// ─── yt-dlp helpers ───────────────────────────────────────────────────────────

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

const RETRYABLE_WITH_COOKIES = [
  /page needs to be reloaded/i,
  /sign in to confirm you're not a bot/i,
  /sign in/i,
  /http error 403/i,
  /video unavailable/i,
  /unable to extract/i,
  /unable to extract player/i,
]
const NOT_RETRYABLE = [
  /private video/i,
  /video is private/i,
  /deleted video/i,
  /video has been removed/i,
]

/** Errors that may be fixed by retrying with cookies. Skip retry for private/deleted. */
function isRetryableWithCookiesError(msg: string): boolean {
  if (NOT_RETRYABLE.some((r) => r.test(msg))) return false
  return RETRYABLE_WITH_COOKIES.some((r) => r.test(msg))
}

/**
 * Build yt-dlp args array, injecting --cookies unless YOUTUBE_SKIP_COOKIES=true.
 * useCookiesOverride: false = never use cookies, true = always use if file exists,
 * undefined = respect YOUTUBE_SKIP_COOKIES env var.
 */
function ytDlpArgs(extra: string[], useCookiesOverride?: boolean): string[] {
  const skipCookies = process.env.YOUTUBE_SKIP_COOKIES === 'true' || process.env.YOUTUBE_SKIP_COOKIES === '1'
  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE
  const useCookies = useCookiesOverride ?? !skipCookies
  const cookiesArgs = useCookies && cookiesFile && fs.existsSync(cookiesFile)
    ? ['--cookies', cookiesFile]
    : []
  const jsRuntime = ['--js-runtimes', 'deno']
  const playerClient = process.env.YOUTUBE_PLAYER_CLIENT
  const extractorArgs = playerClient !== ''
    ? ['--extractor-args', `youtube:player_client=${playerClient || 'android,web'}`]
    : []
  const userAgent = ['--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36']
  return [...cookiesArgs, ...jsRuntime, ...extractorArgs, ...userAgent, ...extra]
}

// ─── yt-dlp metadata fallback ─────────────────────────────────────────────────

async function getMetadataViaYtDlp(url: string): Promise<YoutubeMetadata> {
  const cleanUrl = normalizeYoutubeUrl(url)
  const raw = await new Promise<string>((resolve, reject) => {
    let stdout = ''
    let stderr = ''
    const proc = spawn(YT_DLP_BIN, ytDlpArgs([
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout', '15',
      cleanUrl,
    ]))
    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('error', (err) => reject(new Error(`yt-dlp spawn error: ${err.message}`)))
    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(extractYtDlpErrorMessage(stderr, code)))
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
 * Strategy (same as Descript / <Otter.ai>):
 *   1. YouTube Data API v3 — official, quota-based, never blocked. Requires YOUTUBE_API_KEY env.
 *   2. yt-dlp --dump-json — reliable fallback; uses YOUTUBE_COOKIES_FILE if set.
 *
 * Throws a human-readable error for livestreams, private, deleted, or region-blocked videos.
 */
export async function getYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
  const cleanUrl = normalizeYoutubeUrl(url)
  const videoId = extractYoutubeVideoId(cleanUrl)

  // Primary: YouTube Data API v3 (zero bot-detection, official quota)
  if (videoId && process.env.YOUTUBE_API_KEY) {
    return getMetadataViaDataApi(videoId) as Promise<YoutubeMetadata>
  }

  // Fallback: yt-dlp (with cookies if configured)
  return getMetadataViaYtDlp(cleanUrl)
}

// ─── Caption fallback (skip Whisper when captions exist) ─────────────────────

/** Parse VTT timestamp "00:00:01.234 --> 00:00:05.678" to seconds. */
function parseVttTimestamp(s: string): number {
  const m = s.match(/(\d+):(\d+):(\d+)\.(\d+)/) || s.match(/(\d+):(\d+)\.(\d+)/) || s.match(/(\d+)\.(\d+)/)
  if (!m) return 0
  if (m.length === 5) return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / 1000
  if (m.length === 4) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + parseInt(m[3], 10) / 1000
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 1000
}

/** Parse VTT content to segments. */
function parseVttToSegments(content: string): { start: number; end: number; text: string }[] {
  const segments: { start: number; end: number; text: string }[] = []
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim())
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    const timeLine = lines.find((l) => /-->/.test(l))
    if (!timeLine) continue
    const [startStr, endStr] = timeLine.split(/\s*-->\s*/).map((x) => x.trim())
    const start = parseVttTimestamp(startStr)
    const end = parseVttTimestamp(endStr)
    const text = lines
      .filter((l) => l !== timeLine && !l.startsWith('WEBVTT') && !/^\d+$/.test(l.trim()))
      .join(' ')
      .trim()
    if (text) segments.push({ start, end, text })
  }
  return segments
}

export interface YoutubeCaptionResult {
  fullText: string
  segments: { start: number; end: number; text: string }[]
}

/**
 * Fetch YouTube captions (auto or manual) without downloading video/audio.
 * Returns null if no captions. Use to skip Whisper for faster, cheaper transcription.
 */
export async function fetchYoutubeCaptions(
  url: string,
  outputDir: string,
  language?: string
): Promise<YoutubeCaptionResult | null> {
  const cleanUrl = normalizeYoutubeUrl(url)
  const outTemplate = path.join(outputDir, 'yt_%(id)s')
  const subLangs = language ? `${language},${language}.*,en,en.*,en-US` : 'en,en.*,en-US'

  return new Promise((resolve) => {
    let stderr = ''
    const proc = spawn(YT_DLP_BIN, ytDlpArgs([
      '--write-auto-sub',
      '--write-sub',
      '--skip-download',
      '--no-playlist',
      '--no-warnings',
      '--sub-langs', subLangs,
      '--convert-subs', 'vtt',
      '-o', outTemplate,
      '--socket-timeout', '15',
      cleanUrl,
    ], false))
    proc.stdout.on('data', () => {})
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('error', () => resolve(null))
    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        log.debug({ msg: 'yt_captions_unavailable', stderr: stderr.slice(-500) })
        return resolve(null)
      }
      const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.vtt') && f.startsWith('yt_'))
      if (files.length === 0) return resolve(null)
      const vttPath = path.join(outputDir, files[0])
      try {
        const content = fs.readFileSync(vttPath, 'utf-8')
        fs.unlinkSync(vttPath)
        const segments = parseVttToSegments(content)
        if (segments.length === 0) return resolve(null)
        const fullText = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim()
        log.info({ msg: 'yt_captions_used', segmentCount: segments.length, url: cleanUrl.slice(0, 50) })
        resolve({ fullText, segments })
      } catch {
        try { fs.unlinkSync(vttPath) } catch { /* ignore */ }
        resolve(null)
      }
    })
  })
}

// ─── Audio Streaming ─────────────────────────────────────────────────────────

/** Hard timeout for the full YouTube stream + FFmpeg encode (10 minutes). */
const STREAM_TIMEOUT_MS = 10 * 60 * 1000

/**
 * Stream YouTube audio directly into FFmpeg and write a 16 kHz mono WAV to outputPath.
 *
 * Strategy: try without cookies first (avoids "page needs to be reloaded" from stale cookies).
 * On bot/sign-in errors, retry with cookies if YOUTUBE_COOKIES_FILE exists.
 */
export async function streamYoutubeAudioToFile(
  url: string,
  outputPath: string
): Promise<void> {
  const cleanUrl = normalizeYoutubeUrl(url)
  const skipCookies = process.env.YOUTUBE_SKIP_COOKIES === 'true' || process.env.YOUTUBE_SKIP_COOKIES === '1'
  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE
  const hasCookies = !!(cookiesFile && fs.existsSync(cookiesFile))

  try {
    await doStreamYoutubeAudio(cleanUrl, outputPath, false)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isRetryableWithCookiesError(msg) && hasCookies && !skipCookies) {
      log.info({ msg: 'yt_retry_with_cookies', url: cleanUrl.slice(0, 50) })
      await doStreamYoutubeAudio(cleanUrl, outputPath, true)
    } else {
      throw err
    }
  }
}

function doStreamYoutubeAudio(
  url: string,
  outputPath: string,
  useCookies: boolean
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
        '-o', '-',
        '--socket-timeout', '30',
        url,
      ], useCookies),
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