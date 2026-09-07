import { describe, expect, it } from 'vitest'
import { normalizeReferralCode } from '../src/services/referral'
import { canFreeUserImport, REFERRAL_BONUS_IMPORTS } from '../src/utils/importQuota'
import type { User } from '../src/models/User'

describe('normalizeReferralCode', () => {
  it('accepts alphanumeric codes 6-16 chars', () => {
    expect(normalizeReferralCode('abc123')).toBe('ABC123')
    expect(normalizeReferralCode('  vt-abc12  ')).toBe('VTABC12')
  })

  it('rejects too short or empty', () => {
    expect(normalizeReferralCode('abc')).toBeNull()
    expect(normalizeReferralCode('')).toBeNull()
    expect(normalizeReferralCode(null)).toBeNull()
  })
})

describe('canFreeUserImport', () => {
  const baseUser = {
    plan: 'free',
    usageThisMonth: { importCountToday: 3 } as User['usageThisMonth'],
    bonusImportCredits: 0,
  } as User

  it('blocks when daily cap hit and no bonus', () => {
    expect(canFreeUserImport(baseUser)).toBe(false)
  })

  it('allows when bonus credits remain', () => {
    expect(canFreeUserImport({ ...baseUser, bonusImportCredits: REFERRAL_BONUS_IMPORTS })).toBe(true)
  })

  it('allows when under daily cap', () => {
    expect(
      canFreeUserImport({
        ...baseUser,
        usageThisMonth: { ...baseUser.usageThisMonth, importCountToday: 2 },
      }),
    ).toBe(true)
  })
})

describe('planShowsProminentShareBranding', () => {
  it('is exported from shareBranding util', async () => {
    const { planShowsProminentShareBranding } = await import('../src/utils/shareBranding')
    expect(planShowsProminentShareBranding('free')).toBe(true)
    expect(planShowsProminentShareBranding('pro')).toBe(false)
  })
})
