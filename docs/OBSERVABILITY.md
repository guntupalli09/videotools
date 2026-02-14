# Observability — logging, Sentry, health & debugging

This document describes how to **view logs**, use the **Sentry dashboard**, and **debug issues** across the UI, API, and worker using a single request ID.

---

## 1. What’s in place

| Piece | Purpose |
|-------|--------|
| **Release ID** | Identifies the deployed build (git SHA + build). Set in CI/deploy; exposed to client, API, and worker. |
| **Request ID (`x-request-id`)** | One ID per request: from Caddy → API → worker (in job payload). Lets you follow one user action across all layers. |
| **Structured logs** | API and worker use **pino** (JSON) with `level`, `timestamp`, `service`, `env`, `release`, `requestId` / `jobId`. Sensitive fields redacted. |
| **Sentry** | Errors (and optional performance traces) from **client**, **API**, and **worker**. One dashboard; filter by `request_id`, `job_id`. |
| **Health & ops endpoints** | `/healthz`, `/readyz`, `/version`, `/configz`, `/ops/queue` for liveness, readiness, version, config presence, and queue + worker heartbeat. |
| **Caddy** | Forwards `X-Request-Id` to the API; see `docs/CADDY-LOGGING.md` for access logs. |
| **SEO health check** | `npm run seo:health` (robots + sitemap in shell mode; optional strict mode). |

---

## 2. Where to view logs (no in-repo dashboard)

There is **no log dashboard inside the repo**. Logs are **JSON to stdout/stderr**; you view them wherever that output goes:

| Where the app runs | Where to view logs |
|--------------------|--------------------|
| **Local** | Terminal where you run `npm run dev` (server) or the worker process. |
| **Docker** | `docker compose logs -f videotools-api`, `docker compose logs -f videotools-worker`. |
| **Railway / Render / Fly / etc.** | That platform’s **Logs** tab for the API and worker services. |

To get a **central log dashboard**, add a log pipeline (e.g. Datadog, Axiom, Logtail, or your host’s log drain) and send stdout there; the JSON format is ready for it.

---

## 3. Sentry dashboard (errors & performance)

**Sentry is the observability dashboard** for errors (and, if enabled, performance).

### How to access

1. Go to **[sentry.io](https://sentry.io)** and sign in.
2. Open your **organization** and the **project** (e.g. one for backend, one for frontend).
3. Use **Issues** (or **Errors**) for exceptions; search/filter by tags such as `request_id`, `job_id`.

### How to enable (DSN)

- **Backend (API + worker):** In **server/.env** set:
  ```env
  SENTRY_DSN=https://your-dsn@oXXX.ingest.us.sentry.io/XXX
  ```
  Restart the API and worker. No code change.

- **Frontend (React):** In **client/.env** (or your build env) set:
  ```env
  VITE_SENTRY_DSN=https://your-frontend-dsn@oXXX.ingest.us.sentry.io/XXX
  ```
  Rebuild the client (`npm run build` in `client/`) so the DSN is baked in. For Vercel/Netlify, add `VITE_SENTRY_DSN` in the dashboard’s environment variables for the build.

**Recommendation:** Create **two Sentry projects** — one **Node/Express** (backend), one **React** (frontend) — and use one DSN for server, one for client.

### What you see

- **Errors** with stack traces and tags (`request_id`, `job_id`, `job_name`, etc.).
- **Performance** traces (if enabled) with sampling (default 5%).
- **Search/filter** by `request_id` to follow one request from UI → API → worker.

### Free tier

Sentry’s free tier includes a limited number of errors and spans per month; no credit card required. If you don’t choose a paid plan, you stay on the free tier. See [sentry.io/pricing](https://sentry.io/pricing).

---

## 4. Health and ops endpoints

All on the **API** (no `/api` prefix). Safe for monitoring; responses are small and fast.

| Endpoint | Returns |
|----------|--------|
| **GET /healthz** | `200` if the process is up (no dependency check). |
| **GET /readyz** | `200` only if Redis and queue are reachable; otherwise `503`. |
| **GET /version** | `{ service, release, buildTime, env }`. |
| **GET /configz** | Redacted config **presence** only (e.g. `hasStripeKey`, `hasSentryDsn`); no secret values. |
| **GET /ops/queue** | `{ waiting, active, failed, lastHeartbeatAgeMs }`. Worker writes a heartbeat to Redis; if `lastHeartbeatAgeMs` is large, the worker may be down or stuck. |

**Example (local):**
```bash
curl -s http://localhost:3001/healthz
curl -s http://localhost:3001/readyz
curl -s http://localhost:3001/version
curl -s http://localhost:3001/configz
curl -s http://localhost:3001/ops/queue
```

**Request ID:** Every API response includes header **`x-request-id`**. Use it to correlate with Sentry and logs:
```bash
curl -sI http://localhost:3001/healthz | grep -i x-request-id
```

---

## 5. Environment variables (observability)

| Variable | Where | Purpose |
|----------|--------|--------|
| **RELEASE** | Server / worker / CI | Build/release ID (e.g. git SHA). Default `dev` if unset. |
| **LOG_LEVEL** | Server / worker | `info` (default), `debug`, `warn`, `error`. |
| **SENTRY_DSN** | server/.env | Backend Sentry project DSN. If unset, Sentry is disabled for API and worker. |
| **SENTRY_ENV** | server/.env | Sentry environment (default from `NODE_ENV`). |
| **SENTRY_TRACES_SAMPLE_RATE** | server/.env | Performance sampling 0–1 (default `0.05`). |
| **VITE_SENTRY_DSN** | client/.env or build env | Frontend Sentry project DSN (used at **build** time). |
| **VITE_SENTRY_ENV** | client | Sentry environment for client (build-time). |
| **VITE_SENTRY_TRACES_SAMPLE_RATE** | client | Client traces sample rate (default `0.05`). |
| **VITE_RELEASE** / **RELEASE** | Client build | Injected at build for Sentry release tag; e.g. CI sets `VITE_RELEASE=$GITHUB_SHA`. |

---

## 6. Debugging an incident (under 2 minutes)

1. Get the **request ID** from the failing response header **`x-request-id`** (or from the client network tab if you expose it).
2. **Sentry:** In your project, search/filter by tag **`request_id=<id>`**. Open the error and check stack trace and context.
3. **API logs:** Search logs for that request ID (e.g. `grep "<id>"` or `jq 'select(.requestId=="<id>")'`). Confirm route and error.
4. **Worker logs:** Same request ID (or use **`job_id`** from Sentry) in worker logs. Confirm job name and failure reason.
5. **Queue:** Call **GET /ops/queue**. If `lastHeartbeatAgeMs` is large, the worker may be down or stuck.

This ties one user request across **UI → API → worker** with a single ID.

---

## 7. Local verification (quick check)

```bash
# Start stack (Redis + server; worker runs in-process unless DISABLE_WORKER=true)
cd server && npm run dev

# In another terminal:
curl -s http://localhost:3001/healthz    # → {"status":"ok"}
curl -s http://localhost:3001/version    # → service, release, env
curl -sI http://localhost:3001/healthz | grep -i x-request-id  # → header present
```

---

## 8. Related docs

| Doc | Content |
|-----|--------|
| **docs/OBSERVABILITY-BASELINE.md** | Repo map (client, server, worker, Caddy, deploy) and integration plan. |
| **docs/OBSERVABILITY-SETUP.md** | Sentry, release, request ID, and health endpoints (technical setup). |
| **docs/OBSERVABILITY-VERIFICATION.md** | Full verification checklist (local + production) and incident workflow. |
| **docs/CADDY-LOGGING.md** | Caddy access logs and correlating by `request_id`. |

---

## 9. Quick reference

| Task | Command / action |
|------|-------------------|
| View API logs (Docker) | `docker compose logs -f videotools-api` |
| View worker logs (Docker) | `docker compose logs -f videotools-worker` |
| Health check | `curl -s http://localhost:3001/healthz` |
| Version | `curl -s http://localhost:3001/version` |
| Queue + heartbeat | `curl -s http://localhost:3001/ops/queue` |
| Sentry dashboard | [sentry.io](https://sentry.io) → your project → **Issues** / **Discover** |
| SEO health check | `npm run seo:health` (default: shell mode; set `SEO_HEALTH_MODE=strict` for full URL checks) |
