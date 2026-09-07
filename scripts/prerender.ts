/**
 * Post-build prerender script.
 *
 * Generates static HTML files for every SEO and static route, injecting the
 * correct <title>, <meta name="description">, <link rel="canonical">, Open Graph,
 * Twitter Card, and JSON-LD into each file's <head>.
 *
 * Vercel serves static files before evaluating rewrites, so a file at
 * dist/video-to-text/index.html is served directly — no JS required for crawlers.
 *
 * Run: npx tsx scripts/prerender.ts
 * Or add as a postbuild step: "postbuild": "npx tsx scripts/prerender.ts"
 */

import * as fs from 'fs'
import * as path from 'path'
import { getProgrammaticSeoEntries } from '../client/src/lib/generateSeoPages'
import { getCanonicalPathForRoute } from '../client/src/lib/primaryUrls'
import { getSoftwareApplicationJsonLd, getHowToJsonLd, getHomeSoftwareApplicationJsonLd } from '../client/src/lib/seoMeta'
import {
  formatPublicRatingCount,
  formatPublicRatingValue,
  parsePublicRating,
  type PublicRating,
} from '../client/src/lib/publicRating'
import { getCoreToolFaq, getCoreToolSeoDepth } from '../client/src/lib/coreToolSeoDepth'
import { getIndexablePaths } from './seo/registry'
import { stripTopLevelSoftwareApplicationScripts } from './seo/jsonLdUtils'
import { renderPageToHtml } from '../client/src/ssr-render'
import { getContextualCta, getRouteFamily } from '../client/src/lib/routeFamilyTemplates'
import slugMapJson from '../client/src/data/hashnode-slug-map.json'

const REPO_ROOT = path.resolve(__dirname, '..')
// Vercel outputDirectory is the root-level dist/ (build copies client/dist → dist/).
// Prerender must write here so Vercel serves per-route HTML directly to crawlers.
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const REGISTRY_PATH = path.join(REPO_ROOT, 'client', 'src', 'lib', 'seoRegistry.ts')
const SITE_URL = 'https://videotext.io'
const BLOG_URL = 'https://blog.videotext.io'
const SITE_NAME = 'VideoText'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`

// ── Types ─────────────────────────────────────────────────────────────────────

interface RouteMeta {
  path: string
  title: string
  description: string
  h1?: string
  faq?: Array<{ q: string; a: string }>
  breadcrumbLabel?: string
  noindex?: boolean
  robots?: string
  // High-conversion content fields
  valueProposition?: string
  keywords?: string[]
  comparison?: { tool: string; vs: string }[]
  howToUse?: Array<{ step: number; title: string; detail: string }>
  socialProof?: { stat: string; desc: string }[]
  // Optional fields for registry entries (not in static meta)
  intentKey?: string
  defaultInputMode?: 'youtube'
}

// ── Static route metadata ─────────────────────────────────────────────────────

const STATIC_META: RouteMeta[] = [
  {
    path: '/',
    title: `VideoText: Video to Text & Subtitles | ${SITE_NAME}`,
    description:
      'VideoText is AI video-to-text software: transcript, SRT/VTT, summary, and chapters from a video or YouTube URL. Whisper large-v3. 3 free imports/mo.',
    h1: 'VideoText: Video to Text & Subtitle Tools',
    faq: [
      { q: 'What is VideoText — is it the same as “video text”?', a: 'VideoText is one word: AI software that turns video into a transcript, SRT/VTT subtitles, a summary, and chapters. It is not a generic “video text” site. Upload a video or YouTube URL to try 3 free imports this month — no card; watermark on free exports.' },
      { q: 'What do I get from one upload?', a: 'A transcript plus SRT/VTT subtitles, a summary, and chapters. Files are deleted after processing.' },
      { q: 'Is VideoText free to try?', a: 'Yes. 3 imports per month, no credit card. Free exports include a watermark; upgrade for clean files. Paid plans start if you need more volume.' },
    ],
  },
  {
    path: '/pricing',
    title: `Pricing — Free, Basic, Pro & Agency Plans | ${SITE_NAME}`,
    description:
      "VideoText pricing: Free 3 imports/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. 7-day money-back guarantee.",
    h1: 'Simple, Transparent Pricing',
    keywords: ['VideoText pricing', 'pricing plans', 'free transcription tool', 'cheap video transcription', 'affordable transcription service', 'transcription pricing comparison', 'monthly subscription plans', 'no hidden fees', 'money-back guarantee'],
  },
  {
    path: '/privacy',
    title: `Privacy Policy — We Don't Store Your Data | ${SITE_NAME}`,
    description:
      "VideoText privacy: We process your files and delete them. We don't keep your uploads, transcripts, or outputs. Your content stays yours.",
    h1: 'Privacy Policy',
  },
  {
    path: '/faq',
    title: `VideoText FAQ — Privacy, Billing & Guides | ${SITE_NAME}`,
    description:
      'Answers on privacy (files deleted after jobs), billing, uploads, subtitles, verbatim modes, QA prep, and how Format → Client guidelines fits freelancer workflows.',
    h1: 'VideoText FAQ — Privacy, Billing & Guides',
    faq: [
      { q: 'Do you store my videos or files?', a: "No. We process your files and then delete them. We don't keep your uploads, transcripts, or generated outputs. Your content is never stored on our servers." },
      { q: 'Is my content used for AI training?', a: "No. Your content is used only to deliver the service you requested. We do not use it for training AI models." },
      { q: 'Do I need to sign up?', a: "Yes. Sign up for free to try the tools. No credit card required. Upgrade when you need more imports or paid features." },
      { q: 'What file formats are supported?', a: "Videos: MP4, MOV, AVI, WebM, MKV. Subtitles: SRT and VTT. You can also paste a video URL for supported sources." },
      { q: 'How does the free tier work?', a: "Sign up for free to get 3 imports per month (resets on the 1st), single language output, watermark on subtitle exports. No credit card required." },
      { q: 'Can I translate subtitles or transcripts?', a: "Yes. Use Translate Subtitles for SRT/VTT files (50+ languages). For transcripts, click Translate after generating to view in 6 languages: English, Hindi, Telugu, Spanish, Chinese, Russian." },
    ],
  },
  {
    path: '/guide',
    title: `How to use VideoText — Tools & Workflows | ${SITE_NAME}`,
    description:
      'Tool-by-tool steps for Video → Transcript, Format → Client guidelines (marketplace presets + editable cards), subtitles, translate, fix, burn, compress, batch, voice, YouTube URLs. Inputs, outputs, limits.',
    h1: 'How to use VideoText — tools, workflows, and client guidelines',
    keywords: ['how to use VideoText', 'VideoText tutorial', 'video transcription guide', 'subtitle generation guide', 'how to transcribe video', 'how to generate subtitles', 'step-by-step tutorial', 'feature guide', 'all tools explained'],
  },
  {
    path: '/terms',
    title: `Terms of Service | ${SITE_NAME}`,
    description:
      "Terms of use for VideoText. We don't store your data. Billing via Stripe. Use the service in accordance with these terms.",
    h1: 'Terms of Service',
  },
  {
    path: '/samples',
    title: `Transcript & Subtitle Output Samples | ${SITE_NAME}`,
    description:
      'Real output examples from VideoText: transcript sample with speakers/timestamps, SRT subtitle preview, and workflow deliverables (summary, chapters, exports).',
    h1: 'Transcript & Subtitle Output Samples',
  },
  {
    path: '/changelog',
    title: `Changelog — What's New | ${SITE_NAME}`,
    description:
      "VideoText changelog: new features, performance improvements, and bug fixes. Updated every release.",
    h1: 'Changelog',
  },

  {
    path: '/site-index',
    title: `All VideoText Pages — Workflow Index | ${SITE_NAME}`,
    description:
      'Internal index of VideoText transcription, subtitle, formatting, free tool, comparison, and alternatives pages.',
    h1: 'Complete VideoText Page Index',
    noindex: true,
    robots: 'noindex,follow',
  },
  {
    path: '/integrations/zapier',
    title: `VideoText + Zapier — Automate Transcription & Subtitles | ${SITE_NAME}`,
    description:
      'Connect VideoText to Zapier to automatically transcribe audio/video, generate and translate subtitles, fix subtitle timing, burn captions into video, and compress video from apps like Google Drive, Gmail, and Slack.',
    h1: 'VideoText + Zapier',
  },
  {
    path: '/docs/api',
    title: `API Documentation | ${SITE_NAME}`,
    description:
      'VideoText API reference: authentication, endpoints for transcription, subtitles, translation, subtitle repair, burning, and compression, job polling, errors, and rate limits.',
    h1: 'VideoText API',
  },

  {
    path: '/video-to-transcript',
    title: 'Video to Transcript — Free AI, 98.5% | VideoText',
    description:
      'Upload video or a YouTube URL. Get transcript, SRT/VTT, summary, and chapters. Whisper large-v3. Files deleted after processing. 3 free imports/mo.',
    h1: 'Fastest Way to Transcribe Your Audio/Video',
    valueProposition: 'VideoText lets you convert video to transcript online in minutes. Upload any video and get transcript text, subtitles (SRT/VTT), summary, and chapters in one click. 2-hour video → transcript in ~3–5 minutes.',
    keywords: ['video to transcript', 'convert video to transcript', 'transcribe video online', 'video to text', 'youtube transcript generator', 'subtitle generator', 'long video transcription', 'private transcription tool'],
    comparison: [
      { tool: 'Typical tools', vs: '20–40+ minutes for 2-hour videos' },
      { tool: 'VideoText workflow', vs: 'Upload → download transcript + SRT/VTT + summary + chapters' },
      { tool: 'Privacy', vs: 'Files deleted after processing' },
    ],
    howToUse: [
      { step: 1, title: 'Upload your video or paste a link', detail: 'Works for MP4, MOV, MP3, YouTube, Zoom, and more.' },
      { step: 2, title: 'AI transcribes in minutes', detail: 'Built for long videos and large files, not just short clips.' },
      { step: 3, title: 'Download transcript, subtitles, and summary', detail: 'Get transcript text, SRT/VTT subtitles, summary, and chapters in one run.' },
    ],
    socialProof: [
      { stat: '2-hour → 3–5 min', desc: 'Processing benchmark' },
      { stat: '70+', desc: 'Languages supported' },
      { stat: 'SRT + VTT', desc: 'Subtitle outputs included' },
      { stat: 'Deleted files', desc: 'Privacy-first processing' },
    ],
  },
  {
    path: '/guideline-format',
    title: `Format Transcripts to Client Guides | ${SITE_NAME}`,
    description:
      'Format a transcript to Rev, GoTranscript, TranscribeMe, or Scribie-style rules. Editable presets. Files deleted after processing. 3 free imports/mo.',
    h1: 'Format Transcripts to Client Guidelines',
    breadcrumbLabel: 'Format to client guidelines',
  },
  {
    path: '/video-to-subtitles',
    title: `Video to Subtitles — Full Caption Hub | ${SITE_NAME}`,
    description:
      'Caption-first hub: video or YouTube URL → timed SRT/VTT, then fix, translate, or burn. Transcript + summary lives on Video to Transcript. 3 free imports/mo.',
    h1: 'Video to Subtitles — Full Caption Hub',
    valueProposition: 'Create publication-ready SRT and VTT subtitle files in seconds. Perfect for YouTube, Vimeo, social media. No manual timing. No transcription service delays. Free tier: 3 imports/month.',
    keywords: ['video to subtitles', 'subtitle generator', 'SRT generator', 'VTT generator', 'auto subtitle', 'caption generator', 'subtitle maker', 'automatic captions'],
    comparison: [
      { tool: 'Submagic', vs: 'Expensive per video, limited exports' },
      { tool: 'Kapwing', vs: 'Video editor overhead, not transcription-focused' },
      { tool: 'YouTube Auto-Captions', vs: 'Lower accuracy, no export as files' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Video File', detail: 'Drag & drop MP4, MOV, or paste a YouTube link. Processing starts instantly.' },
      { step: 2, title: 'Choose Format', detail: 'Select SRT (universal) or VTT (modern web players). Single or multi-language.' },
      { step: 3, title: 'Download & Upload', detail: 'Get your .srt or .vtt file in seconds. Upload to YouTube Studio, Vimeo, or any player.' },
    ],
    socialProof: [
      { stat: '50,000+', desc: 'Creators generating subtitles' },
      { stat: '98.5%', desc: 'Accuracy (better than YouTube)' },
      { stat: '2-4 min', desc: 'Time to publication-ready subtitles' },
      { stat: '99%', desc: 'Format compatibility (YouTube, Vimeo, TikTok)' },
    ],
  },
  {
    path: '/translate-subtitles',
    title: `Translate Subtitles to Any Language | ${SITE_NAME}`,
    description:
      'Translate SRT or VTT to 70+ languages with timestamps intact. Upload, pick a language, download. Free to try. Files deleted after processing.',
    h1: 'Translate Subtitles to Any Language',
    valueProposition: 'Translate SRT or VTT subtitle files to 70+ languages with timestamps preserved. Upload, pick a target language, download. Support for Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, and more. Free to try — files deleted after processing.',
    keywords: ['translate subtitles', 'subtitle translator', 'SRT translator', 'VTT translator', 'translate SRT online', 'free subtitle translation', 'multilingual subtitles', 'subtitle translation tool', 'batch translate subtitles', 'translate subtitles to spanish', 'translate subtitles to hindi', 'translate subtitles to french', '70+ language translation'],
    comparison: [
      { tool: 'Manual translation', vs: 'Hours of work, expensive, error-prone' },
      { tool: 'Generic translation tools', vs: 'Lose subtitle timing and formatting' },
      { tool: 'Translation agencies', vs: '$200-500 per file, weeks for turnaround' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Subtitle File', detail: 'SRT or VTT. Drag & drop or browse.' },
      { step: 2, title: 'Choose Target Language', detail: 'Pick from 70+ languages. Timestamps stay intact.' },
      { step: 3, title: 'Download Translated File', detail: 'Same format, new language. Upload directly to your platform.' },
    ],
    socialProof: [
      { stat: '70+', desc: 'Languages supported' },
      { stat: 'Timestamps', desc: 'Preserved on every cue' },
    ],
    faq: [
      { q: 'How do I translate SRT or VTT subtitles?', a: 'Upload your SRT or VTT file, pick a target language, and download the translated file. Timestamps stay aligned with the original cues.' },
      { q: 'Do timestamps survive translation?', a: 'Yes. VideoText translates cue text only and keeps the original start and end times.' },
      { q: 'How many languages can I translate to?', a: '70+ languages, including Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, and Korean.' },
      { q: 'I do not have an SRT yet — how do I start?', a: 'Create one with the SRT file generator or the video to SRT converter, then translate it here.' },
    ],
  },
  {
    path: '/fix-subtitles',
    title: `Fix Subtitles — Timing, CPS & Lines | ${SITE_NAME}`,
    description:
      'Fix overlapping timestamps, long lines, CPS/reading-speed, and SRT/VTT formatting. Upload, download a cleaned file. Files deleted after processing.',
    h1: 'Fix Subtitles — Timing, CPS & Lines',
    valueProposition: 'Fix out-of-sync, overlapping, and malformed subtitles instantly. Auto-correct timing offsets, merge overlapping cues, split long lines, and validate formatting. Works with SRT, VTT, ASS, and TTML. No quality loss, no manual re-timing needed. Free and unlimited.',
    keywords: ['fix subtitles', 'subtitle fixer', 'fix out of sync subtitles', 'fix SRT timing', 'subtitle timing fixer', 'online subtitle editor', 'fix VTT files', 'subtitle editor free', 'fix overlapping subtitles', 'subtitle formatter', 'correct subtitle timing', 'shift subtitle timing', 'fix broken subtitles'],
    comparison: [
      { tool: 'Manual editing in Subtitle Edit', vs: '30+ min per file, steep learning curve' },
      { tool: 'Sync issues in Premiere', vs: 'Complex, no batch processing' },
      { tool: 'Online editors with UI', vs: 'Slow, limited fixes, require login' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Subtitle File', detail: 'SRT, VTT, ASS, or TTML file. Automatic detection of issues.' },
      { step: 2, title: 'Review Corrections', detail: 'See overlaps, long lines, gaps highlighted. Adjust offset if needed.' },
      { step: 3, title: 'Download Fixed File', detail: 'Ready for YouTube, Vimeo, or any platform. Perfect timing guaranteed.' },
    ],
    socialProof: [
      { stat: '4 file formats', desc: 'Supported: SRT, VTT, ASS, TTML' },
      { stat: 'Instant', desc: 'Fix any size file' },
      { stat: '98%+', desc: 'QC pass rate' },
      { stat: '0 cost', desc: 'Always free' },
    ],
  },
  {
    path: '/burn-subtitles',
    title: `Burn Subtitles into Video — Hardcode | ${SITE_NAME}`,
    description:
      'Hardcode SRT or VTT into video. Upload video + captions, download one file. For Instagram, TikTok, and players without caption tracks. 3 free imports/mo.',
    h1: 'Burn Subtitles into Video',
    valueProposition: 'Embed subtitles permanently into your video as hardcoded captions. Perfect for social media where external subtitle tracks won\'t disappear. Works with SRT and VTT files. Supports all major video formats: MP4, MOV, WebM. Customize position, size, and color. No watermarks, no quality loss.',
    keywords: ['burn subtitles', 'hardcode captions', 'embed subtitles in video', 'burn SRT into video', 'hardcoded captions', 'permanent subtitles', 'overlay subtitles on video', 'add captions to video', 'subtitle burner', 'hardcode subtitles free', 'burn subtitles online', 'burn subtitles without software', 'batch burn subtitles'],
    comparison: [
      { tool: 'Premiere Pro / Final Cut', vs: 'Steep learning curve, slow rendering, expensive' },
      { tool: 'FFmpeg command line', vs: 'Complex syntax, no UI, easy to make mistakes' },
      { tool: 'Adobe Media Encoder', vs: 'Expensive subscription, slow processing' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Video & Subtitles', detail: 'Video file (MP4, MOV, WebM) + SRT or VTT file. Drag & drop both.' },
      { step: 2, title: 'Customize Appearance', detail: 'Choose position (bottom, top), size, color. Preview instantly.' },
      { step: 3, title: 'Download Hardcoded Video', detail: 'Video with embedded captions. Works on any platform without subtitle support.' },
    ],
    socialProof: [
      { stat: '100%', desc: 'Permanent captions (no player needed)' },
      { stat: '3 formats', desc: 'Video support: MP4, MOV, WebM' },
      { stat: 'Zero lag', desc: 'No quality loss or re-encoding delay' },
      { stat: 'Free tier', desc: '3 videos/month included' },
    ],
  },
  {
    path: '/compress-video',
    title: `Compress Video — Light, Medium, Heavy | ${SITE_NAME}`,
    description:
      'Compress video online with light, medium, or heavy settings. Reduce size for uploads and sharing. Files deleted after processing. 3 free imports/mo.',
    h1: 'Compress Video — Light, Medium, Heavy',
    valueProposition: 'Choose light, medium, or heavy compression. Files are deleted after processing. Free plan: 3 imports/mo, no card, no watermark.',
    keywords: ['compress video', 'video compressor', 'reduce video size', 'video compression tool', 'compress MP4', 'free video compressor', 'compress video online', 'reduce file size', 'compress MOV', 'compress AVI', 'compress WebM', 'compress video without losing quality', 'batch compress videos'],
    comparison: [
      { tool: 'Adobe Media Encoder', vs: '$55/month, slow, quality loss, steep learning' },
      { tool: 'HandBrake', vs: 'Free but complex UI, slow processing, needs installation' },
      { tool: 'Online converters', vs: 'Ads, slow servers, file size limits, quality degradation' },
    ],
    howToUse: [
      { step: 1, title: 'Upload Video File', detail: 'MP4, MOV, AVI, WebM, or MKV. Any size, instant preview.' },
      { step: 2, title: 'Choose Compression Level', detail: 'Light (5-15% reduction), Medium (30-50%), or Heavy (60-80%).' },
      { step: 3, title: 'Download Compressed Video', detail: 'Same quality, smaller size. Ready to upload, email, or share.' },
    ],
    socialProof: [
      { stat: '40-80%', desc: 'File size reduction maintained' },
      { stat: '5 formats', desc: 'Supported: MP4, MOV, AVI, WebM, MKV' },
      { stat: 'Instant', desc: 'No waiting, no email, download direct' },
      { stat: 'Free', desc: '3 videos/month included' },
    ],
  },
  {
    path: '/voice-recorder',
    title: `Voice to Text — In-Browser Recorder | ${SITE_NAME}`,
    description:
      'Speak in the browser and get text. No video upload to start. Privacy-first: files deleted after processing. Free: 3 imports/mo, no card; watermark on free exports.',
    h1: 'Voice to Text — In-Browser Recorder',
    breadcrumbLabel: 'Voice Recorder',
  },
  // NOTE: '/batch-process' intentionally has no STATIC_META entry. It is a pure
  // client-side redirect into '/video-to-transcript' (batch capability lives inside
  // that tool, not a standalone UI — see client/src/pages/BatchProcess.tsx). It used
  // to have its own entry here, which canonicalized onto '/video-to-transcript' after
  // the 2026-08-31 SEO fix (see reports/seo-baseline-2026-08-31.md) — but since both
  // entries wrote to the same output path, whichever ran later clobbered the other's
  // prerendered file. Keeping this content out of STATIC_META avoids that collision;
  // if batch processing ever gets a real standalone UI, give it a real route + its
  // own canonical path instead of reusing '/batch-process' as a content page.
  // ── Comparison & alternative pages ──────────────────────────────────────────
  {
    path: '/compare',
    title: `VideoText vs Descript, Otter.ai & Trint — speed, price, subtitles, privacy | ${SITE_NAME}`,
    description:
      'Side-by-side on video behaviour, subtitle exports, turnaround, pricing, storage—plus freelancer preset checklists via Format → Client guidelines.',
    h1: 'VideoText vs Descript, Otter.ai & Trint — speed, price, subtitles, privacy',
    breadcrumbLabel: 'Compare',
    valueProposition: 'Switch from Otter, Descript, or Trint and save 80% on costs while cutting processing time in half. Same AI accuracy. Better privacy. No vendor lock-in.',
    keywords: ['transcription tools comparison', 'Otter alternative', 'Descript alternative', 'best transcription software', 'affordable transcription', 'fast transcription'],
    comparison: [
      { tool: 'Otter.ai', vs: '$180/year, 20+ min processing, calls only' },
      { tool: 'Descript', vs: '$288/year, 15 min processing, desktop app' },
      { tool: 'Trint', vs: '$288/year, live transcription only, expensive' },
    ],
    howToUse: [
      { step: 1, title: 'Export Your Data', detail: 'Download transcripts and settings from your current tool.' },
      { step: 2, title: 'Upload to VideoText', detail: 'Paste a YouTube URL or upload video files. Get transcripts in 3-5 minutes.' },
      { step: 3, title: 'Save Money & Time', detail: 'Free tier gets you started. Upgrade when ready. Keep 100% of your files.' },
    ],
    socialProof: [
      { stat: '6x faster', desc: 'Than Descript (3 min vs 18 min)' },
      { stat: '90% cheaper', desc: 'Than Otter ($0 free vs $180/year)' },
      { stat: '98.5%', desc: 'Accuracy rate on diverse audio' },
      { stat: '3,000+', desc: 'Switched from competitors' },
    ],
  },
  // ── Hub pages (category navigation) ──────────────────────────────────────────
  {
    path: '/alternatives',
    title: `Transcription & Subtitle Tool Alternatives | ${SITE_NAME}`,
    description:
      'Explore alternatives to Otter.ai, Descript, Rev, Sonix, and 40+ other transcription tools. Find the perfect AI transcription solution for your needs.',
    h1: 'Transcription & Subtitle Tool Alternatives',
    breadcrumbLabel: 'Alternatives',
  },
  {
    path: '/transcription-tools',
    title: `Transcription Tools & Resources | ${SITE_NAME}`,
    description:
      'Complete collection of transcription tools, guides, and comparisons. From podcasts to interviews to video files — transcription solutions for every use case.',
    h1: 'Transcription Tools & Resources',
    breadcrumbLabel: 'Transcription Tools',
  },
  {
    path: '/subtitle-tools',
    title: `Free Subtitle Tools: Convert & Validate | ${SITE_NAME}`,
    description:
      'Free browser subtitle tools: convert SRT↔VTT, shift timing, validate files, check reading speed and character limits. No account. Nothing uploaded.',
    h1: 'Free Subtitle Tools for Creators',
    breadcrumbLabel: 'Subtitle Tools',
  },
  {
    path: '/descript-alternative',
    title: `Best Free Descript Alternative for Transcription & Subtitles | ${SITE_NAME}`,
    description:
      'Looking for a Descript alternative? VideoText transcribes video 6x faster, starts free ($0 vs $24/mo), and deletes your files. No heavy editor required. Try free.',
    breadcrumbLabel: 'Descript Alternative',
    faq: [
      { q: 'Is VideoText a good free alternative to Descript?', a: 'Yes. VideoText transcribes video to text and generates SRT/VTT subtitles starting free with no credit card required. Unlike Descript, there is no minimum paid plan to get started and no editing software to learn.' },
      { q: 'How does VideoText compare to Descript for transcription?', a: 'Both use Whisper AI. VideoText processes a 1-hour video in about 2 minutes versus Descript\'s 5–10 minutes. VideoText also supports YouTube URL input and direct subtitle burning, which Descript does not offer in its core workflow.' },
      { q: 'Can I switch from Descript to VideoText?', a: 'Yes. VideoText supports the same video formats (MP4, MOV, WebM) and exports SRT and VTT subtitle files compatible with any platform. No project migration needed — just upload and go.' },
    ],
  },
  {
    path: '/otter-ai-alternative',
    title: `Best Otter.ai Alternative for Video Files & Subtitles | ${SITE_NAME}`,
    description:
      "Otter.ai doesn't support video uploads or SRT export. VideoText does — plus YouTube URL input, subtitle translation, and file deletion. Free tier available.",
    breadcrumbLabel: 'Otter.ai Alternative',
    faq: [
      { q: 'What does VideoText do that Otter.ai does not?', a: 'VideoText accepts video file uploads (MP4, MOV, WebM) and YouTube URLs, exports SRT and VTT subtitle files, translates subtitles to 50+ languages, and burns subtitles into video. Otter.ai is audio-only and does not produce subtitle files.' },
      { q: 'Is VideoText free like Otter.ai?', a: 'Both have free tiers. VideoText free includes 3 full-length imports per month with no per-minute cap. Otter.ai free is limited to 300 monthly transcription minutes with a 30-minute meeting cap.' },
      { q: 'Can VideoText replace Otter.ai for meeting transcription?', a: 'Yes. Upload a Zoom, Teams, or Meet recording (MP4 or audio) and VideoText produces a transcript with speaker labels, summary, and chapters. Export as plain text or SRT.' },
    ],
  },
  {
    path: '/trint-alternative',
    title: `Cheaper Trint Alternative That Starts Free | ${SITE_NAME}`,
    description:
      'Trint starts at $80/month. VideoText starts free and scales to $10/month — same Whisper AI accuracy, plus subtitle burning, batch processing, and translation.',
    breadcrumbLabel: 'Trint Alternative',
    faq: [
      { q: 'Why is VideoText cheaper than Trint?', a: 'Trint is priced for enterprise workflows at $80/month. VideoText is built for individuals and small teams — free tier included, paid plans from $10/month for 450 minutes of transcription.' },
      { q: 'Does VideoText match Trint\'s transcription accuracy?', a: 'Both use OpenAI Whisper. VideoText benchmarks at 98.5% word accuracy on clear audio, comparable to Trint\'s published figures.' },
      { q: 'Can I export transcripts from VideoText like Trint?', a: 'Yes. VideoText exports plain text (TXT), SRT, VTT, and more on paid plans. Unlike Trint, VideoText also exports subtitle files and can burn captions directly into video.' },
    ],
  },
  {
    path: '/rev-alternative',
    title: `Best Rev Alternative with Flat-Rate Pricing | ${SITE_NAME}`,
    description:
      'Rev AI charges $0.25/minute. VideoText starts free and costs $10/month for 450 minutes. Same AI accuracy, plus subtitle export, translation, and YouTube support.',
    breadcrumbLabel: 'Rev Alternative',
    faq: [
      { q: 'How is VideoText pricing different from Rev?', a: 'Rev AI charges per-minute ($0.25/min). A 450-minute month costs $112.50 on Rev. VideoText\'s Basic plan covers 450 minutes for $10/month flat — no per-minute billing.' },
      { q: 'Does VideoText support YouTube transcription like Rev?', a: 'Yes. Paste any public YouTube URL directly into VideoText — no download required. Rev does not offer YouTube URL input.' },
      { q: 'Can VideoText generate subtitles like Rev?', a: 'Yes. VideoText generates SRT and VTT subtitle files from any video. You can also translate subtitles to 50+ languages and burn them into the video permanently.' },
    ],
  },
  {
    path: '/happyscribe-alternative',
    title: `Best Free HappyScribe Alternative – Transcription & Subtitles | ${SITE_NAME}`,
    description:
      'HappyScribe starts at $17/month with no free tier and no YouTube URL input. VideoText is free to start — upload any video or paste a YouTube link, get SRT, translate, and burn subtitles.',
    breadcrumbLabel: 'HappyScribe Alternative',
    faq: [
      { q: 'Does VideoText have a free tier unlike HappyScribe?', a: 'Yes. VideoText offers 3 free imports per month with no credit card required. HappyScribe has no free tier — it starts at $17/month.' },
      { q: 'Can VideoText transcribe YouTube videos like HappyScribe?', a: 'Yes. Paste a YouTube URL directly into VideoText — no download needed. HappyScribe requires you to download the video first and upload it manually.' },
      { q: 'Does VideoText support subtitle translation like HappyScribe?', a: 'Yes. VideoText translates SRT and VTT subtitle files to 50+ languages. It also burns translated subtitles into video, which HappyScribe does not offer.' },
    ],
  },
  {
    path: '/sonix-alternative',
    title: `Best Free Sonix Alternative – No Per-Minute Fees | ${SITE_NAME}`,
    description:
      'Sonix charges $22/month plus $0.10/minute overage. VideoText starts free and is $10/month flat — Whisper AI accuracy, YouTube URL support, subtitle burning, zero per-minute billing.',
    breadcrumbLabel: 'Sonix Alternative',
    faq: [
      { q: 'How does VideoText pricing compare to Sonix?', a: 'Sonix charges $22/month plus $0.10/minute for any overage. VideoText is $10/month for 450 minutes flat — no per-minute fees, ever.' },
      { q: 'Is VideoText as accurate as Sonix?', a: 'Both use Whisper AI. VideoText benchmarks at 98.5% word accuracy on clear audio, on par with Sonix\'s published accuracy.' },
      { q: 'Does VideoText support YouTube URL input like Sonix?', a: 'Yes. Paste any YouTube URL directly into VideoText. Sonix requires manual video download and upload. VideoText streams the audio directly from YouTube — no download needed.' },
    ],
  },
  {
    path: '/easyscribe-alternative',
    title: `Best EasyScribe Alternative for Video & Subtitles | ${SITE_NAME}`,
    description:
      'EasyScribe only does basic audio transcription. VideoText handles video files, YouTube URLs, SRT subtitle export, 50+ language translation, and subtitle burning. Free tier available.',
    breadcrumbLabel: 'EasyScribe Alternative',
    faq: [
      { q: 'What does VideoText offer that EasyScribe does not?', a: 'VideoText adds YouTube URL transcription, SRT and VTT subtitle export, subtitle translation to 50+ languages, subtitle burning into video, and batch processing. EasyScribe is limited to basic audio file transcription.' },
      { q: 'Is VideoText free like EasyScribe?', a: 'Yes. VideoText has a free tier with 3 imports per month and no credit card required. Paid plans: Basic $19, Pro $49, Agency $129.' },
    ],
  },
  {
    path: '/notta-alternative',
    title: `Best Free Notta Alternative for Video Files & Subtitles | ${SITE_NAME}`,
    description:
      "Notta's free plan caps files at 3 minutes. VideoText has no per-file limit — transcribe full-length videos, export SRT/VTT, translate to 50+ languages, and burn subtitles. Free tier available.",
    breadcrumbLabel: 'Notta Alternative',
    faq: [
      { q: 'What is a good free Notta alternative for video transcription?', a: "VideoText is a strong free Notta alternative if you need to transcribe video files (MP4, MOV, WebM) or YouTube videos, or if you need SRT/VTT subtitle exports. Notta's free plan is limited to 120 minutes per month with a 3-minute file cap — VideoText offers 3 full-length imports per month with no per-file minute limit." },
      { q: 'How does VideoText compare to Notta for video files?', a: 'VideoText accepts MP4, MOV, WebM, and AVI video uploads plus YouTube URLs. Notta is primarily a meeting transcription tool — video file support is limited on lower plans and there is no YouTube URL input.' },
      { q: 'Can VideoText export SRT subtitle files unlike Notta?', a: 'Yes. VideoText exports SRT and VTT subtitle files on all plans including free. Notta does not offer subtitle file export — it exports transcripts only as text documents.' },
    ],
  },
  // ── About & transparency ─────────────────────────────────────────────────────
  {
    path: '/about',
    title: `About VideoText — AI Transcription Built for Speed & Privacy | ${SITE_NAME}`,
    description:
      'VideoText transcribes video to text in under 5 minutes with 98.5%+ word accuracy. Powered by OpenAI Whisper. Privacy-first: files deleted after processing. 127,000+ videos transcribed. Free tier available.',
    breadcrumbLabel: 'About',
    keywords: ['about VideoText', 'VideoText story', 'our mission', 'privacy-first transcription', 'AI transcription technology', 'Whisper AI', 'video to text company', 'trusted by creators'],
  },
  {
    path: '/open',
    title: `Open Stats — Accuracy, Speed & Transparency | ${SITE_NAME}`,
    description:
      'VideoText publishes real processing stats: 127,000+ videos transcribed, 98.5% word accuracy benchmarks, median processing times, and full tech stack. Updated monthly.',
    breadcrumbLabel: 'Open Stats',
    keywords: ['open stats', 'transparency', 'accuracy benchmarks', 'performance metrics', 'transcription statistics', 'processing speed', 'real data', 'public stats'],
  },
  // Blog posts live on blog.videotext.io (Hashnode). vercel.json redirects /blog/* — do not prerender duplicates here.
  // ── Free client-side tools ───────────────────────────────────────────────────
  {
    path: '/tools',
    title: `Free Video & Subtitle Tools — No Account Needed | ${SITE_NAME}`,
    description:
      'Free browser-based tools for video creators: SRT to VTT converter, subtitle validator, reading speed checker, script timer, bitrate calculator, and more. No upload, no account.',
    breadcrumbLabel: 'Free Tools',
  },
  {
    path: '/tools/srt-to-vtt',
    title: `SRT to VTT Converter — Free Online | ${SITE_NAME}`,
    description:
      'Convert SRT subtitle files to WebVTT format instantly. Paste or upload your .srt file and download a ready-to-use .vtt file. Free, no account, runs in your browser.',
    breadcrumbLabel: 'SRT to VTT',
  },
  {
    path: '/tools/vtt-to-srt',
    title: `VTT to SRT Converter — Free Online | ${SITE_NAME}`,
    description:
      'Convert WebVTT (.vtt) subtitle files to SubRip (.srt) format. Free, browser-based, nothing uploaded to any server.',
    breadcrumbLabel: 'VTT to SRT',
  },
  {
    path: '/tools/shift-subtitle-timing',
    title: `Shift Subtitle Timing — Delay or Advance Subtitles Free | ${SITE_NAME}`,
    description:
      'Fix out-of-sync subtitles by shifting all timestamps forward or backward by any number of seconds. Works with SRT and VTT. Free, browser-based.',
    breadcrumbLabel: 'Shift Subtitle Timing',
  },
  {
    path: '/tools/merge-srt-files',
    title: `Merge SRT Files — Combine Two Subtitle Files Free | ${SITE_NAME}`,
    description:
      'Combine two SRT or VTT subtitle files into one sorted, renumbered file. Free, runs in browser, no account required.',
    breadcrumbLabel: 'Merge SRT Files',
  },
  {
    path: '/tools/srt-to-text',
    title: `SRT to Plain Text — Extract Text from Subtitles Free | ${SITE_NAME}`,
    description:
      'Strip timing codes and indices from SRT or VTT files and extract clean plain text. Perfect for repurposing subtitles as blog posts or transcripts. Free.',
    breadcrumbLabel: 'SRT to Text',
  },
  {
    path: '/tools/subtitle-validator',
    title: `Subtitle Validator — Check SRT & VTT Files Free | ${SITE_NAME}`,
    description:
      'Validate SRT and VTT files for overlapping timestamps, empty cues, long lines, and reading speed errors. Instant report, free, no upload needed.',
    breadcrumbLabel: 'Subtitle Validator',
  },
  {
    path: '/tools/subtitle-reading-speed',
    title: `Subtitle Reading Speed Checker — CPS Analyzer | ${SITE_NAME}`,
    description:
      'Check every subtitle cue for characters-per-second against Netflix (17 CPS), BBC (17 CPS), and EBU (21 CPS) broadcast standards. Free online tool.',
    breadcrumbLabel: 'Reading Speed Checker',
  },
  {
    path: '/tools/subtitle-character-checker',
    title: `Subtitle Character Limits — Pass/Fail | ${SITE_NAME}`,
    description:
      'Check SRT or VTT line lengths against Netflix (42), YouTube (80), or BBC (37) limits. Instant pass/fail per cue. Free, in-browser, no account.',
    h1: 'Check Subtitle Character Limits',
    breadcrumbLabel: 'Character Limit Checker',
  },
  {
    path: '/tools/subtitle-word-counter',
    title: `Subtitle Word Counter — Count Words in SRT & VTT Files | ${SITE_NAME}`,
    description:
      'Count words, characters, and get speaking rate stats (WPM, CPS) from any SRT or VTT subtitle file. Free, browser-based, instant results.',
    breadcrumbLabel: 'Subtitle Word Counter',
  },
  {
    path: '/tools/video-script-timer',
    title: `Video Script Timer — How Long Will My Video Be? | ${SITE_NAME}`,
    description:
      'Paste your video script and instantly see how long the video will be at different speaking rates. Free tool for YouTube, ads, shorts, and explainers.',
    breadcrumbLabel: 'Video Script Timer',
  },
  {
    path: '/tools/words-per-minute-calculator',
    title: `Words Per Minute Calculator — Speaking Rate Checker | ${SITE_NAME}`,
    description:
      'Calculate your speaking rate in words per minute (WPM). Enter text and recording duration, or word count and time. Instant result, free.',
    breadcrumbLabel: 'Words Per Minute Calculator',
  },
  {
    path: '/tools/video-bitrate-calculator',
    title: `Video Bitrate Calculator — File Size & Quality Estimator | ${SITE_NAME}`,
    description:
      'Calculate the ideal video bitrate for a target file size, or estimate how large your video will be at a given bitrate. Free online calculator.',
    breadcrumbLabel: 'Video Bitrate Calculator',
  },
  {
    path: '/tools/aspect-ratio-calculator',
    title: `Video Aspect Ratio Calculator — 16:9, 9:16, 1:1 & More | ${SITE_NAME}`,
    description:
      'Calculate video aspect ratios, find missing dimensions for 16:9, 9:16, 4:3, and custom ratios. Free for YouTube, TikTok, Instagram, and more.',
    breadcrumbLabel: 'Aspect Ratio Calculator',
  },
  {
    path: '/tools/timestamp-converter',
    title: `Timestamp Converter — Seconds to HH:MM:SS, SRT, VTT & Timecode | ${SITE_NAME}`,
    description:
      'Convert timestamps between seconds, HH:MM:SS, SRT format, VTT format, and SMPTE timecode. Instant, free, no account needed.',
    breadcrumbLabel: 'Timestamp Converter',
  },
  {
    path: '/tools/video-metadata-viewer',
    title: `Video Metadata Viewer — Check Video Info Free | ${SITE_NAME}`,
    description:
      'View video file details — duration, resolution, aspect ratio, and file size — locally in your browser. Nothing is uploaded. Free tool.',
    breadcrumbLabel: 'Video Metadata Viewer',
  },
  {
    path: '/tools/sbv-to-srt',
    title: `SBV to SRT Converter — Convert YouTube Captions Free | ${SITE_NAME}`,
    description:
      'Convert YouTube SBV caption files to standard SRT format instantly. Free, browser-based, nothing uploaded to any server. Works with all YouTube .sbv downloads.',
    breadcrumbLabel: 'SBV to SRT',
  },
  {
    path: '/tools/srt-to-sbv',
    title: `SRT to SBV Converter — Convert Subtitles to YouTube Format Free | ${SITE_NAME}`,
    description:
      "Convert SRT subtitle files to YouTube's native SBV format. Free, browser-based, instant download. No account required.",
    breadcrumbLabel: 'SRT to SBV',
  },
  {
    path: '/tools/ass-to-srt',
    title: `ASS / SSA to SRT Converter — Strip Styling, Keep Dialogue Free | ${SITE_NAME}`,
    description:
      'Convert ASS or SSA subtitle files to plain SRT. Strips all styling tags and positioning codes, preserves dialogue text and timing. Free, runs in your browser.',
    breadcrumbLabel: 'ASS to SRT',
  },
  {
    path: '/tools/ttml-to-srt',
    title: `TTML to SRT Converter — Convert DFXP & EBU-TT Subtitles Free | ${SITE_NAME}`,
    description:
      'Convert TTML, DFXP, or EBU-TT subtitle files to SRT format. Used for Netflix, broadcast, and enterprise video workflows. Free, browser-based.',
    breadcrumbLabel: 'TTML to SRT',
  },
  {
    path: '/tools/html-to-srt',
    title: `HTML to SRT Converter — Convert HTML Captions & Transcripts Free | ${SITE_NAME}`,
    description:
      'Convert HTML captions or transcript exports to SRT format. Supports data-start timing attributes, TTML-style begin/end attributes, and bracketed timestamps. Free, browser-based.',
    breadcrumbLabel: 'HTML to SRT',
  },
  // ── Hub pages ────────────────────────────────────────────────────────────────
  {
    path: '/subtitle-tools',
    title: `Free Subtitle Tools: Convert & Validate | ${SITE_NAME}`,
    description:
      'Free browser subtitle tools: convert SRT↔VTT, shift timing, validate files, check reading speed and character limits. No account. Nothing uploaded.',
    h1: 'Free Subtitle Tools for Creators',
    breadcrumbLabel: 'Subtitle Tools',
  },
  {
    path: '/subtitle-resources',
    title: `Subtitle Resources & Standards — Formats, Netflix Rules, CPS Limits | ${SITE_NAME}`,
    description:
      'Subtitle format specs, Netflix delivery requirements, platform character limits, reading speed standards, and timing rules — all in one reference guide.',
    breadcrumbLabel: 'Subtitle Resources',
  },

  // ── Comparison / vs pages ────────────────────────────────────────────────
  {
    path: '/temi-vs-videotext',
    title: `Temi vs VideoText (2025) — Pricing, Accuracy, Speed & Features Compared | ${SITE_NAME}`,
    description:
      'Temi charges $0.25/min and supports English only. VideoText is 6× cheaper, supports 90+ languages, and produces transcript + SRT + VTT + summary + chapters per upload. Full 360° comparison.',
    h1: 'Temi vs VideoText (2025): The Full 360° Comparison',
    breadcrumbLabel: 'Temi vs VideoText',
  },
  {
    path: '/videotext-vs-rev',
    title: `VideoText vs Rev (2025) — AI Pricing, Accuracy & Features Compared | ${SITE_NAME}`,
    description:
      'Rev AI charges $0.25/min; VideoText Pro is ~$0.042/min flat. VideoText adds 90+ languages, zero data retention, AI summary, chapters, and subtitle burn-in. Full comparison.',
    h1: 'VideoText vs Rev (2025): Full Comparison',
    breadcrumbLabel: 'VideoText vs Rev',
  },
  {
    path: '/otter-vs-videotext',
    title: `Otter vs VideoText — Meeting Notes vs File Transcription | ${SITE_NAME}`,
    description:
      'Otter is optimised for live meeting capture. VideoText is stronger for file-first transcription: faster processing, SRT/VTT subtitle export, YouTube URL input, and benchmark transparency.',
    h1: 'Otter vs VideoText',
    breadcrumbLabel: 'Otter vs VideoText',
  },
  {
    path: '/descript-vs-videotext',
    title: `Descript vs VideoText — Editor Workflow vs Transcription Throughput | ${SITE_NAME}`,
    description:
      'Descript is an editor-first tool. VideoText is transcription-first: 6× faster, starts at $0, no desktop install. Choose based on whether editing or throughput is your bottleneck.',
    h1: 'Descript vs VideoText',
    breadcrumbLabel: 'Descript vs VideoText',
  },
  {
    path: '/videotext-vs-turboscribe',
    title: `VideoText vs TurboScribe — Full 2025 Comparison | ${SITE_NAME}`,
    description:
      'VideoText vs TurboScribe: both are fast, but VideoText adds SRT/VTT subtitles, AI summary, chapter markers, YouTube URL input, and subtitle burn-in in one workflow.',
    h1: 'VideoText vs TurboScribe',
    breadcrumbLabel: 'VideoText vs TurboScribe',
  },
  {
    path: '/best-otter-alternatives',
    title: `Best Otter AI Alternatives (2025) — Free & Paid Options | ${SITE_NAME}`,
    description:
      'Top Otter AI alternatives for file-first transcription: VideoText (free tier, 90+ languages, SRT/VTT), Descript (editing), Rev (human review). Full neutral comparison.',
    h1: 'Best Otter AI Alternatives (2025)',
    breadcrumbLabel: 'Best Otter Alternatives',
    faq: [
      { q: 'What is the best free Otter AI alternative?', a: 'VideoText offers a free tier with no credit card required, supports video file uploads and YouTube URLs, and exports transcript + SRT/VTT subtitles — covering the core use cases where Otter falls short for file-based workflows.' },
      { q: 'Which Otter alternative supports subtitles and summaries?', a: 'VideoText supports transcript, SRT/VTT subtitles, AI summary, and chapter markers in a single workflow. Otter does not produce subtitle files.' },
      { q: 'Is VideoText a good Otter replacement for podcast workflows?', a: 'Yes. VideoText processes long-form audio/video faster than Otter, exports broadcast-safe SRT files, and supports 90+ languages — making it a strong fit for podcast transcription and repurposing.' },
    ],
  },
  {
    path: '/best-descript-alternatives',
    title: `Best Descript Alternatives (2025) for Transcription Workflows | ${SITE_NAME}`,
    description:
      'Top Descript alternatives when you need fast transcription without editor overhead: VideoText (transcript + subtitles + summary), Otter (meetings), Rev (human QA). Neutral comparison.',
    h1: 'Best Descript Alternatives (2025)',
    breadcrumbLabel: 'Best Descript Alternatives',
    faq: [
      { q: 'What is the best Descript alternative for transcription-only workflows?', a: 'VideoText is usually the best fit when you need speed and structured output (transcript + SRT/VTT + summary + chapters) without the editing overhead of Descript.' },
      { q: 'Is VideoText faster than Descript for long videos?', a: 'For transcription-first workloads, VideoText typically processes a 1-hour video in 3–5 minutes versus Descript\'s 5–10 minutes. VideoText has lower overhead since there is no editor to load.' },
      { q: 'Can I replace Descript if I only need transcripts and subtitles?', a: 'Yes. VideoText is designed for transcript and subtitle generation. If you do not need timeline editing or audio correction, VideoText is a lighter and more affordable replacement.' },
    ],
  },
]

// ── Registry parser ───────────────────────────────────────────────────────────

interface ParsedEntry {
  path: string
  title: string
  description: string
  h1?: string
  breadcrumbLabel: string
  faq: Array<{ q: string; a: string }>
  keywords?: string[]
  valueProposition?: string
  comparison?: { tool: string; vs: string }[]
  howToUse?: Array<{ step: number; title: string; detail: string }>
  socialProof?: { stat: string; desc: string }[]
}

function parseRegistryEntries(): ParsedEntry[] {
  if (!fs.existsSync(REGISTRY_PATH)) return []
  const src = fs.readFileSync(REGISTRY_PATH, 'utf8')
  const entries: ParsedEntry[] = []

  // Split into blocks by path: '/...'
  const pathMatches = [...src.matchAll(/path:\s*'(\/[^']+)'/g)]

  for (let i = 0; i < pathMatches.length; i++) {
    const blockStart = pathMatches[i].index!
    const blockEnd = i + 1 < pathMatches.length ? pathMatches[i + 1].index! : src.length
    const block = src.slice(blockStart, blockEnd)

    const routePath = pathMatches[i][1]

    // Extract title
    const titleMatch = block.match(/\btitle:\s*'((?:[^'\\]|\\.)*)'/)
    const title = titleMatch ? titleMatch[1].replace(/\\'/g, "'") : ''

    // Extract description (may be multi-line with string concatenation)
    const descMatch = block.match(/\bdescription:\s*\n?\s*'((?:[^'\\]|\\.)*)'/)
    const description = descMatch ? descMatch[1].replace(/\\'/g, "'") : ''

    // Extract h1
    const h1Match = block.match(/\bh1:\s*'((?:[^'\\]|\\.)*)'/)
    const h1 = h1Match ? h1Match[1].replace(/\\'/g, "'") : undefined

    // Extract breadcrumbLabel
    const labelMatch = block.match(/breadcrumbLabel:\s*'((?:[^'\\]|\\.)*)'/)
    const breadcrumbLabel = labelMatch ? labelMatch[1].replace(/\\'/g, "'") : routePath.slice(1)

    // Extract FAQ items
    const faq: Array<{ q: string; a: string }> = []
    const faqBlock = block.match(/faq:\s*\[([\s\S]*?)\],/)
    if (faqBlock) {
      const faqContent = faqBlock[1]
      const itemMatches = [...faqContent.matchAll(/\{\s*q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*a:\s*'((?:[^'\\]|\\.)*)'\s*\}/g)]
      for (const m of itemMatches) {
        faq.push({
          q: m[1].replace(/\\'/g, "'"),
          a: m[2].replace(/\\'/g, "'"),
        })
      }
    }

    // Extract keywords
    const keywordMatch = block.match(/keywords:\s*\[([\s\S]*?)\]/)
    let keywords: string[] | undefined
    if (keywordMatch) {
      const keywordContent = keywordMatch[1]
      const keywordMatches = [...keywordContent.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
      keywords = keywordMatches.map(m => m[1].replace(/\\'/g, "'"))
    }

    // Note: We INCLUDE all entries (both indexable: true and false) in prerender
    // The indexable flag only controls sitemap inclusion, not HTML generation.
    // All SEO pages must be prerendered for crawler visibility.
    entries.push({ path: routePath, title, description, h1, breadcrumbLabel, faq, keywords })
  }

  return entries
}

// ── HTML injection ────────────────────────────────────────────────────────────


function resolveHashnodeSlug(contentSlug: string): string {
  const map = Object.fromEntries(
    Object.entries(slugMapJson as Record<string, string>).filter(([key]) => !key.startsWith('_')),
  )
  return map[contentSlug] ?? contentSlug
}

function getCanonicalUrlForPath(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http')) return pathOrUrl
  if (pathOrUrl === '/blog' || pathOrUrl === '/blog/') return `${BLOG_URL}/`
  if (pathOrUrl.startsWith('/blog/')) {
    const slug = pathOrUrl.slice('/blog/'.length)
    return `${BLOG_URL}/${resolveHashnodeSlug(slug)}`
  }
  return pathOrUrl === '/' ? SITE_URL + '/' : `${SITE_URL}${pathOrUrl}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Generate keywords from title and path if not explicitly provided
function generateKeywordsFromTitle(title: string, path: string): string[] {
  const cleanTitle = title
    .replace(/\s*\|\s*VideoText$/i, '')
    .replace(/–|—/g, '-')
    .trim()

  const words = cleanTitle
    .toLowerCase()
    .split(/[\s\-]+/)
    .filter(w => w.length > 2 && !['the', 'and', 'for', 'all', 'any', 'you', 'can', 'get', 'how', 'why', 'are', 'this', 'that', 'from', 'with', 'into', 'your', 'free'].includes(w))

  const keywords = new Set<string>()

  // Add title-based keywords
  if (words.length > 0) {
    keywords.add(words.join(' '))
    keywords.add(`${words[0]} online`)
    keywords.add(`free ${words[0]}`)
  }

  // Add path-based keywords
  const pathWords = path.slice(1).split('-').filter(w => w.length > 2)
  if (pathWords.length > 0) {
    keywords.add(pathWords.join(' '))
    keywords.add(`${pathWords[0]} ${pathWords[1] || 'tool'}`)
  }

  return Array.from(keywords).slice(0, 8)
}

function titleFromPath(routePath: string): string {
  if (routePath === '/') return `VideoText — AI Transcription & Subtitle Tools | ${SITE_NAME}`
  const label = routePath
    .slice(1)
    .split('/')
    .map((segment) => segment.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))
    .join(' — ')
  return `${label} | ${SITE_NAME}`
}

const TITLE_BODY_MAX = 50
const TITLE_MIN_USEFUL = 24
const MONEY_TITLE_PATHS = new Set([
  '/',
  '/pricing',
  '/video-to-transcript',
  '/video-to-subtitles',
  '/translate-subtitles',
  '/fix-subtitles',
  '/burn-subtitles',
  '/compress-video',
  '/youtube-transcript-generator',
  '/video-to-srt',
  '/srt-generator',
  '/voice-recorder',
  '/guideline-format',
])

function stripTrailingTitleStops(value: string): string {
  const stops = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'for', 'from', 'with', 'any', 'on', 'in', 'at', 'by', 'as'])
  let words = value.replace(/[–—,.:;…]+$/u, '').trim().split(/\s+/)
  while (words.length > 2 && stops.has(words[words.length - 1].toLowerCase())) {
    words = words.slice(0, -1)
  }
  return words.join(' ').replace(/[–—,.:;…]+$/u, '').trim()
}

function wordSafeTitleClip(base: string, budget: number): string {
  const clipped = base.slice(0, budget)
  const space = clipped.lastIndexOf(' ')
  const cut = space >= TITLE_MIN_USEFUL ? clipped.slice(0, space) : clipped.trim()
  return stripTrailingTitleStops(cut)
}

/**
 * Fit titles to ~62 chars including ` | VideoText`.
 * Never collapse a long title to a stub first-phrase if that drops the primary keyword.
 * Money pages keep their authored lead; we only word-clip if they still overflow.
 */
function optimizeSeoTitle(rawTitle: string, routePath: string): string {
  const suffix = ` | ${SITE_NAME}`
  const normalized = (rawTitle || '').trim().replace(/\s+/g, ' ')
  const hasSuffix = normalized.endsWith(suffix)
  const base = hasSuffix ? normalized.slice(0, -suffix.length).trim() : normalized
  const maxTotal = 62
  const budget = Math.min(TITLE_BODY_MAX, maxTotal - suffix.length)
  if (base.length <= budget) return `${base}${suffix}`

  if (MONEY_TITLE_PATHS.has(routePath)) {
    return `${wordSafeTitleClip(base, budget)}${suffix}`
  }

  const separators = [' — ', ' – ', ': ', ' - ', ' | ']
  for (const sep of separators) {
    const parts = base.split(sep).map((p) => p.trim()).filter(Boolean)
    if (parts.length <= 1) continue
    let candidate = parts[0]
    for (let i = 1; i < parts.length; i += 1) {
      const next = `${candidate}${sep}${parts[i]}`
      if (next.length > budget) break
      candidate = next
    }
    // Reject a first-phrase collapse that is too short to carry the query.
    if (candidate.length >= TITLE_MIN_USEFUL && candidate.length <= budget) {
      return `${candidate}${suffix}`
    }
  }

  return `${wordSafeTitleClip(base, budget)}${suffix}`
}

function descriptionFromPath(routePath: string): string {
  if (routePath === '/') {
    return 'VideoText helps you transcribe videos, generate subtitles, translate captions, and export clean transcripts in your browser.'
  }
  const label = routePath.replace(/^\//, '').replace(/\//g, ' ').replace(/-/g, ' ')
  return `VideoText workflow page for ${label}. Learn the relevant transcript, subtitle, formatting, export, or comparison path and choose the right tool for the job.`
}

function optimizeMetaDescription(rawDescription: string, routePath: string): string {
  const maxLen = 158
  const normalized = (rawDescription || '').trim().replace(/\s+/g, ' ')
  if (!normalized) return ''
  const clean = (value: string) =>
    value
      .replace(/\s+,/g, ',')
      .replace(/,\./g, '.')
      .replace(/\.\./g, '.')
      .replace(/\s+/g, ' ')
      .trim()

  if (normalized.length <= maxLen) return clean(normalized)

  // Keep strongest lead sentences first.
  const sentences = normalized.split(/(?<=\.)\s+/).filter(Boolean)
  if (sentences.length > 1) {
    let candidate = ''
    for (const sentence of sentences) {
      const next = candidate ? `${candidate} ${sentence}` : sentence
      if (next.length > maxLen) break
      candidate = next
    }
    if (candidate && candidate.length >= 90) return clean(candidate)
  }

  // Optional concise conversion tail for key pages when there is room.
  const conversionTail = routePath.includes('-alternative')
    ? ' Free tier.'
    : routePath.includes('transcription')
      ? ' Fast, accurate, free tier.'
      : ''

  const budget = maxLen - conversionTail.length
  const clipped = normalized.slice(0, Math.max(1, budget - 1))
  const safe = clipped.slice(0, Math.max(0, clipped.lastIndexOf(' '))).trim() || clipped.trim()
  const base = safe.endsWith('.') ? safe : `${safe}.`
  const merged = clean(`${base}${conversionTail}`.trim())
  return merged.length <= maxLen ? merged : clean(merged.slice(0, maxLen).trimEnd())
}

function mergeRouteMetaWithSitemapCoverage(routes: RouteMeta[]): RouteMeta[] {
  const byPath = new Map<string, RouteMeta>()
  for (const route of routes) {
    const canonicalPath = getCanonicalPathForRoute(route.path)
    const fallbackTitle = route.title?.trim() ? route.title : titleFromPath(canonicalPath)
    const fallbackH1Base = fallbackTitle.replace(` | ${SITE_NAME}`, '')
    byPath.set(canonicalPath, {
      ...route,
      path: canonicalPath,
      title: fallbackTitle,
      description: route.description?.trim() ? route.description : descriptionFromPath(canonicalPath),
      h1: route.h1?.trim() ? route.h1 : fallbackH1Base,
      breadcrumbLabel: route.breadcrumbLabel?.trim()
        ? route.breadcrumbLabel
        : fallbackH1Base,
    })
  }

  const sitemapPaths = getIndexablePaths()
    .map((p) => getCanonicalPathForRoute(p))
    .filter((routePath) => routePath !== '/blog' && !routePath.startsWith('/blog/'))
  for (const routePath of sitemapPaths) {
    if (!byPath.has(routePath)) {
      byPath.set(routePath, {
        path: routePath,
        title: titleFromPath(routePath),
        description: descriptionFromPath(routePath),
        h1: titleFromPath(routePath).replace(` | ${SITE_NAME}`, ''),
        breadcrumbLabel: routePath === '/' ? 'Home' : routePath.slice(1).replace(/\//g, ' / '),
      })
    }
  }

  return [...byPath.values()]
}

function buildBreadcrumbJsonLd(routePath: string, routeMeta: RouteMeta): object | null {
  if (routePath === '/') return null
  const segments = routePath.split('/').filter(Boolean)
  const items: Array<{ '@type': 'ListItem'; position: number; name: string; item: string }> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
  ]
  let current = ''
  segments.forEach((segment, idx) => {
    current += `/${segment}`
    const name =
      idx === segments.length - 1
        ? routeMeta.breadcrumbLabel || routeMeta.h1 || segment.replace(/-/g, ' ')
        : segment.replace(/-/g, ' ')
    items.push({
      '@type': 'ListItem',
      position: idx + 2,
      name: name.replace(/\b\w/g, (c) => c.toUpperCase()),
      item: `${SITE_URL}${current}`,
    })
  })
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

function resolveFaqItems(routePath: string, meta: RouteMeta): Array<{ q: string; a: string }> {
  if (meta.faq?.length) return meta.faq
  return getCoreToolFaq(routePath)
}

function buildFaqJsonLd(routePath: string, meta: RouteMeta): object | null {
  const faq = resolveFaqItems(routePath, meta)
  if (!faq.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
}

function buildPricingProductJsonLd(routePath: string): object | null {
  if (routePath !== '/pricing') return null
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'VideoText Transcription & Subtitle Plans',
    description: 'Pricing plans for VideoText AI transcription and subtitle tools: Free, Basic, Pro, and Agency.',
    brand: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    category: 'SaaS',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Basic',
        price: '19',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Pro',
        price: '49',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing`,
      },
      {
        '@type': 'Offer',
        name: 'Agency',
        price: '129',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/pricing`,
      },
    ],
  }
}

function dedupeSchemas(schemas: object[]): object[] {
  const seen = new Set<string>()
  const unique: object[] = []
  for (const schema of schemas) {
    const key = JSON.stringify(schema)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(schema)
  }
  return unique
}

function injectStructuredData(template: string, routePath: string, meta: RouteMeta, rating: PublicRating | null): string {
  const html = stripTopLevelSoftwareApplicationScripts(template)
  const schemas: object[] = []
  const breadcrumb = buildBreadcrumbJsonLd(routePath, meta)
  const faq = buildFaqJsonLd(routePath, meta)
  const softwareApp = routePath === '/'
    ? getHomeSoftwareApplicationJsonLd(rating)
    : getSoftwareApplicationJsonLd(routePath)
  const howTo = getHowToJsonLd(routePath)
  const product = buildPricingProductJsonLd(routePath)
  if (breadcrumb) schemas.push(breadcrumb)
  if (faq) schemas.push(faq)
  if (softwareApp) schemas.push(softwareApp)
  if (howTo) schemas.push(howTo)
  if (product) schemas.push(product)
  if (!schemas.length) return html
  const scripts = dedupeSchemas(schemas)
    .map((schema) => `<script type="application/ld+json">${JSON.stringify(schema)}</script>`)
    .join('\n')
  return html.replace('</head>', `${scripts}\n</head>`)
}

// Hub page link definitions (must match React component lists)
const HUB_PAGE_LINKS: Record<string, Array<{ path: string; label: string }>> = {
  '/alternatives': [
    { path: '/otter-alternative', label: 'Otter Alternative' },
    { path: '/descript-alternative', label: 'Descript Alternative' },
    { path: '/trint-alternative', label: 'Trint Alternative' },
    { path: '/rev-alternative', label: 'Rev Alternative' },
    { path: '/sonix-alternative', label: 'Sonix Alternative' },
    { path: '/happyscribe-alternative', label: 'HappyScribe Alternative' },
    { path: '/easyscribe-alternative', label: 'EasyScribe Alternative' },
    { path: '/notta-alternative', label: 'Notta Alternative' },
    { path: '/tactiq-alternative', label: 'Tactiq Alternative' },
    { path: '/turboscribe-alternative', label: 'TurboScribe Alternative' },
    { path: '/deepgram-alternative', label: 'Deepgram Alternative' },
    { path: '/fireflies-alternative', label: 'Fireflies Alternative' },
    { path: '/riverside-alternative', label: 'Riverside Alternative' },
    { path: '/glean-alternative', label: 'Glean Alternative' },
    { path: '/hedy-ai-alternative', label: 'Hedy AI Alternative' },
    { path: '/genio-alternative', label: 'Genio Alternative' },
    { path: '/maestra-alternative', label: 'Maestra Alternative' },
    { path: '/speechmatics-alternative', label: 'Speechmatics Alternative' },
    { path: '/assembly-ai-alternative', label: 'Assembly AI Alternative' },
    { path: '/allscribe-alternative', label: 'Allscribe Alternative' },
    { path: '/skribo-alternative', label: 'Skribo Alternative' },
    { path: '/dragon-dictate-alternative', label: 'Dragon Dictate Alternative' },
    { path: '/superwhisper-alternative', label: 'SuperWhisper Alternative' },
    { path: '/speechtexter-alternative', label: 'SpeechTexter Alternative' },
    { path: '/speechnotes-alternative', label: 'SpeechNotes Alternative' },
    { path: '/whisper-notes-alternative', label: 'Whisper Notes Alternative' },
    { path: '/macwhisper-alternative', label: 'MacWhisper Alternative' },
    { path: '/microsoft-teams-alternative', label: 'Microsoft Teams Alternative' },
    { path: '/zoom-alternative', label: 'Zoom Alternative' },
    { path: '/webex-alternative', label: 'Webex Alternative' },
    { path: '/meetgeek-alternative', label: 'MeetGeek Alternative' },
    { path: '/scribe-alternative', label: 'Scribe Alternative' },
    { path: '/subly-alternative', label: 'Subly Alternative' },
    { path: '/submagic-alternative', label: 'SubMagic Alternative' },
    { path: '/notability-alternative', label: 'Notability Alternative' },
    { path: '/movavi-alternative', label: 'Movavi Alternative' },
    { path: '/capcut-alternative', label: 'CapCut Alternative' },
    { path: '/subtitle-edit-alternative', label: 'Subtitle Edit Alternative' },
    { path: '/adobe-premiere-captions-alternative', label: 'Adobe Premiere Captions Alternative' },
    { path: '/microsoft-word-transcription-alternative', label: 'Microsoft Word Transcription Alternative' },
    { path: '/panopto-alternative', label: 'Panopto Alternative' },
    { path: '/invideo-alternative', label: 'InVideo Alternative' },
    { path: '/fliki-alternative', label: 'Fliki Alternative' },
    { path: '/kapwing-alternative', label: 'Kapwing Alternative' },
    { path: '/vizard-alternative', label: 'Vizard Alternative' },
    { path: '/whispertype-alternative', label: 'WhisperType Alternative' },
    { path: '/mem-ai-alternative', label: 'Mem AI Alternative' },
    { path: '/vocallab-alternative', label: 'VocalLab Alternative' },
    { path: '/vomo-alternative', label: 'VOMO Alternative' },
    { path: '/krisp-alternative', label: 'Krisp Alternative' },
    { path: '/headliner-alternative', label: 'Headliner Alternative' },
    { path: '/castmagic-alternative', label: 'CastMagic Alternative' },
    { path: '/elevenlabs-alternative', label: 'ElevenLabs Alternative' },
    { path: '/speechify-alternative', label: 'Speechify Alternative' },
    { path: '/spreaker-alternative', label: 'Spreaker Alternative' },
    { path: '/granola-alternative', label: 'Granola Alternative' },
    { path: '/zubtitle-alternative', label: 'Zubtitle Alternative' },
    { path: '/youtube-auto-captions-alternative', label: 'YouTube Auto-Captions Alternative' },
    { path: '/google-docs-voice-typing-alternative', label: 'Google Docs Voice Typing Alternative' },
    { path: '/dictation-io-alternative', label: 'Dictation.io Alternative' },
    { path: '/ditto-transcripts-alternative', label: 'Ditto Transcripts Alternative' },
    { path: '/whisperx-alternative', label: 'WhisperX Alternative' },
  ],
  '/transcription-tools': [
    { path: '/video-to-transcript', label: 'Video to Transcript' },
    { path: '/youtube-transcript-generator', label: 'YouTube Transcript Generator' },
    { path: '/youtube-to-transcript', label: 'YouTube to Transcript' },
    { path: '/voice-recorder', label: 'Voice to Text Recorder' },
    { path: '/podcast-transcription-tool', label: 'Podcast Transcription' },
    { path: '/meeting-transcription', label: 'Meeting Transcription' },
    { path: '/interview-transcription-tool', label: 'Interview Transcription' },
    { path: '/podcast-transcription', label: 'Podcast Transcription' },
    { path: '/webinar-transcription', label: 'Webinar Transcription' },
    { path: '/video-interview-transcription', label: 'Video Interview Transcription' },
    { path: '/zoom-recording-transcription', label: 'Zoom Recording Transcription' },
    { path: '/loom-transcription', label: 'Loom Transcription' },
    { path: '/google-meet-transcription', label: 'Google Meet Transcription' },
    { path: '/teams-meeting-transcription', label: 'Teams Meeting Transcription' },
    { path: '/teams-meeting-transcript', label: 'Teams Meeting Transcript' },
    { path: '/vimeo-transcription', label: 'Vimeo Transcription' },
    { path: '/tiktok-to-transcript', label: 'TikTok to Transcript' },
    { path: '/transcribe-video-online', label: 'Transcribe Video Online' },
    { path: '/press-conference-transcription', label: 'Press Conference Transcription' },
    { path: '/best-transcription-tool', label: 'Best Transcription Tool' },
    { path: '/fastest-transcription-tool', label: 'Fastest Transcription Tool' },
    { path: '/fastest-transcription-software', label: 'Fastest Transcription Software' },
    { path: '/best-youtube-transcription-tool', label: 'Best YouTube Transcription Tool' },
    { path: '/best-podcast-transcription-tool', label: 'Best Podcast Transcription Tool' },
    { path: '/transcription-benchmark', label: 'Transcription Benchmark' },
    { path: '/otter-vs-videotext', label: 'Otter vs VideoText' },
    { path: '/descript-vs-videotext', label: 'Descript vs VideoText' },
    { path: '/videotext-vs-rev', label: 'VideoText vs Rev' },
    { path: '/videotext-vs-turboscribe', label: 'VideoText vs TurboScribe' },
    { path: '/ai-transcription-tools', label: 'AI Transcription Tools' },
    { path: '/ai-transcription-workflow', label: 'AI Transcription Workflow' },
    { path: '/free-speech-to-text', label: 'Free Speech to Text' },
    { path: '/free-video-transcription-tool', label: 'Free Video Transcription Tool' },
    { path: '/accuracy-test', label: 'Accuracy Test' },
    { path: '/translate-subtitles', label: 'Translate Subtitles' },
    { path: '/compress-video', label: 'Compress Video' },
  ],
  '/subtitle-tools': [
    { path: '/video-to-subtitles', label: 'Video to Subtitles' },
    { path: '/srt-generator', label: 'SRT File Generator' },
    { path: '/video-to-srt', label: 'Video to SRT Converter' },
    { path: '/subtitle-generator', label: 'Subtitle Generator' },
    { path: '/auto-subtitle-generator', label: 'Auto Subtitle Generator' },
    { path: '/youtube-subtitle-generator', label: 'YouTube Subtitle Generator' },
    { path: '/caption-video-online', label: 'Caption Video Online' },
    { path: '/video-with-subtitles', label: 'Video with Subtitles' },
    { path: '/batch-process', label: 'Batch Video to Subtitles' },
    { path: '/fix-subtitles', label: 'Fix Subtitles' },
    { path: '/burn-subtitles', label: 'Burn Subtitles into Video' },
    { path: '/subtitle-timing-fixer', label: 'Subtitle Timing Fixer' },
    { path: '/subtitle-line-break-fixer', label: 'Subtitle Line Break Fixer' },
    { path: '/subtitle-grammar-fixer', label: 'Subtitle Grammar Fixer' },
    { path: '/subtitle-language-checker', label: 'Subtitle Language Checker' },
    { path: '/translate-subtitles', label: 'Translate Subtitles' },
    { path: '/srt-translator', label: 'SRT Translator' },
    { path: '/subtitle-translator', label: 'Subtitle Translator' },
    { path: '/multilingual-subtitles', label: 'Multilingual Subtitles' },
    { path: '/srt-to-vtt', label: 'SRT to VTT Converter' },
    { path: '/subtitle-converter', label: 'Subtitle Converter' },
    { path: '/tools/srt-to-vtt', label: 'Free SRT to VTT Tool' },
    { path: '/subtitle-validator', label: 'Subtitle Validator' },
    { path: '/subtitle-word-counter', label: 'Subtitle Word Counter' },
    { path: '/subtitle-character-checker', label: 'Subtitle Character Checker' },
    { path: '/subtitle-reading-speed', label: 'Subtitle Reading Speed' },
    { path: '/tools/merge-srt-files', label: 'Merge SRT Files' },
    { path: '/tools/srt-to-text', label: 'SRT to Text' },
    { path: '/tools/srt-to-sbv', label: 'SRT to SBV' },
    { path: '/tools/ass-to-srt', label: 'ASS to SRT' },
    { path: '/tools/ttml-to-srt', label: 'TTML to SRT' },
    { path: '/tools/html-to-srt', label: 'HTML to SRT' },
    { path: '/tools/shift-subtitle-timing', label: 'Shift Subtitle Timing' },
    { path: '/subtitle-resources', label: 'Subtitle Resources & Standards' },
    { path: '/open-captions-vs-closed-captions', label: 'Open vs Closed Captions' },
    { path: '/free-captions-and-subtitles', label: 'Free Captions & Subtitles' },
    { path: '/ada-video-captions', label: 'ADA Video Captions' },
    { path: '/sdh-subtitles', label: 'SDH Subtitles' },
    { path: '/hardcoded-captions', label: 'Hardcoded Captions' },
  ],
}

function buildH1Html(meta: RouteMeta): string {
  const h1Text = meta.h1 ? escapeHtml(meta.h1) : escapeHtml(titleFromPath(meta.path).replace(` | ${SITE_NAME}`, ''))
  const description = escapeHtml(meta.description)
  const routeFamily = getRouteFamily(meta.path)
  const contextualCta = meta.path === '/pricing' ? { path: '/pricing', text: 'Compare minute capacity by workflow' } : getContextualCta(routeFamily, meta.path, 'hero')
  const primaryCta = contextualCta.path
  const primaryLabel = contextualCta.text
  const label = h1Text.replace(/\s+\|\s+VideoText$/i, '')
  const related = [
    { path: '/video-to-transcript', label: 'Video to Transcript' },
    { path: '/video-to-subtitles', label: 'Video to Subtitles' },
    { path: '/translate-subtitles', label: 'Translate Subtitles' },
    { path: '/subtitle-tools', label: 'Subtitle Tools' },
    { path: '/transcription-tools', label: 'Transcription Tools' },
  ].filter((item) => item.path !== meta.path)
  const keywordList = (meta.keywords?.length ? meta.keywords : generateKeywordsFromTitle(meta.title, meta.path)).slice(0, 6)

  const core = getCoreToolSeoDepth(meta.path)
  const answerFirstHtml = core
    ? `
      <p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#1f2937">${escapeHtml(core.answerFirst)}</p>
      <ol style="margin:0 0 16px 0;padding-left:20px;line-height:1.8;color:#374151">
        ${core.howItWorks.steps
          .map(
            (step, i) =>
              `<li><strong>${i + 1}. ${escapeHtml(step.title)}.</strong> ${escapeHtml(step.detail)}</li>`,
          )
          .join('')}
      </ol>
      <dl style="margin:0 0 16px 0;color:#374151">
        ${core.faq
          .slice(0, 3)
          .map(
            (item) =>
              `<div style="margin:0 0 10px 0"><dt style="font-weight:600;color:#111827">${escapeHtml(item.q)}</dt><dd style="margin:4px 0 0 0">${escapeHtml(item.a)}</dd></div>`,
          )
          .join('')}
      </dl>
    `
    : `<p style="margin:0 0 14px 0;font-size:16px;line-height:1.7;color:#4b5563">${description}</p>`

  return `
    <section id="vt-prerender-h1" style="max-width:960px;margin:24px auto 8px auto;padding:0 16px;font-family:system-ui,-apple-system,sans-serif;color:#111827">
      <h1 style="margin:0 0 10px 0;font-size:32px;line-height:1.2;font-weight:800;color:#111827">${h1Text}</h1>
      ${answerFirstHtml}
      <a href="${primaryCta}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:10px 16px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none">${primaryLabel}</a>
      <section style="margin:28px 0 0 0">
        <h2 style="font-size:22px;font-weight:800;margin:0 0 10px 0;color:#111827">What this page helps you do</h2>
        <p style="margin:0;color:#374151;line-height:1.7">Use ${label} to choose the right VideoText workflow for transcript, subtitle, caption, translation, validation, or publishing tasks. The page is designed for practical production work: upload or prepare media, review timing and text quality, and export files that are ready for editors, platforms, clients, or accessibility review.</p>
      </section>
      <section style="margin:28px 0 0 0">
        <h2 style="font-size:22px;font-weight:800;margin:0 0 10px 0;color:#111827">Recommended workflow</h2>
        <p style="margin:0 0 10px 0;color:#374151;line-height:1.7">Choose the closest VideoText tool, inspect the generated transcript or subtitle output, then download SRT, VTT, TXT, or review-ready text depending on your delivery target. For subtitle pages, check line length, reading speed, timing overlap, and cue structure before publishing.</p>
        <ul style="margin:0;padding-left:20px;line-height:1.8;color:#374151">
          <li>Prepare source media, transcript text, or subtitle files before running the workflow.</li>
          <li>Review timestamps, speaker labels, caption density, and export format requirements.</li>
          <li>Use related tools for translation, validation, repair, burning captions, or compression.</li>
        </ul>
      </section>
      <section style="margin:28px 0 0 0">
        <h2 style="font-size:22px;font-weight:800;margin:0 0 10px 0;color:#111827">Quality checks before export</h2>
        <p style="margin:0;color:#374151;line-height:1.7">Before sharing the result, confirm that the transcript is readable, subtitles are synchronized, paragraphs are not duplicated, captions stay within platform limits, and translated text preserves the original timing. These checks help prevent rework in YouTube, Vimeo, social video, LMS, legal review, and agency handoff workflows.</p>
      </section>
      <section style="margin:28px 0 0 0">
        <h2 style="font-size:22px;font-weight:800;margin:0 0 10px 0;color:#111827">Related VideoText tools</h2>
        <p style="margin:0 0 10px 0;color:#374151;line-height:1.7">Continue with the adjacent workflow when you need transcript generation, subtitle creation, caption translation, or file-level QA.</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${related.map((item) => `<a href="${item.path}" style="display:inline-block;border:1px solid #ddd6fe;border-radius:999px;padding:8px 12px;color:#5b21b6;background:#faf5ff;text-decoration:none;font-size:13px;font-weight:700">${escapeHtml(item.label)}</a>`).join('')}
        </div>
        ${keywordList.length ? `<p style="margin:14px 0 0 0;color:#6b7280;font-size:13px">Common use cases: ${keywordList.map(escapeHtml).join(', ')}.</p>` : ''}
      </section>
    </section>
    <script>
      (function () {
        var hidden = false
        function hidePrerenderH1() {
          if (hidden) return
          var root = document.getElementById('root')
          var h1 = document.getElementById('vt-prerender-h1')
          if (!root || !h1) return
          if (root.childElementCount > 0) {
            h1.style.display = 'none'
            hidden = true
          }
        }
        hidePrerenderH1()
        setTimeout(hidePrerenderH1, 250)
        setTimeout(hidePrerenderH1, 1200)
      })()
    </script>
  `
}

function buildConversionContent(meta: RouteMeta): string {
  // Restrict marketing conversion blocks to the compressor landing pages only.
  if (meta.path !== '/compress-video' && meta.path !== '/video-compressor') return ''

  const parts: string[] = []

  if (meta.path === '/video-to-transcript') {
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 10px 0">Video to Transcript Online (Free &amp; Fast)</h2>
        <p style="margin:0;color:#374151;line-height:1.7">VideoText lets you convert video to transcript online in minutes with one upload and one clean output package.</p>
      </section>
      <section style="margin:32px 0">
        <h2 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 10px 0">Transcribe Video to Text in Minutes</h2>
        <p style="margin:0;color:#374151;line-height:1.7">Upload a file or paste a URL, then download transcript text, SRT/VTT subtitles, summary, and chapters.</p>
      </section>
      <section style="margin:32px 0">
        <h2 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 10px 0">Convert Video to Transcript Without Editing</h2>
        <p style="margin:0;color:#374151;line-height:1.7">No timeline editing, no manual cleanup, and no extra steps. One-click output for publishing workflows.</p>
      </section>
      <section style="margin:32px 0">
        <h2 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 10px 0">The Fastest Video to Transcript Tool</h2>
        <p style="margin:0;color:#374151;line-height:1.7">Built for speed with parallel processing for long files and structured outputs in minutes.</p>
      </section>
      <section style="margin:32px 0">
        <h2 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 10px 0">Related transcription tools</h2>
        <ul style="margin:0;padding-left:18px;line-height:1.8">
          <li><a href="/youtube-transcript-generator">Transcribe YouTube videos</a></li>
          <li><a href="/subtitle-generator">Generate subtitles automatically</a></li>
          <li><a href="/transcribe-long-videos">Transcribe long videos</a></li>
        </ul>
        <p style="margin:14px 0 6px 0;color:#374151;font-weight:600">More workflow tools</p>
        <ul style="margin:0;padding-left:18px;line-height:1.8">
          <li><a href="/translate-subtitles">Translate your transcripts</a></li>
          <li><a href="/burn-subtitles">Burn subtitles</a></li>
          <li><a href="/compress-video">Compress your video</a></li>
          <li><a href="/voice-recorder">Need notes/transcripts from your voice</a></li>
        </ul>
      </section>
    `)
  }

  // Value Proposition
  if (meta.valueProposition) {
    parts.push(`
      <section style="margin:32px 0;padding:24px;background:#f9fafb;border-radius:8px;border-left:4px solid #2563eb">
        <p style="margin:0;font-size:16px;line-height:1.6;color:#1f2937">${escapeHtml(meta.valueProposition)}</p>
      </section>
    `)
  }

  // Keywords section
  if (meta.keywords && meta.keywords.length > 0) {
    const keywordList = meta.keywords
      .map((k) => `<span style="display:inline-block;background:#e0e7ff;color:#3730a3;padding:6px 12px;margin:4px 4px 4px 0;border-radius:4px;font-size:14px">${escapeHtml(k)}</span>`)
      .join('')
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:12px">Key Features & Keywords</h2>
        <div style="display:flex;flex-wrap:wrap">${keywordList}</div>
      </section>
    `)
  }

  // Comparison
  if (meta.comparison && meta.comparison.length > 0) {
    const comparisonRows = meta.comparison
      .map(
        (c) => `
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:12px;text-align:left;color:#1f2937">${escapeHtml(c.tool)}</td>
          <td style="padding:12px;text-align:center;color:#dc2626">❌ ${escapeHtml(c.vs)}</td>
          <td style="padding:12px;text-align:center;color:#16a34a">✅ VideoText</td>
        </tr>
      `
      )
      .join('')
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:16px">How VideoText Compares</h2>
        <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <thead style="background:#f3f4f6">
            <tr>
              <th style="padding:12px;text-align:left;color:#374151;font-weight:600">Feature</th>
              <th style="padding:12px;text-align:center;color:#374151;font-weight:600">Competitors</th>
              <th style="padding:12px;text-align:center;color:#374151;font-weight:600">VideoText</th>
            </tr>
          </thead>
          <tbody>${comparisonRows}</tbody>
        </table>
      </section>
    `)
  }

  // How to Use
  if (meta.howToUse && meta.howToUse.length > 0) {
    const steps = meta.howToUse
      .map(
        (h) => `
        <div style="display:flex;gap:16px;margin-bottom:20px">
          <div style="min-width:40px;width:40px;height:40px;background:#2563eb;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0">${h.step}</div>
          <div>
            <h3 style="margin:0 0 8px 0;font-weight:600;color:#1f2937">${escapeHtml(h.title)}</h3>
            <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6">${escapeHtml(h.detail)}</p>
          </div>
        </div>
      `
      )
      .join('')
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:24px">How to Use VideoText</h2>
        ${steps}
      </section>
    `)
  }

  // Social Proof
  if (meta.socialProof && meta.socialProof.length > 0) {
    const stats = meta.socialProof
      .map(
        (s) => `
        <div style="flex:1;min-width:200px;padding:20px;background:#f9fafb;border-radius:8px;text-align:center">
          <div style="font-size:28px;font-weight:bold;color:#2563eb;margin-bottom:8px">${escapeHtml(s.stat)}</div>
          <p style="margin:0;color:#4b5563;font-size:14px">${escapeHtml(s.desc)}</p>
        </div>
      `
      )
      .join('')
    parts.push(`
      <section style="margin:32px 0">
        <h2 style="font-size:18px;font-weight:bold;color:#1f2937;margin-bottom:16px">Why Creators Trust VideoText</h2>
        <div style="display:flex;gap:16px;flex-wrap:wrap">${stats}</div>
      </section>
    `)
  }

  // CTA
  const conversionCta = getContextualCta(getRouteFamily(meta.path), meta.path, 'footer')
  parts.push(`
    <section style="margin:32px 0;padding:24px;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);border-radius:8px;text-align:center;color:white">
      <h2 style="margin:0 0 12px 0;font-size:18px;font-weight:bold">Run the next workflow step</h2>
      <p style="margin:0 0 16px 0;font-size:14px;opacity:0.95">Use the same processing pass for structured text, subtitle timing, and export-ready files.</p>
      <a href="${conversionCta.path}" style="display:inline-block;background:white;color:#2563eb;padding:12px 24px;border-radius:6px;font-weight:600;text-decoration:none;font-size:14px">${escapeHtml(conversionCta.text)}</a>
    </section>
  `)

  return `<div style="max-width:800px;margin:32px auto;padding:0 16px;font-family:system-ui,-apple-system,sans-serif">${parts.join('')}</div>`
}

function buildHubPageHtml(path: string, title: string): string {
  const links = HUB_PAGE_LINKS[path] || []
  const linkHtml = links
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.path)}" style="display:block;padding:12px;border:1px solid #e5e7eb;border-radius:8px;color:#1f2937;text-decoration:none;margin-bottom:8px">${escapeHtml(l.label)}</a></li>`
    )
    .join('\n')

  return `
    <div style="max-width:1280px;margin:40px auto;padding:0 16px">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:32px;margin-top:32px">
        <div>
          <h2 style="font-size:20px;font-weight:bold;margin-bottom:8px">${escapeHtml(title)}</h2>
          <ul style="list-style:none;padding:0;margin:0">
            ${linkHtml}
          </ul>
        </div>
      </div>
    </div>
  `
}

// Inject canonical primary tool links into hub pages as separate section
function buildCanonicalToolsSection(hubPath: string): string {
  let tools: Array<{ path: string; label: string }> = []

  if (hubPath === '/subtitle-tools') {
    tools = [
      { path: '/srt-generator', label: 'SRT File Generator' },
      { path: '/video-to-srt', label: 'Video to SRT Converter' },
      { path: '/translate-subtitles', label: 'Translate Subtitles' },
      { path: '/burn-subtitles', label: 'Burn Subtitles into Video' },
    ]
  } else if (hubPath === '/transcription-tools') {
    tools = [
      { path: '/translate-subtitles', label: 'Translate Subtitles' },
      { path: '/compress-video', label: 'Compress Video' },
    ]
  }

  if (tools.length === 0) return ''

  const linkHtml = tools
    .map(
      (l) =>
        `<li><a href="${escapeHtml(l.path)}" style="display:block;padding:12px;border:1px solid #e5e7eb;border-radius:8px;color:#1f2937;text-decoration:none;margin-bottom:8px">${escapeHtml(l.label)}</a></li>`
    )
    .join('\n')

  return `
    <div style="max-width:1280px;margin:0 auto;padding:0 16px;margin-bottom:40px">
      <div style="border-top:2px solid #f3f4f6;padding-top:32px">
        <h3 style="font-size:16px;font-weight:bold;margin-bottom:16px">Core Processing Tools</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px">
          <ul style="list-style:none;padding:0;margin:0">
            ${linkHtml}
          </ul>
        </div>
      </div>
    </div>
  `
}

function buildAllPagesIndexHtml(routes: RouteMeta[]): string {
  const sorted = [...routes].sort((a, b) => a.path.localeCompare(b.path))
  const items = sorted
    .map((route) => {
      const label = route.breadcrumbLabel || route.h1 || route.title.replace(/\s*[—–|].*$/, '').trim()
      return `<li><a href="${escapeHtml(route.path)}" style="display:block;padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;text-decoration:none;color:#1f2937;background:#fff">${escapeHtml(label)} <span style="color:#6b7280">${escapeHtml(route.path)}</span></a></li>`
    })
    .join('')

  return `
    <section style="max-width:1280px;margin:32px auto;padding:0 16px">
      <h2 style="font-size:20px;font-weight:700;margin:0 0 16px 0">All VideoText Pages</h2>
      <p style="margin:0 0 16px 0;color:#4b5563">Use this index to jump to VideoText transcript, subtitle, formatting, comparison, sample, and utility workflows.</p>
      <ul style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px;list-style:none;padding:0;margin:0">${items}</ul>
    </section>
  `
}

function injectHead(template: string, meta: RouteMeta): string {
  const seoTitle = optimizeSeoTitle(meta.title, meta.path)
  const seoDescription = optimizeMetaDescription(meta.description, meta.path)
  // Replace title tag
  let html = template.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(seoTitle)}</title>`
  )

  // Replace meta description
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeHtml(seoDescription)}" />`
  )

  // Replace canonical (match SPA primary map so static HTML agrees with Helmet)
  const primaryPath = getCanonicalPathForRoute(meta.path)
  const canonicalUrl = getCanonicalUrlForPath(primaryPath)
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${canonicalUrl}" />`
  )

  // Replace og:title
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapeHtml(seoTitle)}" />`
  )

  // Replace og:description
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(seoDescription)}" />`
  )

  // Replace og:url
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${canonicalUrl}" />`
  )

  // Replace twitter:title
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${escapeHtml(seoTitle)}" />`
  )

  // Replace twitter:description
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${escapeHtml(seoDescription)}" />`
  )

  // Replace robots (noindex support)
  if (meta.robots || meta.noindex) {
    const robots = meta.robots || 'noindex,nofollow'
    html = html.replace(
      /<meta\s+name="robots"\s+content="[^"]*"\s*\/>/,
      `<meta name="robots" content="${robots}" />`
    )
  }

  return html
}

interface PrerenderOutputAudit {
  routePath: string
  htmlPath: string
  titleCount: number
  h1Count: number
  h2Count: number
  paragraphCount: number
  rootIsEmpty: boolean
  htmlSize: number
}

function htmlPathForRoute(routePath: string): string {
  return routePath === '/' ? path.join(DIST_DIR, 'index.html') : path.join(DIST_DIR, routePath.slice(1), 'index.html')
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function countMatches(html: string, pattern: RegExp): number {
  return [...html.matchAll(pattern)].length
}

function auditPrerenderedHtml(routePath: string): PrerenderOutputAudit {
  const htmlPath = htmlPathForRoute(routePath)
  if (!fs.existsSync(htmlPath)) {
    return { routePath, htmlPath, titleCount: 0, h1Count: 0, h2Count: 0, paragraphCount: 0, rootIsEmpty: true, htmlSize: 0 }
  }
  const html = fs.readFileSync(htmlPath, 'utf8')
  const rootMatch = html.match(/<div\s+id=["']root["'][^>]*>([\s\S]*?)<\/div>/i)
  return {
    routePath,
    htmlPath,
    titleCount: countMatches(html, /<title\b[^>]*>[\s\S]*?<\/title>/gi),
    h1Count: countMatches(html, /<h1\b[^>]*>[\s\S]*?<\/h1>/gi),
    h2Count: countMatches(html, /<h2\b[^>]*>[\s\S]*?<\/h2>/gi),
    paragraphCount: countMatches(html, /<p\b[^>]*>[\s\S]*?<\/p>/gi),
    rootIsEmpty: rootMatch ? stripTags(rootMatch[1]).length === 0 : true,
    htmlSize: Buffer.byteLength(html, 'utf8'),
  }
}

function assertPrerenderCoverage(allRoutes: RouteMeta[], generatedPaths: Set<string>): void {
  const indexablePaths = new Set(
    getIndexablePaths()
      .map((routePath) => getCanonicalPathForRoute(routePath))
      .filter((routePath) => routePath !== '/blog' && !routePath.startsWith('/blog/')),
  )
  const expectedPaths = new Set([...allRoutes.map((route) => route.path), ...indexablePaths])
  const errors: string[] = []

  for (const routePath of [...expectedPaths].sort()) {
    const audit = auditPrerenderedHtml(routePath)
    if (!fs.existsSync(audit.htmlPath)) errors.push(`${routePath}: missing ${path.relative(REPO_ROOT, audit.htmlPath)}`)
    if (audit.titleCount < 1) errors.push(`${routePath}: missing <title>`)
    if (audit.h1Count < 1) errors.push(`${routePath}: missing <h1>`)
    if (audit.h2Count < 2) errors.push(`${routePath}: missing semantic <h2> sections`)
    if (audit.paragraphCount < 3) errors.push(`${routePath}: insufficient paragraphs (${audit.paragraphCount})`)
    if (audit.rootIsEmpty && audit.h2Count < 2) errors.push(`${routePath}: empty SPA shell without semantic fallback`)
    if (!generatedPaths.has(routePath)) errors.push(`${routePath}: expected route was not written by prerender loop`)
  }

  const generatedIndexableCount = [...generatedPaths].filter((routePath) => indexablePaths.has(routePath)).length
  if (generatedIndexableCount !== indexablePaths.size) {
    errors.push(`indexable route count mismatch: generated ${generatedIndexableCount}, registry/sitemap inventory ${indexablePaths.size}`)
  }

  if (errors.length) {
    console.error('[prerender] Static HTML validation failed:')
    for (const error of errors.slice(0, 80)) console.error(`  - ${error}`)
    if (errors.length > 80) console.error(`  - ...and ${errors.length - 80} more`)
    process.exit(1)
  }
}

async function fetchPublicRatingForPrerender(): Promise<PublicRating | null> {
  const origin = (process.env.VITE_API_URL || process.env.API_BASE_URL || 'https://api.videotext.io')
    .replace(/\/api\/?$/, '')
    .replace(/\/$/, '')
  try {
    const res = await fetch(`${origin}/api/stats/public/rating`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return parsePublicRating(await res.json())
  } catch (err) {
    console.warn('[prerender] public rating fetch failed; omitting AggregateRating', (err as Error)?.message)
    return null
  }
}

function buildHomeRatingHtml(rating: PublicRating): string {
  const value = escapeHtml(formatPublicRatingValue(rating))
  const countLabel = escapeHtml(formatPublicRatingCount(rating))
  return `<div id="vt-public-rating" data-average="${value}" data-count="${rating.ratingCount}" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 16px 8px;font-family:system-ui,-apple-system,sans-serif;color:#111827">
      <p style="margin:0;font-size:16px;font-weight:700">Rated ${value} out of 5 from ${countLabel}</p>
    </div>`
}

function buildPublicRatingBootstrap(rating: PublicRating): string {
  return `<script>window.__PUBLIC_RATING__=${JSON.stringify(rating)}</script>`
}

function injectHomepageVisibleRating(html: string, rating: PublicRating | null): string {
  if (!rating) return html
  const ratingHtml = buildHomeRatingHtml(rating)
  const bootstrap = buildPublicRatingBootstrap(rating)
  html = html.replace('</head>', `${bootstrap}\n</head>`)
  // Insert after the first H1 so crawlers see stars next to the page title.
  // Never replace an empty #root here — that blocks SSR / H1 fallback injection.
  if (/<h1\b/i.test(html)) {
    return html.replace(/<\/h1>/i, `</h1>\n${ratingHtml}`)
  }
  return html.replace('</body>', `${ratingHtml}\n</body>`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const templatePath = path.join(DIST_DIR, 'index.html')
  if (!fs.existsSync(templatePath)) {
    console.error('[prerender] dist/index.html not found — run the client build first.')
    process.exit(1)
  }

  const blogDistDir = path.join(DIST_DIR, 'blog')
  if (fs.existsSync(blogDistDir)) {
    fs.rmSync(blogDistDir, { recursive: true, force: true })
    console.log('[prerender] Removed stale dist/blog/ (Hashnode is canonical; vercel.json redirects /blog/*)')
  }

  const template = fs.readFileSync(templatePath, 'utf8')
  const publicRating = await fetchPublicRatingForPrerender()
  if (publicRating) {
    console.log(`[prerender] public rating ${publicRating.averageRating.toFixed(1)} from ${publicRating.ratingCount} ratings`)
  }

  // Collect all routes: static + registry (parsed) + programmatic
  const registryEntries = parseRegistryEntries()
  const programmaticEntries = getProgrammaticSeoEntries()
  const allRoutes: RouteMeta[] = mergeRouteMetaWithSitemapCoverage([
    ...registryEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      h1: e.h1,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
      keywords: e.keywords || generateKeywordsFromTitle(e.title, e.path),
      valueProposition: e.valueProposition,
      comparison: e.comparison,
      howToUse: e.howToUse,
      socialProof: e.socialProof,
    })),
    ...programmaticEntries.map((e) => ({
      path: e.path,
      title: e.title,
      description: e.description,
      h1: e.h1,
      faq: e.faq,
      breadcrumbLabel: e.breadcrumbLabel,
      keywords: e.keywords || generateKeywordsFromTitle(e.title, e.path),
      valueProposition: e.valueProposition,
      comparison: e.comparison,
      howToUse: e.howToUse,
      socialProof: e.socialProof,
    })),
    // Keep static routes last so canonical core pages (e.g. /video-to-transcript)
    // are not overwritten by registry aliases that resolve to the same primary URL.
    ...STATIC_META,
  ])

  let count = 0
  const generatedPaths = new Set<string>()
  for (const meta of allRoutes) {
    const routePath = meta.path
    let html = injectHead(template, meta)
    html = injectStructuredData(html, routePath, meta, publicRating)

    // Full SSR: inject complete React-rendered HTML into the root div for comparison/vs pages.
    // Non-JS crawlers (LLM training pipelines, etc.) will see the full page content.
    const ssrHtml = renderPageToHtml(routePath)
    if (ssrHtml) {
      html = html.replace('<div id="root"></div>', `<div id="root">${ssrHtml}</div>`)
    } else if (meta.h1) {
      // For all other pages: inject minimal H1 + description for non-JS crawlers.
      html = html.replace('</body>', `${buildH1Html(meta)}\n</body>`)
    }

    if (routePath === '/') {
      html = injectHomepageVisibleRating(html, publicRating)
    }

    // Inject high-conversion content (keywords, comparison, how-to, proof)
    if (meta.valueProposition || meta.keywords || meta.comparison || meta.howToUse || meta.socialProof) {
      const conversionContent = buildConversionContent(meta)
      html = html.replace('</body>', `${conversionContent}\n</body>`)
    }

    // Inject complete HTML index page with links to all prerendered routes.
    if (routePath === '/site-index') {
      const allPagesIndexHtml = buildAllPagesIndexHtml(allRoutes)
      html = html.replace('</body>', `${allPagesIndexHtml}\n</body>`)
    }

    // Inject hub page links directly into static HTML (for SEO crawlers without JS execution)
    if (HUB_PAGE_LINKS[routePath]) {
      const hubHtml = buildHubPageHtml(routePath, meta.title)
      html = html.replace('</body>', `${hubHtml}\n</body>`)

      // Also inject canonical tool links section (compress-video, burn-subtitles, translate-subtitles)
      const canonicalToolsHtml = buildCanonicalToolsSection(routePath)
      if (canonicalToolsHtml) {
        html = html.replace('</body>', `${canonicalToolsHtml}\n</body>`)
      }
    }

    if (routePath === '/') {
      // Overwrite root index.html in place
      fs.writeFileSync(templatePath, html, 'utf8')
    } else {
      // Write to dist/{route}/index.html
      const dir = path.join(DIST_DIR, routePath.slice(1))
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8')
    }

    generatedPaths.add(routePath)
    count++
  }

  assertPrerenderCoverage(allRoutes, generatedPaths)
  console.log(`[prerender] Generated ${count} static HTML files in ${DIST_DIR}`)
}

void main()
