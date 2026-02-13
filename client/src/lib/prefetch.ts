/**
 * Prefetch route chunks on hover/focus so navigation feels instant.
 * Uses the same dynamic imports as App.tsx so the chunk is shared; we only trigger the load early.
 * No-op for paths not in the map. Fire-and-forget (does not await).
 */
const prefetchMap: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Home'),
  '/pricing': () => import('../pages/Pricing'),
  '/login': () => import('../pages/Login'),
  '/forgot-password': () => import('../pages/ForgotPassword'),
  '/reset-password': () => import('../pages/ResetPassword'),
  '/refer': () => import('../pages/Refer'),
  '/privacy': () => import('../pages/Privacy'),
  '/faq': () => import('../pages/Faq'),
  '/terms': () => import('../pages/Terms'),
  '/video-to-transcript': () => import('../pages/VideoToTranscript'),
  '/video-to-subtitles': () => import('../pages/VideoToSubtitles'),
  '/batch-process': () => import('../pages/BatchProcess'),
  '/translate-subtitles': () => import('../pages/TranslateSubtitles'),
  '/fix-subtitles': () => import('../pages/FixSubtitles'),
  '/burn-subtitles': () => import('../pages/BurnSubtitles'),
  '/compress-video': () => import('../pages/CompressVideo'),
  '/video-to-text': () => import('../pages/seo/VideoToTextPage'),
  '/mp4-to-text': () => import('../pages/seo/Mp4ToTextPage'),
  '/mp4-to-srt': () => import('../pages/seo/Mp4ToSrtPage'),
  '/subtitle-generator': () => import('../pages/seo/SubtitleGeneratorPage'),
  '/srt-translator': () => import('../pages/seo/SrtTranslatorPage'),
  '/meeting-transcript': () => import('../pages/seo/MeetingTranscriptPage'),
  '/speaker-diarization': () => import('../pages/seo/SpeakerDiarizationPage'),
  '/video-summary-generator': () => import('../pages/seo/VideoSummaryGeneratorPage'),
  '/video-chapters-generator': () => import('../pages/seo/VideoChaptersGeneratorPage'),
  '/keyword-indexed-transcript': () => import('../pages/seo/KeywordIndexedTranscriptPage'),
  '/srt-to-vtt': () => import('../pages/seo/SrtToVttPage'),
  '/subtitle-converter': () => import('../pages/seo/SubtitleConverterPage'),
  '/subtitle-timing-fixer': () => import('../pages/seo/SubtitleTimingFixerPage'),
  '/subtitle-validation': () => import('../pages/seo/SubtitleValidationPage'),
  '/subtitle-translator': () => import('../pages/seo/SubtitleTranslatorPage'),
  '/multilingual-subtitles': () => import('../pages/seo/MultilingualSubtitlesPage'),
  '/subtitle-language-checker': () => import('../pages/seo/SubtitleLanguageCheckerPage'),
  '/subtitle-grammar-fixer': () => import('../pages/seo/SubtitleGrammarFixerPage'),
  '/subtitle-line-break-fixer': () => import('../pages/seo/SubtitleLineBreakFixerPage'),
  '/hardcoded-captions': () => import('../pages/seo/HardcodedCaptionsPage'),
  '/video-with-subtitles': () => import('../pages/seo/VideoWithSubtitlesPage'),
  '/video-compressor': () => import('../pages/seo/VideoCompressorPage'),
  '/reduce-video-size': () => import('../pages/seo/ReduceVideoSizePage'),
  '/batch-video-processing': () => import('../pages/seo/BatchVideoProcessingPage'),
  '/bulk-subtitle-export': () => import('../pages/seo/BulkSubtitleExportPage'),
  '/bulk-transcript-export': () => import('../pages/seo/BulkTranscriptExportPage'),
}

export function prefetchRoute(pathname: string): void {
  const path = pathname?.split('?')[0]?.replace(/\/$/, '') || '/'
  const load = prefetchMap[path === '' ? '/' : path]
  if (load) {
    load().catch(() => {}) // fire-and-forget; ignore errors (e.g. network)
  }
}
