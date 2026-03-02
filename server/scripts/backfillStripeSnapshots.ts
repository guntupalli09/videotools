/**
 * Backfill SubscriptionSnapshot from Stripe paid invoices (historical MRR).
 * Production-safe, idempotent: skips if snapshot already exists for same subscription + period.
 *
 * Usage:
 *   cd server && BACKFILL_MONTHS=6 npx tsx scripts/backfillStripeSnapshots.ts
 *
 * Env:
 *   BACKFILL_MONTHS  Optional. Default 6. How many months back to fetch invoices.
 *   DATABASE_URL     Required. PostgreSQL connection.
 *   STRIPE_SECRET_KEY Required. Stripe API key.
 */

import '../src/env'
import { stripe, getPlanFromPriceId } from '../src/services/stripe'
import { prisma } from '../src/db'
import { computeNormalizedMonthlyCentsFromLines } from '../src/utils/stripeMrr'
import type Stripe from 'stripe'

const BACKFILL_MONTHS = Math.max(1, Math.min(60, parseInt(process.env.BACKFILL_MONTHS ?? '6', 10)))
const CUTOFF_TS = Math.floor(Date.now() / 1000) - BACKFILL_MONTHS * 30 * 24 * 60 * 60

async function main() {
  let totalInvoicesProcessed = 0
  let totalSnapshotsInserted = 0
  let skippedDuplicates = 0
  let skippedNoUser = 0
  let skippedNotPaid = 0
  let skippedNoRecurring = 0
  let errors = 0

  let hasMore = true
  let startingAfter: string | undefined

  while (hasMore) {
    const listParams: Stripe.InvoiceListParams = {
      limit: 100,
      created: { gte: CUTOFF_TS },
      expand: ['data.lines.data.price'],
    }
    if (startingAfter) listParams.starting_after = startingAfter

    const response = await stripe.invoices.list(listParams)
    const invoices = response.data

    for (const invoice of invoices) {
      totalInvoicesProcessed++

      if (invoice.status !== 'paid') {
        skippedNotPaid++
        continue
      }
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (!customerId) continue

      const lines = invoice.lines?.data ?? []
      const mrr = computeNormalizedMonthlyCentsFromLines(lines)
      const subId =
        mrr.stripeSubscriptionId ??
        (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id ?? null)
      if (mrr.normalizedMonthlyCents === 0 && !subId) {
        skippedNoRecurring++
        continue
      }

      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
        select: { id: true },
      })
      if (!user) {
        skippedNoUser++
        continue
      }

      const periodStart =
        lines[0]?.period?.start != null
          ? new Date((lines[0].period.start as number) * 1000)
          : invoice.period_start != null
            ? new Date(invoice.period_start * 1000)
            : new Date(invoice.created * 1000)
      const periodEnd =
        lines[0]?.period?.end != null
          ? new Date((lines[0].period.end as number) * 1000)
          : invoice.period_end != null
            ? new Date(invoice.period_end * 1000)
            : new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000)

      const plan =
        mrr.stripePriceId ? getPlanFromPriceId(mrr.stripePriceId) : null
      const planStr = plan ?? 'free'

      if (!subId) continue
      const existing = await prisma.subscriptionSnapshot.findFirst({
        where: {
          stripeSubscriptionId: subId,
          periodStart,
        },
      })
      if (existing) {
        skippedDuplicates++
        continue
      }

      try {
        await prisma.subscriptionSnapshot.create({
          data: {
            userId: user.id,
            plan: planStr,
            priceMonthly: mrr.normalizedMonthlyCents,
            currency: (invoice.currency ?? 'usd').toLowerCase(),
            periodStart,
            periodEnd,
            status: 'historical',
            stripeSubscriptionId: subId,
            stripePriceId: mrr.stripePriceId,
            billingInterval: mrr.billingInterval,
            intervalCount: mrr.intervalCount,
            createdAt: new Date(invoice.created * 1000),
          },
        })
        totalSnapshotsInserted++
      } catch (err) {
        errors++
        console.warn(
          `[backfill] Skip invoice ${invoice.id} (${invoice.created}):`,
          (err as Error).message
        )
      }
    }

    hasMore = response.has_more && invoices.length > 0
    if (hasMore && invoices.length > 0) {
      startingAfter = invoices[invoices.length - 1].id
    }
  }

  console.log('[backfill] Summary:')
  console.log('  totalInvoicesProcessed:', totalInvoicesProcessed)
  console.log('  totalSnapshotsInserted:', totalSnapshotsInserted)
  console.log('  skippedDuplicates:', skippedDuplicates)
  console.log('  skippedNoUser:', skippedNoUser)
  console.log('  skippedNotPaid:', skippedNotPaid)
  console.log('  skippedNoRecurring:', skippedNoRecurring)
  console.log('  errors:', errors)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
