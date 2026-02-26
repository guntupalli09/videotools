# Figma UI Integration: Translate Subtitles Screen

## Summary

The **Translate Subtitles** tool page (`/translate-subtitles`) has been updated to use the new Figma-generated UI while keeping all existing behavior, API calls, and state.

- **Scope:** Upload page, processing page, and results page (TranslateSubtitles).
- **Backend:** Unchanged (no API, worker, or service changes).
- **Contract:** No endpoint or request/response changes.

---

## Checklist

| Item | Status |
|------|--------|
| Upload (SRT/VTT) | ✔ |
| Target language (Arabic, Hindi) | ✔ |
| Progress (upload + translating) | ✔ |
| Results + download (free watermark, paid direct) | ✔ |
| WorkflowChainSuggestion, consistency issues, SubtitleEditor | ✔ |
| CrossToolSuggestions, PaywallModal, FAQ | ✔ |

### Details

- **Upload:** Figma `UploadZone` with `immediateSelect`, `acceptedFormats={['SRT','VTT']}`, `acceptAttribute=".srt,.vtt"`, `maxSize="10 MB"`. File selection goes to configure step.
- **Configure:** Figma `ProcessingInterface` with file card (name, size), no video player. Children: `Select` for "Translate to" (Arabic, Hindi). Primary action "Translate Subtitles" calls `handleProcess()`.
- **Progress:** Figma `ProcessingProgress` with steps (Uploading, Translating, Completed), message "Translating subtitles...", progress %, optional queue position, cancel → `handleProcessAnother`.
- **Results:** Figma `TranslateResult` with title "Translation complete!", file name, processing time, download (free: watermark + freeExportsUsed; paid: direct), "Process another", and next-step links (Fix, Burn, Video → Subtitles). Existing blocks below: `WorkflowChainSuggestion`, consistency-issues block, `SubtitleEditor`, `CrossToolSuggestions`.
- **Errors:** Existing `FailedState` and `PaywallModal` unchanged. FAQ section rendered outside `ToolLayout`.

---

## Adjustments Made

1. **New Figma component**
   - `TranslateResult` – Success title, file name, processing time, optional file size, configurable download label, onDownload, onProcessAnother, relatedTools (path/name/description). Same layout pattern as `SubtitleResult` without format badge.

2. **UploadZone**
   - Added optional `acceptAttribute` prop (e.g. `.srt,.vtt`) so the native file input can restrict to subtitle formats when used on Translate Subtitles.

3. **TranslateSubtitles page**
   - Replaced previous layout (hero + tabs + FileUploadZone / paste + ProgressBar + SuccessState) with `ToolLayout` and state-based children: `UploadZone` | `ProcessingInterface` | `ProcessingProgress` | `TranslateResult` + WorkflowChainSuggestion + consistency issues + SubtitleEditor + CrossToolSuggestions | `FailedState`.
   - Added `lastProcessingMs` state set on job completion for "Processed in X.Xs" in TranslateResult.
   - Removed direct use of `FileUploadZone`, `UsageCounter`, `PlanBadge`, `ProgressBar`, `SuccessState`, `UsageDisplay`. Sidebar and usage live in `ToolSidebar`.
   - Paste tab UI removed; flow is upload-only (paste path in `handleProcess` still shows toast "Please upload a subtitle file" if ever called).

4. **Unchanged**
   - All upload/polling/result logic, `handleFileSelect`, `handleProcess` (tab === 'upload' && selectedFile), `handleProcessAnother`, `getDownloadUrl`, free export watermark, `parseSubtitlesToRows`, `rowsToSrt`, SubtitleEditor, consistency issues display, WorkflowChainSuggestion, CrossToolSuggestions, PaywallModal, analytics, usage, job persistence.

---

## File Map

| Purpose | Location |
|--------|-----------|
| Page | `client/src/pages/TranslateSubtitles.tsx` |
| Figma layout | `client/src/components/figma/ToolLayout.tsx` |
| Figma upload | `client/src/components/figma/UploadZone.tsx` |
| Figma configure | `client/src/components/figma/ProcessingInterface.tsx` |
| Figma progress | `client/src/components/figma/ProcessingProgress.tsx` |
| Figma result | `client/src/components/figma/TranslateResult.tsx` |
| Figma sidebar | `client/src/components/figma/ToolSidebar.tsx` |
| Figma form controls | `client/src/components/figma/FormControls.tsx` (Select) |

---

## Route

- App route remains **`/translate-subtitles`**. Breadcrumb uses `href: '/translate-subtitles'`. SEO entry points (e.g. `/srt-translator`) still reuse this page via `TranslateSubtitles` with optional `seoH1` / `seoIntro` / `faq` props.
