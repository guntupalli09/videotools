# Performance & UX Speed Optimization Pass — Summary

**Date:** 2025-02-25  
**Constraints:** Non-breaking, additive only. No API route or request/response schema changes.

---

## 1. Summary of Modifications

### Phase 1 — Collapse TTFW (server)
- **transcription.ts**: In the parallel path (videos ≥150s), chunk 0 is now transcribed first and the first partial is emitted as soon as chunk 0 completes. Remaining chunks (1..n-1) run with the existing `pLimit(MAX_WHISPER_CONCURRENCY)`. Output format and transcription logic unchanged.

### Phase 2 — Live update latency
- **Server**: New optional SSE route `GET /api/job/:jobId/stream` (same auth as `GET /api/job/:jobId`). Streams the same payload shape (status, progress, result, partialSegments, partialTranscript, etc.) every 400ms until completed/failed. Polling `GET /api/job/:jobId` unchanged.
- **Client**: Added `subscribeJobStatus(jobId, options, onStatus)` in `api.ts`. Uses `EventSource` when available; on error or close falls back to polling (1.5s). VideoToTranscript and VideoToSubtitles use SSE + fallback; other tools keep polling only.

### Phase 3 — Upload progress consistency
- **api.ts**: Added `uploadDualFilesWithProgress` (XHR with progress). Same endpoint and form as `uploadDualFiles`.
- **CompressVideo, BurnSubtitles, FixSubtitles, TranslateSubtitles**: Switched to progress-capable uploads (`uploadFileWithProgress` or `uploadDualFilesWithProgress`) and added `uploadPhase` / `uploadProgress` state. ProcessingProgress shows Uploading (with %) → Processing → Finalizing.

### Phase 4 — Skeleton loaders
- **ResultSkeleton.tsx**: New component with variants `transcript`, `subtitle`, `burn`, `compress`. Shown during processing below the progress block; removed when `status === 'completed'`.
- **VideoToTranscript, VideoToSubtitles, BurnSubtitles, CompressVideo**: Render `<ResultSkeleton variant="…" />` inside the processing view.

### Phase 5 — Standardized processing states
- All tools use three steps: **Uploading**, **Processing**, **Finalizing**, with deterministic progress and `statusSubtext` (e.g. queue position) when in processing. VideoToTranscript and VideoToSubtitles step labels aligned to this pattern.

### Phase 6 — Mobile chunk optimization
- **api.ts**: On mobile, when file size > 200MB and network is “fast” or “medium” (from existing `measureConnectionSpeed()`), `chunkParallel` is set to 2. Chunk size remains 2MB on mobile. Sequential (chunkParallel = 1) remains the default for mobile.

### Phase 7 — Workflow continuity
- **TranscriptResult.tsx**: Prominent “Continue Workflow” button added below Download (same `onGenerateSubtitles` → pre-fill video and navigate to Video → Subtitles). Subtext: “Generate subtitles — same video pre-filled, no re-upload.” No routing or WorkflowContext API changes.

---

## 2. List of Files Changed

| File | Changes |
|------|--------|
| `server/src/services/transcription.ts` | Prioritize chunk 0 in parallel path; emit first partial immediately. |
| `server/src/routes/jobs.ts` | Added `buildJobStatusPayload`, `GET /:jobId/stream` SSE route; `GET /:jobId` uses shared payload builder. |
| `client/src/lib/api.ts` | `uploadDualFilesWithProgress`, `subscribeJobStatus`; no changes to existing API shapes. |
| `client/src/pages/VideoToTranscript.tsx` | SSE subscription, ref type for poll stop, ResultSkeleton, step “Finalizing”, Continue Workflow via TranscriptResult. |
| `client/src/pages/VideoToSubtitles.tsx` | SSE subscription, ref type, ResultSkeleton, step “Finalizing”. |
| `client/src/pages/CompressVideo.tsx` | `uploadFileWithProgress`, upload phase/progress, ResultSkeleton, steps Uploading/Compressing/Finalizing. |
| `client/src/pages/BurnSubtitles.tsx` | `uploadDualFilesWithProgress`, upload phase/progress, ResultSkeleton, steps. |
| `client/src/pages/FixSubtitles.tsx` | `uploadFileWithProgress` for analyze and auto-fix, upload phase/progress, steps for both flows. |
| `client/src/pages/TranslateSubtitles.tsx` | `uploadFileWithProgress`, upload phase/progress, steps. |
| `client/src/components/figma/ResultSkeleton.tsx` | **New.** Skeleton variants for transcript, subtitle, burn, compress. |
| `client/src/components/figma/TranscriptResult.tsx` | Prominent “Continue Workflow” button; gradient box copy updated. |
| `docs/PERFORMANCE_UX_OPTIMIZATION_SUMMARY.md` | **New.** This summary. |

---

## 3. Confirmation: No Breaking Changes

- **API routes:** No existing routes removed or changed. Only **additive** route: `GET /api/job/:jobId/stream`.
- **Request/response schemas:** Unchanged. SSE sends the same JSON shape as `GET /api/job/:jobId`.
- **Features:** All existing behavior preserved. Upload progress and SSE are additive; polling remains supported and used when SSE is not used or fails.
- **Business logic:** Transcription output and format unchanged. Only ordering of work in the parallel path (chunk 0 first) and emission of partials.
- **Chunked upload:** Logic unchanged; mobile gains optional 2 parallel chunks only when file > 200MB and network acceptable.
- **Batch flow:** Not modified.
- **Anonymous job token:** Still supported; stream and polling both accept `jobToken` (query or header).
- **Plan/limits:** No change to enforcement or response fields.

---

## 4. Estimated Improvement Impact

| Area | Impact |
|------|--------|
| **TTFW** | First partial can appear as soon as the first chunk (~0–3 min) is transcribed instead of waiting for the slowest of the first N chunks. |
| **Upload perception** | Compress, Burn, Fix, Translate now show determinate upload progress; no “frozen” feeling during upload. |
| **Live smoothness** | SSE at 400ms (vs 1.5s polling) for Transcript and Subtitles reduces perceived latency of live transcript/subtitles when SSE is used. |
| **Workflow fluidity** | “Continue Workflow” is visible and explicit; same pre-fill and navigation as before, with clearer affordance. |
| **Perceived speed** | Skeleton loaders and consistent Uploading → Processing → Finalizing steps reduce dead air and keep the user informed. |
| **Mobile** | Large files (>200MB) on good mobile networks can use 2 parallel chunks, improving upload time without changing chunk size or default behavior. |

---

## 5. Verification Checklist (Phase 8)

- [x] No API contract changes (only new optional SSE endpoint).
- [x] No removed fields or changed response shapes.
- [x] No broken error mapping; existing handlers unchanged.
- [x] Plan/limits behavior unchanged.
- [x] Chunked upload behavior preserved; mobile change is additive and conditional.
- [x] Batch flow untouched.
- [x] Anonymous job token polling still works (stream and polling both support `jobToken`).
