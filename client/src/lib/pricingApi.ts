import { api } from './api'

export type ProPriceDisplay = {
  tier: 'standard' | 'ppp' | 'gbp' | 'eur'
  requestedTier?: 'standard' | 'ppp' | 'gbp' | 'eur'
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

export const DEFAULT_PRO_PRICING: ProPriceDisplay = {
  tier: 'standard',
  country: null,
  enabled: false,
  monthly: { amount: 7.99, currency: 'USD', label: '$7.99/mo', displayAmount: '$7.99' },
  annual: {
    amount: 69.99,
    currency: 'USD',
    effectiveMonthly: 5.83,
    effectiveMonthlyDisplay: '$5.83',
    label: '$69.99/year',
    billedLabel: '$69.99',
    savePercent: 27,
  },
  priceLabel: '$7.99/mo',
  annualNote: 'or $69.99/year (save 27%)',
}

let cachedPricing: ProPriceDisplay | null = null
let inflight: Promise<ProPriceDisplay> | null = null

export async function fetchProPricing(): Promise<ProPriceDisplay> {
  if (cachedPricing) return cachedPricing
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const response = await api('/api/billing/prices')
      if (!response.ok) return DEFAULT_PRO_PRICING
      const data = (await response.json()) as ProPriceDisplay
      cachedPricing = { ...DEFAULT_PRO_PRICING, ...data }
      return cachedPricing
    } catch {
      return DEFAULT_PRO_PRICING
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export function getCachedProPricing(): ProPriceDisplay {
  return cachedPricing ?? DEFAULT_PRO_PRICING
}
