import { PlanType } from '../models/User'

export function secondsToMinutes(seconds: number): number {
  return Math.ceil(seconds / 60)
}

export function calculatePrimaryMinutes(durationSeconds: number): number {
  return secondsToMinutes(durationSeconds)
}

export function calculateTranslationMinutes(
  durationSeconds: number,
  additionalLanguageCount: number
): number {
  // Each additional translation counts as 0.5x video duration
  const baseMinutes = secondsToMinutes(durationSeconds)
  return Math.ceil(baseMinutes * 0.5 * additionalLanguageCount)
}

export function calculateTotalMultiLanguageMinutes(
  durationSeconds: number,
  additionalLanguageCount: number
): number {
  const primary = calculatePrimaryMinutes(durationSeconds)
  const translated = calculateTranslationMinutes(durationSeconds, additionalLanguageCount)
  return primary + translated
}

export function getPlanTranslatedMinutesCap(plan: PlanType): number | null {
  if (plan === 'pro') return 500
  if (plan === 'agency') return 2000
  return null
}

