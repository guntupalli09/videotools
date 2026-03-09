/**
 * Per-user YouTube job rate limit — Redis sorted-set, same pattern as uploadRateLimit.ts.
 *
 * Window: 1 hour.  Limits by plan:
 *   free: 3/hr   basic: 6/hr   pro/founding_workflow: 10/hr   agency: 20/hr
 *
 * Fails open if Redis is unavailable so an outage never blocks all YouTube jobs.
 */
import Redis from 'ioredis'
import { getLogger } from '../lib/logger'
import type { PlanType } from '../models/User'

const rlLog = getLogger('api')

const YT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

export function maxYoutubeJobsPerHour(plan: PlanType): number {
  const limits: Record<PlanType, number> = {
    free: 3,
    basic: 6,
    pro: 10,
    founding_workflow: 10,
    agency: 20,
  }
  return limits[plan] ?? 3
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const ytRlRedis = new Redis(redisUrl, {
  ...(redisUrl.startsWith('rediss://') ? { tls: {} } : {}),
  enableReadyCheck: false,
  maxRetriesPerRequest: 2,
  connectTimeout: 5000,
  commandTimeout: 3000,
  lazyConnect: true,
})
ytRlRedis.on('error', (err) =>
  rlLog.error({ msg: '[YTRateLimit] Redis error', error: err.message })
)

function ytRlKey(userId: string): string {
  return `yt_rl:${userId}`
}

/**
 * Returns { allowed: true } if the user is under their hourly YouTube job limit and records
 * the attempt.  Returns { allowed: false, retryAfterMs } when the limit is reached.
 * Fails open on Redis error.
 */
export async function checkAndRecordYoutubeJob(
  userId: string,
  plan: PlanType
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const now = Date.now()
  const windowStart = now - YT_WINDOW_MS
  const key = ytRlKey(userId)
  const max = maxYoutubeJobsPerHour(plan)

  try {
    const pipeline = ytRlRedis.pipeline()
    pipeline.zremrangebyscore(key, '-inf', windowStart) // prune expired entries
    pipeline.zcard(key)                                  // count within window
    pipeline.zadd(key, now, `${now}-${Math.random()}`)  // record this attempt
    pipeline.pexpire(key, YT_WINDOW_MS * 2)             // auto-expire key

    const results = await pipeline.exec()
    const countBeforeAdd = (results?.[1]?.[1] as number) ?? 0

    if (countBeforeAdd >= max) {
      // Find oldest entry to compute retry window
      const oldest = await ytRlRedis.zrange(key, 0, 0, 'WITHSCORES')
      const oldestMs = oldest.length >= 2 ? parseInt(oldest[1], 10) : now
      const retryAfterMs = Math.max(0, oldestMs + YT_WINDOW_MS - now)
      return { allowed: false, remaining: 0, retryAfterMs }
    }

    return { allowed: true, remaining: max - countBeforeAdd - 1, retryAfterMs: 0 }
  } catch (err) {
    rlLog.warn({ msg: '[YTRateLimit] Redis error, failing open', error: (err as Error).message })
    return { allowed: true, remaining: 0, retryAfterMs: 0 }
  }
}
