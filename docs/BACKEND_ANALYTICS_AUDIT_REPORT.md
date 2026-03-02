# Backend Analytics Audit Report

**Product:** VideoText — SaaS video processing platform  
**Scope:** Backend + data architecture for a private founder analytics dashboard  
**Date:** 2025 (audit from codebase inspection)

---

## Current Architecture Summary

- **Database:** PostgreSQL via Prisma. Three persisted tables: `User`, `BatchJobRecord`, `Feedback`. No subscription/invoice/event tables.
- **Stripe:** Live API only. Webhooks update `User` (plan, `subscriptionId`, `billingPeriodStart`/`End`, usage reset). No Stripe data (invoices, payments, subscription history) stored in your DB.
- **Analytics:** Client + server send events to **PostHog** only. No analytics or event log stored in your database. Processing metrics (e.g. `processing_ms`) exist only in PostHog.
- **Jobs:** Single-job processing (transcript, subtitles, etc.) is driven by **Bull (Redis)**; job payloads and results are not persisted. Only **batch** jobs are stored in `BatchJobRecord`.
- **Stripe event idempotency:** In-memory `Map` in `StripeEventLog` — not persisted; resets on server restart.

---

## Existing Tables & Data

### 1. User

| Column | Type | Index / Notes |
|--------|------|----------------|
| id | TEXT | PK |
| email | TEXT | None |
| plan | TEXT | free \| basic \| pro \| agency \| founding_workflow |
| stripeCustomerId | TEXT | UNIQUE |
| subscriptionId | TEXT | |
| billingPeriodStart | TIMESTAMP(3) | |
| billingPeriodEnd | TIMESTAMP(3) | |
| usageThisMonth | JSONB | totalMinutes, videoCount, batchCount, importCount, resetDate, etc. |
| limits | JSONB | PlanLimits |
| overagesThisMonth | JSONB | |
| createdAt | TIMESTAMP(3) | |
| updatedAt | TIMESTAMP(3) | |

**Relationships:** None (no FKs). No `role` column. No index on email or plan.

### 2. BatchJobRecord

| Column | Type |
|--------|------|
| id | TEXT PK |
| userId | TEXT |
| totalVideos | INTEGER |
| totalDuration | INTEGER |
| processedVideos | INTEGER |
| failedVideos | INTEGER |
| status | TEXT |
| errors | JSONB |
| createdAt | TIMESTAMP(3) |
| completedAt | TIMESTAMP(3) |
| expiresAt | TIMESTAMP(3) |

Single jobs (transcript, subtitles, translate, fix, burn, compress) are **not** stored — only batch runs.

### 3. Feedback

| Column | Type |
|--------|------|
| id | TEXT PK |
| toolId | TEXT |
| stars | INTEGER |
| comment | TEXT |
| userId | TEXT |
| userNameOrEmail | TEXT |
| planAtSubmit | TEXT |
| createdAt | TIMESTAMP(3) |

Feedback is fully stored and linkable to user/tool/plan.

### 4. StripeEventLog (not in DB)

In-memory Map only. Idempotency lost on restart.

---

## Stripe Integration Analysis

**Webhook handlers:** `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`. They update User (plan, subscriptionId, billing period, usage reset). **Not stored:** invoices, payment amounts, subscription history. **Not handled:** `invoice.payment_failed`, `customer.subscription.updated`.

- **MRR:** Not computable from DB. Need Stripe API or new tables.
- **Churn:** Partially detectable (subscriptionId cleared + billingPeriodEnd). No history table.
- **Revenue trends:** Not stored.

---

## Feature Logging Analysis

- **Server:** PostHog only (`trackJobCreated`, `trackProcessingFinished(processing_ms)`, `trackProcessingFailed`). Upload logs go to Pino (stdout), not DB.
- **Per-user, per-tool usage:** Not in DB. Only aggregates in User.usageThisMonth; tool type only in PostHog.
- **Processing duration / failure rate:** Only in PostHog. No failed-job or job-duration table.

---

## Feedback Tracking

Fully implemented. Feedback table + POST/GET API. Linkage via userId. Ready for dashboard.

---

## Traffic / Attribution

No UTM, referrer, or campaign fields in DB. Not captured server-side. PostHog may have client-side data only.

---

## Metrics Readiness Table

| Metric | Status | Notes |
|--------|--------|--------|
| Total Users | READY | Count User |
| Active Users (7d/30d) | PARTIAL | No lastActiveAt; updatedAt only on usage/billing |
| MRR | MISSING | No invoice/payment storage |
| ARR | MISSING | Same |
| Churn Rate | PARTIAL | Infer from subscriptionId + billingPeriodEnd; no history |
| Revenue by Plan | MISSING | No revenue stored |
| Feature Usage per Tool | MISSING | No per-tool job table |
| Top Users by Activity | PARTIAL | usageThisMonth aggregates only |
| Processing Time Average | MISSING | PostHog only |
| Failure Rate | MISSING | No failed-job table |
| Conversion (Free→Paid) | PARTIAL | From User.plan; no conversion event |
| Retention (D1/D7/D30) | PARTIAL | updatedAt proxy only |
| Activation (Signup→First Success) | MISSING | No first success timestamp |

---

## Gaps & Required Actions (STEP 7)

**Missing tables:** Subscription or InvoicePayment, Job/Event (single-job), StripeEventLog (persisted), SignupEvent or attribution table.

**Missing fields (User):** role, lastActiveAt, firstSuccessfulJobAt; optional UTM at signup (utmSource, utmMedium, utmCampaign).

**Missing event logging:** No DB write for single-job start/complete/fail; no DB write for processing duration or failure reason. All in PostHog only.

**Schema improvements needed:** Index on User.email and User.plan for admin listing; optional FK from Feedback/BatchJobRecord to User; persist StripeEventLog.

**Stripe data improvements needed:** Store invoice.payment_succeeded payload or summary (amount, period, plan) for MRR/revenue; handle and optionally store invoice.payment_failed and customer.subscription.updated; persist processed event IDs in DB.

**Performance logging improvements needed:** Write job_created/job_completed/job_failed (with toolType, userId, processingMs, status) to a Job or Event table so processing time and failure rate are queryable in your DB.

---

## Gaps & Required Actions

**Missing tables:** Subscription/InvoicePayment, Job/Event (single-job), persisted StripeEventLog, optional SignupEvent.

**Missing fields (User):** role, lastActiveAt, firstSuccessfulJobAt; optional UTM at signup.

**Missing event logging:** No DB write for single-job or processing duration/failure; all in PostHog.

**Stripe improvements:** Store invoice/payment data for MRR; persist webhook event IDs; handle invoice.payment_failed.

**Performance logging:** Write job completion/failure (toolType, userId, processingMs) to a Job table for DB-level metrics.

---

## Critical Gaps

1. No subscription/revenue persistence — MRR, ARR, revenue trends require Stripe API or new tables.
2. No per-job table — Single jobs not stored; tool usage and failure rate not in DB.
3. No processing/failure persistence — Only PostHog.
4. No traffic/attribution in DB.
5. No activation/retention fields (lastActiveAt, firstSuccessfulJobAt).
6. No roles — Admin dashboard access needs ADMIN_EMAILS or User.role.
7. Stripe event log in-memory only.

---

## Recommended Schema Additions

- **User:** `lastActiveAt`, optional `role` (admin/user).
- **Job/Event table:** userId, toolType, status, createdAt, optional processingMs — for feature usage, failure rate, activation.
- **Subscription/Invoice snapshot table:** For MRR/revenue from webhooks.
- **StripeEventLog table:** Persist webhook idempotency.
- Optional: UTM fields on User or SignupEvent at signup.

---

## Implementation Priority Plan

**Phase 1 — Minimal:** Admin-only route (ADMIN_EMAILS or role). List users (email, plan, createdAt, billingPeriodEnd), list feedback. Derived: total users, users by plan, feedback aggregates, approximate churn. No new tables.

**Phase 2 — Instrumentation:** Job/Event table for single jobs; lastActiveAt (and optionally firstSuccessfulJobAt); persist Stripe event log; optional SubscriptionSnapshot/InvoicePayment from webhooks.

**Phase 3 — Advanced:** Revenue aggregation, UTM at signup, dashboard UI with trends, retention, activation, MRR/churn from new tables.

---

## Risk Assessment

- Stripe idempotency in-memory → duplicate webhook processing after restart.
- Dashboard must be admin-only (role or allowlist).
- Heavy reliance on PostHog for event-level and processing metrics.

---

## Final Verdict

- **Architecture score (0–10):** 4 — No analytics/revenue persistence; single-job lifecycle not in DB.
- **Instrumentation score (0–10):** 3 — Events and processing only in PostHog.
- **Analytics readiness score (0–10):** 3 — User list + feedback + plan/subscription status dashboard is possible. MRR, revenue, per-tool usage, processing time, failure rate, retention/activation are **not** possible from current DB without new tables or PostHog/Stripe API.

**Bottom line:** A founder dashboard showing **users, plans, and feedback** is **possible today** with admin-only API and UI. For **MRR, churn, revenue, feature usage, processing metrics, retention/activation**, the backend is **not ready** — add the suggested schema and instrumentation or use PostHog and Stripe as sources of truth.
