# Performance Audit: Video Upload + Processing Pipeline

**Purpose:** Detailed performance breakdown for short and long videos, across devices and network conditions.  
**Scope:** Analysis and reporting only. No code changes, refactors, or optimizations.

---

## PART 1 — Full Pipeline Overview

### Lifecycle: User Selects File → Download

End-to-end steps for each tool, including I/O, Redis, disk, ffmpeg, Whisper, and Promise.all.

---

### VideoToTranscript

| Step | Phase | Operations | I/O | Redis | ffmpeg | Whisper | Promise.all |
|------|--------|------------|-----|-------|--------|---------|-------------|
| 1 | Client: file select | `handleFileSelect`, `getFilePreview` (optional) | Read file (blob) | — | — | — | — |
| 2 | Client: upload | Single: XHR POST FormData. Chunked: POST /init (JSON), POST /chunk × N (raw), POST /complete (JSON) | Network out | — | — | — | Chunked: `Promise.all(batch)` per chunk batch (2 or 4 parallel) |
| 3 | Server: receive | Single: multer `upload.single('file')` → disk. Chunked: `handleUploadChunk` → `fs.promises.writeFile(chunkPath, body)` per chunk | Disk write (tempDir or chunksDir) | — | — | — | — |
| 4 | Server: validate | `getVideoDuration` (ffprobe), `validateFileType`, `hashFile` (optional), `checkDuplicateProcessing` | Disk read, ffprobe | Redis (duplicate check if used) | ffprobe | — | — |
| 5 | Queue | `addJobToQueue` → Bull `queue.add()` | — | Redis (Bull LPUSH, job data) | — | — | — |
| 6 | Worker: pick job | Bull fetches job | — | Redis (Bull BRPOPLPUSH / job fetch) | — | — | — |
| 7 | Worker: trim (optional) | `trimVideoSegment` | Disk read/write | — | ffmpeg | — | — |
| 8 | Worker: validate duration | `validateVideoDuration` → `getVideoDuration` | Disk read | — | ffprobe | — | — |
| 9 | Worker: partial writer | `createPartialWriter(redis, jobId)`, `startDrain()` | — | — | — | — | — |
| 10 | Worker: transcription | `transcribeVideoVerbose`: getVideoDuration → extractAudio or single/parallel path | Disk read/write, createReadStream | — | extractAudio, splitAudioIntoChunks (long only) | Whisper API × 1 (short) or × N chunks (long) | Long: `Promise.all(chunkPaths.map(transcribeChunkVerbose))` |
| 11 | Worker: partial writes | `onPartial(segments)` → drain loop → `setJobPartial` | — | Redis SET job:partial:{id} (per partial) | — | — | — |
| 12 | Worker: post-transcription | `job.progress(55)`, `generateSummary` + `generateChapters` | — | — | — | — | `Promise.all([generateSummary, generateChapters])` |
| 13 | Worker: export | `fs.writeFileSync(txtPath)`, exportTranscriptJson/Docx/Pdf, archiver ZIP | Disk write (txt, json, docx, pdf, zip) | — | — | — | `Promise.all(exportPromises)` for docx/pdf |
| 14 | Worker: completion | `job.progress(100)`, `partialWriter.closeAndFlush()`, `deleteJobPartial` | — | Redis (Bull job complete, DEL partial) | — | — | — |
| 15 | Client: poll | GET /api/job/:id (with jobToken) | Network | Redis (Bull getJob, getJobPartial if active) | — | — | — |
| 16 | Client: download | GET /api/download/:filename → createReadStream | Disk read, network | — | — | — | — |

**VideoToTranscript — Summary of heavy operations**

- **Disk:** Multer write (single) or N chunk writes + /complete reassembly (read each chunk with `readFileSync`, write to one stream). Worker: extractAudio output, chunk files (long), txt/json/docx/pdf, zip.
- **Redis:** Bull job add/fetch/progress/complete; duplicate lookup (optional); job partial SET (per onPartial) and GET on each status poll when active; DEL on completion.
- **ffmpeg:** getVideoDuration (upload + worker), extractAudio, splitAudioIntoChunks (long only).
- **Whisper:** One request (short) or N parallel requests (long).
- **Promise.all:** Chunked upload (client): batches of 2 or 4 chunks; transcription (long): all chunks at once; summary+chapters: both in parallel; export: docx+pdf in parallel.

---

### VideoToSubtitles (single language)

| Step | Phase | Operations | I/O | Redis | ffmpeg | Whisper | Promise.all |
|------|--------|------------|-----|-------|--------|---------|-------------|
| 1–6 | Same as VideoToTranscript | Upload, server receive, validate, queue, worker pick | Same | Same | Same | — | Same |
| 7–9 | Trim, duration, partial | Same pattern | Same | Same | Same | — | — |
| 10 | Transcription | `transcribeVideoVerbose` (same as transcript verbose path) | Same | Same | Same | Same | Same (long: Promise.all chunks) |
| 11 | Partials | onPartial → Redis | — | SET partial | — | — | — |
| 12 | Convert | `toVTT`/`toSRT` from segments, `fs.writeFileSync(outputPath)` | Disk write (one SRT/VTT) | — | — | — | — |
| 13 | Completion | progress 80, closeAndFlush, deleteJobPartial | — | Redis | — | — | — |
| 14–16 | Poll, download | Same | Same | Same | — | — | — |

**VideoToSubtitles single —** No summary/chapters or multi-export; one subtitle file write. Otherwise same transcription and partial path as VideoToTranscript.

---

### VideoToSubtitles (multi-language)

| Step | Phase | Operations | I/O | Redis | ffmpeg | Whisper | Promise.all |
|------|--------|------------|-----|-------|--------|---------|-------------|
| 1–8 | Same | Upload through duration check | Same | Same | Same | — | — |
| 9 | No partial | multi-language path does not use partialWriter | — | — | — | — | — |
| 10 | Primary SRT | `transcribeVideo(videoPath, 'srt', ...)` — single or parallel (no verbose, no onPartial) | Same disk/ffmpeg | — | Same | Same | Long: Promise.all chunks |
| 11 | Write primary | `fs.writeFileSync(tempPrimaryPath, primarySrt)` | Disk write | — | — | — | — |
| 12 | Parse | `parseSRT(tempPrimaryPath)` → readFileSync | Disk read | — | — | — | — |
| 13 | Translate | `Promise.all(additionalLanguages.map(translateSubtitles))` | — | — | — | — | Yes (one per language) |
| 14 | Write languages | `fs.writeFileSync` per language SRT | Disk write × (1 + L) | — | — | — | — |
| 15 | ZIP | archiver for all SRTs | Disk write zip | — | — | — | — |
| 16 | Completion | progress 80, result | — | Redis Bull | — | — | — |

**VideoToSubtitles multi-language —** No partial streaming. One full transcription; then parallel translation per language; multiple disk writes and one ZIP.

---

### Flow diagram (high level)

```
[Client]                          [Server API]                    [Redis]              [Worker]
   |                                    |                            |                     |
   |  POST /api/upload (single)          |                            |                     |
   |  or POST /init → POST /chunk* →     |                            |                     |
   |  POST /complete (chunked)            |                            |                     |
   | ----------------------------------> |  multer / chunk write      |                     |
   |                                     |  getVideoDuration (ffprobe) |                     |
   |                                     |  validate, hash, duplicate? | <-- get/set         |
   |                                     |  addJobToQueue ------------ | ------------------> |
   |                                     |                            |   Bull add job      |
   | <---------------------------------- 202 jobId                    |                     |
   |                                    |                            |                     |
   |  GET /api/job/:id (poll 1.5s)       |                            |                     |
   | ----------------------------------> |  getJobById --------------- | ------------------> |
   |                                     |  getJobPartial (if active)  | <-- get             |
   | <---------------------------------- status, progress, partial    |                     |
   |                                    |                            |   Bull process      |
   |                                    |                            | ------------------> Worker
   |                                    |                            |                     | trim (optional)
   |                                    |                            |                     | validateVideoDuration
   |                                    |                            |                     | extractAudio (ffmpeg)
   |                                    |                            |                     | splitAudio (long, ffmpeg)
   |                                    |                            |                     | Whisper ×1 or ×N (Promise.all)
   |                                    |                            |                     | onPartial → setJobPartial ---> Redis SET
   |                                    |                            |                     | generateSummary + generateChapters (Promise.all)
   |                                    |                            |                     | writeFileSync (txt, json, docx, pdf), ZIP
   |                                    |                            |                     | job.progress(100), deleteJobPartial --> Redis DEL
   |                                    |                            |                     | Bull complete
   |  GET /api/job/:id                   |                            |                     |
   | ----------------------------------> |  getJobById --------------- | ------------------> |
   | <---------------------------------- status: completed, result    |                     |
   |  GET /api/download/:filename        |                            |                     |
   | ----------------------------------> |  createReadStream → pipe   |                     |
   | <---------------------------------- file stream                  |                     |
```

---

## PART 2 — Upload Performance Analysis

**Sources:** `client/src/lib/api.ts`, `server/src/routes/upload.ts`.

### 1. How upload works (single vs chunked)

- **Single (≤ 15 MB):** One XHR POST to `/api/upload` with FormData (file + options). Server uses `multer` with `diskStorage`; file is written to `tempDir` under a unique name. No chunking.
- **Chunked (> 15 MB):** Client uses `uploadFileChunked`: POST `/api/upload/init` (JSON: filename, totalSize, totalChunks, toolType, options) → POST `/api/upload/chunk` × N with raw body (binary slice) and headers `x-upload-id`, `x-chunk-index` → POST `/api/upload/complete` (JSON: uploadId). Server creates a directory per uploadId, writes each chunk to a file, then on complete reassembles into one file in tempDir and enqueues the job.

### 2. When chunking is triggered

- **Threshold:** `CHUNK_THRESHOLD = 15 * 1024 * 1024` (15 MB). Files strictly above 15 MB use chunked upload; 15 MB and below use single XHR.

### 3. Chunk upload: sequential or parallel

- **Desktop (non-mobile):** Chunks are sent in **batches** of `chunkParallel` (2 or 4). Each batch is `Promise.all(batch)`; batches are processed sequentially (for loop `i += chunkParallel`). So **up to 4 parallel** requests per batch, then next batch.
- **Mobile:** `chunkParallel = 1` → strictly **sequential** chunk uploads.

### 4. Chunks written to disk immediately

- Yes. Each POST `/api/upload/chunk` is handled by `handleUploadChunk`, which does `await fs.promises.writeFile(chunkPath, body)`. So each chunk is written to disk as soon as the request body is received.

### 5. Memory buffering

- **Client:** For each chunk, `file.slice(start, end)` gives a Blob; that Blob is sent as the fetch body. No full-file buffer in memory; chunk-sized.
- **Server:** Express `express.raw({ limit: '10mb' })` reads the chunk body into memory (Buffer) and passes it to the handler; handler writes that Buffer to disk. So one chunk (≤ 10 MB) in memory per chunk request.

### 6. Server reassembly: synchronous or not

- Reassembly runs in the `/complete` handler. It uses a **for loop** over chunk indices: for each index, `fs.readFileSync(chunkPath)` reads the chunk into a Buffer, `out.write(buf)` writes to the output stream, then `fs.unlinkSync(chunkPath)` deletes the chunk. The loop is synchronous (blocking). After the loop, `out.end()` is called; the actual “finish” and job enqueue happen in the stream’s `'finish'` callback (async). So: **synchronous read + write per chunk**; stream drain and post-processing are async.

### 7. Blocking operations

- **Single upload:** Multer writes the file (blocking from the event loop’s perspective until write completes). Then `getVideoDuration` (ffprobe), `validateFileType`, optional `hashFile`, and duplicate check can block the request.
- **Chunked:** Each chunk write is `fs.promises.writeFile` (async). On complete: **`fs.readFileSync` and `fs.unlinkSync` per chunk** are blocking; for a 300 MB file with 30 chunks that’s 30 synchronous reads and 30 sync deletes before the stream is ended.

### 8. Theoretical upload bottleneck

- **Client bandwidth:** Limits how fast bytes can be sent. Dominant for large files on slow links.
- **Server disk write speed:** Single: one large write; chunked: many small writes (could be slower on HDD). Chunk handler: one write per chunk (async).
- **Chunk assembly:** On `/complete`, sequential `readFileSync` + write + unlink per chunk blocks the event loop and can take noticeable time for many chunks (e.g. 30 × ~10 MB read/write). Can be a **bottleneck** for very large files.
- **Express middleware limit:** Chunk route uses `limit: '10mb'`; chunks must be ≤ 10 MB. No other body limit for upload.

### Upload time estimates

Assume one-way transfer time ≈ file size / (link speed in bytes/sec). Approximate:

- **100 Mbps ≈ 12.5 MB/s:**  
  - 50 MB: single, ~4 s (network).  
  - 300 MB: chunked, ~24 s (network); assembly extra (e.g. 30 chunks × ~50 ms ≈ 1.5 s).  
  - 1 GB: chunked, ~80 s (network); assembly 100 chunks × ~50 ms ≈ 5 s.
- **20 Mbps ≈ 2.5 MB/s:**  
  - 50 MB: single, ~20 s.  
  - 300 MB: chunked, ~120 s; assembly ~1.5 s.  
  - 1 GB: chunked, ~400 s; assembly ~5 s.
- **5 Mbps ≈ 0.625 MB/s:**  
  - 50 MB: ~80 s.  
  - 300 MB: ~480 s.  
  - 1 GB: ~1600 s (network dominates).

(Actual times depend on RTT, TCP behavior, server disk, and CPU for assembly.)

---

## PART 3 — Queue & Worker Analysis

**Source:** `server/src/workers/videoProcessor.ts`, queue config.

### 1. Queue type

- **Bull** (Redis-backed). Two queues: `fileQueue` ('file-processing') and `priorityQueue` ('file-processing-priority'). Both use the same `createRedisClient`.

### 2. Concurrency configuration

- **Normal:** `NORMAL_CONCURRENCY = Math.max(1, Math.min(4, parseInt(process.env.WORKER_NORMAL_CONCURRENCY || '2', 10)))` → default **2**, max 4.
- **Priority:** `PRIORITY_CONCURRENCY = Math.max(1, Math.min(2, parseInt(process.env.WORKER_PRIORITY_CONCURRENCY || '1', 10)))` → default **1**, max 2.
- So **default total concurrent jobs = 2 + 1 = 3** (matches `MAX_GLOBAL_WORKERS = 3` in queueConfig for messaging).

### 3. How many jobs can run in parallel

- Up to **NORMAL_CONCURRENCY** on the normal queue and **PRIORITY_CONCURRENCY** on the priority queue. Default: 2 + 1 = **3** jobs across both queues.

### 4. Concurrency limited

- Yes. Bull’s `queue.process(N, processJob)` limits to N concurrent handlers. No per-user concurrency in the worker; per-user limit is enforced at upload time (`limits.maxConcurrentJobs`).

### 5. Worker blocking event loop

- **Long sync work:** `processJob` uses async/await for most steps, but there are **sync** operations: `fs.writeFileSync` (txt, json, docx, pdf, SRT, etc.), `fs.readFileSync` in upload complete, and the drain loop in jobPartial uses async `setJobPartial`. The transcription service uses `createReadStream` and awaits Whisper; ffmpeg runs in a child process. So **CPU-bound blocking** is mainly from sync file I/O and any sync JSON serialization; the main heavy work (ffmpeg, Whisper) is I/O-bound or offloaded. One long `readFileSync` in /complete can block the worker process briefly.

### 6. CPU-bound vs I/O-bound stages

- **I/O-bound:** Upload receive, disk writes, Redis, Whisper API calls, ffmpeg (subprocess), download stream.
- **CPU-bound:** ZIP (archiver), DOCX (Packer.toBuffer), PDF (pdfkit), JSON.stringify; duplicate hash (read stream + crypto); reassembly loop (readFileSync + write). Summary/chapters are OpenAI API (I/O-bound from worker’s view).

### 10 users upload simultaneously

- **Upload:** All 10 hit POST /api/upload or /init. Multer or chunk writes can contend on disk; rate limit and queue checks run (getUser, getTotalQueueCount, addJobToQueue). If queue is under hard limit, 10 jobs are enqueued.
- **Processing:** Only **2 (normal) + 1 (priority)** jobs run at once. So 8 jobs wait in Redis (waiting list). Bull handles backpressure by not starting a new job until a worker finishes. So there is **backpressure**: queue grows, workers don’t exceed concurrency.
- **Priority queue:** Used when plan is Pro/Agency and total queue count > 50; then the job goes to priority queue with its own concurrency (1–2). So under high load, paid jobs can get a dedicated worker; effectiveness depends on how often queue > 50.

---

## PART 4 — Transcription Performance

**Source:** `server/src/services/transcription.ts`.

### 1. Chunk size

- **CHUNK_DURATION_SEC = 180** (3 minutes per chunk). Used by `splitAudioIntoChunks` for the parallel path.

### 2. Parallel threshold

- **PARALLEL_THRESHOLD_SEC = 150** (2.5 minutes). If `durationSec >= 150`, the parallel path is used; otherwise single-call path.

### 3. Number of chunks (3 min, 20 min, 60 min)

- **3 min (180 s):** ≥ 150 → parallel; one chunk of 180 s → **1 chunk** (effectively same as single-call workload, but via parallel path).
- **20 min (1200 s):** 1200 / 180 = 6.67 → **7 chunks**.
- **60 min (3600 s):** 3600 / 180 = **20 chunks**.

### 4. Chunks processed fully in parallel

- Yes. `transcribeVideoParallel` uses `Promise.all(chunkPaths.map((chunkPath, i) => transcribeChunkVerbose(...)))`. All chunk requests are in flight at once (no concurrency cap).

### 5. Concurrency limit

- No cap. All N chunks are sent to Whisper in parallel. Only limit is Whisper API rate limits and memory/network on the server.

### 6. Promise.all spawns all at once

- Yes. All chunk promises are created and awaited together, so all N Whisper API calls start immediately (after extract and split).

### 7. Memory impact of many parallel chunks

- Each chunk: `fs.createReadStream(chunkPath)` for the file; the stream is sent to the API. Node keeps a buffer for the stream; multiple streams and their responses (segments JSON) add up. For 20 chunks: 20 read streams, 20 in-flight HTTP requests, 20 response bodies (segment arrays). Memory scales roughly with number of chunks; for 20 chunks it’s moderate but non-trivial. No explicit limit on parallel Whisper calls.

### Is parallelism optimal?

- **Pros:** Maximizes throughput for long videos; wall-clock time is close to the slowest chunk rather than sum of chunks.  
- **Cons:** No cap can cause rate limits or memory spikes; order of completion is random so partials only advance when the “contiguous prefix” grows.

### Is chunk size optimal?

- 180 s is safe for Whisper (25 MB limit; ~3 min mono 16 kHz is within that). Smaller chunks (e.g. 60 s) would mean more chunks: more partial updates (better pseudo-streaming) but more API calls, more overhead, and more memory. Larger chunks reduce calls but fewer, coarser partials.

### Smaller chunks and streaming responsiveness

- Smaller chunks would give **more frequent** partials (one per chunk completion), so the “live” transcript would update more often. Trade-off: more Whisper calls and more Redis writes.

### Too many chunks hurting performance

- Yes, if N is large: more open streams, more concurrent HTTP requests, higher memory, and higher chance of hitting Whisper rate limits. 20 chunks is already a sizable concurrency; 60+ could be problematic without a cap or batching.

---

## PART 5 — I/O & Export Cost

**Sources:** videoProcessor, transcriptExport, transcriptSummary, upload complete.

### 1. Disk writes per job (VideoToTranscript, typical)

- Trim (if used): 1 output file.  
- extractAudio: 1 audio file.  
- splitAudioIntoChunks (long): N chunk files (later deleted in finally).  
- txt: 1.  
- json (if requested): 1.  
- docx (if requested): 1.  
- pdf (if requested): 1.  
- ZIP (if multiple outputs): 1.  
So **on the order of 5–10+** writes (excluding temp chunk deletes). VideoToSubtitles single: fewer (e.g. one SRT/VTT). Multi-language: primary SRT + one per language + ZIP.

### 2. Synchronous writes

- **Sync:** `fs.writeFileSync` used for txt, json, primary SRT, docx (after Packer.toBuffer), fixed/converted subtitle outputs, batch SRTs.  
- **Async/stream:** PDF uses `fs.createWriteStream`; ZIP uses archiver piping to a write stream; chunk upload uses `fs.promises.writeFile`.  
So many critical path writes are **synchronous**.

### 3. ZIP generation CPU

- Yes. archiver uses zlib (level 9). Compressing multiple files (txt, json, docx, pdf) is CPU-bound and can take a noticeable time for large content.

### 4. Summary/chapters sequential or parallel

- **Parallel.** `await Promise.all([includeSummary ? generateSummary(...) : …, generateChapters(...)])`. So summary and chapters run concurrently.

### 5. Could these be async or deferred

- **Async:** Replacing `writeFileSync` with `fs.promises.writeFile` would avoid blocking the event loop during writes; total time might be similar but responsiveness could improve.  
- **Deferred:** Exports (DOCX, PDF, ZIP) could be generated after returning the main result (e.g. background job or lazy download). That would shorten time-to-first-result but add complexity (e.g. “preparing download” state).

### Rough time split (order of magnitude)

- **Pure transcription:** Dominant for most jobs (Whisper latency × 1 or × N chunks). E.g. 2 min video: 30–90 s; 20 min: 60–180 s depending on parallelism.  
- **Export generation:** Summary + chapters: 2–10 s (OpenAI). DOCX/PDF: 1–5 s. ZIP: 1–10 s depending on size.  
- **File writes:** Usually 1–3 s total for sync writes unless disk is very slow.

So **transcription dominates**; then summary/chapters and exports; then file writes.

---

## PART 6 — Redis & Partial Overhead

**Source:** `server/src/utils/jobPartial.ts`.

### 1. Redis writes per job

- One SET per `onPartial` call. Short video (single-call path): **1** write. Long video: **up to N** (one per contiguous prefix update, N = number of chunks). So 1–20+ depending on duration.

### 2. Payload size per write

- `JobPartialPayload`: version (number), segments (array of { start, end, text, speaker? }), createdAt, updatedAt. Capped at **PARTIAL_SEGMENTS_CAP = 2000** segments. A segment is roughly 50–200 bytes; 2000 segments could be **~100–400 KB** per write. Response trim: **MAX_RESPONSE_BYTES = 150 KB** for GET; server trims segments from the end to fit.

### 3. Memory growth

- Worker: pendingWrites array holds payloads until the drain consumes them. Each payload is a copy of the segment array (up to 2000 segments). So briefly 1–N payloads in memory (N = number of onPartial calls before drain catches up). Growth is bounded by drain speed and how often onPartial is called.

### 4. Network overhead

- Each SET is one Redis round-trip; payload 100–400 KB. For 7 partials that’s ~0.7–2.8 MB total written to Redis. GET on each status poll (when active) reads the same key (one GET per poll). Modest compared to upload and transcription.

### 5. Blocking behavior

- `onPartial` only pushes to an in-memory array and wakes the drain; it does not await Redis. The drain loop is async and uses `await setJobPartial`. So the main job flow is not blocked by Redis; only the drain task does I/O. `closeAndFlush` awaits the drain, so completion waits for pending writes.

### Does partial streaming meaningfully impact speed?

- **Negligible.** The cost is a few Redis SETs (and GETs on poll). It does not slow transcription; it only adds a small amount of I/O and memory. The main “cost” of partial streaming is design (when partials are emitted), not raw performance.

---

## PART 7 — Client Polling & Latency

**Source:** `client/src/lib/jobPolling.ts`, VideoToTranscript doPoll.

### 1. Poll interval

- **JOB_POLL_INTERVAL_MS = 1500** (1.5 seconds).

### 2. HTTP overhead per poll

- One GET request to `/api/job/:id` (with jobToken in query or header). Server: getJobById (Bull), getJobPartial (Redis), JSON serialize response. Typical response 1–20 KB (larger when partialSegments included, up to 150 KB trimmed). One RTT + server work per poll.

### 3. Number of polls (30 s job, 2 min job)

- **30 s job:** 30 / 1.5 ≈ **20 polls** (plus immediate first poll).  
- **2 min job:** 120 / 1.5 ≈ **80 polls**.

### 4. Network overhead

- 20 polls × ~5 KB ≈ 100 KB; 80 polls ≈ 400 KB. Small compared to upload. More impactful on very slow or metered connections.

### 5. Could polling slow down UI

- No. Polling is async; it doesn’t block the UI. It could add background traffic and battery use on mobile; 1.5 s is a reasonable balance between latency and load.

---

## PART 8 — Device & Environment Impact

### 1. Low-end mobile

- **Upload:** Slower CPU for hashing/preview; chunked uses 2 MB chunks, 1 parallel → longer upload.  
- **Client:** Polling and React state updates are fine; possible memory pressure with very large result/partial.  
- **Server:** Unaffected (same worker).

### 2. High-end desktop

- **Upload:** Fast; chunked can use 10 MB, 4 parallel.  
- **Client:** No issue.  
- **Server:** Unaffected.

### 3. Server CPU

- **Matters for:** ZIP, DOCX/PDF generation, duplicate hashing, reassembly loop (readFileSync).  
- **Less for:** Whisper (API), ffmpeg (subprocess), Redis (I/O).  
So **CPU-sensitive:** export and assembly; **server-bound** for those stages.

### 4. SSD vs HDD

- **SSD:** Faster for many small writes (chunks, multiple output files) and for readFileSync in reassembly.  
- **HDD:** Random I/O and sync writes can add significant latency for chunked reassembly and multi-file exports.

### 5. Cloud vs local inference

- Current design uses **cloud Whisper API**. Local inference (e.g. faster-whisper) would move cost to server CPU/GPU and remove API latency/rate limits; that would be a different deployment and scaling model.

### Stage sensitivity

- **Device-sensitive (client):** Upload speed (CPU/network), preview/hash if done client-side.  
- **Server-sensitive:** Transcription (Whisper API or local), ffmpeg (CPU), export (CPU), disk (I/O), Redis (I/O), reassembly (CPU + disk).

---

## PART 9 — Bottleneck Identification

### Short video (e.g. &lt; 3 min)

1. **Whisper API latency** — Single blocking call; dominates end-to-end time.  
2. **Upload** — On slow links, upload time can exceed processing.  
3. **Post-transcription (summary/chapters/export)** — 5–15 s; secondary.  
4. **Sync file writes** — Small but blocks event loop.  
5. **Polling latency** — Up to 1.5 s to see completion; minor.

### Long video (e.g. 20–60 min)

1. **Whisper API (parallel)** — Wall time ≈ slowest chunk; still the main cost.  
2. **extractAudio + splitAudioIntoChunks** — ffmpeg; can be 30 s–2 min for long files.  
3. **Upload** — For 300 MB–1 GB, upload time dominates on moderate/slow links.  
4. **Chunk reassembly** — readFileSync loop for 30–100 chunks can be 2–10 s.  
5. **Export (ZIP, DOCX, PDF)** — CPU-bound; noticeable for large transcripts.

---

## PART 10 — Speed Improvement Potential

| Change | Short video | Long video | Risk (brief) |
|--------|-------------|------------|--------------|
| **Parallelism adjustment** (more workers) | Medium (throughput) | Medium (throughput) | More CPU/memory per node. |
| **Chunk size tuning** (e.g. 60 s) | Low | Medium (more partials; more API calls) | Rate limits, memory. |
| **Streaming inference** | High (if Whisper supported) | High | API/implementation change. |
| **I/O async conversion** (writeFileSync → promises) | Low (responsiveness) | Low | Low. |
| **Deferred exports** (background or on-demand) | Medium (time to first result) | Medium | UX: “preparing download”. |
| **GPU acceleration** (ffmpeg/encode) | Low | Medium (burn/compress) | Infrastructure. |
| **Smaller Whisper model** | N/A (API) | N/A | If switching to local model. |
| **Upload parallelization** (already 2–4) | Low | Medium (already parallel) | More server concurrency. |
| **CDN usage** (downloads) | Low | Low | Offload static/file delivery. |
| **Worker scaling** (horizontal) | Medium | Medium | Queue and Redis shared. |

### Improvement potential map (impact)

- **High:** Streaming inference (if available); deferred exports for time-to-first-result.  
- **Medium:** More workers; chunk size tuning for long videos; upload already parallel; worker scaling; deferred exports.  
- **Low:** Async I/O; CDN; GPU for burn/compress; smaller model only if moving off API.

### Risk of each optimization

- **Parallelism (workers):** Higher concurrency → more memory and Redis/disk contention.  
- **Chunk size smaller:** More Whisper calls and partial writes; rate limits and memory.  
- **Streaming inference:** Depends on provider; may require different pipeline.  
- **Async I/O:** Low risk; test for ordering/errors.  
- **Deferred exports:** User must wait for “download ready” or get partial result first.  
- **GPU:** Cost and ops.  
- **Upload parallelization:** Server must handle more concurrent chunk writes.  
- **Worker scaling:** Need shared Redis and possibly shared temp storage; idempotency and cleanup.

---

## Output Summary

### 1. Flow diagram

See **PART 1** (ASCII diagram: Client → Server → Redis → Worker and back).

### 2. Quantitative timing estimate (order of magnitude)

| Stage | Short (2 min) | Long (20 min) |
|-------|----------------|----------------|
| Upload (50 MB, 100 Mbps) | ~4 s | — |
| Upload (300 MB, 100 Mbps) | — | ~25 s |
| Queue + worker start | &lt; 1 s | &lt; 1 s |
| extractAudio + split | ~10–20 s | ~30–90 s |
| Whisper | ~30–90 s | ~60–180 s (parallel) |
| Summary + chapters | ~3–8 s | ~5–15 s |
| Export (txt + zip) | ~1–3 s | ~2–5 s |
| **Total (after upload)** | **~45–120 s** | **~100–300 s** |

### 3. Ranked bottlenecks

- **Short:** (1) Whisper, (2) Upload on slow link, (3) Summary/chapters/export, (4) Sync writes, (5) Poll latency.  
- **Long:** (1) Whisper (parallel), (2) extractAudio/split, (3) Upload, (4) Reassembly, (5) Export.

### 4. Improvement potential map

- High: streaming inference, deferred exports.  
- Medium: worker concurrency, chunk size (long), upload (already parallel), scaling.  
- Low: async I/O, CDN, GPU for non-transcription.

### 5. Risk of each optimization

Summarized in the table in **PART 10** (parallelism, chunk size, streaming, async I/O, deferred exports, GPU, upload, scaling).

---

### 6. Pipeline performance upgrade and validation

A production-safe pipeline upgrade (async I/O, single-pass audio, deferred summary, progress interpolation, streaming reassembly, worker concurrency, timing metrics) is implemented behind feature flags. For validation and rollout steps, see **docs/PIPELINE_PERFORMANCE_VALIDATION.md**.

---

*End of performance audit. No implementation or code changes.*
