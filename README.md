# VideoText

Professional video utilities platform: transcribe video to text, generate and translate subtitles, fix timing, burn captions, compress video, and batch process. React + Vite frontend, Express backend, Bull queue, Stripe billing.

**We don’t store your data.** User uploads and generated outputs are processed and then deleted; we don’t keep copies. This is a core product commitment and is highlighted in the app (Privacy, FAQ, Pricing, and Home).

### Recent updates (high level)

- **Authentication (paid plans):** Email + OTP verification before checkout; **Login** (`/login`) and **Log out** in the user menu. After purchase, users can log out and log in again with email + password (set via "Set password" flow). JWT and `Authorization: Bearer` for API; usage and plan restored from Stripe when `x-user-id` is a Stripe customer ID (e.g. after API restart). See [§5.1 Authentication (OTP, login, logout)](#51-authentication-otp-login-logout).
- **Post-checkout flow:** Session-details creates user from Stripe session if missing; client stores email and plan; UserMenu shows account email and plan. Stripe restore: if the API has no in-memory user for `cus_*`, it fetches plan/email from Stripe and recreates the user so "Pro still Free" after restart is fixed.
- **Vercel & SPA:** Root `vercel.json` has rewrites so all routes serve `index.html` (no 404 on `/pricing`, `/login`, etc.). Set Vercel **Root Directory** to **empty** (not `client`) so the root config applies; use Root Directory = `client` only if you duplicate rewrites in `client/vercel.json`.
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
- **Programmatic SEO:** Single source of truth (`client/src/lib/seoRegistry.ts`) for 27+ SEO pages; registry-driven meta, breadcrumbs, related links (4–6 per page), FAQ, and sitemap. Optional weekly automation (keyword discovery → proposals → PR). **Production:** `JWT_SECRET` must be set in production; server refuses to start otherwise. See [§9 SEO](#9-seo--production-urls).
- **Observability:** Release ID + request ID (`x-request-id`), structured JSON logs (pino), Sentry (API + worker + client), health/ops endpoints (`/healthz`, `/readyz`, `/version`, `/configz`, `/ops/queue`). One place to trace a request from UI → API → worker. See [§14 Observability](#14-observability-logging-sentry-health) and **docs/OBSERVABILITY.md**.

---

## Table of contents

1. [Features & tools (trees and branches)](#1-features--tools-trees-and-branches)
2. [Prerequisites & setup](#2-prerequisites--setup)
3. [Environment variables](#3-environment-variables)
4. [API contract (upload)](#4-api-contract-upload)
5. [Billing & usage](#5-billing--usage)
   - [5.1 Authentication (OTP, login, logout)](#51-authentication-otp-login-logout)
6. [Stripe (go live)](#6-stripe-go-live)
7. [Redis](#7-redis)
8. [Deployment (Hetzner + Caddy + Vercel)](#8-deployment-hetzner--caddy--vercel)
9. [SEO & production URLs](#9-seo--production-urls)
10. [Client: performance, devices & reliability](#10-client-performance-devices--reliability)
11. [Performance benchmark (end-to-end)](#11-performance-benchmark-end-to-end)
12. [Project structure](#12-project-structure)
13. [Troubleshooting](#13-troubleshooting)
14. [Observability (logging, Sentry, health)](#14-observability-logging-sentry-health)

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

- **Docker:** from project root run `docker compose up -d` (Redis, Postgres, API, worker). The API runs Prisma migrations on startup.
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
| **Database** | `DATABASE_URL` (PostgreSQL connection string, e.g. `postgresql://videotools:videotools@postgres:5432/videotext` for Docker). Required for user/auth storage. With Docker, the API runs `prisma migrate deploy` on startup so tables are created/updated automatically. |
| **Processing** | `TEMP_FILE_PATH` (default `/tmp`), `DISABLE_WORKER` (set on API-only container if worker runs elsewhere) |
| **Transcription / translation** | `OPENAI_API_KEY` |
| **Auth** | **`JWT_SECRET`** — required for login and OTP JWT. **In production** the server will not start unless `JWT_SECRET` is set to a strong random value (not empty, not `dev-secret`). Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and add to the `.env` used by the API. For paid signup OTP: `RESEND_API_KEY` (sends verification code via [Resend](https://resend.com); if unset, code is logged to API console). `RESEND_FROM_EMAIL` (e.g. `VideoText <noreply@yourdomain.com>`) must use a **verified domain** in Resend. For **Docker**, put these in the `.env` file in the **same directory as `docker-compose.yml`** (e.g. project root or `/opt/videotools/.env`), not only in `server/.env`; the api/worker containers use `env_file: .env` from the compose file location. |
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

### 5.1 Authentication (OTP, login, logout)

Paid plans require email verification before checkout; after purchase users can log out and log in again with email + password.

- **Subscribe flow (Pricing):** User enters email → **Send code** → `POST /api/auth/send-otp` (sends 6-digit OTP via Resend, or logs code if `RESEND_API_KEY` is unset). User enters code → **Verify and continue** → `POST /api/auth/verify-otp` returns short-lived `emailVerificationToken`. Checkout is created with that token and email; backend uses verified email for Stripe and the created account.
- **Post-checkout:** Client calls session-details; if no user exists for the Stripe customer, the API creates one from the session (email, plan, subscriptionId) and returns `email`. Client stores `userId`, `plan`, `userEmail`; UserMenu shows account email and plan.
- **Stripe restore:** User/usage is in-memory. After an API restart, if the client sends `x-user-id: cus_XXXX` (Stripe customer ID), the usage route calls `getPlanAndEmailForStripeCustomer(cus_XXXX)` and recreates the user with plan/email from Stripe so the UI shows the correct plan.
- **Login:** `POST /api/auth/login` with `{ email, password }` returns `{ token, userId, plan, email }`. Client stores token in localStorage (`authToken`) and sends `Authorization: Bearer <token>` on API requests. `GET /api/usage/current` uses JWT when present to resolve user and plan.
- **Logout:** User menu has **Log out** when logged in (or when `userId` is set and not `demo-user`). Log out clears `authToken`, `userId`, `plan`, `userEmail` and reloads so the app shows free/guest state.
- **Log in link:** When not logged in, the user menu shows **Log in** → `/login`. Login page: email + password; on success stores token and navigates home.
- **Set password:** Paid users can set a password so they can log in later. `POST /api/auth/setup-password` with `{ token, password }` (token is the one-time `passwordSetupToken` set by the webhook for new paid users). A "Set password" email/link flow can send that token (e.g. welcome email with link to `/set-password?token=...`); the client does not yet have a dedicated set-password page.

**Env:** `JWT_SECRET` (required for login/OTP tokens), `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (OTP emails; see [§3 Environment variables](#3-environment-variables)). For Docker, these must be in the `.env` file **next to `docker-compose.yml`**, not only in `server/.env` (see [§8 Deployment](#8-deployment-hetzner--caddy--vercel) and [§13 Troubleshooting](#13-troubleshooting)).

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

2. **Add the printed env vars** to `server/.env` (local dev) and to the `.env` next to `docker-compose.yml` if you run API/worker in Docker.

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

### Database (PostgreSQL)

Used for **user and usage persistence** (Prisma). The API uses the `@prisma/adapter-pg` driver; migrations are in `server/prisma/migrations` and run automatically when the API container starts.

- **Inspect from the server:** `docker exec -it videotools-postgres psql -U videotools -d videotext` (then e.g. `\dt` to list tables, `SELECT * FROM "User";` to list users, `\q` to quit).
- **Prisma Studio (web UI):** From the server with DB access: `docker exec -it videotools-api npx prisma studio` (bind to `0.0.0.0:5555` if you need to open it from your machine; or run `npx prisma studio` locally with `DATABASE_URL` in `server/.env` pointing at the DB). Open http://localhost:5555 in a browser.

Postgres is not exposed on the host by default; add `ports: ["5432:5432"]` to the postgres service in `docker-compose.yml` if you want to connect with a GUI (DBeaver, pgAdmin, etc.) from your machine.

---

## 8. Deployment (Hetzner + Caddy + Vercel)

### Backend on Hetzner (single VM)

1. **Docker:** Install Docker and Compose on Ubuntu 22.04 (see Docker docs).
2. **Project & env:** Copy repo. Create a **`.env` file in the same directory as `docker-compose.yml`** (e.g. project root or `/opt/videotools/`) with Redis, Stripe, `DATABASE_URL` (e.g. `postgresql://videotools:videotools@postgres:5432/videotext`), `OPENAI_API_KEY`, `JWT_SECRET`, `BASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, etc. The api and worker containers use `env_file: .env` from that directory; `server/.env` is **not** read by Docker.
3. **Start:** From that directory: `docker compose up --build -d`. API on port 3001; Redis, Postgres, and worker run in the same stack. The API runs **Prisma migrations on startup** (`prisma migrate deploy` then `node dist/index.js`), so the DB schema is applied automatically.
4. **Restart:** `docker compose up -d --build api worker`. To view OTP and auth logs: `docker logs -f videotools-api` (not the worker).

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

- **Root Directory:** Prefer **empty** (repo root) so the **root `vercel.json`** is used. That file defines `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]` so SPA routes like `/pricing`, `/login`, `/video-to-transcript` return `index.html` instead of 404. If you set Root Directory to `client`, the root `vercel.json` is ignored and you may get 404s on direct links or refresh; in that case add the same rewrites in `client/vercel.json` or deploy from root with build/output pointing to `client`.
- **Build:** Root directory = repo root: set **Build command** to `cd client && npm run build`, **Output directory** to `client/dist`. Or Root directory = `client`: build `npm run build`, output `dist`.
- Set **VITE_API_URL** to your API origin (e.g. `https://api.videotext.io`) — **no** `/api` suffix.

**Mixed content:** If the site is HTTPS, `VITE_API_URL` must be HTTPS (e.g. `https://api.videotext.io`). Do not use `http://IP:port` in production.

---

## 9. SEO & production URLs

VideoText uses a **programmatic SEO** system: one registry defines all SEO pages; the app and automation derive meta, routes, sitemap, and internal linking from it. No duplicate logic; no hardcoded SEO paths in routing.

### 9.1 What we have

- **Single source of truth:** `client/src/lib/seoRegistry.ts` — each entry has `path`, `title`, `description`, `h1`, `intro`, `faq`, `breadcrumbLabel`, `toolKey`, `relatedSlugs`, `indexable`, and `intentKey`. All SEO pages share the same seven core tools; the registry only changes which URL and meta are shown.
- **27+ SEO entry points:** Alternate URLs such as `/video-to-text`, `/mp4-to-srt`, `/subtitle-generator`, `/srt-translator`, `/meeting-transcript`, `/video-compressor`, etc. Each resolves to the correct tool (Video → Transcript, Video → Subtitles, etc.) with its own title, description, H1, intro, FAQ, and breadcrumb.
- **Registry-driven UI:** `<title>`, `<meta name="description">`, canonical, and Open Graph come from the registry (or from static route meta in `seoMeta.ts`). Breadcrumb nav and **BreadcrumbList** JSON-LD use the registry. **FAQPage** JSON-LD is emitted when the registry entry has FAQs. A “Related tools” block (4–6 links) is built from `relatedSlugs` and same-toolKey entries so every SEO page gets a consistent internal link mesh.
- **One template, all paths:** `client/src/pages/SeoToolPage.tsx` — looks up the current path in the registry, renders the right tool with that entry’s `h1`, `intro`, and `faq`, and shows related links. Routing in `App.tsx` is generated from `getAllSeoPaths()`; no hand-written routes for SEO URLs.
- **Sitemap & robots:** `client/public/sitemap.xml` lists all indexable URLs (static + registry). `client/public/robots.txt` points to the sitemap. Sitemap can be regenerated with `npm run seo:sitemap` (see [§9.3 Automation](#93-seo-automation-optional)).
- **Production URLs:** Set `VITE_SITE_URL` (e.g. `https://www.videotext.io`) so canonicals and OG tags use your real domain. The registry and app do not hardcode the domain.

### 9.2 SEO structure (where things live)

| Piece | Location | Purpose |
|-------|----------|--------|
| **Registry** | `client/src/lib/seoRegistry.ts` | Single source: path, title, description, h1, intro, faq, breadcrumbLabel, toolKey, relatedSlugs, indexable, intentKey. |
| **Meta & breadcrumbs** | `client/src/lib/seoMeta.ts` | Builds `ROUTE_SEO` and `ROUTE_BREADCRUMB` from registry + static routes; provides JSON-LD helpers (Organization, WebApplication, FAQPage, BreadcrumbList). |
| **SEO template** | `client/src/pages/SeoToolPage.tsx` | Renders the tool for the current path using registry; shows related links (4–6) from `getRelatedSuggestionsForEntry()`. |
| **Breadcrumb UI** | `client/src/components/Breadcrumb.tsx` | Renders breadcrumb nav when `ROUTE_BREADCRUMB[pathname]` exists. |
| **Footer popular links** | `client/src/components/Footer.tsx` | Uses `getPopularFooterLinks()` from the registry so “Popular tools” (including e.g. Subtitle generator) stay in sync with the registry. |
| **Sitemap** | `client/public/sitemap.xml` | Static file; can be regenerated by `scripts/seo/generate-sitemap.ts`. |
| **Robots** | `client/public/robots.txt` | Allows all; Sitemap URL. |
| **Validation** | `scripts/seo/validate-registry.js`, `scripts/seo/validate-sitemap.ts` | Check duplicate paths/intentKeys, relatedSlugs targets, and that sitemap matches indexable inventory. |

### 9.3 SEO automation (optional)

A weekly pipeline can suggest new or updated SEO pages and open a PR:

- **Collectors** (free): Google suggest, YouTube suggest, Reddit. **Optional API:** SerpApi (`SERP_API_KEY`); Ahrefs/SEMrush are stubbed.
- **Decision engine:** Turns keyword candidates into `CREATE_NEW_PAGE`, `UPDATE_EXISTING_PAGE`, or `FAQ_ONLY` with caps (e.g. max new pages per run). Blocks duplicate `intentKey` to avoid cannibalization.
- **Apply step:** `npm run seo:apply-proposals` patches the registry from `scripts/seo/output/seo-proposals.json`; then `npm run seo:sync`, `seo:validate-registry`, `seo:sitemap`, `seo:validate-sitemap` keep routes and sitemap in sync.
- **CI:** `.github/workflows/seo-weekly.yml` runs weekly (and on demand); can open a PR with registry changes and updated sitemap. No API keys required for the pipeline to run (free sources only).

**Setup and keys:** SEO keys (optional) go in **repo root `.env`** for local runs (e.g. `SERP_API_KEY` for SerpApi); set `serp_api.enabled: true` in `scripts/seo/seo.config.json` to use SerpApi. For GitHub Actions, add secrets and pass them in the workflow. No GSC integration; use Google Search Console manually.

### 9.4 Commands (SEO)

| Command | Purpose |
|---------|--------|
| `npm run seo:sync` | Refresh `scripts/seo/routes-inventory.json` from registry (used by sitemap and automation). |
| `npm run seo:validate-registry` | Validate registry (paths, intentKey, relatedSlugs, indexable). |
| `npm run seo:sitemap` | Regenerate `client/public/sitemap.xml` from indexable routes. Set `SITE_URL` if needed. |
| `npm run seo:validate-sitemap` | Ensure sitemap matches indexable inventory. |
| `npm run seo:smoke` | Smoke-test 10 URLs (title, meta, canonical, BreadcrumbList, FAQPage). Run after build with `BASE_URL` pointing at the deployed or served client. |
| `npm run seo:weekly` | Run collectors + decision engine; write `scripts/seo/output/seo-proposals.json` and changelog (no keys required). |

### 9.5 Production env (SEO and auth)

- **Client:** `VITE_SITE_URL` (canonical/OG base), `VITE_API_URL` (API origin). See [§3 Environment variables](#3-environment-variables).
- **Server:** In **production**, `JWT_SECRET` **must** be set to a strong random value (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). The server will not start if `NODE_ENV=production` and `JWT_SECRET` is missing, empty, or `dev-secret`. Use the same `.env` next to `docker-compose.yml` as for Stripe, DB, and Redis.

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

## 11. Performance benchmark (end-to-end)

End-to-end time (upload + transcription) for a **15 min video / 155 MB**:

| Tool | Total time |
|------|------------|
| **VideoText (this app)** | **~35 sec** |
| Descript | 1 min 21 sec |
| Otter.ai | 1 min 25 sec |
| Trint | 4 min + |

VideoText is ~2.3× faster than the next-fastest and ~7× faster than Trint on this test. For methodology and how to run benchmarks for marketing, see `docs/BENCHMARKS.md`.

---

## 12. Project structure

```text
├── client/                 # React + Vite; PWA (vite-plugin-pwa)
│   ├── src/
│   │   ├── components/     # UI (Navigation, UserMenu with Log in/Log out, FileUploadZone, …)
│   │   ├── lib/            # api, auth, billing, filePreview, jobPolling, prefetch, seoMeta, seoRegistry (SEO single source of truth), …
│   │   ├── pages/          # Home, Pricing, Login, VideoToTranscript, SeoToolPage (registry-driven SEO), NotFound, … (lazy-loaded)
│   ├── public/
│   └── index.html
├── server/
│   ├── src/
│   │   ├── routes/         # upload, jobs, download, usage, batch, billing, auth (send-otp, verify-otp, login, setup-password), stripeWebhook, …
│   │   ├── services/      # transcription, translation, subtitles, ffmpeg, stripe, …
│   │   ├── workers/       # videoProcessor (Bull)
│   │   ├── models/        # User, Job, UsageLog, …
│   │   └── utils/         # auth (JWT, email-verification token), limits, metering, srtParser, redis, …
│   └── package.json
├── docs/                   # UX_UPLOAD_IMPROVEMENTS.md, PERFORMANCE_AUDIT_UPLOAD_PIPELINE.md, BENCHMARKS.md, …
├── scripts/seo/            # Registry sync, sitemap, validate-registry, validate-sitemap, smoke, weekly pipeline (run-weekly, apply-proposals), …
├── deploy/
│   └── Caddyfile           # Reverse proxy for API + CORS preflight (OPTIONS)
├── docker-compose.yml      # Redis, api, worker (env_file: .env from same directory)
├── Dockerfile
├── vercel.json             # SPA rewrites + index.html cache headers (used when Root Directory is repo root)
└── README.md               # This file
```

---

## 13. Troubleshooting

| Issue | Cause | Fix |
|-------|--------|-----|
| **404 on `/pricing`, `/login`, or other routes** | Vercel Root Directory set to `client` so root `vercel.json` is ignored; no SPA fallback. | Set Root Directory to **empty** (repo root) and use build command `cd client && npm run build`, output `client/dist`. Or keep Root = `client` and add the same `rewrites` and `headers` from root `vercel.json` into `client/vercel.json`. |
| **OTP emails not received / RESEND_API_KEY set: false in logs** | Docker Compose loads `.env` from the **directory containing `docker-compose.yml`**, not from `server/.env`. | Put `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `JWT_SECRET` in the `.env` file next to `docker-compose.yml` (e.g. project root or `/opt/videotools/.env`). Restart: `docker compose up -d api`. |
| **Where to see OTP codes when testing** | OTP is logged by the **API** process. | Run `docker logs -f videotools-api` (not the worker). Look for `[OTP] send-otp called for …` and either `Code for … : 123456` (no Resend) or `Sent to … via Resend`. |
| **Purchased Pro but UI still shows Free** | In-memory user was lost (e.g. API restart); client still sends old `x-user-id` or Stripe customer ID. | Ensure client sends the Stripe customer ID (e.g. from session-details after checkout). The usage route restores the user from Stripe when `x-user-id` starts with `cus_`. If the client was sending a different ID, reload after checkout or log in so the correct ID is used. |
| **PostHog ERR_BLOCKED_BY_CLIENT / 404s for assets** | Ad blockers or privacy tools block PostHog. | The client detects failed PostHog requests and calls `posthog.opt_out_capturing()`, so analytics is disabled and no further requests are sent. No code change required. |

---

## 14. Observability (logging, Sentry, health)

VideoText has a single **observability stack** for debugging across UI, API, and worker: **release ID**, **request ID** (`x-request-id`), **structured JSON logs** (pino), **Sentry** (errors + optional performance), and **health/ops endpoints**.

**Full guide:** **[docs/OBSERVABILITY.md](docs/OBSERVABILITY.md)** — where to view logs, how to use the Sentry dashboard, DSN setup (server + client), health endpoints, and how to trace one request from UI → API → worker using `request_id`.

**Short summary:**

- **Logs:** No in-repo dashboard. API and worker log JSON to stdout; view them in the terminal (local) or your host’s log viewer (Docker, Railway, Render, etc.).
- **Sentry:** Set **SENTRY_DSN** in `server/.env` (backend) and **VITE_SENTRY_DSN** in `client/.env` (frontend, then rebuild). Open [sentry.io](https://sentry.io) → your project → **Issues** to see errors; filter by **request_id** or **job_id** to follow a single request.
- **Health:** `GET /healthz`, `GET /readyz`, `GET /version`, `GET /configz`, `GET /ops/queue` on the API (see [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) for details).
- **Incident workflow:** Get `x-request-id` from the response → search in Sentry and logs → check `/ops/queue` for worker heartbeat.
| **CORS errors or 502 on API from frontend** | API not running (e.g. Prisma crash), or Caddy not using the updated Caddyfile. | Check API logs: `docker logs videotools-api --tail 100`. If you see "Table \`User\` does not exist", migrations didn’t run — ensure the API command in docker-compose runs `prisma migrate deploy` then `node dist/index.js`. If you see Prisma adapter/constructor errors, ensure `DATABASE_URL` is set and the image was rebuilt. For CORS, copy `deploy/Caddyfile` to `/etc/caddy/Caddyfile` and `sudo systemctl reload caddy`. |
| **Permission denied on .env** | Trying to execute the file (e.g. `./.env`). | Edit the file only (e.g. `nano .env` or your editor). Do not run it as a script. |
| **Server won't start: JWT_SECRET must be set in production** | `NODE_ENV=production` and `JWT_SECRET` is missing, empty, or `dev-secret`. | Set `JWT_SECRET` in the `.env` used by the API (e.g. next to `docker-compose.yml`) to a strong random value. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Restart the API. |

---

## Quick reference

| Task | Command / action |
|------|-------------------|
| Run client | `cd client && npm run dev` |
| Run server | `cd server && npm run dev` |
| Build client | `cd client && npm run build` (output: `client/dist`) |
| Build server | `cd server && npm run build` (output: `server/dist`) |
| Redis (Docker) | `docker compose up -d` (Redis + Postgres + API + worker) |
| Deploy backend | `docker compose up --build -d` |
| Restart API + worker | `docker compose up -d --build api worker` |
| API logs (OTP, auth) | `docker logs -f videotools-api` |
| Inspect DB (psql) | `docker exec -it videotools-postgres psql -U videotools -d videotext` |
| Prisma Studio | `docker exec -it videotools-api npx prisma studio` (then open http://localhost:5555 via port-forward if needed) |
| Job status | `GET /api/job/:jobId` |
| Health | `GET /health` → `{"status":"ok"}` |
| SEO: sync routes | `npm run seo:sync` |
| SEO: validate registry | `npm run seo:validate-registry` |
| SEO: sitemap | `npm run seo:sitemap` (optional: `SITE_URL`, `SITEMAP_PING`) |
| SEO: smoke test | `BASE_URL=http://localhost:4173 npm run seo:smoke` (after building and serving client) |
| SEO: health check | `npm run seo:health` (robots + sitemap; set `SEO_HEALTH_MODE=strict` for full URL checks) |
| Observability | **[docs/OBSERVABILITY.md](docs/OBSERVABILITY.md)** — logs, Sentry, health endpoints, request ID |
| Health / version / queue | `curl http://localhost:3001/healthz`, `curl http://localhost:3001/version`, `curl http://localhost:3001/ops/queue` |

---

All product behavior, trees, branches, and features are described in [§1 Features & tools](#1-features--tools-trees-and-branches). Auth (OTP, login, logout) is in [§5.1 Authentication](#51-authentication-otp-login-logout). **SEO** (registry, structure, automation, commands, production env) is in [§9 SEO & production URLs](#9-seo--production-urls). Client performance and device/reliability details are in [§10 Client: performance, devices & reliability](#10-client-performance-devices--reliability). End-to-end performance vs competitors is in [§11 Performance benchmark](#11-performance-benchmark-end-to-end). **Observability** (logs, Sentry, health, request ID) is in [§14 Observability](#14-observability-logging-sentry-health) and **docs/OBSERVABILITY.md**. Latest upload UX improvements (multi-stage progress, preview, cancel, retry, network-aware messaging) are in [§10 Upload & transcript/subtitles UX](#upload--transcriptsubtitles-ux) and `docs/UX_UPLOAD_IMPROVEMENTS.md`. Pipeline architecture and performance audit are in `docs/PERFORMANCE_AUDIT_UPLOAD_PIPELINE.md`. For env details use the tables in [§3 Environment variables](#3-environment-variables) and the `.env` next to `docker-compose.yml` for Docker [§8](#8-deployment-hetzner--caddy--vercel).
