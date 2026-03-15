# Claude Code Prompt: YouTube-to-Transcript Full-Stack Flow & Fixes

Use this prompt with Claude (or similar AI) to understand the YouTube transcript pipeline and request fixes.

---

## Context

VideoText is a video transcription app. One flow lets users paste a YouTube URL and get a transcript without uploading any file. The UI is a React SPA; the backend is Node/Express with a Bull queue worker. YouTube jobs use a **3-stage pipeline**: caption fetch → audio download (fallback) → transcription.

---

## 1. UI Flow (Client)

### Entry
- **Page**: `VideoToTranscript.tsx` (routes: `/video-to-transcript`, `/youtube-to-transcript`)
- **Input mode**: User selects "YouTube URL" tab (`inputMode: 'youtube'`), pastes a URL in `youtubeUrlInput`
- **Submit**: User clicks "Get Transcript" → calls `submitYoutubeUrl()` from `client/src/lib/api.ts`

### `submitYoutubeUrl()`
- **Endpoint**: `POST /api/upload/youtube`
- **Body**: `{ youtubeUrl, toolType: 'video-to-transcript', includeSummary, includeChapters, exportFormats, ... }`
- **Response**: `{ jobId, status: 'queued', jobToken, youtubeTitle, youtubeThumbnailUrl, youtubeDurationSec }`
- The server validates the URL, fetches metadata (YouTube Data API or yt-dlp), enqueues the job, and returns immediately—no file upload.

### Polling
- After submit, UI calls `subscribeJobStatus(jobId, { jobToken }, handleJobStatus)` (or falls back to polling)
- **Status endpoint**: `GET /api/job/:jobId?jobToken=...` (every ~1.5s or via SSE ~400ms)
- **Response shape**: `{ status: 'queued' | 'processing' | 'completed' | 'failed', progress: 0–100, result?, queuePosition?, partialSegments?, partialTranscript? }`

### UI State
- **queued** / **processing** → show `ProcessingInterface` with progress bar, partial transcript (if any)
- **completed** → show `TranscriptResult` with download links
- **failed** → show `FailedState` with `failedMessage` (from `getFailureMessage()`)
- Progress can stay at **0%** for a long time if the worker hasn’t reported progress yet (e.g., during caption fetch)

### Key files
- `client/src/pages/VideoToTranscript.tsx` — main page, submit + polling
- `client/src/lib/api.ts` — `submitYoutubeUrl`, `getJobStatus`, `subscribeJobStatus`
- `client/src/lib/jobPolling.ts` — `getJobLifecycleTransition`, `JOB_POLL_INTERVAL_MS`

---

## 2. Server Flow (API)

### POST /api/upload/youtube (`server/src/routes/upload.ts`)
1. Validate `youtubeUrl` with `isValidYoutubeUrl()`
2. Fetch metadata: `getYoutubeMetadata()` (YouTube Data API v3 or yt-dlp `--dump-json`)
3. Enforce plan/rate limits
4. Call `addJobToQueue()` with `toolType: 'youtube-to-transcript'`

### addJobToQueue (videoProcessor)
- With `YOUTUBE_QUEUE_SEPARATION=true`: job goes to **captionQueue** (`youtube-caption-v2`)
- Job data: `youtubeUrl`, `youtubeTitle`, `youtubeThumbnailUrl`, `youtubeDurationSec`, `youtubeDefaultLanguage`, `jobToken`, etc.

### GET /api/job/:jobId (`server/src/routes/jobs.ts`)
- `getJobById(jobId)` searches: priorityQueue → fileQueue → captionQueue → audioQueue → transcriptionQueue
- For YouTube hand-offs: when caption job completes with `__handedOff`, it skips that job and looks in the next queue (audio or transcription)
- Returns `buildJobStatusPayload()`: status, progress, result, queuePosition, partialSegments

### Key files
- `server/src/routes/upload.ts` — YouTube endpoint
- `server/src/routes/jobs.ts` — job status, SSE
- `server/src/workers/videoProcessor.ts` — queues, addJobToQueue, getJobById

---

## 3. Worker Flow (Bull Queues)

### Feature flag
- `YOUTUBE_QUEUE_SEPARATION=true` (env) enables the 3-queue pipeline

### Queue pipeline
1. **captionQueue** (`youtube-caption-v2`) — concurrency 20
2. **audioQueue** (`youtube-audio-v2`) — concurrency 4
3. **transcriptionQueue** (`youtube-transcription-v2`) — concurrency 2

### Caption worker (`processCaptionJob`)
1. Call `fetchYoutubeCaptions()` — tries: timedtext API → player API (WEB) → player API (ANDROID, TVHTML5, IOS in parallel) → yt-dlp
2. Validate captions with `validateCaptionQuality()`
3. **If valid**: set `precomputedTranscript`, hand off to `processJob()` (video-to-transcript) → completes with result
4. **If invalid/missing**: hand off to **audioQueue** with `toolType: 'youtube-audio-to-transcript'`

### Audio worker (`processAudioJob`)
1. `streamYoutubeAudioToFile()` — yt-dlp + FFmpeg to 16 kHz mono WAV
2. Hand off to **transcriptionQueue** with `toolType: 'video-to-transcript'`, `filePath` pointing to WAV

### Transcription worker (`processTranscriptionJob`)
- Runs `processJob()` — same as file uploads: Whisper transcription, summary, chapters, export

### Hand-off semantics
- Caption/audio jobs return `HANDED_OFF = { __handedOff: true }` so `getJobById` knows to look in the next queue
- Same `jobId` is reused across queues via `jobId: data.jobToken`

### Key files
- `server/src/workers/videoProcessor.ts` — processCaptionJob, processAudioJob, processTranscriptionJob
- `server/src/services/youtube.ts` — fetchYoutubeCaptions, validateCaptionQuality, streamYoutubeAudioToFile
- `server/src/utils/featureFlags.ts` — YOUTUBE_QUEUE_SEPARATION

---

## 4. Known Issues

### A. Job stalled more than allowable limit
- Bull marks jobs as “stalled” when the lock expires before the worker renews it
- Fix applied: `lockDuration: 600000`, `lockRenewTime: 15000`, `maxStalledCount: 3` for caption/audio queues
- If still occurring: verify worker logs show `captionLockDurationMs: 600000`; rebuild image if not

### B. Progress stuck at 0%
- Caption worker may not call `job.progress()` until caption fetch completes
- Transcription worker updates progress (5 → extraction → Whisper → done)
- UI shows progress from `job.progress()`; if caption fetch takes >30s, user sees 0% for that duration

### C. getJobById during hand-off
- When caption job completes with `__handedOff`, `getJobById` skips it and looks in audioQueue
- If the audio job hasn’t been picked up yet, job may be in audio `waiting` — should still find it
- Edge case: job could be briefly “missing” between queues if Redis delay

### D. YouTube captions “should be instant”
- YouTube provides captions via timedtext API (1–3s when available)
- Current order: timedtext first → WEB player → ANDROID+TVHTML5+IOS in parallel → yt-dlp
- If still slow, check network, YouTube rate limits, or timedtext availability per video

---

## 5. Ask for Fixes

Given this full-stack flow:

1. **Progress visibility**: Can we show a more informative state during caption fetch (e.g. “Fetching captions…”) instead of a generic progress bar at 0%? Consider passing a `phase` or `stage` from the worker (e.g. `caption` | `audio` | `transcribing`) to the status API.

2. **Stalled-job resilience**: If jobs still stall after the lock settings, propose additional mitigations (e.g. sandboxed processors, shorter lockRenewTime, or breaking caption fetch into smaller steps).

3. **Hand-off UX**: When the job moves from caption → audio → transcription, the UI doesn’t reflect the stage. Should we expose `toolType` or a `stage` in the job status so the UI can show “Downloading audio…” vs “Transcribing…”?

4. **Error surfacing**: When caption fetch fails and we fall back to audio, the user sees no indication. When audio download fails (e.g. yt-dlp blocked), the error may be generic. Propose how to surface clearer, user-facing messages for YouTube-specific failures.

5. **Any other bugs or UX improvements** you identify from this flow.

---

## File Reference

| Layer | Key Files |
|-------|-----------|
| UI | `client/src/pages/VideoToTranscript.tsx`, `client/src/lib/api.ts`, `client/src/lib/jobPolling.ts` |
| API | `server/src/routes/upload.ts`, `server/src/routes/jobs.ts` |
| Worker | `server/src/workers/videoProcessor.ts`, `server/src/services/youtube.ts` |
| Config | `server/src/utils/featureFlags.ts`, `server/src/utils/redis.ts` |
