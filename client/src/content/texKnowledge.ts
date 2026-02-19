/**
 * Tex (mascot) SME knowledge base.
 * Used by TexAgent to answer questions about tools, plans, and flows.
 * All content is static; no API calls. Replace or extend entries as needed.
 */

export interface TexEntry {
  id: string
  keywords: string[]
  question: string
  answer: string
  link?: { path: string; label: string }
}

export interface TexSuggestion {
  label: string
  entryId: string
}

/** SME entries: tools, plans, how-to, troubleshooting */
export const TEX_ENTRIES: TexEntry[] = [
  // —— Getting started ——
  {
    id: 'what-is-videotext',
    keywords: ['what is', 'what is videotext', 'overview', 'intro', 'hello', 'hi'],
    question: 'What is VideoText?',
    answer:
      "VideoText turns video into text and subtitles. You get transcripts, SRT/VTT subtitles, translation, and more. No signup to try—just drop a file or paste a URL. We don't store your data.",
    link: { path: '/', label: 'Go to home' },
  },
  {
    id: 'how-it-works',
    keywords: ['how it works', 'how does it work', 'process', 'workflow', 'steps'],
    question: 'How does it work?',
    answer:
      'Upload your video (or paste a URL), we process it with AI, and you download the result. For transcripts you can get summary, chapters, and speaker labels. For subtitles you pick language and format (SRT or VTT).',
    link: { path: '/#how-it-works', label: 'See how it works' },
  },
  {
    id: 'no-signup',
    keywords: ['signup', 'sign up', 'account', 'register', 'no signup', 'free trial'],
    question: 'Do I need to sign up?',
    answer:
      "No. You can use the free tools without creating an account. When you're ready for more minutes or features (like batch or no watermark), you'll use your email to subscribe.",
    link: { path: '/pricing', label: 'See plans' },
  },
  // —— Tools ——
  {
    id: 'tool-transcript',
    keywords: ['transcript', 'transcription', 'video to text', 'speech to text', 'mp4 to text'],
    question: 'How does Video → Transcript work?',
    answer:
      'Upload a video and we extract the spoken words into text. You get a transcript and can add an AI summary, chapters, and speaker labels. Export as TXT, JSON, DOCX, or PDF. Supports trimming and optional glossary for better accuracy.',
    link: { path: '/video-to-transcript', label: 'Try Video → Transcript' },
  },
  {
    id: 'tool-subtitles',
    keywords: ['subtitles', 'captions', 'srt', 'vtt', 'video to subtitles', 'subtitle generator'],
    question: 'How does Video → Subtitles work?',
    answer:
      'Upload a video and we generate SRT or VTT subtitle files with timestamps. You choose the language (or auto-detect). On paid plans you can get multiple languages at once. Free tier adds a small watermark to the file.',
    link: { path: '/video-to-subtitles', label: 'Try Video → Subtitles' },
  },
  {
    id: 'tool-translate',
    keywords: ['translate', 'translation', 'arabic', 'hindi', 'translate subtitles', 'srt translator'],
    question: 'How does Translate Subtitles work?',
    answer:
      'Upload an SRT or VTT file (or paste text) and choose a target language. We translate the text while keeping timestamps intact. Supports Arabic, Hindi, and more. Great for making content accessible in multiple languages.',
    link: { path: '/translate-subtitles', label: 'Try Translate Subtitles' },
  },
  {
    id: 'tool-fix',
    keywords: ['fix subtitles', 'timing', 'sync', 'format', 'errors', 'fix srt'],
    question: 'How does Fix Subtitles work?',
    answer:
      'Upload subtitles that have timing or formatting issues and we clean them up: fix sync, line breaks, and common errors. Useful when captions are out of sync or poorly formatted.',
    link: { path: '/fix-subtitles', label: 'Try Fix Subtitles' },
  },
  {
    id: 'tool-burn',
    keywords: ['burn', 'burn subtitles', 'hardcode', 'burn captions', 'embed'],
    question: 'How does Burn Subtitles work?',
    answer:
      'We merge your subtitle file (SRT/VTT) into the video so captions are baked in. Good for social media or players that don’t support external subtitles. You get a new video file with captions visible.',
    link: { path: '/burn-subtitles', label: 'Try Burn Subtitles' },
  },
  {
    id: 'tool-compress',
    keywords: ['compress', 'reduce size', 'shrink video', 'file size', 'compress video'],
    question: 'How does Compress Video work?',
    answer:
      'Upload a video and we reduce file size while keeping quality high. Useful when you need to meet size limits or save bandwidth. Output is typically MP4.',
    link: { path: '/compress-video', label: 'Try Compress Video' },
  },
  {
    id: 'tool-batch',
    keywords: ['batch', 'batch process', 'multiple videos', 'bulk', 'many videos'],
    question: 'How does Batch Processing work?',
    answer:
      'Upload multiple videos and process them in one go (transcript or subtitles). Available on Pro and Agency plans. Pro: up to 20 videos per batch, 60 min per batch. Agency: up to 100 videos, 300 min per batch.',
    link: { path: '/batch-process', label: 'Try Batch Processing' },
  },
  // —— Pricing & plans ——
  {
    id: 'plan-free',
    keywords: ['free', 'free plan', 'free tier', '60 min', 'free limit'],
    question: 'What’s included in the free plan?',
    answer:
      'Free: 60 minutes per month, up to 15 min per video. Video → Transcript and Video → Subtitles, one language, watermark on subtitle exports. No batch. No signup required to start.',
    link: { path: '/pricing', label: 'See pricing' },
  },
  {
    id: 'plan-basic',
    keywords: ['basic', 'basic plan', '$19', '19'],
    question: 'What’s in the Basic plan?',
    answer:
      'Basic ($19/mo): 450 min/month, up to 45 min per video. No watermark, 2 languages, subtitle editing. No batch. Good for individuals and light use.',
    link: { path: '/pricing', label: 'See Basic' },
  },
  {
    id: 'plan-pro',
    keywords: ['pro', 'pro plan', '$49', '49', 'batch', '1200', '1200 min'],
    question: 'What’s in the Pro plan?',
    answer:
      'Pro ($49/mo): 1,200 min/month, up to 120 min per video. Batch processing (20 videos, 60 min per batch), 5 languages, long-form support, priority queue. Best for serious creators.',
    link: { path: '/pricing', label: 'See Pro' },
  },
  {
    id: 'plan-agency',
    keywords: ['agency', 'agency plan', '$129', '129', 'team', 'commercial', 'zip'],
    question: 'What’s in the Agency plan?',
    answer:
      'Agency ($129/mo): 3,000 min/month, up to 240 min per video. Heavy batch (100 videos, 300 min per batch), ZIP exports, 10 languages, commercial use allowed. For teams and agencies.',
    link: { path: '/pricing', label: 'See Agency' },
  },
  {
    id: 'upgrade',
    keywords: ['upgrade', 'need more', 'limit', 'run out', 'minutes', 'pay'],
    question: 'I need more minutes. How do I upgrade?',
    answer:
      'Go to Pricing, pick Basic, Pro, or Agency, and enter your email. We’ll send a verification code, then you complete checkout. You can change or cancel your plan anytime from the same page.',
    link: { path: '/pricing', label: 'Go to pricing' },
  },
  // —— Privacy & data ——
  {
    id: 'privacy',
    keywords: ['privacy', 'data', 'store', 'keep', 'delete', 'we don’t store'],
    question: 'Do you store my files?',
    answer:
      "We don’t store your uploads or outputs. Files are processed and then deleted. Your content stays yours. For details, see our Privacy Policy.",
    link: { path: '/privacy', label: 'Privacy Policy' },
  },
  // —— Troubleshooting ——
  {
    id: 'failed-job',
    keywords: ['failed', 'error', 'didn’t work', 'processing failed', 'something went wrong'],
    question: 'My job failed. What should I do?',
    answer:
      'Try again with the same file—transient errors can happen. If it still fails, check: file format (we support MP4, MOV, AVI, WebM, MKV), file size and length within your plan limits, and a stable connection. For limits, see Pricing.',
    link: { path: '/pricing', label: 'Check plan limits' },
  },
  {
    id: 'formats',
    keywords: ['format', 'formats', 'file type', 'mp4', 'srt', 'vtt', 'supported'],
    question: 'What file formats are supported?',
    answer:
      'Videos: MP4, MOV, AVI, WebM, MKV. Subtitles: SRT and VTT. You can also paste a video URL on supported tools. Output is usually transcript (TXT, JSON, DOCX, PDF) or SRT/VTT.',
  },
  {
    id: 'support',
    keywords: ['help', 'support', 'contact', 'email', 'problem', 'issue'],
    question: 'How do I get help?',
    answer:
      'Use “Email support” in the menu (top-right) to reach us. For how each tool works and what to expect, check the Guide and FAQ.',
    link: { path: '/faq', label: 'FAQ' },
  },
]

/** Suggested questions shown in the agent panel (map to entry ids) */
export const TEX_SUGGESTIONS: TexSuggestion[] = [
  { label: 'What is VideoText?', entryId: 'what-is-videotext' },
  { label: 'How does transcription work?', entryId: 'tool-transcript' },
  { label: 'What’s in the free plan?', entryId: 'plan-free' },
  { label: 'Pro vs Basic — what’s the difference?', entryId: 'plan-pro' },
  { label: 'Do you store my data?', entryId: 'privacy' },
  { label: 'My job failed — what do I do?', entryId: 'failed-job' },
  { label: 'How do I upgrade?', entryId: 'upgrade' },
]

const entryById = new Map(TEX_ENTRIES.map((e) => [e.id, e]))

export function getTexEntryById(id: string): TexEntry | undefined {
  return entryById.get(id)
}

/**
 * Find best-matching entry for user input (keyword match).
 * Used when user types a question. No API calls.
 */
export function findTexEntryForQuery(query: string): TexEntry | undefined {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return undefined

  let best: { entry: TexEntry; score: number } | null = null
  for (const entry of TEX_ENTRIES) {
    let score = 0
    for (const kw of entry.keywords) {
      if (normalized.includes(kw.toLowerCase())) score += 1
      if (normalized === kw.toLowerCase()) score += 3
    }
    if (entry.question.toLowerCase().includes(normalized) || normalized.includes(entry.question.toLowerCase().slice(0, 20))) score += 2
    if (score > 0 && (!best || score > best.score)) best = { entry, score }
  }
  return best?.entry
}
