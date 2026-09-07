import type Stripe from 'stripe'
import type { ProBillingInterval } from './stripe'
import {
  PPP_PRICING_ENABLED,
  PRICING_TIER_SPECS,
  type PricingTier,
} from '../utils/geoPricing'

export type TierPriceIds = {
  monthlyPriceId: string
  annualPriceId: string
}

export type RegionalStripePriceConfig = {
  standard: TierPriceIds
  ppp?: TierPriceIds
  gbp?: TierPriceIds
  eur?: TierPriceIds
  /** All non-standard Pro price IDs that still grant Pro entitlements. */
  regionalProPriceIds: string[]
}

function readTierPriceIds(monthlyEnv: string | undefined, annualEnv: string | undefined): TierPriceIds | undefined {
  if (!monthlyEnv?.trim() || !annualEnv?.trim()) return undefined
  return { monthlyPriceId: monthlyEnv.trim(), annualPriceId: annualEnv.trim() }
}

/** Load regional price IDs from env. Standard tier always required; regional tiers optional. */
export function getRegionalStripePriceConfig(): RegionalStripePriceConfig {
  const standardMonthly = process.env.STRIPE_PRO_MONTHLY_PRICE_ID
  const standardAnnual = process.env.STRIPE_PRO_ANNUAL_PRICE_ID
  if (!standardMonthly || !standardAnnual) {
    throw new Error('Stripe Pro prices are not fully configured. Expected STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_ANNUAL_PRICE_ID.')
  }

  const ppp = readTierPriceIds(
    process.env.STRIPE_PRO_PPP_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_PPP_ANNUAL_PRICE_ID,
  )
  const gbp = readTierPriceIds(
    process.env.STRIPE_PRO_GBP_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_GBP_ANNUAL_PRICE_ID,
  )
  const eur = readTierPriceIds(
    process.env.STRIPE_PRO_EUR_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_EUR_ANNUAL_PRICE_ID,
  )

  const regionalProPriceIds = [
    ...(ppp ? [ppp.monthlyPriceId, ppp.annualPriceId] : []),
    ...(gbp ? [gbp.monthlyPriceId, gbp.annualPriceId] : []),
    ...(eur ? [eur.monthlyPriceId, eur.annualPriceId] : []),
  ]

  return {
    standard: { monthlyPriceId: standardMonthly, annualPriceId: standardAnnual },
    ppp,
    gbp,
    eur,
    regionalProPriceIds,
  }
}

/** Resolve effective tier — falls back to standard when regional Stripe prices are not configured. */
export function resolveEffectivePricingTier(requestedTier: PricingTier): PricingTier {
  if (!PPP_PRICING_ENABLED || requestedTier === 'standard') return 'standard'
  const config = getRegionalStripePriceConfig()
  if (requestedTier === 'ppp' && config.ppp) return 'ppp'
  if (requestedTier === 'gbp' && config.gbp) return 'gbp'
  if (requestedTier === 'eur' && config.eur) return 'eur'
  return 'standard'
}

export function selectProPriceIdForTier(tier: PricingTier, billingInterval: ProBillingInterval): string {
  const effectiveTier = resolveEffectivePricingTier(tier)
  const config = getRegionalStripePriceConfig()
  const tierConfig =
    effectiveTier === 'ppp' ? config.ppp :
    effectiveTier === 'gbp' ? config.gbp :
    effectiveTier === 'eur' ? config.eur :
    config.standard

  const ids = tierConfig ?? config.standard
  return billingInterval === 'annual' ? ids.annualPriceId : ids.monthlyPriceId
}

export function assertProPriceForTier(
  price: Pick<Stripe.Price, 'active' | 'currency' | 'unit_amount' | 'recurring'>,
  billingInterval: ProBillingInterval,
  tier: PricingTier,
): void {
  const effectiveTier = resolveEffectivePricingTier(tier)
  const spec = PRICING_TIER_SPECS[effectiveTier][billingInterval === 'annual' ? 'annual' : 'monthly']
  const valid =
    price.active &&
    price.currency.toLowerCase() === spec.currency &&
    price.unit_amount === spec.amountCents &&
    price.recurring?.interval === spec.interval &&
    price.recurring.interval_count === 1

  if (!valid) {
    const label = `${spec.currency.toUpperCase()} ${(spec.amountCents / 100).toFixed(2)}/${spec.interval}`
    throw new Error(`Configured Pro Price must reference an active recurring ${label} Price with interval_count 1.`)
  }
}

export function isRegionalProPriceId(priceId: string): boolean {
  try {
    return getRegionalStripePriceConfig().regionalProPriceIds.includes(priceId)
  } catch {
    return false
  }
}
