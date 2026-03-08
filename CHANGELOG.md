# Changelog

## [Unreleased] — 2026-03-08 — Product Hunt Launch Hardening

### Critical Fixes
- **Stripe plan not activated after payment** — `saveUser()` was fire-and-forget in `handleInvoicePaymentSucceeded`; added missing `await` so paid users are correctly upgraded in Postgres.
- **OTP codes lost on server restart** — OTP store migrated from in-memory `Map` to Redis with native TTL (10 min), survives deploys and multi-instance setups.
- **Stripe webhook double-processing** — Idempotency check migrated from in-memory `Set` (reset on restart) to Postgres `StripeEventLog` table; new Prisma migration added.
- **Silent async errors** — Added `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers so crashes are logged rather than silently dropped.
- **Missing env vars causing silent failures** — Added production startup validation; server exits with a clear error if `STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, or `JWT_SECRET` are missing.

### High-Severity Fixes
- **Upload rate limit reset on restart** — Migrated from in-memory `Map<userId, timestamps[]>` to Redis sorted-set with atomic pipeline; persists across restarts and works correctly across multiple server instances.
- **In-flight jobs killed on deploy** — Added graceful Bull queue shutdown (`fileQueue.close()` + `priorityQueue.close()`) before HTTP server close on SIGTERM; 15 s force-exit safety net.
- **Hourly file cleanup too slow** — Reduced `startFileCleanup` interval from 60 minutes to 15 minutes; added disk-usage monitoring via `fs.statfsSync` — if disk exceeds 80% capacity, emergency mode activates and deletes files older than 15 minutes instead of 1 hour.
- **Replicate API poll hung indefinitely** — Added `AbortSignal.timeout(8000)` to each status-poll `fetch` in `diarization.ts` (create-prediction call already had a timeout).
- **OTP/email fetch hung indefinitely** — Added `AbortSignal.timeout(8000)` to all Resend API `fetch` calls in `auth.ts` and `adminSupport.ts`.

### Medium-Severity Fixes
- **Duplicate-processing cache grew unbounded** — Added background `setInterval` eviction (every 6 h or CACHE_TTL, whichever is shorter) using `.unref()` so it doesn't block process shutdown.

### New Features
- **Server-side watermark enforcement** — Free-plan exports now receive a watermark injected on the server (in `download.ts`), not just the client. The watermark is embedded as a subtitle cue (SRT/VTT), a `_watermark` JSON field, or header/footer lines (TXT/CSV) — it cannot be bypassed by calling the API directly.
- **Auto-recompute command centre metrics** — Hourly and nightly (2 AM UTC) cron jobs in `server/src/index.ts` call `runRecompute()` and clear the dashboard cache automatically; zero manual intervention required.

### Infrastructure
- Added `StripeEventLog` Prisma model + migration (`20260308000000_add_stripe_event_log`).
- Added `prisma migrate deploy` step required on next deploy (see **Your Manual Steps** below).
