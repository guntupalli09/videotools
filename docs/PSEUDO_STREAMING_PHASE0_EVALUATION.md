# Phase 0 — System Evaluation (Mandatory)

**Purpose:** Analysis of the six designated files to determine exact insertion points, serialization, ordering, and safety before implementation. No code changes in this phase.

---

## 1. Where partial flush should occur

### videoProcessor.ts

- **video-to-transcript:** Segments exist only when `needVerbose` (includeSummary, includeChapters, or exportFormats includes 'json') or `wantDiarization`.  
  - **Diarization path:** `transcribeWithDiarization` returns once; no chunks. Partial can be written once after it returns (optional; same as final for short).  
  - **Verbose path (long video):** `transcribeVideoVerbose` → `transcribeVideoParallel` (duration ≥ 150s). Uses `Promise.all(chunkPaths.map(...))`; merge happens only after all chunks complete. **Partial flush must occur inside the transcription layer** when a *contiguous prefix* of chunks (0, then 0–1, then 0–2, …) is available, so every flush is chronological from the start.  
  - **Verbose path (short video):** Single Whisper call; segments in one shot. One optional partial write after the call.  
  - **Plain path (no verbose):** `transcribeVideo` returns text only; no segments. **No partial for this path** (no regression; no new transcription call).

- **video-to-subtitles (single-language only):** Today `transcribeVideo(videoPath, format, ...)` returns a string (SRT/VTT). To support partial we must **use a segment-yielding path** in the worker: call `transcribeVideoVerbose` (or a parallel-with-partial variant), accumulate segments, flush partial to Redis, then at the end convert segments to SRT/VTT and write the file. So partial flush for subtitles occurs in the **same** transcription flow as transcript (segment accumulation + contiguous-prefix flush). Multi-language branch is unchanged; no partial.

**Conclusion:** Partial flush is triggered from **transcription.ts** when a new contiguous chunk prefix is ready (long video) or once when verbose/diarization returns (short). The **worker** owns the Redis key, write queue, and accumulator; it passes a callback (or receives a stream of segment snapshots) from the transcription layer. So either: (a) transcription exposes something like `transcribeVideoVerboseWithPartial(..., { onPartial: (segments) => void })` and the worker implements the queue/Redis logic inside that callback, or (b) transcription returns an async iterable / stream of “partial snapshot” and the worker consumes it in a single loop that does one Redis write per snapshot. Option (a): callback runs from transcription; worker must ensure the callback does not do Redis write directly—callback only pushes to a worker-owned write queue; one worker loop drains the queue. So **flush occurs in the worker** when the worker’s write-queue consumer runs; the queue is fed by the transcription callback (or by the worker after it gets a snapshot from transcription).

---

## 2. How to serialize writes per job

- **Single write queue per job:** In the worker, for each job that supports partial (video-to-transcript with segments, video-to-subtitles single-language), create an in-memory queue (e.g. an array plus a “drain” promise).  
- **Chunk completions (or transcription callback):** Do **not** call Redis. Push a snapshot (or a “please write” token) onto the queue.  
- **Single async consumer:** One `async function drainPartialQueue()` per job: in a loop, `await` “next item” from the queue (e.g. Promise that resolves when queue is non-empty), then `await redis.set(key, payload)`. So only one Redis SET is in flight at a time per job.  
- **Start consumer at job start, stop when job finishes:** Start the drain loop when entering the transcript or single-language-subtitles branch; when the transcription promise resolves (or fails), stop accepting new queue items and wait for the drain loop to finish the last write, then delete the key on success or failure.

---

## 3. How to prevent parallel write races

- **No Redis write from chunk callbacks:** Chunk callbacks (or `onPartial` from transcription) only push to the in-process queue.  
- **Single consumer:** Only the drain loop performs `redis.set`. Node is single-threaded, so only one execution of the drain loop runs per job.  
- **No concurrent Redis SET for the same key:** By construction, the next SET runs only after the previous `await redis.set` completes. So no parallel writes to `job:partial:${jobId}`.

---

## 4. How to guarantee chronological ordering

- **Contiguous chunk prefix:** In `transcribeVideoParallel`, do not flush when an arbitrary chunk completes. Maintain `resultsByIndex[i] = segments` for each chunk index `i`. When a chunk completes, set `resultsByIndex[i]`. Then compute the **longest contiguous prefix** `0..k` such that all `resultsByIndex[0..k]` are set. If that prefix grew (new k), merge `resultsByIndex[0], ..., resultsByIndex[k]`, sort by `segment.start`, dedupe by `(start, end)`, cap at 2000 segments, and push this snapshot to the worker’s write queue. So every snapshot is “from the start of the video” and sorted; no sliding window; no out-of-order segments.  
- **Short video / single call:** One snapshot after the call; already chronological.  
- **Dedupe:** Before each write, dedupe segments by `(start, end)` so overlap or duplicate chunks do not produce duplicate segments.  
- **Sort:** Always sort by `segment.start` before writing.

---

## 5. How to guarantee final override

- **Server (jobs.ts):** When `state === 'completed'` or `state === 'failed'`, do **not** read or attach `partialVersion` / `partialSegments` / `partialTranscript`. Response contains only `status`, `progress`, `result` (if completed), `queuePosition`, `jobToken`. So the final poll never includes partial.  
- **Worker:** On job success, delete `job:partial:${jobId}` (in try/catch, don’t throw). On job failure, delete in the `catch` block before rethrow. So after completion or failure, the key is gone; any delayed GET returns no partial.  
- **Client:** When `response.status === 'completed'`, set `terminalRef.current = true`, apply only `response.result` for transcript/subtitles, and clear partial state. Never apply partial from any response once terminal is true. So final result is the only source of truth after completion.

---

## 6. How to guard against late poll responses

- **terminalRef:** `const terminalRef = useRef(false)`. When transitioning to `'completed'` or `'failed'`, set `terminalRef.current = true` before any other state updates.  
- **At top of doPoll (and rehydration doPoll):** If `terminalRef.current === true`, return immediately without applying any field from the response (do not update progress, partial, or status). So a late “processing” response cannot overwrite completed or failed state.  
- **lastPartialVersionRef:** When `status === 'processing'` and `response.partialVersion != null`, only update partial state if `response.partialVersion > lastPartialVersionRef.current`; then set `lastPartialVersionRef.current = response.partialVersion`. So an out-of-order poll with an older partial cannot overwrite newer partial.  
- **Rehydration:** Same refs. When rehydration effect runs, do **not** reset `terminalRef` for the same page (refs persist). When the user starts a new job (new upload), reset `terminalRef.current = false` and `lastPartialVersionRef.current = 0` at the start of the submit handler so the new job can receive partial and then completion.

---

## 7. How to safely cap memory

- **Accumulator cap (worker):** Before pushing to the accumulator (or before building the snapshot), enforce a hard cap of 2000 segments. If the merged list already has 2000 segments, do not append more; continue the job and still produce the full final result (accumulator for final result is separate from partial accumulator, or the same list is used for final but we only *write* to Redis the first 2000 for partial). So: one accumulator for “what we send to Redis” capped at 2000; the full list is still built for the final `result`.  
- **Redis value:** The value stored is `{ version, segments, createdAt, updatedAt }`. Segments array is at most 2000. TTL 1 hour so keys don’t leak.  
- **GET response cap:** When building the response, if the stored partial (or trimmed copy) would exceed 150 KB, trim **from the end** only (never drop segments from the beginning). So chronological order is preserved and memory is bounded.

---

## 8. How to isolate Redis failures

- **All Redis operations in try/catch:** `get`, `set`, `del` for `job:partial:${jobId}` must be wrapped in try/catch.  
- **On error:** Log the error (with jobId, no sensitive data). Do **not** rethrow. Do **not** fail the job. Continue with job logic (transcription, final result, etc.).  
- **Worker:** If `redis.set` fails, the drain loop catches, logs, and continues to the next queue item (or exits so we don’t retry forever). If `redis.del` fails on success or failure, log and continue.  
- **GET /api/job:** If Redis `get` for partial fails, log and omit partial from the response (same as “no partial”); do not return 500. So Redis is optional for partial; job lifecycle and final result are unaffected.

---

## 9. How rehydration will behave

- **On reload:** User has `jobId` (and optionally `jobToken`) in URL or sessionStorage. Rehydration effect runs: `setStatus('processing')`, `setUploadPhase('processing')`, etc., then `getJobStatus(jobId, ...)`.  
- **terminalRef / lastPartialVersionRef:** These are refs; they are **not** reset by the rehydration effect. If the user had already completed the job before reload, the first poll after reload will return `status: 'completed'`. We will set `terminalRef.current = true` and apply result. So no duplication. If the user had not completed (still processing), refs might be from a previous job on the same page (e.g. they ran a job, navigated away, came back to the same page with a new jobId in URL). So on rehydration we should treat “we don’t know if terminal” as “not terminal”: **reset `terminalRef.current = false` and `lastPartialVersionRef.current = 0` when the rehydration effect runs** (we’re loading a specific jobId; treat it as a fresh view of that job). Then the first poll response drives state: if completed/failed, set terminal; if processing, apply partial if present and set version.  
- **If active and partial exists:** Response includes `partialVersion`, `partialSegments`, `partialTranscript`. We apply them (with version check) and render partial in the processing UI. No duplication because we replace partial state with the response’s partial.  
- **Polling continues:** Same `setInterval(doPoll)` as today. Terminal and version guards apply so no corruption from out-of-order or late responses.

---

## Files and touchpoints summary

| File | Touchpoints |
|------|--------------|
| **server/src/workers/videoProcessor.ts** | (1) For video-to-transcript (verbose/diarization path): obtain Redis client (e.g. from `job.queue.client` or createRedisClient), create write queue and drain loop, call transcription with a callback that pushes contiguous-prefix snapshots to the queue; on success delete key; in catch before rethrow delete key. (2) For video-to-subtitles single-language: same pattern; use segment-yielding transcription and convert segments to SRT at the end. (3) No change to upload, billing, or job lifecycle. |
| **server/src/services/transcription.ts** | Add support for “contiguous prefix” partial: e.g. `transcribeVideoVerboseWithPartial` or extend `transcribeVideoParallel` to accept `onPartial(segments: WhisperSegment[])` called when a new contiguous chunk prefix is available (merge resultsByIndex[0..k], sort, dedupe, cap, then call onPartial). Export so worker can use it. Keep existing `transcribeVideo`, `transcribeVideoVerbose` behavior unchanged when no callback. |
| **server/src/routes/jobs.ts** | When `state === 'active'`, try/catch Redis get `job:partial:${jobId}`. If present, parse JSON, attach `partialVersion`, `partialSegments` (sorted), `partialTranscript` (derived). Enforce response size ≤ 150 KB (trim from end if needed). When `state === 'completed'` or `'failed'`, do not read or attach partial. |
| **client/src/pages/VideoToTranscript.tsx** | Add `terminalRef`, `lastPartialVersionRef`. In doPoll (and rehydration doPoll): if terminalRef skip apply; on completed set terminal, apply result only, clear partial; on failed set terminal, clear partial; on processing apply partial only if partialVersion > lastPartialVersionRef. Add state for partialSegments/partialTranscript; render partial only when status === 'processing'. Scroll: capture/restore on transition to completed. Reset refs when starting new upload. Rehydration: reset refs at start of effect. |
| **client/src/pages/VideoToSubtitles.tsx** | Same terminal/version guards and partial state; render partial segments (e.g. as subtitle rows or plain list) when status === 'processing'; on completion use result only. Single-language only. |
| **client/src/lib/jobPolling.ts** | No change to transition logic. Optional: extend JobStatus type in api.ts with partialVersion?, partialSegments?, partialTranscript?. |

---

## Validation matrix (to confirm after implementation)

- Short video: partial optional (one write or none); final result identical to batch.
- Long parallel video: partial grows by contiguous prefix; final result identical to batch.
- Very long (>2000 segments): partial caps at 2000; final result has all segments; no regression.
- Multi-language subtitle: no partial; flow unchanged.
- Job failure mid-way: Redis key deleted in catch; GET never returns partial for failed job.
- Redis failure: job completes; GET omits partial; no 500.
- Out-of-order poll: terminalRef and version guard prevent corruption.
- User scroll up: no force scroll; preserve position on partial→final.
- Reload during processing: rehydration applies partial; refs reset so no stale terminal.
- Reload after completion: rehydration gets completed, applies result only.
- Mobile / dark mode: no new layout or theme assumptions; reuse existing components.

---

**End of Phase 0. Implementation may proceed only after this evaluation is accepted.**
