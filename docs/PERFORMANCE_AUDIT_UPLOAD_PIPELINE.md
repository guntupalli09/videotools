# Performance Audit: Upload → Processing → Transcription Pipeline

**Senior performance engineer audit. No code modified. Analysis and recommendations only.**

---

## 1. Audit findings

### 1.1 Frontend audit

#### File selection to network request (trace)

| Step | Location | Evidence |
|------|----------|----------|
| 1. User selects file | `client/src/components/FileUploadZone.tsx` | `useDropzone({ onDrop, accept, maxSize })` (lines 42–50). On drop/select, `onDrop(acceptedFiles)` runs; single-file path calls `onFileSelect?.(acceptedFiles[0])` (lines 31–34). The `File` object is the raw browser `File` reference. |
| 2. Page stores file and starts upload | `client/src/pages/VideoToTranscript.tsx` | `FileUploadZone` receives `onFileSelect={handleFileSelect}` (line 767). On submit, page calls `uploadFileWithProgress(selectedFile, { toolType: VIDEO_TO_TRANSCRIPT, ... }, { onProgress, connectionSpeed })` (lines 306–319). Same pattern in `VideoToSubtitles.tsx` with `uploadFileWithProgress`. |
| 3. API layer builds request | `client/src/lib/api.ts` | `uploadFileWithProgress()` (line 394+): if `file.size > CHUNK_THRESHOLD` (15 MB) it calls `uploadFileChunked()`; otherwise builds `formData = buildUploadFormData(file, options)` and sends via XHR to `POST /api/upload`. |
| 4a. Small file: raw file in body | `client/src/lib/api.ts` | `buildUploadFormData()` (lines 96–124): `formData.append('file', file)` (line 97). The `file` is the same `File` passed from the page. XHR: `xhr.send(formData)` — entire raw video sent in one multipart request. |
| 4b. Large file: raw chunks | `client/src/lib/api.ts` | `uploadFileChunked()` (lines 255–403): `blob = file.slice(start, end)` (line 333), then `fetch(API_ORIGIN + '/api/upload/chunk', { body: blob })` (lines 337–346). Chunks are raw byte ranges of the original file; no re-encoding. After all chunks, `POST /api/upload/complete` with `{ uploadId }`; server assembles and enqueues job. |

**Proof (exact locations):**

- Raw file in FormData: `client/src/lib/api.ts` line 97 — `formData.append('file', file)`.
- Raw chunks: `client/src/lib/api.ts` lines 331–333 — `const start = chunkIndex * chunkSize`, `const end = Math.min(start + chunkSize, file.size)`, `const blob = file.slice(start, end)`; line 344 — `body: blob`.

#### Where the raw video (or chunks) are uploaded

- **Single POST (≤15 MB):** The whole `File` is sent as the `file` field of `multipart/form-data` to `POST /api/upload`. Size on the wire = `file.size`.
- **Chunked (>15 MB):** The file is split by `file.slice(start, end)`; each slice is sent as `application/octet-stream` to `POST /api/upload/chunk`. Total bytes sent = `file.size`. Assembly is server-side; the job receives one reconstituted file path.

#### Client-side media processing

- **Audio extraction:** None. Grep over `client/src` for `ffmpeg`, `MediaRecorder`, `transcode`, or decode APIs: **no matches**. The only use of `createObjectURL` on a video file is in `client/src/lib/uploadPreflight.ts` (lines 27–50) for `getVideoDurationSeconds()`: a `<video preload="metadata">` is used to read duration only; the file is not decoded, re-encoded, or sent in a different form.
- **Compression / transcoding:** None. No client-side codec or container conversion. The same bytes the user selected are uploaded (either whole or as slices).

**Conclusion (frontend):** File selection passes a single `File` reference to the page; the API layer either sends that file whole (FormData) or as raw slices (chunked). No client-side media processing exists. Upload payload size = original file size.

---

### 1.2 Backend audit

#### Upload ingestion to job queue

| Step | Location | Evidence |
|------|----------|----------|
| 1. Single-file upload | `server/src/routes/upload.ts` | `router.post('/', upload.single('file'), async (req, res) => { ... })` (line 60). Multer writes to temp dir; file path in `req.file.path`. |
| 2. Validation and job enqueue | Same file | After validation (type, size, optional duplicate check), `addJobToQueue(plan, { toolType, filePath: req.file.path, userId, plan, originalName: req.file.originalname, fileSize: req.file.size, ... })` (lines 297–306). Job payload includes `filePath` (and for chunked, same shape with `filePath: outPath` from assembled file at line 618). |
| 3. Chunked flow | Same file | `POST /api/upload/init` → creates `uploadId` and chunk dir. `POST /api/upload/chunk` (handler `handleUploadChunk`) writes raw body to `chunk_${index}`. `POST /api/upload/complete` (lines 419–453) reads chunks in order, streams to one file `outPath`, then calls `addJobToQueue(meta.plan, { toolType, filePath: outPath, ... })` (lines 616–625). |
| 4. Queue and worker | `server/src/workers/videoProcessor.ts` | `addJobToQueue()` (from `upload.ts`) adds to Bull queue. Worker `processJob()` reads `data.filePath` (e.g. line 260 for `video-to-transcript`). That path is the on-disk video file (or trimmed/URL-downloaded variant). |

**Proof:** `server/src/routes/upload.ts` line 299 — `filePath: req.file.path`; line 618 — `filePath: outPath`. Worker line 260 — `let videoPath = data.filePath!`.

#### Where ffmpeg / audio extraction occurs

| Location | Evidence |
|----------|----------|
| Extraction implementation | `server/src/services/ffmpeg.ts` lines 73–98: `export function extractAudio(videoPath, outputPath, onProgress?)`. Uses `ffmpeg(videoPath)` with `.outputOptions(['-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5'])` — no video, MP3, 16 kHz mono. |
| Callers | `server/src/services/transcription.ts` line 5: `import { extractAudio, getVideoDuration, splitAudioIntoChunks } from './ffmpeg'`. Short path (lines 111–114): `await extractAudio(videoPath, audioPath)` then `fs.createReadStream(audioPath)` to Whisper. Long path (lines 65–69): `transcribeVideoParallel()` calls `await extractAudio(videoPath, audioPath)` then `splitAudioIntoChunks(audioPath, ...)`. `server/src/services/diarization.ts` also imports and uses `extractAudio`. |

**Conclusion:** Audio extraction happens **only on the server**, in `ffmpeg.ts`; transcription and diarization call it before Whisper.

#### Where Whisper is called and with what input

| Location | Input type to Whisper | Evidence |
|----------|------------------------|----------|
| `server/src/services/transcription.ts` | **Audio** (stream of extracted MP3) | Short path (lines 111–122): after `extractAudio(videoPath, audioPath)`, `const audioFile = fs.createReadStream(audioPath)`; `openai.audio.transcriptions.create({ file: audioFile, ... })`. Long path: `transcribeChunkVerbose(chunkPath, ...)` (lines 36–55) — `chunkPath` is a segment of the extracted audio; `createReadStream(chunkPath)` passed to Whisper. `transcribeVideoVerbose()` (lines 153–201) same pattern: extract to `audioPath`, then stream that audio to Whisper. |
| Worker | Passes **video** path to transcription service | `server/src/workers/videoProcessor.ts`: `transcribeVideo(videoPath, ...)`, `transcribeVideoVerbose(videoPath, ...)`, `transcribeWithDiarization(videoPath, ...)`. The **API** to the transcription layer is video path; internally the service converts video → audio and sends **audio** to Whisper. |

**Conclusion:** Whisper is always invoked with **audio** (extracted server-side). The worker passes a **video** path; the transcription service extracts audio and then calls Whisper.

---

## 2. Bottleneck analysis

### 2.1 Flow and file sizes

- **Upload:** User sends `file.size` bytes (raw video). On a typical connection (e.g. 10 Mbps up), 100 MB ≈ 80 s, 500 MB ≈ 400 s. Chunking and parallelism improve throughput but do not reduce payload size.
- **Server receive:** Multer writes to disk (or chunks are written then concatenated). I/O is fast relative to network.
- **Queue wait:** Depends on concurrency and other jobs; variable.
- **Processing (transcription path):** (1) Optional trim. (2) `extractAudio(videoPath, audioPath)` — FFmpeg decode + encode to 16 kHz mono MP3; CPU-bound, scales roughly with duration. (3) Whisper API call(s) — network + OpenAI compute; scales with audio length. (4) Post-processing (summary, chapters, export, etc.).

### 2.2 Dominant latency contributors

- **Large files (e.g. 100 MB–1 GB+):** **Upload (network)** dominates. Bytes sent = full video size. No client-side reduction. Upload time grows linearly with file size; processing time grows roughly with **duration** (and audio extraction + Whisper are optimized for speech, not for raw video size). So for a 500 MB, 10-minute video: upload can be several minutes; processing (extract + Whisper) is often on the order of 1–3 minutes. **Network is the dominant cost.**
- **Small files (e.g. &lt;20 MB):** Upload may be a few seconds to tens of seconds. Processing (extract + Whisper) can be comparable or larger. **Both network and compute matter;** for very small files, compute can dominate.
- **Why upload dominates for typical “large” use cases:** (1) Full video is uploaded (no size reduction). (2) Video bitrates (e.g. 5–15 Mbps) are much higher than the audio needed for Whisper (16 kHz mono ≈ 32–64 kbps equivalent). (3) So the user sends 10–100× more bytes than necessary for the transcription pipeline. (4) Server then throws away most of those bytes (video) and keeps only the extracted audio for Whisper.

### 2.3 Bottleneck summary

| Scenario | Dominant bottleneck | Reason |
|----------|----------------------|--------|
| Large video (e.g. 100 MB+, 5–30 min) | **Network (upload)** | Full video uploaded; upload time ∝ file size; processing time ∝ duration. For typical bitrates, upload time exceeds processing time. |
| Small video (&lt;15 MB, short) | **Mixed or compute** | Upload fast; extraction + Whisper can be a large share of total time. |
| All cases | **No client-side reduction** | Payload size = original file size; any upload optimization must reduce bytes sent. |

---

## 3. Proposed optimization architecture (no code)

### 3.1 Idea: browser-side audio extraction / compression

- **Goal:** Reduce bytes sent over the network by sending only (or primarily) audio, or a much smaller representation of the content, instead of the full video.
- **Where it fits:** Between **file selection** and **network request**. After the user selects a file and before `uploadFileWithProgress` / `uploadFileChunked` is called, the frontend would run a client-side “preparation” step that produces a smaller blob (e.g. audio-only) and optionally keeps metadata (duration, original name) for the backend.

### 3.2 Where in the frontend flow it would hook in

- **Current:** FileUploadZone → page state (`selectedFile`) → on submit → preflight (duration/size) → `uploadFileWithProgress(selectedFile, ...)`.
- **Proposed hook:** After preflight and before `uploadFileWithProgress`, the app would:
  1. Check if “optimized upload” is available (e.g. support for the required APIs — see fallback below).
  2. If yes: run browser-side extraction/compression on `selectedFile`, producing a new blob (e.g. audio) and metadata.
  3. Upload **that** blob (and metadata) instead of the original file.
  4. Backend would then receive audio (or a small asset) and either skip extraction or do a light normalization before Whisper.

So the hook is: **between “user confirmed submit” and “first byte of upload”**, with a clear fallback path that keeps the current “upload raw file” behavior.

### 3.3 File format and bitrate (conceptual)

- **Target for transcription:** Input to Whisper is audio. Server today uses 16 kHz mono MP3. So the ideal client-produced asset for this pipeline is **audio-only**, in a format Whisper accepts (e.g. MP3, or format convertible with minimal server work).
- **Suggested format:** Mono (or stereo downmixed to mono) **MP3** or **WebM/Opus** at **16 kHz** (or 48 kHz if the backend can resample) to align with server’s current `extractAudio` output (16 kHz mono). Bitrate: **32–64 kbps** is sufficient for speech; 64 kbps is a safe default. That yields roughly 0.5–1 MB per minute of audio vs. 5–50+ MB per minute for video — order-of-magnitude reduction.
- **Optional:** If the product must support “video in, video out” (e.g. burn subtitles), the backend could still accept “audio-only” for **transcript/subtitles-only** jobs and “full video” for others; or accept both and choose path by job type.

### 3.4 Backend changes required (conceptual)

- **New or extended contract:** Accept an upload that is **audio-only** (or a “pre-extracted” asset) for `video-to-transcript` and `video-to-subtitles`, with a flag or content-type indicating “already audio.” Then:
  - **If “already audio”:** Skip `extractAudio`; optionally normalize (resample/convert) to 16 kHz mono if needed; pass the result to Whisper. No FFmpeg extraction step for that path.
  - **If “video” (current):** Keep current behavior: save to temp, extract audio with FFmpeg, then Whisper.
- **Validation and limits:** Apply duration/size limits to the uploaded blob (audio duration can be inferred or sent as metadata). Plan limits (e.g. max minutes) still apply.
- **Diarization / trim:** If diarization or trim is requested and the client sent audio-only, trim can be done on audio; diarization already works on audio. URL-based and “burn subtitles” flows remain video-based.

### 3.5 Fallback if browser processing fails

- **When to fall back:** If the browser does not support the required APIs (e.g. Web Audio, MediaRecorder, or offscreen decode), or if extraction fails (unsupported codec, corrupt file, timeout), or if the user opts out of “optimized upload.”
- **Fallback behavior:** Do not block the user. Skip client-side extraction; upload the **original file** as today (same `uploadFileWithProgress` / chunked path). Backend receives video and runs the current pipeline (extract + Whisper). UX: user may see “Preparing…” then “Uploading…” with a longer upload time for large files, but the job still completes.
- **Detection:** Feature-detect the APIs used for extraction (e.g. `createObjectURL`, decode in AudioContext or similar, or use of a library that wraps them). If unavailable or extraction errors, set a flag and use the existing upload path with the raw `File`.

---

## 4. Time and UX impact estimate

### 4.1 Assumptions (realistic)

- **Connection:** 10 Mbps upload (home broadband).
- **Video examples:**  
  - A: 100 MB, 10 min (≈1.3 Mbps video).  
  - B: 300 MB, 30 min (≈1.3 Mbps).  
  - C: 50 MB, 5 min.
- **Audio-only (optimized):** 16 kHz mono, ~64 kbps → ~4.8 MB per 10 min → ~14.4 MB for 30 min, ~2.4 MB for 5 min.
- **Processing (server):** Assume extraction ~0.5–1× realtime, Whisper ~0.3–0.5× realtime; total processing ~1–2 min for 10 min video, ~3–5 min for 30 min. (Optimized path skips extraction; Whisper time unchanged.)

### 4.2 Before vs after (conceptual)

| Metric | Current (100 MB, 10 min) | Optimized (upload ~5 MB audio) | Current (300 MB, 30 min) | Optimized (upload ~15 MB audio) |
|--------|---------------------------|----------------------------------|---------------------------|----------------------------------|
| Upload time | ~80 s | ~4 s | ~240 s | ~12 s |
| Server extraction | ~30–60 s | 0 s (skip) | ~90–120 s | 0 s |
| Whisper | ~30–60 s | ~30–60 s | ~90–150 s | ~90–150 s |
| **Total (upload + processing)** | **~140–200 s** | **~35–65 s** | **~420–510 s** | **~102–162 s** |
| Upload time reduction | — | **~95%** | — | **~95%** |
| Total job time reduction | — | **~60–70%** | — | **~70–75%** |

(Figures are illustrative; actual numbers depend on connection, server load, and Whisper latency.)

### 4.3 Server cost reduction

- **CPU:** No FFmpeg extraction for the “audio-only” path → meaningful reduction in CPU per job for transcription/subtitles (extraction is CPU-heavy). For a large share of transcript/subtitle jobs, this could remove 20–40% of server-side compute per job.
- **I/O and storage:** Smaller uploads mean less temp file write and less disk usage per job; shorter retention of large files.
- **Bandwidth:** Server receives ~5–15 MB instead of 100–300 MB for typical long-form videos → large reduction in ingress bandwidth per job.

---

## 5. Final recommendation

### 5.1 “Will this implementation materially save time and improve UX?”

**Yes, for the common case of “user uploads a large video for transcription or subtitles.”**

- **Time:** Upload time can drop by **~90–95%** for large files (e.g. 100–300 MB) because only a few MB of audio are sent instead of the full video. Total time from “Submit” to “Result” can drop by **~60–75%** for those jobs, with the biggest gain on slow or average upload links.
- **UX:** Users see “Uploading” for seconds instead of minutes; “Processing” becomes the main wait. Perceived speed and reliability (fewer timeouts/aborts on weak networks) improve.
- **Server:** Fewer CPU cycles (no extraction for audio-only path), less ingress bandwidth, and less temp storage per job. That translates to lower cost and better scalability.

**Caveats:**

- **Implementation cost:** Browser-side extraction requires robust use of Web Audio / MediaRecorder or similar, handling many codecs and containers, plus testing across browsers and devices. Fallback must be smooth so that unsupported or failing cases still work with the current flow.
- **Edge cases:** Very short or very small videos see smaller relative gains. URL-based and burn-subtitles flows stay on the current video path. Diarization and trim need to work with the “audio-only” path (conceptually straightforward).
- **Go/no-go:** The **architecture is sound** and the **potential gain is material** for upload time and total job time. Recommendation is **go**, provided (1) fallback keeps current behavior when client extraction is unavailable or fails, and (2) backend clearly separates “audio-only” vs “video” paths and only skips extraction when safe.

### 5.2 Summary table

| Item | Finding |
|------|--------|
| **Frontend** | Raw video (or raw chunks) uploaded; no client-side media processing. Proof: `api.ts` (FormData/chunk body), `FileUploadZone` (pass-through File), `uploadPreflight` (metadata only). |
| **Backend** | Upload → Multer/chunk assembly → `addJobToQueue(filePath)`; extraction in `ffmpeg.ts`; Whisper called with **audio** in `transcription.ts`. |
| **Bottleneck** | For large files, **upload (network)** dominates; full video size sent. |
| **Proposed architecture** | Browser-side audio extraction before upload; upload audio-only; backend skips extraction for that path; fallback = current flow. |
| **Before vs after** | Upload time ~90–95% lower; total job time ~60–75% lower for typical large files; server CPU and bandwidth reduced. |
| **Recommendation** | **Go** — materially saves time and improves UX for the main transcript/subtitles flow, with quantified upside and a clear fallback strategy. |

---

*Audit complete. No code was modified. Implementation details and code changes are out of scope until explicitly requested.*
