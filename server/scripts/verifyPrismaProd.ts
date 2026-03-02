/**
 * One-off: verify Prisma schema in prod (tables + key columns).
 * Run in prod: docker exec videotools-api npx tsx scripts/verifyPrismaProd.ts
 * (Or: node -r ts-node/register scripts/verifyPrismaProd.ts if tsx not in image)
 */
import '../src/env'
import { prisma } from '../src/db'

const expectedTables = [
  'User',
  'Job',
  'SubscriptionSnapshot',
  'BatchJobRecord',
  'Feedback',
  'DailyMetrics',
  'MonthlyMetrics',
]

const expectedColumns: Record<string, string[]> = {
  User: ['id', 'email', 'plan', 'role', 'utmSource', 'utmMedium', 'utmCampaign', 'firstReferrer', 'firstSeenAt', 'lastActiveAt', 'createdAt'],
  Job: ['id', 'userId', 'toolType', 'status', 'completedAt', 'processingMs', 'planAtRun', 'createdAt'],
  SubscriptionSnapshot: ['id', 'userId', 'plan', 'priceMonthly', 'currency', 'periodStart', 'periodEnd', 'status', 'stripeSubscriptionId', 'stripePriceId', 'billingInterval', 'intervalCount'],
  DailyMetrics: ['date', 'totalUsers', 'newUsers', 'activeUsers', 'jobsCreated', 'jobsCompleted', 'jobsFailed', 'avgProcessingMs', 'p95ProcessingMs', 'mrrCents', 'churnedUsers', 'newPaidUsers'],
  MonthlyMetrics: ['monthStart', 'totalUsers', 'newUsers', 'activeUsers', 'mrrCents', 'newMrrCents', 'churnedMrrCents', 'churnRatePercent'],
}

async function main() {
  console.log('Checking public schema tables and key columns...\n')

  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `
  const tableNames = tables.map((r) => r.tablename)

  let ok = true
  for (const name of expectedTables) {
    const exists = tableNames.includes(name)
    console.log(exists ? `  [OK] Table: ${name}` : `  [MISSING] Table: ${name}`)
    if (!exists) ok = false
  }

  for (const [table, cols] of Object.entries(expectedColumns)) {
    if (!tableNames.includes(table)) continue
    const rows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      table
    )
    const existing = new Set(rows.map((r) => r.column_name))
    for (const c of cols) {
      const has = existing.has(c)
      if (!has) {
        console.log(`  [MISSING COL] ${table}.${c}`)
        ok = false
      }
    }
  }

  const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname
  `
  console.log('\nIndexes:', indexes.length)
  const wantIndexes = ['User_createdAt_idx', 'Job_createdAt_idx', 'Job_completedAt_idx', 'SubscriptionSnapshot_periodStart_periodEnd_idx']
  for (const iname of wantIndexes) {
    const has = indexes.some((r) => r.indexname === iname)
    console.log(has ? `  [OK] ${iname}` : `  [MISSING] ${iname}`)
    if (!has) ok = false
  }

  console.log(ok ? '\nAll checks passed.' : '\nSome checks failed.')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
