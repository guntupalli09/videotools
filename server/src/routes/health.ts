/**
 * Health, readiness, version, config presence, and ops/queue endpoints.
 * In production, /configz and /ops/queue require JWT or API key (F12).
 */
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db'
import { fileQueue, priorityQueue, getTotalQueueCount } from '../workers/videoProcessor'
import { getAuthFromRequest } from '../utils/auth'
import { apiKeyAuth } from '../utils/apiKey'

const router = Router()
const release = process.env.RELEASE || 'dev'
const env = process.env.NODE_ENV || 'development'
const BUILD_TIME = process.env.BUILD_TIME || undefined

const WORKER_HEARTBEAT_KEY = 'videotext:worker:heartbeat'
const HEARTBEAT_TTL_SEC = 120

const READYZ_TIMEOUT_MS = 25_000

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

function requireOpsAuth(req: Request, res: Response, next: NextFunction) {
  if (env !== 'production') return next()
  const auth = getAuthFromRequest(req)
  const apiKeyUser = (req as any).apiKeyUser
  if (auth?.userId || apiKeyUser?.userId) return next()
  res.status(401).json({ message: 'Authentication required for this endpoint.' })
}

/** GET /healthz — process up, no dependency check */
router.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' })
})

/** GET /readyz — 200 only if Redis and Postgres reachable; 503 with details if not. Uses Bull's existing Redis connection (no new client per request) so we avoid connection churn. */
router.get('/readyz', async (_req: Request, res: Response) => {
  const errors: { redis?: string; database?: string } = {}
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, READYZ_TIMEOUT_MS, 'Postgres')
  } catch (err: any) {
    errors.database = err?.message || 'Postgres unreachable'
  }
  try {
    await withTimeout(getTotalQueueCount(), READYZ_TIMEOUT_MS, 'Redis')
  } catch (err: any) {
    errors.redis = err?.message || 'Redis unreachable'
  }
  if (Object.keys(errors).length > 0) {
    res.status(503).json({ status: 'unhealthy', ...errors })
    return
  }
  res.status(200).json({ status: 'ok' })
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

/** GET /configz — redacted config presence (no values). Auth required in production. */
router.get('/configz', apiKeyAuth, requireOpsAuth, (_req: Request, res: Response) => {
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

/** GET /ops/queue — queue depth, active, failed, last worker heartbeat age (ms). Auth required in production. */
router.get('/ops/queue', apiKeyAuth, requireOpsAuth, async (_req: Request, res: Response) => {
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
      const ts = await fileQueue.client.get(WORKER_HEARTBEAT_KEY)
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
