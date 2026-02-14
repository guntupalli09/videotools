import type { Request, Response } from 'express'
import Stripe from 'stripe'
import { stripe, getPlanFromPriceId } from '../services/stripe'
import {
  getUserByStripeCustomerId,
  getUserByPasswordToken,
  saveUser,
  User,
  PlanType,
} from '../models/User'
import { getPlanLimits } from '../utils/limits'
import { generatePasswordSetupToken } from '../utils/auth'
import { hasProcessedStripeEvent, markStripeEventProcessed } from '../models/StripeEventLog'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

async function ensureUserForStripeCustomer(
  stripeCustomerId: string,
  emailHint?: string | null
): Promise<User> {
  const existing = await getUserByStripeCustomerId(stripeCustomerId)
  if (existing) {
    return existing
  }

  const now = new Date()
  const email = emailHint || `${stripeCustomerId}@example.com`
  const defaultPlan: PlanType = 'free'
  const limits = getPlanLimits(defaultPlan)

  const user: User = {
    id: stripeCustomerId,
    email,
    passwordHash: '',
    plan: defaultPlan,
    stripeCustomerId,
    subscriptionId: undefined,
    billingPeriodStart: undefined,
    billingPeriodEnd: undefined,
    passwordSetupToken: undefined,
    passwordSetupExpiresAt: undefined,
    passwordSetupUsed: false,
    usageThisMonth: {
      totalMinutes: 0,
      videoCount: 0,
      batchCount: 0,
      languageCount: 0,
      translatedMinutes: 0,
      resetDate: now,
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

  await saveUser(user)
  return user
}

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session

  const stripeCustomerId = (session.customer as string) || ''
  if (!stripeCustomerId) {
    return
  }

  const email =
    session.customer_details?.email || (session.metadata && session.metadata.email) || null
  const purchaseType = session.metadata?.purchaseType
  const planFromMetadata = session.metadata?.plan as PlanType | undefined

  let user = await ensureUserForStripeCustomer(stripeCustomerId, email)
  const now = new Date()

  // Link subscription and set billing period from Stripe (so "Resets" shows correct date, e.g. 1 month after purchase)
  if (session.mode === 'subscription' && typeof session.subscription === 'string') {
    user.subscriptionId = session.subscription
    try {
      const subscription = (await stripe.subscriptions.retrieve(
        session.subscription
      )) as { current_period_end?: number; current_period_start?: number }
      const periodEnd = subscription.current_period_end
      if (periodEnd) {
        const endDate = new Date(periodEnd * 1000)
        user.billingPeriodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000)
          : undefined
        user.billingPeriodEnd = endDate
        user.usageThisMonth = {
          ...user.usageThisMonth,
          resetDate: endDate,
        }
      }
    } catch (e) {
      console.warn('[Stripe] Could not fetch subscription for billing period:', (e as Error).message)
    }
  }

  // Activate subscription plan
  if (purchaseType === 'subscription' && planFromMetadata) {
    if (planFromMetadata === 'basic' || planFromMetadata === 'pro' || planFromMetadata === 'agency') {
      user.plan = planFromMetadata
      user.limits = getPlanLimits(planFromMetadata)
    }
  }

  // Phase 2.5: One-time overage 100 minutes = $5
  if (purchaseType === 'overage') {
    user.overagesThisMonth.minutes += 100
    user.overagesThisMonth.totalCharge += 5
  }

  // Generate password setup token for new paid users (only if not already set by session-details)
  if (!user.passwordHash && !user.passwordSetupToken) {
    const { token, expiresAt } = generatePasswordSetupToken()
    user.passwordSetupToken = token
    user.passwordSetupExpiresAt = expiresAt
    user.passwordSetupUsed = false
  }

  user.updatedAt = now
  await saveUser(user)
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice

  const stripeCustomerId = (invoice.customer as string) || ''
  if (!stripeCustomerId) {
    return
  }

  let user = await ensureUserForStripeCustomer(
    stripeCustomerId,
    invoice.customer_email || undefined
  )

  // Determine active subscription plan from line items (Stripe API: pricing.price_details.price)
  let activePlan: PlanType | null = null
  for (const line of invoice.lines.data) {
    const priceDetails = line.pricing?.price_details
    const priceId =
      !priceDetails
        ? null
        : typeof priceDetails.price === 'string'
          ? priceDetails.price
          : priceDetails.price?.id ?? null
    if (!priceId) continue
    const plan = getPlanFromPriceId(priceId)
    if (plan) {
      activePlan = plan
      break
    }
  }

  if (activePlan) {
    user.plan = activePlan
    user.limits = getPlanLimits(activePlan)
  }

  // Use Stripe timestamps ONLY for billing period
  const periodStart =
    (invoice.lines.data[0]?.period?.start ??
      invoice.period_start ??
      Math.floor(Date.now() / 1000)) * 1000
  const periodEnd =
    (invoice.lines.data[0]?.period?.end ??
      invoice.period_end ??
      Math.floor(Date.now() / 1000)) * 1000

  const startDate = new Date(periodStart)
  const endDate = new Date(periodEnd)

  user.billingPeriodStart = startDate
  user.billingPeriodEnd = endDate

  // Reset usage strictly using Stripe billing period
  user.usageThisMonth = {
    totalMinutes: 0,
    videoCount: 0,
    batchCount: 0,
    languageCount: 0,
    translatedMinutes: 0,
    resetDate: endDate,
  }

  // Clear overages for new cycle
  user.overagesThisMonth.minutes = 0
  user.overagesThisMonth.totalCharge = 0

  user.updatedAt = new Date()
  saveUser(user)
}

async function handleCustomerSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription & {
    current_period_end?: number
  }
  const stripeCustomerId = (subscription.customer as string) || ''
  if (!stripeCustomerId) {
    return
  }

  const user = await getUserByStripeCustomerId(stripeCustomerId)
  if (!user) {
    return
  }

  const periodEnd =
    (subscription.current_period_end ??
      subscription.cancel_at ??
      subscription.ended_at ??
      Math.floor(Date.now() / 1000)) * 1000

  const endDate = new Date(periodEnd)

  // Keep access until period_end, but mark subscription as gone
  user.subscriptionId = undefined
  user.billingPeriodEnd = endDate
  user.usageThisMonth.resetDate = endDate
  user.updatedAt = new Date()
  await saveUser(user)
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured.')
    return res.status(500).send('Webhook not configured')
  }

  const sig = req.headers['stripe-signature'] as string | undefined
  const buf = (req as any).body as Buffer

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig || '', webhookSecret)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Idempotency: skip if already processed
  if (hasProcessedStripeEvent(event.id)) {
    return res.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event)
        break
      case 'customer.subscription.deleted':
        await handleCustomerSubscriptionDeleted(event)
        break
      default:
        // Ignore all other event types
        break
    }

    markStripeEventProcessed(event)
    return res.json({ received: true })
  } catch (error: any) {
    console.error('Error handling Stripe webhook event:', event.type, error)
    return res.status(500).send('Webhook handler error')
  }
}

