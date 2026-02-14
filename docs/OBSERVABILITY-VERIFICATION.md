# Observability verification checklist

## A) Local verification commands

1. **Start the stack** (client + API + worker)
   - Terminal 1: `cd server && npm run dev`
   - Terminal 2: `cd client && npm run dev` (or build + serve dist)
   - Ensure Redis is running (e.g. `docker run -p 6379:6379 redis:7-alpine` or use existing).

2. **Hit health and ops endpoints**
   ```bash
   curl -s http://localhost:3001/healthz
   curl -s http://localhost:3001/readyz
   curl -s http://localhost:3001/version
   curl -s http://localhost:3001/configz
   curl -s http://localhost:3001/ops/queue
   ```
   Expect: `healthz`/`readyz` 200 JSON; `version` with `service`, `release`, `env`; `configz` with booleans; `ops/queue` with `waiting`, `active`, `failed`, `lastHeartbeatAgeMs`.

3. **Request ID**
   ```bash
   curl -sI -X GET http://localhost:3001/healthz | grep -i x-request-id
   ```
   Response should include `x-request-id`.

4. **Simulate an API error and confirm Sentry** (when `SENTRY_DSN` is set)
   - Trigger an endpoint that returns 500 or call `next(err)` in a test route; in Sentry project, find the event and confirm tag `request_id` matches the response header.

5. **Simulate a job failure and confirm Sentry** (when `SENTRY_DSN` is set)
   - Enqueue a job that will fail (e.g. invalid tool type or missing file); in Sentry, find the error and confirm tags `job_id`, `request_id`, `job_name`.

6. **Logs include requestId and release**
   - In server logs (structured JSON), each request log should have `requestId` when using a child logger; startup logs should have `release`.
   - In worker logs, job lifecycle should have `jobId` and `requestId`.

## B) Production verification steps

- **Sentry release:** In Sentry project settings/releases, confirm the deployed release matches the deployed git SHA or build ID (same as `RELEASE` env).
- **Caddy:** Confirm Caddy forwards `x-request-id` to the API (see `deploy/Caddyfile` and `docs/CADDY-LOGGING.md`).
- **Uptime checks:** Configure external checks for `GET /healthz` and optionally `GET /sitemap.xml` (e.g. 200).

## C) Example incident workflow (under 2 minutes)

1. User reports “upload failed” or “job stuck”.
2. Get **request ID** from the failing response header `x-request-id` (or from client if you expose it in UI/network tab).
3. **Sentry:** Search by tag `request_id=<id>`; open the error event and check stack trace and context.
4. **API logs:** `grep "<request_id>"` (or `jq 'select(.requestId=="<id>")'` if logs are JSON); confirm route and error.
5. **Worker logs:** Same `request_id` (or `job_id` from Sentry) in worker logs; confirm job name and failure reason.
6. **Queue:** `GET /ops/queue` to see depth and worker heartbeat; if `lastHeartbeatAgeMs` is large, worker may be down or stuck.

This links one user request across UI → API → worker using a single ID.
