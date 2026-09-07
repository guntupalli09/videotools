/**
 * Founder-only admin dashboard API. Additive only; no changes to existing business logic.
 * GET /api/admin/dashboard — requires JWT auth and user.role === 'founder'.
 * Uses 30s in-memory cache; real-time MRR override from SubscriptionSnapshot.
 * GET /api/admin/server-health — live queue/worker/infra status (no cache).
 */

import express, { Request, Response } from 'express'
import { getAuthFromRequest } from '../utils/auth'
import { getUser } from '../models/User'
import { prisma } from '../db'
import { fileQueue, priorityQueue } from '../workers/videoProcessor'
import { runRecompute } from '../services/recomputeMetrics'
import { readLogRing } from '../lib/logRing'
import { getLogger } from '../lib/logger'
import { getApiCredits, refreshApiCredits } from '../lib/apiCreditsCache'
import { compareDashboardMetrics } from '../services/canonicalDashboard'
import { getCanonicalStarDistribution } from '../services/ratingAggregation'
import { applyCanonicalCutover, type CutoverableResponse } from '../services/canonicalDashboardCutover'
import { DASHBOARD_SHADOW_COMPUTE, DASHBOARD_CANONICAL_CUTOVER } from '../utils/featureFlags'

const log = getLogger('api')
const adminDashboardRouter = express.Router()
export default adminDashboardRouter

const WORKER_HEARTBEAT_KEY = 'videotext:worker:heartbeat'
const YT_METRIC_KEY_PREFIX = 'metrics:yt:resolution:'

type YoutubeResolutionMetrics = {
  total: number
  captionsResolvedPct: number
  patchResolvedPct: number
  fallbackPct: number
  avgConfidence: number | null
  degradedExecutionPct: number
  highCostPct: number
  retryRate: number
  avgRetryDelayMs: number | null
  retrySuccessRate: number | null
  queueTimeoutRate: number
  circuitBreakerTriggers: number
  byPath: Array<{ path: string; count: number }>
  bySource: Array<{ source: string; count: number }>
  byError: Array<{ error: string; count: number }>
  byClient: Array<{ client: string; success: number; fail: number }>
  byCookie: Array<{ cookie: string; success: number; fail: number }>
  byCombo: Array<{ combo: string; success: number; fail: number }>
}

function ytMetricDayKeys(days = 30): string[] {
  const keys: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    keys.push(`${YT_METRIC_KEY_PREFIX}${y}-${m}-${day}`)
  }
  return keys
}

async function getYoutubeResolutionMetrics(redis: import('ioredis').Redis): Promise<YoutubeResolutionMetrics> {
  const keys = ytMetricDayKeys(30)
  const pipe = redis.pipeline()
  keys.forEach((k) => pipe.hgetall(k))
  const rows = await pipe.exec()
  const byPath = new Map<string, number>()
  const bySource = new Map<string, number>()
  const byError = new Map<string, number>()
  const byClient = new Map<string, { success: number; fail: number }>()
  const byCookie = new Map<string, { success: number; fail: number }>()
  const byCombo = new Map<string, { success: number; fail: number }>()
  let total = 0
  let confidenceSumScaled = 0
  let degradedExecutionCount = 0
  let highCostCount = 0

  for (const entry of rows || []) {
    const bucket = (entry?.[1] || {}) as Record<string, string>
    if (!bucket) continue
    total += Number(bucket.total || 0)
    confidenceSumScaled += Number(bucket.confidence_sum_scaled || 0)
    degradedExecutionCount += Number(bucket.degraded_execution_count || 0)
    highCostCount += Number(bucket.high_cost_count || 0)
    for (const [k, v] of Object.entries(bucket)) {
      const n = Number(v || 0)
      if (!Number.isFinite(n) || n <= 0) continue
      if (k.startsWith('path:')) byPath.set(k.slice(5), (byPath.get(k.slice(5)) || 0) + n)
      if (k.startsWith('source:')) bySource.set(k.slice(7), (bySource.get(k.slice(7)) || 0) + n)
      if (k.startsWith('error:')) byError.set(k.slice(6), (byError.get(k.slice(6)) || 0) + n)
      if (k.startsWith('client:')) {
        const rest = k.slice(7)
        const idx = rest.lastIndexOf(':')
        if (idx > 0) {
          const name = rest.slice(0, idx)
          const metric = rest.slice(idx + 1)
          const current = byClient.get(name) || { success: 0, fail: 0 }
          if (metric === 'success') current.success += n
          if (metric === 'fail') current.fail += n
          byClient.set(name, current)
        }
      }
      if (k.startsWith('cookie:')) {
        const rest = k.slice(7)
        const idx = rest.lastIndexOf(':')
        if (idx > 0) {
          const name = rest.slice(0, idx)
          const metric = rest.slice(idx + 1)
          const current = byCookie.get(name) || { success: 0, fail: 0 }
          if (metric === 'success') current.success += n
          if (metric === 'fail') current.fail += n
          byCookie.set(name, current)
        }
      }
      if (k.startsWith('combo:')) {
        const rest = k.slice(6)
        const idx = rest.lastIndexOf(':')
        if (idx > 0) {
          const name = rest.slice(0, idx)
          const metric = rest.slice(idx + 1)
          const current = byCombo.get(name) || { success: 0, fail: 0 }
          if (metric === 'success') current.success += n
          if (metric === 'fail') current.fail += n
          byCombo.set(name, current)
        }
      }
    }
  }

  const captions = byPath.get('caption') || 0
  const patch = byPath.get('caption_patch') || 0
  const fallback = (byPath.get('audio_cookies') || 0) + (byPath.get('audio_nocookie') || 0) + (byPath.get('audio_proxy') || 0) + (byPath.get('failed') || 0)
  const retryCount = Number(await redis.get('metrics:yt:retry:count').catch(() => '0') || 0)
  const retrySuccess = Number(await redis.get('metrics:yt:retry:success').catch(() => '0') || 0)
  const retryDelaySum = Number(await redis.get('metrics:yt:retry:delay_sum_ms').catch(() => '0') || 0)
  const circuitBreakerTriggers = Number(await redis.get('metrics:yt:retry:circuit_breaker_triggers').catch(() => '0') || 0)
  const queueTimeoutCount = byError.get('QUEUE_TIMEOUT') || 0
  const pct = (v: number) => total > 0 ? Math.round((v / total) * 1000) / 10 : 0
  return {
    total,
    captionsResolvedPct: pct(captions),
    patchResolvedPct: pct(patch),
    fallbackPct: pct(fallback),
    avgConfidence: total > 0 ? Math.round((confidenceSumScaled / total) / 10) / 100 : null,
    degradedExecutionPct: pct(degradedExecutionCount),
    highCostPct: pct(highCostCount),
    retryRate: total > 0 ? Math.round((retryCount / total) * 1000) / 1000 : 0,
    avgRetryDelayMs: retryCount > 0 ? Math.round(retryDelaySum / retryCount) : null,
    retrySuccessRate: retryCount > 0 ? Math.round((retrySuccess / retryCount) * 1000) / 1000 : null,
    queueTimeoutRate: total > 0 ? Math.round((queueTimeoutCount / total) * 1000) / 1000 : 0,
    circuitBreakerTriggers,
    byPath: [...byPath.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count),
    bySource: [...bySource.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    byError: [...byError.entries()].map(([error, count]) => ({ error, count })).sort((a, b) => b.count - a.count),
    byClient: [...byClient.entries()].map(([client, v]) => ({ client, success: v.success, fail: v.fail })).sort((a, b) => (b.success + b.fail) - (a.success + a.fail)),
    byCookie: [...byCookie.entries()].map(([cookie, v]) => ({ cookie, success: v.success, fail: v.fail })).sort((a, b) => (b.success + b.fail) - (a.success + a.fail)),
    byCombo: [...byCombo.entries()].map(([combo, v]) => ({ combo, success: v.success, fail: v.fail })).sort((a, b) => (b.success + b.fail) - (a.success + a.fail)).slice(0, 100),
  }
}

async function requireFounder(req: Request, res: Response): Promise<string | null> {
  const auth = getAuthFromRequest(req)
  if (!auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return null }
  const user = await getUser(auth.userId)
  if (!user) { res.status(401).json({ message: 'Unauthorized' }); return null }
  const email = String((user as { email?: string }).email || '').trim().toLowerCase()
  const isFounder = email === 'santhoshguntupalli06@gmail.com'
  if (!isFounder) { res.status(403).json({ message: 'Forbidden' }); return null }
  return auth.userId
}

/**
 * GET /api/admin/me — Lightweight founder check. Requires JWT auth.
 */
adminDashboardRouter.get('/me', async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await requireFounder(req, res)
    if (!userId) return res as Response
    return res.json({ isFounder: true })
  } catch (err) {
    log.error({ msg: '[admin/me]', error: String(err) })
    return res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * GET /api/admin/server-health — Live queue depth, worker heartbeat, DB/Redis status.
 * Not cached — always fresh.
 */
adminDashboardRouter.get('/server-health', async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await requireFounder(req, res)
    if (!userId) return res as Response

    const [normalCounts, priorityCounts] = await Promise.all([
      fileQueue.getJobCounts(),
      priorityQueue.getJobCounts(),
    ])

    const waiting = (normalCounts.waiting ?? 0) + (priorityCounts.waiting ?? 0)
    const active = (normalCounts.active ?? 0) + (priorityCounts.active ?? 0)
    const failed = (normalCounts.failed ?? 0) + (priorityCounts.failed ?? 0)
    const completed = (normalCounts.completed ?? 0) + (priorityCounts.completed ?? 0)
    const delayed = (normalCounts.delayed ?? 0) + (priorityCounts.delayed ?? 0)

    let lastHeartbeatAgeMs: number | null = null
    let redisOk = true
    try {
      const ts = await fileQueue.client.get(WORKER_HEARTBEAT_KEY)
      if (ts) {
        const t = parseInt(ts, 10)
        if (!isNaN(t)) lastHeartbeatAgeMs = Date.now() - t
      }
    } catch {
      redisOk = false
    }

    let dbOk = true
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      dbOk = false
    }

    const workerStatus =
      lastHeartbeatAgeMs == null ? 'unknown' :
      lastHeartbeatAgeMs < 120_000 ? 'healthy' : 'stale'

    return res.json({
      queueWaiting: waiting,
      queueActive: active,
      queueFailed: failed,
      queueCompleted: completed,
      queueDelayed: delayed,
      workerLastHeartbeatAgeMs: lastHeartbeatAgeMs,
      workerStatus,
      redisOk,
      dbOk,
    })
  } catch (err: any) {
    log.error({ msg: '[admin/server-health]', error: String(err) })
    return res.status(500).json({ message: 'Internal server error', error: err?.message })
  }
})

/**
 * POST /api/admin/recompute — Recompute DailyMetrics and MonthlyMetrics from source tables.
 * Idempotent. Query params: days (default 90), months (default 12).
 */
adminDashboardRouter.post('/recompute', async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await requireFounder(req, res)
    if (!userId) return res as Response

    const days = Math.max(1, Math.min(366, parseInt(String(req.query.days ?? '90'), 10) || 90))
    const months = Math.max(1, Math.min(60, parseInt(String(req.query.months ?? '12'), 10) || 12))

    const result = await runRecompute(days, months)

    cachedDashboard = null
    cacheTimestamp = 0

    return res.json(result)
  } catch (err) {
    log.error({ msg: '[admin/recompute]', error: String(err) })
    return res.status(500).json({ message: 'Internal server error' })
  }
})

const CACHE_TTL_MS = 30_000
let cachedDashboard: Record<string, unknown> | null = null
let cacheTimestamp = 0
const KPI_TARGETS = {
  activationRatePct: { baseline: 10, target: 25 },
  activatedUpgradeCtrPct: { target: 20 },
  paidConversionPct: { baseline: 3.1, target: 10 },
} as const

export function clearDashboardCache(): void {
  cachedDashboard = null
  cacheTimestamp = 0
}

function pct(num: number, den: number): number {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0
  return Math.round((num / den) * 1000) / 10
}

async function getGrowthMetrics(releaseDate: Date): Promise<{
  kpiTargets: typeof KPI_TARGETS
  latest: { activationRatePct: number; activatedUpgradeCtrPct: number; paidConversionPct: number; windowDays: number }
  founderDailyReport: {
    date: string
    newFreeSignups: number
    usersIn3To6hWindow: number
    firstOutputsCompleted: number
    upgradeClicks: number
    paidConversions: number
  }
  cohortComparison: {
    releaseDate: string
    day7: { beforePct: number; afterPct: number; beforeCount: number; afterCount: number }
    day14: { beforePct: number; afterPct: number; beforeCount: number; afterCount: number }
  }
}> {
  const now = new Date()
  const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const endOfTodayUtc = new Date(startOfTodayUtc.getTime() + 24 * 60 * 60 * 1000)
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000)

  const [activationWindow, activatedUpgrade, paidWindow, reportRows, cohortRows] = await Promise.all([
    prisma.$queryRaw<[{ total: bigint; activated: bigint }]>`
      SELECT
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM "Job" j
            WHERE j."userId" = u.id
              AND j.status = 'completed'
              AND j."completedAt" IS NOT NULL
              AND j."completedAt" <= u."createdAt" + INTERVAL '24 hours'
          )
        )::bigint as activated
      FROM "User" u
      WHERE u.plan = 'free' AND u."createdAt" >= ${last14Days}
    `,
    prisma.$queryRaw<[{ activatedUsers: bigint; upgradeClickUsers: bigint }]>`
      WITH activated AS (
        SELECT u.id
        FROM "User" u
        WHERE u.plan = 'free'
          AND u."createdAt" >= ${last14Days}
          AND EXISTS (
            SELECT 1 FROM "Job" j
            WHERE j."userId" = u.id
              AND j.status = 'completed'
              AND j."completedAt" IS NOT NULL
              AND j."completedAt" <= u."createdAt" + INTERVAL '24 hours'
          )
      )
      SELECT
        COUNT(*)::bigint as "activatedUsers",
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM "EventLog" e
            WHERE e."userId" = a.id
              AND e."eventName" = 'upgrade_clicked'
              AND e."createdAt" >= ${last14Days}
          )
        )::bigint as "upgradeClickUsers"
      FROM activated a
    `,
    prisma.$queryRaw<[{ total: bigint; paid: bigint }]>`
      SELECT
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE u.plan <> 'free')::bigint as paid
      FROM "User" u
      WHERE u."createdAt" >= ${last14Days}
    `,
    prisma.$queryRaw<[{
      newFreeSignups: bigint
      usersIn3To6hWindow: bigint
      firstOutputsCompleted: bigint
      upgradeClicks: bigint
      paidConversions: bigint
    }]>`
      SELECT
        (SELECT COUNT(*)::bigint FROM "User" u WHERE u.plan = 'free' AND u."createdAt" >= ${startOfTodayUtc} AND u."createdAt" < ${endOfTodayUtc}) as "newFreeSignups",
        (SELECT COUNT(*)::bigint FROM "User" u
          WHERE u.plan = 'free'
            AND u."createdAt" >= ${sixHoursAgo}
            AND u."createdAt" < ${threeHoursAgo}
            AND COALESCE((u."usageThisMonth"->>'importCount')::int, 0) = 0) as "usersIn3To6hWindow",
        (SELECT COUNT(*)::bigint
          FROM (
            SELECT j."userId", MIN(j."completedAt") as first_completed_at
            FROM "Job" j
            WHERE j.status = 'completed' AND j."completedAt" IS NOT NULL
            GROUP BY j."userId"
          ) fc
          WHERE fc.first_completed_at >= ${startOfTodayUtc} AND fc.first_completed_at < ${endOfTodayUtc}) as "firstOutputsCompleted",
        (SELECT COUNT(*)::bigint FROM "EventLog" e
          WHERE e."eventName" = 'upgrade_clicked'
            AND e."createdAt" >= ${startOfTodayUtc} AND e."createdAt" < ${endOfTodayUtc}) as "upgradeClicks",
        (SELECT COUNT(*)::bigint FROM "User" u
          WHERE u.plan <> 'free' AND u."updatedAt" >= ${startOfTodayUtc} AND u."updatedAt" < ${endOfTodayUtc}) as "paidConversions"
    `,
    prisma.$queryRaw<[{ before7: bigint; after7: bigint; before14: bigint; after14: bigint; beforeCount: bigint; afterCount: bigint }]>`
      WITH cohorts AS (
        SELECT
          u.id,
          u."createdAt",
          CASE WHEN u."createdAt" < ${releaseDate} THEN 'before' ELSE 'after' END as period
        FROM "User" u
        WHERE u."createdAt" >= ${new Date(releaseDate.getTime() - 14 * 24 * 60 * 60 * 1000)}
          AND u."createdAt" < ${new Date(releaseDate.getTime() + 14 * 24 * 60 * 60 * 1000)}
      )
      SELECT
        COUNT(*) FILTER (
          WHERE period = 'before' AND EXISTS (
            SELECT 1 FROM "SubscriptionSnapshot" s
            WHERE s."userId" = c.id
              AND s.status = 'active'
              AND s."periodStart" <= c."createdAt" + INTERVAL '7 days'
          )
        )::bigint as before7,
        COUNT(*) FILTER (
          WHERE period = 'after' AND EXISTS (
            SELECT 1 FROM "SubscriptionSnapshot" s
            WHERE s."userId" = c.id
              AND s.status = 'active'
              AND s."periodStart" <= c."createdAt" + INTERVAL '7 days'
          )
        )::bigint as after7,
        COUNT(*) FILTER (
          WHERE period = 'before' AND EXISTS (
            SELECT 1 FROM "SubscriptionSnapshot" s
            WHERE s."userId" = c.id
              AND s.status = 'active'
              AND s."periodStart" <= c."createdAt" + INTERVAL '14 days'
          )
        )::bigint as before14,
        COUNT(*) FILTER (
          WHERE period = 'after' AND EXISTS (
            SELECT 1 FROM "SubscriptionSnapshot" s
            WHERE s."userId" = c.id
              AND s.status = 'active'
              AND s."periodStart" <= c."createdAt" + INTERVAL '14 days'
          )
        )::bigint as after14,
        COUNT(*) FILTER (WHERE period = 'before')::bigint as "beforeCount",
        COUNT(*) FILTER (WHERE period = 'after')::bigint as "afterCount"
      FROM cohorts c
    `,
  ])

  const totalActivation = Number(activationWindow?.[0]?.total ?? 0)
  const activatedUsers = Number(activationWindow?.[0]?.activated ?? 0)
  const activatedDen = Number(activatedUpgrade?.[0]?.activatedUsers ?? 0)
  const upgradeClickUsers = Number(activatedUpgrade?.[0]?.upgradeClickUsers ?? 0)
  const paidTotal = Number(paidWindow?.[0]?.total ?? 0)
  const paidConverted = Number(paidWindow?.[0]?.paid ?? 0)
  const report = reportRows?.[0]
  const cohort = cohortRows?.[0]
  const beforeCount = Number(cohort?.beforeCount ?? 0)
  const afterCount = Number(cohort?.afterCount ?? 0)

  return {
    kpiTargets: KPI_TARGETS,
    latest: {
      activationRatePct: pct(activatedUsers, totalActivation),
      activatedUpgradeCtrPct: pct(upgradeClickUsers, activatedDen),
      paidConversionPct: pct(paidConverted, paidTotal),
      windowDays: 14,
    },
    founderDailyReport: {
      date: startOfTodayUtc.toISOString(),
      newFreeSignups: Number(report?.newFreeSignups ?? 0),
      usersIn3To6hWindow: Number(report?.usersIn3To6hWindow ?? 0),
      firstOutputsCompleted: Number(report?.firstOutputsCompleted ?? 0),
      upgradeClicks: Number(report?.upgradeClicks ?? 0),
      paidConversions: Number(report?.paidConversions ?? 0),
    },
    cohortComparison: {
      releaseDate: releaseDate.toISOString(),
      day7: {
        beforePct: pct(Number(cohort?.before7 ?? 0), beforeCount),
        afterPct: pct(Number(cohort?.after7 ?? 0), afterCount),
        beforeCount,
        afterCount,
      },
      day14: {
        beforePct: pct(Number(cohort?.before14 ?? 0), beforeCount),
        afterPct: pct(Number(cohort?.after14 ?? 0), afterCount),
        beforeCount,
        afterCount,
      },
    },
  }
}

adminDashboardRouter.get('/dashboard', async (req: Request, res: Response): Promise<Response> => {
  const startMs = Date.now()
  try {
    const userId = await requireFounder(req, res)
    if (!userId) return res as Response

    if (Date.now() - cacheTimestamp < CACHE_TTL_MS && cachedDashboard != null) {
      return res.json(cachedDashboard)
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    const releaseDate = new Date(process.env.ACTIVATION_RELEASE_DATE || '2026-04-27T00:00:00.000Z')

    const [
      latestDaily,
      monthlyRows,
      topUsers,
      jobsByTool,
      processingStats,
      failureRate,
      active7,
      active30,
      feedbackRows,
      realtimeMrr,
      allUsers,
      dailyTrend,
      planDist,
      recentJobs,
      utmBreakdown,
      failureReasons,
      feedbackByTool,
      starDistribution,
      toolPerf,
      costMetrics,
      youtubeResolution,
      funnelByCohort,
    ] = await Promise.all([
      prisma.dailyMetrics.findFirst({ orderBy: { date: 'desc' } }),
      prisma.monthlyMetrics.findMany({ orderBy: { monthStart: 'desc' }, take: 12 }),
      prisma.$queryRaw<{ userId: string; email: string; plan: string; jobCount: bigint }[]>`
        SELECT j."userId", u.email, u.plan, COUNT(*)::bigint as "jobCount"
        FROM "Job" j
        JOIN "User" u ON u.id = j."userId"
        WHERE j."createdAt" >= ${thirtyDaysAgo}
        GROUP BY j."userId", u.email, u.plan
        ORDER BY "jobCount" DESC
        LIMIT 10
      `,
      prisma.$queryRaw<{ toolType: string; count: bigint }[]>`
        SELECT "toolType", COUNT(*)::bigint as count
        FROM "Job"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY "toolType"
      `,
      prisma.$queryRaw<[{ avgProcessing: number | null; p95Processing: number | null }]>`
        SELECT
          AVG("processingMs")::double precision as "avgProcessing",
          percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs")::double precision as "p95Processing"
        FROM "Job"
        WHERE status = 'completed'
          AND "completedAt" >= ${thirtyDaysAgo}
          AND "processingMs" IS NOT NULL
      `,
      prisma.$queryRaw<[{ failureRate: number | null }]>`
        SELECT
          (COUNT(*) FILTER (WHERE status = 'failed')::float / NULLIF(COUNT(*)::float, 0)) as "failureRate"
        FROM "Job"
        WHERE "createdAt" >= ${thirtyDaysAgo}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId")::bigint as count
        FROM "Job"
        WHERE "createdAt" >= ${sevenDaysAgo}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId")::bigint as count
        FROM "Job"
        WHERE "createdAt" >= ${thirtyDaysAgo}
      `,
      prisma.feedback.findMany({
        orderBy: { createdAt: 'desc' },
        // Keep a deep history available in the founder feedback table and CSV export.
        take: 15_000,
        select: { id: true, toolId: true, stars: true, comment: true, planAtSubmit: true, createdAt: true, userId: true, userNameOrEmail: true, email: true, topTool: true, topToolReason: true, featureRequest: true, otherFeedback: true, source: true },
      }),
      prisma.$queryRaw<[{ mrrCents: bigint | null }]>`
        SELECT SUM("priceMonthly")::bigint as "mrrCents"
        FROM "SubscriptionSnapshot"
        WHERE status = 'active'
      `,
      // Every user with total and 30d job counts. Keep this query unbounded so
      // older accounts remain available in the founder table and CSV export.
      prisma.$queryRaw<{
        id: string; email: string; name: string | null; plan: string; createdAt: Date; lastActiveAt: Date | null;
        utmSource: string | null; firstReferrer: string | null;
        totalJobs: bigint; jobCount30d: bigint;
      }[]>`
        WITH job_counts AS (
          SELECT "userId",
            COUNT(*)::bigint AS "totalJobs",
            COUNT(*) FILTER (WHERE "createdAt" >= ${thirtyDaysAgo})::bigint AS "jobCount30d"
          FROM "Job"
          GROUP BY "userId"
        )
        SELECT u.id, u.email, u.name, u.plan, u."createdAt", u."lastActiveAt", u."utmSource", u."firstReferrer",
          COALESCE(jc."totalJobs", 0)::bigint AS "totalJobs",
          COALESCE(jc."jobCount30d", 0)::bigint AS "jobCount30d"
        FROM "User" u
        LEFT JOIN job_counts jc ON jc."userId" = u.id
        ORDER BY u."createdAt" DESC
      `,
      // Daily metrics trend last 31 days — includes totalUsers for growth chart
      prisma.dailyMetrics.findMany({
        orderBy: { date: 'asc' },
        where: { date: { gte: thirtyOneDaysAgo } },
        select: {
          date: true, newUsers: true, totalUsers: true, jobsCreated: true,
          jobsCompleted: true, jobsFailed: true, mrrCents: true, activeUsers: true,
          churnedUsers: true, newPaidUsers: true, avgProcessingMs: true,
        },
      }),
      // Plan distribution
      prisma.$queryRaw<{ plan: string; count: bigint }[]>`
        SELECT plan, COUNT(*)::bigint as count FROM "User" GROUP BY plan ORDER BY count DESC
      `,
      // Recent jobs feed
      prisma.$queryRaw<{
        id: string; userId: string; email: string | null; toolType: string; status: string;
        processingMs: number | null; videoDurationSec: number | null; createdAt: Date;
        failureReason: string | null; planAtRun: string | null;
      }[]>`
        SELECT j.id, j."userId", u.email, j."toolType", j.status, j."processingMs",
          j."videoDurationSec", j."createdAt", j."failureReason", j."planAtRun"
        FROM "Job" j
        LEFT JOIN "User" u ON u.id = j."userId"
        ORDER BY j."createdAt" DESC
        LIMIT 50
      `,
      // UTM / acquisition source breakdown
      prisma.$queryRaw<{ source: string; count: bigint }[]>`
        SELECT COALESCE("utmSource", 'direct') as source, COUNT(*)::bigint as count
        FROM "User"
        GROUP BY "utmSource"
        ORDER BY count DESC
        LIMIT 20
      `,
      // Top failure reasons (30d)
      prisma.$queryRaw<{ reason: string; count: bigint }[]>`
        SELECT COALESCE("failureReason", 'unknown') as reason, COUNT(*)::bigint as count
        FROM "Job"
        WHERE status = 'failed' AND "createdAt" >= ${thirtyDaysAgo}
        GROUP BY "failureReason"
        ORDER BY count DESC
        LIMIT 15
      `,
      // Feedback avg stars per tool
      prisma.$queryRaw<{ toolId: string; avgStars: number; count: bigint }[]>`
        SELECT COALESCE("toolId", 'unknown') as "toolId",
          AVG(stars)::double precision as "avgStars",
          COUNT(*)::bigint as count
        FROM "Feedback"
        WHERE stars IS NOT NULL
        GROUP BY "toolId"
        ORDER BY count DESC
      `,
      // Star distribution (all time) — canonical: excludes founder/internal/demo
      // feedback so this matches the public rating endpoint exactly.
      getCanonicalStarDistribution(),
      // Per-tool performance breakdown (all-time completed jobs)
      prisma.$queryRaw<{
        toolType: string
        count: bigint
        avgMs: number | null
        p95Ms: number | null
        avgFileSizeBytes: number | null
        avgDurationSec: number | null
        totalMinutes: number | null
      }[]>`
        SELECT
          "toolType",
          COUNT(*)::bigint as count,
          AVG("processingMs") FILTER (WHERE "processingMs" IS NOT NULL)::double precision as "avgMs",
          percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs")
            FILTER (WHERE "processingMs" IS NOT NULL)::double precision as "p95Ms",
          AVG("fileSizeBytes"::double precision)::double precision as "avgFileSizeBytes",
          AVG("videoDurationSec")::double precision as "avgDurationSec",
          SUM("videoDurationSec"::double precision / 60.0)::double precision as "totalMinutes"
        FROM "Job"
        WHERE status = 'completed'
        GROUP BY "toolType"
        ORDER BY count DESC
      `,
      // Cost metrics (30d completed jobs with cost data)
      prisma.$queryRaw<[{
        jobCount: bigint
        avgWhisperMicros: number | null
        totalWhisperMicros: bigint | null
        avgDurationSec: number | null
      }]>`
        SELECT
          COUNT(*)::bigint as "jobCount",
          AVG("whisperCostMicros")::double precision as "avgWhisperMicros",
          SUM("whisperCostMicros")::bigint as "totalWhisperMicros",
          AVG("videoDurationSec")::double precision as "avgDurationSec"
        FROM "Job"
        WHERE status = 'completed'
          AND "completedAt" >= ${thirtyDaysAgo}
          AND "whisperCostMicros" IS NOT NULL
      `,
      getYoutubeResolutionMetrics(fileQueue.client),
      prisma.$queryRaw<{
        cohortDate: Date
        signupCompleted: bigint
        activationWizardShown: bigint
        uploadStarted: bigint
        jobCompleted: bigint
        firstOutputSeen: bigint
        upgradePromptSeen: bigint
        upgradeClicked: bigint
        checkoutStarted: bigint
        paymentCompleted: bigint
      }[]>`
        WITH cohorts AS (
          SELECT id, date_trunc('week', "createdAt")::date AS "cohortDate"
          FROM "User"
          WHERE "createdAt" >= ${new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)}
        )
        SELECT
          c."cohortDate",
          COUNT(*)::bigint AS "signupCompleted",
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "EventLog" e WHERE e."userId" = c.id AND e."eventName" = 'activation_wizard_shown'))::bigint AS "activationWizardShown",
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "EventLog" e WHERE e."userId" = c.id AND e."eventName" = 'upload_started'))::bigint AS "uploadStarted",
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "EventLog" e WHERE e."userId" = c.id AND e."eventName" = 'job_completed'))::bigint AS "jobCompleted",
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "EventLog" e WHERE e."userId" = c.id AND e."eventName" = 'first_output_seen'))::bigint AS "firstOutputSeen",
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "EventLog" e WHERE e."userId" = c.id AND e."eventName" = 'upgrade_prompt_seen'))::bigint AS "upgradePromptSeen",
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "EventLog" e WHERE e."userId" = c.id AND e."eventName" = 'upgrade_clicked'))::bigint AS "upgradeClicked",
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "EventLog" e WHERE e."userId" = c.id AND e."eventName" = 'checkout_started'))::bigint AS "checkoutStarted",
          COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "EventLog" e WHERE e."userId" = c.id AND e."eventName" = 'payment_completed'))::bigint AS "paymentCompleted"
        FROM cohorts c
        GROUP BY c."cohortDate"
        ORDER BY c."cohortDate" DESC
        LIMIT 26
      `,
    ])

    let snapshot: Record<string, unknown>
    if (latestDaily) {
      let mrrCents = latestDaily.mrrCents
      const overrideMrr = realtimeMrr?.[0]?.mrrCents
      if (overrideMrr != null) mrrCents = Number(overrideMrr)

      const paidUserCount = (planDist ?? [])
        .filter((p) => p.plan !== 'free')
        .reduce((s, p) => s + Number(p.count), 0)
      const arpuCents = paidUserCount > 0 && mrrCents ? Math.round(Number(mrrCents) / paidUserCount) : 0

      snapshot = {
        date: latestDaily.date.toISOString(),
        totalUsers: latestDaily.totalUsers,
        activeUsers: latestDaily.activeUsers,
        mrrCents,
        arpuCents,
        jobsCompleted: latestDaily.jobsCompleted,
        newUsers: latestDaily.newUsers,
        jobsCreated: latestDaily.jobsCreated,
        jobsFailed: latestDaily.jobsFailed,
        newPaidUsers: latestDaily.newPaidUsers,
        churnedUsers: latestDaily.churnedUsers,
      }
    } else {
      snapshot = { status: 'no_metrics_data' }
    }

    const revenue = {
      mrrTrend: (monthlyRows ?? []).map((r) => ({ monthStart: r.monthStart.toISOString(), mrrCents: r.mrrCents })),
      newMrrTrend: (monthlyRows ?? []).map((r) => ({ monthStart: r.monthStart.toISOString(), newMrrCents: r.newMrrCents })),
      churnedMrrTrend: (monthlyRows ?? []).map((r) => ({ monthStart: r.monthStart.toISOString(), churnedMrrCents: r.churnedMrrCents })),
      churnRateTrend: (monthlyRows ?? []).map((r) => ({ monthStart: r.monthStart.toISOString(), churnRatePercent: r.churnRatePercent })),
    }

    const usage = {
      topUsersByJobCount: (topUsers ?? []).map((r) => ({
        userId: r.userId,
        email: r.email ?? '',
        plan: r.plan ?? 'free',
        jobCount: Number(r.jobCount),
      })),
      jobsByToolType: (jobsByTool ?? []).map((r) => ({ toolType: r.toolType, count: Number(r.count) })),
    }

    const perf = processingStats?.[0]
    const rawFailureRate = failureRate?.[0]?.failureRate
    const performance = {
      avgProcessingMs: perf?.avgProcessing != null ? Math.round(perf.avgProcessing) : 0,
      p95ProcessingMs: perf?.p95Processing != null ? Math.round(perf.p95Processing) : 0,
      failureRate: Number(rawFailureRate) || 0,
    }

    const retention = {
      activeUsersLast7Days: active7?.[0]?.count != null ? Number(active7[0].count) : 0,
      activeUsersLast30Days: active30?.[0]?.count != null ? Number(active30[0].count) : 0,
    }

    const feedbackUserIds = (feedbackRows ?? []).map((f) => f.userId).filter((id): id is string => id != null)
    const feedbackUsers = feedbackUserIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: feedbackUserIds } }, select: { id: true, email: true } })
      : []
    const feedbackEmailMap = Object.fromEntries(feedbackUsers.map((u) => [u.id, u.email]))

    const feedback = (feedbackRows ?? []).map((f) => ({
      id: f.id,
      toolId: f.toolId,
      stars: f.stars,
      comment: f.comment,
      planAtSubmit: f.planAtSubmit,
      createdAt: f.createdAt.toISOString(),
      userId: f.userId,
      userNameOrEmail: f.userNameOrEmail ?? (f.userId ? feedbackEmailMap[f.userId] ?? null : null),
      email: f.email,
      topTool: f.topTool,
      topToolReason: f.topToolReason,
      featureRequest: f.featureRequest,
      otherFeedback: f.otherFeedback,
      source: f.source,
    }))

    const users = (allUsers ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name ?? null,
      plan: u.plan,
      createdAt: u.createdAt.toISOString(),
      lastActiveAt: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
      utmSource: u.utmSource,
      firstReferrer: u.firstReferrer,
      totalJobs: Number(u.totalJobs),
      jobCount30d: Number(u.jobCount30d),
    }))

    const daily = (dailyTrend ?? []).map((d) => ({
      date: d.date.toISOString(),
      newUsers: d.newUsers,
      totalUsers: d.totalUsers,
      jobsCreated: d.jobsCreated,
      jobsCompleted: d.jobsCompleted,
      jobsFailed: d.jobsFailed,
      mrrCents: d.mrrCents,
      activeUsers: d.activeUsers,
      churnedUsers: d.churnedUsers ?? 0,
      newPaidUsers: d.newPaidUsers ?? 0,
      avgProcessingMs: d.avgProcessingMs ?? null,
    }))

    const planDistribution = (planDist ?? []).map((p) => ({
      plan: p.plan,
      count: Number(p.count),
    }))

    const recentJobsFeed = (recentJobs ?? []).map((j) => ({
      id: j.id,
      userId: j.userId,
      email: j.email,
      toolType: j.toolType,
      status: j.status,
      processingMs: j.processingMs,
      videoDurationSec: j.videoDurationSec,
      createdAt: j.createdAt.toISOString(),
      failureReason: j.failureReason,
      planAtRun: j.planAtRun,
    }))

    const response = {
      snapshot,
      revenue,
      usage,
      performance,
      retention,
      feedback,
      users,
      daily,
      planDistribution,
      recentJobs: recentJobsFeed,
      utmBreakdown: (utmBreakdown ?? []).map((u) => ({ source: u.source, count: Number(u.count) })),
      failureReasons: (failureReasons ?? []).map((f) => ({ reason: f.reason, count: Number(f.count) })),
      feedbackByTool: (feedbackByTool ?? []).map((f) => ({
        toolId: f.toolId,
        avgStars: Number(f.avgStars),
        count: Number(f.count),
      })),
      starDistribution: (starDistribution ?? []).map((s) => ({
        stars: Number(s.stars),
        count: Number(s.count),
      })),
      toolPerf: (toolPerf ?? []).map((t) => ({
        toolType: t.toolType,
        count: Number(t.count),
        avgMs: t.avgMs != null ? Math.round(t.avgMs) : null,
        p95Ms: t.p95Ms != null ? Math.round(t.p95Ms) : null,
        avgFileSizeMb: t.avgFileSizeBytes != null ? Math.round(t.avgFileSizeBytes / 1024 / 1024 * 10) / 10 : null,
        avgDurationSec: t.avgDurationSec != null ? Math.round(t.avgDurationSec) : null,
        totalMinutes: t.totalMinutes != null ? Math.round(t.totalMinutes) : null,
      })),
      costMetrics: (() => {
        const cm = costMetrics?.[0]
        if (!cm || !Number(cm.jobCount)) return null
        // avgWhisperMicros is micro-dollars; convert to USD: /1_000_000
        const avgWhisperUsd = cm.avgWhisperMicros != null ? cm.avgWhisperMicros / 1_000_000 : null
        const totalWhisperUsd = cm.totalWhisperMicros != null ? Number(cm.totalWhisperMicros) / 1_000_000 : null
        const jobsWithCost = Number(cm.jobCount)
        return {
          jobsWithCost,
          avgWhisperCostUsd: avgWhisperUsd != null ? Math.round(avgWhisperUsd * 10000) / 10000 : null,
          totalWhisperCostUsd: totalWhisperUsd != null ? Math.round(totalWhisperUsd * 100) / 100 : null,
          avgDurationSec: cm.avgDurationSec != null ? Math.round(cm.avgDurationSec) : null,
        }
      })(),
      youtubeResolution,
      funnelByCohort: (funnelByCohort ?? []).map((row) => ({
        cohortDate: row.cohortDate.toISOString(),
        signupCompleted: Number(row.signupCompleted),
        activationWizardShown: Number(row.activationWizardShown),
        uploadStarted: Number(row.uploadStarted),
        jobCompleted: Number(row.jobCompleted),
        firstOutputSeen: Number(row.firstOutputSeen),
        upgradePromptSeen: Number(row.upgradePromptSeen),
        upgradeClicked: Number(row.upgradeClicked),
        checkoutStarted: Number(row.checkoutStarted),
        paymentCompleted: Number(row.paymentCompleted),
      })),
    }
    // Analytics Sprint 6: controlled cutover of exactly 9 approved fields
    // (see docs/analytics/SPRINT_6_RECONCILIATION_REPORT.md) to their
    // canonical sources. Must run BEFORE the response is sent (an HTTP
    // response can't be edited after res.json()). `response` already has
    // every field computed via the unchanged legacy queries above; this
    // call only overwrites the approved fields, and only when the canonical
    // computation succeeds and passes structural validation -- any failure
    // leaves that field's already-computed legacy value untouched and logs
    // a critical diagnostic event (see canonicalDashboardCutover.ts).
    if (DASHBOARD_CANONICAL_CUTOVER) {
      await applyCanonicalCutover(response as unknown as CutoverableResponse)
    }

    cachedDashboard = response
    cacheTimestamp = Date.now()

    log.info({ msg: 'Founder dashboard computed', ms: Date.now() - startMs, canonicalCutover: DASHBOARD_CANONICAL_CUTOVER })
    res.json(response)

    // Analytics Sprint 5: shadow-compute canonical metrics AFTER the legacy
    // response has already been sent. Never awaited by the request/response
    // cycle, wrapped in its own timeout, and any failure is caught and
    // logged, never thrown -- this can never slow down, change, or fail the
    // response actually served to the dashboard UI. See
    // docs/analytics/SPRINT_5_RECONCILIATION_REPORT.md for the standalone,
    // full-detail version of this same comparison.
    if (DASHBOARD_SHADOW_COMPUTE) {
      shadowCompareDashboard().catch((err) => {
        log.warn({ msg: 'dashboard_shadow_compare_failed', error: (err as Error)?.message })
      })
    }

    return res as Response
  } catch (err) {
    log.error({ msg: '[admin/dashboard]', error: String(err) })
    return res.status(500).json({ message: 'Internal server error' })
  }
})

const SHADOW_COMPUTE_TIMEOUT_MS = 15_000

async function shadowCompareDashboard(): Promise<void> {
  const comparisons = await Promise.race([
    compareDashboardMetrics(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('dashboard shadow compute timed out')), SHADOW_COMPUTE_TIMEOUT_MS)
    ),
  ])

  for (const c of comparisons) {
    log.info({
      msg: 'dashboard_shadow_compare',
      card: c.card,
      metric: c.metric,
      source: c.source,
      legacyValue: c.legacyValue,
      canonicalValue: c.canonicalValue,
      absoluteDiff: c.absoluteDiff,
      percentDiff: c.percentDiff,
      classification: c.classification,
      explanation: c.explanation,
    })
  }

  const unexplained = comparisons.filter((c) => c.classification === 'UNEXPLAINED')
  log.info({
    msg: 'dashboard_shadow_compare_summary',
    totalMetrics: comparisons.length,
    unexplainedCount: unexplained.length,
    unexplainedMetrics: unexplained.map((c) => `${c.card}.${c.metric}`),
  })
  if (unexplained.length > 0) {
    log.error({
      msg: 'dashboard_shadow_compare_UNEXPLAINED_DISCREPANCY',
      unexplainedMetrics: unexplained.map((c) => ({ card: c.card, metric: c.metric, legacy: c.legacyValue, canonical: c.canonicalValue })),
    })
  }
}

/**
 * GET /api/admin/logs — Tail the Redis log ring buffer.
 * Query params: limit (default 200, max 500), offset (default 0), level (error|warn|info)
 */
adminDashboardRouter.get('/logs', async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await requireFounder(req, res)
    if (!userId) return res as Response

    const limit = Math.max(1, Math.min(500, parseInt(String(req.query.limit ?? '200'), 10) || 200))
    const offset = Math.max(0, parseInt(String(req.query.offset ?? '0'), 10) || 0)
    const levelFilter = req.query.level as string | undefined

    const entries = await readLogRing(limit, offset)
    const filtered = levelFilter ? entries.filter((e) => e.level === levelFilter) : entries

    return res.json({ entries: filtered, total: filtered.length })
  } catch (err) {
    log.error({ msg: '[admin/logs]', error: String(err) })
    return res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * GET /api/admin/api-credits — Returns OpenAI credit balance and Resend email usage.
 * Served from Redis cache (3-hour TTL). Use ?refresh=1 to force an immediate refresh.
 */
adminDashboardRouter.get('/api-credits', async (req: Request, res: Response): Promise<Response> => {
  try {
    const userId = await requireFounder(req, res)
    if (!userId) return res as Response

    const forceRefresh = req.query.refresh === '1'
    const data = forceRefresh ? await refreshApiCredits() : await getApiCredits()

    return res.json(data)
  } catch (err) {
    log.error({ msg: '[admin/api-credits]', error: String(err) })
    return res.status(500).json({ message: 'Internal server error' })
  }
})
