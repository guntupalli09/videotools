# End-to-end test checklist

Use this after starting **Docker** (postgres + redis), **server** (`npm run dev` in `server`), and **client** (`npm run dev` in `client`).

## 1. API + worker (automated)

From `server` folder, with optional `server/scripts/verify-credentials.env` (AUTH_EMAIL, AUTH_PASSWORD):

```bash
node scripts/verify-video-upload.js "C:\path\to\your\video.mp4"
```

- **All checks passed** = upload (anon + signed-in), jobToken, and poll work.
- If you see "Where to see transcript / subtitles" with URLs, open those in the browser to confirm downloads.

## 2. Browser (manual)

1. **Open the app**  
   - Prefer: http://localhost:3000 (Vite dev server with API proxy to 3001).  
   - If 3000 is in use, Vite may show http://localhost:3001 or 3002; use that URL.

2. **Transcript tool**  
   - Go to **Video to Transcript**.  
   - Upload a short video (e.g. MP4, MOV, AVI, WEBM).  
   - Wait for: Preparing → Uploading → Processing → Completed.  
   - You should see the transcript text and download option.

3. **Subtitles tool**  
   - Go to **Video to Subtitles**.  
   - Upload the same or another video.  
   - Wait for Processing → Completed.  
   - You should see subtitle preview and download (e.g. SRT/VTT).

4. **If stuck on "Processing"**  
   - Ensure you’re on the same tab that started the upload (jobToken is in sessionStorage).  
   - Refresh and re-upload once; the fix sends jobToken when polling so status should update.

## 3. Ports

| Port  | Service        | Notes                                  |
|-------|----------------|----------------------------------------|
| 3000  | Client (Vite)   | Use this so /api proxies to 3001.     |
| 3001  | Server (API)    | Must be free for the client proxy.     |
| 5433  | Postgres (host)| Docker map; server uses 5433.          |
| 6379  | Redis          | Docker; worker uses it for the queue. |

If the client reports "Port 3000 is in use", either close the app using 3000 or use the port Vite prints (e.g. 3002) and open that URL; the API proxy target is still 127.0.0.1:3001.
