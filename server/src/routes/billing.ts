import express, { Request, Response } from 'express'
import { stripe, getStripePriceConfig, BillingPlan } from '../services/stripe'

const router = express.Router()

interface CheckoutRequestBody {
  // 'subscription' for BASIC/PRO/AGENCY, 'payment' for overage package
  mode: 'subscription' | 'payment'
  plan?: BillingPlan // required for subscription mode
  // Optional: where to send the user back (e.g. '/video-to-subtitles')
  returnToPath?: string
  // Optional email hint for Stripe Customer
  email?: string
  // Optional: reuse existing Stripe customer when known
  stripeCustomerId?: string
}

router.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { mode, plan, returnToPath, email, stripeCustomerId } =
      req.body as CheckoutRequestBody

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
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
      // One-time overage package: 100 minutes for $3
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

