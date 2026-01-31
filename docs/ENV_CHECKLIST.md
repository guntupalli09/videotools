# Environment variables — Vercel (frontend) & Hetzner (backend)

Use this checklist so the frontend (Vercel, www.videotext.io) and backend (Hetzner) are correctly configured for production.

---

## Frontend (Vercel)

**Where:** Vercel → Project → Settings → Environment Variables.

| Variable | Required | Example | Notes |
|----------|----------|---------|--------|
| `VITE_API_URL` | **Yes** (production) | `https://api.videotext.io/api` | Full API base including `/api`. Must match your Hetzner API URL. |
| `VITE_SITE_URL` | No | `https://www.videotext.io` | Canonical/OG/sitemap base. Defaults to `https://www.videotext.io` if unset. |

- **Root directory:** In Vercel, set **Root Directory** to `client` so `npm run build` and `dist` are used from the client app.
- **Build command:** `npm run build` (from `client`).
- **Output directory:** `dist`.

---

## Backend (Hetzner)

**Where:** Server `.env` (or Docker env / Hetzner env). See `deploy/README.md` for Docker.

### API & CORS

| Variable | Required | Example | Notes |
|----------|----------|---------|--------|
| `PORT` | No | `3001` | Default 3001. |
| `NODE_ENV` | No | `production` | Set to `production` on Hetzner. |
| `CORS_ORIGINS` | No | `https://www.videotext.io,https://videotext.io` | Comma-separated. If unset, production defaults to `https://www.videotext.io` and `https://videotext.io`. |

### Stripe (see `docs/STRIPE_GO_LIVE.md`)

| Variable | Required | Example |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Yes | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_...` |
| `STRIPE_PRICE_BASIC` | Yes | `price_...` |
| `STRIPE_PRICE_PRO` | Yes | `price_...` |
| `STRIPE_PRICE_AGENCY` | Yes | `price_...` |
| `STRIPE_PRICE_OVERAGE` | Yes | `price_...` |

### Checkout redirects (Stripe success/cancel)

| Variable | Required | Example | Notes |
|----------|----------|---------|--------|
| `BASE_URL` | **Yes** (Hetzner) | `https://www.videotext.io` | Frontend URL for Stripe redirects. Client also sends `frontendOrigin`; server uses `BASE_URL` when that’s not sent. |

### Redis, temp files, workers

| Variable | Required | Example | Notes |
|----------|----------|---------|--------|
| `REDIS_URL` | Yes (Docker) | `redis://redis:6379` | For Bull queue. |
| `TEMP_FILE_PATH` | No | `/tmp` | Where uploads/outputs are stored. |
| `DISABLE_WORKER` | No | `true` | Set on API container only if worker runs in a separate container. |

### Other (transcription, auth, etc.)

| Variable | Required | Example |
|----------|----------|---------|
| `OPENAI_API_KEY` | Yes (transcription) | `sk-...` |
| `JWT_SECRET` | Yes (auth) | long random string |

---

## URL alignment

| What | Value |
|------|--------|
| Frontend (Vercel) | `https://www.videotext.io` |
| Backend API (Hetzner) | `https://api.videotext.io` (or your subdomain) |
| `VITE_API_URL` (Vercel) | `https://api.videotext.io/api` |
| `BASE_URL` (Hetzner) | `https://www.videotext.io` |
| Stripe webhook | `https://api.videotext.io/api/stripe/webhook` |
| CORS allowed origins | `https://www.videotext.io`, `https://videotext.io` |

---

## Quick checks

1. **Frontend:** In Vercel, `VITE_API_URL` is set to your backend base + `/api`. Redeploy after changing env.
2. **Backend:** `BASE_URL` is set to `https://www.videotext.io` so Stripe redirects work.
3. **CORS:** Backend allows `https://www.videotext.io` and `https://videotext.io` (or set `CORS_ORIGINS`).
4. **Stripe:** Webhook URL in Stripe Dashboard is `https://<your-api-domain>/api/stripe/webhook`; signing secret is in `STRIPE_WEBHOOK_SECRET`.
