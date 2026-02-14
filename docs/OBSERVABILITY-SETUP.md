# Observability setup — Sentry, release, request ID

## Env vars (names only)

- **RELEASE** — Build/release ID (e.g. git SHA + timestamp). Set in CI/deploy; default `dev`.
- **LOG_LEVEL** — Logger level: `info` (default), `debug`, `warn`, `error`.
- **SENTRY_DSN** — Sentry project DSN. If unset, Sentry is disabled.
- **SENTRY_ENV** — Sentry environment (default `development` or `NODE_ENV`).
- **SENTRY_TRACES_SAMPLE_RATE** — Performance sampling 0–1 (default `0.05`).
- **VITE_SENTRY_DSN** — Client Sentry DSN (build-time; optional).
- **VITE_SENTRY_ENV** — Client Sentry environment (build-time).
- **VITE_SENTRY_TRACES_SAMPLE_RATE** — Client traces sample rate (default `0.05`).
- **VITE_RELEASE** / **RELEASE** — Injected at client build for release tag.

## Sentry

- **API:** Init in `server/src/index.ts` when `SENTRY_DSN` is set. Request ID is set on scope via middleware. `setupExpressErrorHandler(app)` runs after all routes.
- **Worker:** Init when worker process starts (standalone); job failures are captured with `captureJobError(jobId, requestId, jobName, err)`.
- **Client:** Init in `client/src/main.tsx` when `VITE_SENTRY_DSN` is set at build. Uses `browserTracingIntegration()`; no replay by default.

## Release ID

- **Server/worker:** `process.env.RELEASE` (set by deploy or CI).
- **Client:** `import.meta.env.VITE_RELEASE` (from `VITE_RELEASE` or `RELEASE` at build). Also on `window.__RELEASE__` for debugging.

## Request ID

- **Caddy:** Adds/forwards `X-Request-Id` via `request_id` and `header_up` (see `deploy/Caddyfile`).
- **API:** Middleware in `server/src/middleware/requestId.ts` reads `x-request-id` or generates a UUID; sets on request and response header.
- **Worker:** `requestId` is passed in job payload from upload/batch routes; logged and sent to Sentry with job errors.

## Health and ops endpoints

- **GET /healthz** — 200 if process is up (no deps).
- **GET /readyz** — 200 if Redis and queue are reachable.
- **GET /version** — `{ service, release, buildTime, env }`.
- **GET /configz** — Redacted config presence (no values).
- **GET /ops/queue** — `{ waiting, active, failed, lastHeartbeatAgeMs }`.

Worker writes a heartbeat key to Redis periodically; API reads it for `lastHeartbeatAgeMs`.
