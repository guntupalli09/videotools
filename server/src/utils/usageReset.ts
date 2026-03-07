import type { User } from '../models/User'

/**
 * Single helper for monthly usage reset. Mutates user in place.
 * Free: resets importCount on the 1st of each calendar month (3 imports/month, not lifetime).
 * Paid: zero usage; resetDate from Stripe billing period (caller syncs billingPeriodEnd).
 * Caller must call saveUser(user) after this when reset was applied.
 */
export function resetUserUsageIfNeeded(user: User, now: Date): boolean {
  if (now <= user.usageThisMonth.resetDate) return false

  const resetDate = user.plan === 'free'
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1) // first of next calendar month
    : (user.billingPeriodEnd ?? new Date(now.getFullYear(), now.getMonth() + 1, 1))

  user.usageThisMonth = {
    totalMinutes: 0,
    videoCount: 0,
    batchCount: 0,
    languageCount: 0,
    translatedMinutes: 0,
    importCount: 0,
    resetDate,
  }
  user.overagesThisMonth = { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
  user.updatedAt = now
  return true
}
