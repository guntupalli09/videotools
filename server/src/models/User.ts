import { prisma } from '../db'
import type { Prisma, User as DbUser } from '@prisma/client'

export type PlanType = 'free' | 'basic' | 'pro' | 'agency'

export interface UsageThisMonth {
  totalMinutes: number
  videoCount: number
  batchCount: number
  languageCount: number
  translatedMinutes: number
  resetDate: Date
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
  passwordHash: string
  plan: PlanType
  stripeCustomerId?: string
  subscriptionId?: string
  paymentMethodId?: string
  billingPeriodStart?: Date
  billingPeriodEnd?: Date
  passwordSetupToken?: string
  passwordSetupExpiresAt?: Date
  passwordSetupUsed?: boolean
  passwordResetToken?: string
  passwordResetExpiresAt?: Date
  usageThisMonth: UsageThisMonth
  limits: PlanLimits
  overagesThisMonth: OveragesThisMonth
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
    passwordHash: row.passwordHash,
    plan: row.plan as PlanType,
    stripeCustomerId: row.stripeCustomerId ?? undefined,
    subscriptionId: row.subscriptionId ?? undefined,
    paymentMethodId: row.paymentMethodId ?? undefined,
    billingPeriodStart: row.billingPeriodStart ?? undefined,
    billingPeriodEnd: row.billingPeriodEnd ?? undefined,
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
      resetDate: usage?.resetDate ? new Date(usage.resetDate as string) : new Date(),
    },
    limits: limits as PlanLimits,
    overagesThisMonth: (overages ?? { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }) as OveragesThisMonth,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function userToDb(user: User) {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    plan: user.plan,
    stripeCustomerId: user.stripeCustomerId ?? null,
    subscriptionId: user.subscriptionId ?? null,
    paymentMethodId: user.paymentMethodId ?? null,
    billingPeriodStart: user.billingPeriodStart ?? null,
    billingPeriodEnd: user.billingPeriodEnd ?? null,
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
    },
    limits: user.limits as unknown as Record<string, unknown>,
    overagesThisMonth: user.overagesThisMonth as unknown as Record<string, unknown>,
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
