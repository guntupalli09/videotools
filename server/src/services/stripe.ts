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

