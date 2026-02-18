# Upload stuck at 0% and nothing in server logs

## What’s going on

For **large files** (e.g. 983 MB), the app uses **chunked upload**:

1. **Preparing** – client-side (e.g. connection probe to `/health`).
2. **Uploading** – first the client calls **POST /api/upload/init**; only after that does it send chunks and move the progress bar.

If you see **“Uploading (0%)”** and **no requests in the API logs**, the browser is almost certainly **not** sending requests to your Hetzner API. The request is either going somewhere else (e.g. Vercel) or failing before it reaches the server.

---

## 1. Fix: Set `VITE_API_URL` on Vercel (most common)

The frontend must know your **API base URL**. That comes from **build-time** env on Vercel:

- **Variable:** `VITE_API_URL`
- **Value:** Your API origin only, e.g. `https://api.videotext.io`  
  - No path, no trailing slash, no `/api`.

If `VITE_API_URL` is **not set** on Vercel, the built app uses `window.location.origin` (your Vercel URL). So:

- **POST /api/upload/init** is sent to **Vercel**, not to Hetzner.
- Vercel returns your SPA (or 404), not the API. The upload never hits the server, so you see nothing in API logs and progress stays at 0%.

**What to do:**

1. In Vercel: **Project → Settings → Environment Variables**
2. Add: **`VITE_API_URL`** = `https://api.videotext.io` (or your real API URL).
3. **Redeploy** the frontend (new build so the value is baked in).

Then try the upload again.

---

## 2. Check where the request goes (browser)

1. Open **DevTools (F12) → Network**.
2. Start an upload again.
3. Filter by **“init”** or **“upload”**, or look for the first **POST** after “Uploading” starts.

Check:

- **Request URL** – must be `https://api.yourdomain.com/api/upload/init` (your Hetzner API), not `https://xxx.vercel.app/...` or `https://www.videotext.io/...` (unless your API is on the same host).
- **Status** – Pending (hanging), 200, 403 (CORS/auth), 503, etc.

If the URL is wrong, fix `VITE_API_URL` and redeploy. If the URL is correct but status is 403, see step 3 (CORS).

---

## 3. CORS (if request goes to API but fails)

If the **init** request goes to the correct API URL but you see **403** or a CORS error in the console:

- On the **Hetzner server** (API), set **`CORS_ORIGINS`** to your frontend origin(s), e.g.  
  `https://www.videotext.io,https://videotext.io`
- Restart the API container:  
  `docker compose restart api`

---

## 4. Look at the right server logs

Uploads are handled by the **API** container, not the worker.

- **To see upload/init and chunk requests:**  
  `docker logs -f videotools-api`
- Worker logs (`videotools-worker`) show **job processing** after the file is fully uploaded; they will stay quiet until the upload completes and a job is queued.

So if you only watch the worker, you’ll see “nothing” even when the API is receiving uploads.

---

## 5. Quick checklist

| Check | Action |
|-------|--------|
| Vercel env | `VITE_API_URL` = `https://api.videotext.io` (or your API), then **redeploy**. |
| Browser Network | Confirm POST /api/upload/init goes to the API host, not Vercel. |
| API logs | Run `docker logs -f videotools-api` and retry upload. |
| CORS | If 403 on init, set `CORS_ORIGINS` on the server and restart API. |
| Init Pending | If init stays Pending, server is likely blocking on Redis/DB; see §6 below. |

After setting `VITE_API_URL` and redeploying, large uploads should hit the API and progress should move; you’ll then see activity in **videotools-api** logs.

---

## 6. Init request stuck Pending

If **POST .../api/upload/init** stays **Pending** in the Network tab, the server got the request but never responded. The handler can block on **Redis** (`getTotalQueueCount`) or **Postgres** (`getUser`). The server returns **503** after 15s if those calls hang—redeploy the API so the client gets a response; then fix Redis/DB connectivity.

**Check Redis and Postgres from the API:**

- **HTTP:** `curl -s https://api.videotext.io/readyz` — 200 = both OK; 503 body includes `redis` and/or `database` error messages.
- **From host (using server env):** from repo root run `cd server && npm run check-connectivity`; from server dir run `npm run check-connectivity`.
- **From API container:** `docker exec videotools-api node scripts/check-connectivity.js` (if the image includes the script and `server/.env` is applied via env).

Fix **REDIS_URL** (host/port/firewall, Redis running) and **DATABASE_URL** (Postgres running, network/firewall) so both checks pass.
