import express, { Request, Response } from 'express'
import { getUser, saveUser, User, PlanType } from '../models/User'
import { getPlanLimits, getJobPriority } from '../utils/limits'
import { getAuthFromRequest } from '../utils/auth'

const router = express.Router()

// For Phase 1.5 we derive a demo user from a simple header or fall back to free.
function getOrCreateDemoUser(req: Request): User {
  const auth = getAuthFromRequest(req)
  const headerUserId = (req.headers['x-user-id'] as string) || 'demo-user'
  const headerPlan = (req.headers['x-plan'] as string) as PlanType | undefined

  const userId = auth?.userId || headerUserId
  let user = getUser(userId)

  const now = new Date()

  if (!user) {
    const derivedPlan: PlanType =
      auth?.plan && (auth.plan === 'basic' || auth.plan === 'pro' || auth.plan === 'agency')
        ? auth.plan
        : headerPlan === 'basic' || headerPlan === 'pro' || headerPlan === 'agency'
        ? headerPlan
        : 'free'
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
      overagesThisMonth: {
        minutes: 0,
        languages: 0,
        batches: 0,
        totalCharge: 0,
      },
      createdAt: now,
      updatedAt: now,
    }

    saveUser(user)
  } else {
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
      saveUser(user)
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
      saveUser(user)
    }
  }

  return user
}

router.get('/current', (req: Request, res: Response) => {
  const user = getOrCreateDemoUser(req)

  const availableMinutes = user.limits.minutesPerMonth + user.overagesThisMonth.minutes
  const remaining = Math.max(0, availableMinutes - user.usageThisMonth.totalMinutes)

  res.json({
    plan: user.plan,
    limits: {
      minutesPerMonth: user.limits.minutesPerMonth,
      maxLanguages: user.limits.maxLanguages,
      batchEnabled: user.limits.batchEnabled,
    },
    usage: {
      totalMinutes: user.usageThisMonth.totalMinutes,
      remaining,
      videoCount: user.usageThisMonth.videoCount,
      batchCount: user.usageThisMonth.batchCount,
    },
    overages: {
      minutes: user.overagesThisMonth.minutes,
      charge: user.overagesThisMonth.totalCharge,
    },
    resetDate: user.usageThisMonth.resetDate.toISOString(),
    queuePriority: getJobPriority(user.plan),
  })
})

export default router

