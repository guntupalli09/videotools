# Production readiness

You can **confidently deploy** for **single-video flows** (Video → Transcript, Video → Subtitles) and get the same efficiency as in development, **if** you satisfy the checklist below. Batch and a few operational details need attention for full production parity.

---

## ✅ Ready for production (with correct config)

| Area | Status | Notes |
|------|--------|--------|
| **Auth** | ✅ | JWT + API keys; no demo user; `JWT_SECRET` enforced in prod |
| **CORS** | ✅ | Allowlist + `CORS_ORIGINS`; localhost only in dev |
| **Persistence** | ✅ | Postgres (users, usage, Stripe); Redis (Bull queue) |
| **Job polling** | ✅ | `jobToken`-based access; works for anonymous and signed-in |
| **Upload** | ✅ | Chunked + single-file; plan limits; rate limits |
| **Worker** | ✅ | Separate container supported (`DISABLE_WORKER=true` + worker container) |
| **File storage** | ✅ | `TEMP_FILE_PATH` (e.g. `/tmp`); API + worker share volume in Docker |
| **Stripe** | ✅ | Webhook + portal; no hardcoded secrets |
| **Logging / errors** | ✅ | Structured logs; Sentry optional; no dev shortcuts in prod |

Same **efficiency** (throughput, latency, feature set) for transcript and subtitles: same code path, same limits, same queue. Scale by adding more worker replicas (same Redis queue).

---

## Required production config

Set these in your hosting env (e.g. Railway, Render, Fly, or `.env`):

| Variable | Required in prod | Notes |
|----------|------------------|--------|
| `NODE_ENV` | `production` | Enables JWT check, CORS strict, Prisma log level |
| `JWT_SECRET` | Yes | Strong random value; **never** `dev-secret` |
| `DATABASE_URL` | Yes | Postgres connection string |
| `REDIS_URL` | Yes | Redis for Bull (e.g. `redis://:password@host:6379`) |
| `TEMP_FILE_PATH` | Recommended | e.g. `/tmp`; API and worker must share this (volume or same host) |
| `CORS_ORIGINS` | Yes | Comma-separated frontend origins (e.g. `https://www.videotext.io`) |
| Stripe keys / webhook | Yes | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs |

Optional: `DISABLE_WORKER=true` on the API when running a separate worker container; `LOG_LEVEL`, `SENTRY_DSN`, `REDIS_PASSWORD` (and then `REDIS_URL` with auth).

---

## Gaps to fix for full production parity

1. **Batch status (fixed)**  
   Batch state is now persisted in **Postgres** (`BatchJobRecord` table). The API and worker both read/write via `getBatchById` / `saveBatch`, so batch progress and download work when they run in separate containers. Ensure the worker has `DATABASE_URL` set (e.g. in docker-compose it is set to the same Postgres as the API). Result: worker may see “Batch not found”, and API `GET /api/batch/:batchId/status` never sees progress.  

2. **Other in-memory state**  
   - **Chunked upload sessions** (`chunkUploadMeta`): lost on API restart; client can retry.  
   - **Rate limit** (`uploadRateLimit`): resets on restart; for strict limits use Redis.  
   - **OTP store**: resets on restart; user can request a new code.  
   These are acceptable for many deployments but worth being aware of.

3. **File storage at scale**  
   Current design: local/volume storage (`TEMP_FILE_PATH`). For **multiple API or worker instances** without a shared filesystem, you’d need object storage (e.g. S3) for uploads and outputs and to pass URLs to the worker. Single-node or single-volume deployment is fine as-is.

---

## Summary

- **Yes, you can deploy to production** and get the **same level of efficiency** for:
  - Video → Transcript  
  - Video → Subtitles  
  - Auth, usage, billing, and job polling (including `jobToken`).

- **Do this:** Set `NODE_ENV=production`, `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, and Stripe config; run API (optionally with `DISABLE_WORKER=true`) and worker with shared `TEMP_FILE_PATH` (e.g. shared volume).

- **Plan to fix for full parity:** Consider Redis-backed rate limiting and, for multi-node scale, object storage for files. Batch state is already in Postgres.
