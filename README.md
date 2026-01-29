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

## Notes

- **No real video processing** in Phase 0
- **No API calls** to OpenAI/Stripe
- **No authentication** system
- All tool pages show "Tool processing coming in Phase 1"

## Next Steps

Phase 0 is complete. Wait for explicit approval before proceeding to Phase 1.
