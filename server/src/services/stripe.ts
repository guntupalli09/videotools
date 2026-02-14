import Stripe from 'stripe'

const REQUIRED_STRIPE_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_BASIC',
  'STRIPE_PRICE_PRO',
  'STRIPE_PRICE_AGENCY',
  'STRIPE_PRICE_OVERAGE',
] as const

/**
 * Fail fast at startup if any required Stripe env var is missing.
 * Call this when the API process starts; do not call from the worker process.
 */
export function assertStripeConfig(): void {
  const missing = REQUIRED_STRIPE_VARS.filter((name) => !process.env[name]?.trim())
  if (missing.length > 0) {
    console.error(
      '[Stripe] Missing required env vars. Set these in the server .env or Docker env and restart the API:'
    )
    missing.forEach((name) => console.error(`  - ${name}`))
    console.error('See docs/STRIPE_GO_LIVE.md and docs/ENV_CHECKLIST.md.')
    process.exit(1)
  }
  try {
    getStripePriceConfig()
  } catch (e) {
    console.error('[Stripe]', (e as Error).message)
    process.exit(1)
  }
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
assertStripeConfig()

export const stripe = new Stripe(stripeSecretKey!, {
  apiVersion: '2026-01-28.clover',
})

export type BillingPlan = 'basic' | 'pro' | 'agency'

export interface StripePriceConfig {
  basicPriceId: string
  proPriceId: string
  agencyPriceId: string
  basicAnnualPriceId?: string
  proAnnualPriceId?: string
  agencyAnnualPriceId?: string
  overagePriceId: string
}

export function getStripePriceConfig(): StripePriceConfig {
  const basicPriceId = process.env.STRIPE_PRICE_BASIC
  const proPriceId = process.env.STRIPE_PRICE_PRO
  const agencyPriceId = process.env.STRIPE_PRICE_AGENCY
  const overagePriceId = process.env.STRIPE_PRICE_OVERAGE
  const basicAnnualPriceId = process.env.STRIPE_PRICE_BASIC_ANNUAL
  const proAnnualPriceId = process.env.STRIPE_PRICE_PRO_ANNUAL
  const agencyAnnualPriceId = process.env.STRIPE_PRICE_AGENCY_ANNUAL

  if (!basicPriceId || !proPriceId || !agencyPriceId || !overagePriceId) {
    throw new Error(
      'Stripe price IDs are not fully configured. Expected STRIPE_PRICE_BASIC, STRIPE_PRICE_PRO, STRIPE_PRICE_AGENCY, STRIPE_PRICE_OVERAGE.'
    )
  }

  return {
    basicPriceId,
    proPriceId,
    agencyPriceId,
    basicAnnualPriceId,
    proAnnualPriceId,
    agencyAnnualPriceId,
    overagePriceId,
  }
}

export function getPlanFromPriceId(priceId: string): BillingPlan | null {
  try {
    const config = getStripePriceConfig()
    if (priceId === config.basicPriceId || priceId === config.basicAnnualPriceId) return 'basic'
    if (priceId === config.proPriceId || priceId === config.proAnnualPriceId) return 'pro'
    if (priceId === config.agencyPriceId || priceId === config.agencyAnnualPriceId) return 'agency'
    return null
  } catch {
    return null
  }
}

/** Fetch active plan and email for a Stripe customer (e.g. after API restart when user is missing from memory). */
export async function getPlanAndEmailForStripeCustomer(
  customerId: string
): Promise<{ plan: BillingPlan; email: string; subscriptionId?: string; currentPeriodEnd?: number } | null> {
  try {
    const [customer, subs] = await Promise.all([
      stripe.customers.retrieve(customerId),
      stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 }),
    ])
    if (customer.deleted) return null
    const email =
      (customer as Stripe.Customer).email ||
      (customer as Stripe.Customer).metadata?.email ||
      `${customerId}@customer.example.com`
    const sub = subs.data[0]
    if (!sub?.items?.data?.[0]) {
      return null
    }
    const priceId =
      typeof sub.items.data[0].price === 'string'
        ? sub.items.data[0].price
        : sub.items.data[0].price?.id
    const plan = priceId ? getPlanFromPriceId(priceId) : null
    if (!plan) return null
    const subWithPeriod = sub as { current_period_end?: number }
    return {
      plan,
      email,
      subscriptionId: sub.id,
      currentPeriodEnd: subWithPeriod.current_period_end ?? undefined,
    }
  } catch {
    return null
  }
}

/** Fetch subscription period end (for correcting reset date display). Returns null if not found or inactive. */
export async function getSubscriptionPeriodEnd(
  subscriptionId: string
): Promise<{ currentPeriodEnd: Date; currentPeriodStart: Date } | null> {
  try {
    const sub = (await stripe.subscriptions.retrieve(subscriptionId)) as {
      status: string
      current_period_end?: number
      current_period_start?: number
    }
    if (sub.status !== 'active' || !sub.current_period_end) return null
    return {
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      currentPeriodStart: new Date(
        (sub.current_period_start ?? sub.current_period_end) * 1000
      ),
    }
  } catch {
    return null
  }
}

