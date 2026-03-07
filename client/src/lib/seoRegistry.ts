/**
 * SEO page registry — single source of truth for programmatic SEO wrapper pages.
 * Used by SeoToolPage template, meta derivation, and automation (sitemap, routes).
 * NO content rewriting; pure migration from existing wrapper pages.
 */

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
}

const REGISTRY: SeoRegistryEntry[] = [
  {
    path: '/video-to-text',
    title: 'Video to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert video to text online. Get a transcript in seconds, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. No signup required for the free tier.',
    h1: 'Video to Text Online',
    intro:
      'Turn any video into text in seconds. Upload a video, get a transcript, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. No signup required for the free tier.',
    breadcrumbLabel: 'Video to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-to-text',
    faq: [
      { q: 'What video formats are supported?', a: 'We support MP4, MOV, AVI, WebM, and MKV. Upload your file and get a plain-text transcript in seconds.' },
      { q: 'Is the transcript accurate?', a: 'Yes. We use AI speech recognition to transcribe speech accurately. You can trim the video before processing to focus on the part you need.' },
      { q: 'Can I copy the transcript?', a: 'Yes. After processing, you can download the transcript file or copy the text to your clipboard from the preview.' },
      { q: 'Can I view the transcript in another language?', a: 'Yes. Use the Translate button to view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. Translations are cached so you can switch instantly.' },
    ],
  },
  {
    path: '/mp4-to-text',
    title: 'MP4 to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert MP4 to text online. Get an accurate transcript, then translate it to Hindi, Telugu, Spanish, Chinese, Russian, or English. Fast. No signup for free tier.',
    h1: 'MP4 to Text Online',
    intro:
      'Convert MP4 video to text online. Upload your MP4, get an accurate transcript, then view it in Hindi, Telugu, Spanish, Chinese, Russian, or English. Fast. No signup for free tier.',
    breadcrumbLabel: 'MP4 to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'mp4-to-text',
    faq: [
      { q: 'Can I convert MP4 to text?', a: 'Yes. Upload your MP4 file and we extract the spoken audio as text. MP4, MOV, AVI, WebM, and MKV are all supported.' },
      { q: 'How long does it take?', a: 'Most videos are transcribed in 30–60 seconds. Queue position is shown while your job is processing.' },
      { q: 'Is there a file size limit?', a: 'Large files are supported; check the upload zone for the current limit. You can also trim the video to a segment before transcribing.' },
      { q: 'Can I translate the transcript?', a: 'Yes. After transcribing, click Translate and choose English, Hindi, Telugu, Spanish, Chinese, or Russian to view the transcript in that language.' },
    ],
  },
  {
    path: '/mp4-to-srt',
    title: 'MP4 to SRT Online – Fast & Accurate | VideoText',
    description:
      'Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, download timed captions. No signup required for the free tier.',
    h1: 'MP4 to SRT Online',
    intro:
      'Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, and download timed captions. No signup required for the free tier.',
    breadcrumbLabel: 'MP4 to SRT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-transcript', '/translate-subtitles'],
    indexable: true,
    intentKey: 'mp4-to-srt',
    faq: [
      { q: 'How do I get SRT from MP4?', a: 'Upload your MP4 file, choose SRT as the format, and click Generate. You get a timed SRT file ready for YouTube or other platforms.' },
      { q: 'Can I get VTT instead of SRT?', a: 'Yes. The tool supports both SRT (recommended for YouTube) and VTT (for web). Select your preferred format before processing.' },
      { q: 'Does it support multiple languages?', a: 'Yes. You can set a spoken language or use auto-detect. Paid plans support multiple output languages in one go.' },
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
      { q: 'What is a subtitle generator?', a: 'It creates timed subtitle files (SRT or VTT) from video by transcribing speech and aligning text to timestamps. You upload a video and download captions.' },
      { q: 'Which formats can I get?', a: 'SRT (best for YouTube and most apps) and VTT (for web players). Both are generated from the same upload.' },
      { q: 'Do I need to sign up?', a: 'No. The free tier works without signup. Create an account or upgrade when you need more minutes or extra features like multi-language output.' },
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
      { q: 'What is an SRT translator?', a: 'It translates the text in your SRT (or VTT) subtitle file to another language while keeping timestamps unchanged. Upload your file and pick the target language.' },
      { q: 'Which languages are supported?', a: 'Arabic and Hindi are available; more languages may be added. The original timing is preserved so subtitles stay in sync.' },
      { q: 'Can I edit the translated subtitles?', a: 'Yes. After translation you can preview and download. Paid plans allow in-app editing of the translated text before download.' },
    ],
  },
  {
    path: '/meeting-transcript',
    title: 'Meeting Transcript — Turn Meetings into Text | VideoText',
    description:
      'Convert meeting recordings to text. Get a transcript in seconds, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Download or copy. No signup for free tier.',
    h1: 'Meeting Transcript — Turn Meetings into Text',
    intro:
      'Convert meeting recordings to text in seconds. Upload a video, get a transcript, then view it in English, Hindi, Telugu, Spanish, Chinese, or Russian. Use Speakers and Summary for who said what and key points.',
    breadcrumbLabel: 'Meeting Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'meeting-transcript',
    faq: [
      { q: 'Is this free?', a: 'Yes. The free tier includes 60 minutes per month. No signup required to try.' },
      { q: 'Does this work for meetings?', a: 'Yes. Upload any meeting recording (MP4, MOV, etc.) and get a transcript. Use the Speakers branch to see who said what.' },
      { q: 'Do timestamps stay accurate?', a: 'Yes. The transcript preserves paragraph structure; the Chapters branch lets you jump by section.' },
      { q: 'Can I get the transcript in another language?', a: 'Yes. Use the Translate button to view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian.' },
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
      { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month. No signup required.' },
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
      { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month.' },
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
      { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month.' },
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
      { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month.' },
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
      { q: 'What languages are supported?', a: '50+ languages including Arabic, Hindi, Spanish, French, German, Chinese, Japanese. Pick target language when translating.' },
      { q: 'Do timestamps stay intact?', a: 'Yes. Only the text is translated; start and end times are unchanged.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. Paid plans unlock more output formats and higher limits.' },
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
      { q: 'Can I get multiple languages from one file?', a: 'Yes. Upload once and translate to different languages; each download is one target language. Paid plans support multiple languages in one flow.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. Upgrade for more minutes and multi-language features.' },
      { q: 'Do timestamps stay accurate?', a: 'Yes. Translation only changes text; timestamps are preserved.' },
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
      { q: 'What does the checker do?', a: 'You upload SRT/VTT and choose a target language. The tool translates the captions to that language so you can check or use them.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. Paid plans unlock more output options.' },
      { q: 'Can I keep the original file?', a: 'Yes. You download the translated version; your original file is not modified.' },
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
      { q: 'What does the grammar fixer do?', a: 'It corrects timing and formatting in SRT/VTT files. Enable grammar-fix when processing to improve caption text and structure.' },
      { q: 'Is this free?', a: 'Yes. Upload SRT or VTT, get a corrected file. Free.' },
      { q: 'Do timestamps change?', a: 'The tool can fix overlapping or invalid timestamps; otherwise they stay the same.' },
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
      { q: 'What does the line break fixer do?', a: 'It fixes long lines and line breaks in SRT/VTT so captions fit platform limits and are easier to read.' },
      { q: 'Is this free?', a: 'Yes. Upload your subtitle file, get a corrected file. Free.' },
      { q: 'Can I edit after?', a: 'Yes. Paid plans unlock in-app editing; you can also download and edit the file elsewhere.' },
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
      { q: 'What are hardcoded captions?', a: 'Captions burned into the video so they always show. Upload video + SRT/VTT and get one video with captions baked in.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. Upgrade for more minutes.' },
      { q: 'Can I choose font size and position?', a: 'Yes. You can set font size (small/medium/large), position (bottom/middle), and background opacity before processing.' },
    ],
  },
  {
    path: '/video-with-subtitles',
    title: 'Video with Subtitles — Add Captions to Video | VideoText',
    description:
      'Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. No signup for free tier.',
    h1: 'Video with Subtitles — Add Captions to Video',
    intro:
      'Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. No signup for free tier.',
    breadcrumbLabel: 'Video with Subtitles',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/compress-video', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-with-subtitles',
    faq: [
      { q: 'How do I add subtitles to video?', a: 'Upload your video and an SRT or VTT file. We burn the captions into the video and you download one file with subtitles visible.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. No signup required to try.' },
      { q: 'What video formats are supported?', a: 'MP4, MOV, AVI, WebM, MKV. Output is typically MP4.' },
    ],
  },
  {
    path: '/video-compressor',
    title: 'Video Compressor — Reduce File Size Online | VideoText',
    description:
      'Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. No signup required.',
    h1: 'Video Compressor — Reduce File Size Online',
    intro:
      'Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. No signup required.',
    breadcrumbLabel: 'Video Compressor',
    toolKey: 'compress-video',
    relatedSlugs: ['/video-to-subtitles'],
    indexable: true,
    intentKey: 'video-compressor',
    faq: [
      { q: 'Is this free?', a: 'Yes. Free tier available. No signup required.' },
      { q: 'How much can I reduce file size?', a: 'Light (about 30% smaller), medium (about 50%), or heavy (about 70%). You choose the level before processing.' },
      { q: 'Does quality drop?', a: 'Compression reduces file size; heavier compression may reduce quality. We keep it reasonable for web and sharing.' },
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
      { q: 'Is this free?', a: 'Yes. Free tier available.' },
      { q: 'What compression levels are there?', a: 'Light, medium, and heavy. Heavier compression gives smaller files; we keep quality suitable for web and sharing.' },
      { q: 'What formats are supported?', a: 'MP4, MOV, AVI, WebM, MKV. Output is typically MP4.' },
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
      { q: 'Is batch processing free?', a: 'Batch is available on Pro and Agency plans. Free and Basic plans use single-file tools.' },
      { q: 'What do I get?', a: 'Upload multiple videos; you receive one ZIP of subtitle files (SRT).' },
      { q: 'Can I choose language?', a: 'Yes. You set the language when starting the batch; multi-language is available on higher plans.' },
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
      'Subtitles vs closed captions: subtitles transcribe speech for language access; closed captions include all audio cues for deaf/HOH viewers. Generate either free with VideoText — no signup.',
    h1: 'Subtitles vs Closed Captions — What\'s the Difference?',
    intro:
      'Subtitles and closed captions look similar but serve different purposes. Subtitles transcribe or translate speech for viewers who can hear but don\'t understand the language. Closed captions include all audio cues — speech, speaker labels, and sound effects — for deaf and hard-of-hearing viewers. VideoText generates both: upload a video and download SRT or VTT caption files in seconds. Free, no signup.',
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
      'Transcribe video to text online, free. Upload MP4, MOV, WebM, or AVI and get an accurate transcript in seconds. View in English, Hindi, Spanish, Chinese, Russian, or Telugu. No signup for free tier.',
    h1: 'Transcribe Video Online',
    intro:
      'Transcribe any video to text in seconds. Upload your video file — MP4, MOV, AVI, or WebM — and get an accurate, readable transcript powered by AI. View the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian. Use Speakers for who-said-what, Summary for key points, and Chapters to jump by section. No signup required for the free tier.',
    breadcrumbLabel: 'Transcribe Video',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/video-to-text', '/mp4-to-text', '/meeting-transcript'],
    indexable: true,
    intentKey: 'transcribe-video',
    faq: [
      { q: 'Is transcribing video free?', a: 'Yes. The free tier includes 60 minutes per month with no signup required. Sign up to track usage across sessions or subscribe for more minutes.' },
      { q: 'What video formats can I transcribe?', a: 'MP4, MOV, AVI, WebM, and MKV are all supported. Upload your file and we extract the speech as text.' },
      { q: 'How accurate is the transcription?', a: 'We use AI speech recognition trained on diverse audio. Accuracy is high for clear speech; you can trim the video to focus on the segment you need.' },
      { q: 'Can I get the transcript in another language?', a: 'Yes. After transcribing, click Translate to view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian.' },
    ],
  },
  {
    path: '/video-transcription',
    title: 'Video Transcription Online – Accurate & Fast | VideoText',
    description:
      'Free video transcription online. Upload any video and get a text transcript in seconds. Supports MP4, MOV, AVI, WebM. View in 6 languages. Summary, speakers, chapters included. No signup for free tier.',
    h1: 'Video Transcription Online',
    intro:
      'Get accurate video transcription online — free. Upload any video and receive a plain-text transcript in seconds. After transcribing, use the Speakers branch for speaker labels, Summary for key points, or Chapters to jump by section. Translate to English, Hindi, Telugu, Spanish, Chinese, or Russian in one click. No signup required for the free tier.',
    breadcrumbLabel: 'Video Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-to-text', '/meeting-transcript'],
    indexable: true,
    intentKey: 'video-transcription',
    faq: [
      { q: 'What is video transcription?', a: 'Video transcription converts spoken words in a video into written text. You upload a video, and our AI extracts the speech as a readable transcript.' },
      { q: 'Is video transcription free?', a: 'Yes. The free tier gives you 60 minutes per month, no signup required.' },
      { q: 'How long does transcription take?', a: 'Most videos are processed in 30–60 seconds. You see a progress indicator while your job runs.' },
      { q: 'Can I download the transcript?', a: 'Yes. Download as plain text, or copy to clipboard from the preview. Paid plans unlock JSON, CSV, Markdown, and Notion-style exports.' },
    ],
  },
  {
    path: '/free-transcription',
    title: 'Free Transcription Online – No Signup Required | VideoText',
    description:
      'Free video transcription with no signup needed. Upload video and get a text transcript in seconds. 60 minutes/month free tier. AI-powered. MP4, MOV, AVI, WebM supported.',
    h1: 'Free Transcription Online',
    intro:
      'Get a free transcript from any video — no account needed. Upload an MP4, MOV, AVI, or WebM, and our AI transcribes the speech into text in seconds. The free tier gives you 60 minutes per month with no credit card required. Sign up when you need more minutes or multi-language output.',
    breadcrumbLabel: 'Free Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/video-to-text', '/ai-transcription'],
    indexable: true,
    intentKey: 'free-transcription',
    faq: [
      { q: 'Is transcription really free?', a: 'Yes. You get 60 minutes per month with no account. No credit card needed to try.' },
      { q: 'What formats are supported for free?', a: 'MP4, MOV, AVI, WebM, and MKV. All formats are available on the free tier.' },
      { q: 'What is the free tier limit?', a: '60 minutes of video per month, single language output. Sign up for a plan to unlock more minutes and multi-language support.' },
      { q: 'Do I need to install anything?', a: 'No. The tool runs in your browser. Upload your file and get a transcript — no installation required.' },
    ],
  },
  {
    path: '/online-transcription',
    title: 'Online Transcription – Free Video to Text | VideoText',
    description:
      'Online transcription for video files. Upload MP4, MOV, or WebM and get a text transcript in seconds. AI-powered, free tier, no signup. Works for meetings, lectures, interviews.',
    h1: 'Online Transcription – Free Video to Text',
    intro:
      'Transcribe video to text online — free. Upload any video file and get a transcript in seconds. Works for meetings, lectures, interviews, podcasts, and more. View in 6 languages and use built-in Speakers, Summary, and Chapters for structured output. No software to install, no account needed.',
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
      'AI-powered video transcription. Upload your video and get a text transcript in seconds. Accurate speech recognition for interviews, meetings, lectures, and more. Free tier, no signup.',
    h1: 'AI Transcription – Video to Text',
    intro:
      'VideoText uses AI speech recognition to transcribe your video in seconds. Upload any video, get a plain-text transcript, then use Speakers, Summary, Chapters, or Keywords for structured insight. Translate to 6 languages with a single click. Free tier, no signup required — no software to install.',
    breadcrumbLabel: 'AI Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/free-transcription', '/video-transcription'],
    indexable: true,
    intentKey: 'ai-transcription',
    faq: [
      { q: 'How does AI transcription work?', a: 'We run your video through AI speech recognition models that detect spoken words and produce text with high accuracy, even for technical content and accents.' },
      { q: 'Is AI transcription more accurate than manual?', a: 'For clear audio, AI transcription is very accurate and far faster than manual. You can review and edit the result afterward.' },
      { q: 'What languages does the AI support?', a: 'The AI supports many spoken languages. Set the spoken language for best results, or use auto-detect.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month with no signup required.' },
    ],
  },
  {
    path: '/audio-to-text',
    title: 'Audio to Text – Transcribe Audio or Video Online | VideoText',
    description:
      'Convert audio to text online. Upload a video file (MP4, MOV, AVI, WebM) to transcribe the audio track to text. Free, AI-powered, no signup. Works for interviews, meetings, podcasts.',
    h1: 'Audio to Text – Transcribe Audio Online',
    intro:
      'Turn audio into text online — free. Upload a video file containing your audio (MP4, MOV, AVI, or WebM) and get an accurate text transcript in seconds. Our AI extracts the speech and delivers a clean, readable transcript. View in 6 languages and download or copy the result. No signup for the free tier.',
    breadcrumbLabel: 'Audio to Text',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/transcribe-video', '/free-transcription', '/podcast-transcript'],
    indexable: true,
    intentKey: 'audio-to-text',
    faq: [
      { q: 'Can I transcribe audio files?', a: 'Upload your audio packaged as a video file (MP4, MOV, AVI, WebM). Most recordings and podcasts are shared in video containers. If you have an audio-only file, most tools let you export it as MP4.' },
      { q: 'What audio formats are supported?', a: 'We accept audio packaged in video files: MP4, MOV, AVI, WebM, MKV. These cover most podcast, interview, and recording formats.' },
      { q: 'Is audio transcription free?', a: 'Yes. Free tier includes 60 minutes per month, no signup required.' },
      { q: 'Can I translate the transcribed audio?', a: 'Yes. After transcribing, click Translate to view the text in English, Hindi, Telugu, Spanish, Chinese, or Russian.' },
    ],
  },
  {
    path: '/podcast-transcript',
    title: 'Podcast Transcript – Transcribe Episodes Online | VideoText',
    description:
      'Get a transcript for any podcast episode. Upload your episode as a video file and get accurate text in seconds. Free, AI-powered. Speaker labels, key takeaways, no signup.',
    h1: 'Podcast Transcript – Transcribe Episodes Online',
    intro:
      'Create a podcast transcript in seconds. Upload your episode as a video file (MP4, MOV, AVI, WebM) and get an accurate text transcript powered by AI. Use the Speakers branch to label who said what, Summary for key takeaways, and Translate to share across 6 languages. Free tier, no signup required.',
    breadcrumbLabel: 'Podcast Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/audio-to-text', '/transcribe-video', '/interview-transcription'],
    indexable: true,
    intentKey: 'podcast-transcript',
    faq: [
      { q: 'Can I transcribe a podcast episode?', a: 'Yes. Export your podcast as an MP4, MOV, or WebM, upload it, and get a full transcript in seconds.' },
      { q: 'Do I get speaker labels for my podcast?', a: 'Yes. After transcribing, open the Speakers branch to see paragraphs grouped by speaker (Speaker 1, 2, etc.).' },
      { q: 'Is podcast transcription free?', a: 'Yes. Free tier includes 60 minutes per month with no signup required.' },
      { q: 'Can I use the transcript for SEO?', a: 'Absolutely. Copy or download the transcript and add it to your show notes or website to improve discoverability in search engines.' },
    ],
  },
  {
    path: '/zoom-recording-transcript',
    title: 'Zoom Recording Transcript – Convert Calls to Text | VideoText',
    description:
      'Transcribe Zoom recordings to text. Upload your Zoom MP4 and get a transcript with speaker labels in seconds. Free, no signup. Use Summary for action items and decisions.',
    h1: 'Zoom Recording Transcript — Convert Calls to Text',
    intro:
      'Transcribe any Zoom recording to text in seconds. Download your meeting as MP4 from Zoom, upload it here, and get a full transcript. Use the Speakers branch for who-said-what, Summary for action items and decisions, and Chapters to jump by section. Free tier, no signup required.',
    breadcrumbLabel: 'Zoom Recording Transcript',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/meeting-transcript', '/speaker-diarization', '/video-summary-generator'],
    indexable: true,
    intentKey: 'zoom-recording-transcript',
    faq: [
      { q: 'How do I transcribe a Zoom recording?', a: 'Download your Zoom meeting as MP4 (from cloud recordings or local recording folder), then upload it here to get a full transcript.' },
      { q: 'Does it label speakers in Zoom calls?', a: 'Yes. After transcribing, open the Speakers branch to see speech grouped by speaker. Works well for multi-participant Zoom recordings.' },
      { q: 'Can I get a summary of the Zoom meeting?', a: 'Yes. The Summary branch extracts decisions, action items, and key points from the transcript automatically.' },
      { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month, no signup required.' },
    ],
  },
  {
    path: '/interview-transcription',
    title: 'Interview Transcription – Convert Interviews to Text | VideoText',
    description:
      'Transcribe interview recordings to text online. Upload video of your interview and get an accurate transcript with speaker labels. Free tier, no signup required.',
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
      { q: 'Is interview transcription free?', a: 'Yes. Free tier includes 60 minutes per month with no signup required.' },
      { q: 'Can I export the interview transcript?', a: 'Yes. Download as plain text, or use the Exports branch for JSON, CSV, Markdown, or Notion-style formats (paid plans for full export).' },
    ],
  },
  {
    path: '/lecture-transcription',
    title: 'Lecture Transcription – Convert Lectures to Text | VideoText',
    description:
      'Transcribe lecture recordings to text online. Upload a lecture video and get an accurate transcript with chapters and keywords. Free, AI-powered, no signup.',
    h1: 'Lecture Transcription – Convert Lectures to Text',
    intro:
      'Transcribe lecture recordings to text — fast and accurate. Upload your lecture video (MP4, MOV, AVI, or WebM) and get a full transcript powered by AI. Use Keywords to index topics, Chapters to navigate by section, and Translate to share in 6 languages. Free tier, no signup required — perfect for students, educators, and researchers.',
    breadcrumbLabel: 'Lecture Transcription',
    toolKey: 'video-to-transcript',
    relatedSlugs: ['/keyword-indexed-transcript', '/video-chapters-generator', '/transcribe-video'],
    indexable: true,
    intentKey: 'lecture-transcription',
    faq: [
      { q: 'Can I transcribe a university lecture?', a: 'Yes. Upload the lecture recording (MP4, MOV, WebM) and get a text transcript. Works well for talks, presentations, and classroom recordings.' },
      { q: 'Does it extract lecture topics automatically?', a: 'Yes. Open the Keywords branch after transcribing to see repeated terms indexed by section. The Chapters branch shows the lecture broken into navigable sections.' },
      { q: 'Is this free for students?', a: 'Yes. Free tier includes 60 minutes per month, no signup required.' },
      { q: 'Can I study from the transcript?', a: 'Absolutely. Copy or download the transcript for notes and study guides. The Chapters and Keywords branches help you find specific content quickly.' },
    ],
  },
  // ── Format-specific transcription ───────────────────────────────────────────
  {
    path: '/mov-to-text',
    title: 'MOV to Text – Transcribe MOV Video Online | VideoText',
    description:
      'Convert MOV video to text online. Upload your MOV file and get an accurate transcript in seconds. Free, AI-powered, no signup. View in English, Hindi, Spanish, and more.',
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
      { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month, no signup required.' },
      { q: 'Can I get subtitles from my MOV file?', a: 'Yes. Use the Video to Subtitles tool (also supports MOV) to generate SRT or VTT subtitle files from your MOV video.' },
    ],
  },
  {
    path: '/webm-to-text',
    title: 'WebM to Text – Transcribe WebM Video Online | VideoText',
    description:
      'Convert WebM video to text online. Upload your WebM file and get an accurate transcript in seconds. Free, AI-powered, no signup required.',
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
      { q: 'Is this free?', a: 'Yes. Free tier includes 60 minutes per month, no signup required.' },
      { q: 'Can I convert WebM to SRT subtitles?', a: 'Yes. Use the Video to Subtitles tool, upload your WebM file, and choose SRT or VTT format for a timed caption file.' },
    ],
  },
  // ── Subtitle/Caption variants ────────────────────────────────────────────────
  {
    path: '/automatic-subtitles',
    title: 'Automatic Subtitles – AI-Generated Captions Online | VideoText',
    description:
      'Generate automatic subtitles for any video. Upload and get AI-generated SRT or VTT captions in seconds. Free tier, no signup. Works for YouTube, web, and social media.',
    h1: 'Automatic Subtitles – AI-Generated Captions',
    intro:
      'Generate automatic subtitles for any video in seconds. Upload your video and our AI creates accurate, timed SRT or VTT captions ready for YouTube, web players, or social media. Supports multiple languages. Free tier, no signup required.',
    breadcrumbLabel: 'Automatic Subtitles',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/caption-generator', '/video-to-srt'],
    indexable: true,
    intentKey: 'automatic-subtitles',
    faq: [
      { q: 'Are automatic subtitles accurate?', a: 'Yes. Our AI generates highly accurate subtitles with correct timestamps. For best results, use clear audio and set the spoken language before processing.' },
      { q: 'Which format should I choose — SRT or VTT?', a: 'SRT is best for YouTube and most video platforms. VTT is ideal for HTML5 web players. Both are generated from the same upload.' },
      { q: 'Is this free?', a: 'Yes. Free tier available, no signup required. Paid plans unlock multi-language output and higher minute limits.' },
      { q: 'Can I auto-generate subtitles for YouTube?', a: 'Yes. Download the SRT file and upload it to YouTube Studio as a subtitle track for your video.' },
    ],
  },
  {
    path: '/caption-generator',
    title: 'Caption Generator – Auto-Generate Video Captions | VideoText',
    description:
      'Generate captions for any video online. AI-powered caption generator creates SRT or VTT files in seconds. Free tier, no signup. Perfect for YouTube, social media, and accessibility.',
    h1: 'Caption Generator – Auto-Generate Video Captions',
    intro:
      'Generate captions for your video automatically. Upload any video file, and our AI creates accurate, timed SRT or VTT captions in seconds. Perfect for YouTube, TikTok, Instagram, and accessibility compliance. Free tier, no signup required.',
    breadcrumbLabel: 'Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/automatic-subtitles', '/subtitle-generator', '/closed-caption-generator'],
    indexable: true,
    intentKey: 'caption-generator',
    faq: [
      { q: 'What is a caption generator?', a: 'A caption generator transcribes speech in a video and creates timed caption files (SRT or VTT) automatically using AI. You upload a video and download ready-to-use captions.' },
      { q: 'Is it free to generate captions?', a: 'Yes. Free tier is available with no signup required. Create an account for more minutes and features.' },
      { q: 'What formats does the caption generator output?', a: 'SRT and VTT. SRT is supported by YouTube, Vimeo, and most platforms. VTT works with HTML5 web players.' },
      { q: 'Can I burn the generated captions into the video?', a: 'Yes. After generating captions, use our Burn Subtitles tool to hardcode them permanently into the video.' },
    ],
  },
  {
    path: '/closed-caption-generator',
    title: 'Closed Caption Generator – Create CC for Video | VideoText',
    description:
      'Generate closed captions for any video. Upload and get timed SRT or VTT files in seconds. AI-powered, free tier, no signup. Accessible captions for YouTube and web.',
    h1: 'Closed Caption Generator – Accessible Captions Online',
    intro:
      'Create closed captions for any video — free and fast. Upload your video and our AI generates accurate, timed SRT or VTT caption files in seconds. Download and add them to YouTube, Vimeo, or any web player to make your content accessible to deaf and hard-of-hearing viewers. Free tier, no signup required.',
    breadcrumbLabel: 'Closed Caption Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/caption-generator', '/automatic-subtitles', '/subtitles-vs-closed-captions'],
    indexable: true,
    intentKey: 'closed-caption-generator',
    faq: [
      { q: 'What are closed captions?', a: 'Closed captions are text overlays that viewers can turn on or off. They include speech, speaker labels, and non-speech audio cues, making video accessible to deaf and hard-of-hearing viewers.' },
      { q: 'How do I create closed captions?', a: 'Upload your video here and download an SRT or VTT file. Upload the file to YouTube Studio or your video platform to add closed captions.' },
      { q: 'Is the closed caption generator free?', a: 'Yes. Free tier is available with no signup required. Paid plans unlock more minutes and multi-language support.' },
      { q: 'Which platforms accept closed caption files?', a: 'YouTube, Vimeo, Zoom, Facebook Video, Twitter, and most web players support SRT or VTT closed caption files.' },
    ],
  },
  {
    path: '/free-subtitle-generator',
    title: 'Free Subtitle Generator – No Account Needed | VideoText',
    description:
      'Generate subtitles free online. Upload video and get accurate SRT or VTT subtitles in seconds. No account needed. AI-powered, fast, and supports 50+ languages.',
    h1: 'Free Subtitle Generator – No Account Needed',
    intro:
      'Generate subtitles for free — no account needed. Upload any video and get accurate, timed SRT or VTT subtitle files in seconds. Our AI supports 50+ languages and produces captions ready for YouTube, TikTok, Instagram, and any web player. No credit card, no signup.',
    breadcrumbLabel: 'Free Subtitle Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/subtitle-generator', '/automatic-subtitles', '/caption-generator'],
    indexable: true,
    intentKey: 'free-subtitle-generator',
    faq: [
      { q: 'Is the subtitle generator really free?', a: 'Yes. You get 60 minutes per month with no account required. No credit card needed to try.' },
      { q: 'Do I need to sign up?', a: 'No. The free tier works without creating an account. Sign up when you want to track usage or unlock more minutes.' },
      { q: 'What subtitle formats can I download for free?', a: 'SRT and VTT on the free tier. Both are supported by YouTube, Vimeo, and most video platforms.' },
      { q: 'How many languages does the free tier support?', a: 'Single language per job on the free tier. Paid plans unlock multi-language subtitle output in one batch.' },
    ],
  },
  {
    path: '/video-to-srt',
    title: 'Video to SRT – Generate SRT Subtitle Files Online | VideoText',
    description:
      'Convert video to SRT subtitle file online. Upload any video and download a timed SRT file in seconds. Free, AI-powered, no signup. Perfect for YouTube and video platforms.',
    h1: 'Video to SRT – Generate SRT Subtitle Files',
    intro:
      'Generate an SRT subtitle file from any video in seconds. Upload your video, our AI transcribes the speech and creates a timed SRT file ready to upload to YouTube or any video platform. Free tier, no signup required.',
    breadcrumbLabel: 'Video to SRT',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/mp4-to-srt', '/srt-generator', '/automatic-subtitles'],
    indexable: true,
    intentKey: 'video-to-srt',
    faq: [
      { q: 'What is an SRT file?', a: 'SRT (SubRip Text) is a standard subtitle format containing text lines with start and end timestamps. It is supported by YouTube, Vimeo, VLC, and most video platforms.' },
      { q: 'How do I create an SRT file from video?', a: 'Upload your video here, choose SRT format, and click Generate. You get a timed SRT file to download and use on any platform.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. No signup required.' },
      { q: 'Can I also get VTT instead of SRT?', a: 'Yes. Choose SRT or VTT format before processing. Both are generated from the same upload.' },
    ],
  },
  {
    path: '/srt-generator',
    title: 'SRT Generator – Create SRT Subtitle Files from Video | VideoText',
    description:
      'Generate SRT subtitle files from any video. Upload your video and get a timed SRT file in seconds. Free, AI-powered, supports 50+ languages. No signup required.',
    h1: 'SRT Generator – Create SRT Files from Video',
    intro:
      'Generate SRT subtitle files from any video with one click. Upload your video, our AI transcribes the speech with accurate timestamps, and you download an SRT file ready for YouTube, Vimeo, or any platform. Free tier, no signup required, 50+ languages supported.',
    breadcrumbLabel: 'SRT Generator',
    toolKey: 'video-to-subtitles',
    relatedSlugs: ['/video-to-srt', '/mp4-to-srt', '/subtitle-generator'],
    indexable: true,
    intentKey: 'srt-generator',
    faq: [
      { q: 'What is an SRT generator?', a: 'An SRT generator transcribes speech in a video and creates a properly timed SRT subtitle file automatically. You upload video and download captions.' },
      { q: 'Does it support multiple languages?', a: 'Yes. Set the spoken language before processing for best accuracy. Paid plans output multiple languages in one batch.' },
      { q: 'Is the SRT generator free?', a: 'Yes. Free tier is available with no signup required.' },
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
      { q: 'How do I translate a video to another language?', a: 'Upload your video, transcribe it, then click Translate to view the transcript in another language. Or generate subtitles and use our Translate Subtitles tool for a translated SRT/VTT file.' },
      { q: 'Which languages can I translate video to?', a: 'Transcript translation: English, Hindi, Telugu, Spanish, Chinese, Russian. Subtitle translation: Arabic, Hindi, Spanish, French, German, Chinese, Japanese, and 50+ more.' },
      { q: 'Is video translation free?', a: 'Yes. Free tier is available, no signup required. Paid plans unlock more minutes and multi-language subtitle output.' },
      { q: 'Does video translation burn subtitles into the video?', a: 'It creates translated subtitle files (SRT/VTT). Use our Burn Subtitles tool to burn them into the video permanently.' },
    ],
  },
  {
    path: '/video-translation',
    title: 'Video Translation – Translate Video Content Online | VideoText',
    description:
      'Translate video content to 50+ languages. Transcribe video and view translated transcript in Hindi, Spanish, Chinese, Russian, or English. Export translated SRT/VTT subtitles. Free tier.',
    h1: 'Video Translation Online',
    intro:
      'Translate video content to any language online. Upload your video, get an accurate transcript, then translate it to English, Hindi, Telugu, Spanish, Chinese, or Russian. For subtitle translation, generate SRT or VTT and translate to 50+ languages. Export and burn into the video for multilingual content. Free tier, no signup.',
    breadcrumbLabel: 'Video Translation',
    toolKey: 'translate-subtitles',
    relatedSlugs: ['/translate-video', '/subtitle-translator', '/multilingual-subtitles'],
    indexable: true,
    intentKey: 'video-translation',
    faq: [
      { q: 'What is video translation?', a: 'Video translation converts your video content into another language as text (transcript) or timed captions (SRT/VTT) that can be burned into the video or uploaded to a platform.' },
      { q: 'What languages are supported for video translation?', a: 'Transcript view: 6 languages (English, Hindi, Telugu, Spanish, Chinese, Russian). Subtitle file translation: 50+ languages via Translate Subtitles.' },
      { q: 'Is video translation free?', a: 'Yes. Free tier is available with no signup required.' },
      { q: 'How do I get translated captions on my video?', a: 'Generate subtitles, translate the SRT/VTT file, then use Burn Subtitles to hardcode the translated captions into the video.' },
    ],
  },
]

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
  '/video-to-subtitles',
  '/subtitle-generator',
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
