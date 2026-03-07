/**
 * CLI entry point for recompute metrics.
 *
 * Usage:
 *   cd server && RECOMPUTE_DAYS=90 RECOMPUTE_MONTHS=12 npx tsx scripts/recomputeMetrics.ts
 *
 * Env:
 *   RECOMPUTE_DAYS   Optional. Default 90. Number of days to recompute (back from today).
 *   RECOMPUTE_MONTHS Optional. Default 12. Number of months to recompute.
 */

import '../src/env'
import { runRecompute } from '../src/services/recomputeMetrics'

const RECOMPUTE_DAYS = Math.max(1, Math.min(366, parseInt(process.env.RECOMPUTE_DAYS ?? '90', 10)))
const RECOMPUTE_MONTHS = Math.max(1, Math.min(60, parseInt(process.env.RECOMPUTE_MONTHS ?? '12', 10)))

runRecompute(RECOMPUTE_DAYS, RECOMPUTE_MONTHS)
  .then((r) => {
    console.log('[recompute] Summary:')
    console.log('  totalDaysProcessed:', r.daysProcessed)
    console.log('  totalMonthsProcessed:', r.monthsProcessed)
    console.log('  dayErrors:', r.dayErrors)
    console.log('  monthErrors:', r.monthErrors)
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
