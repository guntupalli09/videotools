import type { User } from '../models/User'

/** Returns the next midnight UTC after `now`. */
export function nextMidnightUTC(now: Date): Date {
  const d = new Date(now)
  d.setUTCHours(24, 0, 0, 0)
  return d
}

/**
 * Single helper for monthly usage reset. Mutates user in place.
 * Free: resets importCount on the 1st of each calendar month (3 imports/month).
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
    importCountToday: 0,
    importCountTodayResetDate: nextMidnightUTC(now),
    dailyMinutesToday: 0,
    dailyMinutesTodayResetDate: nextMidnightUTC(now),
  }
  user.overagesThisMonth = { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
  user.updatedAt = now
  return true
}

/**
 * Resets the daily import counter if midnight UTC has passed.
 * Mutates user in place. Caller must call saveUser(user) when true is returned.
 */
export function resetDailyImportIfNeeded(user: User, now: Date): boolean {
  const resetDate = user.usageThisMonth.importCountTodayResetDate ?? new Date(0)
  if (now < resetDate) return false
  user.usageThisMonth.importCountToday = 0
  user.usageThisMonth.importCountTodayResetDate = nextMidnightUTC(now)
  user.updatedAt = now
  return true
}

/**
 * Resets the daily minutes counter if midnight UTC has passed.
 * Mutates user in place. Caller must call saveUser(user) when true is returned.
 */
export function resetDailyMinutesIfNeeded(user: User, now: Date): boolean {
  const resetDate = user.usageThisMonth.dailyMinutesTodayResetDate ?? new Date(0)
  if (now < resetDate) return false
  user.usageThisMonth.dailyMinutesToday = 0
  user.usageThisMonth.dailyMinutesTodayResetDate = nextMidnightUTC(now)
  user.updatedAt = now
  return true
}
