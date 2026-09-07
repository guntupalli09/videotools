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
import { randomUUID } from 'crypto'
import { acquireGlobalYtDlpPermit, applyYtRequestPacingSeeded } from '../utils/youtubeGlobalControl'
import { isProxyPoolDegraded, recordYoutubeProxyResult, selectYoutubeProxy } from '../utils/youtubeProxyPool'
import { recordYoutubeCookieResult, selectYoutubeCookieCandidate, validateCookieFile } from '../utils/youtubeCookiePool'

const log = getLogger('worker')

export type YoutubeAttemptType = 'direct' | 'cookies' | 'proxy'
export type YoutubeAttemptResult = 'success' | 'fail'
export type YoutubeErrorCode =
  | 'NO_CAPTIONS'
  | 'AUTH_REQUIRED'
  | 'GEO_BLOCKED'
  | 'RATE_LIMITED'
  | 'FORMAT_MISSING'
  | 'QUEUE_TIMEOUT'
  | 'STREAM_ERROR'
  | 'UNKNOWN'

export interface YoutubeAttemptRecord {
  stage: 'captions' | 'audio'
  type: YoutubeAttemptType
  result: YoutubeAttemptResult
  success: boolean
  latencyMs: number
  proxyId?: string
  cookieId?: string
  playerClient?: string
  errorCode?: YoutubeErrorCode
}

export interface YoutubeAttemptCollector {
  attempts?: YoutubeAttemptRecord[]
  proxyUsed?: boolean
  proxyId?: string
}

export interface YoutubeResolutionResult {
  resolutionPath: 'caption' | 'caption_patch' | 'audio_cookies' | 'audio_nocookie' | 'audio_proxy' | 'failed'
  errorCode: YoutubeErrorCode | null
  fallbackHistory: string[]
  confidence: number
  degradedExecution: boolean
  costEstimate: number
}

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

function classifyYoutubeFailure(msg: string): YoutubeErrorCode {
  const m = msg.toLowerCase()
  if (m.includes('sign in') || m.includes('confirm you\'re not a bot') || m.includes('login')) return 'AUTH_REQUIRED'
  if (m.includes('region') || m.includes('geo') || m.includes('country')) return 'GEO_BLOCKED'
  if (m.includes('http error 429') || m.includes('too many requests') || m.includes('rate limit')) return 'RATE_LIMITED'
  if (
    m.includes('requested format is not available') ||
    m.includes('no video formats found') ||
    m.includes('unable to extract player') ||
    m.includes('format not available')
  ) return 'FORMAT_MISSING'
  if (m.includes('queue timeout') || m.includes('semaphore acquire timeout')) return 'QUEUE_TIMEOUT'
  if (
    m.includes('timed out') ||
    m.includes('timeout') ||
    m.includes('connection reset') ||
    m.includes('network is unreachable') ||
    m.includes('http error 403') ||
    m.includes('signature') ||
    m.includes('forbidden')
  ) return 'STREAM_ERROR'
  return 'UNKNOWN'
}

function recordAttempt(
  collector: YoutubeAttemptCollector | undefined,
  attempt: YoutubeAttemptRecord
): void {
  if (!collector) return
  collector.attempts = collector.attempts || []
  collector.attempts.push(attempt)
}

function estimateYoutubePathCost(path: YoutubeResolutionResult['resolutionPath']): number {
  if (path === 'caption') return 0
  if (path === 'audio_cookies') return 1
  if (path === 'audio_nocookie') return 1
  if (path === 'audio_proxy') return 2
  return 3
}

/**
 * Build yt-dlp args array, injecting --cookies, --proxy, etc.
 * useCookiesOverride: false = never use cookies, true = always use if file exists,
 * undefined = respect YOUTUBE_SKIP_COOKIES env var.
 * useProxyOverride: false = never use proxy (for retry pattern: direct first, proxy on 3rd attempt).
 */
function ytDlpArgs(
  extra: string[],
  cookieFileOverride?: string | null,
  playerClientOverride?: string,
  useProxyOverride?: boolean,
  proxyUrlOverride?: string
): string[] {
  const skipCookies = process.env.YOUTUBE_SKIP_COOKIES === 'true' || process.env.YOUTUBE_SKIP_COOKIES === '1'
  const resolvedCookieFile = cookieFileOverride === undefined
    ? process.env.YOUTUBE_COOKIES_FILE
    : cookieFileOverride
  const cookiesArgs = !skipCookies && resolvedCookieFile && fs.existsSync(resolvedCookieFile)
    ? ['--cookies', resolvedCookieFile]
    : []
  const proxyUrl = proxyUrlOverride ?? process.env.YOUTUBE_PROXY?.trim()
  const useProxy = useProxyOverride ?? true
  const proxyArgs = proxyUrl && useProxy ? ['--proxy', proxyUrl] : []
  // Only pass --js-runtimes if Deno is actually installed — avoids "deno not found" yt-dlp errors
  const jsRuntime = DENO_BIN ? ['--js-runtimes', 'deno'] : []
  const playerClient = playerClientOverride ?? process.env.YOUTUBE_PLAYER_CLIENT
  const extractorArgs = playerClient !== ''
    ? ['--extractor-args', `youtube:player_client=${playerClient || 'web,android,tv_embedded'}`]
    : []
  const userAgent = ['--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36']
  return [...proxyArgs, ...cookiesArgs, ...jsRuntime, ...extractorArgs, ...userAgent, ...extra]
}

const YT_CLIENT_FALLBACK = ['web', 'android', 'tv_embedded'] as const
type YtDlpClient = typeof YT_CLIENT_FALLBACK[number]

function clientForAttempt(index: number): YtDlpClient {
  return YT_CLIENT_FALLBACK[index % YT_CLIENT_FALLBACK.length]
}

// ─── yt-dlp metadata fallback ─────────────────────────────────────────────────

async function getMetadataViaYtDlp(url: string): Promise<YoutubeMetadata> {
  const cleanUrl = normalizeYoutubeUrl(url)
  const permit = await acquireGlobalYtDlpPermit({ context: 'metadata', expectedDurationMs: 90_000, jobId: cleanUrl.slice(-16) })
  await applyYtRequestPacingSeeded(`metadata:${cleanUrl}`)
  const maxClientAttempts = Math.max(3, parseInt(process.env.YT_METADATA_CLIENT_ATTEMPTS || '3', 10))
  let finalError = new Error('yt-dlp metadata failed')
  const raw = await (async () => {
    try {
      for (let i = 0; i < maxClientAttempts; i++) {
        const client = clientForAttempt(i)
        const cookieCandidate = await selectYoutubeCookieCandidate(`metadata:${cleanUrl}:${i}`)
        const cookieFile = cookieCandidate && validateCookieFile(cookieCandidate.filePath).valid ? cookieCandidate.filePath : null
        try {
          const out = await new Promise<string>((resolve, reject) => {
            let stdout = ''
            let stderr = ''
            const proc = spawn(YT_DLP_BIN, ytDlpArgs([
              '--dump-json',
              '--no-playlist',
              '--no-warnings',
              '--socket-timeout', '15',
              cleanUrl,
            ], cookieFile, client, false))
            proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
            proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
            proc.on('error', (err) => reject(new Error(`yt-dlp spawn error: ${err.message}`)))
            proc.on('close', (code) => {
              if (code !== 0 && code !== null) reject(new Error(extractYtDlpErrorMessage(stderr, code)))
              else resolve(stdout)
            })
          })
          if (cookieFile) await recordYoutubeCookieResult(cookieFile, true).catch(() => {})
          return out
        } catch (err) {
          finalError = err as Error
          if (cookieFile) await recordYoutubeCookieResult(cookieFile, false, classifyYoutubeFailure(finalError.message)).catch(() => {})
        }
      }
      throw finalError
    } finally {
      await permit.release()
    }
  })()

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
  source: 'timedtext' | 'player_api' | 'ytdlp'
  sourceDetail?: string
}

export interface CaptionPatchWindow {
  start: number
  end: number
}

export interface CaptionDecision {
  action: 'accept' | 'patch' | 'fallback'
  score: number
  coverage: number
  segmentDensity: number
  alignmentScore: number
  duplicationPenalty: number
  languageConsistency: number
  maxGap: number
  patchWindows: CaptionPatchWindow[]
  reasons: string[]
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function buildCaptionPatchWindows(
  segments: { start: number; end: number; text: string }[],
  videoDurationSec: number
): CaptionPatchWindow[] {
  if (!videoDurationSec || videoDurationSec <= 0) return []
  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const windows: CaptionPatchWindow[] = []
  const minGapSec = Number(process.env.YOUTUBE_GAP_PATCH_MIN_SEC) || 10
  let cursor = 0
  for (const seg of sorted) {
    if (seg.start - cursor >= minGapSec) {
      windows.push({ start: cursor, end: seg.start })
    }
    cursor = Math.max(cursor, seg.end)
  }
  if (videoDurationSec - cursor >= minGapSec) {
    windows.push({ start: cursor, end: videoDurationSec })
  }
  // keep the largest N windows to cap patch compute
  const maxWindows = Math.max(1, parseInt(process.env.YOUTUBE_GAP_PATCH_MAX_WINDOWS || '8', 10))
  return windows
    .map((w) => ({ ...w, len: w.end - w.start }))
    .sort((a, b) => b.len - a.len)
    .slice(0, maxWindows)
    .map(({ start, end }) => ({ start, end }))
    .sort((a, b) => a.start - b.start)
}

/** Score caption quality and decide accept vs patch vs fallback. */
export function evaluateCaptionDecision(
  result: YoutubeCaptionResult,
  videoDurationSec: number,
  expectedLanguage?: string
): CaptionDecision {
  const quality = validateCaptionQuality(result.segments, videoDurationSec)
  const minutes = Math.max(videoDurationSec / 60, 1)
  // 12 segments/min is "dense enough" for near-complete spoken coverage in most long-form videos
  const segmentDensity = clamp01((quality.segmentCount / minutes) / 12)
  const gapPenalty = clamp01(quality.maxGap / 120)
  const sorted = [...result.segments].sort((a, b) => a.start - b.start)
  let overlapSec = 0
  let cpsPenalty = 0
  for (let i = 0; i < sorted.length; i++) {
    const curr = sorted[i]
    const dur = Math.max(0.05, curr.end - curr.start)
    const cps = curr.text.length / dur
    if (cps < 3 || cps > 28) cpsPenalty += 1
    if (i < sorted.length - 1) {
      const next = sorted[i + 1]
      if (curr.end > next.start) overlapSec += curr.end - next.start
    }
  }
  const overlapRatio = videoDurationSec > 0 ? clamp01(overlapSec / Math.max(videoDurationSec, 1)) : 0
  const cpsPenaltyRatio = sorted.length > 0 ? clamp01(cpsPenalty / sorted.length) : 1
  const alignmentScore = clamp01(1 - (0.7 * overlapRatio + 0.3 * cpsPenaltyRatio))

  const normalizedTexts = result.segments
    .map((s) => s.text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const uniqueCount = new Set(normalizedTexts).size
  const duplicationPenalty = normalizedTexts.length > 0
    ? clamp01(1 - uniqueCount / normalizedTexts.length)
    : 0

  const expected = expectedLanguage?.split('-')[0].toLowerCase()
  const sourceLang = result.sourceDetail?.split(':')[1]?.split('-')[0]?.toLowerCase()
  const languageConsistency = !expected || !sourceLang
    ? 0.85
    : expected === sourceLang
      ? 1
      : sourceLang.startsWith(expected) || expected.startsWith(sourceLang)
        ? 0.92
        : 0.55

  const sourceScore =
    result.source === 'player_api'
      ? 1
      : result.source === 'timedtext'
        ? 0.9
        : 0.8
  const score = clamp01(
    0.33 * quality.coverage +
    0.18 * segmentDensity +
    0.16 * alignmentScore +
    0.14 * languageConsistency +
    0.10 * sourceScore -
    0.14 * gapPenalty -
    0.09 * duplicationPenalty
  )

  const acceptThreshold = Number(process.env.YOUTUBE_DECISION_ACCEPT_THRESHOLD) || 0.8
  const patchThreshold = Number(process.env.YOUTUBE_DECISION_PATCH_THRESHOLD) || 0.5

  const patchWindows = buildCaptionPatchWindows(result.segments, videoDurationSec)
  const reasons: string[] = []
  if (quality.coverage < 0.7) reasons.push('low_coverage')
  if (quality.maxGap > 20) reasons.push('large_gaps')
  if (quality.segmentCount < 10) reasons.push('low_segment_count')
  if (segmentDensity < 0.5) reasons.push('low_density')
  if (alignmentScore < 0.6) reasons.push('poor_alignment')
  if (duplicationPenalty > 0.35) reasons.push('high_duplication')
  if (languageConsistency < 0.7) reasons.push('language_mismatch')

  const action = score >= acceptThreshold
    ? 'accept'
    : score >= patchThreshold && patchWindows.length > 0
      ? 'patch'
      : 'fallback'

  return {
    action,
    score,
    coverage: quality.coverage,
    segmentDensity,
    alignmentScore,
    duplicationPenalty,
    languageConsistency,
    maxGap: quality.maxGap,
    patchWindows,
    reasons,
  }
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
    return { fullText, segments, source: 'timedtext', sourceDetail: language }
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
      log.info({
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
    return { fullText, segments, source: 'player_api', sourceDetail: `${clientName}:${track.languageCode}:${track.kind ?? 'manual'}` }
  } catch {
    return null
  }
}

/**
 * Fetch YouTube captions without downloading video/audio.
 *
 * Strict deterministic strategy:
 *   1. timedtext by language order
 *   2. player API WEB
 *   3. player API ANDROID
 *   4. player API TVHTML5
 *   5. player API IOS
 *
 * Returns null when no captions are available. Caller then moves to yt-dlp cookies path.
 */
export async function fetchYoutubeCaptions(
  url: string,
  _outputDir: string,
  language?: string,
  videoDurationSec?: number,
  defaultLanguage?: string,
  _collector?: YoutubeAttemptCollector
): Promise<YoutubeCaptionResult | null> {
  const cleanUrl = normalizeYoutubeUrl(url)
  const videoId = extractYoutubeVideoId(cleanUrl)
  const langOrder = getCaptionLanguageOrder(language, defaultLanguage)
  const minCoverage = Number(process.env.YOUTUBE_CAPTION_MIN_COVERAGE) || 0.7
  const duration = videoDurationSec ?? 0

  if (!videoId) return null

  // Fast path: timedtext first — single HTTP GET, typically 1–3s when captions exist
  for (const lang of langOrder) {
    const result = await fetchTimedtextCaptions(videoId, lang)
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

  // Strict deterministic order: WEB -> ANDROID -> TVHTML5 -> IOS (sequential only).
  for (const client of ['ANDROID', 'TVHTML5', 'IOS'] as const) {
    const result = await fetchCaptionsViaPlayerApiClient(videoId, language, client, defaultLanguage)
    if (!result) continue
    const validation = validateCaptionQuality(result.segments, duration)
    if (validation.valid || (validation.coverage >= minCoverage && validation.segmentCount >= 10)) {
      return result
    }
  }

  return null
}

// ─── Audio Streaming ─────────────────────────────────────────────────────────

/** Hard timeout for the full YouTube stream + FFmpeg encode (10 minutes). */
const STREAM_TIMEOUT_MS = 10 * 60 * 1000

async function detectImmediateProxyNeed(url: string): Promise<YoutubeErrorCode | null> {
  const probeTimeoutMs = Math.max(5_000, parseInt(process.env.YT_PROXY_PROBE_TIMEOUT_MS || '8000', 10))
  return new Promise<YoutubeErrorCode | null>((resolve) => {
    let stderr = ''
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      try { proc.kill('SIGKILL') } catch { /* ignore */ }
      resolve(null)
    }, probeTimeoutMs)
    const proc = spawn(YT_DLP_BIN, ytDlpArgs([
      '--simulate',
      '--skip-download',
      '--no-playlist',
      '--no-warnings',
      '--socket-timeout', '10',
      url,
    ], null, 'web', false))
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('close', (code) => {
      if (done) return
      done = true
      clearTimeout(timer)
      if (code === 0) return resolve(null)
      const msg = extractYtDlpErrorMessage(stderr, code ?? -1)
      const errCode = classifyYoutubeFailure(msg)
      if (errCode === 'AUTH_REQUIRED' || errCode === 'GEO_BLOCKED') return resolve(errCode)
      resolve(null)
    })
    proc.on('error', () => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(null)
    })
  })
}

/**
 * Stream YouTube audio directly into FFmpeg and write a 16 kHz mono WAV to outputPath.
 *
 * Deterministic strategy:
 *   1) cookies (direct)
 *   2) proxy fallback only for AUTH_REQUIRED / GEO_BLOCKED
 */
export async function streamYoutubeAudioToFile(
  url: string,
  outputPath: string,
  collector?: YoutubeAttemptCollector
): Promise<YoutubeResolutionResult> {
  const cleanUrl = normalizeYoutubeUrl(url)
  const skipCookies = process.env.YOUTUBE_SKIP_COOKIES === 'true' || process.env.YOUTUBE_SKIP_COOKIES === '1'
  const hasProxy = !!(process.env.YOUTUBE_PROXY?.trim() || process.env.YOUTUBE_PROXY_POOL?.trim())
  const startedAt = Date.now()
  const fallbackHistory: string[] = ['caption:fallback', 'audio:resilient']
  let degradedExecution = false

  log.info({ msg: 'yt_path_transition', from: 'caption', to: 'audio_resilient' })
  const maxClientAttempts = Math.max(3, parseInt(process.env.YT_CLIENT_MAX_ATTEMPTS || '3', 10))
  let attempts = 0
  let streamErrors = 0
  let formatErrors = 0
  let usedProxy = false
  let finalErrorCode: YoutubeErrorCode = 'UNKNOWN'
  let forcedProxyReason: YoutubeErrorCode | null = null

  if (hasProxy) {
    forcedProxyReason = await detectImmediateProxyNeed(cleanUrl).catch(() => null)
    if (forcedProxyReason) {
      fallbackHistory.push(`audio:proxy_immediate:${forcedProxyReason}`)
      log.info({ msg: 'yt_proxy_immediate_escalation', reason: forcedProxyReason })
    }
  }

  const runAttempt = async (
    stage: 'cookie' | 'nocookie' | 'proxy',
    proxyUrl?: string,
    proxyId?: string
  ): Promise<YoutubeResolutionResult | null> => {
    const attemptStarted = Date.now()
    const client = clientForAttempt(attempts)
    attempts += 1
    const cookieCandidate = stage === 'cookie' && !skipCookies ? await selectYoutubeCookieCandidate(`${cleanUrl}:${attempts}`) : null
    const cookieValidation = cookieCandidate ? validateCookieFile(cookieCandidate.filePath) : null
    const cookieFile = cookieCandidate && cookieValidation?.valid ? cookieCandidate.filePath : null
    const attemptType: YoutubeAttemptType = proxyUrl ? 'proxy' : (stage === 'nocookie' ? 'direct' : 'cookies')
    try {
      degradedExecution = await doStreamYoutubeAudio(cleanUrl, outputPath, {
        cookieFile,
        playerClient: client,
        useProxy: !!proxyUrl,
        proxyUrl,
      })
      recordAttempt(collector, {
        stage: 'audio',
        type: attemptType,
        result: 'success',
        success: true,
        latencyMs: Date.now() - attemptStarted,
        playerClient: client,
        cookieId: cookieCandidate?.id,
        ...(proxyId && { proxyId }),
      })
      if (cookieFile) {
        await recordYoutubeCookieResult(cookieFile, true).catch(() => {})
      }
      if (proxyId) {
        await recordYoutubeProxyResult(proxyId, true).catch(() => {})
        if (collector) {
          collector.proxyUsed = true
          collector.proxyId = proxyId
        }
      }
      const resolutionPath = proxyUrl ? 'audio_proxy' : (stage === 'nocookie' ? 'audio_nocookie' : 'audio_cookies')
      const costEstimate = estimateYoutubePathCost(resolutionPath)
      log.info({
        msg: 'yt_resolution_metrics',
        path_used: resolutionPath,
        fallback_depth: fallbackHistory.length,
        proxy_used: !!proxyUrl,
        error_code: null,
        degraded_execution: degradedExecution,
        cost_estimate: costEstimate,
        latency_ms: Date.now() - startedAt,
        player_client: client,
        cookie_id: cookieCandidate?.id,
      })
      return { resolutionPath, errorCode: null, fallbackHistory, confidence: proxyUrl ? 0.64 : 0.72, degradedExecution, costEstimate }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const code = classifyYoutubeFailure(msg)
      finalErrorCode = code
      if (code === 'STREAM_ERROR') streamErrors += 1
      if (code === 'FORMAT_MISSING') formatErrors += 1
      if (cookieFile) {
        await recordYoutubeCookieResult(cookieFile, false, code).catch(() => {})
      }
      if (proxyId) {
        await recordYoutubeProxyResult(proxyId, false).catch(() => {})
      }
      recordAttempt(collector, {
        stage: 'audio',
        type: attemptType,
        result: 'fail',
        success: false,
        latencyMs: Date.now() - attemptStarted,
        playerClient: client,
        cookieId: cookieCandidate?.id,
        errorCode: code,
        ...(proxyId && { proxyId }),
      })
      log.warn({
        msg: 'yt_attempt_failed',
        error_code: code,
        player_client: client,
        proxy_used: !!proxyUrl,
        proxy_id: proxyId,
        cookie_id: cookieCandidate?.id,
      })
      return null
    }
  }

  if (!forcedProxyReason) {
    for (let i = 0; i < maxClientAttempts; i++) {
      const success = await runAttempt('cookie')
      if (success) return success
      fallbackHistory.push(`audio:cookie_client_switch:${clientForAttempt(i)}`)
    }

    for (let i = 0; i < maxClientAttempts; i++) {
      const success = await runAttempt('nocookie')
      if (success) return success
      fallbackHistory.push(`audio:nocookie_client_switch:${clientForAttempt(i)}`)
    }
  }

  const shouldUseProxy = hasProxy && (
    !!forcedProxyReason ||
    (['AUTH_REQUIRED', 'GEO_BLOCKED', 'RATE_LIMITED'] as YoutubeErrorCode[]).includes(finalErrorCode) ||
    streamErrors >= 2 ||
    formatErrors >= 1 ||
    attempts >= maxClientAttempts
  )
  if (!shouldUseProxy) {
    log.info({
      msg: 'yt_resolution_metrics',
      path_used: 'failed',
      fallback_depth: fallbackHistory.length,
      proxy_used: false,
      error_code: finalErrorCode,
      degraded_execution: degradedExecution,
      cost_estimate: estimateYoutubePathCost('failed'),
      latency_ms: Date.now() - startedAt,
    })
    throw new Error(`YouTube audio extraction failed [${finalErrorCode}]`)
  }

  fallbackHistory.push('audio:proxy')
  const selectedProxy = await selectYoutubeProxy()
  if (!selectedProxy) {
    if (await isProxyPoolDegraded()) log.warn({ msg: 'yt_proxy_pool_degraded', stage: 'audio_proxy' })
    throw new Error(`YouTube audio extraction failed [${finalErrorCode}]`)
  }

  usedProxy = true
  for (let i = 0; i < maxClientAttempts; i++) {
    const success = await runAttempt('proxy', selectedProxy.url, selectedProxy.id)
    if (success) return success
    fallbackHistory.push(`audio:proxy_client_switch:${clientForAttempt(i)}`)
  }

  log.info({
    msg: 'yt_resolution_metrics',
    path_used: 'failed',
    fallback_depth: fallbackHistory.length,
    proxy_used: usedProxy,
    error_code: finalErrorCode,
    degraded_execution: degradedExecution,
    cost_estimate: estimateYoutubePathCost('failed'),
    latency_ms: Date.now() - startedAt,
  })
  throw new Error(`YouTube audio extraction failed [${finalErrorCode}]`)
}

function doStreamYoutubeAudio(
  url: string,
  outputPath: string,
  options: {
    cookieFile?: string | null
    playerClient: YtDlpClient
    useProxy: boolean
    proxyUrl?: string
  }
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let settled = false
    let releasePermit: (() => Promise<void>) | null = null
    let leaseMonitor: NodeJS.Timeout | null = null
    let ytProc: import('child_process').ChildProcess | null = null
    let degradedExecution = false
    const done = (err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutHandle)
      if (leaseMonitor) {
        clearInterval(leaseMonitor)
        leaseMonitor = null
      }
      if (releasePermit) {
        releasePermit().catch(() => {})
        releasePermit = null
      }
      if (err) reject(err)
      else resolve(degradedExecution)
    }

    // Hard timeout: reject so the worker can fail + retry rather than hang forever
    const timeoutHandle = setTimeout(() => {
      log.error({ msg: 'yt_stream_timeout', outputPath })
      try { ytProc?.kill('SIGKILL') } catch { /* ignore */ }
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
    const acquireTimeoutMs = Math.max(30_000, Math.min(60_000, parseInt(process.env.YT_DLP_SEMAPHORE_ACQUIRE_MAX_WAIT_MS || '45000', 10)))
    const acquireTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`yt-dlp semaphore queue timeout after ${acquireTimeoutMs}ms`)), acquireTimeoutMs)
    )
    Promise.race([
      acquireGlobalYtDlpPermit({ context: 'audio', expectedDurationMs: STREAM_TIMEOUT_MS, jobId: url.slice(-16) }),
      acquireTimeout,
    ]).then(async (permit) => {
      releasePermit = permit.release
      leaseMonitor = setInterval(() => {
        if (permit.isLeaseValid()) return
        degradedExecution = true
        log.error({
          msg: 'semaphore_lease_lost',
          degraded_execution: true,
          outputPath,
          workerId: permit.workerId,
          leaseId: permit.leaseId,
          jobId: permit.jobId,
          ttlMs: permit.ttlMs,
        })
        clearInterval(leaseMonitor!)
        leaseMonitor = null
      }, 5_000)
      leaseMonitor.unref?.()
      await applyYtRequestPacingSeeded(`audio:${url}`)
      ytProc = spawn(
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
          options.cookieFile,
          options.playerClient,
          options.useProxy,
          options.proxyUrl
        ),
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )

      const ytStderrChunks: string[] = []
      ytProc.stderr!.on('data', (chunk: Buffer) => ytStderrChunks.push(chunk.toString()))

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
          return
        }
        if (degradedExecution) {
          log.warn({ msg: 'yt_stream_completed_in_degraded_execution', outputPath, jobId: permit.jobId, leaseId: permit.leaseId })
        }
      })

      // ── 3. Pipe yt-dlp stdout → FFmpeg stdin ─────────────────────────────────
      ytProc.stdout!.pipe(ffmpegProc.stdin!)
    }).catch((err) => done(new Error(`yt-dlp limiter error: ${String(err).includes('queue timeout') ? `QUEUE_TIMEOUT: ${String(err)}` : String(err)}`)))

    log.info({ msg: 'yt_stream_started', url: url.slice(0, 50) })
  })
}
