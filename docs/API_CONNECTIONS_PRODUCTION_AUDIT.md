# API Connections – Production Audit

This doc summarizes where API and backend connections are configured and what can go wrong in production (Hetzner Docker + Vercel frontend).

---

## 1. Where config lives

| Config | Used by | Source in production |
|--------|---------|------------------------|
| **VITE_API_URL** | Client (build-time) | **Vercel** env vars. Must be set there so the built bundle calls your API. |
| **API_ORIGIN** | Client at runtime | Derived from `VITE_API_URL` (see `client/src/lib/apiBase.ts`). Fallback: `window.location.origin` or `http://localhost:3001`. |
| **CORS_ORIGINS** | API (Express) | **Docker .env** (same dir as `docker-compose.yml`, e.g. `/opt/videotools/.env`). Comma-separated origins. |
| **BASE_URL** | API (Stripe redirects, auth emails) | **Docker .env**. Should be **frontend** URL (e.g. `https://www.videotext.io`), not API URL. |
| **REDIS_URL** | API + worker | **docker-compose** `environment:` overrides to `redis://redis:6379`. Env file can set it but compose wins. |
| **DATABASE_URL** | API + worker | **docker-compose** `environment:` sets `postgresql://videotools:${POSTGRES_PASSWORD:-videotools}@postgres:5432/videotext`. |
| **NODE_ENV, JWT_SECRET, STRIPE_*, OPENAI_*, RESEND_*, etc.** | API + worker | **Docker .env** only (not in compose `environment:`). Must be in the file next to `docker-compose.yml`. |

**Important:** `env_file: .env` in docker-compose points at the **directory that contains docker-compose.yml** (repo root in repo, `/opt/videotools` on Hetzner). The **server/.env** and **client/.env** in the repo are for local dev and Vite; the API/worker containers get env from the **root .env** (and from `environment:` overrides).

---

## 2. Issues found in the repo

### 2.1 Root `.env` (repo)

- **Path:** `/.env`
- **Content today:** Almost empty (Postgres note + stray `image.png`).
- **Role:** Used by `docker-compose` when you run compose from the repo. For production you maintain a **different** `.env` on the server (e.g. `/opt/videotools/.env`) with all production secrets and vars.
- **Risk:** If someone runs `docker compose up` from the repo without a full `.env`, the API container will miss `CORS_ORIGINS`, `BASE_URL`, `JWT_SECRET`, Stripe keys, etc. **Action:** Keep production secrets out of the repo; document that production needs a full `.env` next to docker-compose (see README / DEPLOYMENT_VERCEL_HETZNER.md).

### 2.2 Server `server/.env` (repo)

- **Path:** `server/.env`
- **Used when:** Running the server locally (`npm run dev` in `server/`). Also **copied into the Docker image** at build time (`COPY server/ ./`), so `/app/.env` exists in the container. At runtime, Docker injects env from the **host** `.env` (next to docker-compose) and from `environment:`; `dotenv/config` in the app then loads `/app/.env` but **does not override** already-set vars. So Docker-injected `REDIS_URL` and `DATABASE_URL` are kept.
- **Issues:**
  - **NODE_ENV=development** – Fine for local dev. In production, Docker should set `NODE_ENV=production` from the host `.env`, so this is not overridden.
  - **BASE_URL=http://localhost:3000** – Only used if Docker did not set `BASE_URL`. In production, set `BASE_URL` in the **Docker .env** (e.g. `https://www.videotext.io`).
  - **VITE_API_URL=https://api.videotext.io** – Used when building/running client locally; does not affect the API container.
  - **DATABASE_URL=postgresql://...@localhost:5433/...** – Correct for local dev. In Docker, `environment:` overrides this.
- **Risk:** If the **production** Docker .env ever did not set `BASE_URL`, the app could fall back to `http://localhost:3000` for Stripe redirects (wrong). **Action:** Ensure production `.env` has `BASE_URL=https://www.videotext.io` (or your frontend URL), not the API URL and not a placeholder like `http://YOUR_SERVER_IP:3001`.

### 2.3 Client `client/.env` (repo)

- **Path:** `client/.env`
- **Content:** PostHog, Sentry. **No VITE_API_URL**.
- **Role:** Local client dev and/or sync from server/.env. For **production**, the client is built on **Vercel**; Vercel env must define `VITE_API_URL` (e.g. `https://api.videotext.io`). If not set, `apiBase.ts` uses `window.location.origin`, so browser requests go to the Vercel domain instead of your API → uploads/API calls fail.
- **Risk:** Production 100% depends on **Vercel** having `VITE_API_URL` set and redeploy after change. **Action:** Confirm in Vercel: `VITE_API_URL` = `https://api.videotext.io` (no trailing `/api`), then redeploy.

### 2.4 Docker Compose `docker-compose.yml`

- **env_file:** `.env` → same directory as the compose file (root in repo, `/opt/videotools` on server).
- **environment:** For `api` and `worker`, `REDIS_URL` and `DATABASE_URL` are set explicitly; they override any value from `.env`. Good for production.
- **Missing from `environment:`:** `NODE_ENV`, `CORS_ORIGINS`, `BASE_URL`, `JWT_SECRET`, Stripe, OpenAI, Resend, etc. All of these **must** come from the host `.env`. If that file is incomplete, the API will start but can fail at runtime (CORS, Stripe, auth, etc.).
- **CORS:** API allows (1) hardcoded `https://videotext.io`, `https://www.videotext.io`, (2) `CORS_ORIGINS` from env (comma-separated), (3) `*.vercel.app`, (4) in non-production localhost. So production needs `CORS_ORIGINS=https://videotext.io,https://www.videotext.io` (or equivalent) in the Docker .env if you rely on it; the hardcoded list already matches.

### 2.5 Caddy / reverse proxy

- **File:** `deploy/Caddyfile`
- **Role:** On Hetzner, Caddy fronts `api.videotext.io` and proxies to `localhost:3001`. OPTIONS (CORS preflight) are handled with fixed origins (videotext.io, www, *.vercel.app). Actual API requests go to `reverse_proxy localhost:3001`.
- **Issue:** None for connections; ensure this Caddyfile is the one active on the server and Caddy is reloaded after changes.

### 2.6 API origin and CORS (code)

- **Client:** `client/src/lib/apiBase.ts` – `API_ORIGIN` = `VITE_API_URL` (trimmed) or `window.location.origin` or `http://localhost:3001`. All fetch calls use `API_ORIGIN` + path (e.g. `/api/upload/init`). No duplicate base URL in code.
- **Server:** `server/src/index.ts` – CORS allowlist = hardcoded origins + `CORS_ORIGINS` split by comma. No duplicate Redis or DB connection logic in CORS.

---

## 3. Checklist for production (Hetzner + Vercel)

Use this on the **server** (e.g. `/opt/videotools`) and in **Vercel**:

| Item | Where | Value / check |
|------|--------|----------------|
| **VITE_API_URL** | Vercel env | `https://api.videotext.io` (origin only, no `/api`). Redeploy after setting. |
| **CORS_ORIGINS** | Docker .env | e.g. `https://videotext.io,https://www.videotext.io` (or already covered by hardcoded list). |
| **BASE_URL** | Docker .env | **Frontend** URL, e.g. `https://www.videotext.io`. Not API URL, not `http://YOUR_SERVER_IP:3001`. |
| **NODE_ENV** | Docker .env | `production`. |
| **REDIS_URL** | docker-compose | Set in compose to `redis://redis:6379`; no change needed if using compose as-is. |
| **DATABASE_URL** | docker-compose | Set in compose to `postgresql://videotools:${POSTGRES_PASSWORD:-videotools}@postgres:5432/videotext`. Ensure `POSTGRES_PASSWORD` is in Docker .env. |
| **JWT_SECRET, STRIPE_*, OPENAI_*, RESEND_*, etc.** | Docker .env | All required for auth, billing, AI, email. Must be in the `.env` next to docker-compose. |

---

## 4. No duplicate Redis or API in code

- **Single Redis:** One Redis server; Bull creates multiple **connections** (2 queues × 3 types per process). No second Redis URL or duplicate client config found.
- **Single API base URL:** Client uses one `API_ORIGIN` from `VITE_API_URL` (or fallback). No second API base or duplicate fetch base in the codebase.
- **DB:** One `DATABASE_URL`; Prisma uses it. Compose sets it for both api and worker.

---

## 5. Summary of likely production issues

1. **BASE_URL** in the Docker .env set to API URL or placeholder (e.g. `http://YOUR_SERVER_IP:3001`) → Stripe redirects and auth emails can point to the wrong place. Set to frontend URL (e.g. `https://www.videotext.io`).
2. **VITE_API_URL** not set on Vercel or wrong → Browser sends requests to Vercel origin instead of `https://api.videotext.io` → uploads/API fail. Set and redeploy.
3. **Redis timeouts** (separate from “duplicate” config) → Addressed by Redis warmup, timeouts, and compose Redis healthcheck; see `docs/REDIS_DEV_VS_PROD.md`.
4. **Incomplete Docker .env** on the server → API/worker start but miss CORS, JWT, Stripe, etc. Ensure the `.env` next to `docker-compose.yml` on Hetzner contains every var listed in §3.

No duplicate Redis or duplicate API connection config was found in the codebase; the main risks are **env placement** (which .env is used where) and **correct values** in production (Vercel + Docker .env).
