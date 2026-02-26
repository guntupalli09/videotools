# Defensive Regression Audit (Post–Figma UI Refactor)

**Date:** 2025-02-23  
**Objective:** Prove that nothing broke after the UI refactor. Assume prior “no issues” conclusion may be wrong.

---

## Phase 1 — Handler Integrity Scan

### Landing (Home)

| Element | Handler | Expected function | Status |
|--------|---------|-------------------|--------|
| Hero “Start transcribing” | `<Link to="/video-to-transcript">` | Navigate | ✔ Connected |
| Hero “Watch how it works” | `<Link to="/guide">` | Navigate | ✔ Connected |
| Features tool cards | `<Link to={tool.href}>` + `onClick` → `trackEvent('tool_selected', ...)` | Navigate + analytics | ✔ Connected |
| Pricing strip plan cards | `<Link to="/pricing">` | Navigate | ✔ Connected |
| Footer links | `<Link to="...">` | Navigate | ✔ Connected |

**Result:** All clickable elements have real handlers; no dead buttons.

---

### Hero

- CTAs are React Router `Link` components; navigation is correct.
- Scroll hint (ArrowDown + “Scroll”) is presentational only; no handler required.

---

### VideoToTranscript

| Prop / Button | Handler | Defined | Wired |
|---------------|---------|---------|-------|
| UploadZone `onFileSelect` | `handleFileSelect` | ✔ | ✔ |
| ProcessingInterface `onAction` | `(trimStart, trimEnd) => handleProcess(trimStart, trimEnd)` | ✔ | ✔ |
| ProcessingInterface `onRemove` | Inline: clear workflow + setSelectedFile(null) | ✔ | ✔ |
| ProcessingProgress `onCancel` | `handleCancelUpload` | ✔ | ✔ |
| TranscriptResult `onDownload` | `() => { const url = getDownloadUrl(); if (url) ... }` | ✔ | ✔ |
| TranscriptResult `onProcessAnother` | `handleProcessAnother` | ✔ | ✔ |
| TranscriptResult `onGenerateSubtitles` | `navigate('/video-to-subtitles', { state: { useWorkflowVideo: true } })` | ✔ | ✔ |
| TranscriptResult `onExportSrt` / `onExportVtt` | `handleExportSrt` / `handleExportVtt` | ✔ | ✔ |
| TranscriptResult `onCopy` | `handleCopyToClipboard` | ✔ | ✔ |
| TranscriptResult `onTranslate` | `setTranslateDropdownOpen(true)` | ✔ | ✔ |
| FailedState `onTryAgain` | `() => { setFailedMessage(undefined); handleProcessAnother() }` | ✔ | ✔ |
| PaywallModal `onClose` | `() => setShowPaywall(false)` | ✔ | ✔ |

**Result:** No unused functions, no orphaned state, no disconnected callbacks for this page.

---

### VideoToSubtitles, TranslateSubtitles, FixSubtitles, BurnSubtitles, CompressVideo, BatchProcess

- Same pattern verified: `onFileSelect` / `onFilesSelect`, `onAction`, `onCancel`, `onDownload`, `onProcessAnother`, `onTryAgain`, and PaywallModal (where present) are all wired to defined handlers.
- FixSubtitles: `onAction={() => handleAnalyze()}` — `handleAnalyze` takes no args; ProcessingInterface calls `onAction(start, end)` so extra args are ignored. ✔
- BatchProcess: `onFilesSelect={handleFilesSelected}`; no `onFileSelect` (correct for `multiple`). ✔

**Unused functions / dead props:** None identified. All handlers are used; optional Figma props (e.g. `onDownload?`) are correctly optional.

---

## Phase 2 — Async Flow Integrity

### Upload → Job creation → Polling → Completion → Result → Download

| Step | VideoToTranscript | VideoToSubtitles | Others |
|------|-------------------|------------------|--------|
| Job ID stored | `setCurrentJobId(response.jobId)` + `persistJobId(...)` | Same | Same pattern |
| Polling uses job ID | `getJobStatus(response.jobId, { jobToken })` in doPoll | Same | Same |
| State transitions | idle → processing → completed | Same | Same |
| Cancel aborts request | `uploadAbortRef.current.abort()` in handleCancelUpload | Same | N/A (reset only) |
| Progress % | `setProgress(jobStatus.progress ?? 0)` | Same | Same |
| Partial segments | `setPartialSegments(jobStatus.partialSegments)` | Same | N/A where no streaming |
| Completion → result screen | `setStatus('completed')`; `setResult(jobStatus.result)` | Same | Same |

**Rehydration:** VideoToTranscript (and VideoToSubtitles where applicable) restore job from `getPersistedJobId`; polling uses `getPersistedJobToken`; cleanup on unmount clears interval and sets `cancelled = true`. ✔

**Issue found and fixed:**  
- **BatchProcess:** On polling error, the code did `clearInterval(poll)` but did **not** call `setStatus('failed')` or `texJobFailed()`, leaving the UI stuck in “processing” indefinitely.  
- **Fix applied:** In the polling `catch` block, add `setStatus('failed')` and `texJobFailed()` after `clearInterval(poll)`.

---

## Phase 3 — Edge Case Attack

| Scenario | UI handling | Infinite loading? | Unhandled rejection? |
|----------|-------------|-------------------|------------------------|
| 1. Invalid file | Preflight / validation; toast + return or setStatus('idle'). | No | No |
| 2. Oversized file | `checkVideoPreflight` → `allowed: false` → toast + setStatus('idle'). | No | No |
| 3. Usage limit | `getCurrentUsage` → atOrOverLimit → `setShowPaywall(true)`; return. | No | No |
| 4. Network during upload | `uploadFileWithProgress` rejects → outer catch → setStatus('failed'), toast. | No | No |
| 5. API 500 | Upload or first poll fails → catch → setStatus('failed') (or keep polling in doPoll). | No* | No |
| 6. Polling timeout | doPoll catch: VideoToTranscript/VideoToSubtitles “keep polling”; BatchProcess now sets failed. | No (after fix) | No |
| 7. Malformed partial | Optional chaining / guards on result; no throw into unhandled. | No | No |
| 8. Download endpoint error | Download buttons use fetch + blob or link; catch shows toast “Download failed”. | No | No |
| 9. Refresh during processing | Rehydration effect restores job and continues polling. | No | No |
| 10. Navigate away mid-processing | Poll refs cleared on unmount where applicable; no mandatory setState after unmount in critical path. | No | No |

\* Single-job tools intentionally “keep polling” on doPoll errors (transient network). BatchProcess was the only one that cleared the interval without setting failed; that is fixed.

---

## Phase 4 — Cross-Tool State

| Flow | State passed | Consumed on target page? |
|------|--------------|---------------------------|
| Transcript → Video → Subtitles | `navigate(..., { state: { useWorkflowVideo: true } })` | ✔ VideoToSubtitles useEffect reads `state?.useWorkflowVideo` and sets selectedFile from workflow.videoFile |
| Transcript → Burn | Link `state={{ useWorkflowVideo: true }}` (TranscriptResult) | ✔ BurnSubtitles reads useWorkflowVideo + useWorkflowSrt |
| Subtitle → Burn | SubtitleResult Link `state` for burn-subtitles | ✔ BurnSubtitles reads useWorkflowVideo |
| Subtitle → Translate | Link to `/translate-subtitles` (no state in SubtitleResult) | — |
| Transcript → Translate | VideoToTranscript CrossToolSuggestions `state: { useWorkflowVideo: true, useWorkflowSrt: true }` | ⚠ **Gap:** TranslateSubtitles does **not** read `location.state` or `workflow.srtContent`. SRT is not prefilled when coming from Transcript. |
| Burn/Compress → next tools | CrossToolSuggestions pass `state: { useWorkflowVideo: true }` | ✔ CompressVideo/BurnSubtitles read useWorkflowVideo |

**Vulnerability:**  
- **TranslateSubtitles** never reads `location.state` or `workflow.srtContent`. When the user navigates from Transcript (or a future Subtitle → Translate link with state), the SRT is not prefilled. This is a **cross-tool state gap**. Fix would be: add a useEffect on TranslateSubtitles that, when `location.state?.useWorkflowSrt` and `workflow.srtContent`, sets pastedText (or a virtual file) from workflow. Not applied in this audit to avoid scope creep; documented as weak spot.

**React Router state:** Preserved where used. No undefined access found on pages that do read state (optional chaining used).

---

## Phase 5 — Console & Runtime Safety

| Check | Finding |
|-------|--------|
| Type mismatches | No type errors found in wired props; Figma components use optional props where appropriate. |
| useEffect dependency arrays | Rehydration and workflow prefills use appropriate deps (pathname, navigate, location.state, workflow.*). |
| Stale closures | Polling uses refs (e.g. terminalRef, response.jobId) so closure staleness is avoided. |
| Memory leaks | Object URLs (video preview) revoked in useEffect cleanup. Intervals cleared on cancel/rehydration cleanup. |
| Unmounted setState | Rehydration and doPoll use `cancelled` or `terminalRef` to avoid setState after unmount where critical. |
| Event listeners | Visibility listener (upload phase) added/removed in useEffect cleanup. ✔ |

**Silent risk:**  
- **Double-click submit:** On the configure step, the primary action does not set `actionLoading={true}` before the first async tick; status switches to 'processing' and the configure view unmounts. In theory a very fast double-click could start two jobs. Mitigation would be to disable the button on first click (e.g. local loading state) or guard at the start of handleProcess with “if status === 'processing' return”. Not changed in this audit.

---

## Output Summary

### 1) Confirmed safe systems

- Landing: CTAs, Features links, pricing strip, footer — all wired.
- Hero: Primary and secondary CTAs work.
- VideoToTranscript: Full flow (upload → process → result → download, cancel, retry, paywall) — handlers and async flow verified.
- VideoToSubtitles: Same; language and PaywallModal with onBuyOverage wired.
- TranslateSubtitles, FixSubtitles, BurnSubtitles, CompressVideo: Handlers and polling verified; error and retry paths present.
- BatchProcess: Handlers verified; **after fix**, polling error no longer leaves UI in infinite “processing”.
- Rehydration: Job ID and token persisted and restored; polling and cleanup correct.
- Preflight: Invalid/oversized file and usage limit handled; no infinite loading.
- Download: Errors caught and surfaced with toast.
- Workflow state: Video and SRT prefill work on VideoToTranscript, VideoToSubtitles, BurnSubtitles, CompressVideo where state is passed and read.

### 2) Vulnerabilities or weak spots

1. **BatchProcess polling error (FIXED):** Polling `catch` cleared the interval but did not set status to failed, causing infinite “processing”. Fix: call `setStatus('failed')` and `texJobFailed()` in that catch.
2. **TranslateSubtitles workflow prefill:** Page does not read `location.state` or `workflow.srtContent`; SRT is not prefilled when navigating from Transcript (or future Subtitle) with state. Documented; no code change in this audit.
3. **Double-click submit:** Theoretically possible to start two jobs from the configure step; low impact and not changed.

### 3) Silent risk areas

- **Permanent polling failure:** On VideoToTranscript/VideoToSubtitles, if getJobStatus never succeeds (e.g. persistent 500), the UI keeps polling indefinitely. By design for transient errors; could be improved later with a max-failures or timeout to set status to failed.
- **TranslateSubtitles:** Link from Transcript passes `useWorkflowSrt` but the page ignores it — user must re-upload or paste SRT.

### 4) Exact fixes applied

| File | Change |
|------|--------|
| `client/src/pages/BatchProcess.tsx` | In the `setInterval(..., JOB_POLL_INTERVAL_MS)` callback, inside the `catch` block that runs when `getBatchStatus` throws: after `clearInterval(poll)`, add `setStatus('failed')` and `texJobFailed()` so the user is not left in an infinite “processing” state. |

**No other code changes.** All other findings are documented as confirmed safe, weak spots, or silent risks.

---

**Conclusion:** One real bug was found and fixed (BatchProcess polling error leaving the UI stuck). Handler integrity, async flow, and rehydration are verified. Cross-tool state has one documented gap (TranslateSubtitles not prefilling from workflow). Edge cases and runtime safety checks did not reveal further regressions requiring fixes.
