# Deploy to Hetzner (single VM)

This guide covers running the API and worker on a single Hetzner CX43 (or similar) VM using Docker Compose. The frontend stays on Vercel; only the backend runs on Hetzner.

## Prerequisites

- Hetzner Cloud server: Ubuntu 22.04, e.g. CX43
- SSH access as root or sudo user

---

## 1. Install Docker on Ubuntu 22.04

```bash
# Update and install dependencies
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker’s official GPG key and repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine and Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify
docker --version
docker compose version
```

Optional: add your user to the `docker` group so you don’t need `sudo` for Docker:

```bash
sudo usermod -aG docker $USER
# Log out and back in for the group to apply
```

---

## 2. Copy the project and `.env`

On your **local** machine (or from a repo):

- Clone or copy the project onto the server (e.g. `scp -r` or `git clone`).
- Create `.env` on the server from the example and fill in real values (no secrets in the repo):

```bash
# On the server, in the project root
cp .env.example .env
nano .env   # or vim
```

Set at least:

- `REDIS_URL=redis://redis:6379` (so API/worker in Docker use the Redis service)
- `TEMP_FILE_PATH=/tmp`
- `OPENAI_API_KEY`, Stripe keys, `JWT_SECRET`, etc., as in `.env.example`

Do **not** commit `.env` or put production secrets in the repo.

---

## 3. Start services

From the **project root** (where `docker-compose.yml` and `Dockerfile` are):

```bash
docker compose up --build -d
```

This will:

- Build the single image used by both `api` and `worker`
- Start Redis, then API, then worker
- Mount a shared `/tmp` volume for API and worker
- Expose the API on port 3001

Check that all containers are up:

```bash
docker compose ps
```

You should see `videotools-redis`, `videotools-api`, and `videotools-worker` running.

---

## 4. Restart safely

To restart after a code or config change:

```bash
# Rebuild and recreate only api and worker (Redis keeps running)
docker compose up -d --build api worker
```

To restart everything (including Redis):

```bash
docker compose down
docker compose up -d --build
```

To restart without rebuilding:

```bash
docker compose restart api worker
```

---

## 5. Check logs

- All services:

  ```bash
  docker compose logs -f
  ```

- Only API:

  ```bash
  docker compose logs -f api
  ```

- Only worker:

  ```bash
  docker compose logs -f worker
  ```

- Last 200 lines of worker:

  ```bash
  docker compose logs --tail=200 worker
  ```

Exit follow mode with `Ctrl+C`.

---

## 6. Roll back

If a new image or code causes issues:

1. Stop and remove the current stack (data in Redis volume is kept):

   ```bash
   docker compose down
   ```

2. Check out the previous commit or image you want (e.g. `git checkout <previous-commit>`).

3. Rebuild and start:

   ```bash
   docker compose up -d --build
   ```

To roll back only the app image and keep Redis as-is:

```bash
docker compose up -d --build api worker
```

For a tagged image (if you push images to a registry), pin the image in `docker-compose.yml` and run `docker compose pull` then `docker compose up -d`.

---

## Summary

| Task              | Command / action                                  |
|-------------------|----------------------------------------------------|
| Install Docker    | See section 1 (apt + Docker repo + plugin)         |
| Copy env          | `cp .env.example .env` and edit `.env`             |
| Start             | `docker compose up --build -d`                     |
| Restart api+worker| `docker compose up -d --build api worker`          |
| Logs              | `docker compose logs -f api` or `... worker`       |
| Roll back         | `docker compose down` → checkout → `up --build -d`|

API is on port **3001**. Point your Vercel frontend (or reverse proxy) at `http://<server-ip>:3001`. For production, put a reverse proxy (e.g. Caddy or Nginx) and TLS in front of the API.

---

## 7. Troubleshooting

### Upload shows "Provisional headers" / no response in browser

Your frontend is on **HTTPS** (e.g. `https://videotext.io`). If `VITE_API_URL` points to **HTTP** (e.g. `http://178.156.234.143:3002/api`), the browser **blocks** the request (mixed content). The request never completes → "Provisional headers", no response.

**Fix:** Serve the API over **HTTPS** (reverse proxy + TLS, e.g. Caddy/Nginx with Let's Encrypt). Set `VITE_API_URL` to that HTTPS URL (e.g. `https://api.videotext.io/api`) and redeploy the frontend. Do not use `http://IP:port` when the site is HTTPS.

### Stripe: "STRIPE_SECRET_KEY is not set"

Payments and "Choose plan" checkout will not work until Stripe is configured on the server.

**Fix:** In the server `.env` (or Docker env), set:

- `STRIPE_SECRET_KEY` (e.g. `sk_live_...` or `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` (e.g. `whsec_...`)
- `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `STRIPE_PRICE_OVERAGE`

See `docs/STRIPE_GO_LIVE.md` and `docs/ENV_CHECKLIST.md`. Restart the API and worker after changing env: `docker compose up -d --build api worker`.
