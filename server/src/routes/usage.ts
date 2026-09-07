import express, { Request, Response } from 'express'
import { getUser, saveUser, User, atomicResetDailyImportIfNeeded, atomicResetDailyMinutesIfNeeded } from '../models/User'
import { getPlanLimits, getJobPriority, isProSoftCapActive } from '../utils/limits'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'
import { resetDailyImportIfNeeded, resetDailyMinutesIfNeeded, resetUserUsageIfNeeded } from '../utils/usageReset'
import { getPlanAndEmailForStripeCustomer, getSubscriptionPeriodEnd } from '../services/stripe'
import { enforceSubscriptionState, resolveRequestPlan } from '../utils/subscriptionGuard'

const router = express.Router()

/** Get or create user for usage/display. Returns null when not authenticated (no JWT/API key). */
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
      let billingPeriodStart: Date | undefined
      let billingPeriodEnd: Date | undefined
      const resetDate = stripeData.currentPeriodEnd
        ? new Date(stripeData.currentPeriodEnd * 1000)
        : now
      if (stripeData.subscriptionId) {
        const period = await getSubscriptionPeriodEnd(stripeData.subscriptionId)
        if (period) {
          billingPeriodStart = period.currentPeriodStart
          billingPeriodEnd = period.currentPeriodEnd
        }
      }
      if (!billingPeriodEnd) billingPeriodEnd = resetDate
      user = {
        id: userId,
        email: stripeData.email,
        passwordHash: '',
        plan: stripeData.plan,
        stripeCustomerId: userId,
        subscriptionId: stripeData.subscriptionId,
        paymentMethodId: undefined,
        billingPeriodStart,
        billingPeriodEnd,
        usageThisMonth: {
          totalMinutes: 0,
          videoCount: 0,
          batchCount: 0,
          languageCount: 0,
          translatedMinutes: 0,
          importCount: 0,
          resetDate: billingPeriodEnd ?? resetDate,
          importCountToday: 0,
          importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          dailyMinutesToday: 0,
          dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
        limits: getPlanLimits(stripeData.plan),
        overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
        createdAt: now,
        updatedAt: now,
      }
      await saveUser(user)
    }
  }

  const derivedPlan = resolveRequestPlan(user, auth?.plan)

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
        importCount: 0,
        resetDate,
        importCountToday: 0,
        importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        dailyMinutesToday: 0,
        dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
      limits,
      overagesThisMonth: { minutes: 0, languages: 0, batches: 0, totalCharge: 0 },
      createdAt: now,
      updatedAt: now,
    }

    await saveUser(user)
  }

  if (user) {
    // Enforce subscription state from DB (no live Stripe API call).
    // Webhook handlers keep billingPeriodEnd, subscriptionId, and subscriptionStatus
    // up-to-date, so no polling is needed here.  This call will downgrade the user
    // to free immediately if their billing period has expired and subscription is gone.
    await enforceSubscriptionState(user, now)

    if (resetUserUsageIfNeeded(user, now)) {
      await saveUser(user)
    } else {
      const dailyImportReset = resetDailyImportIfNeeded(user, now)
      const dailyMinutesReset = resetDailyMinutesIfNeeded(user, now)
      if (dailyImportReset) await atomicResetDailyImportIfNeeded(user.id, now, user.usageThisMonth.importCountTodayResetDate!)
      if (dailyMinutesReset) await atomicResetDailyMinutesIfNeeded(user.id, now, user.usageThisMonth.dailyMinutesTodayResetDate!)
    }
  }

  return user
}

router.get('/current', async (req: Request, res: Response) => {
  const user = await getOrCreateDemoUser(req)
  const plan = user?.plan ?? 'free'
  const limits = user?.limits ?? getPlanLimits(plan)
  const now = new Date()
  const usage = user?.usageThisMonth ?? {
    totalMinutes: 0,
    videoCount: 0,
    batchCount: 0,
    languageCount: 0,
    translatedMinutes: 0,
    importCount: 0,
    resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    importCountToday: 0,
    importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    dailyMinutesToday: 0,
    dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
  }
  const overages = user?.overagesThisMonth ?? { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
  const displayEmail =
    user?.email && !user.email.endsWith('@example.com') && !user.email.endsWith('@checkout.example.com')
      ? user.email
      : undefined

  if (plan === 'free') {
    const importCount = usage.importCount ?? 0
    const limit = 3
    const resetDate = usage.resetDate ?? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    res.json({
      plan: 'free',
      quotaType: 'imports',
      used: importCount,
      limit,
      remaining: Math.max(0, limit - importCount),
      resetDate: resetDate.toISOString(),
      email: displayEmail,
      limits: {
        maxLanguages: limits.maxLanguages,
        batchEnabled: limits.batchEnabled,
        maxFileSize: limits.maxFileSize,
        maxVideoDuration: limits.maxVideoDuration,
      },
      usage: {
        videoCount: usage.videoCount,
        batchCount: usage.batchCount,
        importCount,
        importCountToday: usage.importCountToday ?? 0,
      },
      overages: { minutes: 0, charge: 0 },
      queuePriority: getJobPriority(plan),
    })
    return
  }

  // Pro and Business: unlimited framing, soft cap signal only
  if (plan === 'pro' || plan === 'business') {
    const softCapActive = isProSoftCapActive(plan, usage.dailyMinutesToday ?? 0)
    const billingPeriodEnd = user!.billingPeriodEnd
    const resetDate = billingPeriodEnd ?? user!.usageThisMonth.resetDate
    res.json({
      plan,
      email: displayEmail,
      quotaType: 'unlimited',
      softCapActive,
      subscriptionStatus: user!.subscriptionStatus ?? null,
      cancelAtPeriodEnd: user!.cancelAtPeriodEnd ?? false,
      limits: {
        maxLanguages: limits.maxLanguages,
        batchEnabled: limits.batchEnabled,
        maxFileSize: limits.maxFileSize,
        maxVideoDuration: limits.maxVideoDuration,
        batchMaxVideos: limits.batchMaxVideos,
        maxConcurrentJobs: limits.maxConcurrentJobs,
      },
      usage: {
        videoCount: usage.videoCount,
        batchCount: usage.batchCount,
      },
      overages: { minutes: 0, charge: 0 },
      resetDate: resetDate.toISOString(),
      billingPeriodEnd: billingPeriodEnd?.toISOString() ?? null,
      queuePriority: getJobPriority(plan),
    })
    return
  }

  // Grandfathered plans (basic, agency, founding_workflow): keep minutes-based response unchanged
  const availableMinutes = limits.minutesPerMonth + overages.minutes
  const remaining = Math.max(0, availableMinutes - usage.totalMinutes)
  const billingPeriodEnd = user!.billingPeriodEnd
  const resetDate = billingPeriodEnd ?? user!.usageThisMonth.resetDate
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
    resetDate: resetDate.toISOString(),
    billingPeriodEnd: billingPeriodEnd?.toISOString() ?? null,
    queuePriority: getJobPriority(plan),
  })
})

export default router
