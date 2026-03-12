/**
 * Programmatic SEO: generate landing pages from targets × intents.
 * Produces ~200 pages: /transcribe-webinar, /webinar-to-text, /webinar-transcription, etc.
 */
import type { SeoRegistryEntry, FaqItem } from './seoRegistry'
import { transcriptionTargets, targetToSlug, slugToTitle } from '../data/seoPages'

/** Path patterns: (slug) => path. Slug is e.g. "youtube-video", "podcast". */
const INTENT_PATTERNS: Array<{
  pattern: (slug: string) => string
  toolKey: 'video-to-transcript' | 'video-to-subtitles'
  titleTmpl: (target: string) => string
  descTmpl: (target: string) => string
  h1Tmpl: (target: string) => string
}> = [
  {
    pattern: (s) => `/transcribe-${s}`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `Transcribe ${t} to Text | VideoText`,
    descTmpl: (t) => `Transcribe ${t} to text online. Upload your file or paste a URL. Get accurate transcripts. Export SRT, TXT. Free tier.`,
    h1Tmpl: (t) => `Transcribe ${t} to Text`,
  },
  {
    pattern: (s) => `/${s}-to-text`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} to Text – Convert Online | VideoText`,
    descTmpl: (t) => `Convert ${t} to text. Upload or paste URL. AI transcription. Export SRT, TXT. Free.`,
    h1Tmpl: (t) => `${t} to Text`,
  },
  {
    pattern: (s) => `/${s}-transcription`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} Transcription – Online | VideoText`,
    descTmpl: (t) => `Transcribe ${t} to text. Upload file. Get transcripts with speaker labels. Export SRT, TXT. Free tier.`,
    h1Tmpl: (t) => `${t} Transcription`,
  },
  {
    pattern: (s) => `/generate-${s}-transcript`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `Generate ${t} Transcript | VideoText`,
    descTmpl: (t) => `Generate transcript from ${t}. Upload or paste URL. AI-powered. Export SRT, TXT, DOCX. Free.`,
    h1Tmpl: (t) => `Generate ${t} Transcript`,
  },
  {
    pattern: (s) => `/${s}-subtitles`,
    toolKey: 'video-to-subtitles',
    titleTmpl: (t) => `${t} Subtitles – Generate SRT | VideoText`,
    descTmpl: (t) => `Generate subtitles from ${t}. Upload file. Get SRT/VTT. Export for YouTube, Vimeo. Free.`,
    h1Tmpl: (t) => `${t} Subtitles`,
  },
  {
    pattern: (s) => `/${s}-to-transcript`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} to Transcript – Online | VideoText`,
    descTmpl: (t) => `Convert ${t} to transcript. Upload or paste URL. AI transcription. Export SRT, TXT. Free.`,
    h1Tmpl: (t) => `${t} to Transcript`,
  },
  {
    pattern: (s) => `/convert-${s}-to-text`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `Convert ${t} to Text | VideoText`,
    descTmpl: (t) => `Convert ${t} to text online. Upload file. Get transcript. Export SRT, TXT. Free tier.`,
    h1Tmpl: (t) => `Convert ${t} to Text`,
  },
  {
    pattern: (s) => `/${s}-transcript`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} Transcript – Get Text Online | VideoText`,
    descTmpl: (t) => `Get transcript from ${t}. Upload or paste URL. AI transcription. Export SRT, TXT. Free.`,
    h1Tmpl: (t) => `${t} Transcript`,
  },
  {
    pattern: (s) => `/${s}-to-transcription`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} to Transcription | VideoText`,
    descTmpl: (t) => `Transcribe ${t} to text. Upload file. Get accurate transcript. Export SRT, TXT. Free.`,
    h1Tmpl: (t) => `${t} to Transcription`,
  },
  {
    pattern: (s) => `/transcript-from-${s}`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `Transcript from ${t} | VideoText`,
    descTmpl: (t) => `Get transcript from ${t}. Upload or paste URL. AI transcription. Export SRT, TXT, DOCX. Free.`,
    h1Tmpl: (t) => `Transcript from ${t}`,
  },
]

const DEFAULT_FAQ: FaqItem[] = [
  { q: 'How do I transcribe this?', a: 'Upload your video or paste a URL. Click Transcribe and get a full transcript in seconds. Export as SRT, TXT, or translate to 6 languages.' },
  { q: 'Is it free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
  { q: 'What formats can I export?', a: 'Plain text (TXT), SRT subtitles, and VTT. Paid plans add JSON, CSV, Markdown, and Notion-style export.' },
]

/** Paths that already exist in the manual registry — skip to avoid duplicates. */
const EXISTING_PATHS = new Set([
  '/transcribe-youtube-video', '/transcribe-video', '/transcribe-video-online', '/youtube-to-transcript',
  '/youtube-transcript', '/youtube-transcript-generator', '/video-to-text-converter', '/audio-to-text-converter',
  '/podcast-transcript', '/podcast-transcription', '/interview-transcription', '/meeting-transcript',
  '/meeting-transcription', '/webinar-transcription', '/lecture-transcription', '/zoom-recording-transcript',
  '/mp4-to-text', '/video-to-text', '/audio-to-text', '/video-transcription', '/video-to-subtitles',
  '/subtitle-generator', '/video-caption-generator', '/add-subtitles-to-video', '/auto-subtitle-generator',
  '/srt-generator', '/video-to-srt', '/burn-subtitles-into-video', '/youtube-subtitle-generator',
  '/caption-video-online', '/generate-subtitles-from-video', '/automatic-subtitles', '/caption-generator',
  '/descript-alternative', '/otter-ai-alternative', '/rev-alternative', '/trint-alternative',
  '/turboscribe-alternative', '/best-video-transcription-tool', '/best-youtube-transcription-tool',
  '/best-podcast-transcription-tool', '/fastest-transcription-tool', '/free-video-transcription-tool',
])

/** Generate programmatic SEO entries. Skips paths that already exist. */
export function getProgrammaticSeoEntries(): SeoRegistryEntry[] {
  const entries: SeoRegistryEntry[] = []
  const seenPaths = new Set<string>(EXISTING_PATHS)

  for (const target of transcriptionTargets) {
    const slug = targetToSlug(target)
    const titleCase = slugToTitle(slug)

    for (const { pattern, toolKey, titleTmpl, descTmpl, h1Tmpl } of INTENT_PATTERNS) {
      const path = pattern(slug)
      if (seenPaths.has(path)) continue
      seenPaths.add(path)

      const intentKey = path.slice(1).replace(/\//g, '-')
      entries.push({
        path,
        title: titleTmpl(titleCase),
        description: descTmpl(titleCase),
        h1: h1Tmpl(titleCase),
        intro: `Transcribe ${titleCase.toLowerCase()} to text in seconds. Upload your file or paste a URL. Our AI extracts speech and produces a clean transcript. Export SRT, TXT, or translate to 6 languages. Free tier.`,
        faq: DEFAULT_FAQ,
        breadcrumbLabel: h1Tmpl(titleCase),
        toolKey,
        relatedSlugs: toolKey === 'video-to-transcript'
          ? ['/video-to-transcript', '/youtube-to-transcript', '/podcast-transcript']
          : ['/video-to-subtitles', '/subtitle-generator', '/srt-generator'],
        indexable: true,
        intentKey,
        defaultInputMode: slug.includes('youtube') ? 'youtube' : undefined,
      })
    }
  }

  return entries
}

/** All programmatic paths (for routing, sitemap). */
export function getProgrammaticPaths(): string[] {
  return getProgrammaticSeoEntries().map((e) => e.path)
}
