# Step-by-Step: Deploy I Love Video on Vercel

This app has two parts: a **frontend** (React/Vite) and a **backend** (Express + Bull workers + FFmpeg). Vercel runs the frontend; the backend must run elsewhere because it uses long-running workers and file processing.

---

## Overview

| Part | Where it runs | Why |
|------|----------------|-----|
| **Frontend** | Vercel | Static/SPA; Vercel is ideal. |
| **Backend API + Worker** | Railway or Render | Needs Redis, FFmpeg, persistent process, file storage. |

---

## Part 1: Deploy the frontend to Vercel

### 1.1 Push your code to GitHub

Ensure your project is in a GitHub repo and push the latest changes.

### 1.2 Create a Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. Click **Add New** → **Project**.
3. Import your **I love Video** repo.

### 1.3 Configure the Vercel project

- **Root Directory:** Set to **client** in the **Dashboard only** (Project Settings → General → Root Directory). `rootDirectory` is **not** valid in `vercel.json`—it only exists in the Vercel Dashboard.
- After setting Root Directory to `client`, the repo’s `vercel.json` (build command + output directory) applies to that root. Framework Preset can stay Vite; Build Command `npm run build`, Output Directory `dist`.

### 1.4 Set frontend environment variables

In **Project → Settings → Environment Variables**, add:

| Name | Value | Notes |
|------|--------|--------|
| `VITE_API_URL` | `https://YOUR-BACKEND-URL.up.railway.app/api` | Your backend base URL + `/api`. Create this **after** deploying the backend (Step 2). For first deploy you can use a placeholder and update later. |

Redeploy after adding or changing `VITE_API_URL`.

### 1.5 Deploy

Click **Deploy**. Your frontend will be at `https://your-project.vercel.app`.

---

## Part 2: Deploy the backend (Railway or Render)

The backend runs the Express API and the Bull worker. It needs Redis and file storage.

### 2.1 Create a Redis database (Upstash)

1. Go to [upstash.com](https://upstash.com) and sign in.
2. Create a **Redis** database (same region as your backend if possible).
3. In the database dashboard, copy the **Redis URL** (e.g. `rediss://default:xxx@xxx.upstash.io:6379`).

### 2.2 Deploy the server to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → select your **I love Video** repo.
3. Configure the service:
   - **Root Directory:** `server`
   - **Build Command:** `npm run build` (or `npx tsc`)
   - **Start Command:** `npm start` (or `node dist/index.js`)
   - **Watch Paths:** `server/**` (so only server changes trigger deploys).

4. Add **Environment Variables** in Railway (Variables tab):

   | Name | Value |
   |------|--------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` (Railway sets `PORT` automatically; you can leave this or omit) |
   | `REDIS_URL` | Your Upstash Redis URL from 2.1 |
   | `BASE_URL` | `https://your-project.vercel.app` (your Vercel frontend URL) |
   | `OPENAI_API_KEY` | Your OpenAI API key |
   | `TEMP_FILE_PATH` | `/tmp` (Railway’s writable dir) |
   | `STRIPE_PUBLIC_KEY` | Stripe publishable key |
   | `STRIPE_SECRET_KEY` | Stripe secret key |
   | `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
   | `STRIPE_PRICE_BASIC` | Stripe price ID (basic) |
   | `STRIPE_PRICE_PRO` | Stripe price ID (pro) |
   | `STRIPE_PRICE_AGENCY` | Stripe price ID (agency) |
   | `STRIPE_PRICE_OVERAGE` | Stripe price ID (overage) |
   | `JWT_SECRET` | A long random string (e.g. `openssl rand -hex 32`) |

5. **Settings** → generate a **public domain** (e.g. `your-app.up.railway.app`). This is your backend URL.

6. Deploy. The worker runs in the same process as the server (started in `server/src/index.ts`).

### 2.3 (Alternative) Deploy the server to Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New** → **Web Service** → connect your repo.
3. Configure:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add the same environment variables as in the Railway table above (including `REDIS_URL` from Upstash).
5. Create the service. Render assigns a URL like `https://your-app.onrender.com`.

---

## Part 3: Connect frontend and backend

### 3.1 Set the frontend API URL

1. In **Vercel** → your project → **Settings** → **Environment Variables**.
2. Set `VITE_API_URL` to your backend API base:
   - Railway: `https://your-app.up.railway.app/api`
   - Render: `https://your-app.onrender.com/api`
3. **Redeploy** the Vercel project (Deployments → ⋮ → Redeploy) so the new value is baked into the build.

### 3.2 Stripe webhook (if you use Stripe)

1. In [Stripe Dashboard](https://dashboard.stripe.com/webhooks) → **Add endpoint**.
2. **URL:** `https://YOUR-BACKEND-URL/api/stripe/webhook` (e.g. Railway or Render URL + `/api/stripe/webhook`).
3. Select events (e.g. `checkout.session.completed`, `customer.subscription.*`).
4. Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET` in your backend env (Railway/Render). Redeploy the backend.

### 3.3 CORS

Your server uses `cors()` without a strict origin. If you want to lock it down, set `origin` to your Vercel URL (e.g. `https://your-project.vercel.app`). The billing route already uses `frontendOrigin` for redirect URLs.

---

## Part 4: Verify

1. **Frontend:** Open `https://your-project.vercel.app`. The app should load.
2. **API:** Open `https://YOUR-BACKEND-URL/health`. You should see `{"status":"ok"}`.
3. **Flow:** Upload a small video or use a tool; a job should be queued (Redis), processed by the worker, and the result shown.

---

## Checklist

- [ ] Repo pushed to GitHub
- [ ] Vercel project created, root = `client`, env `VITE_API_URL` set
- [ ] Upstash Redis created; `REDIS_URL` copied
- [ ] Backend deployed on Railway (or Render) with all env vars
- [ ] Backend public URL set; `VITE_API_URL` in Vercel updated and redeployed
- [ ] Stripe webhook URL and `STRIPE_WEBHOOK_SECRET` set (if using Stripe)
- [ ] Health check and one full job flow tested

---

## Troubleshooting

- **Frontend can’t reach API:** Check `VITE_API_URL` (must include `/api`), CORS, and that the backend URL is correct and live.
- **Jobs stay “queued”:** Backend must be running and `REDIS_URL` must be correct (Upstash URL). Check Railway/Render logs.
- **Stripe redirects to wrong URL:** Billing route uses `frontendOrigin` from the client; ensure the client is sending `window.location.origin` (already in your code).
- **File upload / processing errors:** On Railway/Render, use `TEMP_FILE_PATH=/tmp`. Ephemeral disk is limited; for large or permanent storage, add something like S3 or Vercel Blob later.
