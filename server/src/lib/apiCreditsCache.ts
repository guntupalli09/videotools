/**
 * API credits cache — fetches and caches OpenAI credit balance and Resend email usage.
 * Cached in Redis for 3 hours. Refreshed on a 3-hour cron in index.ts.
 *
 * OpenAI: fetches billing/credit_grants (prepaid credit balance).
 * Resend:  tracked locally via Redis counter (incremented on every send).
 */

import Redis from 'ioredis'
import { getLogger } from './logger'

const log = getLogger('api').child({ module: 'api-credits' })

const CACHE_KEY = 'videotext:api_credits:cache'
const CACHE_TTL_SEC = 3 * 60 * 60  // 3 hours

const RESEND_COUNTER_PREFIX = 'videotext:resend:sent'  // key: videotext:resend:sent:YYYY-MM

// ── Redis singleton (lazy, best-effort) ─────────────────────────────────────

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  const url = process.env.REDIS_URL
  if (!url) return null
  try {
    _redis = new Redis(url, {
      ...(url.startsWith('rediss://') ? { tls: {} } : {}),
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5_000,
      commandTimeout: 3_000,
      lazyConnect: true,
    })
    _redis.on('error', () => { /* suppress */ })
    return _redis
  } catch {
    return null
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface OpenAiCredits {
  totalGrantedUsd: number | null   // total prepaid credits ever granted
  totalUsedUsd: number | null      // total used so far
  totalAvailableUsd: number | null // remaining balance
  error?: string
}

export interface ResendUsage {
  plan: string
  monthlyLimit: number
  usedThisMonth: number
  remaining: number
}

export interface ApiCreditsData {
  openai: OpenAiCredits
  resend: ResendUsage
  refreshedAt: string  // ISO timestamp
}

// ── OpenAI fetch ─────────────────────────────────────────────────────────────

async function fetchOpenAiCredits(): Promise<OpenAiCredits> {
  // Prefer OPENAI_BILLING_KEY (org-level key) for billing endpoint.
  // Project-scoped keys (sk-proj-...) return 403 on credit_grants.
  // Falls back to OPENAI_API_KEY so no extra config is needed to get started.
  const apiKey = process.env.OPENAI_BILLING_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { totalGrantedUsd: null, totalUsedUsd: null, totalAvailableUsd: null, error: 'no_key' }
  }

  try {
    const res = await fetch('https://api.openai.com/v1/dashboard/billing/credit_grants', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (res.status === 404 || res.status === 400) {
      // Organization is on post-paid billing — credit_grants endpoint not available
      // Fall back to showing nothing rather than an error
      return { totalGrantedUsd: null, totalUsedUsd: null, totalAvailableUsd: null, error: 'post_paid_billing' }
    }

    if (!res.ok) {
      return { totalGrantedUsd: null, totalUsedUsd: null, totalAvailableUsd: null, error: `HTTP ${res.status}` }
    }

    const data = await res.json() as {
      total_granted?: number
      total_used?: number
      total_available?: number
    }

    return {
      totalGrantedUsd: data.total_granted ?? null,
      totalUsedUsd: data.total_used ?? null,
      totalAvailableUsd: data.total_available ?? null,
    }
  } catch (err) {
    log.warn({ msg: 'OpenAI credit fetch failed', error: String(err) })
    return { totalGrantedUsd: null, totalUsedUsd: null, totalAvailableUsd: null, error: String(err) }
  }
}

// ── Resend counter ───────────────────────────────────────────────────────────

function resendCounterKey(): string {
  const now = new Date()
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  return `${RESEND_COUNTER_PREFIX}:${ym}`
}

/**
 * Increment the Resend sent-email counter for the current month.
 * Fire-and-forget — call this every time an email is sent via Resend.
 */
export function incrementResendCounter(): void {
  const redis = getRedis()
  if (!redis) return
  const key = resendCounterKey()
  redis.incr(key)
    .then(() => {
      // Set TTL to 60 days so counters auto-expire (avoid stale keys)
      redis.expire(key, 60 * 24 * 60 * 60).catch(() => {})
    })
    .catch(() => { /* non-blocking */ })
}

async function getResendUsage(): Promise<ResendUsage> {
  const redis = getRedis()
  let usedThisMonth = 0

  if (redis) {
    try {
      const val = await redis.get(resendCounterKey())
      usedThisMonth = val ? parseInt(val, 10) : 0
    } catch {
      // ignore
    }
  }

  // Resend free plan: 3,000 emails/month
  const monthlyLimit = 3_000
  return {
    plan: 'Free',
    monthlyLimit,
    usedThisMonth,
    remaining: Math.max(0, monthlyLimit - usedThisMonth),
  }
}

// ── Cache ────────────────────────────────────────────────────────────────────

/**
 * Fetch fresh data from OpenAI and calculate Resend usage, then cache in Redis.
 * Called on server startup and every 3 hours.
 */
export async function refreshApiCredits(): Promise<ApiCreditsData> {
  const [openai, resend] = await Promise.all([fetchOpenAiCredits(), getResendUsage()])
  const data: ApiCreditsData = { openai, resend, refreshedAt: new Date().toISOString() }

  const redis = getRedis()
  if (redis) {
    try {
      await redis.set(CACHE_KEY, JSON.stringify(data), 'EX', CACHE_TTL_SEC)
    } catch {
      // ignore — cache write failure is non-critical
    }
  }

  log.info({ msg: 'API credits refreshed', openaiAvailable: openai.totalAvailableUsd, resendUsed: resend.usedThisMonth })
  return data
}

/**
 * Return cached API credits data, or fetch fresh if cache miss.
 */
export async function getApiCredits(): Promise<ApiCreditsData> {
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY)
      if (cached) return JSON.parse(cached) as ApiCreditsData
    } catch {
      // fall through to live fetch
    }
  }
  return refreshApiCredits()
}
