import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

const redisOptions: {
  tls?: object
  enableReadyCheck: boolean
  maxRetriesPerRequest: number | null
} = {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
}

/**
 * Create a Redis client for Bull. Works with both:
 * - Self-hosted Redis: redis://host:6379 (or redis://redis:6379 in Docker)
 * - Upstash (TLS): rediss://...
 *
 * When using Upstash (rediss://) we set: tls, enableReadyCheck: false, maxRetriesPerRequest: null.
 *
 * Switching REDIS_URL (e.g. Upstash → self-hosted) invalidates existing job IDs; in-flight jobs
 * are lost. New jobs after the switch use the new backend. No code change required—only env.
 */
let redisConnectionLogged = false

export function createRedisClient(
  _type: 'client' | 'subscriber' | 'bclient'
): Redis {
  if (!redisConnectionLogged) {
    redisConnectionLogged = true
    const kind = redisUrl.startsWith('rediss://') ? 'TLS (e.g. Upstash)' : 'plain TCP (self-hosted)'
    console.info(`Redis: using ${kind} for Bull queue`)
  }
  return new Redis(redisUrl, redisOptions)
}
