# UX Upload Improvements — Implementation Summary

**Scope:** Video-to-transcript and video-to-subtitles flows only.  
**Constraints:** Frontend-only, additive, backwards compatible. No backend or API contract changes.

---

## 1) Files changed

| File | Change |
|------|--------|
| `client/src/lib/filePreview.ts` | **New.** Browser-only file preview: duration, thumbnail (video), formatDuration. |
| `client/src/lib/api.ts` | UploadProgressOptions: added `signal?: AbortSignal`. Chunked: signal support, 3 retries with exponential backoff. Single upload: abort support, 3 retries with backoff. |
| `client/src/components/UploadStageIndicator.tsx` | **New.** Multi-stage UI: Preparing → Uploading → Processing → Completed | Error. |
| `client/src/components/FilePreviewCard.tsx` | **New.** Renders file preview (name, size, duration, thumbnail/placeholder). |
| `client/src/pages/VideoToTranscript.tsx` | File preview state + effect, stage indicator, preview card (idle + processing), Cancel button, slow-connection message, abort ref + signal, currentJobId for cancel/replace. |
| `client/src/pages/VideoToSubtitles.tsx` | Same additions as VideoToTranscript. |

---

## 2) UX state machine (text)

```
                    ┌─────────────┐
                    │    IDLE     │
                    └──────┬──────┘
                           │ user selects file → preview (name, duration, thumbnail)
                           │ user clicks "Transcribe" / "Generate Subtitles"
                           ▼
                    ┌─────────────┐
                    │ PREPARING   │  ← only when audio preprocessing runs (browser extraction)
                    └──────┬──────┘
                           │ (or skip if no extraction)
                           ▼
                    ┌─────────────┐
                    │ UPLOADING   │  ← progress % from XHR or chunked
                    └──────┬──────┘
                           │ [Cancel] → IDLE (abort); [success] → jobId, persist
                           ▼
                    ┌─────────────┐
                    │ PROCESSING  │  ← job progress from polling
                    └──────┬──────┘
                           │ [Cancel] → IDLE (clear persisted job; job may still complete)
                           ├── completed → COMPLETED
                           └── failed    → ERROR
                    ┌─────────────┐     ┌─────────────┐
                    │ COMPLETED   │     │   ERROR     │
                    └──────┬──────┘     └──────┬──────┘
                           │                   │
                           │ "Process another"  │ "Try again"
                           └───────────────────┴──────────────► IDLE
```

- **Preparing:** Shown only when `uploadPhase === 'preparing'` (audio extraction path).
- **Uploading:** Uses existing `uploadProgress` (XHR or chunked).
- **Processing:** Uses existing job `progress` and `queuePosition` from polling.
- **Completed / Error:** Derived from page `status` (`completed` | `failed`). No new backend states.

---

## 3) How regressions are prevented

1. **No backend or API changes**  
   All new behavior is driven by existing endpoints and events. Stage labels and preview are derived from current `uploadPhase`, `status`, and file metadata.

2. **Additive only**  
   - New optional `UploadProgressOptions.signal`; callers that don’t pass it get unchanged behavior.  
   - Retries wrap existing XHR/chunk logic; same request shape and responses.  
   - New UI (stage indicator, preview card, Cancel, slow-connection message) is extra; existing progress bar and copy are unchanged.

3. **Cancel is non-blocking**  
   - Upload cancel: AbortController aborts in-flight request; catch sets status to `idle` and does not block.  
   - Processing cancel: Clears persisted job and returns to idle; no call to a non-existent job-cancel API. If cancel fails (e.g. no persisted job), user can still start a new upload.

4. **Retries are internal**  
   Chunk and single-file retries use exponential backoff and the same API calls. On final failure, the same `FailedState` + “Try again” flow is used; no new error paths that could break existing handling.

5. **Preview is best-effort**  
   `getFilePreview()` uses browser APIs only; on failure it returns partial data (e.g. no thumbnail). Missing preview does not block upload or processing.

6. **Rehydration unchanged**  
   Rehydrate effect still uses `getPersistedJobId`, `getJobStatus`, and polling. Only addition is `setCurrentJobId(jobId)` so Cancel during rehydration clears the same persisted job and returns to idle.

---

## 4) Legacy flows still work

- **Upload:** Same `uploadFileWithProgress` entry point; chunk threshold and FormData/chunk APIs unchanged. Without `signal`, behavior is as before; with `signal`, only abort is added.  
- **Chunking:** Same init/chunk/complete flow and sessionStorage resume; retries and signal checks are added around existing logic.  
- **Jobs & polling:** No change to `getJobStatus`, `getJobLifecycleTransition`, or polling interval.  
- **Preflight & limits:** `checkVideoPreflight` and usage/paywall checks are unchanged.  
- **Audio extraction:** `extractAudioInBrowser` and fallback to raw upload are unchanged; “Preparing” is only shown when that path runs.  
- **Other tools:** CompressVideo, BurnSubtitles, TranslateSubtitles, FixSubtitles, etc. do not use the new options or UI; they continue to use `uploadFile` or their existing flows.

---

*Implementation complete. All changes are additive and backwards compatible.*
