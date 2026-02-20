import { Link } from 'react-router-dom'
import {
  FileText,
  MessageSquare,
  Languages,
  Wrench,
  Film,
  Minimize2,
  FolderPlus,
  CheckCircle,
  ArrowRight,
  BookOpen,
} from 'lucide-react'

const TOOL_ICONS = {
  'Video → Transcript': FileText,
  'Video → Subtitles': MessageSquare,
  'Translate Subtitles': Languages,
  'Fix Subtitles': Wrench,
  'Burn Subtitles': Film,
  'Compress Video': Minimize2,
  'Batch Processing': FolderPlus,
} as const

type ToolKey = keyof typeof TOOL_ICONS

interface ToolGuide {
  key: ToolKey
  path: string
  title: string
  shortDesc: string
  howTo: string[]
  expected: { label: string; detail: string }[]
  features: string[]
}

/** URL-safe id for in-page anchors. */
const TOOL_SLUGS: Record<ToolKey, string> = {
  'Video → Transcript': 'video-to-transcript',
  'Video → Subtitles': 'video-to-subtitles',
  'Translate Subtitles': 'translate-subtitles',
  'Fix Subtitles': 'fix-subtitles',
  'Burn Subtitles': 'burn-subtitles',
  'Compress Video': 'compress-video',
  'Batch Processing': 'batch-process',
}

const TOOL_GUIDES: ToolGuide[] = [
  {
    key: 'Video → Transcript',
    path: '/video-to-transcript',
    title: 'Video → Transcript',
    shortDesc: 'Extract spoken text from any video. Get a full transcript, then explore summary, chapters, speakers, and more.',
    howTo: [
      'Upload a video file (MP4, MOV, AVI, WebM) or paste a video URL.',
      'Optionally trim the video to transcribe only a portion (saves time and usage).',
      'Click Start. We transcribe the audio with AI and show progress.',
      'When done, use the tabs: Transcript, Speakers, Summary, Chapters, Highlights, Keywords, Clean, and Exports.',
      'Use Translate to view the transcript in English, Hindi, Telugu, Spanish, Chinese, or Russian (in-app; no new file).',
      'Copy text or download (TXT, SRT, VTT; full exports like JSON/DOCX/PDF may require a paid plan).',
    ],
    expected: [
      { label: 'Input', detail: 'Video file (MP4, MOV, AVI, WebM) or a valid video URL.' },
      { label: 'Duration limits', detail: 'Free: 15 min max; Basic: 45 min; Pro: 2 h; Agency: 4 h. Longer videos may be rejected at upload.' },
      { label: 'File size', detail: 'Free: 2 GB; Basic: 5 GB; Pro: 10 GB; Agency: 20 GB.' },
    ],
    features: [
      'Full transcript with timestamps and editable segments.',
      'Summary (bullets, action items), Chapters (section headings with timestamps), Speakers (grouped by speaker when detectable).',
      'Highlights (definitions, conclusions, quotes), Keywords (repeated terms linked to sections).',
      'Clean view: filler words removed, casing normalized; original always in Transcript.',
      'Export as TXT, SRT, VTT; paid plans unlock JSON, CSV, Markdown, Notion, DOCX, PDF.',
    ],
  },
  {
    key: 'Video → Subtitles',
    path: '/video-to-subtitles',
    title: 'Video → Subtitles',
    shortDesc: 'Generate SRT or VTT subtitle files from video. Single or multi-language; ideal for YouTube and web.',
    howTo: [
      'Upload a video or paste a video URL.',
      'Choose output format: SRT or VTT.',
      'Select primary language. On Basic+ you can add more languages (we return a ZIP with one file per language).',
      'Click Start. When finished, download the subtitle file(s).',
      'Use "View in another language" to see plain-text translation in-app (for reading/copy); this does not create a new SRT/VTT file. For translated subtitle files, use Translate Subtitles or multi-language output.',
      'Use "Convert format" to turn the result into another format (SRT ↔ VTT ↔ TXT) without re-uploading the video.',
    ],
    expected: [
      { label: 'Input', detail: 'Video file or URL. Same duration and size limits as Video → Transcript.' },
      { label: 'Languages', detail: 'Free: 1; Basic: 2; Pro: 5; Agency: 10. Additional languages are generated in one job and returned as a ZIP.' },
    ],
    features: [
      'SRT and VTT output; optional multi-language ZIP.',
      'In-app translation viewer for reading/copy (plain text).',
      'Format conversion (SRT/VTT/TXT) from the result panel.',
      'Validation warnings (e.g. long lines, gaps) shown when relevant; processing is not blocked.',
    ],
  },
  {
    key: 'Translate Subtitles',
    path: '/translate-subtitles',
    title: 'Translate Subtitles',
    shortDesc: 'Translate existing SRT or VTT files to another language. Upload or paste; get a new subtitle file with same timestamps.',
    howTo: [
      'Upload an SRT or VTT file, or paste subtitle content.',
      'Select the source language (or leave as auto-detect) and the target language.',
      'Click Start. We translate the cue text and return a new SRT/VTT with the same timing.',
      'Download the translated file.',
    ],
    expected: [
      { label: 'Input', detail: 'SRT or VTT file, or pasted subtitle text. Format must be valid (numbered cues, timestamps).' },
      { label: 'Output', detail: 'Translated SRT or VTT with original timestamps; language and style may vary by plan.' },
    ],
    features: [
      '50+ target languages (e.g. Arabic, Hindi, Spanish, French).',
      'Timestamps preserved; only the text is translated.',
      'Works on files from any source (our tools or elsewhere).',
    ],
  },
  {
    key: 'Fix Subtitles',
    path: '/fix-subtitles',
    title: 'Fix Subtitles',
    shortDesc: 'Auto-correct timing, grammar, line breaks, and remove fillers in SRT/VTT files.',
    howTo: [
      'Upload an SRT or VTT file.',
      'We analyze it and show issues (overlaps, long lines, gaps). Optionally enable: Fix timing, Grammar fix, Line break fix, Remove fillers.',
      'Click Start. You get a corrected file (e.g. _fixed.srt) and a summary of changes.',
      'On paid plans you can edit segments in the editor before or after fixing.',
    ],
    expected: [
      { label: 'Input', detail: 'Valid SRT or VTT. We report overlapping cues, very long lines, and large gaps; you choose which fixes to apply.' },
      { label: 'Output', detail: 'Fixed SRT/VTT plus an optional list of issues/warnings (informational).' },
    ],
    features: [
      'Fix overlapping timestamps and gaps for YouTube and other platforms.',
      'Grammar and punctuation corrections, line break normalization.',
      'Remove filler words (um, uh, like, etc.) from cue text.',
      'Pro/Agency: in-app subtitle editor to tweak segments.',
    ],
  },
  {
    key: 'Burn Subtitles',
    path: '/burn-subtitles',
    title: 'Burn Subtitles',
    shortDesc: 'Hardcode subtitles into the video. One video + one SRT/VTT file; output is a single video with captions baked in.',
    howTo: [
      'Upload the video and the subtitle file (SRT or VTT) in the dual upload area.',
      'Optionally adjust styling if the tool offers it.',
      'Click Start. Processing encodes the subtitles into the video.',
      'Download the new video file (_subtitled.mp4).',
    ],
    expected: [
      { label: 'Input', detail: 'One video file and one SRT or VTT file. Same duration/size limits as other video tools for the video.' },
      { label: 'Output', detail: 'Single MP4 with burned-in subtitles; original file is not modified.' },
    ],
    features: [
      'Permanent captions visible on any player (no separate subtitle track needed).',
      'Useful for social media, archival, and players that do not support external subtitles.',
    ],
  },
  {
    key: 'Compress Video',
    path: '/compress-video',
    title: 'Compress Video',
    shortDesc: 'Reduce video file size with presets for web, mobile, or archive.',
    howTo: [
      'Upload a video or paste a URL.',
      'Choose compression profile: Web (smaller, good for sharing), Mobile, or Archive (higher quality, larger).',
      'Click Start. When done, download the compressed file.',
    ],
    expected: [
      { label: 'Input', detail: 'Video file or URL. Same duration and size limits as Video → Transcript.' },
      { label: 'Output', detail: 'Compressed MP4; size and quality depend on the profile and source.' },
    ],
    features: [
      'Presets tuned for web streaming, mobile, or archive.',
      'No re-encoding of subtitles; video-only compression.',
    ],
  },
  {
    key: 'Batch Processing',
    path: '/batch-process',
    title: 'Batch Processing',
    shortDesc: 'Process multiple videos to subtitles in one go. Pro and Agency only.',
    howTo: [
      'Upload multiple video files (or use the batch upload area).',
      'Set primary language and, on supported plans, additional languages.',
      'Start the batch. We process each video and pack results into one ZIP (SRT + derived VTT; errors logged in error_log.txt if any).',
      'Download the batch ZIP when all jobs complete.',
    ],
    expected: [
      { label: 'Availability', detail: 'Pro and Agency only. Free and Basic do not have batch access.' },
      { label: 'Limits', detail: 'Pro: up to 20 videos, 60 min total duration. Agency: up to 100 videos, 300 min total.' },
      { label: 'Output', detail: 'One ZIP per batch with one subtitle set per video; multi-language adds more files per video.' },
    ],
    features: [
      'One upload, one ZIP: all SRT (and VTT) in a single download.',
      'Same quality and options as Video → Subtitles per video.',
      'Error log included in ZIP when some videos fail.',
    ],
  },
]

/** Plan limits at a glance (authoritative summary; exact values in server/utils/limits.ts). */
const PLAN_LIMITS = [
  { plan: 'Free', minutes: '60/month', maxDuration: '15 min', maxSize: '2 GB', languages: '1', batch: '—' },
  { plan: 'Basic', minutes: '450/month', maxDuration: '45 min', maxSize: '5 GB', languages: '2', batch: '—' },
  { plan: 'Pro', minutes: '1,200/month', maxDuration: '2 h', maxSize: '10 GB', languages: '5', batch: '20 videos, 60 min total' },
  { plan: 'Agency', minutes: '3,000/month', maxDuration: '4 h', maxSize: '20 GB', languages: '10', batch: '100 videos, 300 min total' },
]

export default function Guide() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-9 h-9 text-violet-600 shrink-0" aria-hidden />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">How to use VideoText</h1>
            <p className="text-gray-600 mt-1">
              A practical guide to each tool: how to use it, what we expect, and what you get.
            </p>
          </div>
        </div>

        <p className="text-gray-700 mb-10">
          This guide is here so you can get the most out of VideoText. We explain step-by-step how each tool works,
          what inputs we expect, and what outputs and features you can rely on. For billing and privacy, see our{' '}
          <Link to="/faq" className="text-violet-600 hover:text-violet-700 font-medium">FAQ</Link> and{' '}
          <Link to="/privacy" className="text-violet-600 hover:text-violet-700 font-medium">Privacy Policy</Link>.
        </p>

        {/* Suggested workflows for creators */}
        <section className="mb-8 rounded-xl border border-violet-100 bg-violet-50/30 p-4 sm:p-6" aria-labelledby="workflows-heading">
          <h2 id="workflows-heading" className="text-base font-semibold text-gray-900 mb-3">Workflows</h2>
          <p className="text-sm text-gray-600 mb-4">
            Use &quot;Next step&quot; on each tool to continue with the same file — no re-upload.
          </p>
          <div className="grid gap-4 sm:grid-cols-1">
            <div className="rounded-lg bg-white/80 border border-violet-100/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-1.5">YouTubers</p>
              <p className="text-sm text-gray-700">
                <Link to="/video-to-transcript" className="text-violet-600 hover:text-violet-700 font-medium">Transcript</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/video-to-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Subtitles</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/translate-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Translate</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/burn-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Burn</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/compress-video" className="text-violet-600 hover:text-violet-700 font-medium">Compress</Link>
              </p>
            </div>
            <div className="rounded-lg bg-white/80 border border-violet-100/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-1.5">Editors</p>
              <p className="text-sm text-gray-700">
                <Link to="/video-to-transcript" className="text-violet-600 hover:text-violet-700 font-medium">Transcript</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/video-to-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Subtitles</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/fix-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Fix</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/burn-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Burn</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/compress-video" className="text-violet-600 hover:text-violet-700 font-medium">Compress</Link>
              </p>
            </div>
            <div className="rounded-lg bg-white/80 border border-violet-100/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-1.5">Clip editors</p>
              <p className="text-sm text-gray-700">
                Trim
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/video-to-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Subtitles</Link>
                <span className="text-gray-400 mx-1">/</span>
                <Link to="/video-to-transcript" className="text-violet-600 hover:text-violet-700 font-medium">Transcript</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/fix-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Fix</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/burn-subtitles" className="text-violet-600 hover:text-violet-700 font-medium">Burn</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/compress-video" className="text-violet-600 hover:text-violet-700 font-medium">Compress</Link>
              </p>
            </div>
          </div>
        </section>

        {/* Quick nav */}
        <nav className="mb-12 rounded-xl border border-gray-200 bg-white p-4" aria-label="Guide sections">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Tools in this guide</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {TOOL_GUIDES.map((g) => (
              <li key={g.path}>
                <a href={`#${TOOL_SLUGS[g.key]}`} className="text-violet-600 hover:text-violet-700 font-medium">
                  {g.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Per-tool sections */}
        <div className="space-y-14">
          {TOOL_GUIDES.map((guide) => {
            const Icon = TOOL_ICONS[guide.key]
            const id = TOOL_SLUGS[guide.key]
            return (
              <section key={guide.path} id={id} className="scroll-mt-24">
                <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-6 h-6 text-violet-600 shrink-0" aria-hidden />
                      <h2 className="text-xl font-bold text-gray-900">{guide.title}</h2>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{guide.shortDesc}</p>
                    <Link
                      to={guide.path}
                      className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700"
                    >
                      Open {guide.title}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="p-4 sm:p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-violet-600" aria-hidden />
                        How to use
                      </h3>
                      <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
                        {guide.howTo.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">What we expect</h3>
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {guide.expected.map((e, i) => (
                          <li key={i}>
                            <span className="font-medium text-gray-800">{e.label}:</span> {e.detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Features</h3>
                      <ul className="space-y-1 text-sm text-gray-700 list-disc list-inside">
                        {guide.features.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        {/* Plan limits table */}
        <section className="mt-14 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Plan limits at a glance</h2>
            <p className="text-sm text-gray-600 mt-1">
              Max video duration, file size, and languages depend on your plan. Exact limits are enforced at upload.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-900">Plan</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Minutes/month</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Max duration</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Max file size</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Languages</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Batch</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_LIMITS.map((row) => (
                  <tr key={row.plan} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.plan}</td>
                    <td className="px-4 py-3 text-gray-700">{row.minutes}</td>
                    <td className="px-4 py-3 text-gray-700">{row.maxDuration}</td>
                    <td className="px-4 py-3 text-gray-700">{row.maxSize}</td>
                    <td className="px-4 py-3 text-gray-700">{row.languages}</td>
                    <td className="px-4 py-3 text-gray-700">{row.batch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 font-medium"
          >
            ← All tools
          </Link>
        </div>
      </div>
    </div>
  )
}
