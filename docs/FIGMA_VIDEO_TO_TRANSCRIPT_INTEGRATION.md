# Figma UI Integration: Video → Transcript Screen

## Summary

The **Video → Transcript** tool page (`/video-to-transcript`) has been updated to use the new Figma-generated UI while keeping all existing behavior, API calls, and state.

- **Scope:** Single screen only (VideoToTranscript page).
- **Backend:** Unchanged (no API, worker, or service changes).
- **Contract:** No endpoint or request/response changes.

---

## Checklist

| Item | Status |
|------|--------|
| Upload works | ✔ |
| Progress updates work | ✔ |
| Results render correctly | ✔ |
| Errors handled | ✔ |
| No loose ends | ✔ |

### Details

- **Upload:** Figma `UploadZone` with `immediateSelect` is used. File selection goes straight to the configure step (no simulated upload). Real upload starts on "Transcribe Video".
- **Progress:** Figma `ProcessingProgress` shows steps (Preparing → Uploading → Processing → Completed), live progress %, optional queue message, and live transcript from `partialSegments`. Cancel calls existing `handleCancelUpload`.
- **Results:** Figma `TranscriptResult` shows success message, download, "Process another", generate subtitles (with SRT/VTT), transcript viewer (search, copy, translate, edit, SRT, VTT), and next-step links. Existing branch bar and branch content (Speakers, Summary, Chapters, Highlights, Keywords, Clean, Exports) are unchanged below.
- **Errors:** Existing `FailedState` and `PaywallModal` are still used. `getFailureMessage` and toasts unchanged.
- **Navigation:** Breadcrumbs and sidebar use existing routes (e.g. `/video-to-transcript`, `/`). Workflow links (e.g. Video → Subtitles, Burn Subtitles) pass `state: { useWorkflowVideo: true }` and set workflow video/SRT where needed.

---

## Adjustments Made

1. **New Figma components under `client/src/components/figma/`**
   - `ToolLayout` – Breadcrumbs, title, subtitle, icon, tags, main + sidebar grid. Uses `framer-motion` and `react-router-dom` (not `motion/react` or `react-router`).
   - `UploadZone` – Drag/drop + file input. Supports `immediateSelect` so the parent controls the next step without simulated upload.
   - `ProcessingInterface` – File card, optional trim (0–100%), options slot, primary action. `onAction(trimStartPercent, trimEndPercent)` so the page converts to seconds and calls the existing `handleProcess`.
   - `ProcessingProgress` – Steps, message, progress bar, optional live transcript, cancel. Driven by `uploadPhase` and `progress`/`partialSegments`.
   - `TranscriptResult` – Success block, download, process another, generate subtitles (SRT/VTT), transcript toolbar and viewer, next-step links. All handlers wired (onDownload, onProcessAnother, onGenerateSubtitles, onExportSrt, onExportVtt, onCopy, onTranslate, onEditToggle).
   - `ToolSidebar` – Wraps existing `PlanBadge`, `UsageCounter`, `UsageDisplay`, and "What you get".
   - `FormControls` – `Checkbox`, `Input`, `ExportFormat` (Figma styling, same behavior).

2. **VideoToTranscript page**
   - Replaced previous layout (sidebar + hero + single card) with `ToolLayout` and state-based children: `UploadZone` | `ProcessingInterface` | `ProcessingProgress` | `TranscriptResult` + branch bar + branch content | `FailedState`.
   - `handleProcess(trimStartPercent?, trimEndPercent?)` – Converts trim from 0–100% to seconds using `filePreview.durationSeconds` and passes trimmed range into the existing upload options.
   - Video preview URL for trim is stored in state (`videoPreviewUrl`) and created/revoked in an effect when `selectedFile` is a video.
   - Translate dropdown is rendered when `translateDropdownOpen` is true (opened from TranscriptResult’s Translate button).
   - PaywallModal and FAQ section are rendered outside `ToolLayout` (siblings in a fragment).

3. **Removed from page**
   - Direct use of `FileUploadZone`, `FilePreviewCard`, `UploadStageIndicator`, `ProcessingTimeBlock`, `ProgressBar`, `SuccessState`, `UsageRemaining`, `VideoTrimmer`, and the old transcript block (search, edit, copy, translate, SRT/VTT). Functionality is preserved via Figma components and existing state/handlers.

4. **Unchanged**
   - All state, refs, effects (rehydrate, visibility, workflow prefill, elapsed time, etc.).
   - `handleFileSelect`, `handleCancelUpload`, `handleProcess` (logic), `handleProcessAnother`, `handleCopyToClipboard`, `getDownloadUrl`, export (SRT/VTT), translation, branch helpers (`getSpeakersData`, `getSummarySchema`, etc.), `CrossToolSuggestions`, `WorkflowChainSuggestion`, analytics, usage, and paywall logic.

---

## File Map

| Purpose | Location |
|--------|-----------|
| Page | `client/src/pages/VideoToTranscript.tsx` |
| Figma layout | `client/src/components/figma/ToolLayout.tsx` |
| Figma upload | `client/src/components/figma/UploadZone.tsx` |
| Figma configure | `client/src/components/figma/ProcessingInterface.tsx` |
| Figma form controls | `client/src/components/figma/FormControls.tsx` |
| Figma progress | `client/src/components/figma/ProcessingProgress.tsx` |
| Figma result | `client/src/components/figma/TranscriptResult.tsx` |
| Figma sidebar | `client/src/components/figma/ToolSidebar.tsx` |

---

## Route

- App route remains **`/video-to-transcript`** (no `/tools/` prefix). Figma breadcrumb uses `href: '/video-to-transcript'`.
