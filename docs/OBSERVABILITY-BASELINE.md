# Observability baseline — VideoText repo map

**Purpose:** Single control plane to debug UI/API/worker/Caddy/env/SEO. All changes gated by env; no breaking changes to routes or flows.

---

## 1) Client framework and entrypoints

| Item | Location |
|------|----------|
| Framework | **Vite + React** |
| HTML template | `client/index.html` |
| Boot | `client/src/main.tsx` — `ReactDOM.createRoot`, `HelmetProvider`, `ThemeProvider`, `initAnalytics()` |
| Build config | `client/vite.config.ts` — `define` has `VITE_SITE_URL`; no RELEASE yet |
| Public URL base | `VITE_SITE_URL` (default `https://www.videotext.io`) |

**Notes:** SPA; no SSR. Analytics: PostHog only (`client/src/lib/analytics.ts`). No Sentry. Unhandled rejections show toast in `main.tsx`.

---

## 2) Server/API

| Item | Location |
|------|----------|
| Framework | **Express** |
| Entry | `server/src/index.ts` |
| Routers | All under `/api`: `upload`, `job`, `download`, `usage`, `batch`, `billing`, `auth`, `translate-transcript`; plus `POST /api/stripe/webhook` (raw body) |
| Health | `GET /health` → `{ status: 'ok' }` (no deps check) |
| Error handling | No global error middleware; each route uses try/catch and `res.status(500).json(...)` |
| CORS | Allowlist (videotext.io, CORS_ORIGINS, *.vercel.app); custom middleware + `cors()` |
| Rate limit | `express-rate-limit` 120/min general; per-user upload limit in upload/batch |

**Notes:** Worker started in-process when `DISABLE_WORKER !== 'true'`. No request ID or structured logging yet.

---

## 3) Worker/queue

| Item | Location |
|------|----------|
| Queue library | **Bull** (Redis backend) |
| Redis client | `server/src/utils/redis.ts` — `createRedisClient` (ioredis), `REDIS_URL` |
| Entry (in-process) | `server/src/index.ts` → `startWorker()` from `server/src/workers/videoProcessor.ts` |
| Entry (standalone) | `node dist/workers/videoProcessor.js` (e.g. Docker worker container) |
| Queues | `file-processing` (normal), `file-processing-priority` (Pro/Agency when queue > threshold) |
| Job processing | `processJob()` in `videoProcessor.ts`; concurrency via `NORMAL_CONCURRENCY` / `PRIORITY_CONCURRENCY` (env) |
| Enqueue sites | `server/src/routes/upload.ts` (multiple), `server/src/routes/batch.ts` — all use `addJobToQueue(plan, data)` |

**JobData:** `toolType`, `userId`, `plan`, `filePath`, `options`, etc. **No `requestId` in payload yet.**

---

## 4) Reverse proxy

| Item | Location |
|------|----------|
| Config | `deploy/Caddyfile` |
| Role | `api.videotext.io` → reverse_proxy to `localhost:3001`; OPTIONS handled for CORS |
| Logging | Default Caddy access log; **no JSON**, **no x-request-id** added/forwarded |

---

## 5) Deployment

| Item | Details |
|------|---------|
| Docker | `docker-compose.yml`: redis, postgres, api (DISABLE_WORKER=true), worker; `Dockerfile` builds server image, CMD `node dist/index.js` |
| Client deploy | Vercel (`vercel.json`: buildCommand, outputDirectory `dist`, rewrites to index.html) |
| Env | `.env` (root/server); docker-compose passes REDIS_URL, DATABASE_URL, TEMP_FILE_PATH, DISABLE_WORKER, etc. |
| CI | `.github/workflows/ci.yml`: build client, serve with `serve`, `npm run seo:smoke` (BASE_URL) |

---

## 6) Existing logging/monitoring

| Item | Where |
|------|--------|
| Sentry | **None** |
| PostHog | Client: `client/src/lib/analytics.ts` (VITE_POSTHOG_KEY). Server: `server/src/utils/analytics.ts` (posthog-node) |
| Logging | **console.log / console.error / console.warn** in server, worker, and some client (analytics, SessionErrorBoundary). No structured JSON, no requestId/release in logs |
| GA/Plausible | Not present |

---

## Integration plan (Phases 1–9)

1. **Phase 1 — Correlation:** RELEASE_ID at build (git SHA + timestamp); x-request-id middleware in API; forward in Caddy; add `requestId` to JobData and worker logs.
2. **Phase 2 — Logging:** Single logger (pino) in server + worker; structured JSON; redaction; replace hot-path console with logger (debug off by default).
3. **Phase 3 — Sentry:** Client + API + worker when SENTRY_DSN set; tags service/env/release/requestId; sampling for traces.
4. **Phase 4 — Health/ops:** `/healthz`, `/readyz` (Redis/queue), `/version`, `/configz` (redacted presence), `/ops/queue` (depth, heartbeat); worker heartbeat in Redis.
5. **Phase 5 — Caddy:** JSON access logs, x-request-id forward; doc in ops.
6. **Phase 6 — SEO:** `scripts/ops/seo-health-check.ts` (robots, sitemap, sample URLs meta/canonical/schema); shell vs strict mode.
7. **Phase 7 — Ops page (optional):** `/ops` with health/queue/link to Sentry; gated by OPS_ENABLED or non-prod.
8. **Phase 8 — CI:** Build, tests, smoke, seo-health-check, release stamp, config presence check.
9. **Phase 9 — Verification:** `docs/OBSERVABILITY-VERIFICATION.md` with local/prod checklist and example incident workflow.

All new behavior gated by env; no new public URLs; minimal overhead (sampling, no verbose in hot paths).
