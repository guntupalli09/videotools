import express, { Request, Response } from 'express'
import { getUser, saveUser, User, PlanType } from '../models/User'
import { getPlanLimits, getJobPriority } from '../utils/limits'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import {
  getPlanAndEmailForStripeCustomer,
  getSubscriptionPeriodEnd,
} from '../services/stripe'

const router = express.Router()

// For Phase 1.5 we derive a demo user from a simple header or fall back to free.
// When user is missing but x-user-id looks like a Stripe customer (cus_*), we restore from Stripe so paid plan survives API restarts.
async function getOrCreateDemoUser(req: Request): Promise<User | null> {
  const auth = getAuthFromRequest(req)
  const userId = getEffectiveUserId(req)
  if (!userId) return null
  let user = await getUser(userId)

  const now = new Date()

  // If no user in memory but identity is a Stripe customer id (from JWT/apiKey), restore from Stripe (handles API restart after payment)
  if (!user && userId.startsWith('cus_')) {
    const stripeData = await getPlanAndEmailForStripeCustomer(userId)
    if (stripeData) {
      const resetDate = stripeData.currentPeriodEnd
        ? new Date(stripeData.currentPeriodEnd * 1000)
        : now
      user = {
        id: userId,
        email: stripeData.email,
        passwordHash: '',
        plan: stripeData.plan,
        stripeCustomerId: userId,
        subscriptionId: stripeData.subscriptionId,
        paymentMethodId: undefined,
        usageThisMonth: {
          totalMinutes: 0,
          videoCount: 0,
          batchCount: 0,
          languageCount: 0,
          translatedMinutes: 0,
          resetDate,
        },
        limits: getPlanLimits(stripeData.plan),
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      await saveUser(user)
    }
  }

  // Paid plans: from auth, or from existing Stripe-backed user; unauthenticated without Stripe = free (abuse-proof)
  const derivedPlan: PlanType =
    auth?.plan && (auth.plan === 'basic' || auth.plan === 'pro' || auth.plan === 'agency')
      ? auth.plan
      : user?.stripeCustomerId
        ? user.plan
        : 'free'

  if (!user) {
    const plan = derivedPlan
    const limits = getPlanLimits(plan)
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    user = {
      id: userId,
      email: `${userId}@example.com`,
      passwordHash: '',
      plan,
      stripeCustomerId: '',
      subscriptionId: '',
      paymentMethodId: undefined,
      usageThisMonth: {
        totalMinutes: 0,
        videoCount: 0,
        batchCount: 0,
        languageCount: 0,
        translatedMinutes: 0,
        resetDate,
      },
      limits,
      overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
      createdAt: now,
      updatedAt: now,
    }

    await saveUser(user)
  } else {
    // Keep user plan/limits in sync with request (free, basic, pro, agency) so minute balance is correct
    if (user.plan !== derivedPlan) {
      user.plan = derivedPlan
      user.limits = getPlanLimits(derivedPlan)
      user.updatedAt = now
      await saveUser(user)
    }
  }

  if (user) {
    // Sync billing period from Stripe for paid users with subscription (fixes wrong reset date e.g. 28/2 instead of 14/3)
    if (user.subscriptionId) {
      const period = await getSubscriptionPeriodEnd(user.subscriptionId)
      if (period && period.currentPeriodEnd > now) {
        const resetTime = period.currentPeriodEnd.getTime()
        const currentResetTime = user.usageThisMonth.resetDate.getTime()
        if (!user.billingPeriodEnd || Math.abs(currentResetTime - resetTime) > 60_000) {
          user.billingPeriodEnd = period.currentPeriodEnd
          user.billingPeriodStart = period.currentPeriodStart
          user.usageThisMonth = { ...user.usageThisMonth, resetDate: period.currentPeriodEnd }
          user.updatedAt = now
          await saveUser(user)
        }
      }
    }
    // Stripe-driven reset: if a paid user with billingPeriodEnd and no active subscription
    // has passed their period end, downgrade them to Free.
    if (user.billingPeriodEnd && user.billingPeriodEnd < now && !user.subscriptionId) {
      user.plan = 'free'
      user.limits = getPlanLimits('free')
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      user.usageThisMonth = {
        totalMinutes: 0,
        videoCount: 0,
        batchCount: 0,
        languageCount: 0,
        translatedMinutes: 0,
        resetDate,
      }
      user.overagesThisMonth = { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
      user.updatedAt = now
      await saveUser(user)
    } else if (now > user.usageThisMonth.resetDate) {
      // Fallback monthly reset for free/demo users
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      user.usageThisMonth = {
        totalMinutes: 0,
        videoCount: 0,
        batchCount: 0,
        languageCount: 0,
        translatedMinutes: 0,
        resetDate,
      }
      user.overagesThisMonth = { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
      user.updatedAt = now
      await saveUser(user)
    }
  }

  return user
}

router.get('/current', async (req: Request, res: Response) => {
  const user = await getOrCreateDemoUser(req)
  const plan = user?.plan ?? 'free'
  const limits = user?.limits ?? getPlanLimits(plan)
  const usage = user?.usageThisMonth ?? {
    totalMinutes: 0,
    videoCount: 0,
    batchCount: 0,
    languageCount: 0,
    translatedMinutes: 0,
    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
  }
  const overages = user?.overagesThisMonth ?? { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
  const availableMinutes = limits.minutesPerMonth + overages.minutes
  const remaining = Math.max(0, availableMinutes - usage.totalMinutes)

  const displayEmail =
    user?.email && !user.email.endsWith('@example.com') && !user.email.endsWith('@checkout.example.com')
      ? user.email
      : undefined
  res.json({
    plan,
    email: displayEmail,
    limits: {
      minutesPerMonth: limits.minutesPerMonth,
      maxLanguages: limits.maxLanguages,
      batchEnabled: limits.batchEnabled,
      maxFileSize: limits.maxFileSize,
      maxVideoDuration: limits.maxVideoDuration,
    },
    usage: {
      totalMinutes: usage.totalMinutes,
      remaining,
      videoCount: usage.videoCount,
      batchCount: usage.batchCount,
    },
    overages: {
      minutes: overages.minutes,
      charge: overages.totalCharge,
    },
    resetDate: usage.resetDate.toISOString(),
    queuePriority: getJobPriority(plan),
  })
})

export default router

