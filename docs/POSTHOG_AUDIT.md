# PostHog Integration — Phase 1 Audit Summary

## Frontend

### App entry point / global init
- **`client/src/main.tsx`** — Root render; no global lib init today. **Hook:** Initialize PostHog here (before `ReactDOM.createRoot`), so it’s available app-wide.

### Upload flow
- **File selection**
  - **`client/src/components/FileUploadZone.tsx`** — `onDrop` callback (lines 26–40) when user selects/drops file(s). **Hook:** `file_selected` in `onDrop` (single file: one event with `file_size_bytes`, `tool_type` from parent; multiple: one event per file or one with count — pages pass `onFileSelect` and don’t pass tool type into the zone, so tool_type may need to be passed as prop or tracked at call site).
  - **Call sites:** `VideoToTranscript`, `VideoToSubtitles`, `TranslateSubtitles`, `FixSubtitles`, `CompressVideo`, `BurnSubtitles` (two zones). **Recommendation:** Track `file_selected` in each page’s `handleFileSelect` (or equivalent) so we have `tool_type` and optional `file_size_bytes` without changing `FileUploadZone` API.
- **Upload start**
  - **`client/src/lib/api.ts`** — `uploadFileWithProgress` (line 411) and `uploadFile` (line 386): upload begins when these are called. **Hook:** `upload_started` at start of `uploadFileWithProgress` and `uploadFile` (and `uploadFromURL` / `uploadDualFiles` if we want URL/dual flows), with `tool_type`, `file_size_bytes`, `upload_mode` (single/chunked/audio-only).
- **Upload completion**
  - **`client/src/lib/api.ts`** — Same functions: after successful response (e.g. `data.jobId`), before returning. **Hook:** `upload_completed` with `job_id`, `tool_type`, `file_size_bytes`, `upload_mode`, optional `upload_duration_ms` (already logged as `[UPLOAD_TIMING]`).

### Job progress handling
- **`client/src/lib/jobPolling.ts`** — Exposes `getJobLifecycleTransition`; no polling loop here.
- **Pages (e.g. `VideoToTranscript.tsx`, `VideoToSubtitles.tsx`)** — `handleProcess` (or equivalent) starts upload, then starts `setInterval(doPoll, …)`. First poll that returns `status === 'processing'` → **job_started** (track once per job). When `getJobLifecycleTransition(jobStatus) === 'completed'` → **job_completed** (already have `trackEvent('processing_completed', …)`; map to PostHog `job_completed` with `processing_time_ms` if we store `processingStartedAt`). When `transition === 'failed'` → optional **job_failed** frontend event.
- **Exact functions:**
  - **`client/src/pages/VideoToTranscript.tsx`** — `handleProcess` (lines 296–468): after `uploadFileWithProgress` success, `doPoll` runs; on first `status === 'processing'` (or when we transition from queued to processing) fire `job_started`; on transition `completed` fire `job_completed` with `processing_time_ms`; on `failed` fire failure event.
  - **`client/src/pages/VideoToSubtitles.tsx`** — Same pattern (track `job_started`, `job_completed` in poll loop).
  - Other tool pages: **CompressVideo.tsx**, **TranslateSubtitles.tsx**, **FixSubtitles.tsx**, **BurnSubtitles.tsx** — Same: in their process/upload success + poll loop, add `job_started` / `job_completed` (and optionally `job_failed`).

### Result download / completion UI
- **`client/src/components/SuccessState.tsx`** — Renders download link `<a href={downloadUrl} download>`. **Hook:** Track `result_downloaded` on click (add `onClick` that calls analytics then allows default or programmatic download). Caller must pass `tool_type` / `job_id` if we want them, or we add optional callback prop `onDownloadClick`.

### Authentication / user identity
- **Identity:** App uses `localStorage.getItem('userId')` and `localStorage.getItem('plan')` (set after Stripe checkout in `App.tsx` `PostCheckoutHandler`). No email in localStorage; backend has `User` with email. **Hook:** In PostHog init (or once after app load), call `posthog.identify(userId)` when `userId` exists and is not `demo-user`; set person properties `plan`, and optionally `email` if we ever expose it to client. Anonymous users: leave as anonymous or use `posthog.identify(anonymousId)`; do not block tracking.

### Plan / pricing
- **`client/src/pages/Pricing.tsx`** — Buttons call `handleSubscribe(plan, annual)`. **Hook:** `plan_clicked` when user clicks a plan CTA (e.g. "Choose Basic", "Choose Pro") with `plan`, `annual`; then existing `trackEvent('payment_completed', …)` can map to **plan_upgraded** after successful return from Stripe (e.g. in `PostCheckoutHandler` when we set plan in localStorage and show toast).
- **`client/src/components/UserMenu.tsx`** — "Manage subscription" opens portal; optional `plan_clicked` with context `manage_portal`.

### Page views
- **`client/src/App.tsx`** — Routes; no global route listener. **Hook:** In `App.tsx` use `useLocation()` and `useEffect` to fire `page_viewed` (or rely on PostHog’s default `$pageview`) on pathname change with property `pathname` or `page`.

### Existing analytics
- **`client/src/lib/analytics.ts`** — Currently logs to console in DEV; events: `tool_selected`, `processing_started`, `processing_completed`, `paywall_shown`, `payment_completed`. **Hook:** Replace or extend this module to call PostHog and keep console in dev; standardize event names to `page_viewed`, `file_selected`, `upload_started`, `upload_completed`, `job_started`, `job_completed`, `result_downloaded`, `plan_clicked`, `plan_upgraded`.

---

## Backend

### Job creation
- **`server/src/routes/upload.ts`**  
  - **POST `/`** (single file): after validation, `addJobToQueue(plan, { … })` (lines 315–331); returns `jobId: job.id`. **Hook:** After `addJobToQueue` succeeds, fire `job_created` with `job_id`, `tool_type`, `user_id`, `plan`, `file_size_bytes` (from `file.size` or `req.file.size`).
  - **URL-based** (lines 159–171): same, `job_created` with `job_id`, `tool_type`, `user_id`, `plan` (no file size).
  - **Cached result** (lines 295–314): optional `job_created` with `cached: true`.
  - **POST `/dual`** (burn-subtitles, lines 422–445): same pattern, `job_created`.
  - **POST `/complete`** (chunked, lines 638–650): same, `job_created` with `file_size_bytes` from `fs.statSync(outPath).size`.

### Job started / processing lifecycle
- **`server/src/workers/videoProcessor.ts`**  
  - **`processJob(job)`** (line 231): first line is `console.log('[JOB]', jobId, 'RECEIVED')`; then `run()` with `console.log('[JOB]', jobId, 'STARTED')`. **Hook:** At start of `run()` (or right after RECEIVED), fire `processing_started` with `job_id`, `tool_type`, `user_id`, `file_size_bytes` (from `job.data`).
  - End of `run()`: success path returns `result`. **Hook:** After successful `return result`, fire `processing_finished` with `job_id`, `tool_type`, `processing_ms` (elapsed), `extraction_skipped` (e.g. for cached or audio-only), `success: true`.
  - **`catch` block** (lines 955–961): on failure, fire `processing_failed` with `job_id`, `tool_type`, `failure`/`error_message`, `success: false`.
  - **`attachQueueEvents`** (lines 964–1008): `queue.on('completed', …)` and `queue.on('failed', …)`. **Hook:** Either here or inside `processJob` try/catch; prefer inside `processJob` so we have one place and accurate `processing_ms`. So: **processing_started** at top of `run()`, **processing_finished** in `try` before `return result`, **processing_failed** in `catch`.

### Error / failure paths
- **`server/src/routes/upload.ts`** — Various 4xx/5xx and `fs.unlinkSync` on validation failure; no need to track each as analytics event (could be noisy). Optional: track only upload route 5xx or 429.
- **`server/src/workers/videoProcessor.ts`** — **processing_failed** covers job failures; webhook and batch updates already in place.

### Plan upgrade / billing
- **`server/src/routes/billing.ts`** — Checkout and portal; Stripe handles payment. **Hook:** Optional: after successful checkout session creation, or in Stripe webhook when subscription is created, track `plan_upgraded` server-side (if we want server-authoritative conversion). For minimal scope, frontend `plan_upgraded` after PostCheckoutHandler is enough.

---

## Files and functions summary

| Area | File | Function / location | Event(s) |
|------|------|--------------------|----------|
| Frontend init | `client/src/main.tsx` | Before root render | Init PostHog |
| Frontend identity | `client/src/main.tsx` or `analytics.ts` | After init / on load | `identify`, `setPersonProperties` (plan) |
| Page view | `client/src/App.tsx` | `useEffect` on `location.pathname` | `page_viewed` or use PostHog pageview |
| File selection | Each tool page | `handleFileSelect` / equivalent | `file_selected` (tool_type, file_size_bytes) |
| Upload | `client/src/lib/api.ts` | `uploadFileWithProgress`, `uploadFile`, `uploadFromURL`, `uploadDualFiles` | `upload_started`, `upload_completed` (tool_type, file_size_bytes, upload_mode, job_id, processing_time_ms if available) |
| Job progress | `VideoToTranscript.tsx`, `VideoToSubtitles.tsx`, etc. | Poll loop in `handleProcess` | `job_started` (once), `job_completed` (with processing_time_ms) |
| Download | `client/src/components/SuccessState.tsx` | Download link onClick | `result_downloaded` |
| Plan | `client/src/pages/Pricing.tsx` | Plan button click, PostCheckoutHandler | `plan_clicked`, `plan_upgraded` |
| Tool selected | `client/src/components/ToolCard.tsx` | Already `trackEvent('tool_selected')` | Keep and send as PostHog event (align name to `tool_selected` or keep) |
| Backend job created | `server/src/routes/upload.ts` | After each `addJobToQueue` success (POST `/`, URL, cached, `/dual`, `/complete`) | `job_created` |
| Backend processing | `server/src/workers/videoProcessor.ts` | `processJob` → start of `run()`, success return, catch | `processing_started`, `processing_finished`, `processing_failed` |

---

## Environment variables

- **Frontend:** `VITE_POSTHOG_KEY` (or `POSTHOG_KEY` if Vite exposes it), `VITE_POSTHOG_HOST` (default `https://app.posthog.com`).
- **Backend:** `POSTHOG_KEY`, `POSTHOG_HOST` (default `https://app.posthog.com`).

Use env vars for keys; no keys in code.
