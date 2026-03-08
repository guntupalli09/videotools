import express, { Request, Response } from 'express'
import { stripe, getStripePriceConfig, BillingPlan, findStripeCustomerIdByEmail } from '../services/stripe'
import { getUser, getUserByStripeCustomerId, saveUser } from '../models/User'
import type { User, PlanType } from '../models/User'
import { getPlanLimits } from '../utils/limits'
import { getAuthFromRequest, getEffectiveUserId, verifyEmailVerificationToken, generatePasswordSetupToken, signAuthToken } from '../utils/auth'

const router = express.Router()

interface CheckoutRequestBody {
  mode: 'subscription' | 'payment'
  plan?: BillingPlan
  annual?: boolean // Phase 2.5: 20% off annual billing
  returnToPath?: string
  email?: string
  stripeCustomerId?: string
  frontendOrigin?: string
  /** Promo code for early testers (e.g. EARLY30, EARLY50, EARLY70, EARLY100). Only applied for Basic and Pro. */
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

    // Frontend URL for Stripe success/cancel redirects. Client sends frontendOrigin; otherwise use BASE_URL (Hetzner).
    const envOrigin = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
    const baseUrl = frontendOrigin || envOrigin || 'https://www.videotext.io'
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
      const auth = getAuthFromRequest(req)
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
        const verified = emailVerificationToken ? verifyEmailVerificationToken(emailVerificationToken) : null
        checkoutEmail = verified?.email || (stripeCustomerId ? undefined : email)
      }
      if (!checkoutEmail || !checkoutEmail.includes('@')) {
        if (isLoggedInUser) {
          return res.status(400).json({
            message: 'Your account email could not be found. Please log out and sign back in, then try again.',
          })
        }
        return res.status(400).json({
          message: 'Please verify your email first (enter your email and the code we sent you) before subscribing.',
        })
      }

      const annual = req.body.annual === true
      let priceId: string
      if (plan === 'founding_workflow') {
        if (!prices.foundingWorkflowPriceId) {
          return res.status(400).json({ message: 'Founding Workflow plan is not available.' })
        }
        priceId = prices.foundingWorkflowPriceId
      } else if (plan === 'basic') {
        priceId = annual && prices.basicAnnualPriceId ? prices.basicAnnualPriceId : prices.basicPriceId
      } else if (plan === 'pro') {
        priceId = annual && prices.proAnnualPriceId ? prices.proAnnualPriceId : prices.proPriceId
      } else {
        priceId = annual && prices.agencyAnnualPriceId ? prices.agencyAnnualPriceId : prices.agencyPriceId
      }

      // Promo codes only for Basic and Pro (30/50/70/100% off for early testers)
      const promoId =
        (plan === 'basic' || plan === 'pro') && promotionCode
          ? getStripePromotionCodeId(promotionCode)
          : null
      if (promotionCode && (plan === 'basic' || plan === 'pro') && !promoId) {
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
        metadata: {
          purchaseType: 'subscription',
          plan,
          returnToPath: normalizedPath,
        },
        allow_promotion_codes: true,
        ...(promoId ? { discounts: [{ promotion_code: promoId }] } : {}),
      }

      const session = await stripe.checkout.sessions.create(sessionParams)

      return res.json({ url: session.url })
    }

    if (mode === 'payment') {
      // Phase 2.5: One-time overage 100 minutes = $5
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: stripeCustomerId || undefined,
        customer_email: !stripeCustomerId && email ? email : undefined,
        line_items: [
          {
            price: prices.overagePriceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          purchaseType: 'overage',
          returnToPath: normalizedPath,
        },
      })

      return res.json({ url: session.url })
    }

    return res.status(400).json({ message: 'Invalid mode' })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
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
      (process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || 'https://www.videotext.io') + '/pricing'

    if (!userId) {
      return res.status(401).json({ message: 'Not signed in. Complete a purchase or sign in to manage your subscription.' })
    }

    const user = await getUser(userId)
    if (!user) {
      return res.status(404).json({ message: 'No account found. Complete a purchase first, then you can manage your subscription here.' })
    }

    // Stripe Billing Portal requires an existing Stripe customer (created at checkout).
    let customerId = user.stripeCustomerId || (user.id && user.id.startsWith('cus_') ? user.id : null)
    if (!customerId && user.email && (user.plan === 'basic' || user.plan === 'pro' || user.plan === 'agency' || user.plan === 'founding_workflow')) {
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
    console.error('Stripe portal error:', error)
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

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(400).json({ message: 'Session not paid or complete' })
    }

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    if (!customerId) {
      return res.status(400).json({ message: 'No customer on session' })
    }

    let user = await getUserByStripeCustomerId(customerId)
    if (!user) {
      // Webhook may not have run yet (or server restarted with in-memory store). Create user from session so redirect works.
      const email = session.customer_details?.email || `${customerId}@checkout.example.com`
      const planFromMeta = session.metadata?.plan as PlanType | undefined
      const plan: PlanType =
        planFromMeta === 'basic' || planFromMeta === 'pro' || planFromMeta === 'agency' || planFromMeta === 'founding_workflow' ? planFromMeta : 'pro'
      const now = new Date()
      const limits = getPlanLimits(plan)
      user = {
        id: customerId,
        email,
        passwordHash: '',
        plan,
        stripeCustomerId: customerId,
        subscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
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

    // If user has no password yet, issue or reuse a one-time setup token so the client can show "Set password" after checkout.
    let passwordSetupToken: string | undefined
    let passwordSetupExpiresAt: string | undefined
    if (!user.passwordHash && !user.passwordSetupUsed) {
      const expired = user.passwordSetupExpiresAt && user.passwordSetupExpiresAt < new Date()
      if (!user.passwordSetupToken || expired) {
        const { token, expiresAt } = generatePasswordSetupToken()
        user.passwordSetupToken = token
        user.passwordSetupExpiresAt = expiresAt
        user.updatedAt = new Date()
        await saveUser(user)
      }
      if (user.passwordSetupToken && user.passwordSetupExpiresAt) {
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
      ...(passwordSetupToken && passwordSetupExpiresAt
        ? { passwordSetupToken, passwordSetupExpiresAt }
        : {}),
    })
  } catch (error: any) {
    console.error('Session details error:', error)
    return res
      .status(500)
      .json({ message: error.message || 'Failed to get session details' })
  }
})

export default router

