import toast from 'react-hot-toast'
import { REFERRAL_BONUS_PER_SIDE } from './referralConstants'

export const REFERRAL_REWARD_PENDING_KEY = 'videotext:referral_reward_pending'

/** Call after signup when server confirms referral was applied. */
export function celebrateReferralReward(bonusCount = REFERRAL_BONUS_PER_SIDE): void {
  try {
    sessionStorage.setItem(REFERRAL_REWARD_PENDING_KEY, String(bonusCount))
  } catch {
    // ignore
  }
  toast.success(
    `You earned ${bonusCount} bonus uploads from your referral! They apply after today's 3 free daily imports.`,
    { duration: 7000, id: 'referral-reward' },
  )
}

export function consumePendingReferralReward(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(REFERRAL_REWARD_PENDING_KEY)
    if (!raw) return null
    sessionStorage.removeItem(REFERRAL_REWARD_PENDING_KEY)
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : REFERRAL_BONUS_PER_SIDE
  } catch {
    return null
  }
}

export function formatImportQuotaLabel(opts: {
  dailyRemaining: number
  dailyLimit?: number
  bonusImportCredits?: number
}): string {
  const limit = opts.dailyLimit ?? 3
  const daily = Math.max(0, opts.dailyRemaining)
  const bonus = Math.max(0, opts.bonusImportCredits ?? 0)
  if (bonus > 0) {
    return `${daily} of ${limit} daily imports + ${bonus} bonus`
  }
  if (daily === 0) return `0 of ${limit} daily imports`
  return `${daily} of ${limit} imports remaining`
}
