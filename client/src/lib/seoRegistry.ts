/**
 * SEO page registry — single source of truth for programmatic SEO wrapper pages.
 * Used by SeoToolPage template, meta derivation, and automation (sitemap, routes).
 * NO content rewriting; pure migration from existing wrapper pages.
 */
import { getProgrammaticSeoEntries } from './generateSeoPages'

export interface FaqItem {
  q: string
  a: string
}

export type SeoToolKey =
  | 'video-to-transcript'
  | 'video-to-subtitles'
  | 'translate-subtitles'
  | 'fix-subtitles'
  | 'burn-subtitles'
  | 'compress-video'
  | 'batch-process'

export interface SeoRegistryEntry {
  /** Path (e.g. /video-to-text). Must match route path. */
  path: string
  /** Page title (used for <title> and og:title). */
  title: string
  /** Meta description. */
  description: string
  /** H1 on page. */
  h1: string
  /** Intro paragraph below H1. */
  intro: string
  /** FAQ items for FAQ section and FAQPage schema. */
  faq: FaqItem[]
  /** Breadcrumb label (last segment). */
  breadcrumbLabel: string
  /** Canonical tool path — which core tool component to render. */
  toolKey: SeoToolKey
  /** Related tool paths for cross-linking (CrossToolSuggestions). Must be existing and indexable. */
  relatedSlugs: string[]
  /** Include in sitemap and allow in relatedSlugs. Required. */
  indexable: boolean
  /** Unique intent identifier; prevents keyword cannibalization (one indexable per intentKey unless allowlisted). */
  intentKey: string
  /** Optional group for close variants; at most one primary indexable per group unless allowlisted. */
  canonicalGroup?: string
  /** When true, this page is the primary indexable for its canonicalGroup. */
  primaryInGroup?: boolean
  /** For video-to-transcript: open YouTube URL tab by default (improves conversion for YouTube SEO pages). */
  defaultInputMode?: 'youtube'
}

const MANUAL_REGISTRY: SeoRegistryEntry[] = [
  {
    path: '/video-to-text',
    title: 'Video to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert video to text online. Get a transcript in seconds, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Sign up for free to try.',
    h1: 'Video to Text Online',
    intro:
      'Turn any video into text in seconds. Upload a video, get a transcript, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Sign up for free to try.',
    breadcrumbLabel: 'Video to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-to-text',
    faq: [
      { q: 'What video formats are supported?', a: 'We support MP4, MOV, AVI, WebM, and MKV. Upload any of these formats and our AI extracts the speech track as plain text within seconds. If your file is in a different container, most video editors let you export to MP4 before uploading.' },
      { q: 'Is the transcript accurate?', a: 'Yes. We use AI speech recognition trained on diverse audio to deliver high accuracy for clear speech. Accuracy is best when the audio is clear with minimal background noise. Setting the spoken language before processing improves results for non-English content.' },
      { q: 'Can I copy or download the transcript?', a: 'Yes. After processing, click the Copy button to grab the full transcript as plain text, or use the download icon for a text file. Paid plans unlock additional export formats including JSON, CSV, Markdown, and Notion-style structured output.' },
      { q: 'Can I view the transcript in another language?', a: 'Yes. Click Translate after transcribing and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated view appears alongside the original. Translations are generated on demand and cached so you can switch between languages instantly without re-uploading.' },
    ],
  },
  // ── YouTube transcription (high SEO potential) ─────────────────────────────────
  {
    path: '/youtube-to-transcript',
    title: 'YouTube to Transcript – Paste URL, Get Text Instantly | VideoText',
    description:
      'Convert any YouTube video to transcript with one click. Paste a youtube.com or youtu.be link — no download, no upload. AI transcription in seconds. Free tier. Sign up for free to try.',
    h1: 'YouTube to Transcript — Paste URL, Get Text Instantly',
    intro:
      'Paste any YouTube URL and get a full transcript in seconds. No download, no file upload. Our worker streams the audio directly and transcribes it with AI. Works with public videos, playlists, shorts, and age-restricted content (with optional cookies). Same features as file upload: speakers, summary, chapters, translate to 6 languages.',
    breadcrumbLabel: 'YouTube to Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles', '/transcribe-video', '/meeting-transcript'],
    indexable: true,
    intentKey: 'youtube-to-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'Can I transcribe a YouTube video without downloading it?', a: 'Yes. Paste any public YouTube URL (youtube.com/watch?v=… or youtu.be/…) and we stream the audio directly. No download, no file upload. The transcript is ready in seconds.' },
      { q: 'Does YouTube to transcript work with age-restricted or private videos?', a: 'Age-restricted videos work when you provide optional cookies (export from your browser). Private and unlisted videos are not supported — only public URLs.' },
      { q: 'What YouTube URL formats are supported?', a: 'We support youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…, and youtube.com/embed/…. Any format that contains the 11-character video ID works.' },
      { q: 'Is YouTube transcription free?', a: 'Yes. The free tier includes 3 imports per month (resets on the 1st). Paste a URL and get a transcript after signing up for free. Paid plans unlock more volume and multi-language output.' },
    ],
  },
  {
    path: '/youtube-transcript',
    title: 'YouTube Transcript – Get Transcript from Any YouTube Video | VideoText',
    description:
      'Get a transcript from any YouTube video. Paste the URL, no download needed. Accurate AI transcription. Download as TXT, SRT, or translate to 50+ languages. Free tier.',
    h1: 'YouTube Transcript — Get Text from Any Video',
    intro:
      'Get a transcript from any YouTube video in seconds. Paste the URL — we stream the audio and transcribe it with AI. Download the text, generate SRT subtitles, or translate to 6 languages. No software to install, no file to upload.',
    breadcrumbLabel: 'YouTube Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles', '/podcast-transcript'],
    indexable: true,
    intentKey: 'youtube-transcript',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I get a transcript from a YouTube video?', a: 'Paste the YouTube URL into our transcript tool and click Transcribe. We extract the audio and convert it to text with AI. The transcript appears in seconds.' },
      { q: 'Can I use the YouTube transcript for subtitles?', a: 'Yes. After transcribing, download as SRT or VTT and upload to YouTube Studio as captions. Or use our Video to Subtitles tool to generate timed captions from any video.' },
      { q: 'Is there a limit on video length for YouTube transcription?', a: 'Free tier: 3 imports per month. Paid plans support up to 4 hours per video. Very long videos may take a few minutes to process.' },
    ],
  },
  {
    path: '/youtube-video-transcript',
    title: 'YouTube Video Transcript – Convert Any YouTube Link to Text | VideoText',
    description:
      'Convert YouTube video to transcript. Paste a link, get accurate text. No download. Free AI transcription. Speakers, summary, chapters. Translate to Hindi, Spanish, Chinese, and more.',
    h1: 'YouTube Video Transcript — Convert Link to Text',
    intro:
      'Convert any YouTube video to a transcript with one click. Paste the link — no download, no upload. Our AI transcribes the speech and delivers a clean, readable transcript. Use Speakers for who-said-what, Summary for key points, Chapters to navigate by section.',
    breadcrumbLabel: 'YouTube Video Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/transcribe-video', '/audio-to-text'],
    indexable: true,
    intentKey: 'youtube-video-transcript',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'Can I get a transcript from a YouTube video link?', a: 'Yes. Paste any youtube.com or youtu.be link and we transcribe the video. No download required.' },
      { q: 'Does it work with YouTube Shorts?', a: 'Yes. Shorts URLs (youtube.com/shorts/…) are supported. Same transcription quality as regular videos.' },
      { q: 'Can I translate the YouTube transcript?', a: 'Yes. After transcribing, click Translate and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian.' },
    ],
  },
  {
    path: '/transcribe-youtube-video',
    title: 'Transcribe YouTube Video – Free Online | VideoText',
    description:
      'Transcribe any YouTube video free. Paste the URL, get an accurate transcript. Sign up for free. AI-powered. Download as TXT or SRT. Translate to 50+ languages.',
    h1: 'Transcribe YouTube Video — Free Online',
    intro:
      'Transcribe any YouTube video for free. Paste the URL and get an accurate text transcript in seconds. Sign up for free. No download needed. Use the transcript for subtitles, blog posts, or translation.',
    breadcrumbLabel: 'Transcribe YouTube Video',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/free-transcription', '/podcast-transcript'],
    indexable: true,
    intentKey: 'transcribe-youtube-video',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'Is it free to transcribe a YouTube video?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free.' },
      { q: 'How accurate is YouTube video transcription?', a: 'We use AI speech recognition trained on diverse content. Accuracy is high for clear speech. Set the spoken language for best results.' },
      { q: 'Can I transcribe YouTube videos in other languages?', a: 'Yes. Set the spoken language before processing. After transcribing, translate to 6 languages with one click.' },
    ],
  },
  {
    path: '/youtube-to-text',
    title: 'YouTube to Text – Convert YouTube Videos to Text Online | VideoText',
    description:
      'Convert YouTube videos to text online. Paste any YouTube URL and get a transcript instantly. No download. Free, AI-powered. Download or copy. Translate to 6 languages.',
    h1: 'YouTube to Text — Convert Videos to Text Online',
    intro:
      'Convert any YouTube video to text with one click. Paste the URL and get a full transcript. No download, no file upload. Download as plain text, copy to clipboard, or translate to English, Hindi, Spanish, Chinese, Russian, or Telugu.',
    breadcrumbLabel: 'YouTube to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-text', '/mp4-to-text'],
    indexable: true,
    intentKey: 'youtube-to-text',
    canonicalGroup: 'youtube-transcript',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I convert a YouTube video to text?', a: 'Paste the YouTube URL into our tool and click Transcribe. We extract the audio and convert it to text.' },
      { q: 'Is YouTube to text free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
      { q: 'Can I use the text for subtitles?', a: 'Yes. Download as SRT or VTT and upload to YouTube, Vimeo, or any platform.' },
    ],
  },
  {
    path: '/mp4-to-text',
    title: 'MP4 to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert MP4 to text online. Get an accurate transcript, then translate it to Hindi, Telugu, Spanish, Chinese, Russian, or English. Fast. Sign up for free to try.',
    h1: 'MP4 to Text Online',
    intro:
      'Convert MP4 video to text online. Upload your MP4, get an accurate transcript, then view it in Hindi, Telugu, Spanish, Chinese, Russian, or English. Fast. Sign up for free to try.',
    breadcrumbLabel: 'MP4 to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'mp4-to-text',
    faq: [
      { q: 'Can I convert MP4 to text?', a: 'Yes. Upload your MP4 file and our AI extracts the spoken audio as plain text. We also support MOV, AVI, WebM, and MKV. The entire process — upload, extraction, transcription — runs automatically in the background and results appear within seconds for short videos.' },
      { q: 'How long does MP4 transcription take?', a: 'Most videos are fully transcribed in 30–90 seconds. You see the transcript building in real time as segments complete, so you do not wait for the entire job before reading results. A 60-minute video typically finishes in 5–8 minutes.' },
      { q: 'Is there a file size limit for MP4 files?', a: 'Large MP4 files are supported — check the upload zone for the current limit. If your file exceeds it, trim the video to the segment you need before uploading. The tool processes the audio track, not the full video, so compression level does not affect speed.' },
      { q: 'Can I translate the MP4 transcript to another language?', a: 'Yes. After transcribing, click Translate and choose English, Hindi, Telugu, Spanish, Chinese, or Russian to view the transcript in that language. The translated view appears alongside the original, and you can switch between languages without re-uploading your file.' },
    ],
  },
  {
    path: '/mp4-to-srt',
    title: 'MP4 to SRT Online – Fast & Accurate | VideoText',
    description:
      'Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, download timed captions. Sign up for free to try.',
    h1: 'MP4 to SRT Online',
    intro:
      'Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, and download timed captions. Sign up for free to try.',
    breadcrumbLabel: 'MP4 to SRT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles'],
    indexable: true,
    intentKey: 'mp4-to-srt',
    faq: [
      { q: 'How do I get SRT subtitles from an MP4 file?', a: 'Upload your MP4 file, choose SRT as the output format, and click Generate. Our AI transcribes the speech and aligns each word to its timestamp, producing a timed SRT file you can download and upload directly to YouTube, Vimeo, or any video platform.' },
      { q: 'Can I get VTT instead of SRT from MP4?', a: 'Yes. The tool supports both SRT and VTT from the same upload. SRT is recommended for YouTube and most video platforms; VTT is the standard for HTML5 web players. Select your preferred format before processing — no re-upload needed to switch.' },
      { q: 'Does MP4 to SRT support multiple languages?', a: 'Yes. Set the spoken language for best accuracy, or use auto-detect for English and many other languages. Paid plans let you generate subtitle files in multiple output languages from a single upload, which is useful for multilingual audiences.' },
    ],
  },
  {
    path: '/subtitle-generator',
    title: 'Subtitle Generator Online – Fast & Accurate | VideoText',
    description:
      'Generate subtitles from video in one click. Upload any video, get SRT or VTT with accurate timestamps. Fast and free tier available.',
    h1: 'Subtitle Generator Online',
    intro:
      'Generate subtitles from video in one click. Upload any video, get SRT or VTT with accurate timestamps. Fast and free tier available.',
    breadcrumbLabel: 'Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles'],
    indexable: true,
    intentKey: 'subtitle-generator',
    faq: [
      { q: 'What is a subtitle generator?', a: 'A subtitle generator transcribes speech in a video and aligns each word to a timestamp, producing a timed subtitle file (SRT or VTT) that you can upload to YouTube, embed in a web player, or burn into the video. You upload the video and download ready-to-use captions in seconds.' },
      { q: 'Which subtitle formats does the generator produce?', a: 'SRT and VTT, both generated from the same upload. SRT is the best choice for YouTube, Vimeo, LinkedIn, and most video platforms. VTT is the standard for HTML5 web players like Video.js and Plyr. You choose the format at the point of download.' },
      { q: 'Do I need to sign up to generate subtitles?', a: 'Yes. Sign up for free to try. You get 3 imports per month (resets on the 1st). Upgrade to a paid plan when you need more imports or multi-language subtitle output in one batch.' },
    ],
  },
  {
    path: '/srt-translator',
    title: 'SRT Translator Online – Fast & Accurate | VideoText',
    description:
      'Translate SRT subtitle files to another language. Upload your SRT or VTT, choose target language, download translated captions with timestamps intact.',
    h1: 'SRT Translator Online',
    intro:
      'Translate SRT subtitle files to another language. Upload your SRT or VTT, choose the target language, and download translated captions with timestamps intact.',
    breadcrumbLabel: 'SRT Translator',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/fix-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'srt-translator',
    faq: [
      { q: 'What is an SRT translator?', a: 'An SRT translator converts the text inside an SRT or VTT subtitle file into another language while keeping every timestamp exactly as it was. You upload the subtitle file, select the target language, and download a translated version where the captions stay perfectly in sync with the video.' },
      { q: 'Which languages does the SRT translator support?', a: 'The translator supports 50+ languages including Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, and more. The original timing is always preserved — only the text content changes. Set the source and target language before processing for best accuracy.' },
      { q: 'Can I edit the translated SRT subtitles?', a: 'Yes. After translation, preview the result and download. Paid plans unlock in-app editing so you can adjust translated text before downloading, which is useful for fixing AI translation nuances or adding context that direct translation misses.' },
    ],
  },
  {
    path: '/meeting-transcript',
    title: 'Meeting Transcript — Turn Meetings into Text | VideoText',
    description:
      'Convert meeting recordings to text. Get a transcript in seconds, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Download or copy. Sign up for free to try.',
    h1: 'Meeting Transcript — Turn Meetings into Text',
    intro:
      'Convert meeting recordings to text in seconds. Upload a video, get a transcript, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Use Speakers and Summary for who said what and key points.',
    breadcrumbLabel: 'Meeting Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'meeting-transcript',
    faq: [
      { q: 'Is meeting transcription free?', a: 'Yes. The free tier includes 3 imports per month (resets on the 1st) — sign up for free to try. Create a free account to track usage across browser sessions. Paid plans start at $19/month for 450 minutes, covering most teams that process a few hours of meetings per week.' },
      { q: 'Does this work for Zoom, Teams, and Google Meet recordings?', a: 'Yes. Upload any meeting recording in MP4 or MOV format — Zoom cloud recordings, Teams downloads, and Google Meet exports all work. Use the Speakers branch after transcribing to see who said what, organized by speaker turn rather than continuous paragraphs.' },
      { q: 'Do timestamps stay accurate in meeting transcripts?', a: 'Yes. The transcript preserves paragraph structure aligned to the original audio timing. The Chapters branch breaks the meeting into navigable sections so you can jump to specific topics. Keywords indexes repeated terms and links each to where it first appears in the transcript.' },
      { q: 'Can I get the meeting transcript in another language?', a: 'Yes. Click Translate after transcribing and pick from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated view appears alongside the original. This is useful for global teams where meeting notes need to reach colleagues in different countries.' },
    ],
  },
  {
    path: '/speaker-diarization',
    title: 'Speaker-Separated Video Transcripts — Instantly Online | VideoText',
    description:
      'Get video transcripts with speaker labels. Transcribe, then view Speakers branch and translate transcript to Hindi, Telugu, Spanish, Chinese, Russian, or English. Free tier.',
    h1: 'Speaker-Separated Video Transcripts — Instantly Online',
    intro:
      'Get video transcripts with speaker-style grouping. Transcribe, then open the Speakers branch and optionally view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian.',
    breadcrumbLabel: 'Speaker Diarization',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'speaker-diarization',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'How are speakers labeled?', a: 'After transcribing, open the Speakers branch. Paragraphs are grouped and labeled (Speaker 1, 2, etc.) from the transcript structure.' },
      { q: 'Do timestamps stay accurate?', a: 'Yes. The transcript and all branches use the same underlying text; you can jump from Chapters or Keywords to the transcript.' },
    ],
  },
  {
    path: '/video-summary-generator',
    title: 'Video Summary Generator — Decisions, Actions, Key Points | VideoText',
    description:
      'Extract structured summaries from video: decisions, action items, key points. Transcribe, use Summary branch, and translate transcript to 6 languages. Free tier.',
    h1: 'Video Summary Generator — Decisions, Actions, Key Points',
    intro:
      'Extract structured summaries from video: decisions, action items, key points. Upload, transcribe, open the Summary branch, and translate the transcript to 6 languages if needed.',
    breadcrumbLabel: 'Video Summary Generator',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-summary-generator',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
      { q: 'What does the summary include?', a: 'The Summary branch extracts decisions, action items, and key points from the transcript using simple pattern matching.' },
      { q: 'Can I export the summary?', a: 'Yes. Use the Exports branch to download JSON, CSV, Markdown, or Notion-style export (paid for full download).' },
    ],
  },
  {
    path: '/video-chapters-generator',
    title: 'Video Chapters Generator — Section Headings from Transcript | VideoText',
    description:
      'Generate chapter headings from your video transcript. Upload, transcribe, use Chapters branch. View or translate transcript in English, Hindi, Telugu, Spanish, Chinese, Russian. Free.',
    h1: 'Video Chapters Generator — Section Headings from Transcript',
    intro:
      'Generate chapter-style sections from your video transcript. Upload, transcribe, use the Chapters branch to jump by section, and view or translate the transcript in 6 languages.',
    breadcrumbLabel: 'Video Chapters Generator',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-chapters-generator',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
      { q: 'How are chapters created?', a: 'Chapters are derived from transcript paragraphs. Open the Chapters branch after transcribing to see section headings and jump to that part of the transcript.' },
      { q: 'Can I use these on YouTube?', a: 'Chapters are for navigation in our tool. For YouTube chapters, use the timestamps in your video description; our transcript helps you find where sections start.' },
    ],
  },
  {
    path: '/keyword-indexed-transcript',
    title: 'Keyword-Indexed Transcript — Topic Index from Video | VideoText',
    description:
      'Get a keyword index from your video transcript. Repeated terms link to sections. Translate transcript to Hindi, Telugu, Spanish, Chinese, Russian, or English. Upload, transcribe, open Keywords branch.',
    h1: 'Keyword-Indexed Transcript — Topic Index from Video',
    intro:
      'Get a keyword index from your video transcript. Upload, transcribe, open the Keywords branch, and view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian.',
    breadcrumbLabel: 'Keyword Indexed Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'keyword-indexed-transcript',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st).' },
      { q: 'What are keywords?', a: 'Repeated terms in the transcript. The Keywords branch shows them and links each to the transcript section where it first appears.' },
      { q: 'Can I export the index?', a: 'Yes. The Exports branch offers JSON, CSV, Markdown, and Notion-style export (paid for full download).' },
    ],
  },
  {
    path: '/srt-to-vtt',
    title: 'SRT to VTT Converter — Subtitle Format Conversion | VideoText',
    description:
      'Generate VTT from video or convert SRT to VTT. Upload video for SRT/VTT, or use the convert step after generating. Free tier.',
    h1: 'SRT to VTT — Subtitle Format Conversion',
    intro:
      'Generate VTT from video or convert SRT to VTT. Upload a video for SRT/VTT, or use the convert step after generating. Free tier available.',
    breadcrumbLabel: 'SRT to VTT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles'],
    indexable: true,
    intentKey: 'srt-to-vtt',
    faq: [
      { q: 'How do I get VTT from video?', a: 'Upload your video, choose VTT as the format, and click Generate. You get a timed VTT file for web players.' },
      { q: 'Can I convert SRT to VTT?', a: 'Yes. After generating SRT, use the Convert format section on the same page to get VTT or plain text.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. Paid plans unlock full export and multi-language.' },
    ],
  },
  {
    path: '/subtitle-converter',
    title: 'Subtitle Converter — SRT, VTT, TXT | VideoText',
    description:
      'Convert subtitle formats: SRT, VTT, plain text. Generate from video or convert after download. One tool, multiple formats. Free tier.',
    h1: 'Subtitle Converter — SRT, VTT, TXT',
    intro:
      'Convert subtitle formats: SRT, VTT, plain text. Generate from video or convert after download. One tool, multiple formats.',
    breadcrumbLabel: 'Subtitle Converter',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles'],
    indexable: true,
    intentKey: 'subtitle-converter',
    faq: [
      { q: 'What formats are supported?', a: 'Generate SRT or VTT from video. After processing, you can convert to SRT, VTT, or plain text (TXT).' },
      { q: 'Is this free?', a: 'Yes. Free tier available. Conversion preview is free; full download may require upgrade.' },
      { q: 'Do timestamps stay accurate?', a: 'Yes. Conversion only changes format; timestamps are preserved.' },
    ],
  },
  {
    path: '/subtitle-timing-fixer',
    title: 'Subtitle Timing Fixer — Fix Overlaps and Gaps | VideoText',
    description:
      'Fix overlapping timestamps and gaps in SRT/VTT files. Upload your subtitle file, get corrected timing. Free. Same tool as Fix Subtitles.',
    h1: 'Subtitle Timing Fixer — Fix Overlaps and Gaps',
    intro:
      'Fix overlapping timestamps and gaps in SRT/VTT files. Upload your subtitle file, get corrected timing. Free.',
    breadcrumbLabel: 'Subtitle Timing Fixer',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/translate-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-timing-fixer',
    faq: [
      { q: 'What does the fixer do?', a: 'It fixes overlapping timestamps, long lines, and gaps in SRT/VTT files so they meet platform and readability rules.' },
      { q: 'Is this free?', a: 'Yes. Upload your subtitle file, get a corrected file. Free.' },
      { q: 'Do I need to upload video?', a: 'No. You upload only the SRT or VTT file. The tool analyzes and corrects timing and format.' },
    ],
  },
  {
    path: '/subtitle-validation',
    title: 'Subtitle Validation — Check Timing and Format | VideoText',
    description:
      'Validate and fix SRT/VTT files: timing, line length, formatting. Upload subtitles, get a corrected file. Free. Same tool as Fix Subtitles.',
    h1: 'Subtitle Validation — Check Timing and Format',
    intro:
      'Validate and fix SRT/VTT files: timing, line length, formatting. Upload subtitles, get a corrected file. Free.',
    breadcrumbLabel: 'Subtitle Validation',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/translate-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-validation',
    faq: [
      { q: 'What does validation check?', a: 'Timing overlaps, line length, formatting. The tool reports issues and can fix them; you get a corrected SRT/VTT file.' },
      { q: 'Is this free?', a: 'Yes. Upload SRT or VTT, get validation and a corrected file. Free.' },
      { q: 'Can I edit subtitles after?', a: 'Yes. Paid plans unlock in-app editing; you can also download and edit the file elsewhere.' },
    ],
  },
  {
    path: '/subtitle-translator',
    title: 'Subtitle Translator — SRT/VTT to Any Language | VideoText',
    description:
      'Translate SRT or VTT subtitles to 50+ languages. Upload, pick target language, download. Timestamps stay intact. Free tier.',
    h1: 'Subtitle Translator — SRT/VTT to Any Language',
    intro:
      'Translate SRT or VTT subtitles to 50+ languages. Upload, pick target language, download. Timestamps stay intact.',
    breadcrumbLabel: 'Subtitle Translator',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/fix-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-translator',
    faq: [
      { q: 'What languages does the subtitle translator support?', a: 'The subtitle translator supports 50+ languages including Arabic, Hindi, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Turkish, Italian, Dutch, and more. Pick your target language from the dropdown before processing. The source language is detected automatically or you can set it manually for better accuracy.' },
      { q: 'Do timestamps stay intact when translating subtitles?', a: 'Yes. Only the text content is translated — every start time and end time in the original SRT or VTT file stays exactly as it was. Your translated subtitles remain perfectly synchronized with the video without any timing adjustments needed.' },
      { q: 'Is the subtitle translator free?', a: 'Yes. Free tier is available after signing up for free. Upload an SRT or VTT file and download the translated version at no cost within the monthly free limit. Paid plans unlock higher minute limits and multi-language output so you can translate a file to multiple languages in one session.' },
    ],
  },
  {
    path: '/multilingual-subtitles',
    title: 'Multilingual Subtitles — Multiple Languages from One File | VideoText',
    description:
      'Get subtitles in multiple languages. Translate SRT/VTT to Arabic, Hindi, Spanish, and more. One upload, many languages. Free tier.',
    h1: 'Multilingual Subtitles — Multiple Languages from One File',
    intro:
      'Get subtitles in multiple languages. Translate SRT/VTT to Arabic, Hindi, Spanish, and more. One upload, many languages.',
    breadcrumbLabel: 'Multilingual Subtitles',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/fix-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'multilingual-subtitles',
    faq: [
      { q: 'Can I get subtitles in multiple languages from one file?', a: 'Yes. Upload your subtitle file once and translate it to different languages individually — each download is a separate file for one target language. Paid plans let you generate multiple language outputs in a single batch, which saves time for creators distributing content to international audiences.' },
      { q: 'Is multilingual subtitle generation free?', a: 'Yes. Free tier is available after signing up for free. Single-language translation is free within the monthly limit. Upgrade to Pro or Agency plans to unlock multi-language batch output, where you generate subtitles in three or more languages from a single upload session.' },
      { q: 'Do timestamps stay accurate across all translated languages?', a: 'Yes. Subtitle translation only changes the text content — every timestamp is preserved exactly as it was in the original file. Your multilingual subtitles stay perfectly synchronized with the video in every language without any timing adjustments on your part.' },
    ],
  },
  {
    path: '/subtitle-language-checker',
    title: 'Subtitle Language Checker — Detect and Translate | VideoText',
    description:
      'Check subtitle language and translate to another. Upload SRT/VTT, choose target language, download. Free tier available.',
    h1: 'Subtitle Language Checker — Detect and Translate',
    intro:
      'Check subtitle language and translate to another. Upload SRT/VTT, choose target language, download. Free tier available.',
    breadcrumbLabel: 'Subtitle Language Checker',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/fix-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-language-checker',
    faq: [
      { q: 'What does the subtitle language checker do?', a: 'You upload an SRT or VTT subtitle file and choose a target language. The tool translates the captions so you can verify the content in the new language, check for translation quality, or use the file on a platform that requires a specific language. Your original file is unchanged.' },
      { q: 'Is the subtitle language checker free?', a: 'Yes. Free tier is available after signing up for free. Upload an SRT or VTT file, select the target language, and download the translated version at no cost within the monthly free limit. Paid plans unlock higher limits and multi-language output options.' },
      { q: 'Does the checker modify my original subtitle file?', a: 'No. The translated version is a separate download — your original SRT or VTT file is never modified. You can keep both the original and translated versions and use each wherever needed, such as uploading the original to one platform and the translated version to another.' },
    ],
  },
  {
    path: '/subtitle-grammar-fixer',
    title: 'Subtitle Grammar Fixer — Auto-Correct Caption Text | VideoText',
    description:
      'Fix grammar and formatting in SRT/VTT files. Upload subtitles, get corrected text and timing. Free. Same tool as Fix Subtitles.',
    h1: 'Subtitle Grammar Fixer — Auto-Correct Caption Text',
    intro:
      'Fix grammar and formatting in SRT/VTT files. Upload subtitles, get corrected text and timing. Free.',
    breadcrumbLabel: 'Subtitle Grammar Fixer',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/translate-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-grammar-fixer',
    faq: [
      { q: 'What does the subtitle grammar fixer do?', a: 'The subtitle grammar fixer corrects timing, formatting, and structural issues in SRT and VTT files. It fixes overlapping timestamps, lines that are too long for the screen, and spacing errors. Enable the grammar-fix option when processing to also improve caption text capitalization and punctuation.' },
      { q: 'Is the subtitle grammar fixer free?', a: 'Yes. Upload your SRT or VTT file and download a corrected version at no cost within the monthly free limit. Sign up for free to try. The fixer handles timing and formatting automatically — you do not need to edit the file manually after downloading.' },
      { q: 'Do timestamps change when fixing grammar?', a: 'The fixer can correct overlapping or invalid timestamps — for example, when a cue starts before the previous one ends. Otherwise, valid timestamps stay exactly as they were. The output file is ready to upload to YouTube, Vimeo, or any platform immediately after downloading.' },
    ],
  },
  {
    path: '/subtitle-line-break-fixer',
    title: 'Subtitle Line Break Fixer — Fix Long Lines and Wrapping | VideoText',
    description:
      'Fix long lines and line breaks in SRT/VTT for readability and platform limits. Upload, download corrected file. Free.',
    h1: 'Subtitle Line Break Fixer — Fix Long Lines and Wrapping',
    intro:
      'Fix long lines and line breaks in SRT/VTT for readability and platform limits. Upload, download corrected file. Free.',
    breadcrumbLabel: 'Subtitle Line Break Fixer',
    toolKey: 'fix-subtitles',
    relatedSlugs: ['/translate-subtitles', '/burn-subtitles'],
    indexable: true,
    intentKey: 'subtitle-line-break-fixer',
    faq: [
      { q: 'What does the subtitle line break fixer do?', a: 'The subtitle line break fixer splits caption lines that are too long to display properly and removes awkward mid-sentence breaks. It ensures captions meet platform limits — YouTube recommends a maximum of 42 characters per line — so subtitles are comfortable to read and display correctly on all screen sizes.' },
      { q: 'Is the line break fixer free?', a: 'Yes. Upload your SRT or VTT file and download a corrected version at no cost within the monthly free limit. Sign up for free to try. The fixer adjusts line lengths automatically, so you do not need to count characters manually or reformat each caption cue by hand.' },
      { q: 'Can I edit the subtitle file after fixing line breaks?', a: 'Yes. Download the corrected file and open it in any text editor or subtitle editing software. Paid plans unlock in-app editing where you can adjust individual caption lines before downloading, which is useful for fine-tuning translation output or fixing specific cues.' },
    ],
  },
  {
    path: '/hardcoded-captions',
    title: 'Hardcoded Captions — Burn Subtitles into Video | VideoText',
    description:
      'Burn SRT or VTT subtitles into your video. Upload video + subtitle file, get one video with hardcoded captions. Free tier.',
    h1: 'Hardcoded Captions — Burn Subtitles into Video',
    intro:
      'Burn SRT or VTT subtitles into your video. Upload video and subtitle file, get one video with hardcoded captions. Free tier available.',
    breadcrumbLabel: 'Hardcoded Captions',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/compress-video', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'hardcoded-captions',
    faq: [
      { q: 'What are hardcoded captions?', a: 'Hardcoded captions (also called burned-in or open captions) are subtitles permanently embedded into the video frame so they are always visible without the viewer toggling anything. Upload your video and an SRT or VTT file, and we produce a single MP4 with captions baked in — ready for Instagram, TikTok, or silent autoplay environments.' },
      { q: 'Are hardcoded captions free to create?', a: 'Yes. The free tier is available after signing up for free. Upload your video and subtitle file, choose your font size, position, and opacity, and download the output video at no cost within the monthly free limit. Upgrade to a paid plan for more minutes and larger video files.' },
      { q: 'Can I choose font size and position for hardcoded captions?', a: 'Yes. Before processing, set font size (small, medium, or large), vertical position (bottom or middle of screen), and background opacity (transparent to solid black box). These options let you match the caption style to your brand without needing a video editing tool.' },
    ],
  },
  {
    path: '/video-with-subtitles',
    title: 'Video with Subtitles — Add Captions to Video | VideoText',
    description:
      'Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. Sign up for free to try.',
    h1: 'Video with Subtitles — Add Captions to Video',
    intro:
      'Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. Sign up for free to try.',
    breadcrumbLabel: 'Video with Subtitles',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/compress-video', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-with-subtitles',
    faq: [
      { q: 'How do I add subtitles to a video permanently?', a: 'Upload your video (MP4, MOV, AVI, WebM, or MKV) and your SRT or VTT subtitle file. Our tool burns the captions into the video frames so they are always visible, and you download a single MP4 with subtitles permanently embedded. No video editing software or timeline work required.' },
      { q: 'Is adding subtitles to video free?', a: 'Yes. Free tier is available after signing up for free. Upload your video and subtitle file and download the output with captions burned in at no cost within the monthly free limit. Paid plans start at $19/month for 450 minutes if you need to process more videos per month.' },
      { q: 'What video formats are supported for adding subtitles?', a: 'MP4, MOV, AVI, WebM, and MKV are all accepted. The output file is an MP4, which is compatible with YouTube, Vimeo, Instagram, TikTok, and every major platform and device. If your original file is MOV or AVI, the output MP4 is ready for direct upload anywhere.' },
    ],
  },
  {
    path: '/video-compressor',
    title: 'Video Compressor — Reduce File Size Online | VideoText',
    description:
      'Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. Sign up for free to try.',
    h1: 'Video Compressor — Reduce File Size Online',
    intro:
      'Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. Sign up for free to try.',
    breadcrumbLabel: 'Video Compressor',
    toolKey: 'compress-video',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-compressor',
    faq: [
      { q: 'Is the video compressor free?', a: 'Yes. Free tier is available after signing up for free. Upload your video, choose a compression level, and download the smaller file at no cost within the monthly free limit. Paid plans unlock higher file size limits and priority processing so compressed videos are ready faster.' },
      { q: 'How much can I reduce video file size?', a: 'Light compression reduces file size by approximately 30%, medium by about 50%, and heavy by about 70%. You choose the compression level before processing. Heavier compression means a smaller file at a slightly lower bitrate, which is usually acceptable for web sharing and social media.' },
      { q: 'Does compression reduce video quality?', a: 'Compression reduces file size by lowering the bitrate, which can reduce visual quality at higher compression levels. Light compression is nearly lossless for most content. Heavy compression is suitable for social sharing where fast loading matters more than maximum resolution. Output remains reasonable for web use.' },
    ],
  },
  {
    path: '/reduce-video-size',
    title: 'Reduce Video Size — Compress Without Losing Quality | VideoText',
    description:
      'Reduce video file size with adjustable compression. Upload, choose level, download smaller file. Free tier available.',
    h1: 'Reduce Video Size — Compress Without Losing Quality',
    intro:
      'Reduce video file size with adjustable compression. Upload, choose level, download smaller file. Free tier available.',
    breadcrumbLabel: 'Reduce Video Size',
    toolKey: 'compress-video',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'reduce-video-size',
    faq: [
      { q: 'Is reducing video file size free?', a: 'Yes. Free tier is available after signing up for free. Upload your video, select a compression level, and download the reduced file at no cost. Paid plans support larger input files and priority processing, which is useful for high-resolution footage or large batches of content.' },
      { q: 'What compression levels are available to reduce video size?', a: 'Light, medium, and heavy compression levels. Light reduces file size by around 30% with minimal quality loss — good for keeping originals sharp. Medium (about 50% smaller) suits web use. Heavy (about 70% smaller) is ideal for social media sharing where fast upload and load times matter most.' },
      { q: 'What video formats are supported for reducing file size?', a: 'MP4, MOV, AVI, WebM, and MKV are all accepted. The output file is always an MP4, which is universally compatible with YouTube, Vimeo, Instagram, TikTok, and every major platform. If your original is a MOV or AVI, the smaller output MP4 is ready for direct upload.' },
    ],
  },
  {
    path: '/batch-video-processing',
    title: 'Batch Video Processing — Multiple Videos at Once | VideoText',
    description:
      'Process multiple videos in one batch. Upload many videos, get one ZIP of subtitle files. Pro and Agency plans. Same tool as Batch Process.',
    h1: 'Batch Video Processing — Multiple Videos at Once',
    intro:
      'Process multiple videos in one batch. Upload many videos, get one ZIP of subtitle files. Pro and Agency plans.',
    breadcrumbLabel: 'Batch Video Processing',
    toolKey: 'batch-process',
    relatedSlugs: ['/video-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'batch-video-processing',
    faq: [
      { q: 'Is batch video processing free?', a: 'Batch processing is available on Pro and Agency plans. Free and Basic plans use single-file tools. Pro supports up to 20 videos per batch with a 60-minute total duration. Agency supports up to 100 videos with a 300-minute total, which covers full content calendars and client workflows.' },
      { q: 'What do I get from batch video processing?', a: 'Upload multiple videos in one session and receive a single ZIP file containing one SRT subtitle file per video, named to match your original filenames. Videos are processed in parallel workers — not sequentially — so a batch of 10 videos typically completes faster than processing them one by one.' },
      { q: 'Can I choose the language for batch processing?', a: 'Yes. Set the spoken language when starting the batch for best accuracy. Multi-language output — where each video gets subtitle files in two or more languages simultaneously — is available on Agency plans, which is useful for content localization workflows serving international audiences.' },
    ],
  },
  {
    path: '/bulk-subtitle-export',
    title: 'Bulk Subtitle Export — SRT for Many Videos | VideoText',
    description:
      'Export SRT subtitles for many videos in one go. Upload multiple videos, download ZIP. Pro+ plans. Same tool as Batch Process.',
    h1: 'Bulk Subtitle Export — SRT for Many Videos',
    intro:
      'Export SRT subtitles for many videos in one go. Upload multiple videos, download one ZIP. Pro and Agency plans.',
    breadcrumbLabel: 'Bulk Subtitle Export',
    toolKey: 'batch-process',
    relatedSlugs: ['/video-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'bulk-subtitle-export',
    faq: [
      { q: 'What is bulk subtitle export?', a: 'Upload multiple videos and get SRT subtitle files for all of them in one ZIP. Same as Batch Processing.' },
      { q: 'Is this free?', a: 'Bulk/batch is on Pro and Agency plans. Free and Basic use single-file tools.' },
      { q: 'What format are the files?', a: 'SRT. One SRT per video in the ZIP.' },
    ],
  },
  {
    path: '/bulk-transcript-export',
    title: 'Bulk Transcript Export — Text for Many Videos | VideoText',
    description:
      'Get transcripts for many videos in one batch. Upload multiple videos, receive one ZIP. Pro+ plans. Same tool as Batch Process.',
    h1: 'Bulk Transcript Export — Text for Many Videos',
    intro:
      'Get transcripts for many videos in one batch. Upload multiple videos, receive one ZIP. Pro and Agency plans.',
    breadcrumbLabel: 'Bulk Transcript Export',
    toolKey: 'batch-process',
    relatedSlugs: ['/video-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'bulk-transcript-export',
    faq: [
      { q: 'What is bulk transcript export?', a: 'Upload multiple videos and get transcript/subtitle output for all in one ZIP. Same as Batch Processing.' },
      { q: 'Is this free?', a: 'Bulk/batch is on Pro and Agency plans.' },
      { q: 'What do I get in the ZIP?', a: 'One SRT (or equivalent) per video. You can use each file as transcript or captions.' },
    ],
  },
  {
    path: '/subtitles-vs-closed-captions',
    title: 'Subtitles vs Closed Captions — What\'s the Difference? | VideoText',
    description:
      'Subtitles vs closed captions: subtitles transcribe speech for language access; closed captions include all audio cues for deaf/HOH viewers. Generate either free with VideoText — sign up for free.',
    h1: 'Subtitles vs Closed Captions — What\'s the Difference?',
    intro:
      'Subtitles and closed captions look similar but serve different purposes. Subtitles transcribe or translate speech for viewers who can hear but don\'t understand the language. Closed captions include all audio cues — speech, speaker labels, and sound effects — for deaf and hard-of-hearing viewers. VideoText generates both: upload a video and download SRT or VTT caption files in seconds. Free. Sign up for free to try. VideoText supports subtitles vs closed captions and related tools.',
    breadcrumbLabel: 'Subtitles vs Closed Captions',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/closed-caption-generator', '/caption-generator'],
    indexable: true,
    intentKey: 'subtitles-vs-closed-captions',
    faq: [
      { q: 'What is the difference between subtitles and closed captions?', a: 'Subtitles transcribe or translate speech for viewers who can hear but don\'t speak the language. Closed captions add non-speech audio descriptions (e.g., [music], [applause]) for deaf and hard-of-hearing viewers.' },
      { q: 'Which should I use — subtitles or closed captions?', a: 'Use closed captions for accessibility compliance and to reach deaf/HOH viewers. Use subtitles for foreign language audiences or viewers watching without sound.' },
      { q: 'How do I generate subtitles or closed captions?', a: 'Upload your video to VideoText. Our AI generates a timed SRT or VTT file in seconds — upload it to YouTube, Vimeo, or any platform as subtitles or closed captions.' },
      { q: 'Do subtitles and closed captions use the same file format?', a: 'Yes. Both use SRT or VTT files. The difference is in the content and labeling, not the file format. SRT is most widely supported.' },
    ],
  },
  // ── Transcription variants ──────────────────────────────────────────────────
  {
    path: '/transcribe-video',
    title: 'Transcribe Video Online – Free & Accurate | VideoText',
    description:
      'Transcribe video to text online, free. Upload MP4, MOV, WebM, or AVI and get an accurate transcript in seconds. View in English, Hindi, Spanish, Chinese, Russian, or Telugu. Sign up for free to try.',
    h1: 'Transcribe Video Online',
    intro:
      'Transcribe any video to text in seconds. Upload your video file — MP4, MOV, AVI, or WebM — and get an accurate, readable transcript powered by AI. View the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. Use Speakers for who-said-what, Summary for key points, and Chapters to jump by section. Sign up for free to try.',
    breadcrumbLabel: 'Transcribe Video',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-text', '/mp4-to-text', '/meeting-transcript'],
    indexable: true,
    intentKey: 'transcribe-video',
    faq: [
      { q: 'Is it free to transcribe a video online?', a: 'Yes. The free tier includes 3 imports per month (resets on the 1st) after signing up for free — just upload and go. Create a free account to track usage across browser sessions. Paid plans start at $19/month for 450 minutes, which covers most creators and small teams processing regular content.' },
      { q: 'What video formats can I transcribe?', a: 'MP4, MOV, AVI, WebM, and MKV are all supported. Upload your file and our AI extracts the speech track and converts it to plain text. If your file is in another format, export it to MP4 first using any video editor — most cameras and screen recorders produce MP4 or MOV natively.' },
      { q: 'How accurate is online video transcription?', a: 'Accuracy is high for clear audio with minimal background noise. We use AI speech recognition trained on diverse speakers, accents, and subjects. For best results, set the spoken language manually rather than relying on auto-detect, and trim the video to remove long silent sections before uploading.' },
      { q: 'Can I get the video transcript in another language?', a: 'Yes. After transcribing, click Translate and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated view appears alongside the original transcript. You can switch between all six languages instantly without re-uploading, which is useful for creating meeting notes in multiple languages.' },
    ],
  },
  {
    path: '/video-transcription',
    title: 'Video Transcription Online – Accurate & Fast | VideoText',
    description:
      'Free video transcription online. Upload any video and get a text transcript in seconds. Supports MP4, MOV, AVI, WebM. View in 6 languages. Summary, speakers, chapters included. Sign up for free to try.',
    h1: 'Video Transcription Online',
    intro:
      'Get accurate video transcription online — free. Upload any video and receive a plain-text transcript in seconds. After transcribing, use the Speakers branch for speaker labels, Summary for key points, or Chapters to jump by section. Translate to English, Hindi, Telugu, Spanish, Chinese, or Russian in one click. Sign up for free to try.',
    breadcrumbLabel: 'Video Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-to-text', '/meeting-transcript'],
    indexable: true,
    intentKey: 'video-transcription',
    faq: [
      { q: 'What is video transcription?', a: 'Video transcription is the process of converting spoken words in a video into written text using AI speech recognition. You upload a video file, and the transcription engine extracts the audio track, detects speech, and produces a readable plain-text transcript aligned to the timing of the original recording.' },
      { q: 'Is online video transcription free?', a: 'Yes. The free tier gives you 3 imports per month (resets on the 1st) after signing up for free. Create a free account to track usage across sessions. Paid plans start at $19/month for 450 minutes and include multi-language output, speaker diarization, and export in additional formats.' },
      { q: 'How long does video transcription take?', a: 'Most videos are fully transcribed in 30–90 seconds. You see the transcript building in real time as each segment completes — you do not wait for the entire job before reading results. A 60-minute video typically finishes in 5–8 minutes, depending on queue load.' },
      { q: 'Can I download the video transcript?', a: 'Yes. Click Download after transcribing to save the transcript as a plain text file, or click Copy to grab the full text to clipboard. Paid plans unlock additional export formats: JSON, CSV, Markdown, and Notion-style structured output with sections for summary, speakers, chapters, and keywords.' },
    ],
  },
  {
    path: '/free-transcription',
    title: 'Free Transcription Online – Sign Up to Try | VideoText',
    description:
      'Free video transcription. Sign up for free to try. Upload video and get a text transcript in seconds. 3 imports/month free tier (resets on the 1st). AI-powered. MP4, MOV, AVI, WebM supported.',
    h1: 'Free Transcription Online',
    intro:
      'Get a free transcript from any video — sign up for free. Upload an MP4, MOV, AVI, or WebM, and our AI transcribes the speech into text in seconds. The free tier gives you 3 imports per month (resets on the 1st) with no credit card required. Sign up when you need more minutes or multi-language output.',
    breadcrumbLabel: 'Free Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-to-text', '/ai-transcription'],
    indexable: true,
    intentKey: 'free-transcription',
    faq: [
      { q: 'Is transcription really free?', a: 'Yes. You get 3 imports per month (resets on the 1st) after signing up for free. No credit card needed to try.' },
      { q: 'What formats are supported for free?', a: 'MP4, MOV, AVI, WebM, and MKV. All formats are available on the free tier.' },
      { q: 'What is the free tier limit?', a: '3 imports per month (resets on the 1st), single language output. Sign up for a plan to unlock more minutes and multi-language support.' },
      { q: 'Do I need to install anything?', a: 'No. The tool runs in your browser. Upload your file and get a transcript — no installation required.' },
    ],
  },
  {
    path: '/online-transcription',
    title: 'Online Transcription – Free Video to Text | VideoText',
    description:
      'Online transcription for video files. Upload MP4, MOV, or WebM and get a text transcript in seconds. AI-powered, free tier. Sign up for free to try. Works for meetings, lectures, interviews.',
    h1: 'Online Transcription – Free Video to Text',
    intro:
      'Transcribe video to text online — free. Upload any video file and get a transcript in seconds. Works for meetings, lectures, interviews, podcasts, and more. View in 6 languages and use built-in Speakers, Summary, and Chapters for structured output. No software to install, sign up for free.',
    breadcrumbLabel: 'Online Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/free-transcription', '/transcribe-video', '/meeting-transcript'],
    indexable: true,
    intentKey: 'online-transcription',
    faq: [
      { q: 'Does this work in any browser?', a: 'Yes. The tool is browser-based. No download or plugin required. Works in Chrome, Firefox, Safari, and Edge.' },
      { q: 'What is online transcription?', a: 'Online transcription converts speech in a video file into text using AI — directly in your browser, without installing software.' },
      { q: 'Is there a file size limit?', a: 'Large files are supported. Check the upload zone for the current limit. You can also trim the video to focus on the segment you need.' },
      { q: 'Can I translate the transcript online?', a: 'Yes. After transcribing, click Translate to switch between English, Hindi, Telugu, Spanish, Chinese, or Russian — no extra upload needed.' },
    ],
  },
  {
    path: '/ai-transcription',
    title: 'AI Transcription – Fast, Accurate Video to Text | VideoText',
    description:
      'AI-powered video transcription. Upload your video and get a text transcript in seconds. Accurate speech recognition for interviews, meetings, lectures, and more. Free tier. Sign up for free to try.',
    h1: 'AI Transcription – Video to Text',
    intro:
      'VideoText uses AI speech recognition to transcribe your video in seconds. Upload any video, get a plain-text transcript, then use Speakers, Summary, Chapters, or Keywords for structured insight. Translate to 6 languages with a single click. Free tier. Sign up for free to try — no software to install.',
    breadcrumbLabel: 'AI Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/free-transcription', '/video-transcription'],
    indexable: true,
    intentKey: 'ai-transcription',
    faq: [
      { q: 'How does AI transcription work?', a: 'We run your video through AI speech recognition models that detect spoken words and produce text with high accuracy, even for technical content and accents.' },
      { q: 'Is AI transcription more accurate than manual?', a: 'For clear audio, AI transcription is very accurate and far faster than manual. You can review and edit the result afterward.' },
      { q: 'What languages does the AI support?', a: 'The AI supports many spoken languages. Set the spoken language for best results, or use auto-detect.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free.' },
    ],
  },
  {
    path: '/audio-to-text',
    title: 'Audio to Text – Transcribe Audio or Video Online | VideoText',
    description:
      'Convert audio to text online. Upload a video file (MP4, MOV, AVI, WebM) to transcribe the audio track to text. Free, AI-powered. Sign up for free to try. Works for interviews, meetings, podcasts.',
    h1: 'Audio to Text – Transcribe Audio Online',
    intro:
      'Turn audio into text online — free. Upload a video file containing your audio (MP4, MOV, AVI, or WebM) and get an accurate text transcript in seconds. Our AI extracts the speech and delivers a clean, readable transcript. View in 6 languages and download or copy the result. No signup for the free tier.',
    breadcrumbLabel: 'Audio to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/free-transcription', '/podcast-transcript'],
    indexable: true,
    intentKey: 'audio-to-text',
    faq: [
      { q: 'Can I transcribe audio files to text?', a: 'Yes. Upload your audio packaged as a video file — MP4, MOV, AVI, or WebM. Most recordings, podcasts, and interviews are shared in video containers that hold an audio track. If you have an audio-only file (MP3, WAV), export it to MP4 using any free converter before uploading.' },
      { q: 'What audio formats are supported for transcription?', a: 'We accept audio packaged in video containers: MP4, MOV, AVI, WebM, and MKV. These formats cover the vast majority of podcast recordings, interview files, Zoom exports, and screen recordings. The tool extracts the audio track and transcribes it — video resolution and bitrate do not affect speed or accuracy.' },
      { q: 'Is audio-to-text transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free. Just upload your file and get a transcript immediately. Paid plans start at $19/month for 450 minutes and add multi-language output, speaker labels, summary, and export formats including JSON, CSV, and Markdown.' },
      { q: 'Can I translate transcribed audio to another language?', a: 'Yes. After transcribing, click Translate and choose from English, Hindi, Telugu, Spanish, Chinese, or Russian. The translated transcript appears alongside the original. This is useful for meetings, interviews, or podcast content that needs to reach audiences in multiple languages without re-recording.' },
    ],
  },
  {
    path: '/podcast-transcript',
    title: 'Podcast Transcript – Transcribe Episodes Online | VideoText',
    description:
      'Get a transcript for any podcast episode. Upload your episode as a video file and get accurate text in seconds. Free, AI-powered. Speaker labels, key takeaways. Sign up for free to try.',
    h1: 'Podcast Transcript – Transcribe Episodes Online',
    intro:
      'Create a podcast transcript in seconds. Upload your episode as a video file (MP4, MOV, AVI, WebM) and get an accurate text transcript powered by AI. Use the Speakers branch to label who said what, Summary for key takeaways, and Translate to share across 6 languages. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Podcast Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/audio-to-text', '/transcribe-video', '/interview-transcription'],
    indexable: true,
    intentKey: 'podcast-transcript',
    faq: [
      { q: 'Can I transcribe a podcast episode to text?', a: 'Yes. Export your podcast episode as an MP4, MOV, or WebM video file, upload it here, and get a full text transcript in seconds. Most podcast recording tools (Riverside, Squadcast, Zoom, Descript) export to MP4 or MOV. The AI extracts the speech and produces a clean, readable transcript.' },
      { q: 'Do I get speaker labels in a podcast transcript?', a: 'Yes. After transcribing, open the Speakers branch to see the transcript organized by speaker (Speaker 1, Speaker 2, etc.). For a two-host podcast, this cleanly separates each host\'s contributions. For interview formats, it labels the interviewer and guest without any manual tagging.' },
      { q: 'Is podcast transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free. Most podcast episodes fit within this limit. Paid plans start at $19/month for 450 minutes, which is suitable for weekly podcasters who want to transcribe every episode and add show notes automatically.' },
      { q: 'Can I use the podcast transcript for SEO?', a: 'Absolutely. Add the transcript to your episode show notes or embed it on your website. Search engines index text, not audio, so a full transcript dramatically improves how discoverable each episode is for topic-specific searches. Include the transcript text in the page body — not a PDF — for best indexing results.' },
    ],
  },
  {
    path: '/zoom-recording-transcript',
    title: 'Zoom Recording Transcript – Convert Calls to Text | VideoText',
    description:
      'Transcribe Zoom recordings to text. Upload your Zoom MP4 and get a transcript with speaker labels in seconds. Free. Sign up for free to try. Use Summary for action items and decisions.',
    h1: 'Zoom Recording Transcript — Convert Calls to Text',
    intro:
      'Transcribe any Zoom recording to text in seconds. Download your meeting as MP4 from Zoom, upload it here, and get a full transcript. Use the Speakers branch for who-said-what, Summary for action items and decisions, and Chapters to jump by section. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Zoom Recording Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/speaker-diarization', '/video-summary-generator'],
    indexable: true,
    intentKey: 'zoom-recording-transcript',
    faq: [
      { q: 'How do I transcribe a Zoom recording to text?', a: 'Download your Zoom meeting as an MP4 file — from Zoom\'s cloud recording page or the local Zoom recordings folder on your computer. Upload the MP4 here and our AI produces a full text transcript. Most 60-minute Zoom calls transcribe in 5–8 minutes. No Zoom account connection or integration is required.' },
      { q: 'Does it label speakers from a Zoom call?', a: 'Yes. After transcribing, open the Speakers branch to see the transcript organized by speaker turn (Speaker 1, Speaker 2, etc.). This works well for Zoom calls with two to six participants. For the clearest speaker separation, use a Zoom recording where each participant has a separate audio track if available.' },
      { q: 'Can I get a summary of the Zoom meeting transcript?', a: 'Yes. The Summary branch automatically extracts decisions, action items, and key points from the transcript. This is useful for generating meeting notes immediately after a call — copy the summary and send it to attendees without reading through the full transcript manually.' },
      { q: 'Is Zoom recording transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free. A typical 30–60 minute Zoom call fits within this limit. Paid plans start at $19/month for 450 minutes, which is appropriate for teams running multiple meetings per week that all need transcripts.' },
    ],
  },
  {
    path: '/interview-transcription',
    title: 'Interview Transcription – Convert Interviews to Text | VideoText',
    description:
      'Transcribe interview recordings to text online. Upload video of your interview and get an accurate transcript with speaker labels. Free tier. Sign up for free to try.',
    h1: 'Interview Transcription – Convert Interviews to Text',
    intro:
      'Transcribe interviews to text online — free and accurate. Upload your interview video (MP4, MOV, AVI, or WebM) and get a clean transcript in seconds. Use the Speakers branch to separate interviewer and interviewee, and Translate to share in 6 languages. Perfect for journalists, researchers, and HR teams. No signup for the free tier.',
    breadcrumbLabel: 'Interview Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/speaker-diarization', '/podcast-transcript', '/transcribe-video'],
    indexable: true,
    intentKey: 'interview-transcription',
    faq: [
      { q: 'Can I transcribe an interview with two speakers?', a: 'Yes. After transcribing, open the Speakers branch. Speech is grouped by speaker (Speaker 1, Speaker 2, etc.) so you can see who said what.' },
      { q: 'What video formats are supported for interviews?', a: 'MP4, MOV, AVI, WebM, and MKV. Most camera and screen-recording formats used in interviews are covered.' },
      { q: 'Is interview transcription free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st) after signing up for free.' },
      { q: 'Can I export the interview transcript?', a: 'Yes. Download as plain text, or use the Exports branch for JSON, CSV, Markdown, or Notion-style formats (paid plans for full export).' },
    ],
  },
  {
    path: '/lecture-transcription',
    title: 'Lecture Transcription – Convert Lectures to Text | VideoText',
    description:
      'Transcribe lecture recordings to text online. Upload a lecture video and get an accurate transcript with chapters and keywords. Free, AI-powered. Sign up for free to try.',
    h1: 'Lecture Transcription – Convert Lectures to Text',
    intro:
      'Transcribe lecture recordings to text — fast and accurate. Upload your lecture video (MP4, MOV, AVI, or WebM) and get a full transcript powered by AI. Use Keywords to index topics, Chapters to navigate by section, and Translate to share in 6 languages. Free tier. Sign up for free to try — perfect for students, educators, and researchers.',
    breadcrumbLabel: 'Lecture Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/keyword-indexed-transcript', '/video-chapters-generator', '/transcribe-video'],
    indexable: true,
    intentKey: 'lecture-transcription',
    faq: [
      { q: 'Can I transcribe a university lecture?', a: 'Yes. Upload the lecture recording (MP4, MOV, WebM) and get a text transcript. Works well for talks, presentations, and classroom recordings.' },
      { q: 'Does it extract lecture topics automatically?', a: 'Yes. Open the Keywords branch after transcribing to see repeated terms indexed by section. The Chapters branch shows the lecture broken into navigable sections.' },
      { q: 'Is this free for students?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'Can I study from the transcript?', a: 'Absolutely. Copy or download the transcript for notes and study guides. The Chapters and Keywords branches help you find specific content quickly.' },
    ],
  },
  // ── Format-specific transcription ───────────────────────────────────────────
  {
    path: '/mov-to-text',
    title: 'MOV to Text – Transcribe MOV Video Online | VideoText',
    description:
      'Convert MOV video to text online. Upload your MOV file and get an accurate transcript in seconds. Free, AI-powered. Sign up for free to try. View in English, Hindi, Spanish, and more.',
    h1: 'MOV to Text – Transcribe MOV Videos Online',
    intro:
      'Convert MOV video to text online — free. Upload your MOV file from iPhone, Mac, or any camera and get an accurate transcript in seconds. View the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. No signup for the free tier.',
    breadcrumbLabel: 'MOV to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-text', '/mp4-to-text', '/transcribe-video'],
    indexable: true,
    intentKey: 'mov-to-text',
    faq: [
      { q: 'Can I convert MOV to text?', a: 'Yes. Upload your MOV file and we transcribe the speech to text. MOV is the default format for iPhone and Mac recordings.' },
      { q: 'Is there a file size limit for MOV files?', a: 'Large MOV files are supported; check the upload zone for the current limit. Trim the video to a segment if needed.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'Can I get subtitles from my MOV file?', a: 'Yes. Use the Video to Subtitles tool (also supports MOV) to generate SRT or VTT subtitle files from your MOV video.' },
    ],
  },
  {
    path: '/webm-to-text',
    title: 'WebM to Text – Transcribe WebM Video Online | VideoText',
    description:
      'Convert WebM video to text online. Upload your WebM file and get an accurate transcript in seconds. Free, AI-powered. Sign up for free to try.',
    h1: 'WebM to Text – Transcribe WebM Videos Online',
    intro:
      'Convert WebM video to text online — free. Upload your WebM file (from Chrome, screen recorders, or web exports) and get an accurate text transcript in seconds. Translate to 6 languages. No signup for the free tier.',
    breadcrumbLabel: 'WebM to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-text', '/mp4-to-text', '/transcribe-video'],
    indexable: true,
    intentKey: 'webm-to-text',
    faq: [
      { q: 'Can I transcribe a WebM file?', a: 'Yes. WebM is a supported format. Upload your file and get a text transcript in seconds.' },
      { q: 'Where do WebM files come from?', a: 'WebM is common in screen recordings from Chrome, video editors, and web-based recording tools.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
      { q: 'Can I convert WebM to SRT subtitles?', a: 'Yes. Use the Video to Subtitles tool, upload your WebM file, and choose SRT or VTT format for a timed caption file.' },
    ],
  },
  // ── Subtitle/Caption variants ────────────────────────────────────────────────
  {
    path: '/automatic-subtitles',
    title: 'Automatic Subtitles – AI-Generated Captions Online | VideoText',
    description:
      'Generate automatic subtitles for any video. Upload and get AI-generated SRT or VTT captions in seconds. Free tier. Sign up for free to try. Works for YouTube, web, and social media.',
    h1: 'Automatic Subtitles – AI-Generated Captions',
    intro:
      'Generate automatic subtitles for any video in seconds. Upload your video and our AI creates accurate, timed SRT or VTT captions ready for YouTube, web players, or social media. Supports multiple languages. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Automatic Subtitles',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/caption-generator', '/video-to-srt'],
    indexable: true,
    intentKey: 'automatic-subtitles',
    faq: [
      { q: 'How accurate are automatic subtitles?', a: 'Automatic subtitles generated by our AI are highly accurate for clear audio. We use state-of-the-art speech recognition trained on diverse speakers, accents, and topics. For best accuracy, set the spoken language manually rather than relying on auto-detect, and ensure the audio has minimal background noise or music.' },
      { q: 'Should I choose SRT or VTT for automatic subtitles?', a: 'Choose SRT for YouTube, Vimeo, LinkedIn, Facebook Video, and most video platforms — SRT is the most widely supported subtitle format. Choose VTT if you are embedding video on a website using an HTML5 player like Video.js or Plyr. Both formats are generated from the same upload at no extra cost.' },
      { q: 'Are automatic subtitles free to generate?', a: 'Yes. The free tier is available after signing up for free — upload a video and download SRT or VTT subtitles at no cost within the monthly free limit. Paid plans unlock multi-language subtitle output in a single batch and higher minute limits for creators with large video libraries.' },
      { q: 'Can I auto-generate subtitles for YouTube?', a: 'Yes. Generate SRT subtitles from your video here, then go to YouTube Studio → your video → Subtitles → Add → Upload File and select the SRT. YouTube maps the timestamps automatically, and your subtitles appear as a professional CC track — higher accuracy than YouTube\'s own auto-captions for most content.' },
    ],
  },
  {
    path: '/caption-generator',
    title: 'Caption Generator – Auto-Generate Video Captions | VideoText',
    description:
      'Generate captions for any video online. AI-powered caption generator creates SRT or VTT files in seconds. Free tier. Sign up for free to try. Perfect for YouTube, social media, and accessibility.',
    h1: 'Caption Generator – Auto-Generate Video Captions',
    intro:
      'Generate captions for your video automatically. Upload any video file, and our AI creates accurate, timed SRT or VTT captions in seconds. Perfect for YouTube, TikTok, Instagram, and accessibility compliance. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/automatic-subtitles', '/subtitle-generator', '/closed-caption-generator'],
    indexable: true,
    intentKey: 'caption-generator',
    faq: [
      { q: 'What is a caption generator and how does it work?', a: 'A caption generator uses AI speech recognition to transcribe speech in a video and align each word to its timestamp, producing timed caption files in SRT or VTT format. You upload a video file, wait 30–90 seconds, and download captions ready to upload to YouTube, Vimeo, or any platform.' },
      { q: 'Is the caption generator free?', a: 'Yes. Sign up for free to try. You get 3 imports per month (resets on the 1st). Paid plans start at $19/month for 450 minutes, which covers most creators and social media managers processing weekly content.' },
      { q: 'What caption formats does the generator output?', a: 'SRT and VTT, both generated from the same upload at no extra cost. SRT is the best choice for YouTube, Vimeo, LinkedIn, Facebook Video, and most video platforms. VTT is the standard for HTML5 web video players. You choose the format at the point of download — no re-processing needed.' },
      { q: 'Can I burn the generated captions into the video?', a: 'Yes. After generating captions and downloading the SRT or VTT file, upload both the video and the caption file to our Burn Subtitles tool. It hardcodes the captions permanently into the video frames — no software installation required. The output is an MP4 ready for Instagram, TikTok, or any platform.' },
    ],
  },
  {
    path: '/closed-caption-generator',
    title: 'Closed Caption Generator – Create CC for Video | VideoText',
    description:
      'Generate closed captions for any video. Upload and get timed SRT or VTT files in seconds. AI-powered, free tier. Sign up for free to try. Accessible captions for YouTube and web.',
    h1: 'Closed Caption Generator – Accessible Captions Online',
    intro:
      'Create closed captions for any video — free and fast. Upload your video and our AI generates accurate, timed SRT or VTT caption files in seconds. Download and add them to YouTube, Vimeo, or any web player to make your content accessible to deaf and hard-of-hearing viewers. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Closed Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/automatic-subtitles', '/subtitles-vs-closed-captions'],
    indexable: true,
    intentKey: 'closed-caption-generator',
    faq: [
      { q: 'What are closed captions and how are they different from subtitles?', a: 'Closed captions are text overlays that viewers can toggle on or off. Unlike subtitles (which only transcribe speech), closed captions include non-speech audio cues like [music], [applause], and speaker identification, making video content accessible to deaf and hard-of-hearing viewers. The "closed" in closed captions means they can be turned off.' },
      { q: 'How do I create closed captions for my video?', a: 'Upload your video to the caption generator here and download an SRT or VTT file in seconds. Then go to your video platform — YouTube Studio, Vimeo, Zoom, or your web player — and upload the caption file. The platform maps the timestamps automatically, adding a CC track viewers can toggle on or off.' },
      { q: 'Is the closed caption generator free?', a: 'Yes. Free tier is available after signing up for free. Upload a video and download an SRT or VTT closed caption file at no cost within the monthly free limit. Paid plans unlock higher minute limits and multi-language closed caption output for content that needs to be accessible in multiple languages.' },
      { q: 'Which platforms accept closed caption files?', a: 'YouTube, Vimeo, Zoom, Facebook Video, LinkedIn, Twitter/X, and most web players with HTML5 video support SRT or VTT closed caption files. For web players like Video.js and Plyr, use VTT. For all other platforms including YouTube, SRT is the recommended and most widely compatible format.' },
    ],
  },
  {
    path: '/free-subtitle-generator',
    title: 'Free Subtitle Generator – Sign Up to Try | VideoText',
    description:
      'Generate subtitles free online. Upload video and get accurate SRT or VTT subtitles in seconds. Sign up for free to try. AI-powered, fast, and supports 50+ languages.',
    h1: 'Free Subtitle Generator – Sign Up to Try',
    intro:
      'Generate subtitles for free — sign up for free. Upload any video and get accurate, timed SRT or VTT subtitle files in seconds. Our AI supports 50+ languages and produces captions ready for YouTube, TikTok, Instagram, and any web player. No credit card. Sign up for free to try.',
    breadcrumbLabel: 'Free Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/automatic-subtitles', '/caption-generator'],
    indexable: true,
    intentKey: 'free-subtitle-generator',
    faq: [
      { q: 'Is the subtitle generator really free?', a: 'Yes. You get 3 imports per month (resets on the 1st) after signing up for free. No credit card needed to try.' },
      { q: 'Do I need to sign up?', a: 'Yes. Sign up for free to try. Upgrade when you need more imports or additional features.' },
      { q: 'What subtitle formats can I download for free?', a: 'SRT and VTT on the free tier. Both are supported by YouTube, Vimeo, and most video platforms.' },
      { q: 'How many languages does the free tier support?', a: 'Single language per job on the free tier. Paid plans unlock multi-language subtitle output in one batch.' },
    ],
  },
  {
    path: '/video-to-srt',
    title: 'Video to SRT – Generate SRT Subtitle Files Online | VideoText',
    description:
      'Convert video to SRT subtitle file online. Upload any video and download a timed SRT file in seconds. Free, AI-powered. Sign up for free to try. Perfect for YouTube and video platforms.',
    h1: 'Video to SRT – Generate SRT Subtitle Files',
    intro:
      'Generate an SRT subtitle file from any video in seconds. Upload your video, our AI transcribes the speech and creates a timed SRT file ready to upload to YouTube or any video platform. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Video to SRT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/mp4-to-srt', '/srt-generator', '/automatic-subtitles'],
    indexable: true,
    intentKey: 'video-to-srt',
    faq: [
      { q: 'What is an SRT file?', a: 'An SRT (SubRip Text) file is a plain-text subtitle format that contains numbered caption blocks, each with a start time, end time, and the spoken text. It is the most widely supported subtitle format, accepted by YouTube, Vimeo, VLC, LinkedIn, Facebook Video, and virtually every video platform and editing tool.' },
      { q: 'How do I create an SRT file from a video?', a: 'Upload your video to this tool, select SRT as the output format, and click Generate. Our AI transcribes the speech and creates a timed SRT file with accurate timestamps in seconds. Download the file and upload it directly to YouTube Studio, Vimeo, or any platform that accepts SRT subtitles.' },
      { q: 'Is creating a video-to-SRT file free?', a: 'Yes. Free tier is available after signing up for free. Upload your video and download an SRT subtitle file at no cost within the monthly free limit. Paid plans unlock multi-language SRT output in a single batch, higher minute limits, and priority processing for faster turnaround on longer videos.' },
      { q: 'Can I get VTT instead of SRT from my video?', a: 'Yes. Choose SRT or VTT format before processing — both are generated from the same upload at no extra cost. SRT is recommended for YouTube and most platforms. VTT is the standard for HTML5 web players. Switch between formats at the point of download without re-uploading your video.' },
    ],
  },
  {
    path: '/srt-generator',
    title: 'SRT Generator – Create SRT Subtitle Files from Video | VideoText',
    description:
      'Generate SRT subtitle files from any video. Upload your video and get a timed SRT file in seconds. Free, AI-powered, supports 50+ languages. Sign up for free to try.',
    h1: 'SRT Generator – Create SRT Files from Video',
    intro:
      'Generate SRT subtitle files from any video with one click. Upload your video, our AI transcribes the speech with accurate timestamps, and you download an SRT file ready for YouTube, Vimeo, or any platform. Free tier. Sign up for free to try, 50+ languages supported.',
    breadcrumbLabel: 'SRT Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-srt', '/mp4-to-srt', '/subtitle-generator'],
    indexable: true,
    intentKey: 'srt-generator',
    faq: [
      { q: 'What is an SRT generator?', a: 'An SRT generator transcribes speech in a video and creates a properly timed SRT subtitle file automatically. You upload video and download captions.' },
      { q: 'Does it support multiple languages?', a: 'Yes. Set the spoken language before processing for best accuracy. Paid plans output multiple languages in one batch.' },
      { q: 'Is the SRT generator free?', a: 'Yes. Free tier is available after signing up for free.' },
      { q: 'How is SRT different from a plain text transcript?', a: 'SRT files have timestamps that sync text to the video. A transcript is plain text without timing. Use SRT for video platforms; use the transcript for notes or search.' },
    ],
  },
  // ── Video translation variants ───────────────────────────────────────────────
  {
    path: '/translate-video',
    title: 'Translate Video – Video Translation & Subtitles Online | VideoText',
    description:
      'Translate video to another language online. Transcribe and view translated transcript in Hindi, Spanish, Chinese, Russian, and more. Generate translated SRT/VTT subtitles. Free tier.',
    h1: 'Translate Video Online',
    intro:
      'Translate your video to another language — free online. Upload a video, get a transcript, and translate it to English, Hindi, Telugu, Spanish, Chinese, or Russian with one click. Or generate SRT/VTT subtitles and translate the subtitle file to 50+ languages. No signup for the free tier.',
    breadcrumbLabel: 'Translate Video',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/video-translation', '/subtitle-translator', '/multilingual-subtitles'],
    indexable: true,
    intentKey: 'translate-video',
    faq: [
      { q: 'How do I translate a video to another language?', a: 'Upload your video and transcribe it using the Video to Transcript tool. Click Translate to view the full transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. To translate subtitle files (SRT/VTT), generate subtitles first, then use Translate Subtitles to convert the caption file to any of 50+ languages.' },
      { q: 'Which languages can I translate my video to?', a: 'Transcript translation supports 6 languages: English, Hindi, Telugu, Spanish, Chinese, and Russian — switch between them instantly after transcribing. Subtitle file translation supports 50+ languages including Arabic, French, German, Portuguese, Japanese, Korean, Turkish, and more. Each translation preserves the original timestamps.' },
      { q: 'Is video translation free?', a: 'Yes. Free tier is available after signing up for free for both transcript translation and subtitle file translation. Paid plans unlock multi-language subtitle output in a single batch — generate translated SRT files in three or more languages from one upload — and higher minute limits for larger video libraries.' },
      { q: 'Does video translation automatically burn subtitles into the video?', a: 'No — translation produces a translated SRT or VTT subtitle file, which you can upload to YouTube or any platform as a caption track. To burn translated captions permanently into the video (for Instagram, TikTok, or silent autoplay), use our Burn Subtitles tool with the translated SRT file.' },
    ],
  },
  {
    path: '/video-translation',
    title: 'Video Translation – Translate Video Content Online | VideoText',
    description:
      'Translate video content to 50+ languages. Transcribe video and view translated transcript in Hindi, Spanish, Chinese, Russian, or English. Export translated SRT/VTT subtitles. Free tier.',
    h1: 'Video Translation Online',
    intro:
      'Translate video content to any language online. Upload your video, get an accurate transcript, then translate it to English, Hindi, Telugu, Spanish, Chinese, or Russian. For subtitle translation, generate SRT or VTT and translate to 50+ languages. Export and burn into the video for multilingual content. Free tier. Sign up for free to try.',
    breadcrumbLabel: 'Video Translation',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/translate-video', '/subtitle-translator', '/multilingual-subtitles'],
    indexable: true,
    intentKey: 'video-translation',
    faq: [
      { q: 'What is video translation?', a: 'Video translation converts your video content into another language as text (transcript) or timed captions (SRT/VTT) that can be burned into the video or uploaded to a platform.' },
      { q: 'What languages are supported for video translation?', a: 'Transcript view: 6 languages (English, Hindi, Telugu, Spanish, Chinese, Russian). Subtitle file translation: 50+ languages via Translate Subtitles.' },
      { q: 'Is video translation free?', a: 'Yes. Free tier is available after signing up for free.' },
      { q: 'How do I get translated captions on my video?', a: 'Generate subtitles, translate the SRT/VTT file, then use Burn Subtitles to hardcode the translated captions into the video.' },
    ],
  },
  // ── Phase 2: 30 high-intent SEO pages ──────────────────────────────────────────
  {
    path: '/youtube-transcript-generator',
    title: 'YouTube Transcript Generator – Convert YouTube Video to Text | VideoText',
    description: 'Generate transcripts from YouTube videos instantly. Paste a URL and export SRT, TXT, or DOCX with VideoText.',
    h1: 'YouTube Transcript Generator',
    intro: 'Convert any YouTube video to a transcript with one click. Paste a youtube.com or youtu.be link — no download, no upload. AI transcription in seconds. Export as TXT, SRT, or translate to 50+ languages. Free tier.',
    breadcrumbLabel: 'YouTube Transcript Generator',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles', '/transcribe-youtube-video'],
    indexable: true,
    intentKey: 'youtube-transcript-generator',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I generate a transcript from a YouTube video?', a: 'Paste the YouTube URL into our tool and click Transcribe. We stream the audio and convert it to text with AI. Export as TXT, SRT, or DOCX.' },
      { q: 'Is the YouTube transcript generator free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). Sign up for free to try.' },
    ],
  },
  {
    path: '/video-to-text-converter',
    title: 'Video to Text Converter – Free Online | VideoText',
    description: 'Convert video to text online. Upload MP4, MOV, WebM or paste a YouTube URL. Get accurate transcripts in seconds. Export SRT, TXT, DOCX.',
    h1: 'Video to Text Converter',
    intro: 'Convert any video to text online. Upload your file or paste a YouTube URL. Our AI transcribes speech to text in seconds. Download as TXT, SRT, or view in 6 languages. Free tier.',
    breadcrumbLabel: 'Video to Text Converter',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-text', '/mp4-to-text', '/youtube-to-transcript'],
    indexable: true,
    intentKey: 'video-to-text-converter',
    faq: [
      { q: 'What video formats can I convert to text?', a: 'We support MP4, MOV, AVI, WebM, and MKV. You can also paste a YouTube URL for instant transcription without downloading.' },
      { q: 'How accurate is the video to text conversion?', a: 'Our AI delivers high accuracy for clear speech. Set the spoken language for best results with non-English content.' },
    ],
  },
  {
    path: '/audio-to-text-converter',
    title: 'Audio to Text Converter – Transcribe Online | VideoText',
    description: 'Convert audio to text online. Upload video files (MP4, MOV) containing audio. Get accurate transcripts. Export SRT, TXT, DOCX. Free tier.',
    h1: 'Audio to Text Converter',
    intro: 'Convert audio to text online. Upload a video file (MP4, MOV, AVI, WebM) and our AI transcribes the audio track to text. Export SRT, TXT, or translate to 6 languages. Free tier.',
    breadcrumbLabel: 'Audio to Text Converter',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/audio-to-text', '/podcast-transcript', '/meeting-transcript'],
    indexable: true,
    intentKey: 'audio-to-text-converter',
    faq: [
      { q: 'What audio formats are supported?', a: 'We accept audio in video containers: MP4, MOV, AVI, WebM, MKV. Export MP3/WAV to MP4 first if needed.' },
      { q: 'Is the audio to text converter free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free to try.' },
    ],
  },
  {
    path: '/transcribe-video-online',
    title: 'Transcribe Video Online – Free AI Transcription | VideoText',
    description: 'Transcribe video online free. Upload any video or paste YouTube URL. Get accurate transcripts. Export SRT, TXT, DOCX. AI-powered. No download.',
    h1: 'Transcribe Video Online',
    intro: 'Transcribe any video online in seconds. Upload MP4, MOV, WebM or paste a YouTube link. Our AI converts speech to text. Export SRT, TXT, or translate to 6 languages. Free tier.',
    breadcrumbLabel: 'Transcribe Video Online',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-to-transcript', '/youtube-to-transcript'],
    indexable: true,
    intentKey: 'transcribe-video-online',
    faq: [
      { q: 'How do I transcribe a video online?', a: 'Upload your video file or paste a YouTube URL. Click Transcribe and get a full text transcript in seconds.' },
      { q: 'Is online video transcription free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free.' },
    ],
  },
  {
    path: '/podcast-transcription',
    title: 'Podcast Transcription – Convert Episodes to Text | VideoText',
    description: 'Transcribe podcast episodes to text. Upload MP4, MOV, WebM. Get accurate transcripts with speaker labels. Export SRT, TXT, DOCX. Free tier.',
    h1: 'Podcast Transcription',
    intro: 'Transcribe podcast episodes to text in seconds. Upload your episode as MP4, MOV, or WebM. Get speaker labels, key takeaways, and translate to 6 languages. Free tier.',
    breadcrumbLabel: 'Podcast Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/audio-to-text', '/interview-transcription'],
    indexable: true,
    intentKey: 'podcast-transcription',
    faq: [
      { q: 'How do I transcribe a podcast?', a: 'Export your episode as MP4 or MOV, upload here, and get a full transcript with speaker labels in seconds.' },
      { q: 'Is podcast transcription free?', a: 'Yes. Free tier includes 3 imports per month. Paid plans for weekly podcasters.' },
    ],
  },
  {
    path: '/webinar-transcription',
    title: 'Webinar Transcription – Convert Webinars to Text | VideoText',
    description: 'Transcribe webinars to text. Upload recording (MP4, MOV). Get accurate transcripts with chapters. Export SRT, TXT, DOCX. Free tier.',
    h1: 'Webinar Transcription',
    intro: 'Transcribe webinar recordings to text. Upload your MP4, MOV, or WebM file. Get a full transcript with chapters and keywords. Export SRT, TXT, or translate. Free tier.',
    breadcrumbLabel: 'Webinar Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/lecture-transcription', '/zoom-recording-transcript'],
    indexable: true,
    intentKey: 'webinar-transcription',
    faq: [
      { q: 'How do I transcribe a webinar?', a: 'Download your webinar as MP4 or MOV, upload here, and get a full transcript in seconds. Works with Zoom, Webex, and other platforms.' },
      { q: 'Can I get speaker labels for webinars?', a: 'Yes. The Speakers branch labels who said what. Use Chapters for section navigation.' },
    ],
  },
  {
    path: '/meeting-transcription',
    title: 'Meeting Transcription – Convert Meetings to Text | VideoText',
    description: 'Transcribe meetings to text. Upload Zoom, Teams, or any recording. Get transcripts with speaker labels. Export SRT, TXT, DOCX. Free tier.',
    h1: 'Meeting Transcription',
    intro: 'Transcribe meeting recordings to text. Upload MP4, MOV, or WebM. Get speaker labels, action items, and key points. Export SRT, TXT. Free tier.',
    breadcrumbLabel: 'Meeting Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/zoom-recording-transcript', '/speaker-diarization'],
    indexable: true,
    intentKey: 'meeting-transcription',
    faq: [
      { q: 'How do I transcribe a meeting recording?', a: 'Upload your meeting file (MP4, MOV, WebM) and get a full transcript with speaker labels in seconds.' },
      { q: 'Does it work with Zoom and Teams?', a: 'Yes. Download the recording as MP4 and upload. No integration required.' },
    ],
  },
  {
    path: '/video-caption-generator',
    title: 'Video Caption Generator – Add Captions to Video | VideoText',
    description: 'Generate captions for video. Upload any video, get SRT/VTT with accurate timestamps. Burn into video or export. Free tier.',
    h1: 'Video Caption Generator',
    intro: 'Generate captions for any video. Upload your file and get SRT or VTT with accurate timestamps. Download for YouTube, Vimeo, or burn into the video. Free tier.',
    breadcrumbLabel: 'Video Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/subtitle-generator', '/burn-subtitles'],
    indexable: true,
    intentKey: 'video-caption-generator',
    faq: [
      { q: 'How do I add captions to my video?', a: 'Upload your video, choose SRT or VTT, and click Generate. Download the caption file or burn it into the video with our Burn tool.' },
      { q: 'Is the caption generator free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/add-subtitles-to-video',
    title: 'Add Subtitles to Video – Auto-Generate SRT | VideoText',
    description: 'Add subtitles to video automatically. Upload video, get SRT/VTT. Burn captions into video or export. AI-powered. Free tier.',
    h1: 'Add Subtitles to Video',
    intro: 'Add subtitles to any video in seconds. Upload your file and our AI generates timed SRT or VTT captions. Download for upload to YouTube, or burn directly into the video. Free tier.',
    breadcrumbLabel: 'Add Subtitles to Video',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/subtitle-generator', '/burn-subtitles'],
    indexable: true,
    intentKey: 'add-subtitles-to-video',
    faq: [
      { q: 'How do I add subtitles to a video?', a: 'Upload your video and generate SRT or VTT. Use Burn Subtitles to hardcode captions into the video, or upload the SRT to YouTube.' },
      { q: 'Can I add subtitles to a video for free?', a: 'Yes. Free tier includes 3 imports per month. Sign up for free.' },
    ],
  },
  {
    path: '/auto-subtitle-generator',
    title: 'Auto Subtitle Generator – Generate Subtitles Automatically | VideoText',
    description: 'Auto-generate subtitles for video. Upload, get SRT/VTT with accurate timestamps. No manual typing. AI-powered. Free tier.',
    h1: 'Auto Subtitle Generator',
    intro: 'Generate subtitles automatically from any video. Upload your file and get SRT or VTT with accurate timestamps. No manual typing. Free tier.',
    breadcrumbLabel: 'Auto Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/automatic-subtitles', '/subtitle-generator', '/video-to-srt'],
    indexable: true,
    intentKey: 'auto-subtitle-generator',
    faq: [
      { q: 'How does automatic subtitle generation work?', a: 'Our AI transcribes speech and aligns each word to timestamps. Upload your video and get SRT or VTT in seconds.' },
      { q: 'Is the auto subtitle generator free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/burn-subtitles-into-video',
    title: 'Burn Subtitles into Video – Hardcode Captions | VideoText',
    description: 'Burn subtitles into video. Upload video + SRT/VTT. Get video with captions baked in. For Instagram, TikTok, social. Free tier.',
    h1: 'Burn Subtitles into Video',
    intro: 'Burn subtitles directly into your video. Upload your video and SRT or VTT file. Get a new video with captions hardcoded. Perfect for Instagram, TikTok, and social. Free tier.',
    breadcrumbLabel: 'Burn Subtitles into Video',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/burn-subtitles', '/hardcoded-captions', '/video-with-subtitles'],
    indexable: true,
    intentKey: 'burn-subtitles-into-video',
    faq: [
      { q: 'How do I burn subtitles into a video?', a: 'Upload your video and SRT or VTT file. Our tool renders the captions onto the video. Download the new file.' },
      { q: 'Why burn subtitles into video?', a: 'Burned captions play on any platform without support for caption tracks — Instagram, TikTok, Facebook, etc.' },
    ],
  },
  {
    path: '/youtube-subtitle-generator',
    title: 'YouTube Subtitle Generator – Create Captions from Videos | VideoText',
    description: 'Generate YouTube subtitles. Paste URL or upload video. Get SRT/VTT for YouTube. Accurate timestamps. Free tier.',
    h1: 'YouTube Subtitle Generator',
    intro: 'Generate subtitles for YouTube videos. Paste a YouTube URL or upload your video. Get SRT or VTT with accurate timestamps. Upload to YouTube Studio. Free tier.',
    breadcrumbLabel: 'YouTube Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/youtube-to-transcript', '/video-to-subtitles', '/subtitle-generator'],
    indexable: true,
    intentKey: 'youtube-subtitle-generator',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I generate subtitles for a YouTube video?', a: 'Paste the YouTube URL and choose SRT. Download the file and upload to YouTube Studio as captions.' },
      { q: 'Can I use this for YouTube Shorts?', a: 'Yes. Shorts URLs are supported. Same process.' },
    ],
  },
  {
    path: '/caption-video-online',
    title: 'Caption Video Online – Add Captions to Video | VideoText',
    description: 'Caption video online. Upload video, get SRT/VTT. Burn or export. AI-powered. Free. No software download.',
    h1: 'Caption Video Online',
    intro: 'Add captions to video online. Upload your file and get SRT or VTT. Burn captions into the video or export for YouTube. No software to install. Free tier.',
    breadcrumbLabel: 'Caption Video Online',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/add-subtitles-to-video', '/video-to-srt'],
    indexable: true,
    intentKey: 'caption-video-online',
    faq: [
      { q: 'How do I caption a video online?', a: 'Upload your video and generate SRT or VTT. Download the caption file or burn it into the video.' },
      { q: 'Is online video captioning free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/generate-subtitles-from-video',
    title: 'Generate Subtitles from Video – SRT/VTT | VideoText',
    description: 'Generate subtitles from video. Upload any video, get SRT/VTT. Accurate timestamps. Export for YouTube, Vimeo. Free tier.',
    h1: 'Generate Subtitles from Video',
    intro: 'Generate subtitles from any video. Upload MP4, MOV, WebM. Get SRT or VTT with accurate timestamps. Export for YouTube, Vimeo, or any platform. Free tier.',
    breadcrumbLabel: 'Generate Subtitles from Video',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-subtitles', '/subtitle-generator', '/srt-generator'],
    indexable: true,
    intentKey: 'generate-subtitles-from-video',
    faq: [
      { q: 'How do I generate subtitles from a video?', a: 'Upload your video and choose SRT or VTT. Click Generate. Download the caption file.' },
      { q: 'What subtitle formats are supported?', a: 'SRT and VTT. Both work with YouTube, Vimeo, LinkedIn, and most video platforms.' },
    ],
  },
  {
    path: '/descript-alternative',
    title: 'Descript Alternative – Video Transcription & Editing | VideoText',
    description: 'VideoText as a Descript alternative. Transcribe video, generate subtitles, translate. Fast, private, no data retention. Free tier.',
    h1: 'Descript Alternative',
    intro: 'Looking for a Descript alternative? VideoText transcribes video, generates SRT subtitles, translates captions, and burns them into video. We process and delete your files — no retention. Free tier.',
    breadcrumbLabel: 'Descript Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/transcribe-video', '/otter-ai-alternative'],
    indexable: true,
    intentKey: 'descript-alternative',
    faq: [
      { q: 'How is VideoText different from Descript?', a: 'VideoText focuses on transcription and subtitles. We do not store your data. Process and delete. Fast AI transcription, SRT export, translate, burn.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. No credit card required.' },
    ],
  },
  {
    path: '/otter-ai-alternative',
    title: 'Otter.ai Alternative – Transcription & Meeting Notes | VideoText',
    description: 'VideoText as an Otter.ai alternative. Transcribe meetings, podcasts, videos. Speaker labels, summary. We don\'t store your data. Free tier.',
    h1: 'Otter.ai Alternative',
    intro: 'Looking for an Otter.ai alternative? VideoText transcribes meetings, podcasts, and videos. Get speaker labels, action items, and key points. We process and delete files — no retention. Free tier.',
    breadcrumbLabel: 'Otter.ai Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/podcast-transcript', '/rev-alternative'],
    indexable: true,
    intentKey: 'otter-ai-alternative',
    faq: [
      { q: 'How does VideoText compare to Otter.ai?', a: 'VideoText transcribes meetings, podcasts, and videos. We don\'t store your data. Upload, transcribe, export. Free tier with 3 imports/month.' },
      { q: 'Can I transcribe Zoom meetings with VideoText?', a: 'Yes. Download your Zoom recording as MP4 and upload. Get a full transcript with speaker labels.' },
    ],
  },
  {
    path: '/rev-alternative',
    title: 'Rev Alternative – Professional Transcription | VideoText',
    description: 'VideoText as a Rev alternative. Fast AI transcription. SRT, TXT, DOCX export. We don\'t store your data. Free tier.',
    h1: 'Rev Alternative',
    intro: 'Looking for a Rev alternative? VideoText offers fast AI transcription for video and audio. Export SRT, TXT, translate subtitles. We process and delete your files. Free tier.',
    breadcrumbLabel: 'Rev Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/audio-to-text', '/trint-alternative'],
    indexable: true,
    intentKey: 'rev-alternative',
    faq: [
      { q: 'How is VideoText different from Rev?', a: 'VideoText uses AI for fast turnaround. We don\'t store your data. Export SRT, TXT, translate. Free tier available.' },
      { q: 'Is VideoText cheaper than Rev?', a: 'VideoText offers a free tier (3 imports/month). Paid plans start at $19 for 450 minutes.' },
    ],
  },
  {
    path: '/trint-alternative',
    title: 'Trint Alternative – Transcription & Subtitles | VideoText',
    description: 'VideoText as a Trint alternative. Transcribe video, generate SRT, translate. Fast AI. No data retention. Free tier.',
    h1: 'Trint Alternative',
    intro: 'Looking for a Trint alternative? VideoText transcribes video and audio, generates SRT subtitles, and translates. We process and delete your files. Free tier.',
    breadcrumbLabel: 'Trint Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-transcript', '/subtitle-generator', '/turboscribe-alternative'],
    indexable: true,
    intentKey: 'trint-alternative',
    faq: [
      { q: 'How does VideoText compare to Trint?', a: 'VideoText offers fast AI transcription, SRT export, and translation. We don\'t store your data. Free tier with 3 imports/month.' },
      { q: 'Can I export SRT from VideoText?', a: 'Yes. Generate subtitles and download SRT or VTT. Upload to any video platform.' },
    ],
  },
  {
    path: '/turboscribe-alternative',
    title: 'TurboScribe Alternative – Fast Transcription | VideoText',
    description: 'VideoText as a TurboScribe alternative. Fast AI transcription. SRT, TXT export. We don\'t store your data. Free tier.',
    h1: 'TurboScribe Alternative',
    intro: 'Looking for a TurboScribe alternative? VideoText transcribes video and audio with AI. Export SRT, TXT, translate. Fast and private. Free tier.',
    breadcrumbLabel: 'TurboScribe Alternative',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/fastest-transcription-tool', '/video-to-transcript', '/transcribe-video'],
    indexable: true,
    intentKey: 'turboscribe-alternative',
    faq: [
      { q: 'How fast is VideoText compared to TurboScribe?', a: 'VideoText transcribes most videos in 30–90 seconds. Real-time streaming of results as segments complete.' },
      { q: 'Does VideoText store my files?', a: 'No. We process and delete. Your content is never stored.' },
    ],
  },
  {
    path: '/best-video-transcription-tool',
    title: 'Best Video Transcription Tool 2026 – AI-Powered | VideoText',
    description: 'Best video transcription tool. Fast AI transcription. SRT, TXT, DOCX. Speaker labels, chapters. We don\'t store your data. Free tier.',
    h1: 'Best Video Transcription Tool',
    intro: 'VideoText is among the best video transcription tools. Fast AI transcription, speaker labels, chapters, SRT export. We process and delete your files — no retention. Free tier.',
    breadcrumbLabel: 'Best Video Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-transcription', '/transcribe-video', '/fastest-transcription-tool'],
    indexable: true,
    intentKey: 'best-video-transcription-tool',
    faq: [
      { q: 'What makes VideoText a good video transcription tool?', a: 'Fast AI transcription, SRT/VTT export, speaker labels, chapters, translation. We don\'t store your data.' },
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month. No credit card required.' },
    ],
  },
  {
    path: '/best-youtube-transcription-tool',
    title: 'Best YouTube Transcription Tool – Paste URL, Get Text | VideoText',
    description: 'Best YouTube transcription tool. Paste URL, get transcript. No download. SRT, TXT export. Fast. Free tier.',
    h1: 'Best YouTube Transcription Tool',
    intro: 'VideoText is among the best YouTube transcription tools. Paste any YouTube URL — no download. Get a transcript in seconds. Export SRT, TXT. Free tier.',
    breadcrumbLabel: 'Best YouTube Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/youtube-to-transcript', '/youtube-transcript', '/transcribe-youtube-video'],
    indexable: true,
    intentKey: 'best-youtube-transcription-tool',
    defaultInputMode: 'youtube',
    faq: [
      { q: 'How do I transcribe a YouTube video with VideoText?', a: 'Paste the YouTube URL and click Transcribe. No download. Transcript ready in seconds.' },
      { q: 'Is YouTube transcription free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/best-podcast-transcription-tool',
    title: 'Best Podcast Transcription Tool – Fast & Accurate | VideoText',
    description: 'Best podcast transcription tool. Upload episode, get transcript. Speaker labels, summary. We don\'t store your data. Free tier.',
    h1: 'Best Podcast Transcription Tool',
    intro: 'VideoText is among the best podcast transcription tools. Upload your episode as MP4 or MOV. Get speaker labels, key takeaways, translate to 6 languages. Free tier.',
    breadcrumbLabel: 'Best Podcast Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/podcast-transcript', '/podcast-transcription', '/audio-to-text'],
    indexable: true,
    intentKey: 'best-podcast-transcription-tool',
    faq: [
      { q: 'How do I transcribe a podcast with VideoText?', a: 'Export your episode as MP4 or MOV, upload here, and get a full transcript with speaker labels in seconds.' },
      { q: 'Is podcast transcription free?', a: 'Yes. Free tier includes 3 imports per month.' },
    ],
  },
  {
    path: '/fastest-transcription-tool',
    title: 'Fastest Transcription Tool – AI-Powered | VideoText',
    description: 'Fastest transcription tool. Transcribe video in seconds. Real-time results. SRT, TXT export. We don\'t store your data. Free tier.',
    h1: 'Fastest Transcription Tool',
    intro: 'VideoText is one of the fastest transcription tools. Most videos transcribe in 30–90 seconds. See results stream in real time. Export SRT, TXT. We process and delete your files. Free tier.',
    breadcrumbLabel: 'Fastest Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-transcription', '/turboscribe-alternative'],
    indexable: true,
    intentKey: 'fastest-transcription-tool',
    faq: [
      { q: 'How fast is VideoText?', a: 'Most short videos transcribe in 30–90 seconds. Results stream in real time as segments complete.' },
      { q: 'Does VideoText store my files?', a: 'No. We process and delete. No retention.' },
    ],
  },
  {
    path: '/free-video-transcription-tool',
    title: 'Free Video Transcription Tool – No Credit Card | VideoText',
    description: 'Free video transcription tool. 3 imports/month. SRT, TXT export. AI-powered. We don\'t store your data. Sign up for free.',
    h1: 'Free Video Transcription Tool',
    intro: 'VideoText offers a free video transcription tool. 3 imports per month, no credit card. Transcribe video, get SRT or TXT. We process and delete your files. Sign up for free.',
    breadcrumbLabel: 'Free Video Transcription Tool',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/free-transcription', '/transcribe-video', '/video-transcription'],
    indexable: true,
    intentKey: 'free-video-transcription-tool',
    faq: [
      { q: 'Is VideoText free?', a: 'Yes. Free tier includes 3 imports per month (resets on the 1st). No credit card required.' },
      { q: 'What do I get with the free tier?', a: 'Transcript, SRT/VTT export, speaker labels, summary, chapters. Watermark on subtitle exports.' },
    ],
  },
]

/** Full registry: manual + programmatic (targets × intents). */
const REGISTRY: SeoRegistryEntry[] = [...MANUAL_REGISTRY, ...getProgrammaticSeoEntries()]

/** Lookup by path. Use for routing and meta. */
const byPath = new Map<string, SeoRegistryEntry>()
REGISTRY.forEach((e) => byPath.set(e.path, e))

/** Labels for core tool paths (not in SEO registry). */
const CORE_TOOL_LABELS: Record<string, string> = {
  '/video-to-transcript': 'Video to Transcript',
  '/video-to-subtitles': 'Video to Subtitles',
  '/translate-subtitles': 'Translate Subtitles',
  '/fix-subtitles': 'Fix Subtitles',
  '/burn-subtitles': 'Burn Subtitles',
  '/compress-video': 'Compress Video',
  '/batch-process': 'Batch Process',
}

/** Popular tool paths for Footer (core + selected SEO). Single source for footer links. */
const POPULAR_FOOTER_PATHS: string[] = [
  '/video-to-transcript',
  '/youtube-to-transcript',
  '/youtube-transcript-generator',
  '/video-to-text-converter',
  '/podcast-transcription',
  '/subtitle-generator',
  '/video-caption-generator',
  '/add-subtitles-to-video',
  '/audio-to-text-converter',
  '/video-to-subtitles',
  '/translate-subtitles',
  '/compress-video',
  '/batch-process',
]

/** Links for Footer "Popular tools" section; labels from registry or core labels. */
export function getPopularFooterLinks(): { path: string; label: string }[] {
  return POPULAR_FOOTER_PATHS.map((path) => ({ path, label: getPageLabel(path) }))
}

export function getSeoEntry(path: string): SeoRegistryEntry | undefined {
  return byPath.get(path)
}

/** Page label for any path (registry or core tool). */
export function getPageLabel(path: string): string {
  const entry = byPath.get(path)
  if (entry) return entry.breadcrumbLabel
  return CORE_TOOL_LABELS[path] ?? path.slice(1).replace(/-/g, ' ')
}

const MIN_RELATED = 4
const MAX_RELATED = 6

function isPathIndexable(path: string): boolean {
  const entry = byPath.get(path)
  if (entry) return entry.indexable
  return true // core/static routes are indexable
}

/** Related tool suggestions for an entry: relatedSlugs first, then same toolKey; 4–6 links, never self. Only indexable targets. */
export function getRelatedSuggestionsForEntry(entry: SeoRegistryEntry): { path: string; title: string }[] {
  const seen = new Set<string>([entry.path])
  const out: { path: string; title: string }[] = []

  for (const path of entry.relatedSlugs) {
    if (seen.has(path) || out.length >= MAX_RELATED || !isPathIndexable(path)) continue
    seen.add(path)
    out.push({ path, title: getPageLabel(path) })
  }
  if (out.length >= MIN_RELATED) return out.slice(0, MAX_RELATED)

  for (const other of REGISTRY) {
    if (seen.has(other.path) || !other.indexable || other.toolKey !== entry.toolKey || out.length >= MAX_RELATED) continue
    seen.add(other.path)
    out.push({ path: other.path, title: other.breadcrumbLabel })
  }
  if (out.length >= MIN_RELATED) return out.slice(0, MAX_RELATED)

  for (const other of REGISTRY) {
    if (seen.has(other.path) || !other.indexable || out.length >= MAX_RELATED) continue
    seen.add(other.path)
    out.push({ path: other.path, title: other.breadcrumbLabel })
  }
  return out.slice(0, MAX_RELATED)
}

export function isSeoPagePath(path: string): boolean {
  return byPath.has(path)
}

/** All registry entries (for sitemap, automation). */
export function getAllSeoEntries(): SeoRegistryEntry[] {
  return REGISTRY
}

/** All SEO paths derived from registry (for routing, sitemap, prefetch). */
export function getAllSeoPaths(): string[] {
  return REGISTRY.map((e) => e.path)
}
