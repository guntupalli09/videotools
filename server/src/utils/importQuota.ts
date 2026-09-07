import type { User } from '../models/User'
import { FREE_MONTHLY_IMPORT_QUOTA_MESSAGE, getMaxMonthlyImports } from './limits'
import { prisma } from '../db'

export const REFERRAL_BONUS_IMPORTS = 3

/** Free plan: allow upload when under monthly cap OR bonus credits remain. */
export function canFreeUserImport(user: User): boolean {
  const monthlyCap = getMaxMonthlyImports(user.plan)
  if (monthlyCap === null) return true
  const usedMonth = user.usageThisMonth.importCount ?? 0
  const bonus = user.bonusImportCredits ?? 0
  return usedMonth < monthlyCap || bonus > 0
}

export function freeImportBlockedMessage(): string {
  return FREE_MONTHLY_IMPORT_QUOTA_MESSAGE
}

/**
 * Atomically record a free-plan import: increments monthly counter until cap, then consumes bonus credits.
 */
export async function recordFreePlanImport(userId: string): Promise<void> {
  const monthlyCap = getMaxMonthlyImports('free') ?? 3
  await prisma.$executeRaw`
    UPDATE "User"
    SET
      "usageThisMonth" = "usageThisMonth" || jsonb_build_object(
        'importCount', coalesce(("usageThisMonth"->>'importCount')::int, 0) + 1,
        'importCountToday', coalesce(("usageThisMonth"->>'importCountToday')::int, 0) + 1
      ),
      "bonusImportCredits" = CASE
        WHEN coalesce(("usageThisMonth"->>'importCount')::int, 0) >= ${monthlyCap}
          THEN GREATEST(0, "bonusImportCredits" - 1)
        ELSE "bonusImportCredits"
      END,
      "updatedAt" = NOW()
    WHERE id = ${userId}
  `
}

/** Gate check helper — throws-shaped result for routes. */
export function assertCanImport(user: User): { ok: true } | { ok: false; message: string } {
  const monthlyCap = getMaxMonthlyImports(user.plan)
  if (monthlyCap === null) return { ok: true }
  if (canFreeUserImport(user)) return { ok: true }
  return { ok: false, message: freeImportBlockedMessage() }
}
