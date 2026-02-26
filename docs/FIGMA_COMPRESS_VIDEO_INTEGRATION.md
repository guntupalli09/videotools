# Figma UI Integration: Compress Video Screen

## Summary

The **Compress Video** tool page (`/compress-video`) has been updated to use the new Figma-generated UI while keeping all existing behavior, API calls, and state.

- **Scope:** Upload, configure, processing, and results (CompressVideo).
- **Backend:** Unchanged (no API, worker, or service changes).
- **Contract:** No endpoint or request/response changes.

---

## Checklist

| Item | Status |
|------|--------|
| Video upload (workflow prefill) | ✔ |
| Profile (web / mobile / archive / custom) | ✔ |
| Compression level (light / medium / heavy when custom) | ✔ |
| Trim (0–100% → seconds), size estimate | ✔ |
| Progress (upload + compressing) | ✔ |
| Results + download (free 2, paid direct) | ✔ |
| WorkflowChainSuggestion, size block, CrossToolSuggestions | ✔ |
| PaywallModal, FAQ | ✔ |

### Details

- **Upload:** Figma `UploadZone` with `immediateSelect`, video formats, max 10 GB, optional `fromWorkflowLabel` when video is from workflow.
- **Configure:** Figma `ProcessingInterface` with file (name, size, duration from `filePreview`), optional video player/trim (`videoSrc` = `videoPreviewUrl`), `onAction(trimStartPercent, trimEndPercent)` → `handleProcess(trimStartPercent, trimEndPercent)`. Children: `RadioGroup` for profile (Web, Mobile, Archive, Custom); when Custom, second `RadioGroup` for level (Light, Medium, Heavy); size estimate paragraph (original → estimated).
- **Processing:** Figma `ProcessingProgress` with steps (Uploading, Compressing, Completed), message "Compressing video...", progress %, optional queue, cancel → `handleProcessAnother`.
- **Results:** Figma `TranslateResult` (reused) with title "Video compressed!", file name, processing time, download (free: 2; paid: direct), "Process another", related tools (Burn, Video→Subtitles, Video→Transcript). Existing blocks below: `WorkflowChainSuggestion`, original→compressed size block, `CrossToolSuggestions`.
- **Errors:** Existing `FailedState` and `PaywallModal` unchanged. FAQ outside `ToolLayout`.

---

## Adjustments Made

1. **CompressVideo page**
   - Added `videoPreviewUrl`, `filePreview` (from `getFilePreview(selectedFile)`), and `lastProcessingMs`. Removed `processingStartedAt` state (only ref used).
   - Effects for video object URL and file preview when `selectedFile` is set.
   - `handleProcess(trimStartPercent?, trimEndPercent?)` – Converts trim 0–100% to seconds via `filePreview?.durationSeconds` and passes `trimmedStart`/`trimmedEnd` into `uploadFile`.
   - Replaced layout with `ToolLayout` and state-based main content: UploadZone | ProcessingInterface (file + profile + level + estimate + trim) | ProcessingProgress | TranslateResult + WorkflowChainSuggestion + size block + CrossToolSuggestions | FailedState.
   - Removed direct use of `FileUploadZone`, `UsageCounter`, `PlanBadge`, `ProgressBar`, `SuccessState`, `UsageDisplay`, `VideoTrimmer`. Trim in `ProcessingInterface`; usage/plan in `ToolSidebar`.

2. **Unchanged**
   - Workflow prefill from `location.state` (useWorkflowVideo), `handleFileSelect`, `getEstimatedSize`, `compressionLevel`/`compressProfile` logic, `uploadFile` options, job polling, free export count (2), download (blob/direct), `handleProcessAnother`, `getDownloadUrl`, WorkflowChainSuggestion, size comparison block, CrossToolSuggestions with workflow state, PaywallModal, analytics.

---

## File Map

| Purpose | Location |
|--------|-----------|
| Page | `client/src/pages/CompressVideo.tsx` |
| Figma layout | `client/src/components/figma/ToolLayout.tsx` |
| Figma upload | `client/src/components/figma/UploadZone.tsx` |
| Figma configure | `client/src/components/figma/ProcessingInterface.tsx` |
| Figma progress | `client/src/components/figma/ProcessingProgress.tsx` |
| Figma result | `client/src/components/figma/TranslateResult.tsx` (reused) |
| Figma sidebar | `client/src/components/figma/ToolSidebar.tsx` |
| Figma form controls | `client/src/components/figma/FormControls.tsx` (RadioGroup) |
| File preview | `client/src/lib/filePreview.ts` |

---

## Route

- App route remains **`/compress-video`**. Breadcrumb uses `href: '/compress-video'`. Entry with `state: { useWorkflowVideo: true }` still prefills from workflow.
