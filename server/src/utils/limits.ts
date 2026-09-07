import { PlanLimits, PlanType, User } from '../models/User'
import { getPlanTranslatedMinutesCap } from './metering'

// Phase 2.5: authoritative plan limits (FINAL)
export function getPlanLimits(plan: PlanType): PlanLimits {
  switch (plan) {
    case 'free':
      return {
        minutesPerMonth: 60, // kept for compatibility; free plan gates on importCount (3/month, resets 1st of month)
        maxVideoDuration: 30,
        maxFileSize: 2 * 1024 * 1024 * 1024, // 2 GB — typical iPhone short clips
        maxConcurrentJobs: 1,
        maxLanguages: 1,
        batchEnabled: false,
        batchMaxVideos: 0,
        batchMaxDuration: 0,
        batchMaxPerDay: 999,
      }
    case 'basic':
      return {
        minutesPerMonth: 450,
        maxVideoDuration: 45,
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5 GB
        maxConcurrentJobs: 1,
        maxLanguages: 2,
        batchEnabled: false,
        batchMaxVideos: 0,
        batchMaxDuration: 0,
        batchMaxPerDay: 999,
      }
    case 'pro':
      return {
        minutesPerMonth: 99999, // bypasses minute enforcement; daily soft cap via getDailySoftCapConcurrency
        maxVideoDuration: 120,
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10 GB
        maxConcurrentJobs: 4,
        maxLanguages: 5,
        batchEnabled: true,
        batchMaxVideos: 20,
        batchMaxDuration: 120,
        batchMaxPerDay: 999,
      }
    case 'agency':
      return {
        minutesPerMonth: 3000,
        maxVideoDuration: 240,
        maxFileSize: 20 * 1024 * 1024 * 1024, // 20 GB
        maxConcurrentJobs: 3,
        maxLanguages: 10,
        batchEnabled: true,
        batchMaxVideos: 100,
        batchMaxDuration: 300,
        batchMaxPerDay: 999,
      }
    case 'founding_workflow':
      return {
        minutesPerMonth: 600,
        maxVideoDuration: 120,
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10 GB
        maxConcurrentJobs: 2,
        maxLanguages: 5,
        batchEnabled: true,
        batchMaxVideos: 20,
        batchMaxDuration: 60,
        batchMaxPerDay: 999,
      }
    case 'business':
      return {
        minutesPerMonth: 99999,
        maxVideoDuration: 240,
        maxFileSize: 20 * 1024 * 1024 * 1024, // 20 GB
        maxConcurrentJobs: 8,
        maxLanguages: 10,
        batchEnabled: true,
        batchMaxVideos: 100,
        batchMaxDuration: 240,
        batchMaxPerDay: 999,
      }
    default:
      return getPlanLimits('free')
  }
}

/** Tier-aware max job runtime (minutes). Enforced in worker when queue_length >= 20. */
export function getMaxJobRuntimeMinutes(plan: PlanType): number {
  const runtimes: Record<PlanType, number> = {
    free: 10,
    basic: 15,
    pro: 30,
    agency: 45,
    founding_workflow: 30,
    business: 60,
  }
  return runtimes[plan] ?? 10
}

export function getJobPriority(plan: PlanType): number {
  const priorities: Record<PlanType, number> = {
    free: 1,
    basic: 5,
    pro: 10,
    agency: 20,
    founding_workflow: 10,
    business: 30,
  }
  return priorities[plan] ?? 1
}

/**
 * Returns the effective concurrent job limit for a Pro user based on
 * cumulative video minutes processed today. Business always returns 8.
 * Free / grandfathered plans return 1.
 * Jobs are NEVER rejected — this only sets concurrency (queue priority).
 */
export function getDailySoftCapConcurrency(plan: PlanType, dailyMinutesToday: number): number {
  if (plan === 'business') return 8
  if (plan === 'pro') {
    if (dailyMinutesToday < 90) return 4
    if (dailyMinutesToday < 180) return 2
    return 1
  }
  return 1
}

/** Returns true when a Pro user should see the soft-cap upgrade banner. */
export function isProSoftCapActive(plan: PlanType, dailyMinutesToday: number): boolean {
  return plan === 'pro' && dailyMinutesToday >= 90
}

/**
 * Applies the system-wide load multiplier to an already-computed plan concurrency.
 * Called at the upload gate so spikes (Reddit/ProductHunt) degrade gracefully
 * without rejecting jobs — users just queue slightly longer.
 * Result is always at least 1.
 */
export function applySystemLoadGuard(planConcurrency: number, systemMultiplier: number): number {
  return Math.max(1, Math.floor(planConcurrency * systemMultiplier))
}

/** Free plan: 3 successful imports per calendar month (resets on the 1st UTC). */
export const FREE_MONTHLY_IMPORT_LIMIT = 3

export const FREE_MONTHLY_IMPORT_QUOTA_MESSAGE =
  "You've used all 3 free imports this month. They reset on the 1st — or upgrade to Pro for unlimited processing."

export const GUEST_DAILY_IMPORT_QUOTA_MESSAGE =
  "You've used today's 3 free imports. They reset at midnight — or upgrade to Pro."

/**
 * Returns the max monthly imports for a plan.
 * Free = 3/month. All paid plans = null (no hard cap).
 */
export function getMaxMonthlyImports(plan: PlanType): number | null {
  if (plan === 'free') return FREE_MONTHLY_IMPORT_LIMIT
  return null
}

/** @deprecated Use getMaxMonthlyImports — alias kept for call-site migration. */
export function getMaxDailyImports(plan: PlanType): number | null {
  return getMaxMonthlyImports(plan)
}

export async function enforceUsageLimits(
  user: User,
  requestedMinutes: number
): Promise<{
  allowed: boolean
  overage: boolean
  overageMinutes?: number
}> {
  // Pro and Business are never blocked by minute limits
  if (user.plan === 'pro' || user.plan === 'business') {
    return { allowed: true, overage: false }
  }

  const projected = (user.usageThisMonth.totalMinutes ?? 0) + requestedMinutes

  if (projected > user.limits.minutesPerMonth) {
    // Overage allowed only for paid users (Stripe customer); do not allow overage to replace upgrading
    if (!user.stripeCustomerId) {
      return { allowed: false, overage: false }
    }

    const overageMinutes = projected - user.limits.minutesPerMonth
    user.overagesThisMonth.minutes += overageMinutes
    return { allowed: true, overage: true, overageMinutes }
  }

  return { allowed: true, overage: false }
}

/**
 * Total seconds for batch duration cap. Files with unknown duration count as one “fair share” of the batch
 * max (batchMaxDuration / batchMaxVideos) so a batch cannot be filled with unprobed long files.
 */
export function sumBatchVideoDurationsSeconds(
  user: User,
  videos: { duration: number; durationKnown?: boolean }[]
): number {
  const maxSec = user.limits.batchMaxDuration * 60
  const maxVideos = user.limits.batchMaxVideos
  const estimatePerUnknown = maxSec / Math.max(1, maxVideos)
  return videos.reduce((sum, v) => {
    if (v.durationKnown === false) return sum + estimatePerUnknown
    return sum + v.duration
  }, 0)
}

export async function enforceBatchLimits(
  user: User,
  videos: { duration: number; durationKnown?: boolean }[],
  batchesToday: number
): Promise<{ allowed: boolean; reason?: string }> {
  if (!user.limits.batchEnabled) {
    return { allowed: false, reason: 'BATCH_NOT_AVAILABLE' }
  }

  if (videos.length > user.limits.batchMaxVideos) {
    return { allowed: false, reason: 'BATCH_TOO_MANY_VIDEOS' }
  }

  const totalDurationSeconds = sumBatchVideoDurationsSeconds(user, videos)
  if (totalDurationSeconds > user.limits.batchMaxDuration * 60) {
    return { allowed: false, reason: 'BATCH_DURATION_EXCEEDED' }
  }

  // Phase 2.5: no daily batch cap; only max_videos and max_total_minutes
  return { allowed: true }
}

export function enforceLanguageLimits(user: User, additionalLanguages: string[]): { allowed: boolean; reason?: string } {
  const requested = additionalLanguages.length
  if (requested === 0) {
    return { allowed: true }
  }

  if (user.limits.maxLanguages <= 1) {
    return { allowed: false, reason: 'MULTI_LANGUAGE_NOT_AVAILABLE' }
  }

  if (requested > user.limits.maxLanguages - 1) {
    return { allowed: false, reason: 'TOO_MANY_LANGUAGES' }
  }

  return { allowed: true }
}

export function enforceTranslatedMinutesCap(
  user: User,
  additionalMinutes: number
): { allowed: boolean; reason?: string } {
  const cap = getPlanTranslatedMinutesCap(user.plan)
  if (!cap) return { allowed: true }

  const projected = (user.usageThisMonth.translatedMinutes ?? 0) + additionalMinutes
  if (projected > cap) {
    return { allowed: false, reason: 'TRANSLATED_MINUTES_CAP_REACHED' }
  }

  return { allowed: true }
}

