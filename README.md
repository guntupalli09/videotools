# VideoTools - Phase 0

Professional video utilities platform. Phase 0 includes foundation setup, UI components, and backend infrastructure with dummy job processing.

## Prerequisites

- Node.js (v18+)
- Docker Desktop (for Redis) - [Download here](https://www.docker.com/products/docker-desktop/)
- FFmpeg (installed but not used in Phase 0)

**Note:** If you don't have Docker, you can install Redis locally instead (see Alternative Setup below).

## Setup

### 1. Install Dependencies

```bash
# Client
cd client
npm install

# Server
cd ../server
npm install
```

### 2. Start Redis

**Option A: Using Docker (Recommended)**

If you have Docker Desktop installed:
```bash
# Modern Docker (uses space, not hyphen)
docker compose up -d

# OR if you have older Docker Compose standalone:
docker-compose up -d
```

**Option B: Install Redis Locally (Alternative)**

If you don't have Docker, you can install Redis directly:
- **Windows:** Download from [Redis for Windows](https://github.com/microsoftarchive/redis/releases) or use WSL
- **macOS:** `brew install redis` then `brew services start redis`
- **Linux:** `sudo apt-get install redis-server` then `sudo systemctl start redis`

Make sure Redis is running on `localhost:6379`

### 3. Environment Variables

Copy `.env.example` to `.env` in the server directory and update if needed:

```bash
cp .env.example server/.env
```

### 4. Start Development Servers

**Terminal 1 - Client:**
```bash
cd client
npm run dev
```

**Terminal 2 - Server:**
```bash
cd server
npm run dev
```

The client will be available at `http://localhost:3000` and the server at `http://localhost:3001`.

## Project Structure

```
videotools/
├── client/          # React + Vite frontend
├── server/          # Express backend
├── docker-compose.yml
├── .env.example
└── README.md
```

## Features (Phase 0)

- ✅ Complete UI with all components
- ✅ Homepage with all sections
- ✅ 6 tool placeholder pages
- ✅ File upload UI (no processing)
- ✅ Dummy job queue system
- ✅ File validation (size, type, magic bytes)
- ✅ Rate limiting
- ✅ Auto file cleanup

## Testing

### Test File Upload

```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@test-video.mp4"
```

Should return: `{ "jobId": "...", "status": "queued" }`

### Check Job Status

```bash
curl http://localhost:3001/api/job/{jobId}
```

### Check Redis

**If using Docker:**
```bash
docker exec -it videotools-redis redis-cli
> KEYS *
# Should see Bull queue keys
```

**If using local Redis:**
```bash
redis-cli
> KEYS *
# Should see Bull queue keys
```

## Production: Vercel (frontend) + Hetzner (API)

- **Frontend on Vercel** does **not** call the Vercel URL for the API. It calls whatever URL you set in **`VITE_API_URL`** (your backend).
- **In production:** Deploy the API (Docker stack) on Hetzner. Put a reverse proxy + domain in front (e.g. `https://api.yourdomain.com`). In **Vercel** → Project → Settings → Environment Variables, set **`VITE_API_URL`** = `https://api.yourdomain.com` (no `/api` suffix; the client adds `/api` where needed). Redeploy the frontend so the build picks up the variable.
- **localhost:3001 / 3002** are for **local development only**. Keep the fallback in code as-is (`http://localhost:3001/api`). When you run the API in Docker locally, use **`http://localhost:3002`** (or set `VITE_API_URL=http://localhost:3002` in `client/.env.local`). In production you never use localhost.

See **`deploy/README.md`** for Hetzner Docker deployment.

### Next steps (Railway → Hetzner migration)

- **Railway-specific files removed:** `railway.json` and `server/nixpacks.toml` are deleted; the backend is Docker-only for Hetzner. No Railway config remains.
- **Hetzner:** There is nothing named “Hetzner” to install. Hetzner Cloud is a VPS provider. You create an account, create a server (e.g. Ubuntu 22.04), and run Docker on it (see `deploy/README.md`). The **CX43** plan has a monthly fee (around €11–12); you pay for the VM, not for “Hetzner software.”
- **What to do when ready for production:** 1) Sign up at [hetzner.com/cloud](https://www.hetzner.com/cloud); 2) Create a server (e.g. CX43, Ubuntu 22.04); 3) SSH in and follow `deploy/README.md` (install Docker, copy project + `.env`, `docker compose up -d`); 4) Point a domain (or IP) at the server and set `VITE_API_URL` on Vercel to that URL.

## Notes

- **No real video processing** in Phase 0
- **No API calls** to OpenAI/Stripe
- **No authentication** system
- All tool pages show "Tool processing coming in Phase 1"

## Next Steps

Phase 0 is complete. Wait for explicit approval before proceeding to Phase 1.
