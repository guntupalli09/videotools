# Production deployment: Vercel (frontend) + Hetzner (API + worker)

This checklist ensures the app is ready for production with your setup.

---

## 1. Vercel (frontend)

- **Project:** Import repo; root directory = **repo root** (so `vercel.json` is used).
- **Build:** Use existing `vercel.json` (build command `npm run build`, output `dist`) or set explicitly:
  - **Build command:** `npm run build` (root script builds client and outputs to `dist`)
  - **Output directory:** `dist`
- **Environment variables (Project Settings → Environment Variables):**

| Variable | Value | Required |
|--------|--------|----------|
| `VITE_API_URL` | Your API origin, e.g. `https://api.videotext.io` | **Yes** (no trailing `/api`) |
| `VITE_SITE_URL` | Canonical site URL, e.g. `https://www.videotext.io` | Recommended (SEO, OG, canonicals) |

- **CORS:** The server already allows `https://videotext.io`, `https://www.videotext.io`, and **`*.vercel.app`** (preview deployments). For a custom domain on Vercel, add it to **CORS_ORIGINS** on the server (see below).
- **SPA:** `vercel.json` rewrites `/(.*)` → `/index.html`, so direct links and refresh work.

---

## 2. Hetzner (API + worker)

Run the backend on a Hetzner VM (Docker recommended).

### 2.1 Database and Redis

- **Postgres:** Use Hetzner Managed Database (Postgres) or run Postgres in Docker on the same VM. Note the connection string (e.g. `postgresql://user:pass@host:5432/videotext`).
- **Redis:** Use Hetzner Managed Redis or run Redis in Docker. Note the URL (e.g. `redis://:password@host:6379` or `redis://localhost:6379` if local).

### 2.2 Server env (API + worker)

Create a **`.env`** next to `docker-compose.yml` (or set env in your process manager). The API and worker containers use `env_file: .env`.

| Variable | Required | Example / notes |
|----------|----------|------------------|
| `NODE_ENV` | Yes | `production` |
| `JWT_SECRET` | Yes | Strong random (e.g. `openssl rand -hex 32`). **Never** `dev-secret` in prod. |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/videotext` (Hetzner DB or Docker postgres) |
| `REDIS_URL` | Yes | `redis://:password@host:6379` or `redis://localhost:6379` |
| `CORS_ORIGINS` | Yes | Your frontend origin(s), e.g. `https://www.videotext.io` or `https://www.videotext.io,https://videotext.io` |
| `TEMP_FILE_PATH` | Recommended | `/tmp` (API and worker must share this; same VM or shared volume) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (endpoint: `https://api.yourdomain.com/api/stripe/webhook`) |
| Stripe price IDs | Yes | As used in billing (e.g. `STRIPE_PRICE_ID_BASIC`, `STRIPE_PRICE_ID_PRO`, etc.) |
| `OPENAI_API_KEY` | Yes | For transcription |
| `BASE_URL` | Recommended | `https://api.videotext.io` (used in auth emails, Stripe redirects, etc.) |
| `DISABLE_WORKER` | Optional | `true` on the **API** container if the worker runs in a separate container (recommended). |

Optional: `LOG_LEVEL`, `SENTRY_DSN`, `RESEND_API_KEY` / `RESEND_FROM_EMAIL` (for emails), `FFMPEG_PATH` / `FFPROBE_PATH` (Dockerfile sets these).

### 2.3 Run with Docker (recommended)

- From the repo directory that contains `docker-compose.yml` and `.env`:
  - `docker compose up --build -d`
- The **api** service runs `prisma migrate deploy` then `node dist/index.js` (migrations applied on startup).
- The **worker** service needs **DATABASE_URL** (for batch state) and the same **REDIS_URL** and **TEMP_FILE_PATH** as the API. The repo’s `docker-compose.yml` already sets `DATABASE_URL` and a shared `tmp-files` volume for the worker.
- Ensure **api** and **worker** can reach Postgres and Redis (same network or allowed IPs for managed services).

### 2.4 HTTPS (Caddy) on Hetzner

- Point DNS for your API (e.g. `api.videotext.io`) to the Hetzner server IP.
- Install Caddy and use a Caddyfile, e.g.:
  ```text
  api.videotext.io {
      reverse_proxy localhost:3001
  }
  ```
- Restart Caddy. Test: `curl -sS https://api.videotext.io/health` → `{"status":"ok"}`.

---

## 3. Stripe

- **Webhook:** In Stripe Dashboard, add endpoint `https://api.yourdomain.com/api/stripe/webhook`, select the events you need (e.g. `checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`). Set the signing secret as `STRIPE_WEBHOOK_SECRET` on the server.
- **Redirects:** The app uses `BASE_URL` (or `https://www.videotext.io`) for post-checkout redirects; ensure your frontend URL matches.

---

## 4. Quick checklist

| Item | Where | Done |
|------|--------|------|
| `VITE_API_URL` = API origin (HTTPS) | Vercel env | |
| `VITE_SITE_URL` = frontend URL | Vercel env | |
| `NODE_ENV=production` | Hetzner server | |
| `JWT_SECRET` set (strong, not dev-secret) | Hetzner server | |
| `DATABASE_URL` (Postgres) | Hetzner server (api + worker) | |
| `REDIS_URL` | Hetzner server (api + worker) | |
| `CORS_ORIGINS` includes your frontend origin(s) | Hetzner server | |
| Stripe keys + webhook secret + price IDs | Hetzner server | |
| Stripe webhook URL = `https://api.yourdomain.com/api/stripe/webhook` | Stripe Dashboard | |
| Migrations applied | Automatic on api startup (`prisma migrate deploy`) | |
| Worker has `DATABASE_URL` (for batch) | docker-compose / env | |
| API and worker share `TEMP_FILE_PATH` (e.g. volume) | docker-compose | |
| DNS: api.yourdomain.com → Hetzner; www → Vercel | DNS | |

---

## 5. Is everything ready?

- **Yes**, for production, once the above is in place:
  - **Frontend (Vercel):** Build uses `VITE_API_URL` and `VITE_SITE_URL`; CORS allows your domain and `*.vercel.app`.
  - **Backend (Hetzner):** Auth, CORS, Postgres, Redis, Stripe, batch state in Postgres, and worker with shared storage are all production-ready.
- **Efficiency:** Same as dev for Video → Transcript, Video → Subtitles, batch, and billing.
- **Optional:** Add Sentry (server + client), Redis password in production, and a firewall so only 80/443 (and SSH) are open on the VM.
