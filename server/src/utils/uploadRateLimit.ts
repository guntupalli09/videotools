/**
 * Per-user upload rate limit — Redis-backed so the limit survives server
 * restarts and works correctly across multiple server instances.
 *
 * Uses a Redis sorted-set per userId. Each upload is recorded as a member
 * with score = epoch-ms. Old members outside the window are pruned atomically.
 */
import Redis from 'ioredis'

const WINDOW_MS = 60 * 1000
const MAX_UPLOADS_PER_WINDOW =
  typeof process.env.UPLOAD_RATE_LIMIT_PER_MIN !== 'undefined'
    ? Math.max(1, parseInt(process.env.UPLOAD_RATE_LIMIT_PER_MIN, 10) || 3)
    : process.env.NODE_ENV === 'production'
      ? 3
      : 10

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const rlRedis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
})
rlRedis.on('error', (err) => console.error('[RateLimit Redis] connection error:', err.message))

function rlKey(userId: string): string { return `upload_rl:${userId}` }

/**
 * Returns true if upload is allowed and records the attempt.
 * Returns false if the user has exceeded MAX_UPLOADS_PER_WINDOW in the last minute.
 * Fails open if Redis is unavailable so an outage doesn't block all uploads.
 */
export async function checkAndRecordUpload(userId: string): Promise<boolean> {
  const now = Date.now()
  const windowStart = now - WINDOW_MS
  const key = rlKey(userId)

  try {
    const pipeline = rlRedis.pipeline()
    pipeline.zremrangebyscore(key, '-inf', windowStart) // prune old entries
    pipeline.zcard(key)                                  // count remaining
    pipeline.zadd(key, now, `${now}-${Math.random()}`)  // record this attempt
    pipeline.pexpire(key, WINDOW_MS * 2)                // auto-expire key

    const results = await pipeline.exec()
    const countBeforeAdd = (results?.[1]?.[1] as number) ?? 0
    return countBeforeAdd < MAX_UPLOADS_PER_WINDOW
  } catch (err) {
    // Redis unavailable — fail-open to avoid blocking all uploads
    console.warn('[RateLimit] Redis error, failing open:', (err as Error).message)
    return true
  }
}
