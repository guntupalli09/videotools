import express, { Request, Response } from 'express'
import { stripe, getStripePriceConfig, BillingPlan } from '../services/stripe'

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

export default router

