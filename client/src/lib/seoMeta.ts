import { SITE_URL, SITE_NAME } from './seo'

/** Per-route SEO meta. Used by Seo component on each page. Descriptions match product behavior and target search intent. */
export const ROUTE_SEO: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Video to Text & Subtitles — Free Online Tools',
    description:
      'VideoText: AI-powered video to text and subtitle tools. Transcribe video to transcript, generate SRT/VTT subtitles, translate, fix timing, burn captions, compress video. Paste URL or upload. No signup. Free tier.',
  },
  '/pricing': {
    title: 'Pricing — Free, Basic, Pro & Agency Plans',
    description:
      'VideoText pricing: Free 60 min/month, Basic $19 (450 min), Pro $49 (1,200 min), Agency $129 (3,000 min). Multi-language, batch on Pro+. Upgrade when you need more.',
  },
  '/video-to-transcript': {
    title: 'Video to Transcript — Free AI Transcription',
    description:
      'Convert video to text with AI. Paste a URL or upload a video, get a plain-text transcript in seconds. Multiple languages. No signup. Free tier. Download or copy to clipboard.',
  },
  '/video-to-subtitles': {
    title: 'Video to Subtitles — SRT & VTT Generator',
    description:
      'Generate SRT and VTT subtitle files from any video with AI. Paste URL or upload. Ideal for YouTube and web. Single or multi-language. No signup. Free tier.',
  },
  '/translate-subtitles': {
    title: 'Translate Subtitles — SRT/VTT to Any Language',
    description:
      'Translate SRT or VTT subtitle files to Arabic, Hindi, Spanish, and 50+ languages with AI. Upload or paste subtitles, pick target language, download. Free tier available.',
  },
  '/fix-subtitles': {
    title: 'Fix Subtitles — Auto-Correct Timing & Format',
    description:
      'Fix overlapping timestamps, long lines, and gaps in SRT/VTT files. Auto-correct timing and formatting for readability and YouTube limits. Upload SRT or VTT, download corrected file. Free.',
  },
  '/burn-subtitles': {
    title: 'Burn Subtitles into Video — Hardcode Captions',
    description:
      'Burn SRT or VTT subtitles directly into your video. Upload video + subtitle file, get one video with hardcoded captions. No signup. Free tier available.',
  },
  '/compress-video': {
    title: 'Compress Video — Reduce File Size Online',
    description:
      'Compress video online: light, medium, or heavy compression. Paste URL or upload. Reduce file size for sharing and uploads. Free. No signup required.',
  },
  '/batch-process': {
    title: 'Batch Video to Subtitles — Multiple Videos at Once',
    description:
      'Generate SRT subtitles for many videos in one go. Upload multiple videos, get one ZIP of subtitle files. Pro and Agency plans. Multi-language optional.',
  },
  // SEO utility pages: same tools, alternate entry points. No new API or logic.
  '/video-to-text': {
    title: 'Video to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert video to text online. Upload any video, get a plain-text transcript in seconds. No signup required for the free tier.',
  },
  '/mp4-to-text': {
    title: 'MP4 to Text Online – Fast & Accurate | VideoText',
    description:
      'Convert MP4 to text online. Upload your MP4, get an accurate transcript. Fast and no signup required for the free tier.',
  },
  '/mp4-to-srt': {
    title: 'MP4 to SRT Online – Fast & Accurate | VideoText',
    description:
      'Generate SRT subtitles from MP4 video. Upload your file, pick SRT or VTT, download timed captions. No signup required for the free tier.',
  },
  '/subtitle-generator': {
    title: 'Subtitle Generator Online – Fast & Accurate | VideoText',
    description:
      'Generate subtitles from video in one click. Upload any video, get SRT or VTT with accurate timestamps. Fast and free tier available.',
  },
  '/srt-translator': {
    title: 'SRT Translator Online – Fast & Accurate | VideoText',
    description:
      'Translate SRT subtitle files to another language. Upload your SRT or VTT, choose target language, download translated captions with timestamps intact.',
  },
  // VIDEO → TRANSCRIPT tree (SEO entry points; same tool as /video-to-transcript)
  '/meeting-transcript': {
    title: 'Meeting Transcript — Turn Meetings into Text | VideoText',
    description:
      'Convert meeting recordings to text. Upload a video, get a transcript in seconds. No signup for the free tier. Download or copy.',
  },
  '/speaker-diarization': {
    title: 'Speaker-Separated Video Transcripts — Instantly Online | VideoText',
    description:
      'Get video transcripts with speaker labels. Upload any video, transcribe, then view Speakers view for who said what. Free tier available.',
  },
  '/video-summary-generator': {
    title: 'Video Summary Generator — Decisions, Actions, Key Points | VideoText',
    description:
      'Extract structured summaries from video: decisions, action items, key points. Transcribe first, then use the Summary branch. Free tier.',
  },
  '/video-chapters-generator': {
    title: 'Video Chapters Generator — Section Headings from Transcript | VideoText',
    description:
      'Generate chapter headings from your video transcript. Upload, transcribe, then use the Chapters branch to jump by section. Free.',
  },
  '/keyword-indexed-transcript': {
    title: 'Keyword-Indexed Transcript — Topic Index from Video | VideoText',
    description:
      'Get a keyword index from your video transcript. Repeated terms link to transcript sections. Upload, transcribe, open Keywords branch.',
  },
  // VIDEO → SUBTITLES tree (SEO entry points; same tool as /video-to-subtitles)
  '/srt-to-vtt': {
    title: 'SRT to VTT Converter — Subtitle Format Conversion | VideoText',
    description:
      'Generate VTT from video or convert SRT to VTT. Upload video for SRT/VTT, or use the convert step after generating. Free tier.',
  },
  '/subtitle-converter': {
    title: 'Subtitle Converter — SRT, VTT, TXT | VideoText',
    description:
      'Convert subtitle formats: SRT, VTT, plain text. Generate from video or convert after download. One tool, multiple formats. Free tier.',
  },
  '/subtitle-timing-fixer': {
    title: 'Subtitle Timing Fixer — Fix Overlaps and Gaps | VideoText',
    description:
      'Fix overlapping timestamps and gaps in SRT/VTT files. Upload your subtitle file, get corrected timing. Free. Same tool as Fix Subtitles.',
  },
  '/subtitle-validation': {
    title: 'Subtitle Validation — Check Timing and Format | VideoText',
    description:
      'Validate and fix SRT/VTT files: timing, line length, formatting. Upload subtitles, get a corrected file. Free. Same tool as Fix Subtitles.',
  },
  // TRANSLATE SUBTITLES tree (SEO entry points; same tool as /translate-subtitles)
  '/subtitle-translator': {
    title: 'Subtitle Translator — SRT/VTT to Any Language | VideoText',
    description:
      'Translate SRT or VTT subtitles to 50+ languages. Upload, pick target language, download. Timestamps stay intact. Free tier.',
  },
  '/multilingual-subtitles': {
    title: 'Multilingual Subtitles — Multiple Languages from One File | VideoText',
    description:
      'Get subtitles in multiple languages. Translate SRT/VTT to Arabic, Hindi, Spanish, and more. One upload, many languages. Free tier.',
  },
  '/subtitle-language-checker': {
    title: 'Subtitle Language Checker — Detect and Translate | VideoText',
    description:
      'Check subtitle language and translate to another. Upload SRT/VTT, choose target language, download. Free tier available.',
  },
  // FIX SUBTITLES tree (SEO entry points; same tool as /fix-subtitles)
  '/subtitle-grammar-fixer': {
    title: 'Subtitle Grammar Fixer — Auto-Correct Caption Text | VideoText',
    description:
      'Fix grammar and formatting in SRT/VTT files. Upload subtitles, get corrected text and timing. Free. Same tool as Fix Subtitles.',
  },
  '/subtitle-line-break-fixer': {
    title: 'Subtitle Line Break Fixer — Fix Long Lines and Wrapping | VideoText',
    description:
      'Fix long lines and line breaks in SRT/VTT for readability and platform limits. Upload, download corrected file. Free.',
  },
  // BURN SUBTITLES tree (SEO entry points; same tool as /burn-subtitles)
  '/hardcoded-captions': {
    title: 'Hardcoded Captions — Burn Subtitles into Video | VideoText',
    description:
      'Burn SRT or VTT subtitles into your video. Upload video + subtitle file, get one video with hardcoded captions. Free tier.',
  },
  '/video-with-subtitles': {
    title: 'Video with Subtitles — Add Captions to Video | VideoText',
    description:
      'Add subtitles to video permanently. Upload video and SRT/VTT, get a single video with captions baked in. No signup for free tier.',
  },
  // COMPRESS VIDEO tree (SEO entry points; same tool as /compress-video)
  '/video-compressor': {
    title: 'Video Compressor — Reduce File Size Online | VideoText',
    description:
      'Compress video online: light, medium, or heavy. Reduce file size for sharing and uploads. Free. No signup required.',
  },
  '/reduce-video-size': {
    title: 'Reduce Video Size — Compress Without Losing Quality | VideoText',
    description:
      'Reduce video file size with adjustable compression. Upload, choose level, download smaller file. Free tier available.',
  },
  // BATCH PROCESSING tree (SEO entry points; same tool as /batch-process)
  '/batch-video-processing': {
    title: 'Batch Video Processing — Multiple Videos at Once | VideoText',
    description:
      'Process multiple videos in one batch. Upload many videos, get one ZIP of subtitle files. Pro and Agency plans. Same tool as Batch Process.',
  },
  '/bulk-subtitle-export': {
    title: 'Bulk Subtitle Export — SRT for Many Videos | VideoText',
    description:
      'Export SRT subtitles for many videos in one go. Upload multiple videos, download ZIP. Pro+ plans. Same tool as Batch Process.',
  },
  '/bulk-transcript-export': {
    title: 'Bulk Transcript Export — Text for Many Videos | VideoText',
    description:
      'Get transcripts for many videos in one batch. Upload multiple videos, receive one ZIP. Pro+ plans. Same tool as Batch Process.',
  },
}

/** JSON-LD Organization + WebApplication for rich results (homepage or global). */
export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'VideoText: AI-powered video to text and subtitle tools. Transcribe, generate SRT/VTT, translate, fix, burn subtitles, compress video. Paste URL or upload. Free tier.',
    sameAs: [],
  }
}

export function getWebApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'Free online tools: video to transcript, video to subtitles (SRT/VTT), translate subtitles, fix subtitles, burn subtitles, compress video. AI-powered. No signup.',
    applicationCategory: 'MultimediaApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}
