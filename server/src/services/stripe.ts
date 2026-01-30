import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.warn(
    '[Stripe] STRIPE_SECRET_KEY is not set. Stripe integration will not work until this is configured.'
  )
}

export const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
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

