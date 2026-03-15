/**
 * YouTube ingestion service.
 *
 * Responsibilities:
 *   1. URL validation — strict hostname allow-list, no regex tricks (prevents subdomain spoofing)
 *   2. Metadata fetch — YouTube Data API v3 (primary, official, zero bot-detection) with
 *      yt-dlp --dump-json fallback when no API key is configured.
 *   3. Caption fetch — YouTube player API first (no bot detection, works from datacenter IPs);
 *      yt-dlp fallback when captions unavailable.
 *   4. Audio streaming — yt-dlp (audio-only stdout) → FFmpeg stdin → 16 kHz mono WAV (PCM)
 *      when captions are insufficient. WAV/PCM is lossless for Whisper accuracy.
 *
 * Architecture (same approach as Descript, TurboScribe):
 *   Metadata:  YouTube Data API v3 → (fallback) yt-dlp --dump-json
 *   Captions: YouTube player API (youtubei/v1/player) → (fallback) yt-dlp --write-auto-sub
 *   Audio:    yt-dlp -f bestaudio -o - | ffmpeg → 16 kHz mono WAV (only when no captions)
 *
 * Bot-detection strategy:
 *   - Metadata: YOUTUBE_API_KEY → official API, never blocked.
 *   - Captions:  Player API uses public endpoints — works from datacenter IPs.
 *   - Audio:    yt-dlp from datacenter IPs is often blocked. Solutions:
 *     1. YOUTUBE_PROXY — residential proxy (http://user:pass@host:port or socks5://...).
 *        Same approach used by production transcription services.
 *     2. YOUTUBE_COOKIES_FILE — cookies from a real account; helps but may still fail
 *        when IP differs from where cookies were created.
 *
 * The API layer only calls getYoutubeMetadata() (< 2 s, no download).
 * The worker calls fetchYoutubeCaptions() first; if captions suffice, skips audio entirely.
 * Otherwise calls streamYoutubeAudioToFile() for Whisper transcription.
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

/** Deno binary path — used for YouTube n/sig JS challenge decryption. Checked once at startup. */
const DENO_BIN: string | null = (() => {
  // Dockerfile installs to /usr/local/bin/deno; also check common PATH locations
  for (const p of ['/usr/local/bin/deno', '/usr/bin/deno', process.env.DENO_INSTALL ? `${process.env.DENO_INSTALL}/bin/deno` : null].filter(Boolean) as string[]) {
    if (fs.existsSync(p)) return p
  }
  return null
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
  /** Video's default/original language from YouTube (e.g. "en"). Used for caption fallback. */
  defaultLanguage?: string
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
      snippet: {
        title: string
        thumbnails: Record<string, { url: string; width: number }>
        defaultAudioLanguage?: string
        defaultLanguage?: string
      }
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

  const defaultLanguage = item.snippet.defaultAudioLanguage ?? item.snippet.defaultLanguage

  return {
    title: item.snippet.title,
    durationSec,
    thumbnailUrl: thumb?.url,
    videoId: item.id,
    defaultLanguage,
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
 * Build yt-dlp args array, injecting --cookies, --proxy, etc.
 * useCookiesOverride: false = never use cookies, true = always use if file exists,
 * undefined = respect YOUTUBE_SKIP_COOKIES env var.
 * useProxyOverride: false = never use proxy (for retry pattern: direct first, proxy on 3rd attempt).
 */
function ytDlpArgs(
  extra: string[],
  useCookiesOverride?: boolean,
  useProxyOverride?: boolean
): string[] {
  const skipCookies = process.env.YOUTUBE_SKIP_COOKIES === 'true' || process.env.YOUTUBE_SKIP_COOKIES === '1'
  const cookiesFile = process.env.YOUTUBE_COOKIES_FILE
  const useCookies = useCookiesOverride ?? !skipCookies
  const cookiesArgs = useCookies && cookiesFile && fs.existsSync(cookiesFile)
    ? ['--cookies', cookiesFile]
    : []
  const proxyUrl = process.env.YOUTUBE_PROXY?.trim()
  const useProxy = useProxyOverride ?? true
  const proxyArgs = proxyUrl && useProxy ? ['--proxy', proxyUrl] : []
  // Only pass --js-runtimes if Deno is actually installed — avoids "deno not found" yt-dlp errors
  const jsRuntime = DENO_BIN ? ['--js-runtimes', 'deno'] : []
  const playerClient = process.env.YOUTUBE_PLAYER_CLIENT
  const extractorArgs = playerClient !== ''
    ? ['--extractor-args', `youtube:player_client=${playerClient || 'android,web'}`]
    : []
  const userAgent = ['--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36']
  return [...proxyArgs, ...cookiesArgs, ...jsRuntime, ...extractorArgs, ...userAgent, ...extra]
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

  const defaultLanguage = typeof info.language === 'string' ? info.language : undefined

  return {
    title: String(info.title || info.fulltitle || 'YouTube video'),
    durationSec,
    thumbnailUrl: thumb?.url ?? (typeof info.thumbnail === 'string' ? info.thumbnail : undefined),
    videoId: String(info.id),
    defaultLanguage,
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
  const cleanUrl = normalizeYoutubeUrl(url)
  const videoId = extractYoutubeVideoId(cleanUrl)

  // Primary: YouTube Data API v3 (zero bot-detection, official quota)
  if (videoId && process.env.YOUTUBE_API_KEY) {
    return getMetadataViaDataApi(videoId) as Promise<YoutubeMetadata>
  }

  // Fallback: yt-dlp (with cookies if configured)
  return getMetadataViaYtDlp(cleanUrl)
}

// ─── Caption fetching (skip Whisper when captions exist) ─────────────────────

/** Parse VTT timestamp "00:00:01.234 --> 00:00:05.678" to seconds. */
function parseVttTimestamp(s: string): number {
  // Strip position/alignment cue settings (e.g. "00:00:01.234 align:start")
  const clean = s.split(' ')[0].trim()
  const m = clean.match(/(\d+):(\d+):(\d+)[.,](\d+)/) || clean.match(/(\d+):(\d+)[.,](\d+)/)
  if (!m) return 0
  if (m.length === 5) return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / 1000
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + parseInt(m[3], 10) / 1000
}

/**
 * Parse VTT content into timed segments.
 * Handles YouTube-specific quirks:
 *   - Strips inline timing tags like <00:00:01.200> and formatting tags <c>, <b>, <i>
 *   - Deduplicates YouTube's "rolling caption" format where each cue extends the previous
 */
function parseVttToSegments(content: string): { start: number; end: number; text: string }[] {
  const raw: { start: number; end: number; text: string }[] = []
  const blocks = content.split(/\n\s*\n/).filter((b) => b.trim())

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    const timeLine = lines.find((l) => /-->/.test(l))
    if (!timeLine) continue
    const [startStr, endStr] = timeLine.split(/\s*-->\s*/).map((x) => x.trim())
    const start = parseVttTimestamp(startStr)
    const end = parseVttTimestamp(endStr)
    const text = lines
      .filter((l) => l !== timeLine && !l.startsWith('WEBVTT') && !/^\d+$/.test(l.trim()) && l.trim())
      .join(' ')
      // Strip YouTube inline timing tags like <00:00:01.234> and <c>, </c>, <b>, </b>, etc.
      .replace(/<[\d:.]+>/g, '')
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
    if (text) raw.push({ start, end, text })
  }

  // Deduplicate YouTube "rolling captions":
  // Auto-generated captions show an expanding window — each cue prefixes the next.
  // Keep only cues whose text is NOT a strict prefix of the following cue.
  const deduped: { start: number; end: number; text: string }[] = []
  for (let i = 0; i < raw.length; i++) {
    const curr = raw[i]
    const next = raw[i + 1]
    // If next cue starts the same text and extends it, the current is a rolling duplicate
    if (next && next.text.startsWith(curr.text) && next.text.length > curr.text.length) {
      continue // skip — the next cue has the full sentence
    }
    deduped.push(curr)
  }

  return deduped
}

export interface YoutubeCaptionResult {
  fullText: string
  segments: { start: number; end: number; text: string }[]
}

/** Language fallback order: requested → English → original → auto. */
function getCaptionLanguageOrder(requested?: string, original?: string): string[] {
  const req = (requested || 'en').split('-')[0].toLowerCase()
  const orig = original?.split('-')[0].toLowerCase()
  const seen = new Set<string>()
  const order: string[] = []
  for (const lang of [req, 'en', orig].filter((x): x is string => Boolean(x))) {
    if (!seen.has(lang)) {
      seen.add(lang)
      order.push(lang)
    }
  }
  return order
}

/** Caption quality validation. Rules: coverage >= 70%, max_gap <= 20s, segment_count >= 10. */
export function validateCaptionQuality(
  segments: { start: number; end: number; text: string }[],
  videoDurationSec: number
): { valid: boolean; coverage: number; maxGap: number; segmentCount: number } {
  const segmentCount = segments.length
  const captionDuration = segments.reduce((sum, s) => sum + (s.end - s.start), 0)
  const coverage = videoDurationSec > 0 ? captionDuration / videoDurationSec : 0
  const sorted = [...segments].sort((a, b) => a.start - b.start)
  let maxGap = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].start - sorted[i - 1].end
    if (gap > maxGap) maxGap = gap
  }
  const valid = coverage >= 0.70 && maxGap <= 20 && segmentCount >= 10
  return { valid, coverage, maxGap, segmentCount }
}

// ─── Timedtext endpoint (legacy, no token for some videos) ───────────────────

/**
 * Fetch captions via YouTube's undocumented timedtext API.
 * Works for some videos without token; often fails for newer content. Fast cheap request.
 */
async function fetchTimedtextCaptions(
  videoId: string,
  language: string = 'en'
): Promise<YoutubeCaptionResult | null> {
  try {
    const url = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(videoId)}&lang=${encodeURIComponent(language)}&fmt=vtt`
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return null
    const content = await res.text()
    if (!content.includes('WEBVTT')) return null
    const segments = parseVttToSegments(content)
    if (segments.length === 0) return null
    const fullText = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim()
    log.info({ msg: 'yt_caption_timedtext_hit', videoId, language, segmentCount: segments.length })
    return { fullText, segments }
  } catch {
    return null
  }
}

// ─── Primary: YouTube player API (no yt-dlp, no bot detection) ───────────────
//
// YouTube's internal player API returns pre-signed caption track URLs.
// These don't require authentication and work from any IP — including datacenter.

// Per-client IDs and versions for the youtubei/v1/player API.
// X-YouTube-Client-Name must match the numeric ID for the client; using '1' (WEB)
// for non-WEB clients causes YouTube to ignore or reject the body client hint.
const YT_CLIENTS = {
  WEB:     { id: '1',  version: '2.20240304.01.00' },
  ANDROID: { id: '3',  version: '19.09.37' },
  TVHTML5: { id: '7',  version: '7.20240304.12.00' },
  IOS:     { id: '5',  version: '19.09.3' },
} as const
type YtClientName = keyof typeof YT_CLIENTS

/**
 * Fetch caption tracks from YouTube's internal player API for a given client.
 * No yt-dlp, no cookies, no bot detection — works reliably from datacenter IPs.
 */
async function fetchCaptionsViaPlayerApiClient(
  videoId: string,
  language: string | undefined,
  clientName: YtClientName,
  defaultLanguage?: string
): Promise<YoutubeCaptionResult | null> {
  const client = YT_CLIENTS[clientName]
  try {
    const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'X-YouTube-Client-Name': client.id,
        'X-YouTube-Client-Version': client.version,
        'Origin': 'https://www.youtube.com',
        'Referer': `https://www.youtube.com/watch?v=${videoId}`,
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName,
            clientVersion: client.version,
            hl: 'en',
            gl: 'US',
          },
        },
      }),
      signal: AbortSignal.timeout(12_000),
    })

    if (!playerRes.ok) return null

    const playerData = await playerRes.json() as Record<string, any>

    // Detect bot-check / login-required responses (HTTP 200 but no usable data)
    const playabilityStatus = playerData?.playabilityStatus?.status as string | undefined
    if (playabilityStatus && playabilityStatus !== 'OK' && playabilityStatus !== 'LIVE_STREAM_OFFLINE') {
      log.warn({
        msg: 'yt_player_api_blocked',
        videoId,
        clientName,
        status: playabilityStatus,
        reason: playerData?.playabilityStatus?.reason ?? 'unknown',
      })
      return null
    }

    const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks as Array<{
      baseUrl: string
      languageCode: string
      kind?: string
    }> | undefined

    if (!tracks || tracks.length === 0) return null

    const langOrder = getCaptionLanguageOrder(language, defaultLanguage)
    const manual = tracks.filter((t) => t.kind !== 'asr')
    const asr = tracks.filter((t) => t.kind === 'asr')
    const byLangOrder = (arr: typeof tracks) => {
      for (const lang of langOrder) {
        const t =
          arr.find((x) => x.languageCode.toLowerCase() === lang) ||
          arr.find((x) => x.languageCode.toLowerCase().startsWith(lang))
        if (t) return t
      }
      return arr.find((x) => x.languageCode === 'en') ?? arr[0]
    }
    const track = byLangOrder(manual) ?? byLangOrder(asr) ?? byLangOrder(tracks)

    if (!track?.baseUrl) return null

    const captionUrl = track.baseUrl.includes('fmt=')
      ? track.baseUrl.replace(/fmt=[^&]+/, 'fmt=vtt')
      : `${track.baseUrl}&fmt=vtt`

    const captionRes = await fetch(captionUrl, { signal: AbortSignal.timeout(10_000) })
    if (!captionRes.ok) return null

    const content = await captionRes.text()
    if (!content.includes('WEBVTT')) return null

    const segments = parseVttToSegments(content)
    if (segments.length === 0) return null

    const fullText = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim()
    log.info({
      msg: 'yt_caption_player_hit',
      videoId,
      clientName,
      languageCode: track.languageCode,
      kind: track.kind ?? 'manual',
      segmentCount: segments.length,
    })
    return { fullText, segments }
  } catch {
    return null
  }
}

/**
 * Fetch caption tracks from YouTube player API with client rotation.
 * Tries WEB, ANDROID, TVHTML5, IOS until one succeeds.
 */
async function fetchCaptionsViaPlayerApi(
  videoId: string,
  language?: string,
  defaultLanguage?: string
): Promise<YoutubeCaptionResult | null> {
  for (const clientName of Object.keys(YT_CLIENTS) as YtClientName[]) {
    const result = await fetchCaptionsViaPlayerApiClient(videoId, language, clientName, defaultLanguage)
    if (result) return result
  }
  log.debug({ msg: 'yt_player_api_all_clients_failed', videoId })
  return null
}

// ─── Fallback: yt-dlp caption fetch ──────────────────────────────────────────

/** Hard timeout for yt-dlp caption fetch (20 seconds). If captions exist they were
 *  already retrieved via timedtext or player API; yt-dlp is a last-resort fallback
 *  that rarely succeeds from datacenter IPs, so fail fast. */
const CAPTION_YTDLP_TIMEOUT_MS = 20_000

async function fetchCaptionsViaYtDlp(
  cleanUrl: string,
  outputDir: string,
  language?: string,
  defaultLanguage?: string
): Promise<YoutubeCaptionResult | null> {
  const outTemplate = path.join(outputDir, 'yt_%(id)s')
  const langOrder = getCaptionLanguageOrder(language, defaultLanguage)
  const subLangs = langOrder.map((l) => `${l},${l}.*`).join(',') + ',en-US'

  return new Promise((resolve) => {
    let settled = false
    const done = (result: YoutubeCaptionResult | null) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutHandle)
      resolve(result)
    }

    // Hard timeout: kill yt-dlp if it hangs (Deno init stall, network hang, etc.)
    const timeoutHandle = setTimeout(() => {
      log.warn({ msg: 'yt_captions_ytdlp_timeout', url: cleanUrl.slice(0, 50) })
      try { proc.kill('SIGKILL') } catch { /* ignore */ }
      done(null)
    }, CAPTION_YTDLP_TIMEOUT_MS)

    let stderr = ''
    // Pass false for useCookies — caption endpoints don't need cookies
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
    proc.on('error', () => done(null))
    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        log.debug({ msg: 'yt_captions_ytdlp_unavailable', stderr: stderr.slice(-400) })
        return done(null)
      }
      const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.vtt') && f.startsWith('yt_'))
      if (files.length === 0) return done(null)
      const vttPath = path.join(outputDir, files[0])
      try {
        const content = fs.readFileSync(vttPath, 'utf-8')
        fs.unlinkSync(vttPath)
        const segments = parseVttToSegments(content)
        if (segments.length === 0) return done(null)
        const fullText = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim()
        log.info({ msg: 'yt_caption_ytdlp_hit', segmentCount: segments.length, url: cleanUrl.slice(0, 50) })
        done({ fullText, segments })
      } catch {
        try { fs.unlinkSync(vttPath) } catch { /* ignore */ }
        done(null)
      }
    })
  })
}

/**
 * Fetch YouTube captions without downloading video/audio.
 *
 * Strategy (same as Descript / Turboscribe):
 *   1. Player API + timedtext in parallel — accept first valid result.
 *   2. yt-dlp fallback — sub-langs: requested → en → original (caption language order).
 *
 * Returns null when no captions are available → caller falls back to audio download + Whisper.
 */
export async function fetchYoutubeCaptions(
  url: string,
  outputDir: string,
  language?: string,
  videoDurationSec?: number,
  defaultLanguage?: string
): Promise<YoutubeCaptionResult | null> {
  const cleanUrl = normalizeYoutubeUrl(url)
  const videoId = extractYoutubeVideoId(cleanUrl)
  const langOrder = getCaptionLanguageOrder(language, defaultLanguage)
  const minCoverage = Number(process.env.YOUTUBE_CAPTION_MIN_COVERAGE) || 0.7
  const duration = videoDurationSec ?? 0

  if (!videoId) return fetchCaptionsViaYtDlp(cleanUrl, outputDir, language, defaultLanguage)

  // Fast path: timedtext in parallel — fire all language requests at once (was sequential: 3 × 8s)
  const timedtextResults = await Promise.all(langOrder.map((lang) => fetchTimedtextCaptions(videoId, lang)))
  for (const result of timedtextResults) {
    if (!result) continue
    const validation = validateCaptionQuality(result.segments, duration)
    if (validation.valid || (validation.coverage >= minCoverage && validation.segmentCount >= 10)) {
      return result
    }
  }

  // Player API (no bot detection; works from datacenter) — try WEB only first for speed
  const playerResult = await fetchCaptionsViaPlayerApiClient(videoId, language, 'WEB', defaultLanguage)
  if (playerResult) {
    const validation = validateCaptionQuality(playerResult.segments, duration)
    if (validation.valid || (validation.coverage >= minCoverage && validation.segmentCount >= 10)) {
      return playerResult
    }
  }

  // Try remaining player clients (ANDROID, TVHTML5, IOS) in parallel — worst-case ~8s, not 24s
  const [android, tv, ios] = await Promise.all([
    fetchCaptionsViaPlayerApiClient(videoId, language, 'ANDROID', defaultLanguage),
    fetchCaptionsViaPlayerApiClient(videoId, language, 'TVHTML5', defaultLanguage),
    fetchCaptionsViaPlayerApiClient(videoId, language, 'IOS', defaultLanguage),
  ])
  for (const result of [android, tv, ios]) {
    if (!result) continue
    const validation = validateCaptionQuality(result.segments, duration)
    if (validation.valid || (validation.coverage >= minCoverage && validation.segmentCount >= 10)) {
      return result
    }
  }

  return fetchCaptionsViaYtDlp(cleanUrl, outputDir, language, defaultLanguage)
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
  const hasCookies = !!(cookiesFile && fs.existsSync(cookiesFile)) && !skipCookies
  const hasProxy = !!(process.env.YOUTUBE_PROXY?.trim())

  // Playbook: proxy + cookies = the combination that reliably works from datacenter IPs.
  // Start with it immediately — trying without proxy first wastes 10 min on a guaranteed failure.
  if (hasProxy) {
    log.info({ msg: 'yt_stream_proxy', url: cleanUrl.slice(0, 50) })
    await doStreamYoutubeAudio(cleanUrl, outputPath, hasCookies, true)
    return
  }

  // No proxy configured: try direct (works in dev / residential environments).
  try {
    await doStreamYoutubeAudio(cleanUrl, outputPath, false, false)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (!isRetryableWithCookiesError(msg) || !hasCookies) throw err
    log.info({ msg: 'yt_retry_with_cookies', url: cleanUrl.slice(0, 50) })
    await doStreamYoutubeAudio(cleanUrl, outputPath, true, false)
  }
}

function doStreamYoutubeAudio(
  url: string,
  outputPath: string,
  useCookies: boolean,
  useProxy: boolean
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
      ytDlpArgs(
        [
          '--no-playlist',
          '--no-warnings',
          '-f', 'bestaudio/best',
          '-o', '-',
          '--socket-timeout', '30',
          url,
        ],
        useCookies,
        useProxy
      ),
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
