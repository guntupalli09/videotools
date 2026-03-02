# Billing & Analytics Correction — Implementation Report

## Summary

- **Part 1:** SubscriptionSnapshot `priceMonthly` now uses **MRR-normalized** value from recurring subscription line items only. `invoice.amount_paid` is **no longer used**.
- **Part 2:** Historical backfill script `backfillStripeSnapshots.ts` added (idempotent, safe).
- **Part 3:** Placeholder script `backfillJobsFromPosthog.ts` added (stub with TODOs).

---

## Files Modified

| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Extended `SubscriptionSnapshot` with `stripeSubscriptionId`, `stripePriceId`, `billingInterval`, `intervalCount`; added index `(stripeSubscriptionId, periodStart)` for idempotency. |
| `server/src/utils/stripeMrr.ts` | **New.** Shared MRR normalization: `computeNormalizedMonthlyCentsFromLines`, `computeNormalizedMonthlyCentsFromInvoice`. |
| `server/src/routes/stripeWebhook.ts` | `handleInvoicePaymentSucceeded`: uses `computeNormalizedMonthlyCentsFromInvoice(invoice)` for `priceMonthly`; writes `stripeSubscriptionId`, `stripePriceId`, `billingInterval`, `intervalCount`. `handleCustomerSubscriptionDeleted`: writes `stripeSubscriptionId` from event, other new fields null. |
| `server/scripts/backfillStripeSnapshots.ts` | **New.** Backfill script: list Stripe invoices (paginated), filter paid + recurring, resolve user by `stripeCustomerId`, idempotency by `(stripeSubscriptionId, periodStart)`, insert with same MRR logic. |
| `server/scripts/backfillJobsFromPosthog.ts` | **New (stub).** Placeholder for PostHog export → Job table; usage and mapping described in TODOs. |
| `docs/BILLING_ANALYTICS_CORRECTION_REPORT.md` | This report. |

---

## Migration Name

`20260302034251_add_snapshot_mrr_fields`

- **Content:** `ALTER TABLE "SubscriptionSnapshot" ADD COLUMN` for `billingInterval`, `intervalCount`, `stripePriceId`, `stripeSubscriptionId`; index `(stripeSubscriptionId, periodStart)`.
- **Additive only.** No columns or tables removed.

---

## Revenue Normalization Formula

**Source:** Recurring subscription line items only.

1. **Filter lines:** `line.type === 'subscription'` and `line.price?.recurring != null` (and `price` expanded).
2. **Per line:**  
   - `unit_amount` = `line.price.unit_amount` (cents)  
   - `interval` = `line.price.recurring.interval` (`'month'` \| `'year'`)  
   - `interval_count` = `line.price.recurring.interval_count` (default 1)
3. **Normalized monthly cents per line:**  
   - If `interval === 'month'`: `normalizedMonthlyCents = Math.round(unit_amount / interval_count)`  
   - If `interval === 'year'`: `normalizedMonthlyCents = Math.round(unit_amount / 12 / interval_count)`
4. **Total for snapshot:** Sum of normalized monthly cents over all such lines (multiple subscription lines, e.g. base + add-on, are summed).
5. **Stored:** `priceMonthly` = that sum. Metadata from first recurring line: `stripeSubscriptionId`, `stripePriceId`, `billingInterval`, `intervalCount`.

**Excluded:** `invoiceitem`, tax-only lines, overage items, one-time charges, and raw `invoice.amount_paid` (so annual payments, proration, discounts, tax, overage do not inflate MRR).

---

## Currency normalization

We store `currency` from the invoice as received; `priceMonthly` is in that currency (cents).

**MRR queries must either:**

- **Assume a single currency** (e.g. USD-only), or  
- **Convert to a base currency** before summing.

Raw summation of `priceMonthly` across multiple currencies is **meaningless**. For now, the system is safe if you are **USD-only**; if you ever accept multiple currencies, add conversion to a base currency (e.g. USD) before computing MRR totals or dashboard aggregates.

---

## Confirmation: `invoice.amount_paid` No Longer Used

- **Webhook:** `handleInvoicePaymentSucceeded` no longer reads `invoice.amount_paid`. It uses `computeNormalizedMonthlyCentsFromInvoice(invoice)`, which derives amount only from recurring subscription lines.
- **Backfill:** Uses the same `computeNormalizedMonthlyCentsFromLines(invoice.lines.data)`; no use of `amount_paid`.
- **Grep:** No remaining references to `invoice.amount_paid` in snapshot or MRR logic (only in a comment in `stripeMrr.ts` explaining why we do not use it).

---

## Backfill Script Usage

**Script:** `server/scripts/backfillStripeSnapshots.ts`

**Run (from repo root or server dir):**

```bash
cd server
BACKFILL_MONTHS=6 npx tsx scripts/backfillStripeSnapshots.ts
```

**Env:**

- `BACKFILL_MONTHS` — Optional, default `6`. Number of months back from now for `invoice.created` (approx. 30 days per month).
- `DATABASE_URL` — Required (e.g. from `.env.development` or `.env.production`).
- `STRIPE_SECRET_KEY` — Required.

**Behavior:**

1. Lists Stripe invoices with `created >= (now - BACKFILL_MONTHS * 30 days)`, paginated (100 per page), with `expand: ['data.lines.data.price']`.
2. Keeps only **paid** invoices with at least one recurring subscription line (MRR > 0 or has `stripeSubscriptionId`).
3. Resolves **userId** by `User.stripeCustomerId === invoice.customer`; skips and counts as `skippedNoUser` if no match.
4. **Idempotency:** If a `SubscriptionSnapshot` already exists with the same `stripeSubscriptionId` and `periodStart`, skips and counts as `skippedDuplicates`.
5. Inserts snapshot with: `userId`, `plan` (from `getPlanFromPriceId(stripePriceId)` or `'free'`), `priceMonthly` (normalized), `currency`, `periodStart`/`periodEnd` from line/invoice, `status: 'historical'`, `stripeSubscriptionId`, `stripePriceId`, `billingInterval`, `intervalCount`, `createdAt: invoice.created`.
6. Each insert in try/catch; one failure does not stop the run.
7. Logs a **summary:** `totalInvoicesProcessed`, `totalSnapshotsInserted`, `skippedDuplicates`, `skippedNoUser`, `skippedNotPaid`, `skippedNoRecurring`, `errors`.

**Pre-deploy checklist (your steps):**

- Run backfill **locally or on staging** first.
- Inspect **10 random** `SubscriptionSnapshot` rows (e.g. by `userId` or `periodStart`).
- Manually verify **Stripe Dashboard** (invoice line items, amounts, intervals) for those invoices.
- Confirm **annual** plans: `priceMonthly` ≈ (annual price in cents) / 12.
- Confirm **overage-only** or non-recurring invoices do **not** create snapshots (or MRR = 0).

---

## Edge Cases Not Covered

1. **Stripe API version / line shape:** Line items are typed as `InvoiceLineLike`; if Stripe moves to a different structure (e.g. only `pricing` and no `price`), the MRR helper may need to be updated to read from the new fields.
2. **Multiple subscriptions per customer:** Backfill and webhook both key idempotency by one `stripeSubscriptionId` per invoice; one invoice can only have one subscription in practice. Multiple subscriptions on the same customer produce multiple invoices and multiple snapshots.
3. **Plan mapping:** `getPlanFromPriceId` only recognizes configured price IDs (basic, pro, agency, annual, founding_workflow). Unknown price IDs yield `plan: 'free'` in backfill; webhook keeps `activePlan` from first recognized line.
4. **Canceled snapshot metadata:** On `customer.subscription.deleted` we do not have invoice/price; `stripePriceId`, `billingInterval`, `intervalCount` are stored as null; `priceMonthly` is 0.
5. **Backfill “historical” vs “active”:** Backfill always sets `status: 'historical'`. It does not check whether the subscription is still active; that could be a future enhancement.
6. **PostHog backfill:** `backfillJobsFromPosthog.ts` is a stub; actual implementation depends on PostHog export schema and idempotency policy (e.g. upsert by `jobId`).

---

## Safety and Idempotency

- **Webhook:** Same as before; only the source of `priceMonthly` and the extra fields changed. No removal of existing User/plan logic.
- **Backfill:** Read-only from Stripe; writes only to `SubscriptionSnapshot`. Duplicates avoided by `(stripeSubscriptionId, periodStart)`. Per-insert try/catch; script continues on single failure and reports counts.
