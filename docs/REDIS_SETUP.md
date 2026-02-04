# Redis setup and migration (Upstash ↔ self-hosted)

Redis is used only for the **Bull job queue** (video/transcript/subtitle processing). Auth, billing, and Stripe do **not** use Redis. You can run either:

- **Self-hosted Redis** (Docker on the same server, or Redis installed on the host)
- **Upstash** (managed Redis, `rediss://` URL)

Switching between them requires **only changing `REDIS_URL`** and restarting the API and worker. No code changes.

---

## 1. Option A: Self-hosted Redis with Docker (recommended)

**Already in this repo.** The `docker-compose.yml` includes a Redis service and sets `REDIS_URL=redis://redis:6379` for the API and worker.

### Your part

1. **No extra install.** Docker Compose starts Redis when you run `docker compose up -d`.
2. **Ensure `.env` exists** in the project root (for Stripe, JWT, etc.). You do **not** need to set `REDIS_URL` in `.env` if you use the Compose defaults—the compose file injects `redis://redis:6379`.
3. **Start the stack:**
   ```bash
   docker compose up --build -d
   ```
4. **Verify:** Check logs for `Redis: using plain TCP (self-hosted)`. Submit a test job (e.g. upload a short video); job status should progress and complete.

**Persistence:** The compose file uses a volume `redis-data` and `redis-server --appendonly yes`, so queue data survives container restarts.

---

## 2. Option B: Self-hosted Redis on the host (no Docker Redis)

Use this if you run the API/worker **without Docker** (e.g. systemd or PM2) or want Redis on the host and app in Docker.

### Your part

1. **Install Redis on the server** (Ubuntu/Debian):
   ```bash
   sudo apt-get update
   sudo apt-get install -y redis-server
   sudo systemctl enable redis-server
   sudo systemctl start redis-server
   ```
   Optional: enable persistence in `/etc/redis/redis.conf` (`appendonly yes`).

2. **Set `REDIS_URL`** so the app can reach Redis:
   - If API/worker run **on the same host:** `REDIS_URL=redis://localhost:6379`
   - If API/worker run **in Docker** but Redis is on the host: use the host’s IP or Docker’s host gateway, e.g. `REDIS_URL=redis://172.17.0.1:6379` (Linux) or `redis://host.docker.internal:6379` (Docker Desktop). Ensure Redis is bound to `0.0.0.0` or the Docker bridge IP so the container can connect.

3. **Restart API and worker** after setting `REDIS_URL`.

4. **Verify:** Logs should show `Redis: using plain TCP (self-hosted)`. Run a test job.

---

## 3. Option C: Upstash (managed Redis)

Use an Upstash Redis URL (TLS). The app already supports `rediss://` and sets the required options (TLS, no INFO check, etc.).

### Your part

1. Create a Redis database in the [Upstash Console](https://console.upstash.com/) and copy the **Redis URL** (starts with `rediss://`).
2. **Set in `.env`:**
   ```bash
   REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
   ```
3. **If using Docker Compose:** Remove the `REDIS_URL` line from the `environment` section of both `api` and `worker` in `docker-compose.yml` so that `.env`’s `REDIS_URL` is used (Compose currently overrides it with `redis://redis:6379`).
4. **Restart** API and worker.
5. **Verify:** Logs should show `Redis: using TLS (e.g. Upstash)`. Run a test job.

---

## 4. Migrating from Upstash to self-hosted

You can switch without losing **auth or billing**; only **job queue state** moves. Existing job IDs from Upstash will not exist in the new Redis (clients will get 404 for those IDs).

### Your part

1. **Optional—drain the queue:** Stop accepting new jobs (e.g. put the app in maintenance or wait until the queue is empty). Let current jobs finish. This avoids losing in-flight work.
2. **Install and start self-hosted Redis** (Docker as in section 1, or host install as in section 2).
3. **Set `REDIS_URL`** to the new endpoint (e.g. `redis://redis:6379` for Compose, or `redis://localhost:6379` for host Redis).
4. **If using Docker Compose:** Ensure the `REDIS_URL` in the compose `environment` for `api` and `worker` points to your self-hosted Redis (e.g. `redis://redis:6379`). If you had removed those lines to use Upstash, add them back for self-hosted.
5. **Restart API and worker:**
   ```bash
   docker compose up -d --build api worker
   ```
   (Or restart your non-Docker processes.)
6. **Verify:** Logs show `Redis: using plain TCP (self-hosted)`. New jobs get new IDs and complete normally.

---

## 5. Rollback (self-hosted → Upstash)

If you need to go back to Upstash:

1. Set `REDIS_URL` in `.env` to your Upstash `rediss://` URL.
2. If using Docker Compose and you had removed the `REDIS_URL` from the compose file to use Upstash, ensure it stays removed (so `.env` is used).
3. Restart API and worker.
4. New jobs will use Upstash. Job IDs created while on self-hosted Redis will no longer be valid (expected).

---

## 6. Quick checklist (your part)

| Step | Action |
|------|--------|
| **Dependencies** | With **Docker:** none (Redis is in the compose image). With **host Redis:** `apt-get install redis-server` (or equivalent). |
| **Config** | Set `REDIS_URL` in `.env` (or rely on Compose defaults for self-hosted). |
| **Compose** | If using Upstash with this repo’s compose, remove `REDIS_URL` from `api` and `worker` `environment` so `.env` wins. |
| **Restart** | Restart API and worker after any `REDIS_URL` change. |
| **Verify** | Check logs for `Redis: using plain TCP (self-hosted)` or `Redis: using TLS (e.g. Upstash)`; run one test job end-to-end. |

No npm or app dependency changes are required; the app already supports both self-hosted and Upstash via `REDIS_URL`.
