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

const adminDashboardRouter = express.Router()
export default adminDashboardRouter

const WORKER_HEARTBEAT_KEY = 'videotext:worker:heartbeat'

async function requireFounder(req: Request, res: Response): Promise<string | null> {
  const auth = getAuthFromRequest(req)
  if (!auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return null }
  const user = await getUser(auth.userId)
  if (!user) { res.status(401).json({ message: 'Unauthorized' }); return null }
  if ((user as { role?: string }).role !== 'founder') { res.status(403).json({ message: 'Forbidden' }); return null }
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
    console.error('[admin/me]', err)
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
    console.error('[admin/server-health]', err)
    return res.status(500).json({ message: 'Internal server error', error: err?.message })
  }
})

const CACHE_TTL_MS = 30_000
let cachedDashboard: Record<string, unknown> | null = null
let cacheTimestamp = 0

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
      // All users with total and 30d job counts
      prisma.$queryRaw<{
        id: string; email: string; plan: string; createdAt: Date; lastActiveAt: Date | null;
        utmSource: string | null; firstReferrer: string | null;
        totalJobs: bigint; jobCount30d: bigint;
      }[]>`
        SELECT u.id, u.email, u.plan, u."createdAt", u."lastActiveAt", u."utmSource", u."firstReferrer",
          COUNT(j.id)::bigint as "totalJobs",
          COUNT(j.id) FILTER (WHERE j."createdAt" >= ${thirtyDaysAgo})::bigint as "jobCount30d"
        FROM "User" u
        LEFT JOIN "Job" j ON j."userId" = u.id
        GROUP BY u.id, u.email, u.plan, u."createdAt", u."lastActiveAt", u."utmSource", u."firstReferrer"
        ORDER BY u."createdAt" DESC
        LIMIT 500
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
      // Star distribution (all time)
      prisma.$queryRaw<{ stars: number; count: bigint }[]>`
        SELECT stars, COUNT(*)::bigint as count
        FROM "Feedback"
        WHERE stars IS NOT NULL
        GROUP BY stars
        ORDER BY stars DESC
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

    const feedback = (feedbackRows ?? []).map((f) => ({
      id: f.id,
      toolId: f.toolId,
      stars: f.stars,
      comment: f.comment,
      planAtSubmit: f.planAtSubmit,
      createdAt: f.createdAt.toISOString(),
    }))

    const users = (allUsers ?? []).map((u) => ({
      id: u.id,
      email: u.email,
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
