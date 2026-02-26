# Figma UI Integration: Fix Subtitles Screen

## Summary

The **Fix Subtitles** tool page (`/fix-subtitles`) has been updated to use the new Figma-generated UI while keeping all existing behavior, API calls, and state.

- **Scope:** Upload, analyze, fix-options, processing, and results (FixSubtitles).
- **Backend:** Unchanged (no API, worker, or service changes).
- **Contract:** No endpoint or request/response changes.

---

## Checklist

| Item | Status |
|------|--------|
| Upload (SRT/VTT) | ✔ |
| Analyze Subtitles → issues/warnings | ✔ |
| Fix options (timing, grammar, line breaks, remove fillers) | ✔ |
| Auto-fix / No issues found flows | ✔ |
| Progress (analyzing + processing) | ✔ |
| Results + download (free watermark, paid direct) | ✔ |
| SubtitleEditor, warnings, issues summary, CrossToolSuggestions | ✔ |

### Details

- **Upload:** Figma `UploadZone` with `immediateSelect`, `acceptedFormats={['SRT','VTT']}`, `acceptAttribute=".srt,.vtt"`, `maxSize="10 MB"`. File selection goes to configure step.
- **Configure (pre-analyze):** Figma `ProcessingInterface` with file card, action "Analyze Subtitles", `onAction={() => handleAnalyze()}`, no video.
- **Analyzing:** Figma `ProcessingProgress` with steps (Uploading, Analyzing, Completed), message "Analyzing subtitles...", progress %, optional queue, cancel → `handleProcessAnother`.
- **Post-analyze (idle, showIssues):** Fix-options card with Figma `Checkbox` x4 (fix timing, grammar, line breaks, remove fillers). Then either: (1) Issues/warnings card + "Auto-fix all issues →" button, or (2) "No issues found!" card with "Apply optional fixes" / "Process another file".
- **Processing (auto-fix):** Figma `ProcessingProgress` with steps (Uploading, Fixing, Completed), message "Fixing issues...", progress %, optional queue, cancel.
- **Results:** Figma `TranslateResult` (reused) with title "Subtitles fixed!", file name, processing time, download (free watermark / paid direct), "Process another", related tools (Burn, Translate, Video → Subtitles). Existing blocks below: SubtitleEditor, warnings, issues-fixed summary, CrossToolSuggestions.
- **Errors:** Existing `FailedState` unchanged. FAQ section rendered outside `ToolLayout`.

---

## Adjustments Made

1. **FixSubtitles page**
   - Replaced previous layout (hero + FileUploadZone, ProgressBar, SuccessState, etc.) with `ToolLayout` and state-based main content.
   - Added `lastProcessingMs` state set on auto-fix completion for "Processed in X.Xs" in result.
   - Removed `processingStartedAt` state (only ref used for timing).
   - Removed direct use of `FileUploadZone`, `UsageCounter`, `PlanBadge`, `ProgressBar`, `SuccessState`, `UsageDisplay`. Sidebar/usage in `ToolSidebar`.
   - Fix-options and issues/no-issues cards wrapped in one `idle && showIssues` block with Figma `Checkbox` components.

2. **Unchanged**
   - Two-phase flow: analyze (handleAnalyze) then optional fix options + auto-fix (handleAutoFix). All upload/polling/result logic, `handleFileSelect`, `handleProcessAnother`, `getDownloadUrl`, free export watermark, `parseSubtitlesToRows`, `rowsToSrt`, SubtitleEditor, warnings, issues display, CrossToolSuggestions, FAQ.

---

## File Map

| Purpose | Location |
|--------|-----------|
| Page | `client/src/pages/FixSubtitles.tsx` |
| Figma layout | `client/src/components/figma/ToolLayout.tsx` |
| Figma upload | `client/src/components/figma/UploadZone.tsx` |
| Figma configure | `client/src/components/figma/ProcessingInterface.tsx` |
| Figma progress | `client/src/components/figma/ProcessingProgress.tsx` |
| Figma result | `client/src/components/figma/TranslateResult.tsx` (reused) |
| Figma sidebar | `client/src/components/figma/ToolSidebar.tsx` |
| Figma form controls | `client/src/components/figma/FormControls.tsx` (Checkbox) |

---

## Route

- App route remains **`/fix-subtitles`**. Breadcrumb uses `href: '/fix-subtitles'`.
