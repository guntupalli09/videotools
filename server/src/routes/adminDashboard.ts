/**
 * Founder-only admin dashboard API. Additive only; no changes to existing business logic.
 * GET /api/admin/dashboard — requires JWT auth and user.role === 'founder'.
 * Uses 30s in-memory cache; real-time MRR override from SubscriptionSnapshot.
 */

import express, { Request, Response } from 'express'
import { getAuthFromRequest } from '../utils/auth'
import { getUser } from '../models/User'
import { prisma } from '../db'

const adminDashboardRouter = express.Router()
export default adminDashboardRouter

/**
 * GET /api/admin/me — Lightweight founder check. Requires JWT auth.
 * Returns { isFounder: true } if user.role === 'founder'. No aggregation queries.
 */
adminDashboardRouter.get('/me', async (req: Request, res: Response): Promise<Response> => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const user = await getUser(auth.userId)
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    if ((user as { role?: string }).role !== 'founder') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    return res.json({ isFounder: true })
  } catch (err) {
    console.error('[admin/me]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})

const CACHE_TTL_MS = 30_000
let cachedDashboard: Record<string, unknown> | null = null
let cacheTimestamp = 0

adminDashboardRouter.get('/dashboard', async (req: Request, res: Response): Promise<Response> => {
  const startMs = Date.now()
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }
    const user = await getUser(auth.userId)
    if (!user) {
      return res.status(403).json({ message: 'Forbidden' })
    }
    if ((user as { role?: string }).role !== 'founder') {
      return res.status(403).json({ message: 'Forbidden' })
    }

    if (Date.now() - cacheTimestamp < CACHE_TTL_MS && cachedDashboard != null) {
      return res.json(cachedDashboard)
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

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
        take: 20,
        select: { id: true, toolId: true, stars: true, comment: true, planAtSubmit: true, createdAt: true },
      }),
      prisma.$queryRaw<[{ mrrCents: bigint | null }]>`
        SELECT SUM("priceMonthly")::bigint as "mrrCents"
        FROM "SubscriptionSnapshot"
        WHERE status = 'active'
      `,
    ])

    let snapshot: Record<string, unknown>
    if (latestDaily) {
      let mrrCents = latestDaily.mrrCents
      const overrideMrr = realtimeMrr?.[0]?.mrrCents
      if (overrideMrr != null) {
        mrrCents = Number(overrideMrr)
      }
      snapshot = {
        date: latestDaily.date.toISOString(),
        totalUsers: latestDaily.totalUsers,
        activeUsers: latestDaily.activeUsers,
        mrrCents,
        jobsCompleted: latestDaily.jobsCompleted,
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

    const feedback = (feedbackRows ?? []).map((f) => ({
      id: f.id,
      toolId: f.toolId,
      stars: f.stars,
      comment: f.comment,
      planAtSubmit: f.planAtSubmit,
      createdAt: f.createdAt.toISOString(),
    }))

    const response = {
      snapshot,
      revenue,
      usage,
      performance,
      retention,
      feedback,
    }
    cachedDashboard = response
    cacheTimestamp = Date.now()

    console.info(`Founder dashboard computed in ${Date.now() - startMs} ms`)
    return res.json(response)
  } catch (err) {
    console.error('[admin/dashboard]', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
})
