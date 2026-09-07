import type { Request } from 'express'
import { isFlagEnabled } from './featureFlags'

/** Server-owned pricing tiers — amounts are validated against Stripe Price objects at checkout. */
export type PricingTier = 'standard' | 'ppp' | 'gbp' | 'eur'

export type PricingIntervalSpec = {
  currency: string
  amountCents: number
  interval: 'month' | 'year'
}

export type PricingTierSpec = {
  monthly: PricingIntervalSpec
  annual: PricingIntervalSpec
}

/** Advertised Pro prices per tier (must match Stripe Price objects in production). */
export const PRICING_TIER_SPECS: Record<PricingTier, PricingTierSpec> = {
  standard: {
    monthly: { currency: 'usd', amountCents: 799, interval: 'month' },
    annual: { currency: 'usd', amountCents: 6999, interval: 'year' },
  },
  /** Purchasing-power pricing for high-traffic, near-zero-conversion markets (IN, PH, etc.). */
  ppp: {
    monthly: { currency: 'usd', amountCents: 399, interval: 'month' },
    annual: { currency: 'usd', amountCents: 3499, interval: 'year' },
  },
  /** Local currency for UK — same nominal tier, GBP checkout reduces FX friction. */
  gbp: {
    monthly: { currency: 'gbp', amountCents: 599, interval: 'month' },
    annual: { currency: 'gbp', amountCents: 4999, interval: 'year' },
  },
  /** Local currency for EU (DE and neighbors) — EUR checkout. */
  eur: {
    monthly: { currency: 'eur', amountCents: 699, interval: 'month' },
    annual: { currency: 'eur', amountCents: 5999, interval: 'year' },
  },
}

/** ISO 3166-1 alpha-2 codes eligible for PPP tier (when configured in Stripe). */
export const PPP_COUNTRY_CODES = new Set([
  'IN', // India
  'PH', // Philippines
  'BD', 'PK', 'NG', 'ID', 'VN', 'EG', 'KE', 'GH', 'LK', 'NP', 'MM', 'KH',
  'UA', 'MX', 'BR', 'CO', 'AR', 'ZA', 'TH', 'MY',
])

/** EU member states + EEA — EUR tier when configured. */
export const EUR_COUNTRY_CODES = new Set([
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'FI', 'GR', 'LU',
  'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'MT', 'HR', 'BG', 'RO', 'CZ', 'DK',
  'SE', 'PL', 'HU', 'NO', 'IS', 'LI', 'CH',
])

export const PPP_PRICING_ENABLED = isFlagEnabled(process.env.PPP_PRICING_ENABLED)

const CURRENCY_SYMBOL: Record<string, string> = {
  usd: '$',
  gbp: '£',
  eur: '€',
}

function headerCountry(req: Request): string | null {
  const candidates = [
    req.headers['x-vercel-ip-country'],
    req.headers['cf-ipcountry'],
    req.headers['x-country-code'],
  ]
  for (const raw of candidates) {
    const value = Array.isArray(raw) ? raw[0] : raw
    const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
    if (code.length === 2 && code !== 'XX' && code !== 'T1') return code
  }
  return null
}

/** Optional debug override — only when PPP_PRICING_DEBUG=true (staging). */
function debugCountryOverride(req: Request): string | null {
  if (!isFlagEnabled(process.env.PPP_PRICING_DEBUG)) return null
  const raw = req.headers['x-pricing-country']
  const value = Array.isArray(raw) ? raw[0] : raw
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return code.length === 2 ? code : null
}

export function getRequestCountry(req: Request): string | null {
  return debugCountryOverride(req) ?? headerCountry(req)
}

export function resolvePricingTier(country: string | null, enabled = PPP_PRICING_ENABLED): PricingTier {
  if (!enabled || !country) return 'standard'
  if (country === 'GB') return 'gbp'
  if (EUR_COUNTRY_CODES.has(country)) return 'eur'
  if (PPP_COUNTRY_CODES.has(country)) return 'ppp'
  return 'standard'
}

export function formatMoney(amountCents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOL[currency.toLowerCase()] ?? `${currency.toUpperCase()} `
  const amount = amountCents / 100
  const formatted =
    amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2).replace(/\.?0+$/, (m) => (m === '.00' ? '' : m))
  return `${symbol}${formatted}`
}

export type ProPriceDisplay = {
  tier: PricingTier
  country: string | null
  enabled: boolean
  monthly: {
    amount: number
    currency: string
    label: string
    displayAmount: string
  }
  annual: {
    amount: number
    currency: string
    effectiveMonthly: number
    effectiveMonthlyDisplay: string
    label: string
    billedLabel: string
    savePercent: number
  }
  priceLabel: string
  annualNote: string
}

export function buildProPriceDisplay(country: string | null, tier: PricingTier, enabled: boolean): ProPriceDisplay {
  const spec = PRICING_TIER_SPECS[tier]
  const monthlyAmount = spec.monthly.amountCents / 100
  const annualAmount = spec.annual.amountCents / 100
  const effectiveMonthly = Math.round((annualAmount / 12) * 100) / 100
  const savePercent =
    monthlyAmount > 0 ? Math.max(0, Math.round((1 - effectiveMonthly / monthlyAmount) * 100)) : 0

  const monthlyLabel = `${formatMoney(spec.monthly.amountCents, spec.monthly.currency)}/mo`
  const annualLabel = `${formatMoney(spec.annual.amountCents, spec.annual.currency)}/year`
  const monthlyDisplay = formatMoney(spec.monthly.amountCents, spec.monthly.currency)
  const effectiveMonthlyDisplay = formatMoney(Math.round(effectiveMonthly * 100), spec.annual.currency)

  return {
    tier,
    country,
    enabled,
    monthly: {
      amount: monthlyAmount,
      currency: spec.monthly.currency.toUpperCase(),
      label: monthlyLabel,
      displayAmount: monthlyDisplay,
    },
    annual: {
      amount: annualAmount,
      currency: spec.annual.currency.toUpperCase(),
      effectiveMonthly,
      effectiveMonthlyDisplay,
      label: annualLabel,
      billedLabel: formatMoney(spec.annual.amountCents, spec.annual.currency),
      savePercent,
    },
    priceLabel: monthlyLabel,
    annualNote: `or ${annualLabel} (save ${savePercent}%)`,
  }
}

export function getProPriceDisplayForRequest(req: Request): ProPriceDisplay {
  const country = getRequestCountry(req)
  const requestedTier = resolvePricingTier(country)
  // Lazy import avoided — caller should pass effective tier when Stripe IDs exist.
  const tier = requestedTier
  return buildProPriceDisplay(country, tier, PPP_PRICING_ENABLED)
}
