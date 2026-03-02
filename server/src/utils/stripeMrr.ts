/**
 * MRR-safe normalization for SubscriptionSnapshot.priceMonthly.
 * Uses only recurring subscription line items; ignores invoice.amount_paid
 * (which can include annual payments, proration, overage, tax, one-time charges).
 *
 * Currency: priceMonthly is in the invoice's currency (cents). For MRR queries to be
 * meaningful, either assume a single currency (e.g. USD-only) or convert to a base
 * currency before summing; raw summation across multiple currencies is invalid.
 */

import type Stripe from 'stripe'

/** Line item shape from Stripe invoice (supports both legacy and expanded price). */
type InvoiceLineLike = {
  type?: string
  price?: Stripe.Price | string | null
  subscription?: string | { id: string } | null
  period?: { start?: number; end?: number }
}

export interface NormalizedMrrResult {
  normalizedMonthlyCents: number
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  billingInterval: 'month' | 'year' | null
  intervalCount: number | null
}

/**
 * Extract unit_amount (cents) and recurring interval from a Stripe line item.
 * Handles both expanded Price object and pricing details where available.
 */
function getPriceRecurring(line: InvoiceLineLike): {
  unitAmount: number
  interval: 'month' | 'year'
  intervalCount: number
} | null {
  const price = line.price as Stripe.Price | string | null | undefined
  if (!price || typeof price === 'string') return null
  const recurring = price.recurring
  if (!recurring || !recurring.interval) return null
  const interval = recurring.interval as 'month' | 'year'
  if (interval !== 'month' && interval !== 'year') return null
  const unitAmount = price.unit_amount
  if (typeof unitAmount !== 'number' || unitAmount < 0) return null
  const intervalCount = Math.max(1, recurring.interval_count ?? 1)
  return { unitAmount, interval, intervalCount }
}

/**
 * Compute normalized monthly recurring revenue in cents from invoice line items.
 * Only includes lines with type === 'subscription' and price.recurring != null.
 * Ignores: invoiceitem, tax, overage, one-time.
 */
export function computeNormalizedMonthlyCentsFromLines(
  lines: InvoiceLineLike[]
): NormalizedMrrResult {
  let normalizedMonthlyCents = 0
  let first: {
    stripeSubscriptionId: string
    stripePriceId: string
    billingInterval: 'month' | 'year'
    intervalCount: number
  } | null = null

  for (const line of lines) {
    if ((line as { type?: string }).type !== 'subscription') continue
    const recurring = getPriceRecurring(line)
    if (!recurring) continue

    const { unitAmount, interval, intervalCount } = recurring
    let lineMonthly: number
    if (interval === 'month') {
      lineMonthly = unitAmount / intervalCount
    } else {
      lineMonthly = unitAmount / 12 / intervalCount
    }
    normalizedMonthlyCents += Math.round(lineMonthly)

    const sub = (line as { subscription?: string | { id: string } }).subscription
    const pr = (line as { price?: Stripe.Price | string }).price
    if (!first && sub && pr) {
      const priceId = typeof pr === 'string' ? pr : (pr as Stripe.Price).id
      first = {
        stripeSubscriptionId: typeof sub === 'string' ? sub : sub.id,
        stripePriceId: priceId,
        billingInterval: interval,
        intervalCount,
      }
    }
  }

  return {
    normalizedMonthlyCents,
    stripeSubscriptionId: first?.stripeSubscriptionId ?? null,
    stripePriceId: first?.stripePriceId ?? null,
    billingInterval: first?.billingInterval ?? null,
    intervalCount: first?.intervalCount ?? null,
  }
}

/**
 * Compute normalized MRR from a full Stripe Invoice (convenience wrapper).
 */
export function computeNormalizedMonthlyCentsFromInvoice(
  invoice: Stripe.Invoice
): NormalizedMrrResult {
  const data = (invoice.lines?.data ?? []) as InvoiceLineLike[]
  return computeNormalizedMonthlyCentsFromLines(data)
}
