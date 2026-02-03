import { PlanLimits, PlanType, User } from '../models/User'
import { getPlanTranslatedMinutesCap } from './metering'

// Phase 2.5: authoritative plan limits (FINAL)
export function getPlanLimits(plan: PlanType): PlanLimits {
  switch (plan) {
    case 'free':
      return {
        minutesPerMonth: 60,
        maxVideoDuration: 5,
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
        maxVideoDuration: 30,
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
        minutesPerMonth: 1200,
        maxVideoDuration: 120,
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10 GB
        maxConcurrentJobs: 2,
        maxLanguages: 5,
        batchEnabled: true,
        batchMaxVideos: 20,
        batchMaxDuration: 60,
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
  }
  return runtimes[plan] ?? 10
}

export function getJobPriority(plan: PlanType): number {
  const priorities: Record<PlanType, number> = {
    free: 1,
    basic: 5,
    pro: 10,
    agency: 20,
  }
  return priorities[plan] ?? 1
}

export async function enforceUsageLimits(
  user: User,
  requestedMinutes: number
): Promise<{
  allowed: boolean
  overage: boolean
  overageMinutes?: number
}> {
  const projected = user.usageThisMonth.totalMinutes + requestedMinutes

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

export async function enforceBatchLimits(
  user: User,
  videos: { duration: number }[],
  batchesToday: number
): Promise<{ allowed: boolean; reason?: string }> {
  if (!user.limits.batchEnabled) {
    return { allowed: false, reason: 'BATCH_NOT_AVAILABLE' }
  }

  if (videos.length > user.limits.batchMaxVideos) {
    return { allowed: false, reason: 'BATCH_TOO_MANY_VIDEOS' }
  }

  const totalDurationSeconds = videos.reduce((sum, v) => sum + v.duration, 0)
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

  const projected = user.usageThisMonth.translatedMinutes + additionalMinutes
  if (projected > cap) {
    return { allowed: false, reason: 'TRANSLATED_MINUTES_CAP_REACHED' }
  }

  return { allowed: true }
}

