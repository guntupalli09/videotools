export type PlanType = 'free' | 'basic' | 'pro' | 'agency'

export interface UsageThisMonth {
  totalMinutes: number
  videoCount: number
  batchCount: number
  languageCount: number
  translatedMinutes: number
  // For free/demo users this is the calendar-based reset date.
  // For paid users this should align with Stripe's billing period_end.
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
  // For Phase 2 we only actively use minutes and totalCharge,
  // but we keep these extra counters for compatibility with Phase 1.5 logic.
  languages: number
  batches: number
  totalCharge: number
}

export interface User {
  id: string
  email: string
  passwordHash: string

  // Plan details
  plan: PlanType
  // Stripe Customer ID is the PRIMARY identity for paid users
  stripeCustomerId?: string
  subscriptionId?: string
  // Kept for Phase 1.5 compatibility; not actively used in Phase 2
  paymentMethodId?: string

  // Billing period (Stripe-driven for paid users)
  billingPeriodStart?: Date
  billingPeriodEnd?: Date

  // Password setup token for paid users (Phase 2)
  passwordSetupToken?: string
  passwordSetupExpiresAt?: Date
  passwordSetupUsed?: boolean

  // Usage tracking
  usageThisMonth: UsageThisMonth

  // Plan limits (cached from pricing tier)
  limits: PlanLimits

  // Overage tracking
  overagesThisMonth: OveragesThisMonth

  createdAt: Date
  updatedAt: Date
}

// NOTE:
// For Phase 1.5 we keep a very lightweight in-memory user store.
// In a real production environment this should be backed by a database.

const users = new Map<string, User>()

export function getUser(userId: string): User | undefined {
  return users.get(userId)
}

export function saveUser(user: User): void {
  users.set(user.id, user)
}

export function getUserByStripeCustomerId(stripeCustomerId: string): User | undefined {
  for (const user of users.values()) {
    if (user.stripeCustomerId === stripeCustomerId) {
      return user
    }
  }
  return undefined
}

export function getUserByEmail(email: string): User | undefined {
  const normalized = email.toLowerCase()
  for (const user of users.values()) {
    if (user.email.toLowerCase() === normalized) {
      return user
    }
  }
  return undefined
}

export function getUserByPasswordToken(token: string): User | undefined {
  for (const user of users.values()) {
    if (user.passwordSetupToken === token) {
      return user
    }
  }
  return undefined
}


