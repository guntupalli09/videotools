import { PlanLimits, PlanType, User } from '../models/User'
import { getPlanTranslatedMinutesCap } from './metering'

export function getPlanLimits(plan: PlanType): PlanLimits {
  switch (plan) {
    case 'free':
      return {
        // Phase 2: Free = 200 minutes/month
        minutesPerMonth: 200,
        maxVideoDuration: 10,
        maxFileSize: 100 * 1024 * 1024,
        maxConcurrentJobs: 1,
        maxLanguages: 1,
        batchEnabled: false,
        batchMaxVideos: 0,
        batchMaxDuration: 0,
        batchMaxPerDay: 0,
      }
    case 'basic':
      return {
        // Phase 2: Basic = 600 minutes/month
        minutesPerMonth: 600,
        maxVideoDuration: 30,
        maxFileSize: 500 * 1024 * 1024,
        maxConcurrentJobs: 1,
        maxLanguages: 1,
        batchEnabled: false,
        batchMaxVideos: 0,
        batchMaxDuration: 0,
        batchMaxPerDay: 0,
      }
    case 'pro':
      return {
        minutesPerMonth: 1500,
        maxVideoDuration: 120,
        maxFileSize: 2 * 1024 * 1024 * 1024,
        maxConcurrentJobs: 3,
        maxLanguages: 5,
        batchEnabled: true,
        batchMaxVideos: 20,
        batchMaxDuration: 60,
        batchMaxPerDay: 3,
      }
    case 'agency':
      return {
        minutesPerMonth: 5000,
        maxVideoDuration: 240,
        maxFileSize: 10 * 1024 * 1024 * 1024,
        maxConcurrentJobs: 10,
        maxLanguages: 10,
        batchEnabled: true,
        batchMaxVideos: 100,
        batchMaxDuration: 300,
        batchMaxPerDay: 10,
      }
    default:
      return getPlanLimits('free')
  }
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
    if (!user.paymentMethodId) {
      return { allowed: false, overage: false }
    }

    const overageMinutes = projected - user.limits.minutesPerMonth
    // Phase 1.5: we only track overage minutes here; billing handled elsewhere
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

  if (batchesToday >= user.limits.batchMaxPerDay) {
    return { allowed: false, reason: 'BATCH_DAILY_LIMIT_REACHED' }
  }

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

