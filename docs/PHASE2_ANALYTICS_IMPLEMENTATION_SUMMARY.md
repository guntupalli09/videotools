# Phase 2 Analytics Foundation — Implementation Summary

## Files Modified

| File | Changes |
|------|--------|
| `server/prisma/schema.prisma` | Extended `User` with `role`, `utmSource`, `utmMedium`, `utmCampaign`, `firstReferrer`, `firstSeenAt`, `lastActiveAt`; added `Job` and `SubscriptionSnapshot` models. |
| `server/src/models/User.ts` | Extended `User` interface and `rowToUser` / `userToDb` with new fields (role, UTM, firstReferrer, firstSeenAt, lastActiveAt). |
| `server/src/lib/jobAnalytics.ts` | **New file.** Helpers: `insertJobRecord`, `updateJobStarted`, `updateJobCompleted`, `updateJobFailed` (all try/catch, log on error, non-throwing). |
| `server/src/routes/upload.ts` | Import `insertJobRecord`. After each `addJobToQueue` (cached-result, main single-file, burn-subtitles, streaming `doEnqueueJob`): call `insertJobRecord` in try/catch. |
| `server/src/routes/batch.ts` | Import `insertJobRecord`. In loop after `addJobToQueue`: capture job, call `insertJobRecord` in try/catch. |
| `server/src/workers/videoProcessor.ts` | Import `updateJobStarted`, `updateJobCompleted`, `updateJobFailed`. Start of `run()`: `updateJobStarted(String(jobId))`. On success: `updateJobCompleted`, then update `User.lastActiveAt` and `saveUser`. On failure (outer catch): `updateJobFailed`. |
| `server/src/routes/stripeWebhook.ts` | Import `prisma`. In `handleInvoicePaymentSucceeded`: after `saveUser`, create `SubscriptionSnapshot` (active, `invoice.amount_paid`, `invoice.currency`, period). In `handleCustomerSubscriptionDeleted`: after `saveUser`, create `SubscriptionSnapshot` (canceled, `priceMonthly: 0`, `currency: 'usd'`). |

## New Models Added

- **Job**: `id`, `userId`, `toolType`, `status`, `fileSizeBytes`, `videoDurationSec`, `startedAt`, `completedAt`, `processingMs`, `failureReason`, `planAtRun`, `createdAt`. Indexes: `userId`, `(toolType, createdAt)`, `status`. No foreign keys.
- **SubscriptionSnapshot**: `id` (cuid), `userId`, `plan`, `priceMonthly` (cents), `currency`, `periodStart`, `periodEnd`, `status`, `createdAt`. Indexes: `userId`, `periodStart`. No foreign keys.

## Migration Name

`20260302032505_add_job_subscription_snapshot_user_analytics`

- **User**: additive columns only (`ALTER TABLE "User" ADD COLUMN ...`).
- **Job** and **SubscriptionSnapshot**: new tables and indexes only. No dropped columns or destructive changes.

## Exact Insertion Points for Job

| Location | When | Payload |
|----------|------|--------|
| `server/src/routes/upload.ts` | After `addJobToQueue` for cached hit | `id: String(cachedJob.id)`, `userId`, `toolType: 'cached-result'`, `planAtRun: plan` |
| `server/src/routes/upload.ts` | After `addJobToQueue` for main single-file upload | `id: String(job.id)`, `userId`, `toolType`, `planAtRun: plan`, `fileSizeBytes: file.size` |
| `server/src/routes/upload.ts` | After `addJobToQueue` for burn-subtitles (`/dual`) | `id: String(job.id)`, `userId`, `toolType: 'burn-subtitles'`, `planAtRun: plan`, `fileSizeBytes: videoFile.size` |
| `server/src/routes/upload.ts` | Inside `doEnqueueJob()` after `addJobToQueue` (streaming/chunked) | `id: String(job.id)`, `userId: meta.userId!`, `toolType: meta.toolType`, `planAtRun: meta.plan`, `fileSizeBytes: fileSize` |
| `server/src/routes/batch.ts` | Inside loop after each `addJobToQueue` | `id: String(job.id)`, `userId: user.id`, `toolType: 'batch-video-to-subtitles'`, `planAtRun: user.plan`, `fileSizeBytes: fileSize` |

**Worker updates (videoProcessor.ts):**

- **Started**: Start of `run()` (right after `log.info({ msg: 'job_started', ... })`): `updateJobStarted(String(jobId))`.
- **Completed**: After `trackProcessingFinished`, before `return result`: `updateJobCompleted(String(jobId), totalJobMs)` then, if `data.userId`, load user, set `user.lastActiveAt = new Date()`, `saveUser(user)`.
- **Failed**: In outer catch after `trackProcessingFailed`: `updateJobFailed(String(jobId), err?.message)`.

## Exact Insertion Points for SubscriptionSnapshot

| Event | Location | Data |
|-------|----------|------|
| `invoice.payment_succeeded` | `handleInvoicePaymentSucceeded`, after `saveUser(user)` | `userId`, `plan` (activePlan ?? user.plan), `priceMonthly: invoice.amount_paid ?? 0`, `currency: (invoice.currency ?? 'usd').toLowerCase()`, `periodStart: startDate`, `periodEnd: endDate`, `status: 'active'` |
| `customer.subscription.deleted` | `handleCustomerSubscriptionDeleted`, after `saveUser(user)` | `userId`, `plan: user.plan`, `priceMonthly: 0`, `currency: 'usd'`, `periodStart: user.billingPeriodStart ?? 30 days before endDate`, `periodEnd: endDate`, `status: 'canceled'` |

## Assumptions

- Job `id` is the Bull job id (string or number); stored as string in DB.
- No foreign key constraints: `Job.userId` and `SubscriptionSnapshot.userId` are plain strings (existing codebase pattern).
- `invoice.amount_paid` is used for `priceMonthly` (cents); no separate plan→cents mapping in code.
- Canceled snapshots use `priceMonthly: 0` and `currency: 'usd'` (no invoice at delete).
- All analytics DB writes are best-effort: wrapped in try/catch, errors logged, main flow never throws.

## Edge Cases Not Handled

- **Job record missing on update**: Worker calls `updateJobStarted` / `updateJobCompleted` / `updateJobFailed` with `updateMany`; if the row was never inserted (e.g. insert failed), the update is a no-op. No backfill or reconciliation.
- **Duplicate Job id**: If the same Bull job id were reused (theoretical), `prisma.job.create` would throw (PK); caught and logged.
- **Subscription snapshot on first invoice**: Handled; we use `invoice.amount_paid` and period from invoice.
- **User.lastActiveAt**: Only set on job **completion** in the worker; not set on job creation or on other activity (e.g. login, usage fetch).
- **videoDurationSec**: Not populated on Job (would require worker to pass duration after validation); left as null.
- **Stripe `saveUser(user)` in invoice handler**: Not awaited; snapshot insert runs after and uses in-memory `user` and dates; ordering is unchanged from prior behavior.

## Safety

- All Job and SubscriptionSnapshot writes are inside try/catch; failures are logged and do not throw.
- PostHog tracking is unchanged and remains in place.
- Existing User plan and usage logic is unchanged; SubscriptionSnapshot is additive.
