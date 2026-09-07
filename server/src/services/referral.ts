import crypto from 'crypto'
import { prisma } from '../db'
import { getLogger } from '../lib/logger'
import { REFERRAL_BONUS_IMPORTS } from '../utils/importQuota'

const log = getLogger('referral')

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode(length = 8): string {
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[bytes[i]! % CODE_CHARS.length]
  }
  return out
}

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return code.length >= 6 && code.length <= 16 ? code : null
}

/** Ensure user has a unique referral code (lazy generation). */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  })
  if (existing?.referralCode) return existing.referralCode

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode(8)
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      })
      if (updated.referralCode) return updated.referralCode
    } catch {
      // unique collision — retry
    }
  }
  throw new Error('Could not generate referral code')
}

export interface ReferralStats {
  referralCode: string
  referralLink: string
  bonusImportCredits: number
  referralSignupCount: number
  bonusPerSignup: number
}

export async function getReferralStats(userId: string, siteOrigin: string): Promise<ReferralStats> {
  const code = await ensureReferralCode(userId)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { bonusImportCredits: true, referralSignupCount: true },
  })
  const origin = siteOrigin.replace(/\/+$/, '')
  return {
    referralCode: code,
    referralLink: `${origin}/signup?ref=${encodeURIComponent(code)}`,
    bonusImportCredits: user?.bonusImportCredits ?? 0,
    referralSignupCount: user?.referralSignupCount ?? 0,
    bonusPerSignup: REFERRAL_BONUS_IMPORTS,
  }
}

/**
 * Apply referral on new signup. Idempotent per referee. Grants REFERRAL_BONUS_IMPORTS to both parties.
 */
export async function applyReferralOnSignup(
  refereeUserId: string,
  rawCode: string | null | undefined,
): Promise<{ applied: boolean; reason?: string }> {
  const code = normalizeReferralCode(rawCode)
  if (!code) return { applied: false, reason: 'no_code' }

  const referrer = await prisma.user.findFirst({
    where: { referralCode: code },
    select: { id: true, email: true },
  })
  if (!referrer) return { applied: false, reason: 'invalid_code' }
  if (referrer.id === refereeUserId) return { applied: false, reason: 'self_referral' }

  try {
    await prisma.$transaction(async (tx) => {
      const referee = await tx.user.findUnique({
        where: { id: refereeUserId },
        select: { referredByUserId: true },
      })
      if (!referee) throw new Error('referee_not_found')
      if (referee.referredByUserId) throw new Error('already_referred')

      const existing = await tx.referralSignup.findUnique({
        where: { refereeUserId },
      })
      if (existing) throw new Error('already_rewarded')

      await tx.referralSignup.create({
        data: {
          referrerUserId: referrer.id,
          refereeUserId,
          bonusCredits: REFERRAL_BONUS_IMPORTS,
        },
      })

      await tx.user.update({
        where: { id: refereeUserId },
        data: {
          referredByUserId: referrer.id,
          bonusImportCredits: { increment: REFERRAL_BONUS_IMPORTS },
        },
      })

      await tx.user.update({
        where: { id: referrer.id },
        data: {
          bonusImportCredits: { increment: REFERRAL_BONUS_IMPORTS },
          referralSignupCount: { increment: 1 },
        },
      })
    })

    log.info({
      msg: 'referral_reward_granted',
      referrerUserId: referrer.id,
      refereeUserId,
      bonusCredits: REFERRAL_BONUS_IMPORTS,
    })
    return { applied: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg === 'already_referred' || msg === 'already_rewarded') {
      return { applied: false, reason: msg }
    }
    log.error({ msg: 'referral_apply_failed', refereeUserId, error: msg })
    throw err
  }
}
