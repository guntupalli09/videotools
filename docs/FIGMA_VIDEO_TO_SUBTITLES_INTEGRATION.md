# Figma UI Integration: Video → Subtitles Screen

## Summary

The **Video → Subtitles** tool page (`/video-to-subtitles`) has been updated to use the new Figma-generated UI while keeping all existing behavior, API calls, and state.

- **Scope:** Upload page, processing page, and results page (VideoToSubtitles).
- **Backend:** Unchanged (no API, worker, or service changes).
- **Contract:** No endpoint or request/response changes.

---

## Checklist

| Item | Status |
|------|--------|
| Upload works | ✔ |
| Format/language options (SRT/VTT, language, multi-language) | ✔ |
| Trim (0–100% → seconds) | ✔ |
| Progress (upload + processing, live subtitles) | ✔ |
| Results + download (free watermark, paid direct) | ✔ |
| SubtitleEditor, translate, convert, CrossToolSuggestions | ✔ |
| Errors + PaywallModal + FAQ | ✔ |

### Details

- **Upload:** Figma `UploadZone` with `immediateSelect`. File selection goes to configure step; options (format, language, additional languages) and trim live in `ProcessingInterface`; primary action "Generate Subtitles" calls `handleProcess(trimStartPercent?, trimEndPercent?)`.
- **Progress:** Figma `ProcessingProgress` with steps (Uploading, Transcribing, Generating subtitles), current message from `uploadPhase`, progress %, optional queue/connection status, live transcript from `partialSegments`, and cancel.
- **Results:** Figma `SubtitleResult` shows success, file name, processing time, format, download (free: watermark + freeExportsUsed; paid: direct), "Process another", and next-step links (Translate, Fix, Burn). Existing blocks below: `WorkflowChainSuggestion`, `SubtitleEditor`, translate/copy, warnings, preview, convert format, `CrossToolSuggestions`.
- **Errors:** Existing `FailedState` and `PaywallModal` unchanged. FAQ section rendered outside `ToolLayout`.

---

## Adjustments Made

1. **Figma components used**
   - `ToolLayout` – Breadcrumbs (Video to Subtitles), title, subtitle, icon (`MessageSquare`), tags, main + `ToolSidebar`.
   - `UploadZone` – `immediateSelect`, `onFileSelect`, `onRemove`, `fromWorkflowLabel`.
   - `ProcessingInterface` – File card (name, size, duration), optional video player (`videoSrc` = `videoPreviewUrl`), children: `RadioGroup` (SRT/VTT), `Select` (language), `LanguageSelector` (additional languages). `onAction(trimStartPercent, trimEndPercent)` → `handleProcess`.
   - `ProcessingProgress` – Steps as `{ label, status }[]`, `currentMessage`, `progress`, `estimatedTime`, `statusSubtext`, `liveTranscript`, `onCancel`.
   - `SubtitleResult` – `fileName`, `processingTime`, `format`, `onDownload`, `onProcessAnother`, `relatedTools` (translate, fix, burn).
   - `ToolSidebar` – `refreshTrigger={status}`, `showWhatYouGet={status === 'idle'}`.
   - `FormControls` – `RadioGroup`, `Select` (from existing Figma set).

2. **VideoToSubtitles page**
   - State: added `videoPreviewUrl`; effect creates/revokes object URL when `selectedFile` is a video.
   - `handleProcess(trimStartPercent?, trimEndPercent?)` – Converts trim 0–100% to seconds via `filePreview?.durationSeconds` and passes into existing upload options (`trimmedStart`/`trimmedEnd`).
   - Return: fragment → `ToolLayout` with state-based main content (UploadZone | ProcessingInterface | ProcessingProgress | SubtitleResult + existing result blocks | FailedState), then PaywallModal, then FAQ.

3. **Removed from page**
   - Direct use of `FileUploadZone`, `FilePreviewCard`, `UploadStageIndicator`, `ProcessingTimeBlock`, `ProgressBar`, `SuccessState`, `UsageCounter`, `PlanBadge`, `UsageDisplay`, `UsageRemaining`, `VideoTrimmer`. Replaced by Figma layout and `ToolSidebar`.

4. **Unchanged**
   - Rehydration, job polling, partial segments, free export watermark (FREE_EXPORT_WATERMARK, freeExportsUsed), convert format, translate, copy, SubtitleEditor (lazy), warnings, preview, CrossToolSuggestions, WorkflowChainSuggestion, PaywallModal, analytics, usage, and API/worker contracts.

---

## File Map

| Purpose | Location |
|--------|-----------|
| Page | `client/src/pages/VideoToSubtitles.tsx` |
| Figma layout | `client/src/components/figma/ToolLayout.tsx` |
| Figma upload | `client/src/components/figma/UploadZone.tsx` |
| Figma configure | `client/src/components/figma/ProcessingInterface.tsx` |
| Figma progress | `client/src/components/figma/ProcessingProgress.tsx` |
| Figma result | `client/src/components/figma/SubtitleResult.tsx` |
| Figma sidebar | `client/src/components/figma/ToolSidebar.tsx` |
| Figma form controls | `client/src/components/figma/FormControls.tsx` (RadioGroup, Select) |

---

## Route

- App route remains **`/video-to-subtitles`**. Breadcrumb uses `href: '/video-to-subtitles'`.
