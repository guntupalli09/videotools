import type { User } from '../models/User'
import { getMaxDailyImports } from './limits'
import { prisma } from '../db'

export const REFERRAL_BONUS_IMPORTS = 3

/** Free plan: allow upload when under daily cap OR bonus credits remain. */
export function canFreeUserImport(user: User): boolean {
  const dailyCap = getMaxDailyImports(user.plan)
  if (dailyCap === null) return true
  const usedToday = user.usageThisMonth.importCountToday ?? 0
  const bonus = user.bonusImportCredits ?? 0
  return usedToday < dailyCap || bonus > 0
}

export function freeImportBlockedMessage(): string {
  return "You've used today's 3 free imports. Use referral bonus credits, wait until midnight UTC, or upgrade to Pro."
}

/**
 * Atomically record a free-plan import: increments daily counter until cap, then consumes bonus credits.
 */
export async function recordFreePlanImport(userId: string): Promise<void> {
  const dailyCap = getMaxDailyImports('free') ?? 3
  await prisma.$executeRaw`
    UPDATE "User"
    SET
      "usageThisMonth" = "usageThisMonth" || jsonb_build_object(
        'importCount', coalesce(("usageThisMonth"->>'importCount')::int, 0) + 1,
        'importCountToday', CASE
          WHEN coalesce(("usageThisMonth"->>'importCountToday')::int, 0) < ${dailyCap}
            THEN coalesce(("usageThisMonth"->>'importCountToday')::int, 0) + 1
          ELSE coalesce(("usageThisMonth"->>'importCountToday')::int, 0)
        END
      ),
      "bonusImportCredits" = CASE
        WHEN coalesce(("usageThisMonth"->>'importCountToday')::int, 0) >= ${dailyCap}
          THEN GREATEST(0, "bonusImportCredits" - 1)
        ELSE "bonusImportCredits"
      END,
      "updatedAt" = NOW()
    WHERE id = ${userId}
  `
}

/** Gate check helper — throws-shaped result for routes. */
export function assertCanImport(user: User): { ok: true } | { ok: false; message: string } {
  const dailyCap = getMaxDailyImports(user.plan)
  if (dailyCap === null) return { ok: true }
  if (canFreeUserImport(user)) return { ok: true }
  return { ok: false, message: freeImportBlockedMessage() }
}
