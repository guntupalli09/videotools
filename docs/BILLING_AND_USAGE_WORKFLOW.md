# Billing & Usage Workflow

This document describes how the system identifies free vs paid users, enforces limits, tracks minutes, and handles Stripe subscription lifecycle (renewal, cancel). It is the single source of truth for this crucial workflow.

---

## 1. How the system identifies Free / Basic / Pro / Agency users

### Server-side (source of truth)

- **User model** (`server/src/models/User.ts`): Each user has a `plan` field: `'free' | 'basic' | 'pro' | 'agency'` and cached `limits` from `getPlanLimits(plan)`.
- **Where the plan is set:**
  1. **Stripe webhooks** (authoritative for paid users):
     - `checkout.session.completed`: When a user completes checkout, the backend sets `user.plan` from session metadata (`plan`: basic | pro | agency) and `user.limits = getPlanLimits(plan)`.
     - `invoice.payment_succeeded`: On each successful invoice (including renewals), the backend re-derives the plan from the invoice line items (via `getPlanFromPriceId(priceId)`) and sets `user.plan` and `user.limits`. Billing period and usage are reset from Stripe’s `period_start` / `period_end`.
     - `customer.subscription.deleted`: Subscription is cleared (`subscriptionId = undefined`); access continues until `current_period_end`, then the user is effectively downgraded (see usage reset below).
  2. **Usage route** (`server/src/routes/usage.ts`): When a paid user has `billingPeriodEnd` in the past and no `subscriptionId`, they are downgraded to `free` and usage is reset.
  3. **New / demo users**: If no user exists for the request, the server creates one with plan from **JWT** (if present) or **request headers** `x-plan` (default `'free'`). So for unauthenticated requests, plan is effectively whatever the client sends as `x-plan` (and `x-user-id` identifies the “user”).

### Client-side

- **Headers sent on every API call** (`client/src/lib/api.ts`): `x-user-id` and `x-plan` from `localStorage` (fallback `'demo-user'` and `'free'`).
- **Plan display**: Components like `PlanBadge` and `UsageDisplay` call `GET /api/usage/current` (with those same headers). The **response** `plan` and usage come from the server’s user record for that `x-user-id` (or from JWT if the app ever sends `Authorization: Bearer <token>`). So the displayed plan is whatever the server returns for that identity.
- **Important**: The app does **not** currently send `Authorization: Bearer` with the JWT after login. So for the server to treat the user as paid, either (1) the client must send the JWT in `Authorization` for `/api/usage/current` and `/api/upload`, or (2) the client must set `localStorage` `userId` / `plan` to match the paid user (e.g. after a post-checkout “session” or login flow that returns user id and plan). Right now, identity for usage/upload is driven by `x-user-id` + `x-plan` when no JWT is sent.

### Summary table

| Identity / Plan source | When used |
|------------------------|-----------|
| Stripe webhooks        | Paid users: set/update `user.plan` and `user.limits` on checkout, invoice, and subscription deleted. |
| JWT (if sent)          | After login: `auth.userId`, `auth.plan` used for upload and usage. |
| Headers `x-user-id`, `x-plan` | When no JWT: server gets or creates user by `x-user-id` and uses `x-plan` (or auth plan) for limits. |

---

## 2. Are minutes and other perks unlocked based on plan?

**Yes.** Plan drives all limits and perks.

- **Limits** come from `server/src/utils/limits.ts` → `getPlanLimits(plan)`:

| Plan   | min/mo | max video | max file size | max languages | batch | batch max videos | batch max min |
|--------|--------|-----------|----------------|---------------|-------|-------------------|----------------|
| free   | 60     | 5 min     | 100 MB         | 1             | no    | 0                 | 0              |
| basic  | 450    | 30 min    | 500 MB         | 2             | no    | 0                 | 0              |
| pro    | 1,200  | 120 min   | 2 GB           | 5             | yes   | 20                | 60             |
| agency | 3,000  | 240 min   | 10 GB          | 10            | yes   | 100               | 300            |

- **Where enforced:**
  - **Upload** (`server/src/routes/upload.ts`): `user.limits.maxFileSize`, `user.limits.maxConcurrentJobs`; multi-language checked with `enforceLanguageLimits(user, …)`.
  - **Worker** (`server/src/workers/videoProcessor.ts`): `validateVideoDuration(…, getPlanLimits(plan).maxVideoDuration)`; batch jobs only run for users with `batchEnabled` (Pro/Agency).
  - **Batch** (`server/src/routes/batch.ts`): `user.limits.batchEnabled`, `enforceBatchLimits(user, …)` (batch max videos, batch max duration).
  - **Metering** (`server/src/utils/metering.ts`): Translation minutes cap by plan (`getPlanTranslatedMinutesCap(plan)`: Pro 500, Agency 2000, else none).
  - **Overage**: Only users with `stripeCustomerId` can go over monthly minutes; overage is tracked and allowed in `enforceUsageLimits` (see below).

---

## 3. Are minutes tracked correctly based on usage?

**Yes, after the fact.** Minutes are **recorded in the worker** when a job **completes**, not at upload time.

- **Recording** (`server/src/workers/videoProcessor.ts`):
  - For each relevant job type (e.g. video-to-transcript, video-to-subtitles, burn-subtitles, compress-video, batch-video-to-subtitles, multi-language), the worker:
    - Computes minutes (e.g. from trimmed or actual duration via `secondsToMinutes`, plus translation minutes where applicable).
    - Calls `getOrCreateUserForJob(userId, plan)` then does:
      - `user.usageThisMonth.totalMinutes += minutes`
      - (and where applicable `translatedMinutes`, `videoCount`, `languageCount`, etc.)
    - Saves the user.
  - So the **same** `userId` (and in-memory user) that was used when the job was queued gets its `usageThisMonth` updated when the job finishes.

- **Reset of usage:**
  - **Paid users**: On `invoice.payment_succeeded`, the backend sets `user.usageThisMonth = { … totalMinutes: 0, … }` and `user.usageThisMonth.resetDate = period_end` from Stripe. So usage resets each billing period.
  - **Free / demo**: In `usage.ts` and in the worker, if `now > user.usageThisMonth.resetDate`, usage is reset to zero and `resetDate` is set to the next calendar month.

- **Pre-check (minutes) before allowing a job:**  
  **`enforceUsageLimits(user, requestedMinutes)`** exists in `server/src/utils/limits.ts` and:
  - Allows the request if `totalMinutes + requestedMinutes <= minutesPerMonth`, or
  - For **paid users** (`stripeCustomerId` set), allows overage and records `overagesThisMonth.minutes`.
  - **It is not currently called** in `upload.ts` or in the worker before enqueueing. So the system does **not** block an upload when the user would exceed their monthly minutes; it only records usage after completion. To enforce hard caps (or overage) at request time, call `enforceUsageLimits` in the upload (and optionally batch) path and reject or allow overage according to your product rules.

---

## 4. Can the user auto-renew and cancel their plan?

**Yes for auto-renew. Cancel is supported by Stripe and the app keeps access until period end.**

### Auto-renewal

- Stripe subscriptions renew automatically according to the product’s billing cycle.
- On each renewal, Stripe sends **`invoice.payment_succeeded`**.
- The webhook (`server/src/routes/stripeWebhook.ts`) then:
  - Resolves the user by `stripeCustomerId`.
  - Re-derives **plan** from the invoice line item price ID (`getPlanFromPriceId`).
  - Updates `user.plan` and `user.limits`.
  - Sets `billingPeriodStart` / `billingPeriodEnd` from the invoice period.
  - **Resets** `user.usageThisMonth` and `user.overagesThisMonth` for the new period.

So renewal is fully handled by Stripe + webhook; no extra app logic is required for auto-renew.

### Cancellation

- **Stripe side**: The customer (or you) can cancel the subscription in the Stripe Dashboard or via Stripe’s API/Portal. Stripe then sends **`customer.subscription.deleted`** when the subscription ends.
- **App side** (`handleCustomerSubscriptionDeleted`):
  - Sets `user.subscriptionId = undefined`.
  - Keeps `billingPeriodEnd` (and `usageThisMonth.resetDate`) so the user **keeps access until the end of the paid period**.
  - After that date, the usage route’s “downgrade when `billingPeriodEnd` passed and no `subscriptionId`” logic sets the user to `free` and resets usage.

There is **no** in-app “Cancel subscription” or “Billing portal” button in the codebase; users would cancel in Stripe (Dashboard or a Stripe Customer Portal link if you add one).

### Annual billing

- The **frontend** Pricing page can send `annual: true` to checkout. The **backend** checkout route (`server/src/routes/billing.ts`) currently uses only **monthly** price IDs (`prices.basicPriceId`, `prices.proPriceId`, `prices.agencyPriceId`) and does **not** use `prices.basicAnnualPriceId` etc. So annual billing is not applied at checkout today; to support it, the checkout route would need to pick the annual price when `annual === true` and ensure those price IDs exist in `getPlanFromPriceId` (they already do in `server/src/services/stripe.ts`).

---

## 5. Regression / sanity checklist

- [ ] **Plan identity**: After a paid checkout, the same identity (JWT or `x-user-id`/`x-plan`) used in API calls should see the updated plan and limits (e.g. from `GET /api/usage/current`). If the app relies on headers only, ensure the client sets `userId`/`plan` after login or post-checkout.
- [ ] **Minutes**: Run a job to completion and confirm `GET /api/usage/current` shows increased `usage.totalMinutes` and decreased `remaining`.
- [ ] **Reset**: For a paid user, after a renewal (or manually advancing `billingPeriodEnd` in tests), the next `invoice.payment_succeeded` (or your test) should reset usage and update `resetDate`.
- [ ] **Cancel**: Trigger `customer.subscription.deleted` (or simulate it); confirm `subscriptionId` is cleared and access remains until `billingPeriodEnd`; after that, the user is treated as free and usage resets.
- [ ] **Overage**: Only users with `stripeCustomerId` can exceed `minutesPerMonth`; consider calling `enforceUsageLimits` at upload time if you want to enforce or allow overage at request time.

---

## 6. Files reference

| Area              | Files |
|-------------------|--------|
| Plan & limits     | `server/src/models/User.ts`, `server/src/utils/limits.ts`, `server/src/services/stripe.ts` (getPlanFromPriceId) |
| Usage recording   | `server/src/workers/videoProcessor.ts`, `server/src/utils/metering.ts` |
| Usage API         | `server/src/routes/usage.ts` |
| Stripe lifecycle  | `server/src/routes/stripeWebhook.ts`, `server/src/routes/billing.ts` |
| Upload / batch    | `server/src/routes/upload.ts`, `server/src/routes/batch.ts` |
| Auth              | `server/src/utils/auth.ts`, `server/src/routes/auth.ts` |
| Client identity   | `client/src/lib/api.ts` (headers), `client/src/lib/billing.ts` |
