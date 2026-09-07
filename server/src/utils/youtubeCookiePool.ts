import fs from 'fs'
import path from 'path'
import Redis from 'ioredis'
import { getLogger } from '../lib/logger'

const log = getLogger('worker')

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
})

redis.on('error', (err) => {
  log.warn({ msg: 'yt_cookie_pool_redis_error', error: err.message })
})

const KEY_POINTER = 'yt_cookie:rr_pointer'
const KEY_STATS_PREFIX = 'yt_cookie:stats:'
const KEY_COOLDOWN_PREFIX = 'yt_cookie:cooldown:'
const KEY_POOL_INVALID_UNTIL = 'yt_cookie:pool_invalid_until'
const DEFAULT_FILE = process.env.YOUTUBE_COOKIES_FILE || '/cookies/youtube.txt'
const MAX_EXPIRY_SKEW_SEC = Math.max(60, parseInt(process.env.YT_COOKIE_MIN_EXPIRY_SEC || '1800', 10))
const FAIL_THRESHOLD = Math.max(1, parseInt(process.env.YT_COOKIE_FAIL_THRESHOLD || '2', 10))
const COOLDOWN_MS = Math.max(60_000, parseInt(process.env.YT_COOKIE_COOLDOWN_MS || '1800000', 10))
const POOL_INVALID_MS = Math.max(60_000, parseInt(process.env.YT_COOKIE_POOL_INVALID_MS || '300000', 10))

export interface CookieCandidate {
  id: string
  filePath: string
  score: number
}

export interface CookieValidationResult {
  valid: boolean
  reason?: string
  requiredPresent: string[]
  earliestExpirySec: number | null
  cookieCount: number
}

const REQUIRED_KEYS = ['SAPISID', 'SID']

function parsePoolFromEnv(): string[] {
  const raw = process.env.YOUTUBE_COOKIE_FILES?.trim()
  if (!raw) return []
  return raw.split(',').map((p) => p.trim()).filter(Boolean)
}

function discoverCookieFiles(): string[] {
  const explicit = parsePoolFromEnv()
  if (explicit.length > 0) return Array.from(new Set(explicit))

  const defaultDir = path.dirname(DEFAULT_FILE)
  try {
    const entries = fs.readdirSync(defaultDir)
    const candidates = entries
      .filter((name) => /^youtube(?:_\d+)?\.txt$/i.test(name))
      .map((name) => path.join(defaultDir, name))
      .sort((a, b) => a.localeCompare(b))
    if (candidates.length > 0) return candidates
  } catch {
    // fallback below
  }
  return [DEFAULT_FILE]
}

function parseNetscape(filePath: string): Array<{ name: string; expiry: number }> {
  const out: Array<{ name: string; expiry: number }> = []
  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split('\n')
  for (const lineRaw of lines) {
    const line = lineRaw.trim()
    if (!line) continue
    const clean = line.startsWith('#HttpOnly_') ? line.slice('#HttpOnly_'.length) : line
    if (clean.startsWith('#')) continue
    const parts = clean.split('\t')
    if (parts.length < 7) continue
    const expiry = Number(parts[4])
    const name = parts[5]
    if (!name) continue
    out.push({ name, expiry: Number.isFinite(expiry) ? expiry : 0 })
  }
  return out
}

export function validateCookieFile(filePath: string): CookieValidationResult {
  if (!fs.existsSync(filePath)) {
    return { valid: false, reason: 'missing_file', requiredPresent: [], earliestExpirySec: null, cookieCount: 0 }
  }
  try {
    const parsed = parseNetscape(filePath)
    if (parsed.length === 0) {
      return { valid: false, reason: 'empty_or_unparseable', requiredPresent: [], earliestExpirySec: null, cookieCount: 0 }
    }
    const present = new Set(parsed.map((c) => c.name))
    const requiredPresent = REQUIRED_KEYS.filter((k) => present.has(k))
    if (requiredPresent.length === 0) {
      return { valid: false, reason: 'missing_required_tokens', requiredPresent: [], earliestExpirySec: null, cookieCount: parsed.length }
    }
    const nowSec = Math.floor(Date.now() / 1000)
    const expiries = parsed
      .filter((c) => REQUIRED_KEYS.includes(c.name) && c.expiry > 0)
      .map((c) => c.expiry)
      .sort((a, b) => a - b)
    const earliestExpirySec = expiries.length > 0 ? expiries[0] : null
    if (earliestExpirySec !== null && earliestExpirySec - nowSec < MAX_EXPIRY_SKEW_SEC) {
      return { valid: false, reason: 'near_expiry', requiredPresent, earliestExpirySec, cookieCount: parsed.length }
    }
    return { valid: true, requiredPresent, earliestExpirySec, cookieCount: parsed.length }
  } catch (err) {
    return { valid: false, reason: `parse_error:${(err as Error).message}`, requiredPresent: [], earliestExpirySec: null, cookieCount: 0 }
  }
}

async function cookieScore(filePath: string): Promise<number> {
  const statsKey = `${KEY_STATS_PREFIX}${filePath}`
  try {
    const stats = await redis.hgetall(statsKey)
    const success = Number(stats.success || 0)
    const failure = Number(stats.failure || 0)
    const total = success + failure
    if (total === 0) return 0.6
    const successRate = success / total
    const penalty = Math.min(0.4, failure * 0.03)
    return successRate - penalty
  } catch {
    return 0.5
  }
}

async function cooldownUntil(filePath: string): Promise<number> {
  const key = `${KEY_COOLDOWN_PREFIX}${filePath}`
  const until = Number(await redis.get(key).catch(() => '0') || 0)
  if (until > 0 && until <= Date.now()) {
    await redis
      .multi()
      .del(key)
      .hset(`${KEY_STATS_PREFIX}${filePath}`, 'consecutive_failure', '0')
      .exec()
      .catch(() => {})
    log.info({ msg: 'yt_cookie_reenabled_after_cooldown', cookieFile: filePath })
    return 0
  }
  return until
}

export async function selectYoutubeCookieCandidate(seed?: string): Promise<CookieCandidate | null> {
  const now = Date.now()
  const poolInvalidUntil = Number(await redis.get(KEY_POOL_INVALID_UNTIL).catch(() => '0') || 0)
  if (poolInvalidUntil > now) return null

  const files = discoverCookieFiles()
  const states = await Promise.all(files.map(async (filePath) => {
    const validation = validateCookieFile(filePath)
    const cooldown = await cooldownUntil(filePath)
    const score = await cookieScore(filePath)
    return { filePath, validation, cooldown, score }
  }))

  const valid = states.filter((s) => s.validation.valid && s.cooldown <= now)
  if (valid.length === 0) {
    const allInvalid = states.every((s) => !s.validation.valid)
    if (allInvalid) {
      await redis.set(KEY_POOL_INVALID_UNTIL, String(now + POOL_INVALID_MS), 'PX', POOL_INVALID_MS).catch(() => {})
    }
    return null
  }

  valid.sort((a, b) => b.score - a.score)
  const topScore = valid[0].score
  const bucket = valid.filter((s) => s.score >= topScore - 0.08)
  let idx = 0
  if (seed) {
    let hash = 0
    for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i)
    idx = Math.abs(hash) % bucket.length
  } else {
    const pointer = Number(await redis.incr(KEY_POINTER).catch(() => Math.floor(Math.random() * 1_000_000)))
    idx = pointer % bucket.length
  }

  const selected = bucket[idx]
  return {
    id: path.basename(selected.filePath, path.extname(selected.filePath)),
    filePath: selected.filePath,
    score: selected.score,
  }
}

export async function recordYoutubeCookieResult(
  filePath: string,
  success: boolean,
  errorCode?: string
): Promise<void> {
  const statsKey = `${KEY_STATS_PREFIX}${filePath}`
  const cooldownKey = `${KEY_COOLDOWN_PREFIX}${filePath}`
  const now = Date.now()
  try {
    if (success) {
      await redis
        .multi()
        .hincrby(statsKey, 'success', 1)
        .hset(statsKey, 'consecutive_failure', '0')
        .hset(statsKey, 'last_success_ts', String(now))
        .expire(statsKey, 14 * 24 * 60 * 60)
        .del(cooldownKey)
        .exec()
      return
    }

    const nextFailure = await redis.hincrby(statsKey, 'consecutive_failure', 1)
    await redis
      .multi()
      .hincrby(statsKey, 'failure', 1)
      .hset(statsKey, 'last_failure_ts', String(now))
      .hset(statsKey, 'last_error_code', errorCode || 'UNKNOWN')
      .expire(statsKey, 14 * 24 * 60 * 60)
      .exec()

    if (nextFailure >= FAIL_THRESHOLD) {
      await redis.set(cooldownKey, String(now + COOLDOWN_MS), 'PX', COOLDOWN_MS)
      log.warn({ msg: 'yt_cookie_marked_unhealthy', cookieFile: filePath, nextFailure, errorCode, cooldownMs: COOLDOWN_MS })
    }
  } catch {
    // fail-open
  }
}

export async function isCookiePoolUnavailable(): Promise<boolean> {
  const until = Number(await redis.get(KEY_POOL_INVALID_UNTIL).catch(() => '0') || 0)
  return until > Date.now()
}
