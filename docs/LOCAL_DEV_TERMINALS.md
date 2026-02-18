# Local dev: three terminals

Open **three terminals** (in Cursor: Terminal → New Terminal, or split the panel). Run the following in order.

---

## Terminal 1 – Docker (Postgres + Redis)

**Where:** Project root (`I love Video`)

1. Open a terminal.
2. Go to project root:
   ```cmd
   cd "c:\Users\gvksg\Desktop\I love Video"
   ```
3. Start Postgres and Redis:
   ```cmd
   docker-compose up -d postgres redis
   ```
4. Leave this terminal open. You only need to run the command once (or after a restart). To stop later: `docker-compose down`.

---

## Terminal 2 – Server (API + worker)

**Where:** `server` folder

1. Open a **second** terminal.
2. Go to server:
   ```cmd
   cd "c:\Users\gvksg\Desktop\I love Video\server"
   ```
3. Start the server:
   ```cmd
   npm run dev
   ```
4. Wait until you see “Server listening” and “Background worker started”.
5. Leave this running. The app and verification script use `http://localhost:3001`.

---

## Terminal 3 – Scripts and one-off commands

**Where:** Usually `server`, sometimes project root

Use this terminal for:

- **Seed test user** (after a DB reset):
  ```cmd
  cd "c:\Users\gvksg\Desktop\I love Video\server"
  npx tsx scripts/seed-test-user.ts
  ```
- **Verification script** (video upload + login test):
  ```cmd
  cd "c:\Users\gvksg\Desktop\I love Video\server"
  node scripts/verify-video-upload.js "C:\Users\gvksg\Desktop\samples\Red Lights 2012 brrip (MA).avi"
  ```
- **Prisma migrate** (after first time or schema change):
  ```cmd
  cd "c:\Users\gvksg\Desktop\I love Video\server"
  npx prisma migrate deploy
  ```
- **Docker from project root** (if you didn’t use Terminal 1):
  ```cmd
  cd "c:\Users\gvksg\Desktop\I love Video"
  docker-compose up -d postgres redis
  ```

---

## Quick checklist

| Terminal | Command / role              | When to run      |
|----------|-----------------------------|------------------|
| 1        | `docker-compose up -d postgres redis` | Once per dev session |
| 2        | `npm run dev` (in `server`) | Keep running     |
| 3        | Seed, verify, prisma, etc. | When needed      |

**Order:** Start Terminal 1 (Docker), then Terminal 2 (server). Use Terminal 3 anytime for scripts.
