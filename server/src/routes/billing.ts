import express, { Request, Response } from 'express'
import { stripe, getStripePriceConfig, BillingPlan } from '../services/stripe'
import { getUser, getUserByStripeCustomerId } from '../models/User'
import { getAuthFromRequest } from '../utils/auth'

const router = express.Router()

interface CheckoutRequestBody {
  mode: 'subscription' | 'payment'
  plan?: BillingPlan
  annual?: boolean // Phase 2.5: 20% off annual billing
  returnToPath?: string
  email?: string
  stripeCustomerId?: string
  frontendOrigin?: string
}

router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { mode, plan, returnToPath, email, stripeCustomerId, frontendOrigin } =
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

      const priceId =
        plan === 'basic'
          ? prices.basicPriceId
          : plan === 'pro'
          ? prices.proPriceId
          : prices.agencyPriceId

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripeCustomerId || undefined,
        customer_email: !stripeCustomerId && email ? email : undefined,
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
      })

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
    const auth = getAuthFromRequest(req)
    const headerUserId = (req.headers['x-user-id'] as string) || ''
    const userId = auth?.userId || headerUserId
    const returnUrl =
      (req.body && typeof req.body.returnUrl === 'string' && req.body.returnUrl) ||
      (process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || 'https://www.videotext.io') + '/pricing'

    if (!userId) {
      return res.status(401).json({ message: 'Not signed in. Complete a purchase or sign in to manage your subscription.' })
    }

    const user = getUser(userId)
    if (!user) {
      return res.status(404).json({ message: 'No account found. Complete a purchase first, then you can manage your subscription here.' })
    }

    const customerId = user.stripeCustomerId || (user.id && user.id.startsWith('cus_') ? user.id : null)
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

    const user = getUserByStripeCustomerId(customerId)
    if (!user) {
      return res.status(404).json({ message: 'Account not found yet. Please refresh in a few seconds.' })
    }

    return res.json({
      userId: user.id,
      plan: user.plan,
    })
  } catch (error: any) {
    console.error('Session details error:', error)
    return res
      .status(500)
      .json({ message: error.message || 'Failed to get session details' })
  }
})

export default router

