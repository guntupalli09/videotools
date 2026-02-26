# Figma UI Integration: Batch Processing Screen

## Summary

The **Batch Processing** tool page (`/batch-process`) has been updated to use the new Figma-generated UI while keeping all existing behavior, API calls, and state.

- **Scope:** Upload (multiple files), processing, and results (BatchProcess).
- **Backend:** Unchanged (no API changes).
- **Contract:** No endpoint or request/response changes.

---

## Checklist

| Item | Status |
|------|--------|
| Multi-file upload (drag/drop, browse) | ✔ |
| File list + Clear all + Start Batch | ✔ |
| Progress (batch percentage) | ✔ |
| Done: Download ZIP, Process another, CrossToolSuggestions | ✔ |
| Failed + FAQ | ✔ |

### Details

- **Upload (no files):** Figma `UploadZone` with `multiple`, `onFilesSelect`, video formats, max 10 GB. User selects or drops multiple files; parent receives them via `onFilesSelect`.
- **Configure (files selected):** Card showing "N files selected", file name list (first 20), Clear all, and **Start Batch** button.
- **Processing:** Figma `ProcessingProgress` with steps (Uploading, Processing, Completed), message "Processing your batch...", progress from `batchInfo.progress.percentage`, cancel → reset to idle.
- **Done:** Figma `TranslateResult` (reused) with title "Batch complete!", fileName = "X completed, Y failed", processing time, **Download ZIP** (opens `getBatchDownloadUrl(batchId)` in new tab), **Process another** (reset), related tools. `CrossToolSuggestions` below unchanged.
- **Failed:** Existing `FailedState` with custom message. FAQ outside `ToolLayout`.

---

## Adjustments Made

1. **UploadZone (figma)**
   - Added `multiple?: boolean` and `onFilesSelect?: (files: File[]) => void`. When `multiple` is true, the file input has the `multiple` attribute and drop/change pass all files to `onFilesSelect`. Single-file flow unchanged.

2. **BatchProcess page**
   - Added `lastProcessingMs` state set when batch completes (completed/partial).
   - Replaced layout with `ToolLayout` and state-based main content: UploadZone (multiple) | file list card + Start Batch | ProcessingProgress | TranslateResult + CrossToolSuggestions | FailedState.
   - Removed direct use of `FileUploadZone`, `PlanBadge`, `UsageCounter`, `UsageDisplay`, `ProgressBar`, `Loader2`. Usage/plan in `ToolSidebar`.
   - `handleProcessAnother` resets status, files, and batchInfo.

3. **Unchanged**
   - `handleFilesSelected`, `handleStartBatch`, `uploadBatch`, `getBatchStatus`, polling, `getBatchDownloadUrl`, `texJobStarted`/`texJobCompleted`/`texJobFailed`, CrossToolSuggestions, FailedState message, FAQ.

---

## File Map

| Purpose | Location |
|--------|-----------|
| Page | `client/src/pages/BatchProcess.tsx` |
| Figma layout | `client/src/components/figma/ToolLayout.tsx` |
| Figma upload | `client/src/components/figma/UploadZone.tsx` (multiple + onFilesSelect) |
| Figma progress | `client/src/components/figma/ProcessingProgress.tsx` |
| Figma result | `client/src/components/figma/TranslateResult.tsx` (reused) |
| Figma sidebar | `client/src/components/figma/ToolSidebar.tsx` |

---

## Route

- App route remains **`/batch-process`**. Breadcrumb uses `href: '/batch-process'`.
