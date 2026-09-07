/** ACQUISITION + CONVERSION FUNNEL (CORRECTED)
 *
 * Layer 1: Intent Pages (37 pages) — TRAFFIC GENERATORS
 * └─ Capture search traffic for specific intents
 * └─ Examples: /podcast-transcription, /korean-transcription, /youtube-transcript
 * └─ Each has CTA linking to money page
 *
 * Layer 2: Money Pages (8 pages) — CONVERSION HUBS
 * └─ Where users actually upgrade and convert
 * └─ Examples: /video-to-transcript, /translate-subtitles
 *
 * FLOW: Intent Page → CTA → Money Page → Revenue
 */
import type { SeoRegistryEntry, FaqItem } from './seoRegistry'
import { transcriptionTargets, targetToSlug, slugToTitle } from '../data/seoPages'
import { getContextualCta, getRouteFamily } from './routeFamilyTemplates'

// Only these targets should generate intent pages (not money pages)
const INTENT_PAGE_TARGETS = new Set([
  'podcast', 'meeting', 'interview', 'lecture',
  'zoom-recording', 'google-meet', 'teams-meeting', 'video-interview',
  'youtube-video', 'youtube', 'instagram-reel', 'tiktok', 'loom', 'vimeo', 'riverside',
  'korean', 'japanese', 'chinese', 'german', 'spanish', 'french', 'arabic', 'portuguese', 'hindi',
])

const INTENT_PATTERNS: Array<{
  pattern: (slug: string) => string
  toolKey: 'video-to-transcript' | 'video-to-subtitles'
  titleTmpl: (target: string) => string
  descTmpl: (target: string) => string
  h1Tmpl: (target: string) => string
}> = [
  {
    pattern: (s) => `/${s}-transcription`,
    toolKey: 'video-to-transcript',
    titleTmpl: (t) => `${t} Transcription – Online | VideoText`,
    descTmpl: (t) => `Transcribe ${t} to text. Get transcripts with speaker labels. Export SRT, TXT. Free tier.`,
    h1Tmpl: (t) => `${t} Transcription`,
  },
]

const DEFAULT_FAQ: FaqItem[] = [
  { q: 'How do I transcribe this?', a: 'Upload or paste a URL. Click Transcribe and get a full transcript in seconds. Export as SRT, TXT.' },
  { q: 'How do I test the workflow?', a: 'Use a short real recording first, then compare transcript structure, speaker labels, subtitles, and cleanup time before moving longer files through the same workflow.' },
  { q: 'What formats can I export?', a: 'TXT, SRT, VTT. Paid plans add JSON, CSV, Markdown.' },
]

/** Money pages — don't generate, they're in manual registry. */
const EXISTING_PATHS = new Set([
  '/video-to-transcript', '/video-to-subtitles', '/youtube-transcript-generator',
  '/translate-subtitles', '/fix-subtitles', '/burn-subtitles', '/compress-video', '/voice-recorder',
  // Also skip alternatives — they're manually curated
  '/descript-alternative', '/otter-ai-alternative', '/rev-alternative', '/trint-alternative',
  '/turboscribe-alternative', '/buzz-alternative', '/deepgram-alternative', '/assembly-ai-alternative',
  '/krisp-alternative', '/tactiq-alternative', '/happyscribe-alternative', '/headliner-alternative',
  '/castmagic-alternative', '/riverside-alternative',
  // Non-canonical variants (indexable: false) — skip programmatic generation (46 pages with canonical redirects)
  '/youtube-transcript', '/youtube-video-transcript', '/transcribe-youtube-video', '/youtube-to-text',
  '/mp4-to-text', '/mp4-to-srt', '/subtitle-generator', '/srt-translator', '/speaker-diarization',
  '/video-summary-generator', '/video-chapters-generator', '/keyword-indexed-transcript',
  '/srt-to-vtt', '/subtitle-converter', '/subtitle-timing-fixer', '/subtitle-validation',
  '/subtitle-translator', '/multilingual-subtitles', '/subtitle-language-checker',
  '/subtitle-grammar-fixer', '/subtitle-line-break-fixer', '/hardcoded-captions',
  '/video-with-subtitles', '/video-compressor', '/reduce-video-size', '/batch-video-processing',
  '/bulk-subtitle-export', '/bulk-transcript-export', '/bulk-video-transcription',
  '/transcribe-video', '/video-transcription', '/free-transcription', '/online-transcription',
  '/ai-transcription', '/audio-to-text', '/zoom-meeting-transcript',
  '/meeting-recording-to-transcript', '/interview-transcription', '/automatic-subtitles',
  '/caption-generator', '/closed-caption-generator', '/free-subtitle-generator', '/video-to-srt',
  '/srt-generator', '/webinar-transcription', '/meeting-transcription-tool',
])

/** Generate intent pages with proper topical authority linking.
 * Each page:
 * - Links to 4-6 SIBLINGS (same cluster)
 * - Links to HUB page (money page)
 * - Links to RELATED tools (cross-cluster)
 * - Includes DEEP CONTENT (proof, workflow, use cases)
 */
export function getProgrammaticSeoEntries(): SeoRegistryEntry[] {
  const entries: SeoRegistryEntry[] = []
  const seenPaths = new Set<string>(EXISTING_PATHS)

  // Define topical clusters and sibling relationships
  const clusters = {
    'podcast|meeting|interview|webinar|lecture|zoom|google-meet|teams|video-interview': {
      hub: '/video-to-transcript',
      siblings: [
        '/podcast-transcription', '/meeting-transcription', '/interview-transcription',
        '/webinar-transcription', '/lecture-transcription', '/google-meet-transcription',
        '/teams-meeting-transcription', '/zoom-recording-transcription',
      ],
    },
    'korean|japanese|chinese|german|spanish|french|arabic|portuguese|hindi': {
      hub: '/translate-subtitles',
      siblings: [
        '/korean-transcription', '/japanese-transcription', '/chinese-transcription',
        '/german-transcription', '/spanish-transcription', '/french-transcription',
        '/arabic-transcription', '/portuguese-transcription', '/hindi-transcription',
      ],
    },
    'youtube|instagram|tiktok|loom|vimeo|riverside': {
      hub: '/youtube-transcript-generator',
      siblings: [
        '/youtube-transcription', '/instagram-reel-transcription', '/tiktok-transcription',
        '/loom-transcription', '/vimeo-transcription', '/riverside-transcription',
      ],
    },
  }

  // Deep content templates by category
  const deepContentByCategory = {
    podcast: {
      proofPoints: [
        'Used by 12,000+ podcasters for episode transcription',
        '98.5% accuracy on clear speech vs 88% of competitors',
        'Results in 2-5 minutes — 10x faster than Descript',
        'Speaker labels included automatically',
        'Free tier: 3 imports/month, no credit card required',
      ],
      workflowSteps: [
        { title: 'Step 1: Download podcast file', detail: 'Get your MP3/M4A from Anchor, Spotify, Apple Podcasts, or your podcast host.' },
        { title: 'Step 2: Upload to VideoText', detail: 'Paste the file — upload takes under 30 seconds for typical episodes.' },
        { title: 'Step 3: Get instant transcript', detail: 'AI transcription runs in background. For 1-hour podcast, transcript ready in 2-5 minutes.' },
        { title: 'Step 4: Download & repurpose', detail: 'Get TXT for show notes, SRT for clips, or share a read-only link with your team.' },
        { title: 'Step 5: Translate (optional)', detail: 'Translate transcripts to 70+ languages for international listeners in one click.' },
      ],
      useCases: [
        { title: 'Content creators: Weekly show notes', body: 'Stop manually typing show notes. Upload your podcast file, get a full transcript in minutes. Copy-paste into your blog or email.' },
        { title: 'Accessibility: Support hearing-impaired listeners', body: 'Add full transcripts to your show page or embed them in video players. Make every episode searchable and accessible.' },
        { title: 'SEO: Unlock long-tail keywords', body: 'Transcripts = searchable text. Every word in your podcast becomes indexable. Expect 20-40% more organic traffic from new keyword coverage.' },
        { title: 'Repurposing: Turn episodes into blog posts', body: 'Transcript + AI summary = blog article draft. One podcast, 5 content assets: clips, quotes, infographics, social snippets.' },
      ],
    },
    meeting: {
      proofPoints: [
        'Processes 5,000+ meeting recordings monthly',
        'Supports Zoom, Teams, Google Meet, and all MP4 recordings',
        'Automatic speaker identification (who said what)',
        'AI-generated summaries and action items included',
        'Files deleted immediately after processing — no storage',
      ],
      workflowSteps: [
        { title: 'Step 1: Download your meeting recording', detail: 'From Zoom cloud, local storage, Google Meet, or Teams. File formats: MP4, MOV, WebM.' },
        { title: 'Step 2: Upload to VideoText', detail: 'Upload takes 30-60 seconds for typical 30-60 min meetings.' },
        { title: 'Step 3: Get full transcript + summary', detail: 'Transcript with timestamps ready in 2-5 minutes. Optional: AI-generated action items and key decisions.' },
        { title: 'Step 4: Share with team', detail: 'Email the transcript, share a read-only link, or export to Slack/Notion.' },
        { title: 'Step 5: Create action items', detail: 'Use the summary to identify next steps. Copy/paste into project management tool.' },
      ],
      useCases: [
        { title: 'Team leads: Create meeting notes instantly', body: 'No more hours typing notes. Upload the recording, get transcript + summary in 5 minutes. Share with team.' },
        { title: 'Remote workers: Catch up on meetings you missed', body: 'Can\'t make a live meeting? Search the transcript later. Find the exact moment a decision was made.' },
        { title: 'Compliance: Maintain audit trails', body: 'Meeting recordings transcribed and stored for compliance, legal, or quality assurance purposes.' },
        { title: 'Product management: Extract feedback', body: 'Transcript of customer meetings = direct customer voice. Search for specific feature requests or pain points.' },
      ],
    },
    interview: {
      proofPoints: [
        'Perfect for podcast interviews, customer interviews, and video content',
        'Automatic speaker diarization (who said what)',
        'Timestamps pinpoint exact moments in interviews',
        'Export as readable transcript or searchable index',
        '98.5% accuracy even with background noise',
      ],
      workflowSteps: [
        { title: 'Step 1: Record your interview', detail: 'Use any recording tool: Zoom, Riverside, OBS, or record with your phone.' },
        { title: 'Step 2: Upload to VideoText', detail: 'Upload your file. Typical interviews (30-60 min) upload in 30-60 seconds.' },
        { title: 'Step 3: Get timestamped transcript', detail: 'Full transcript with speaker labels ready in 2-5 minutes.' },
        { title: 'Step 4: Extract key quotes', detail: 'Use timestamps to find and quote your interviewee exactly. No transcription errors.' },
        { title: 'Step 5: Repurpose content', detail: 'Transcript → blog post, video clips, social quotes, email newsletter in minutes.' },
      ],
      useCases: [
        { title: 'Journalists & researchers: Accurate quotes', body: 'Get precise transcripts with timestamps. Quote your sources accurately. Never lose a quote again.' },
        { title: 'Podcasters: Turn interviews into assets', body: 'Transcript + summary + chapters = multiple content pieces. One interview → 5 assets.' },
        { title: 'HR & hiring: Interview documentation', body: 'Document interviews for compliance or candidate feedback. Ensure consistent, accurate hiring records.' },
        { title: 'Market researchers: Extract insights', body: 'Search interviews for themes, patterns, and customer insights. Summarize findings in seconds.' },
      ],
    },
    youtube: {
      proofPoints: [
        '10+ million YouTube videos transcribed',
        'Paste URL directly — no download required',
        'Whisper technology: 98.5% accuracy',
        'Works with YouTube Shorts, playlists, and live streams',
        'Results in 1-3 minutes regardless of video length',
      ],
      workflowSteps: [
        { title: 'Step 1: Copy your YouTube URL', detail: 'Get the link from youtube.com, youtu.be, or YouTube app. Works with Shorts and regular videos.' },
        { title: 'Step 2: Paste into VideoText', detail: 'Paste the URL directly. No video download needed.' },
        { title: 'Step 3: Get instant transcript', detail: 'AI streams audio directly from YouTube and transcribes in parallel. Ready in 1-3 minutes.' },
        { title: 'Step 4: Download or share', detail: 'Export as TXT, SRT, VTT, or share a read-only link. All formats include timestamps.' },
        { title: 'Step 5: Repurpose for SEO', detail: 'Add transcript to video description or companion blog post. Every word now searchable by Google.' },
      ],
      useCases: [
        { title: 'Content creators: Boost SEO with transcripts', body: 'Add full transcript to video description or blog. YouTube video can\'t be indexed by Google — but text can. 20-40% traffic increase expected.' },
        { title: 'Learning platforms: Make videos accessible', body: 'Add transcripts to educational videos. Support hearing-impaired learners. Improve completion rates.' },
        { title: 'Marketing teams: Repurpose YouTube content', body: 'Transcript = blog post, email, social snippets, infographics. One video, 10 assets.' },
        { title: 'Researchers: Archive and cite video content', body: 'Create searchable text from video. Find exact moments. Use in papers, reports, presentations.' },
      ],
    },
    language: {
      proofPoints: [
        'Native-level accuracy for 99 languages',
        'Trained on diverse accents and dialects',
        'Whisper model handles background noise well',
        'No text editing typically needed',
        'Works for subtitles, transcripts, and translations',
      ],
      workflowSteps: [
        { title: 'Step 1: Upload your audio/video file', detail: 'Any format: MP3, M4A, MP4, WebM. We handle conversion automatically.' },
        { title: 'Step 2: Select the language', detail: 'Choose from 99 supported languages. Auto-detect works, but manual selection improves accuracy for accented speech.' },
        { title: 'Step 3: Get transcription', detail: 'AI processes in 2-5 minutes. Native-language accuracy even for regional accents and dialects.' },
        { title: 'Step 4: Export or translate', detail: 'Get transcript in original language, then optionally translate to 70+ other languages.' },
        { title: 'Step 5: Use in content', detail: 'Create subtitles, add to blog, build translated content, improve accessibility.' },
      ],
      useCases: [
        { title: 'Multilingual content creators: Expand global reach', body: 'Transcribe in original language, translate to 5+ languages. Reach audiences worldwide with accurate, native content.' },
        { title: 'International companies: Localize video content', body: 'Transcribe presentations, webinars, training videos in any language. Build subtitle tracks for each market.' },
        { title: 'Language learners: Learn by example', body: 'Transcripts of native speakers in target language. Perfect for language learning and cultural content.' },
        { title: 'Accessibility: Serve non-English speakers', body: 'Make your content accessible in the language your audience speaks. No assumptions, pure inclusivity.' },
      ],
    },
    platform: {
      proofPoints: [
        'Platform-agnostic tool works with any source',
        'Optimized workflows for each platform',
        'Export formats for direct upload to platforms',
        'No platform-specific setup or authentication',
        'Works with archived and deleted platform content',
      ],
      workflowSteps: [
        { title: 'Step 1: Get the file from your platform', detail: 'Download from Instagram, TikTok, Loom, Vimeo, or your platform of choice.' },
        { title: 'Step 2: Upload to VideoText', detail: 'Upload the file directly. Typical files process in 2-5 minutes.' },
        { title: 'Step 3: Get transcript & subtitles', detail: 'Full transcript with timestamps and optional SRT/VTT subtitle file ready.' },
        { title: 'Step 4: Re-upload with subtitles', detail: 'Add subtitles back to your platform for better engagement and accessibility.' },
        { title: 'Step 5: Repurpose across platforms', detail: 'One video → subtitled version for Instagram, TikTok, YouTube with transcripts.' },
      ],
      useCases: [
        { title: 'Content creators: Cross-platform distribution', body: 'Create once, transcribe once, subtitle for all platforms. Same content, multiple destinations.' },
        { title: 'Video marketers: Track performance with transcripts', body: 'Searchable transcripts let you analyze what gets watched, rewound, and shared.' },
        { title: 'Accessibility: Support all viewers', body: 'Add captions for deaf/hard-of-hearing viewers. Studies show captioned videos get 15-20% more engagement.' },
        { title: 'Archiving: Future-proof your content', body: 'Create independent transcript backups of platform content. Never lose your words to algorithm changes.' },
      ],
    },
  }

  // Helper to find cluster for a slug
  function findCluster(slug: string) {
    for (const [pattern, cluster] of Object.entries(clusters)) {
      if (pattern.split('|').some(p => slug.includes(p))) {
        return cluster
      }
    }
    return { hub: '/video-to-transcript', siblings: [] }
  }

  // Helper to get category for deep content
  function getCategoryKey(slug: string): keyof typeof deepContentByCategory {
    if (slug.includes('podcast')) return 'podcast'
    if (slug.includes('meeting') || slug.includes('zoom') || slug.includes('teams') || slug.includes('google-meet')) return 'meeting'
    if (slug.includes('interview')) return 'interview'
    if (slug.includes('youtube') || slug.includes('instagram') || slug.includes('tiktok') || slug.includes('vimeo') || slug.includes('loom') || slug.includes('riverside')) return 'youtube'
    if (slug.includes('korean') || slug.includes('japanese') || slug.includes('chinese') || slug.includes('spanish') || slug.includes('french') || slug.includes('german') || slug.includes('arabic') || slug.includes('portuguese') || slug.includes('hindi')) return 'language'
    return 'platform'
  }

  function personalizeDeepContent(
    categoryContent: (typeof deepContentByCategory)[keyof typeof deepContentByCategory],
    slug: string,
    titleCase: string,
  ) {
    const topic = titleCase.toLowerCase()
    const workflowContext = slug.includes('korean') || slug.includes('japanese') || slug.includes('chinese') || slug.includes('spanish') || slug.includes('french') || slug.includes('german') || slug.includes('arabic') || slug.includes('portuguese') || slug.includes('hindi')
      ? `${titleCase} speech, subtitles, and translated transcript handoffs`
      : `${topic} recordings, captions, summaries, and searchable transcript exports`

    return {
      proofPoints: categoryContent.proofPoints.map((point, index) => {
        if (index === 0) return `${titleCase} workflow: ${point}`
        if (index === 2) return `${point} for ${topic} files and team review`
        return point
      }),
      workflowSteps: categoryContent.workflowSteps.map((step, index) => ({
        ...step,
        title: step.title.replace(':', ` for ${titleCase}:`),
        detail: index === 2
          ? `${step.detail} The result stays organized for ${workflowContext}.`
          : step.detail.replace(/your (audio\/video file|meeting recording|interview|YouTube URL|file from your platform)/i, `your ${topic} source`),
      })),
      useCases: categoryContent.useCases.map((useCase, index) => ({
        ...useCase,
        title: useCase.title.includes(':') ? useCase.title.replace(':', ` — ${titleCase}:`) : `${useCase.title} for ${titleCase}`,
        body: index === 0
          ? `${useCase.body} Use the ${topic} transcript as the source of truth for editing, publishing, and handoff.`
          : useCase.body.replace(/Transcript/g, `${titleCase} transcript`),
      })),
    }
  }

  // Helper to generate keywords for SEO entries
  function generateKeywords(slug: string, titleCase: string): string[] {
    const baseKeywords = [
      `${titleCase} transcription`,
      `transcribe ${titleCase}`,
      `${titleCase} to text`,
      `free ${titleCase} transcription`,
      `${titleCase} transcript online`,
      `AI ${titleCase} transcription`,
      `best ${titleCase} transcription tool`,
      `how to transcribe ${titleCase}`,
    ]

    const categoryKeywords: Record<string, string[]> = {
      podcast: ['podcast transcription', 'episode transcription', 'podcast to text', 'transcribe podcast free', 'mp3 to text'],
      meeting: ['meeting transcription', 'meeting notes', 'recording to transcript', 'convert meeting to text', 'transcribe meeting'],
      interview: ['interview transcription', 'interview to text', 'transcribe interview', 'interview recording to text'],
      youtube: ['youtube transcription', 'youtube to text', 'transcribe youtube video', 'youtube video to text'],
      language: [`${titleCase} transcript`, `transcribe ${titleCase}`, `${titleCase} audio to text`],
      zoom: ['zoom recording transcription', 'zoom to text', 'transcribe zoom call'],
      'google-meet': ['google meet transcription', 'meet recording to text'],
      teams: ['teams meeting transcription', 'teams recording to text'],
      instagram: ['instagram reel transcription', 'transcribe instagram video'],
      tiktok: ['tiktok transcription', 'tiktok to text'],
      loom: ['loom recording transcription', 'transcribe loom video'],
      vimeo: ['vimeo transcription', 'transcribe vimeo video'],
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (slug.includes(category)) {
        return [...new Set([...baseKeywords, ...keywords])].slice(0, 13)
      }
    }

    return baseKeywords
  }

  for (const target of transcriptionTargets) {
    const slug = targetToSlug(target)

    if (!INTENT_PAGE_TARGETS.has(slug)) continue

    const titleCase = slugToTitle(slug)
    const cluster = findCluster(slug)
    const categoryKey = getCategoryKey(slug)
    const categoryContent = deepContentByCategory[categoryKey]

    for (const { pattern, toolKey, titleTmpl, descTmpl, h1Tmpl } of INTENT_PATTERNS) {
      const path = pattern(slug)
      if (seenPaths.has(path)) continue
      seenPaths.add(path)

      const intentKey = path.slice(1).replace(/\//g, '-')

      // Build related slugs: hub + siblings + cross-cluster tools
      const relatedSlugs = [
        cluster.hub, // Always link back to hub
        // Link to 3-4 siblings (avoid linking to itself)
        ...cluster.siblings.filter(s => s !== path).slice(0, 4),
        // Cross-cluster: link to subtitle/translation tools
        ...(slug.includes('language') || slug.includes('korean') ? ['/video-to-subtitles', '/translate-subtitles'] : ['/video-to-subtitles']),
      ].filter((v, i, a) => a.indexOf(v) === i) // dedupe

      const cta = getContextualCta(getRouteFamily(path), path, 'footer')

      entries.push({
        path,
        title: titleTmpl(titleCase),
        description: descTmpl(titleCase),
        h1: h1Tmpl(titleCase),
        intro: `Convert ${titleCase.toLowerCase()} into searchable transcript output with speaker labels, timestamps, and export-ready subtitle files from the same workflow.`,
        faq: DEFAULT_FAQ,
        breadcrumbLabel: h1Tmpl(titleCase),
        toolKey,
        relatedSlugs, // Hub + siblings + cross-cluster links
        indexable: true,
        intentKey,
        keywords: generateKeywords(slug, titleCase),
        deepContent: {
          ...personalizeDeepContent(categoryContent, slug, titleCase),
          ctaText: cta.text,
          ctaPath: cta.path || cluster.hub,
        },
      })
    }
  }

  return entries
}

/** All programmatic paths (for routing, sitemap). */
export function getProgrammaticPaths(): string[] {
  return getProgrammaticSeoEntries().map((e) => e.path)
}
