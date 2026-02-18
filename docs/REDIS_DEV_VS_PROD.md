# Redis: Why It Works in Dev and Not in Prod

**Production setup:** Single Hetzner server; Redis, Postgres, API, and worker all run in Docker on the same host. No separate Redis machine—everything shares one box’s CPU, memory, and disk.

## Is there duplicate Redis?

**No.** There is one Redis server. The confusion is **many Redis *connections* (clients)** from our app.

- **One Redis instance** – single `redis` container (or one Upstash URL in prod).
- **Many clients** – each connection is a TCP client to that Redis. We create several.

## Where Redis connections come from

| Source | Connections | When |
|--------|-------------|------|
| **Bull (API process)** | 6 | 2 queues × 3 each (client, subscriber, bclient). Created at startup when queues are used. |
| **Bull (worker process)** | 6 | Same: 2 queues × 3. |
| **Total persistent** | **12** | Normal for API + worker. |
| ~~Health readyz~~ | ~~1 per request~~ | Removed: we use Bull’s connection via `getTotalQueueCount()`. |
| ~~Health /ops/queue~~ | ~~1 per request~~ | Now uses `fileQueue.client.get()` – no extra connection. |
| ~~Worker heartbeat~~ | ~~1 every 30s~~ | Now uses `fileQueue.client.setex()` – no extra connection. |

So we do **not** have duplicate Redis servers or duplicate config; we have one Redis and a fixed set of Bull connections (12 in prod). Extra per-request and per-heartbeat connections have been removed.

## Why dev works and prod doesn’t

| Factor | Dev | Prod |
|--------|-----|------|
| **Processes** | Often only API (`DISABLE_WORKER=true`) → 6 connections | API + worker → 12 connections |
| **REDIS_URL** | `env.ts` rewrites `redis://redis:6379` → `redis://localhost:6379` when running on host | `redis://redis:6379` (Docker network). No rewrite. |
| **Load** | Fewer queues, fewer jobs, fewer commands | More jobs and commands, more Redis work |
| **Persistence** | Often default or none | We had RDB + AOF; RDB `fork()` can block. We switched to `--save ""` + AOF only to reduce blocking. |
| **Resources** | Laptop/desktop CPU and RAM | Container limits; Redis can be slower under memory/CPU pressure |

So in dev you usually have fewer connections, less load, and no RDB snapshots. In prod, more connections and persistence can make Redis slow to respond and hit our timeouts.

## What we changed

1. **Readyz** – No longer opens a new Redis client; uses Bull’s connection via `getTotalQueueCount()`.
2. **/ops/queue** – Reads heartbeat via `fileQueue.client.get()` instead of a new client per request.
3. **Worker heartbeat** – Uses `fileQueue.client.setex()` instead of a new client every 30s.
4. **Redis in Docker** – `--save ""` (no RDB), AOF only; healthcheck; api/worker `depends_on: redis: service_healthy`.
5. **Timeouts** – `connectTimeout` and `commandTimeout` (10s) in the shared Redis client so we don’t hang indefinitely.

## Single-host (Hetzner) note

Redis and all app containers run on the same server. Under load (e.g. worker + ffmpeg), CPU and memory are shared. Redis can respond slowly or hit timeouts if the host is busy. Use `docker stats --no-stream` and `redis-cli --latency` to confirm; consider a larger instance or splitting worker/Redis to another node if needed.

## If prod still times out

- Run `docker compose exec redis redis-cli --latency` for a few seconds and check min/max/avg.
- Check `INFO memory` and `INFO clients` in Redis.
- Run `docker stats --no-stream` to see CPU/memory of all containers.
- Ensure the Redis container has enough memory; avoid heavy swap.
- Consider a dedicated Redis host or managed Redis if the single container stays under too much load.
