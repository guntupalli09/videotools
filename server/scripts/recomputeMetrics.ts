/**
 * Recompute daily and monthly aggregate metrics from User, Job, SubscriptionSnapshot.
 * Idempotent, recomputable; safe for production. Uses only Postgres tables.
 *
 * Usage:
 *   cd server && RECOMPUTE_DAYS=90 RECOMPUTE_MONTHS=12 npx tsx scripts/recomputeMetrics.ts
 *
 * Env:
 *   RECOMPUTE_DAYS   Optional. Default 90. Number of days to recompute (back from today).
 *   RECOMPUTE_MONTHS Optional. Default 12. Number of months to recompute.
 */

import '../src/env'
import { prisma } from '../src/db'

const RECOMPUTE_DAYS = Math.max(1, Math.min(366, parseInt(process.env.RECOMPUTE_DAYS ?? '90', 10)))
const RECOMPUTE_MONTHS = Math.max(1, Math.min(60, parseInt(process.env.RECOMPUTE_MONTHS ?? '12', 10)))

function toUtcMidnight(d: Date): Date {
  const out = new Date(d)
  out.setUTCHours(0, 0, 0, 0)
  return out
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setUTCDate(out.getUTCDate() + n)
  return out
}

function firstDayOfMonth(d: Date): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
  return out
}

function addMonths(d: Date, n: number): Date {
  const out = new Date(d)
  out.setUTCMonth(out.getUTCMonth() + n)
  return out
}

function scalarInt(row: { count?: bigint | number; [k: string]: unknown } | null): number {
  if (!row) return 0
  const v = row.count ?? row.avg ?? row.sum ?? row.p95
  if (v == null) return 0
  return typeof v === 'bigint' ? Number(v) : Math.round(Number(v))
}

async function recomputeDay(dateMidnight: Date): Promise<void> {
  const dayStart = dateMidnight
  const dayEnd = addDays(dayStart, 1)
  const endOfDay = new Date(dayEnd.getTime() - 1)

  const [totalUsersRow, newUsersRow, activeUsersRow, jobsCreatedRow, jobsCompletedRow, jobsFailedRow] =
    await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM "User" WHERE "createdAt" < ${dayEnd}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM "User"
        WHERE "createdAt" >= ${dayStart} AND "createdAt" < ${dayEnd}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId")::bigint as count FROM "Job"
        WHERE "createdAt" >= ${dayStart} AND "createdAt" < ${dayEnd}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM "Job"
        WHERE "createdAt" >= ${dayStart} AND "createdAt" < ${dayEnd}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM "Job"
        WHERE "status" = 'completed' AND "completedAt" >= ${dayStart} AND "completedAt" < ${dayEnd}
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM "Job"
        WHERE "status" = 'failed' AND "createdAt" >= ${dayStart} AND "createdAt" < ${dayEnd}
      `,
    ])

  const totalUsers = scalarInt(totalUsersRow?.[0] ?? null)
  const newUsers = scalarInt(newUsersRow?.[0] ?? null)
  const activeUsers = scalarInt(activeUsersRow?.[0] ?? null)
  const jobsCreated = scalarInt(jobsCreatedRow?.[0] ?? null)
  const jobsCompleted = scalarInt(jobsCompletedRow?.[0] ?? null)
  const jobsFailed = scalarInt(jobsFailedRow?.[0] ?? null)

  const [avgRow, p95Row] = await Promise.all([
    prisma.$queryRaw<[{ avg: number | null }]>`
      SELECT AVG("processingMs")::double precision as avg FROM "Job"
      WHERE "status" = 'completed' AND "completedAt" >= ${dayStart} AND "completedAt" < ${dayEnd}
        AND "processingMs" IS NOT NULL
    `,
    prisma.$queryRaw<[{ p95: number | null }]>`
      SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs")::double precision as p95
      FROM "Job"
      WHERE "status" = 'completed' AND "completedAt" >= ${dayStart} AND "completedAt" < ${dayEnd}
        AND "processingMs" IS NOT NULL
    `,
  ])

  const avgProcessingMs = avgRow?.[0]?.avg != null ? Math.round(avgRow[0].avg) : null
  const p95ProcessingMs = p95Row?.[0]?.p95 != null ? Math.round(p95Row[0].p95) : null

  const [mrrRow, churnedRow, newPaidRow] = await Promise.all([
    prisma.$queryRaw<[{ sum: bigint | null }]>`
      SELECT COALESCE(SUM("priceMonthly"), 0)::bigint as sum FROM "SubscriptionSnapshot"
      WHERE "status" = 'active'
        AND "periodStart" <= ${endOfDay} AND "periodEnd" >= ${endOfDay}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "SubscriptionSnapshot"
      WHERE "status" = 'canceled'
        AND "periodEnd" >= ${dayStart} AND "periodEnd" < ${dayEnd}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "SubscriptionSnapshot"
      WHERE "periodStart" >= ${dayStart} AND "periodStart" < ${dayEnd} AND "status" = 'active'
    `,
  ])

  const mrrCents = scalarInt(mrrRow?.[0] ?? null)
  const churnedUsers = scalarInt(churnedRow?.[0] ?? null)
  const newPaidUsers = scalarInt(newPaidRow?.[0] ?? null)

  const now = new Date()
  await prisma.dailyMetrics.upsert({
    where: { date: dayStart },
    create: {
      date: dayStart,
      totalUsers,
      newUsers,
      activeUsers,
      jobsCreated,
      jobsCompleted,
      jobsFailed,
      avgProcessingMs,
      p95ProcessingMs,
      mrrCents,
      churnedUsers,
      newPaidUsers,
      updatedAt: now,
    },
    update: {
      totalUsers,
      newUsers,
      activeUsers,
      jobsCreated,
      jobsCompleted,
      jobsFailed,
      avgProcessingMs,
      p95ProcessingMs,
      mrrCents,
      churnedUsers,
      newPaidUsers,
      updatedAt: now,
    },
  })
}

async function recomputeMonth(monthStart: Date): Promise<void> {
  const monthEnd = addMonths(monthStart, 1)
  const endOfMonth = new Date(monthEnd.getTime() - 1)

  const [totalUsersRow, newUsersRow, activeUsersRow] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "User" WHERE "createdAt" < ${monthEnd}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "User"
      WHERE "createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count FROM "Job"
      WHERE "createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd}
    `,
  ])

  const totalUsers = scalarInt(totalUsersRow?.[0] ?? null)
  const newUsers = scalarInt(newUsersRow?.[0] ?? null)
  const activeUsers = scalarInt(activeUsersRow?.[0] ?? null)

  const [mrrRow, newMrrRow, churnedMrrRow, activePaidStartRow, churnedCountRow] = await Promise.all([
    prisma.$queryRaw<[{ sum: bigint | null }]>`
      SELECT COALESCE(SUM("priceMonthly"), 0)::bigint as sum FROM "SubscriptionSnapshot"
      WHERE "status" = 'active'
        AND "periodStart" <= ${endOfMonth} AND "periodEnd" >= ${endOfMonth}
    `,
    prisma.$queryRaw<[{ sum: bigint | null }]>`
      SELECT COALESCE(SUM("priceMonthly"), 0)::bigint as sum FROM "SubscriptionSnapshot"
      WHERE "periodStart" >= ${monthStart} AND "periodStart" < ${monthEnd}
    `,
    prisma.$queryRaw<[{ sum: bigint | null }]>`
      SELECT COALESCE(SUM("priceMonthly"), 0)::bigint as sum FROM "SubscriptionSnapshot"
      WHERE "status" = 'canceled'
        AND "periodEnd" >= ${monthStart} AND "periodEnd" < ${monthEnd}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count FROM "SubscriptionSnapshot"
      WHERE "status" = 'active'
        AND "periodStart" <= ${monthStart} AND "periodEnd" >= ${monthStart}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "SubscriptionSnapshot"
      WHERE "status" = 'canceled'
        AND "periodEnd" >= ${monthStart} AND "periodEnd" < ${monthEnd}
    `,
  ])

  const mrrCents = scalarInt(mrrRow?.[0] ?? null)
  const newMrrCents = scalarInt(newMrrRow?.[0] ?? null)
  const churnedMrrCents = scalarInt(churnedMrrRow?.[0] ?? null)
  const activePaidUsersAtMonthStart = scalarInt(activePaidStartRow?.[0] ?? null)
  const churnedUsersInMonth = scalarInt(churnedCountRow?.[0] ?? null)

  const churnRatePercent =
    activePaidUsersAtMonthStart > 0
      ? (churnedUsersInMonth / activePaidUsersAtMonthStart) * 100
      : null

  const now = new Date()
  await prisma.monthlyMetrics.upsert({
    where: { monthStart },
    create: {
      monthStart,
      totalUsers,
      newUsers,
      activeUsers,
      mrrCents,
      newMrrCents,
      churnedMrrCents,
      churnRatePercent,
      updatedAt: now,
    },
    update: {
      totalUsers,
      newUsers,
      activeUsers,
      mrrCents,
      newMrrCents,
      churnedMrrCents,
      churnRatePercent,
      updatedAt: now,
    },
  })
}

async function main() {
  const now = new Date()
  const todayStart = toUtcMidnight(now)
  const daysStart = addDays(todayStart, -RECOMPUTE_DAYS)

  let totalDaysProcessed = 0
  let totalMonthsProcessed = 0
  let totalUpserts = 0
  let dayErrors = 0
  let monthErrors = 0

  for (let d = new Date(daysStart); d < todayStart; d = addDays(d, 1)) {
    try {
      await recomputeDay(new Date(d))
      totalDaysProcessed++
      totalUpserts++
      if (totalDaysProcessed % 10 === 0) {
        console.log('[recompute] days:', totalDaysProcessed, d.toISOString().slice(0, 10))
      }
    } catch (err) {
      dayErrors++
      console.warn('[recompute] day failed', d.toISOString().slice(0, 10), (err as Error).message)
    }
  }

  const monthStartFirst = firstDayOfMonth(addMonths(now, -RECOMPUTE_MONTHS))
  const monthEndBound = firstDayOfMonth(now)

  for (let m = new Date(monthStartFirst); m < monthEndBound; m = addMonths(m, 1)) {
    try {
      await recomputeMonth(new Date(m))
      totalMonthsProcessed++
      totalUpserts++
      console.log('[recompute] month:', m.toISOString().slice(0, 7))
    } catch (err) {
      monthErrors++
      console.warn('[recompute] month failed', m.toISOString().slice(0, 7), (err as Error).message)
    }
  }

  console.log('[recompute] Summary:')
  console.log('  totalDaysProcessed:', totalDaysProcessed)
  console.log('  totalMonthsProcessed:', totalMonthsProcessed)
  console.log('  totalUpserts:', totalUpserts)
  console.log('  dayErrors:', dayErrors)
  console.log('  monthErrors:', monthErrors)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
