/**
 * Health, readiness, version, config presence, and ops/queue endpoints.
 * All fast (sub-100ms); configz is redacted (presence only).
 */
import { Router, Request, Response } from 'express'
import { createRedisClient } from '../utils/redis'
import { fileQueue, priorityQueue, getTotalQueueCount } from '../workers/videoProcessor'

const router = Router()
const release = process.env.RELEASE || 'dev'
const env = process.env.NODE_ENV || 'development'
const BUILD_TIME = process.env.BUILD_TIME || undefined

const WORKER_HEARTBEAT_KEY = 'videotext:worker:heartbeat'
const HEARTBEAT_TTL_SEC = 120

/** GET /healthz — process up, no dependency check */
router.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' })
})

/** GET /readyz — 200 only if Redis and queue backend reachable */
router.get('/readyz', async (_req: Request, res: Response) => {
  try {
    const redis = createRedisClient('client')
    await redis.ping()
    redis.disconnect()
    const _ = await getTotalQueueCount()
    res.status(200).json({ status: 'ok' })
  } catch (err: any) {
    res.status(503).json({ status: 'unhealthy', error: err?.message || 'dependency check failed' })
  }
})

/** GET /version — service, release, buildTime, env */
router.get('/version', (_req: Request, res: Response) => {
  res.json({
    service: 'api',
    release,
    buildTime: BUILD_TIME,
    env,
  })
})

/** GET /configz — redacted config presence (no values) */
router.get('/configz', (_req: Request, res: Response) => {
  res.json({
    hasRedisUrl: Boolean(process.env.REDIS_URL),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasStripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    hasStripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    hasSentryDsn: Boolean(process.env.SENTRY_DSN),
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    hasResendKey: Boolean(process.env.RESEND_API_KEY),
    mode: env,
    workerDisabled: process.env.DISABLE_WORKER === 'true',
  })
})

/** GET /ops/queue — queue depth, active, failed, last worker heartbeat age (ms) */
router.get('/ops/queue', async (_req: Request, res: Response) => {
  try {
    const [normalCounts, priorityCounts] = await Promise.all([
      fileQueue.getJobCounts(),
      priorityQueue.getJobCounts(),
    ])
    const waiting = (normalCounts.waiting ?? 0) + (priorityCounts.waiting ?? 0)
    const active = (normalCounts.active ?? 0) + (priorityCounts.active ?? 0)
    const failed = (normalCounts.failed ?? 0) + (priorityCounts.failed ?? 0)

    let lastHeartbeatAgeMs: number | null = null
    try {
      const redis = createRedisClient('client')
      const ts = await redis.get(WORKER_HEARTBEAT_KEY)
      redis.disconnect()
      if (ts) {
        const t = parseInt(ts, 10)
        if (!isNaN(t)) lastHeartbeatAgeMs = Date.now() - t
      }
    } catch {
      // ignore
    }

    res.json({
      waiting,
      active,
      failed,
      lastHeartbeatAgeMs,
    })
  } catch (err: any) {
    res.status(503).json({ error: err?.message || 'queue check failed' })
  }
})

export default router
