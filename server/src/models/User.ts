import { prisma } from '../db'
import type { Prisma, User as DbUser } from '@prisma/client'
import { nextMidnightUTC } from '../utils/usageReset'

export type PlanType = 'free' | 'basic' | 'pro' | 'agency' | 'founding_workflow' | 'business'

export interface UsageThisMonth {
  totalMinutes: number
  videoCount: number
  batchCount: number
  languageCount: number
  translatedMinutes: number
  importCount: number
  resetDate: Date
  importCountToday: number
  importCountTodayResetDate: Date
  dailyMinutesToday: number
  dailyMinutesTodayResetDate: Date
  /**
   * @deprecated Use User.cancelAtPeriodEnd + User.billingPeriodEnd instead.
   * Kept for backward-compat reads from existing DB rows; no longer written.
   */
  subscriptionCancelingAt?: Date
}

export interface PlanLimits {
  minutesPerMonth: number
  maxVideoDuration: number
  maxFileSize: number
  maxConcurrentJobs: number
  maxLanguages: number
  batchEnabled: boolean
  batchMaxVideos: number
  batchMaxDuration: number
  batchMaxPerDay: number
}

export interface OveragesThisMonth {
  minutes: number
  languages: number
  batches: number
  totalCharge: number
}

export interface User {
  id: string
  email: string
  name?: string | null
  passwordHash: string
  plan: PlanType
  stripeCustomerId?: string
  subscriptionId?: string
  paymentMethodId?: string
  billingPeriodStart?: Date
  billingPeriodEnd?: Date
  subscriptionStatus?: string   // active | past_due | canceled | trialing | incomplete
  cancelAtPeriodEnd?: boolean
  passwordSetupToken?: string
  passwordSetupExpiresAt?: Date
  passwordSetupUsed?: boolean
  passwordResetToken?: string
  passwordResetExpiresAt?: Date
  usageThisMonth: UsageThisMonth
  limits: PlanLimits
  overagesThisMonth: OveragesThisMonth
  role?: string
  suspended?: boolean
  restrictionNote?: string
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  firstReferrer?: string | null
  firstSeenAt?: Date | null
  lastActiveAt?: Date | null
  referralCode?: string | null
  referredByUserId?: string | null
  bonusImportCredits?: number
  referralSignupCount?: number
  createdAt: Date
  updatedAt: Date
}

function rowToUser(row: DbUser): User {
  const usage = row.usageThisMonth as Record<string, unknown>
  const limits = row.limits as unknown as PlanLimits
  const overages = row.overagesThisMonth as unknown as OveragesThisMonth
  return {
    id: row.id,
    email: row.email,
    name: (row as { name?: string | null }).name ?? null,
    passwordHash: row.passwordHash,
    plan: row.plan as PlanType,
    stripeCustomerId: row.stripeCustomerId ?? undefined,
    subscriptionId: row.subscriptionId ?? undefined,
    paymentMethodId: row.paymentMethodId ?? undefined,
    billingPeriodStart: row.billingPeriodStart ?? undefined,
    billingPeriodEnd: row.billingPeriodEnd ?? undefined,
    subscriptionStatus: (row as { subscriptionStatus?: string | null }).subscriptionStatus ?? undefined,
    cancelAtPeriodEnd: (row as { cancelAtPeriodEnd?: boolean | null }).cancelAtPeriodEnd ?? false,
    passwordSetupToken: row.passwordSetupToken ?? undefined,
    passwordSetupExpiresAt: row.passwordSetupExpiresAt ?? undefined,
    passwordSetupUsed: row.passwordSetupUsed ?? false,
    passwordResetToken: row.passwordResetToken ?? undefined,
    passwordResetExpiresAt: row.passwordResetExpiresAt ?? undefined,
    usageThisMonth: {
      totalMinutes: Number(usage?.totalMinutes ?? 0),
      videoCount: Number(usage?.videoCount ?? 0),
      batchCount: Number(usage?.batchCount ?? 0),
      languageCount: Number(usage?.languageCount ?? 0),
      translatedMinutes: Number(usage?.translatedMinutes ?? 0),
      importCount: Number(usage?.importCount ?? 0),
      resetDate: usage?.resetDate ? new Date(usage.resetDate as string) : new Date(),
      importCountToday: Number(usage?.importCountToday ?? 0),
      // Must be *after* "now" until the next UTC midnight — never default to `new Date()` or
      // resetDailyImportIfNeeded() thinks the window already elapsed and zeros importCountToday on every read.
      importCountTodayResetDate: usage?.importCountTodayResetDate
        ? new Date(usage.importCountTodayResetDate as string)
        : nextMidnightUTC(new Date()),
      dailyMinutesToday: Number(usage?.dailyMinutesToday ?? 0),
      dailyMinutesTodayResetDate: usage?.dailyMinutesTodayResetDate
        ? new Date(usage.dailyMinutesTodayResetDate as string)
        : nextMidnightUTC(new Date()),
      subscriptionCancelingAt: usage?.subscriptionCancelingAt ? new Date(usage.subscriptionCancelingAt as string) : undefined,
    },
    limits: limits as PlanLimits,
    overagesThisMonth: (overages ?? { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }) as OveragesThisMonth,
    role: (row as { role?: string }).role ?? 'user',
    suspended: !!(usage?.suspended as boolean | undefined),
    restrictionNote: (usage?.restrictionNote as string | undefined) ?? undefined,
    utmSource: (row as { utmSource?: string | null }).utmSource ?? undefined,
    utmMedium: (row as { utmMedium?: string | null }).utmMedium ?? undefined,
    utmCampaign: (row as { utmCampaign?: string | null }).utmCampaign ?? undefined,
    firstReferrer: (row as { firstReferrer?: string | null }).firstReferrer ?? undefined,
    firstSeenAt: (row as { firstSeenAt?: Date | null }).firstSeenAt ?? undefined,
    lastActiveAt: (row as { lastActiveAt?: Date | null }).lastActiveAt ?? undefined,
    referralCode: (row as { referralCode?: string | null }).referralCode ?? undefined,
    referredByUserId: (row as { referredByUserId?: string | null }).referredByUserId ?? undefined,
    bonusImportCredits: Number((row as { bonusImportCredits?: number | null }).bonusImportCredits ?? 0),
    referralSignupCount: Number((row as { referralSignupCount?: number | null }).referralSignupCount ?? 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function userToDb(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    passwordHash: user.passwordHash,
    plan: user.plan,
    stripeCustomerId: user.stripeCustomerId ?? null,
    subscriptionId: user.subscriptionId ?? null,
    paymentMethodId: user.paymentMethodId ?? null,
    billingPeriodStart: user.billingPeriodStart ?? null,
    billingPeriodEnd: user.billingPeriodEnd ?? null,
    subscriptionStatus: user.subscriptionStatus ?? null,
    cancelAtPeriodEnd: user.cancelAtPeriodEnd ?? false,
    passwordSetupToken: user.passwordSetupToken ?? null,
    passwordSetupExpiresAt: user.passwordSetupExpiresAt ?? null,
    passwordSetupUsed: user.passwordSetupUsed ?? false,
    passwordResetToken: user.passwordResetToken ?? null,
    passwordResetExpiresAt: user.passwordResetExpiresAt ?? null,
    usageThisMonth: {
      ...user.usageThisMonth,
      resetDate: user.usageThisMonth.resetDate instanceof Date
        ? user.usageThisMonth.resetDate.toISOString()
        : user.usageThisMonth.resetDate,
      importCountTodayResetDate: user.usageThisMonth.importCountTodayResetDate instanceof Date
        ? user.usageThisMonth.importCountTodayResetDate.toISOString()
        : user.usageThisMonth.importCountTodayResetDate,
      dailyMinutesTodayResetDate: user.usageThisMonth.dailyMinutesTodayResetDate instanceof Date
        ? user.usageThisMonth.dailyMinutesTodayResetDate.toISOString()
        : user.usageThisMonth.dailyMinutesTodayResetDate,
      subscriptionCancelingAt: user.usageThisMonth.subscriptionCancelingAt instanceof Date
        ? user.usageThisMonth.subscriptionCancelingAt.toISOString()
        : (user.usageThisMonth.subscriptionCancelingAt ?? null),
      suspended: user.suspended ?? false,
      restrictionNote: user.restrictionNote ?? null,
    },
    limits: user.limits as unknown as Record<string, unknown>,
    overagesThisMonth: user.overagesThisMonth as unknown as Record<string, unknown>,
    role: user.role ?? 'user',
    utmSource: user.utmSource ?? null,
    utmMedium: user.utmMedium ?? null,
    utmCampaign: user.utmCampaign ?? null,
    firstReferrer: user.firstReferrer ?? null,
    firstSeenAt: user.firstSeenAt ?? null,
    lastActiveAt: user.lastActiveAt ?? null,
    referralCode: user.referralCode ?? null,
    referredByUserId: user.referredByUserId ?? null,
    bonusImportCredits: user.bonusImportCredits ?? 0,
    referralSignupCount: user.referralSignupCount ?? 0,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

export async function getUser(userId: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({ where: { id: userId } })
  return row ? rowToUser(row) : undefined
}

export async function saveUser(user: User): Promise<void> {
  const data = userToDb(user) as Prisma.UserCreateInput
  await prisma.user.upsert({
    where: { id: user.id },
    create: data,
    update: data as Prisma.UserUpdateInput,
  })
}

export async function getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({ where: { stripeCustomerId } })
  return row ? rowToUser(row) : undefined
}

/** Prefer the account with stripeCustomerId (paid) when multiple users share the same email. */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.toLowerCase()
  const rows = await prisma.user.findMany({
    where: { email: { equals: normalized, mode: 'insensitive' } },
    orderBy: [{ stripeCustomerId: 'desc' }], // non-null first (paid account)
  })
  const row = rows[0]
  return row ? rowToUser(row) : undefined
}

export async function getUserByPasswordToken(token: string): Promise<User | undefined> {
  const row = await prisma.user.findFirst({ where: { passwordSetupToken: token } })
  return row ? rowToUser(row) : undefined
}

export async function getUserByPasswordResetToken(token: string): Promise<User | undefined> {
  const row = await prisma.user.findFirst({ where: { passwordResetToken: token } })
  return row ? rowToUser(row) : undefined
}

/**
 * Atomically increment usage counters for a user in a single SQL UPDATE.
 * Avoids the read-modify-write race condition where two concurrent jobs
 * for the same user overwrite each other's increments.
 */
export async function incrementUserUsage(
  userId: string,
  delta: {
    totalMinutes?: number
    videoCount?: number
    translatedMinutes?: number
    languageCount?: number
    importCount?: number
    importCountToday?: number
    dailyMinutesToday?: number
  }
): Promise<void> {
  const {
    totalMinutes = 0,
    videoCount = 0,
    translatedMinutes = 0,
    languageCount = 0,
    importCount = 0,
    importCountToday = 0,
    dailyMinutesToday = 0,
  } = delta

  await prisma.$executeRaw`
    UPDATE "User"
    SET
      "usageThisMonth" = "usageThisMonth" || jsonb_build_object(
        'totalMinutes',        coalesce(("usageThisMonth"->>'totalMinutes')::numeric,        0) + ${totalMinutes},
        'videoCount',          coalesce(("usageThisMonth"->>'videoCount')::int,              0) + ${videoCount},
        'translatedMinutes',   coalesce(("usageThisMonth"->>'translatedMinutes')::numeric,   0) + ${translatedMinutes},
        'languageCount',       coalesce(("usageThisMonth"->>'languageCount')::int,           0) + ${languageCount},
        'importCount',         coalesce(("usageThisMonth"->>'importCount')::int,             0) + ${importCount},
        'importCountToday',    coalesce(("usageThisMonth"->>'importCountToday')::int,        0) + ${importCountToday},
        'dailyMinutesToday',   coalesce(("usageThisMonth"->>'dailyMinutesToday')::numeric,   0) + ${dailyMinutesToday}
      ),
      "updatedAt" = NOW()
    WHERE id = ${userId}
  `
}

/**
 * Atomically reset the daily import counter only if the stored reset date is still in the past.
 * Prevents the race where two concurrent requests do in-memory reset + saveUser and one
 * overwrites the other's atomic increments.
 */
export async function atomicResetDailyImportIfNeeded(
  userId: string,
  now: Date,
  newResetDate: Date
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET
      "usageThisMonth" = "usageThisMonth" || jsonb_build_object(
        'importCountToday',          0,
        'importCountTodayResetDate', ${newResetDate.toISOString()}::text
      ),
      "updatedAt" = NOW()
    WHERE id = ${userId}
      AND (
        "usageThisMonth"->>'importCountTodayResetDate' IS NULL
        OR ("usageThisMonth"->>'importCountTodayResetDate')::timestamptz <= ${now}
      )
  `
}

/**
 * Atomically reset the daily minutes counter only if the stored reset date is still in the past.
 */
export async function atomicResetDailyMinutesIfNeeded(
  userId: string,
  now: Date,
  newResetDate: Date
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET
      "usageThisMonth" = "usageThisMonth" || jsonb_build_object(
        'dailyMinutesToday',          0,
        'dailyMinutesTodayResetDate', ${newResetDate.toISOString()}::text
      ),
      "updatedAt" = NOW()
    WHERE id = ${userId}
      AND (
        "usageThisMonth"->>'dailyMinutesTodayResetDate' IS NULL
        OR ("usageThisMonth"->>'dailyMinutesTodayResetDate')::timestamptz <= ${now}
      )
  `
}
