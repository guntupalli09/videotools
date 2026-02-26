# Figma UI Integration: Burn Subtitles Screen

## Summary

The **Burn Subtitles** tool page (`/burn-subtitles`) has been updated to use the new Figma-generated UI while keeping all existing behavior, API calls, and state.

- **Scope:** Upload (video + subtitle), configure, processing, and results (BurnSubtitles).
- **Backend:** Unchanged (no API, worker, or service changes).
- **Contract:** No endpoint or request/response changes.

---

## Checklist

| Item | Status |
|------|--------|
| Video upload (with workflow prefill) | ✔ |
| Subtitle upload (SRT/VTT, workflow prefill) | ✔ |
| Trim (0–100% → seconds), font size, position, background | ✔ |
| Progress (upload + burning) | ✔ |
| Results + download (free 2 downloads, paid direct) | ✔ |
| CrossToolSuggestions, PaywallModal, FAQ | ✔ |

### Details

- **Upload (no video):** Figma `UploadZone` for video (immediateSelect, video formats, max 10 GB), with optional `fromWorkflowLabel` when video comes from workflow.
- **Upload (video, no subtitle):** Video card (name, size, remove) + `UploadZone` for subtitles (`.srt,.vtt`, 10 MB), with optional workflow label for SRT.
- **Configure (both files):** Figma `ProcessingInterface` with file = video (name, size, duration from `filePreview`), optional video player/trim (`videoSrc` = `videoPreviewUrl`), `onAction(trimStartPercent, trimEndPercent)` → `handleProcess(trimStartPercent, trimEndPercent)`. Children: subtitle file summary + remove, `Select` for font size (small/medium/large), position (bottom/middle), background (none/low/high).
- **Processing:** Figma `ProcessingProgress` with steps (Uploading, Burning, Completed), message "Burning subtitles into video...", progress %, optional queue, cancel → `handleProcessAnother`.
- **Results:** Figma `TranslateResult` (reused) with title "Video with burned subtitles ready!", file name, processing time, download (free: 2 downloads; paid: direct), "Process another", related tools (Compress, Video→Transcript, Video→Subtitles). `CrossToolSuggestions` below keeps workflow state for next-tool links.
- **Errors:** Existing `FailedState` and `PaywallModal` unchanged. FAQ section outside `ToolLayout`.

---

## Adjustments Made

1. **BurnSubtitles page**
   - Added `videoPreviewUrl`, `filePreview` (from `getFilePreview(videoFile)`), and `lastProcessingMs`. Removed `processingStartedAt` state (only ref used).
   - Effect for video object URL when `videoFile` is set; effect for `filePreview` when `videoFile` is set.
   - `handleProcess(trimStartPercent?, trimEndPercent?)` – Converts trim 0–100% to seconds via `filePreview?.durationSeconds` and passes `trimmedStart`/`trimmedEnd` into `uploadDualFiles`.
   - Replaced layout with `ToolLayout` and state-based main content: UploadZone (video) | video card + UploadZone (subtitle) | ProcessingInterface (both files + options + trim) | ProcessingProgress | TranslateResult + CrossToolSuggestions | FailedState.
   - Removed direct use of `FileUploadZone`, `UsageCounter`, `PlanBadge`, `ProgressBar`, `SuccessState`, `UsageDisplay`, `VideoTrimmer`. Trim handled by `ProcessingInterface` video player; usage/plan in `ToolSidebar`.

2. **Unchanged**
   - Workflow prefill from `location.state` (useWorkflowVideo, useWorkflowSrt), `handleVideoSelect`/`handleSubtitleSelect`, `uploadDualFiles` with burn options, job polling, free export count (2), download (blob for free, direct for paid), `handleProcessAnother`, `getDownloadUrl`, PaywallModal, CrossToolSuggestions with workflow state, analytics.

---

## File Map

| Purpose | Location |
|--------|-----------|
| Page | `client/src/pages/BurnSubtitles.tsx` |
| Figma layout | `client/src/components/figma/ToolLayout.tsx` |
| Figma upload | `client/src/components/figma/UploadZone.tsx` |
| Figma configure | `client/src/components/figma/ProcessingInterface.tsx` |
| Figma progress | `client/src/components/figma/ProcessingProgress.tsx` |
| Figma result | `client/src/components/figma/TranslateResult.tsx` (reused) |
| Figma sidebar | `client/src/components/figma/ToolSidebar.tsx` |
| Figma form controls | `client/src/components/figma/FormControls.tsx` (Select) |
| File preview | `client/src/lib/filePreview.ts` (getFilePreview, formatDuration) |

---

## Route

- App route remains **`/burn-subtitles`**. Breadcrumb uses `href: '/burn-subtitles'`. Entry with `state: { useWorkflowVideo: true }` or `useWorkflowSrt: true` still prefills from workflow.
