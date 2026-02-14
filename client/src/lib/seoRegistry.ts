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
    title: 'subtitles vs closed captions | VideoText',
    description:
      'Use VideoText for subtitles vs closed captions. Free online tools for video to text, subtitles, and more.',
    h1: 'subtitles vs closed captions',
    intro:
      'Use VideoText for subtitles vs closed captions. Free online tools for video to text, subtitles, and more.',
    breadcrumbLabel: 'Subtitles Vs Closed Captions',
    toolKey: 'burn-subtitles',
    relatedSlugs: ['/video-to-transcript', '/video-to-subtitles'],
    indexable: true,
    intentKey: 'subtitles-vs-closed-captions',
    faq: [
      { q: 'What is subtitles vs closed captions?', a: 'VideoText helps with subtitles vs closed captions. Use our free tools to get started.' },
      { q: 'Is this free?', a: 'Yes. Free tier available. No signup required to try.' },
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
