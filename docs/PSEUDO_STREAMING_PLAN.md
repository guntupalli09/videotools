# Pseudo-Streaming Transcript & Subtitle Rendering — Analysis & Execution Plan (Option B)

**Scope:** Planning only. No code changes, no patches, no refactors. Zero functionality breaks accepted.

---

## 1. Current Architecture Summary

### 1.1 Upload flow

| Step | Location | Behavior |
|------|----------|----------|
| User selects file | `VideoToTranscript.tsx` / `VideoToSubtitles.tsx` | `selectedFile` state; optional trim, options (format, language, summary, chapters, etc.). |
| Preflight | `checkVideoPreflight()` (uploadPreflight), `getFilePreview()` (filePreview) | Duration/size checks; file preview (duration, size). |
| Upload | `uploadFileWithProgress()` in `client/src/lib/api.ts` | Single: `POST /api/upload` with FormData. Large files (e.g. >15 MB): chunked via `POST /api/upload/init` → `POST /api/upload/chunk` (×N) → `POST /api/upload/complete`. |
| API | `server/src/routes/upload.ts` | Single: `upload.single('file')`, validate toolType, plan, size, concurrent jobs, then `addJobToQueue(plan, { toolType, filePath, userId, ... })`. Chunked: assemble to disk on complete, same validation, then `addJobToQueue`. |
| Response | Same routes | `202` with `{ jobId, status: 'queued', jobToken }`. `jobToken` from `(job.data as any)?.jobToken` (set in worker’s `addJobToQueue` via `jobData.jobToken`). |

**Exact files:**  
- Client: `client/src/pages/VideoToTranscript.tsx`, `VideoToSubtitles.tsx` (handleSubmit), `client/src/lib/api.ts` (`uploadFileWithProgress`, `buildUploadFormData`), `client/src/lib/uploadPreflight.ts`, `client/src/lib/filePreview.ts`.  
- Server: `server/src/routes/upload.ts` (POST `/`, POST `/upload/init`, `/chunk`, `/complete`).

### 1.2 Job creation

- **Where:** `server/src/workers/videoProcessor.ts` — `addJobToQueue(plan, data)`.
- **Data shape:** `JobData`: `toolType`, `userId`, `jobToken` (UUID if not set), `plan`, `filePath`, `originalName`, `options` (format, language, includeSummary, etc.), `trimmedStart`/`trimmedEnd`, `inputType: 'audio'`, `webhookUrl`, etc. No partial-result fields.
- **Queues:** Normal `fileQueue` or, when total queue count > 50 and plan is Pro/Agency, `priorityQueue`. Both Bull queues backed by Redis.
- **Response to client:** Only `jobId` and `jobToken`; no partial schema.

### 1.3 Worker processing lifecycle

- **Entry:** `server/src/workers/videoProcessor.ts` — `processJob(job)` (used by both queues).
- **Progress:** `job.progress(0..100)` at fixed steps (e.g. 5, 12, 15, 22, 25, 30, 55, 70, 75, 80, 100). Bull persists progress; GET job uses `job.progress()`.
- **Video → Transcript:** Trim (optional) → validate duration → `transcribeVideo` / `transcribeVideoVerbose` / `transcribeWithDiarization` → optional summary/chapters → export TXT/JSON/DOCX/PDF → ZIP if multiple → write files under `tempDir` → build `result` → `return result`. Transcript is **written once** at the end (txtPath, optional JSON, etc.). Segments exist only in memory until final `result`.
- **Video → Subtitles:** Trim (optional) → validate duration → single: `transcribeVideo(..., 'srt'|'vtt')` → write one SRT/VTT file; multi-lang: `generateMultiLanguageSubtitles` (primary SRT then translate) → write files → ZIP. Subtitles are **written once** at the end.
- **Result:** `result` is returned from the processor; Bull stores it in `job.returnvalue` only when the job **completes**. There is no mid-job persistence of partial transcript/subtitles in the current design.

**Exact files:**  
- `server/src/workers/videoProcessor.ts` (switch `video-to-transcript`, `video-to-subtitles`).  
- `server/src/services/transcription.ts` (`transcribeVideo`, `transcribeVideoVerbose`, `transcribeVideoParallel`).  
- `server/src/services/multiLanguage.ts` (multi-lang subtitles).

### 1.4 Where transcript is written

- **Transcript (video-to-transcript):** Only after full transcription. `fullText` and `segments` are in-memory; then:
  - `fs.writeFileSync(txtPath, fullText)` for TXT.
  - Optional JSON/DOCX/PDF via `exportTranscriptJson`, `exportTranscriptDocx`, `exportTranscriptPdf`.
  - No intermediate files or DB/Redis writes for partial transcript.

### 1.5 Where subtitles are written

- **Subtitles (video-to-subtitles):** Only after full transcription/conversion:
  - Single: `fs.writeFileSync(outputPath, subtitles)` (one SRT/VTT).
  - Multi-lang: primary SRT + translated SRTs, then ZIP. No partial subtitle writes.

### 1.6 How GET /api/job/:jobId works

- **File:** `server/src/routes/jobs.ts` — `router.get('/:jobId', ...)`.
- **Auth:** `getEffectiveUserId(req)` or `jobToken` (query or `x-job-token` header). Must match `job.data.userId` or `job.data.jobToken`.
- **State:** `job.getState()` → `queued` | `active` | `completed` | `failed`.
- **Mapping:** `active` → `status: 'processing'`, `completed` → `'completed'`, `failed` → `'failed'`, else `'queued'`.
- **Payload:** `{ status, progress: job.progress() || 0, result: job.returnvalue || undefined, queuePosition? }`. `result` is **only** `job.returnvalue`; it is `undefined` until the job completes. No partial data is read from anywhere.

**Exact file:** `server/src/routes/jobs.ts`.

### 1.7 Polling logic on client

- **Interval:** `JOB_POLL_INTERVAL_MS = 1500` (`client/src/lib/jobPolling.ts`).
- **VideoToTranscript:** After `uploadFileWithProgress` returns, `setInterval(doPoll, JOB_POLL_INTERVAL_MS)` and immediate `doPoll()`. Each poll: `getJobStatus(jobId, { jobToken })` → `setProgress(jobStatus.progress)` → `getJobLifecycleTransition(jobStatus)` → if `'completed'` stop interval, set `status='completed'`, `setResult(jobStatus.result ?? null)`, derive `fullTranscript`/`transcriptPreview` from `result.segments` or fetch `result.downloadUrl`; if `'failed'` stop and set failed; else continue.
- **VideoToSubtitles:** Same pattern: poll → transition → on completed set `result`, fetch download URL, parse to `subtitlePreview` and `subtitleRows`; on failed set failed.
- **Lifecycle:** `jobPolling.ts` — `getJobLifecycleTransition(jobStatus)`: `status === 'completed'` → `'completed'`, `status === 'failed'` → `'failed'`, else `'continue'`. Only `status` drives transition; missing `result` does not cause failure.

**Exact files:**  
- `client/src/lib/jobPolling.ts` (interval constant, transition helper).  
- `client/src/pages/VideoToTranscript.tsx` (doPoll, activeUploadPollRef, setInterval).  
- `client/src/pages/VideoToSubtitles.tsx` (same).  
- `client/src/lib/api.ts` (`getJobStatus` → GET `/api/job/${jobId}`).

### 1.8 Success state trigger

- When `getJobLifecycleTransition(jobStatus) === 'completed'`:
  - Polling stops (`clearInterval(activeUploadPollRef.current)`).
  - `setStatus('completed')`, `setResult(jobStatus.result ?? null)`.
  - **VideoToTranscript:** If `result.segments?.length` → `setFullTranscript`/`setTranscriptPreview` from segments; else fetch `result.downloadUrl` for text. Then usage, analytics, `setLastProcessingMs`, `setLastJobCompletedToolId`.
  - **VideoToSubtitles:** Fetch `result.downloadUrl`, parse to `subtitlePreview` and `subtitleRows` (or empty for ZIP). Same usage/analytics/lastProcessingMs/lastJobCompletedToolId.
- UI: `status === 'completed'` shows `SuccessState` (download, processed-in badge), `WorkflowChainSuggestion`, and transcript/subtitle content. No processing UI.

### 1.9 Failure state trigger

- When `getJobLifecycleTransition(jobStatus) === 'failed'`:
  - Polling stops.
  - `setFailedMessage(getFailureMessage(...))`, `setStatus('failed')`, toast, optional `clearPersistedJobId` (e.g. on rehydration).
- On `getJobStatus` throw (e.g. network): **do not** set failed; keep polling (per jobPolling design).
- On `SessionExpiredError` (e.g. 404): clear persisted job and show session expired; rehydration path may set idle.

**Exact files:** Same as polling; `client/src/lib/failureMessage.ts` for messages.

### 1.10 Data structures returned

- **Job status (GET /api/job/:jobId):**  
  `{ status, progress, result?, queuePosition?, jobToken? }`.  
  `result` only when job completed: for transcript `{ downloadUrl, fileName?, segments?, summary?, chapters?, processingMs?, videoDurationSeconds? }`; for subtitles `{ downloadUrl, fileName?, warnings?, processingMs?, videoDurationSeconds? }` or multi-lang shape. No `partialTranscript` or `partialSegments` today.
- **Client `JobStatus`:** `client/src/lib/api.ts` — `result` typed with `segments`, `summary`, `chapters`, `downloadUrl`, etc. No partial fields.

---

## 2. Partial Result Injection Point

### 2.1 Where partial transcript could safely be written during processing

- **Today:** Transcript (and segments) exist only in worker memory until the final `result` is returned. There is no shared store for partial data.
- **Safe injection options:**
  - **Option A — Redis (or similar) key per job:** e.g. `job:partial:${jobId}`. Worker writes partial payload (e.g. `{ partialTranscript?, partialSegments? }`) after each chunk or at intervals. GET `/api/job/:jobId` when `state === 'active'` reads this key and merges into response. On job completion, worker can delete the key or leave it to TTL; final response always comes from `job.returnvalue`.
  - **Option B — Bull job progress payload:** Bull allows `job.progress(n)` or `job.progress({ percent, partial })`. Storing large partial text in progress is not ideal (size, serialization); better to store a reference or small metadata in progress and keep bulk partial in Redis.
- **Recommendation:** Use a **separate Redis key** (or equivalent) for partial data so that (1) GET response stays backward-compatible by adding optional fields, (2) final `result` from `job.returnvalue` always overrides partial when `status === 'completed'`, and (3) payload size of the job status endpoint can be bounded (e.g. cap partial size or last-N segments).

### 2.2 Whether worker already processes chunks in parallel

- **Yes, for long videos.** In `server/src/services/transcription.ts`:
  - `transcribeVideo` / `transcribeVideoVerbose`: if `durationSec >= PARALLEL_THRESHOLD_SEC` (150 s), use `transcribeVideoParallel`.
  - `transcribeVideoParallel`: splits audio into chunks of `CHUNK_DURATION_SEC` (180 s), runs `Promise.all(chunkPaths.map((chunkPath, i) => transcribeChunkVerbose(chunkPath, i * offsetStep, ...)))`, then merges: `segments = results.flat().sort((a,b) => a.start - b.start)`.
- So chunks are processed **in parallel**, but the merged result is only available **after all chunks finish**. There is no callback or stream per chunk today; merging is done once at the end.

### 2.3 If merging chunks progressively is feasible without rewriting core logic

- **Feasible with limited changes:** Instead of waiting for `Promise.all` and then merging once, the worker could:
  - Process chunks in a defined order (e.g. by time offset), and as each chunk completes, append its segments to a shared structure (e.g. in Redis under `job:partial:${jobId}`), then have GET job merge that into the response.
  - This requires: (1) a way to persist partials (e.g. Redis), (2) optional callback or loop in the parallel path that “flushes” after each chunk, (3) no change to the **final** merge logic — the final result is still computed the same way and returned as `result`; partial is additive for UI only.
- **Risk:** Chunk completion order may not be chronological; so “progressive” display might show segments out of order until the final result. Mitigation: either process chunks sequentially for partial display, or tag partial segments with chunk index and sort on client, or only append when chunks complete in order.

### 2.4 Whether job payload schema supports optional fields

- **Server:** GET response is built in `jobs.ts` as a plain object `{ status, progress, result, queuePosition?, jobToken? }`. Adding optional `partialTranscript` and `partialSegments` is backward-compatible; existing clients ignore unknown fields.
- **Client:** `JobStatus` in `api.ts` has `result?` with known fields; adding `partialTranscript?` and `partialSegments?` at the top level (or under a wrapper) is an additive schema change. No breaking change if old responses simply omit these.

### 2.5 Minimal additive schema change

- **Proposal:**
  - Add to GET `/api/job/:jobId` response when status is `processing` and partial data exists:
    - `partialTranscript?: string` — optional plain text (e.g. concatenated segment text so far).
    - `partialSegments?: { start: number; end: number; text: string; speaker?: string }[]` — optional segment list.
  - Keep `result` as-is; it remains `undefined` until job completes. When `status === 'completed'`, response must use only `result` (and not partial). So:
  - **Override rule:** If `status === 'completed'`, response must not expose partial as the source of truth; only `result` is. When status is `processing`, clients may show `partialTranscript` / `partialSegments` for display; on completion they must replace with `result.segments` (and derived text) and ignore any stale partial.

### 2.6 Ensuring final result overrides partial safely

- **Server:** When building the GET response, if `state === 'completed'`, do **not** include `partialTranscript` or `partialSegments` (or set them to undefined). Only send `result`. So the final response is purely the completed result.
- **Client:** On transition to `'completed'`, set state only from `jobStatus.result` (e.g. `setResult(jobStatus.result)`, set transcript from `result.segments` or download). Never use partial fields to populate the final transcript/subtitles. Optionally clear any “partial” state when transitioning to completed.
- **Worker:** On success, after setting `job.returnvalue` (by returning), optionally delete the Redis partial key for that job so any delayed GET does not see old partial.

---

## 3. Client Integration Strategy

### 3.1 Where polling occurs

- **VideoToTranscript:** Inside the submit handler after `uploadFileWithProgress`; `doPoll` is the callback; `activeUploadPollRef.current = setInterval(doPoll, JOB_POLL_INTERVAL_MS)`; first poll via `doPoll()`.
- **VideoToSubtitles:** Same: after upload, `setInterval(doPoll, ...)` and immediate `doPoll()`.

### 3.2 Where transcript state is stored (VideoToTranscript)

- **Processing:** `status`, `progress`, `uploadPhase`, `result` (null until completed), `fullTranscript`, `transcriptPreview` (empty during processing). No partial state today.
- **Completed:** `result` (with `segments`, `summary`, `chapters`, `downloadUrl`), `fullTranscript`, `transcriptPreview`, `editableSegments` (from segments), plus branch state (e.g. summary, chapters).

### 3.3 How success state replaces processing state

- On `transition === 'completed'`: polling stops; `setStatus('completed')`; `setResult(jobStatus.result ?? null)`; then transcript is set from `result.segments` (or download); `lastProcessingMs` and `lastJobCompletedToolId` set. The UI switches from the processing block (`status === 'processing'`) to the completed block (`status === 'completed'` with SuccessState and transcript content). No mixing of partial and final in the same “result” object if we keep final-only in `result`.

### 3.4 Injecting partial rendering without breaking existing behavior

- **Success logic:** Keep transition to `'completed'` and handling of `jobStatus.result` unchanged. When completed, always set transcript (and related state) from `result` only. Do not use partial for final.
- **Failure logic:** No change; failure is still driven only by `status === 'failed'`. Partial data is irrelevant to failure.
- **Speed badge:** `lastProcessingMs` is set on completion from client-side timing; no change. Partial does not affect it.
- **Workflow chaining:** `lastJobCompletedToolId` is set on completion; no change.
- **Partial rendering:** During `status === 'processing'`, if the poll response includes `partialTranscript` or `partialSegments`, update optional state (e.g. `partialTranscript`, `partialSegments`) and render a **separate** “live transcript” area (e.g. above or below the progress bar) that shows this partial content. When transition is `'completed'`, replace that view with the final transcript from `result` and optionally clear partial state so the final UI is identical to today.

### 3.5 Appending deltas safely

- **Option 1 — Replace by segment list:** Each poll returns the full `partialSegments` so far. Client replaces local partial state with this list. No delta merge; avoids ordering/duplication bugs. Preferred for simplicity.
- **Option 2 — Delta append:** Server sends only new segments since last update. Client appends to list. Requires sequence or cursor and careful handling of out-of-order polls; higher regression risk. Not recommended for Phase 1.

### 3.6 Preventing scroll jitter

- Render partial transcript in a container with stable height or max-height and `overflow-y: auto`. Use “scroll to bottom” only when user is near bottom (or never auto-scroll), so that when new partial content is appended, the scroll position is not reset. When switching from partial to final, preserve scroll position or use a ref to the last visible segment so the view doesn’t jump.

---

## 4. Zero Regression Guarantee — Risk Table & Mitigations

| Risk | Description | Mitigation |
|------|-------------|------------|
| Scroll reset | Final result replacing partial causes scroll to jump to top or bottom. | Keep scroll position when replacing partial with final (ref to scroll container; restore after setState). Optionally only auto-scroll when user was at bottom. |
| State race conditions | Poll returns partial, then next poll returns completed; out-of-order responses. | Transition to completed only when `status === 'completed'`. Ignore partial once completed. Use a single source of truth: `result` for final. |
| Final result override bugs | Client mistakenly keeps showing partial after completion. | On transition to completed, always set transcript/subtitles from `jobStatus.result` only; clear or ignore partial state. |
| Memory leaks in polling | Interval or refs not cleared when partial is used. | Reuse same polling lifecycle; clear interval on completed/failed and on unmount. No new long-lived subscriptions for partial. |
| Duplicate transcript content | Partial and final both shown, or partial appended to final. | UI has one “transcript” area: during processing show partial; on completion replace content with final from `result` only. |
| Partial overwrite of final content | Bug causes partial to overwrite result after completion. | Code rule: when `status === 'completed'`, never write partial into `result` or into `fullTranscript`/segments used for download/export. |
| Layout shift | Partial area appears and pushes content. | Reserve min-height for transcript area during processing, or keep progress UI layout and add partial in a fixed-height scrollable block. |
| Failure state corruption | Partial state visible after failure. | On transition to failed, clear partial state and show only FailedState; no partial in failed view. |
| Dark mode visual break | New partial UI not themed. | Use same design tokens / classes as existing transcript block (e.g. surface-card, text colors). |
| Mobile overflow | Long partial text overflows or breaks layout. | Same container rules as final transcript (e.g. overflow-x-hidden, word-break, max-width). |

---

## 5. Performance Impact Analysis

- **Polling size:** Each poll already returns `status`, `progress`, `result` (when done). Adding `partialTranscript` and `partialSegments` will increase response size during processing. For long videos, partial segments could be large.
- **Mitigation:** (1) Cap partial: e.g. last N segments or last M characters of `partialTranscript`; or (2) send only `partialSegments` (and derive text on client) with a max segment count (e.g. 500). So job API payload grows but within a bound.
- **Job API payload:** Same as above; define a safe limit (e.g. 500 segments or 100 KB of partial text) and trim on the server before sending.
- **partialTranscript memory (server):** Stored in Redis (or similar) per job. Set TTL (e.g. 1 hour) so failed or abandoned jobs don’t leak. Limit size of stored partial (e.g. 100 KB) so Redis memory is bounded.
- **Partial trim/chunk:** Prefer trimming: keep only the most recent segments (e.g. last 200) or last 50 KB of text for the GET response. Worker can still write full partial to Redis for debugging if needed, but the API returns a trimmed view.

**Proposed safe limits:**  
- Max partial segments in response: 500.  
- Max partialTranscript length in response: 100 KB (chars).  
- Redis partial key TTL: 1 hour.  
- Worker writes full partial to Redis; jobs route trims when reading for GET.

---

## 6. Rollback Strategy

### 6.1 Feature-flag partial rendering

- **Backend:** Env var e.g. `ENABLE_PARTIAL_TRANSCRIPT=0|1`. When 0, worker does not write partial to Redis; GET job does not read or add `partialTranscript`/`partialSegments` to the response. So the API behaves exactly as today.
- **Client:** Env or runtime flag (e.g. `VITE_ENABLE_PARTIAL_RENDER=0|1` or query param for testing). When disabled, do not read or render partial from poll response; only show progress until completed. So UI behaves exactly as today.

### 6.2 Disable partial in production instantly

- Set `ENABLE_PARTIAL_TRANSCRIPT=0` (and client flag off) and redeploy or restart. No DB migration; no change to `result` or job completion. Clients that already ignore unknown fields will see no partial; clients that support partial will simply not receive partial and will show only progress until completion.

### 6.3 Fall back to batch-only behavior

- With partial disabled, worker never writes partial; GET never returns partial. Polling and completion logic are unchanged: when `status === 'completed'`, client still sets state from `result` only. So behavior is identical to current batch-only flow. No deployment risk beyond the usual release; no need to revert DB or API contract if the feature is additive and behind a flag.

---

## 7. Implementation Phase Plan

Each phase is deployable independently and keeps zero functionality breakage.

| Phase | Scope | Deployable | Notes |
|-------|--------|------------|--------|
| **A — Backend partial storage only** | Worker writes partial to Redis (or equivalent) after each chunk (or at intervals) for video-to-transcript; feature-flag gated. No API exposure yet. | Yes | Validates storage, TTL, and size limits. No change to GET or client. |
| **B — API exposure only** | GET `/api/job/:jobId` when status is processing and partial exists: read from Redis, trim to safe limits, add `partialTranscript` and `partialSegments` to response. When completed, do not send partial. Feature-flag. | Yes | Clients can ignore new fields. Backward compatible. |
| **C — Client delta rendering (transcript)** | VideoToTranscript: during processing, if poll response has partial, show partial in a dedicated area; on completion, replace with `result` only and clear partial. Scroll and layout as per mitigations. Feature-flag. | Yes | No change to success/failure/speed/workflow logic. |
| **D — Subtitles partial** | Worker writes partial SRT/segments for video-to-subtitles (single-language path) to Redis; GET exposes e.g. `partialSegments` or partial SRT text. VideoToSubtitles: show partial during processing; on completion use result only. | Yes | Same pattern as transcript; subtitles may be simpler (no summary/chapters). |
| **E — Scroll stabilization** | Refine scroll behavior: preserve position when replacing partial with final; optional “scroll to bottom” only when user at bottom; no jitter on append. | Yes | Polish only. |
| **F — Final polish** | Remove or relax feature flags after validation; docs; any cleanup (e.g. Redis key naming, monitoring). | Yes | Productionize. |

---

## 8. Summary

- **Current flow:** Upload → job enqueued → worker runs transcription/subtitles in one shot (with internal parallel chunks for long videos) → result returned and stored in `job.returnvalue` → client polls until completed then shows result. No partial data is stored or exposed.
- **Injection points:** Redis (or similar) key per job for partial transcript/segments; worker writes after each chunk or at intervals; GET job merges trimmed partial into response when status is processing; final response uses only `result`.
- **Client:** Add optional partial state; during processing render partial when present; on completion use only `result` and clear partial. No change to lifecycle, failure, speed badge, or workflow chaining.
- **Risks and mitigations:** Listed in the risk table; main themes: final always overrides partial, no partial after completion/failure, bounded payload and memory, scroll and layout stability.
- **Rollback:** Feature flags on server and client; disable to restore batch-only behavior with no schema or contract change.
- **Phases A–F:** Backend storage → API exposure → client transcript → client subtitles → scroll polish → final polish; each phase independently deployable and backward compatible.

No code changes were made; this document is planning only.
