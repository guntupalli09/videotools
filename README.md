# VideoText

Professional video utilities platform: transcribe video to text, generate and translate subtitles, fix timing, burn captions, compress video, and batch process. React + Vite frontend, Express backend, Bull queue, Stripe billing.

**We don’t store your data.** User uploads and generated outputs are processed and then deleted; we don’t keep copies. This is a core product commitment and is highlighted in the app (Privacy, FAQ, Pricing, and Home).

### Recent updates (high level)

- **Upload UX (Video → Transcript & Video → Subtitles):** Multi-stage progress (Preparing → Uploading → Processing → Completed/Error); instant file preview on selection (filename, duration, video thumbnail) using browser APIs only; **Cancel** to abort upload or leave processing and start a new file; automatic retry with exponential backoff (chunk and single-file uploads); “Slow connection detected — optimizing upload” when the connection probe indicates slow links. All additive and backwards compatible. See [§10 Upload & transcript/subtitles UX](#upload--transcriptsubtitles-ux) and `docs/UX_UPLOAD_IMPROVEMENTS.md`.
- **In-app translation viewers**: Translate transcript text (Video → Transcript) and subtitle cue text (Video → Subtitles) into English, Hindi, Telugu, Spanish, Chinese, or Russian.
- **Faster long-video transcription**: parallel chunking + merge (same result shape).
- **Optional GPU FFmpeg**: set `FFMPEG_USE_GPU=true` to use GPU decode/encode where available.
- **Result caching**: repeat processing (same user + file + tool + options) returns instantly within `CACHE_TTL_DAYS`.
- **Plan limits**: Free = 60 min/month, 15 min max per video; Basic = 45 min max per video. See [§5 Billing & usage](#5-billing--usage).
- **Usage tracking**: Batch jobs charge minutes per video; all tools show minutes remaining and refetch when a job completes.
- **Client: fast load & revisits** — Route-level code splitting (lazy-loaded pages), prefetch on link hover/focus, and PWA (precache of static assets; API is never cached). See [§10 Client: performance, devices & reliability](#10-client-performance-devices--reliability).
- **Client: mobile & reliability** — Chunked upload is mobile-optimised (smaller chunks, sequential, per-chunk timeout and retry with exponential backoff); “keep tab open” reminder during upload; offline banner when the app loses connection; user-facing “Check your connection” message on network/abort errors; error boundary and unhandled-rejection safety net.
- **Client: cross-browser** — Build target `es2020` and `browserslist` (last 2 Chrome, Firefox, Safari, Edge) for a clear compatibility baseline.
- **Pipeline & architecture:** Upload → queue → worker flow is documented; performance audit (bottlenecks, optional future optimisations) in `docs/PERFORMANCE_AUDIT_UPLOAD_PIPELINE.md`.

---

## Table of contents

1. [Features & tools (trees and branches)](#1-features--tools-trees-and-branches)
2. [Prerequisites & setup](#2-prerequisites--setup)
3. [Environment variables](#3-environment-variables)
4. [API contract (upload)](#4-api-contract-upload)
5. [Billing & usage](#5-billing--usage)
6. [Stripe (go live)](#6-stripe-go-live)
7. [Redis](#7-redis)
8. [Deployment (Hetzner + Caddy)](#8-deployment-hetzner--caddy)
9. [SEO & production URLs](#9-seo--production-urls)
10. [Client: performance, devices & reliability](#10-client-performance-devices--reliability)
11. [Project structure](#11-project-structure)

---

## 1. Features & tools (trees and branches)

### Core tools (main routes)

| Tool | Route | Description |
|------|--------|-------------|
| **Video → Transcript** | `/video-to-transcript` | Extract spoken text from video (upload or URL). Optional summary, chapters, speaker diarization, glossary. |
| **Video → Subtitles** | `/video-to-subtitles` | Generate SRT/VTT from video. Multi-language (Basic+: 2, Pro: 5, Agency: 10). Includes a **“View in another language”** (plain-text) translation viewer for copy/paste. |
| **Translate Subtitles** | `/translate-subtitles` | Translate SRT/VTT to Arabic, Hindi, etc. Upload or paste. |
| **Fix Subtitles** | `/fix-subtitles` | Auto-correct timing, grammar, line breaks, remove fillers. |
| **Burn Subtitles** | `/burn-subtitles` | Hardcode subtitles into video (dual upload: video + SRT/VTT). |
| **Compress Video** | `/compress-video` | Reduce file size (web / mobile / archive profiles). |
| **Batch Processing** | `/batch-process` | Process multiple videos (Pro/Agency). |

### Video → Transcript: tree and branches

After a transcript is generated, the **Transcript** view is the main trunk. The following **branches** are derived client-side from the same transcript (no re-fetch):

| Branch | Description |
|--------|-------------|
| **Transcript** | Full text, search, edit segments, copy, export SRT/VTT. **Translate** button: show transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian (cached per language). |
| **Speakers** | Paragraphs grouped by speaker (when structure allows). |
| **Summary** | AI summary, bullets, action items. |
| **Chapters** | Section headings with timestamps. |
| **Highlights** | Definitions, conclusions, quotes, important statements. |
| **Keywords** | Repeated terms linking to sections. |
| **Clean** | Filler words removed, casing normalized; original always in Transcript. |
| **Exports** | Download as TXT, JSON, CSV, Markdown, Notion (paid for full export). |

### Video → Subtitles: notable capabilities

- **Formats**: generates **SRT** or **VTT**; also includes a “Convert format” utility (SRT/VTT/TXT) that re-uploads the output to the `convert-subtitles` backend tool.
- **Multi-language**: when additional languages are selected, the worker generates multiple subtitle files and returns a **ZIP**.
- **Validation (informational)**: the worker runs derived subtitle validation and returns `warnings` (not blocking).
- **In-app translation viewer**: “View in another language” uses `POST /api/translate-transcript` to translate the **plain subtitle cue text** for reading/copy. It **does not** rewrite timestamps or generate a translated SRT/VTT file. For translated subtitle files use **Translate Subtitles** or **Multi-language** output.

### Backend tool types (must match exactly)

Used in upload and worker: `video-to-transcript`, `video-to-subtitles`, `translate-subtitles`, `fix-subtitles`, `burn-subtitles`, `compress-video`, `convert-subtitles`.

Internal (worker-only) tool type: `batch-video-to-subtitles` (queued by `/api/batch/upload`).

### Tool architecture map (frontend → API → queue → worker → download)

All tools share the same backbone:

- **Client uploads** to the API (`/api/upload`, `/api/upload/dual`, or `/api/batch/upload`).
- API enqueues a Bull job (Redis).
- **Worker** (`server/src/workers/videoProcessor.ts`) runs the tool pipeline and writes outputs into `TEMP_FILE_PATH` (or `/tmp`).
- Client polls `GET /api/job/:jobId` and downloads via `GET /api/download/:filename`.

| Tool | Frontend entry | API entry | Worker `toolType` | Key services | Output (download) |
|------|----------------|----------|-------------------|-------------|-------------------|
| **Video → Transcript** | `client/src/pages/VideoToTranscript.tsx` | `POST /api/upload` (file) or `POST /api/upload` with `url` | `video-to-transcript` | `services/transcription.ts` (Whisper; parallel chunking), optional `services/diarization.ts`, `services/transcriptSummary.ts`, `services/transcriptExport.ts` | `.txt` (or `.zip` when exporting JSON/DOCX/PDF); job status includes `segments`, `summary`, `chapters` |
| **Transcript translation (viewer)** | `client/src/pages/VideoToTranscript.tsx` | `POST /api/translate-transcript` | (no queue; direct route) | `services/translation.ts` (`translateTranscriptText`) | `{ translatedText }` (cached in client per language) |
| **Video → Subtitles** | `client/src/pages/VideoToSubtitles.tsx` | `POST /api/upload` (file) or with `url` | `video-to-subtitles` | `services/transcription.ts` (Whisper → SRT/VTT), `services/multiLanguage.ts` for ZIP, derived `services/subtitles.ts` validation | `.srt` / `.vtt` or `.zip` (multi-language) |
| **Subtitles translation (viewer)** | `client/src/pages/VideoToSubtitles.tsx` | `POST /api/translate-transcript` | (no queue; direct route) | `services/translation.ts` (`translateTranscriptText`) | `{ translatedText }` (plain text only; timestamps unchanged) |
| **Translate Subtitles** | `client/src/pages/TranslateSubtitles.tsx` | `POST /api/upload` | `translate-subtitles` | `services/translation.ts` (`translateSubtitleFile`) + derived `detectLanguageConsistency` | translated `.srt` / `.vtt` |
| **Fix Subtitles** | `client/src/pages/FixSubtitles.tsx` | `POST /api/upload` | `fix-subtitles` | `services/subtitles.ts` (`fixSubtitleFile`, derived `validateSubtitleFile`) | `_fixed.srt` / `_fixed.vtt` + `issues`/`warnings` |
| **Convert Subtitles** | `client/src/pages/VideoToSubtitles.tsx` (Convert format card) | `POST /api/upload` | `convert-subtitles` | `services/subtitleConverter.ts` (`convertSubtitleFile`) | `_converted.srt` / `_converted.vtt` / `_converted.txt` |
| **Burn Subtitles** | `client/src/pages/BurnSubtitles.tsx` | `POST /api/upload/dual` (video + subtitles) | `burn-subtitles` | `services/ffmpeg.ts` (`burnSubtitles`; optional GPU) | `_subtitled.mp4` |
| **Compress Video** | `client/src/pages/CompressVideo.tsx` | `POST /api/upload` | `compress-video` | `services/ffmpeg.ts` (`compressVideo`; optional GPU) | `_compressed.mp4` |
| **Batch Processing** | `client/src/pages/BatchProcess.tsx` | `POST /api/batch/upload`, `GET /api/batch/:batchId/status` | `batch-video-to-subtitles` | worker per-video subtitles + `generateBatchZip()` | batch zip `batch-<id>.zip` (SRT + derived VTT; includes `error_log.txt` on failures) |

### SEO entry points (same tools, alternate URLs)

No duplicate logic; these routes render the same tool component with different meta/FAQ:

- `/video-to-text`, `/mp4-to-text`, `/mp4-to-srt`, `/subtitle-generator`, `/srt-translator`, `/meeting-transcript`, `/speaker-diarization`, `/video-summary-generator`, `/video-chapters-generator`, `/keyword-indexed-transcript`
- `/srt-to-vtt`, `/subtitle-converter`, `/subtitle-timing-fixer`, `/subtitle-validation`, `/subtitle-translator`, `/multilingual-subtitles`, `/subtitle-language-checker`, `/subtitle-grammar-fixer`, `/subtitle-line-break-fixer`
- `/hardcoded-captions`, `/video-with-subtitles`, `/video-compressor`, `/reduce-video-size`, `/batch-video-processing`, `/bulk-subtitle-export`, `/bulk-transcript-export`

### App pages: Privacy, FAQ, Terms

- **`/privacy`** — Privacy Policy. Prominently states that we do not store user data; files are processed and deleted.
- **`/faq`** — App-wide FAQ: privacy and data, billing, tools, transcript translation. Includes a “We don’t store your data” trust line.
- **`/terms`** — Terms of Service; references Privacy for data handling.

---

## 2. Prerequisites & setup

- **Node.js** v18+
- **Docker Desktop** (for Redis), or install Redis locally
- **FFmpeg** (used by worker for video/subtitle processing)

### Install and run

```bash
# Client
cd client && npm install && npm run dev

# Server (separate terminal)
cd server && npm install && npm run dev
```

- Client: `http://localhost:3000`
- Server: `http://localhost:3001`

### Redis

Start Redis so the job queue works:

- **Docker:** from project root run `docker compose up -d` (Redis + optional API/worker).
- **Local:** e.g. `brew install redis && brew services start redis` (macOS), or install Redis on Windows/Linux and ensure it listens on `localhost:6379`.

See [§7 Redis](#7-redis) for URL and migration options.

---

## 3. Environment variables

### Client (Vite)

In `client/.env` or Vercel env:

| Variable | Required | Example | Notes |
|----------|----------|---------|--------|
| `VITE_API_URL` | Yes (production) | `https://api.videotext.io` | **Origin only**; do not include `/api`. |
| `VITE_SITE_URL` | No | `https://www.videotext.io` | Canonical/OG/sitemap base. |

### Server

In `server/.env` (or Docker env). Use `server/.env.example` as template.

| Area | Variables |
|------|-----------|
| **API** | `PORT` (default 3001), `NODE_ENV`, `CORS_ORIGINS` (comma-separated) |
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `STRIPE_PRICE_OVERAGE`; optional `STRIPE_PRICE_*_ANNUAL`. For promo codes: `STRIPE_PROMO_EARLY30`, `STRIPE_PROMO_EARLY50`, `STRIPE_PROMO_EARLY70`, `STRIPE_PROMO_EARLY100` (Stripe promotion code IDs). See [§5 Promo codes](#promo-codes-early-testers) to create them. |
| **Redirects** | `BASE_URL` (frontend URL for Stripe success/cancel) |
| **Redis** | `REDIS_URL` (e.g. `redis://redis:6379` or Upstash `rediss://...`) |
| **Processing** | `TEMP_FILE_PATH` (default `/tmp`), `DISABLE_WORKER` (set on API-only container if worker runs elsewhere) |
| **Transcription / translation** | `OPENAI_API_KEY` |
| **Auth** | `JWT_SECRET` |
| **Performance (optional)** | `FFMPEG_USE_GPU` = `true` to use GPU decode/encode (e.g. CUDA/NVENC) when available. `FFMPEG_THREADS` (default `4`) for CPU encode. |
| **Caching (optional)** | `CACHE_TTL_DAYS` = number of days to cache results for repeat processing (same user + same file + same tool + same options). Default `7`. Set to `0` to disable. |

**Performance behaviour (no config required):**

- **Parallel transcription:** Videos ≥ 2.5 minutes are split into ~3‑minute chunks; chunks are transcribed in parallel via Whisper, then merged. Same API and result shape; faster wall‑clock for long files.
- **Parallel pipeline:** Summary and chapters run in parallel after transcript; multi‑language subtitle translations run in parallel. Worker logic unchanged.
- **Caching:** For video-to-transcript and video-to-subtitles, if the same user re-processes the same file with the same options (including trim, language, format) within the TTL, the job returns the cached result immediately (no re-run). Cache key includes file hash, tool type, and options. Set `CACHE_TTL_DAYS=0` to disable.

---

## 4. API contract (upload)

- **Single-file:** `POST /api/upload` — `multipart/form-data`, field **`file`**, **`toolType`** (required). Optional: `url` (video-to-transcript/subtitles), `format`, `language`, `targetLanguage`, `compressionLevel`, `trimmedStart`, `trimmedEnd`, `additionalLanguages` (JSON string), etc.
- **Dual-file (burn):** `POST /api/upload/dual` — fields **`video`**, **`subtitles`**, **`toolType`** = `burn-subtitles`.
- **Chunked upload:** `POST /api/upload/chunk` (binary); metadata includes `toolType`, `filename`, `totalChunks`. The client uses smaller chunks and sequential upload on mobile for reliability; state is resumable on retry.
- **Batch upload:** `POST /api/batch/upload` — `multipart/form-data`, field **`files`** (array), optional `primaryLanguage` and `additionalLanguages`. Status: `GET /api/batch/:batchId/status`.

Valid `toolType` values: `video-to-transcript`, `video-to-subtitles`, `translate-subtitles`, `fix-subtitles`, `burn-subtitles`, `compress-video`, `convert-subtitles`. Client uses `BACKEND_TOOL_TYPES` in `client/src/lib/api.ts`; do not invent other names.

**Translate transcript (in-app):** `POST /api/translate-transcript` — JSON body `{ "text": "...", "targetLanguage": "English" | "Hindi" | "Telugu" | "Spanish" | "Chinese" | "Russian" }`, returns `{ "translatedText": "..." }`.

---

## 5. Billing & usage

- **Plans:** free, basic, pro, agency. Stored in user model; set by Stripe webhooks (checkout, invoice, subscription deleted) or by headers `x-user-id` / `x-plan` when no JWT.
- **Plan limits (reference)** — see `server/src/utils/limits.ts` for the source of truth:

| Plan   | Minutes/month | Max video duration | Max file size |
|--------|----------------|--------------------|---------------|
| Free   | 60             | 15 min             | 2 GB          |
| Basic  | 450            | 45 min             | 5 GB          |
| Pro    | 1200           | 120 min (2 h)      | 10 GB         |
| Agency | 3000           | 240 min (4 h)      | 20 GB         |

- **Other limits:** max subtitle languages (Basic: 2, Pro: 5, Agency: 10), batch enabled (Pro/Agency), batch max videos and max duration, translation minutes cap (Pro/Agency). All in `server/src/utils/limits.ts`.
- **Usage:** Recorded in the **worker** when a job **completes** (totalMinutes, translatedMinutes for multi-language, etc.). Batch jobs charge minutes per video. Reset on invoice period (paid) or calendar month (free). Overage allowed only for users with `stripeCustomerId`.
- **Client:** Sends `x-user-id` and `x-plan`; after checkout, client stores `userId` and `plan`. Minutes remaining is shown on every tool (UsageCounter + UsageDisplay) and refetches when a job completes.
- **Server-side enforcement:** Upload and batch routes call `enforceUsageLimits()` before queueing; paid plans are only trusted from auth or from an existing Stripe-backed user (no plan spoofing via headers). See `server/src/utils/limits.ts` and the upload/batch/usage routes.

### Promo codes (early testers)

You can offer **30%, 50%, 70%, or 100% off** the first payment for **Basic** and **Pro** to attract early testers, testimonials, and feedback.

1. **Create coupons and promotion codes in Stripe** (one-time):
   ```bash
   # From repo root:
   node server/scripts/create-promo-codes.js
   # Or from server directory:
   cd server && node scripts/create-promo-codes.js
   ```
   This creates four coupons (30/50/70/100% off, first invoice only) and four promotion codes: **EARLY30**, **EARLY50**, **EARLY70**, **EARLY100**. The script prints env vars like `STRIPE_PROMO_EARLY30=promo_xxx`.

2. **Add the printed env vars** to `server/.env`.

3. **On the Pricing page**, users can enter a promo code (e.g. EARLY30) before clicking “Choose Basic” or “Choose Pro”. The code is applied at Stripe Checkout; the discount is shown on the Stripe payment page. Stripe Checkout also has “Add promotion code” so users can enter a code there if they didn’t on your site.

Promo codes apply only to Basic and Pro (not Agency or one-time overage). Invalid or unconfigured codes return a clear error.

### Remaining improvements for full robustness

- **Persisting usage:** The current user and usage store is **in-memory** (`server/src/models/User.ts`). On server restart, all usage data is lost and limits effectively reset. For production at scale, persist users and usage (e.g. PostgreSQL, or Redis with a durable schema) so that minute counts and plan state survive restarts and are consistent across multiple API/worker instances.
- **Hardening identity:** Anonymous users are identified only by the `x-user-id` header (default `demo-user`). Anyone can send a new `x-user-id` and receive a fresh free-tier bucket. To reduce abuse, consider: **rate- or cap-by-IP** (e.g. max minutes or uploads per IP per day), **device fingerprinting**, or **requiring sign-in** (e.g. email or OAuth) for any usage beyond a very small demo allowance.

---

## 6. Stripe (go live)

1. **Products & prices** in Dashboard: Basic/Pro/Agency (monthly; optional annual). One-time overage price. Copy Price IDs into env.
2. **API keys:** Use **Secret key** (test or live) in `STRIPE_SECRET_KEY`.
3. **Webhook:** Add endpoint `https://YOUR_API_DOMAIN/api/stripe/webhook`; events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`. Set **Signing secret** in `STRIPE_WEBHOOK_SECRET`.
4. **Success/cancel:** Use `BASE_URL` or client `frontendOrigin` so redirects go to your frontend.
5. **Customer portal:** Configure in Stripe (Settings → Billing → Customer portal) so “Manage subscription” works.

---

## 7. Redis

Used for the **Bull job queue** only (not auth or Stripe). Switch by changing `REDIS_URL` and restarting API and worker.

- **Self-hosted (Docker):** `docker-compose.yml` includes Redis; `REDIS_URL=redis://redis:6379`.
- **Self-hosted (host):** Install Redis, set `REDIS_URL=redis://localhost:6379` (or host IP for containers).
- **Upstash:** Set `REDIS_URL=rediss://...` from Upstash console. If using Docker Compose, remove `REDIS_URL` from compose `environment` so `.env` is used.

Changing Redis invalidates existing job IDs (queue state is not migrated).

---

## 8. Deployment (Hetzner + Caddy)

### Backend on Hetzner (single VM)

1. **Docker:** Install Docker and Compose on Ubuntu 22.04 (see Docker docs).
2. **Project & env:** Copy repo and create `.env` from `.env.example` (Redis, Stripe, `OPENAI_API_KEY`, `JWT_SECRET`, `BASE_URL`, etc.).
3. **Start:** From project root: `docker compose up --build -d`. API on port 3001; Redis and worker run in the same stack.
4. **Restart:** `docker compose up -d --build api worker`.

### Caddy (HTTPS for API)

1. DNS: point `api.yourdomain.com` to the server.
2. Install Caddy, then use a Caddyfile:
   ```text
   api.videotext.io {
       reverse_proxy localhost:3001
   }
   ```
   If the API is mapped to 3002 on the host, use `reverse_proxy localhost:3002`.
3. Restart Caddy. Test: `curl -sS https://api.videotext.io/health` → `{"status":"ok"}`.

### Frontend (Vercel)

- Set **Root directory** to `client`, build command `npm run build`, output `dist`.
- Set **VITE_API_URL** to your API origin (e.g. `https://api.videotext.io`) — **no** `/api` suffix.

**Mixed content:** If the site is HTTPS, `VITE_API_URL` must be HTTPS (e.g. `https://api.videotext.io`). Do not use `http://IP:port` in production.

---

## 9. SEO & production URLs

- **Per-route meta:** Each route has `<title>` and `<meta name="description">` via `react-helmet-async` and `client/src/lib/seoMeta.ts`.
- **Canonical & sitemap:** Set `VITE_SITE_URL` for canonicals and OG. Update `client/public/sitemap.xml` and `robots.txt` if the domain changes.
- **Structured data:** Homepage includes JSON-LD (Organization, WebApplication). Add `client/public/og-image.png` (e.g. 1200×630) for social sharing.

---

## 10. Client: performance, devices & reliability

The frontend is built for **fast first load**, **reliable behaviour on slow or flaky networks**, and **good experience across devices and browsers**.

### Performance & revisits

- **Code splitting:** Every page (Home, tools, SEO routes) is lazy-loaded with `React.lazy()`; only the current route’s JS is loaded on first visit. Vendor chunks (React, router, UI libs) are split for better caching.
- **Prefetch:** Navigation and UserMenu links prefetch the corresponding route chunk on hover/focus so navigation feels instant when the user clicks.
- **PWA:** `vite-plugin-pwa` generates a service worker that precaches static assets (JS, CSS, HTML, images). Repeat visits and brief offline periods can serve the app shell from cache. **API is never cached** so usage, billing, and job state stay correct.

### Upload & transcript/subtitles UX

(Video → Transcript and Video → Subtitles only; frontend-only, no API changes.)

- **Multi-stage progress:** UI shows **Preparing** (only when browser audio preprocessing runs) → **Uploading** (existing progress %) → **Processing** (job progress and queue position) → **Completed** or **Error**. Implemented via `UploadStageIndicator`; state is derived from existing `uploadPhase` and `status`.
- **Instant file preview:** As soon as the user selects a file, the app shows filename, size, duration, and a video thumbnail (or placeholder for audio) using browser APIs only (`getFilePreview` in `client/src/lib/filePreview.ts`). Preview persists through upload and processing.
- **Cancel + replace:** A **Cancel** button aborts the active upload (AbortController) or, if the job is already created, clears the persisted job and returns to idle so the user can start a new file immediately. Cancellation never blocks the flow; there is no server job-cancel API.
- **Smarter retry:** Chunk uploads and single-file (XHR) uploads use automatic retry with exponential backoff (2–3 attempts). Chunked uploads resume from the last successful chunk (existing sessionStorage state). On final failure, the same “Try again” / FailedState flow is used.
- **Network-aware messaging:** When the connection probe indicates a slow link, the app shows “Slow connection detected — optimizing upload” during the upload phase (informational only; flow is not blocked).

Details, state machine, and regression notes: `docs/UX_UPLOAD_IMPROVEMENTS.md`.

### Mobile & large uploads

- **Retest (15 min video, 155 MB):** Laptop 2 min 16 s (upload + processing); mobile 1 min 26 s. Mobile can be faster due to different chunk strategy (2 MB sequential, no probe) and network conditions.
- **Chunked upload:** Files over 15 MB use resumable chunked upload. **Desktop:** Before starting, the client probes connection speed (GET /health, < 2.5 s). **Fast** (< 400 ms) → 10 MB chunks, 4 in parallel; **medium** (< 1.2 s) → 5 MB, 2 parallel; **slow** or probe failure → 2 MB, 1 parallel. So good connections get maximum speed, weak ones get reliability without timeouts. **Mobile** (or narrow viewport / touch): always 2 MB, sequential, 90 s timeout. Resuming reuses existing chunk size; no re-probe. Chunk size and progress are stored so a retry continues from the last successful chunk.
- **Visibility:** While the upload phase is active (Video → Transcript, Video → Subtitles), if the user switches tabs the app shows a toast: “Keep this tab open until the upload finishes.” (FAQ also explains Wi‑Fi and keeping the tab open on mobile.)

### Reliability & errors

- **API timeouts:** GET requests for job status, usage, and billing session use a 25 s timeout so slow networks fail fast and polling can retry instead of hanging.
- **Network errors:** When an upload or request fails due to network/abort (e.g. timeout, offline), the user sees “Check your connection and try again.” via `getUserFacingMessage()` in `client/src/lib/api.ts`.
- **Offline banner:** When the app goes offline (`navigator.onLine` false), a sticky banner appears: “You’re offline. Uploads and processing will work when your connection is back.”
- **Error boundary:** `SessionErrorBoundary` catches render errors and shows a friendly “session expired” style message with a link to home; errors are logged (and can be wired to Sentry later).
- **Unhandled rejections:** A global `unhandledrejection` handler shows a generic “Something went wrong” toast so uncaught promise rejections don’t leave the user with no feedback.

### Cross-browser baseline

- **Build:** Vite `build.target` is `es2020`. `package.json` includes a `browserslist` (last 2 Chrome, Firefox, Safari, Edge) so tooling and future legacy builds have a clear baseline. No polyfills or legacy bundle by default; the app targets modern browsers.

A more detailed comparison with industry norms and optional next steps (tests, Sentry, a11y) is in `docs/FRONTEND_BENCHMARK.md`.

---

## 11. Project structure

```text
├── client/                 # React + Vite; PWA (vite-plugin-pwa)
│   ├── src/
│   │   ├── components/     # UI (Navigation, FileUploadZone, FilePreviewCard, UploadStageIndicator,
│   │   │                   #      SuccessState, OfflineBanner, SessionErrorBoundary, …)
│   │   ├── lib/            # api, apiBase, billing, filePreview, jobPolling, prefetch, seoMeta, theme, usage, …
│   │   ├── pages/          # Home, VideoToTranscript, VideoToSubtitles, BatchProcess, … (lazy-loaded)
│   │   └── pages/seo/      # SEO entry-point wrappers (same tools, different meta)
│   ├── public/
│   └── index.html
├── server/
│   ├── src/
│   │   ├── routes/         # upload, jobs, download, usage, batch, billing, auth, stripeWebhook, translateTranscript
│   │   ├── services/      # transcription, translation, subtitles, ffmpeg, stripe, …
│   │   ├── workers/       # videoProcessor (Bull)
│   │   ├── models/        # User, Job, UsageLog, …
│   │   └── utils/         # auth, limits, metering, srtParser, redis, …
│   └── package.json
├── docs/                   # UX_UPLOAD_IMPROVEMENTS.md (upload UX, state machine, regression notes),
│                          # PERFORMANCE_AUDIT_UPLOAD_PIPELINE.md (bottlenecks, optional optimisations),
│                          # BENCHMARKS.md (how to run benchmarks for advertising),
│                          # FRONTEND_BENCHMARK.md (client vs industry), …
├── deploy/
│   ├── Caddyfile           # Reverse proxy for API
│   └── (no separate README; see §8 above)
├── docker-compose.yml      # Redis, api, worker
├── Dockerfile
└── README.md               # This file
```

---

## Quick reference

| Task | Command / action |
|------|-------------------|
| Run client | `cd client && npm run dev` |
| Run server | `cd server && npm run dev` |
| Redis (Docker) | `docker compose up -d` |
| Deploy backend | `docker compose up --build -d` |
| Restart API + worker | `docker compose up -d --build api worker` |
| Job status | `GET /api/job/:jobId` |
| Health | `GET /health` → `{"status":"ok"}` |

All product behavior, trees, branches, and features are described in [§1 Features & tools](#1-features--tools-trees-and-branches). Client performance and device/reliability details are in [§10 Client: performance, devices & reliability](#10-client-performance-devices--reliability). Latest upload UX improvements (multi-stage progress, preview, cancel, retry, network-aware messaging) are in [§10 Upload & transcript/subtitles UX](#upload--transcriptsubtitles-ux) and `docs/UX_UPLOAD_IMPROVEMENTS.md`. Pipeline architecture and performance audit are in `docs/PERFORMANCE_AUDIT_UPLOAD_PIPELINE.md`. For env details use `server/.env.example` and the tables in [§3 Environment variables](#3-environment-variables).
