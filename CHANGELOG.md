# Changelog

## [Unreleased] — 2026-03-10

### New Features
- **YouTube URL transcription** — Paste a `youtube.com` or `youtu.be` link to transcribe without uploading. Worker fetches audio via yt-dlp; supports age-restricted videos with optional cookies. Separate per-user rate limit; same polling flow as file uploads.

### Bug Fixes
- **YouTube / uploaded-audio WAV → MP3 chunking** — `splitAudioIntoChunks` and `splitAudioIntoVariableChunks` now encode with `libmp3lame` instead of `-c copy`. Fixes "Invalid audio stream. Exactly one MP3 audio stream is required" when processing WAV input (YouTube or uploaded audio).
- **Near-empty audio chunks crashing transcription** — `transcribeChunkVerbose` now checks chunk file size before attempting WAV conversion; chunks under 1 KB are silently skipped (return `[]`). Fixes `chunk_002.mp3: Invalid argument` ffmpeg errors and Whisper `400 Audio file is too short` failures.

### Security
- **OTP store in Redis** — OTP codes persist across restarts and work across multiple instances.
- **Stripe webhook idempotency** — Double-processing prevented via Postgres `StripeEventLog` table.
- **Upload rate limit in Redis** — Per-user limits survive restarts and scale to multi-instance deployments.
- **Filename sanitization** — User-provided filenames sanitized to prevent path traversal and shell injection.
- **CORS allowlist** — Production restricts origins to videotext.io and `CORS_ORIGINS` env.

### Memory & Resource Management
- **Temp file cleanup** — 15-minute interval; emergency mode at 80% disk usage deletes files older than 40 minutes.
- **Duplicate-processing cache eviction** — Background eviction every 6 h to prevent unbounded growth.
- **Chunk cleanup after transcription** — Chunk files and output dirs removed in `finally` block after each job.
- **Graceful queue shutdown on SIGTERM** — Bull queues close before HTTP server; 15 s force-exit safety net.

---

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
