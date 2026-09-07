import express, { Request, Response } from 'express'
import crypto from 'crypto'
import { stripe, getStripePriceConfig, BillingPlan, findStripeCustomerIdByEmail, verifyProPrice, selectProPriceId, ProBillingInterval } from '../services/stripe'
import { getUser, getUserByStripeCustomerId, getUserByEmail, saveUser } from '../models/User'
import { prisma } from '../db'
import type { User, PlanType } from '../models/User'
import { getPlanLimits } from '../utils/limits'
import { getAuthFromRequest, getEffectiveUserId, verifyEmailVerificationToken, generatePasswordSetupToken, signAuthToken } from '../utils/auth'
import { isAllowedOrigin, normalizeOrigin } from '../utils/allowedOrigins'
import { getLogger } from '../lib/logger'
import { captureFunnelEvent } from '../utils/funnelEvents'
import { recordUpgradeIntent } from '../models/UpgradeIntent'
import {
  getRequestCountry,
  resolvePricingTier,
  buildProPriceDisplay,
  PPP_PRICING_ENABLED,
} from '../utils/geoPricing'
import { resolveEffectivePricingTier } from '../services/stripePricingTiers'

const log = getLogger('api')
const router = express.Router()

/** Geo-aware Pro pricing for client display — tier is resolved server-side from IP country. */
router.get('/prices', (req: Request, res: Response) => {
  const country = getRequestCountry(req)
  const requestedTier = resolvePricingTier(country)
  const effectiveTier = resolveEffectivePricingTier(requestedTier)
  const display = buildProPriceDisplay(country, effectiveTier, PPP_PRICING_ENABLED)
  return res.json({
    ...display,
    tier: effectiveTier,
    requestedTier,
  })
})

interface CheckoutRequestBody {
  mode: 'subscription' | 'payment'
  plan?: BillingPlan
  annual?: boolean // Backward-compatible input; new clients use billingInterval.
  billingInterval?: ProBillingInterval
  returnToPath?: string
  email?: string
  stripeCustomerId?: string
  frontendOrigin?: string
  /** Optional promotion code for eligible plans. */
  promotionCode?: string
  /** JWT from POST /api/auth/verify-otp; required for subscription so we use verified email. */
  emailVerificationToken?: string
}

// Map customer-facing code (uppercase) to Stripe promotion code ID. Set in env: STRIPE_PROMO_EARLY30, etc.
function getStripePromotionCodeId(customerCode: string): string | null {
  const normalized = String(customerCode || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!normalized) return null
  const envKey = `STRIPE_PROMO_${normalized}` as keyof NodeJS.ProcessEnv
  const id = process.env[envKey]
  return typeof id === 'string' && id.startsWith('promo_') ? id : null
}

router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { mode, plan, returnToPath, email, stripeCustomerId, frontendOrigin, promotionCode, emailVerificationToken } =
      req.body as CheckoutRequestBody

    // Security: validate frontendOrigin against the same allowlist as CORS.
    // An unvalidated frontendOrigin would let an attacker redirect the Stripe
    // success URL (containing session_id) to an attacker-controlled domain,
    // allowing session token theft via GET /api/billing/session-details.
    const envOrigin = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    const requestedOrigin = typeof frontendOrigin === 'string' ? normalizeOrigin(frontendOrigin) : null
    const baseUrl = (requestedOrigin && isAllowedOrigin(requestedOrigin))
      ? requestedOrigin
      : envOrigin || 'https://videotext.io'
    const normalizedPath =
      typeof returnToPath === 'string' && returnToPath.startsWith('/')
        ? returnToPath
        : '/'

    const successUrl = `${baseUrl}${normalizedPath}?payment=success&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${baseUrl}${normalizedPath}?payment=cancelled`

    const prices = getStripePriceConfig()

    if (mode === 'subscription') {
      if (!plan) {
        return res.status(400).json({ message: 'plan is required for subscription mode' })
      }

      // Logged-in users: use their verified account email — no OTP needed
      // Anonymous users: require OTP-verified email token
      const rawAuthHeader = req.headers['authorization']
      const auth = getAuthFromRequest(req)

      // Auth header present but JWT invalid/expired → session expired, not an anonymous user
      if (!auth && rawAuthHeader) {
        return res.status(401).json({
          message: 'Your session has expired. Please log out and log back in, then try upgrading again.',
        })
      }

      let checkoutEmail: string | undefined
      let isLoggedInUser = false
      if (auth?.userId) {
        isLoggedInUser = true
        const loggedInUser = await getUser(auth.userId)
        checkoutEmail = loggedInUser?.email
        // Fallback: legacy users whose JWT userId is a Stripe customer ID, or userId/stripeCustomerId mismatch
        if (!checkoutEmail && auth.stripeCustomerId) {
          const customerUser = await getUserByStripeCustomerId(auth.stripeCustomerId)
          checkoutEmail = customerUser?.email
        }
      } else {
        // Anonymous user: use OTP-verified email if provided; otherwise let Stripe collect it at checkout
        const verified = emailVerificationToken ? verifyEmailVerificationToken(emailVerificationToken) : null
        checkoutEmail = verified?.email || (stripeCustomerId ? undefined : email) || undefined
      }
      // Logged-in users must always have a resolvable email; anonymous users can proceed without one
      // (Stripe Checkout will collect the email when customer_email is not pre-filled)
      if (!checkoutEmail && isLoggedInUser) {
        return res.status(400).json({
          message: 'Your account email could not be found. Please log out and sign back in, then try again.',
        })
      }

      if (req.body.billingInterval !== undefined && req.body.billingInterval !== 'monthly' && req.body.billingInterval !== 'annual') {
        return res.status(400).json({ message: 'billingInterval must be monthly or annual.' })
      }
      // `annual` remains a compatibility input for older clients. New clients send
      // the explicit constrained interval; no Stripe Price ID is accepted from the browser.
      const billingInterval: ProBillingInterval = req.body.billingInterval || (req.body.annual === true ? 'annual' : 'monthly')
      const annual = billingInterval === 'annual'
      const country = getRequestCountry(req)
      const requestedTier = resolvePricingTier(country)
      const pricingTier = resolveEffectivePricingTier(requestedTier)
      let priceId: string
      if (plan === 'business') {
        if (!prices.businessPriceId) {
          return res.status(400).json({ message: 'Business plan is not available.' })
        }
        priceId = prices.businessPriceId
      } else if (plan === 'pro') {
        priceId = selectProPriceId(prices, billingInterval, pricingTier)
      } else if (plan === 'founding_workflow') {
        return res.status(410).json({ message: 'This legacy plan is no longer available. Choose Pro instead.' })
      } else if (plan === 'basic') {
        if (!prices.basicPriceId) {
          return res.status(400).json({ message: 'Basic plan is no longer available. Upgrade to Pro instead.' })
        }
        priceId = annual && prices.basicAnnualPriceId ? prices.basicAnnualPriceId : prices.basicPriceId
      } else {
        // agency (grandfathered)
        if (!prices.agencyPriceId) {
          return res.status(400).json({ message: 'Agency plan is no longer available. Upgrade to Business instead.' })
        }
        priceId = annual && prices.agencyAnnualPriceId ? prices.agencyAnnualPriceId : prices.agencyPriceId
      }

      // Validate the server-selected Stripe object before creating checkout so
      // stale configuration can never silently charge a different amount/interval.
      if (plan === 'pro') await verifyProPrice(priceId, billingInterval, pricingTier)

      // Preserve existing promotion-code support for active offers.
      const planSupportsPromo = plan === 'basic' || plan === 'pro'
      const promoId =
        planSupportsPromo && promotionCode
          ? getStripePromotionCodeId(promotionCode)
          : null
      if (promotionCode && planSupportsPromo && !promoId) {
        return res.status(400).json({ message: 'Invalid or expired promo code. Check the code and try again.' })
      }

      // Use existing Stripe customer if available (avoids duplicate customer records)
      const resolvedStripeCustomerId = stripeCustomerId ||
        (auth?.stripeCustomerId) ||
        (auth?.userId && auth.userId.startsWith('cus_') ? auth.userId : undefined)

      const sessionParams: import('stripe').Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        customer: resolvedStripeCustomerId || undefined,
        customer_email: !resolvedStripeCustomerId ? checkoutEmail : undefined,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: auth?.userId || checkoutEmail || undefined,
        metadata: {
          purchaseType: 'subscription',
          plan,
          billingInterval,
          pricingTier,
          ...(country ? { country } : {}),
          returnToPath: normalizedPath,
          ...(auth?.userId ? { userId: auth.userId } : {}),
          ...(checkoutEmail ? { email: checkoutEmail } : {}),
        },
        allow_promotion_codes: true,
        ...(promoId ? { discounts: [{ promotion_code: promoId }] } : {}),
      }

      const session = await stripe.checkout.sessions.create(sessionParams)
      if (auth?.userId) {
        captureFunnelEvent({
          eventName: 'checkout_started',
          userId: auth.userId,
          source: 'billing_checkout_route',
          plan,
          metadata: { annual, billingInterval, pricingTier, country: country ?? undefined },
        }).catch(() => {})
      }

      if (auth?.userId) {
        recordUpgradeIntent({ userId: auth.userId, source: 'checkout_session_started' }).catch(() => {})
      }

      return res.json({ url: session.url, sessionId: session.id })
    }

    if (mode === 'payment') {
      return res.status(410).json({
        message: 'Overage purchases are no longer available. Upgrade to Pro for unlimited processing.',
      })
    }

    return res.status(400).json({ message: 'Invalid mode' })
  } catch (error: any) {
    log.error({ msg: 'Stripe checkout error', error: (error as Error)?.message ?? String(error) })
    return res
      .status(500)
      .json({ message: error.message || 'Failed to create checkout session' })
  }
})

/** Create a Stripe Customer Billing Portal session. User can upgrade, downgrade, cancel, update payment. */
router.post('/portal', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    if (!userId) {
      return res.status(401).json({ message: 'Not signed in. Complete a purchase or sign in to manage your subscription.' })
    }
    const returnUrl =
      (req.body && typeof req.body.returnUrl === 'string' && req.body.returnUrl) ||
      (process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || 'https://videotext.io') + '/pricing'

    if (!userId) {
      return res.status(401).json({ message: 'Not signed in. Complete a purchase or sign in to manage your subscription.' })
    }

    const user = await getUser(userId)
    if (!user) {
      return res.status(404).json({ message: 'No account found. Complete a purchase first, then you can manage your subscription here.' })
    }

    // Stripe Billing Portal requires an existing Stripe customer (created at checkout).
    let customerId = user.stripeCustomerId || (user.id && user.id.startsWith('cus_') ? user.id : null)
    if (!customerId && user.email && (user.plan === 'basic' || user.plan === 'pro' || user.plan === 'agency' || user.plan === 'founding_workflow' || user.plan === 'business')) {
      const found = await findStripeCustomerIdByEmail(user.email)
      if (found) {
        user.stripeCustomerId = found
        user.updatedAt = new Date()
        await saveUser(user)
        customerId = found
      }
    }
    if (!customerId) {
      return res.status(403).json({ message: 'No active subscription. Upgrade on the Pricing page to manage your plan.' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return res.json({ url: session.url })
  } catch (error: any) {
    log.error({ msg: 'Stripe portal error', error: (error as Error)?.message ?? String(error) })
    return res
      .status(500)
      .json({ message: error.message || 'Failed to open billing portal' })
  }
})

/** After checkout success: exchange session_id for userId and plan so the client can set identity. */
router.get('/session-details', async (req: Request, res: Response) => {
  try {
    const sessionId = (req.query.session_id as string) || ''
    if (!sessionId) {
      return res.status(400).json({ message: 'session_id is required' })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer'],
    })

    // For async payment methods (ACH, SEPA, bank transfer) payment_status will
    // be 'unpaid' even though the checkout completed.  We still return session
    // info so the frontend can show a "payment pending" state, but we must NOT
    // grant the paid plan — invoice.payment_succeeded will do that when the
    // payment actually clears.
    const paymentConfirmed = session.payment_status === 'paid'
    const sessionComplete = session.status === 'complete'
    if (!sessionComplete && !paymentConfirmed) {
      return res.status(400).json({ message: 'Session not complete' })
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    if (!customerId) {
      return res.status(400).json({ message: 'No customer on session' })
    }

    let user = await getUserByStripeCustomerId(customerId)
    if (!user) {
      // Webhook may not have run yet. Try to find the existing account by email
      // before creating a new one — prevents showing "Set password" to users who
      // already signed up with email+password.
      const sessionEmail = session.customer_details?.email
      if (sessionEmail) {
        const existingByEmail = await getUserByEmail(sessionEmail)
        if (existingByEmail) {
          existingByEmail.stripeCustomerId = customerId
          // Only grant the plan when Stripe has confirmed payment (card/immediate).
          // For async methods (ACH, SEPA) invoice.payment_succeeded will do this.
          if (paymentConfirmed) {
            const planFromMeta = session.metadata?.plan as PlanType | undefined
            if (planFromMeta === 'basic' || planFromMeta === 'pro' || planFromMeta === 'agency' || planFromMeta === 'founding_workflow' || planFromMeta === 'business') {
              existingByEmail.plan = planFromMeta
              existingByEmail.limits = getPlanLimits(planFromMeta)
            }
          }
          existingByEmail.updatedAt = new Date()
          await saveUser(existingByEmail)
          user = existingByEmail
        }
      }
    }
    if (!user) {
      // Still not found — create a placeholder so the redirect works.
      // For async payments we create with plan='free'; invoice.payment_succeeded grants the real plan.
      // For paid sessions we grant the plan from metadata (race condition safety for card payments).
      const email = session.customer_details?.email || `${customerId}@checkout.example.com`
      const planFromMeta = session.metadata?.plan as PlanType | undefined
      const resolvedPlan: PlanType = paymentConfirmed &&
        (planFromMeta === 'basic' || planFromMeta === 'pro' || planFromMeta === 'agency' ||
         planFromMeta === 'founding_workflow' || planFromMeta === 'business')
        ? planFromMeta
        : 'free'
      const now = new Date()
      const limits = getPlanLimits(resolvedPlan)
      user = {
        id: crypto.randomUUID(),
        email,
        passwordHash: '',
        plan: resolvedPlan,
        stripeCustomerId: customerId,
        subscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
        subscriptionStatus: paymentConfirmed ? 'active' : 'incomplete',
        cancelAtPeriodEnd: false,
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
          importCount: 0,
          resetDate: now,
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

    if (!user) {
      return res.status(500).json({ message: 'User not found' })
    }

    // If user has no password yet, issue a one-time setup token so the client can show "Set password" after checkout.
    // Use a conditional UPDATE (only write if no token exists yet) to avoid a race condition where two concurrent
    // post-checkout requests each generate a different token and overwrite each other.
    let passwordSetupToken: string | undefined
    let passwordSetupExpiresAt: string | undefined
    if (!user.passwordHash && !user.passwordSetupUsed) {
      const expired = user.passwordSetupExpiresAt && user.passwordSetupExpiresAt < new Date()
      if (!user.passwordSetupToken || expired) {
        const { token, expiresAt } = generatePasswordSetupToken()
        // Only write if no token has been set yet (race-safe: second writer is a no-op)
        const updated = await prisma.user.updateMany({
          where: { id: user.id, passwordSetupToken: null },
          data: { passwordSetupToken: token, passwordSetupExpiresAt: expiresAt, updatedAt: new Date() },
        })
        if (updated.count > 0) {
          // This request won the race — use its token
          passwordSetupToken = token
          passwordSetupExpiresAt = expiresAt.toISOString()
        } else {
          // Another request already set a token — read the one that won
          const refreshed = await getUser(user.id)
          if (refreshed?.passwordSetupToken && refreshed.passwordSetupExpiresAt) {
            passwordSetupToken = refreshed.passwordSetupToken
            passwordSetupExpiresAt = refreshed.passwordSetupExpiresAt.toISOString()
          }
        }
      } else if (user.passwordSetupToken && user.passwordSetupExpiresAt) {
        passwordSetupToken = user.passwordSetupToken
        passwordSetupExpiresAt = user.passwordSetupExpiresAt.toISOString()
      }
    }

    const token = signAuthToken(user)
    return res.json({
      userId: user.id,
      plan: user.plan,
      email: user.email,
      token,
      subscriptionStatus: user.subscriptionStatus ?? null,
      paymentConfirmed,
      ...(passwordSetupToken && passwordSetupExpiresAt
        ? { passwordSetupToken, passwordSetupExpiresAt }
        : {}),
    })
  } catch (error: any) {
    log.error({ msg: 'Session details error', error: (error as Error)?.message ?? String(error) })
    return res
      .status(500)
      .json({ message: error.message || 'Failed to get session details' })
  }
})

/**
 * GET /api/billing/session-status?session_id=...
 * Secondary verification after checkout: confirms the Stripe subscription is active.
 * Called by the client after session-details succeeds, as a belt-and-suspenders check
 * that the subscription activated (not just that payment was captured).
 */
router.get('/session-status', async (req: Request, res: Response) => {
  try {
    const sessionId = (req.query.session_id as string) || ''
    if (!sessionId) {
      return res.status(400).json({ message: 'session_id is required' })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Payment not yet confirmed
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.json({ subscriptionActive: false, plan: session.metadata?.plan ?? 'free' })
    }

    let subscriptionActive = false
    if (typeof session.subscription === 'string') {
      const sub = await stripe.subscriptions.retrieve(session.subscription) as { status: string }
      subscriptionActive = sub.status === 'active' || sub.status === 'trialing'
    } else {
      // one-time payment — treat as active once paid
      subscriptionActive = session.payment_status === 'paid'
    }

    const plan = session.metadata?.plan ?? 'pro'
    const email = session.customer_details?.email ?? undefined

    return res.json({ subscriptionActive, plan, email })
  } catch (error: any) {
    log.error({ msg: 'Stripe session-status error', error: (error as Error)?.message ?? String(error) })
    return res.status(500).json({ message: error.message || 'Failed to check session status' })
  }
})

export default router
