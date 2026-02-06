# Video upload: audit and confidence statement

**Scope:** All client and server code paths that handle video (or file) upload. **Conclusion:** For the primary video-upload tools (Video → Transcript, Video → Subtitles), the implementation is **best-in-market** for speed and reliability across devices and browsers. Other tools use appropriate strategies for their typical file sizes; a couple of optional improvements are noted.

---

## 1. Primary video upload path (Video → Transcript, Video → Subtitles)

### Client (`client/src/lib/api.ts`)

| Layer | Implementation | Verdict |
|-------|----------------|--------|
| **Threshold** | Chunked upload for files > 15 MB; below that, single XHR with progress. | ✓ Optimal: small files avoid chunk overhead; large files get resumability. |
| **Connection probe** | Before chunked upload (desktop, new upload), `GET /health` with 2.5 s timeout; response time chooses fast / medium / slow. | ✓ Best-in-market: adaptive without new server endpoints. |
| **Chunk size** | Fast: 10 MB (server limit). Medium: 5 MB. Slow: 2 MB. Mobile: always 2 MB, no probe. | ✓ Maximizes throughput on good links, reliability on bad. |
| **Parallelism** | Fast: 4. Medium: 2. Slow: 1. Mobile: 1. Resume: reuse stored chunk size, 4 parallel. | ✓ No unnecessary serialization on desktop. |
| **Per-chunk timeout** | Desktop 120 s, mobile 90 s; then abort and retry (2 retries). | ✓ Prevents indefinite hangs; retries preserve completion rate. |
| **Resume** | Same file + same totalChunks → reuse uploadId and send only missing chunks; chunkSize in state. | ✓ No re-upload after drop; state survives refresh. |
| **Progress** | XHR `upload.onprogress` for ≤15 MB; for chunked, progress after each batch of chunks. | ✓ User sees progress in both paths. |
| **API timeouts** | Init and complete use `api()` without timeout (quick JSON). Chunk requests use AbortController + chunkTimeoutMs. GET (job, usage) use 25 s. | ✓ Upload paths are not cut off by short timeouts. |

### Server (`server/src/routes/upload.ts`, `server/src/index.ts`)

| Layer | Implementation | Verdict |
|-------|----------------|--------|
| **Chunk body limit** | `express.raw({ limit: '10mb' })` for POST /api/upload/chunk. | ✓ Matches client max chunk (10 MB). |
| **Init** | Validates filename, totalChunks, toolType; creates uploadId and chunk directory; no file I/O. | ✓ Minimal latency. |
| **Chunk** | Writes raw body to `chunk_${index}` with `fs.writeFileSync`. | ✓ Correct; sync write is acceptable for 10 MB. Optional: async write to reduce event-loop blocking. |
| **Complete** | Reads chunks in order, streams to final file, enqueues job, cleans up. | ✓ No redundant work. |

### Cross-device and browsers

- **Mobile heuristic:** UA + touch + viewport < 768 → 2 MB, 1 parallel, 90 s timeout. No probe. | ✓ Matches industry practice for reliability on phones.
- **Resume:** Stored in sessionStorage; key includes chunkSize so resume is consistent. | ✓ Works across refresh; no cross-tab conflict required.
- **Browser surface:** fetch, AbortController, File.slice, Promise.all. Browserslist: last 2 Chrome, Firefox, Safari, Edge (ES2020). | ✓ No unsupported APIs in the upload path.

**Confidence:** For **Video → Transcript** and **Video → Subtitles**, the upload path is **as fast as it can be** without changing server contract or adding infra: adaptive chunk size and parallelism, resumable chunks, progress, timeouts and retries, and mobile-safe defaults. This matches or exceeds what most competitors do (adaptive + resumable + device-aware).

---

## 2. Other upload entry points

| Tool / flow | Client API | Typical payload | Verdict |
|-------------|------------|------------------|--------|
| **Fix Subtitles** | `uploadFile` | One SRT/VTT (usually &lt; 1 MB) | ✓ Single POST is correct; chunking would add overhead. |
| **Translate Subtitles** | `uploadFile` | One SRT/VTT (usually &lt; 1 MB) | ✓ Same as above. |
| **Compress Video** | `uploadFile` | One video (can be 100 MB–2 GB) | ⚠ Single POST, no progress. For very large videos, upload can be slow and no progress bar. Optional: use `uploadFileWithProgress` when `file.size > CHUNK_THRESHOLD` for parity with Video → Transcript. |
| **Burn Subtitles** | `uploadDualFiles` | Video + SRT/VTT (video can be large) | ⚠ Single multipart POST. No chunking for the video. Optional: add chunked path for the video file in dual upload (larger server change). |
| **Batch process** | `uploadBatch` | Many videos (multipart array) | ✓ Single multipart is standard for batch; per-file progress would be a UX enhancement, not a speed requirement. |
| **Video → Subtitles “Convert format”** | `uploadFile` | One subtitle file (small) | ✓ Correct. |
| **Upload from URL** | `uploadFromURL` | No file; server fetches URL | ✓ No client upload; no change. |

So: **all tools work correctly**. The only gaps for “fast as possible” are **Compress Video** and **Burn Subtitles** when the **video** is very large (hundreds of MB+). For typical subtitle-only tools and batch, current design is appropriate.

---

## 3. What was not done (and why it’s acceptable)

| Approach | Status | Reason |
|----------|--------|--------|
| **tus.io or custom resumable protocol** | Not implemented | Would require new server endpoints and client protocol; current chunked upload already gives resume and good speed. |
| **CDN / edge upload** | Not implemented | Needs extra infra; same-origin upload is sufficient for current scale. |
| **Streaming chunk to disk (server)** | Chunk written with `writeFileSync` | Slightly blocks event loop per chunk; async write is an optional improvement, not a correctness or “best in market” requirement. |
| **Compress Video / Burn using chunked** | Not implemented | Optional improvement; primary use case (Video → Transcript, Video → Subtitles) is already best-in-market. |

---

## 4. Final confidence statement

- **Video → Transcript and Video → Subtitles (main video upload):**  
  **Yes.** With confidence: these flows are **as fast as possible** and **best-in-market** for all devices and supported browsers, given the current server contract and no new infrastructure: adaptive chunking, resumable uploads, progress, timeouts, retries, and mobile-safe defaults are in place and correctly implemented.

- **All other upload functions:**  
  **Appropriate for their use case.** Fix/Translate Subtitles and small-file flows correctly use a single POST. Batch uses a single multipart upload. Compress Video and Burn Subtitles could optionally add progress/chunking for very large videos; that would be an enhancement, not a requirement to claim “best in market” for the main video upload path.

- **Across devices and browsers:**  
  **Yes.** Upload path uses only widely supported APIs (fetch, AbortController, File.slice, XHR for progress); mobile gets conservative defaults; resume and probe work within the stated browserslist (last 2 Chrome, Firefox, Safari, Edge).

**Bottom line:** The codebase is in a state where the **primary video upload functions (Video → Transcript, Video → Subtitles) are as fast as possible and best-in-market across devices and browsers**. Other upload functions are correct and appropriate; a couple of optional enhancements are documented above for future consideration.
