import { Link } from 'react-router-dom'
import {
  FileText,
  MessageSquare,
  Languages,
  Wrench,
  Film,
  Minimize2,
  FolderPlus,
  Mic,
  CheckCircle,
  ArrowRight,
  BookOpen,
  ClipboardCheck,
} from 'lucide-react'

const TOOL_ICONS = {
  'Voice → Text': Mic,
  'YouTube → Transcript': FileText,
  'Video → Transcript': FileText,
  'Format → Client guidelines': ClipboardCheck,
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
  'Voice → Text': 'voice-recorder',
  'YouTube → Transcript': 'youtube-transcript',
  'Video → Transcript': 'video-to-transcript',
  'Format → Client guidelines': 'guideline-format',
  'Video → Subtitles': 'video-to-subtitles',
  'Translate Subtitles': 'translate-subtitles',
  'Fix Subtitles': 'fix-subtitles',
  'Burn Subtitles': 'burn-subtitles',
  'Compress Video': 'compress-video',
  'Batch Processing': 'batch-process',
}

const TOOL_GUIDES: ToolGuide[] = [
  {
    key: 'Voice → Text',
    path: '/voice-recorder',
    title: 'Voice → Text',
    shortDesc: 'Record your voice directly in the browser and get an accurate transcript in seconds. No file, no upload, no account required to try.',
    howTo: [
      'Open the Voice to Text tool — no account or app needed.',
      'Click the microphone button and allow browser microphone access when prompted.',
      'Speak naturally. The waveform confirms your mic is working. Background noise is filtered automatically.',
      'Click the red stop button when done (or the recorder stops automatically at 60 minutes).',
      'Your audio uploads in the background and the transcript appears within seconds.',
      'Copy the transcript to clipboard or download as a .txt file.',
      'On Pro, after the transcript is ready, use Share with a link to send a read-only page (original or translated) — same as Video → Transcript.',
      'Click "Record another" to start a new session.',
    ],
    expected: [
      { label: 'Input', detail: 'Your microphone — no file upload needed. Works on Chrome, Firefox, Safari, and Edge.' },
      { label: 'Max duration', detail: 'Up to 1 hour per recording on all plans.' },
      { label: 'Audio quality', detail: 'Noise suppression, echo cancellation, and auto gain are applied automatically. Quieter environments produce more accurate transcripts.' },
    ],
    features: [
      'Zero friction — works on free plan, no account needed to try.',
      'Real-time waveform so you can see your mic is active.',
      'Noise suppression and echo cancellation built in.',
      '99 languages auto-detected — speak in any language.',
      'Copy or download transcript with one click.',
      'Pro: optional translation, then shareable read-only links for original or translated text.',
    ],
  },
  {
    key: 'YouTube → Transcript',
    path: '/youtube-transcript-generator',
    title: 'YouTube → Transcript',
    shortDesc: 'Paste any YouTube URL and get a full transcript instantly. No download required. Works with any public YouTube video.',
    howTo: [
      'Copy the URL from any public YouTube video (youtube.com or youtu.be links work).',
      'Paste the URL into the input field on the YouTube → Transcript tool.',
      'Optionally set the spoken language — auto-detect works but manual improves accuracy for non-English content.',
      'Click Generate Transcript. VideoText streams the audio directly from YouTube servers (no download step) and transcription starts within seconds.',
      'When done, explore the result tabs: Transcript (full text with timestamps), Speakers (Pro — who said what), Summary (Pro — key points + chapters), and Exports.',
      'Pro tip: select "Also translate to" before starting to get a side-by-side translation in 70+ languages.',
      'Copy text or download (TXT, SRT, VTT on all plans; JSON/DOCX/PDF/CSV/Notion on Pro). On Pro, use Share with a link to send a read-only transcript page (original or translated) — viewers do not need to log in.',
    ],
    expected: [
      { label: 'Input', detail: 'Public YouTube URL (youtube.com or youtu.be). Does not work with private or age-restricted videos.' },
      { label: 'Processing time', detail: '~1 minute per 10 minutes of video. A typical 20-minute video finishes in 2-3 minutes. No download wait.' },
      { label: 'Duration limits', detail: 'Free: 30 min max per video; Pro: 2 h per video.' },
    ],
    features: [
      'No download required — paste URL directly.',
      'Full transcript with timestamps (all plans).',
      'AI Summary: bullet-point key points and chapter markers — Pro only.',
      'AI Chapters: auto-generated timestamped section headings — Pro only.',
      'Speaker diarization: automatically identify who said what — Pro only.',
      'Translate to 70+ languages: get a full translation alongside the original — Pro only.',
      'Export as TXT, SRT, VTT (all plans); JSON, CSV, Markdown, Notion, DOCX, PDF on Pro.',
      'Shareable read-only links (Pro): send a transcript URL — viewers do not need to log in.',
      'Perfect for repurposing: one YouTube video becomes blog posts, social snippets, newsletters, chapters, and SEO content.',
    ],
  },
  {
    key: 'Video → Transcript',
    path: '/video-to-transcript',
    title: 'Video → Transcript',
    shortDesc: 'Extract spoken text from any video. Get a full transcript, then explore summary, chapters, speakers, and more.',
    howTo: [
      'Upload a video file (MP4, MOV, AVI, WebM). Max size and duration depend on your plan.',
      'Optionally trim the video to transcribe only a portion (saves quota and speeds up processing).',
      'Set the spoken language if you know it — auto-detect works but manual improves accuracy for non-English content.',
      'Click Start. Transcription streams in real time — you see text within the first 15–30 seconds.',
      'When done, explore the result tabs: Transcript (full text with timestamps), Speakers (Pro — who said what), Summary (Pro — key points + action items), Chapters (Pro — timestamped sections), and Exports.',
      'Pro tip: check "Also translate to" before starting to get a side-by-side translation of the transcript in 70+ languages.',
      'Copy text or download (TXT, SRT, VTT on all plans; JSON/DOCX/PDF/CSV/Notion on Pro). On Pro, use Share with a link to send a read-only transcript page (original or translated) — viewers do not need to log in.',
    ],
    expected: [
      { label: 'Input', detail: 'Video file (MP4, MOV, AVI, WebM).' },
      { label: 'Duration limits', detail: 'Free: 30 min max per video; Pro: 2 h per video. Longer videos may be rejected at upload.' },
      { label: 'File size', detail: 'Free: 2 GB; Pro: 10 GB.' },
    ],
    features: [
      'Full transcript with timestamps and editable segments (all plans).',
      'AI Summary: bullet-point key points and action items — Pro only.',
      'AI Chapters: auto-generated timestamped section headings — Pro only.',
      'Speaker diarization: automatically identify who said what — Pro only.',
      'Translate to 70+ languages: get a full translation alongside the original — Pro only.',
      'Export as TXT, SRT, VTT (all plans); JSON, CSV, Markdown, Notion, DOCX, PDF on Pro.',
      'Shareable read-only links (Pro): send a transcript URL — viewers do not need to log in.',
    ],
  },
  {
    key: 'Format → Client guidelines',
    path: '/guideline-format',
    title: 'Format → Client guidelines',
    shortDesc:
      'Prep transcript text against editable Rev-, GoTranscript-, TranscribeMe-, and Scribie-style rule presets. Attach a client PDF/DOCX/TXT for your records; parsing those files into rules ships separately.',
    howTo: [
      'Finish a transcript in Video → Transcript, then click "Make this client-ready →" in Exports — your text loads here automatically — or open this tool and paste or upload .txt.',
      'Choose a preset from the dropdown (Rev, GoTranscript, TranscribeMe, Scribie), or pick Custom and drop a client PDF, DOCX, or TXT.',
      'Edit any rule summary in-place. Use Reset on a rule or Reset all when you want defaults back.',
      'When your transcript text and guideline (preset plus rules or uploaded file) are ready, tap Format Transcript → to confirm receipt.',
    ],
    expected: [
      { label: 'Best for', detail: 'Freelancers handing off to agencies, QA checklists against platform rules, and teams with branded style sheets.' },
      { label: 'Inputs', detail: 'Plain transcript text; optional .txt paste or upload; presets or custom guide file.' },
      { label: 'Workflow', detail: 'Pairs with Video → Transcript exports; no retyping long jobs into a blank doc.' },
    ],
    features: [
      'One-click handoff from Video → Transcript with session pre-fill.',
      'Four platform presets tuned to verbatim, tags, speaker label, and number conventions.',
      'Per-rule edits with Edited badges so reviewers see what changed from default.',
      'Custom client guide slot for PDF/DOCX/TXT (server parsing rolls out in a later release).',
    ],
  },
  {
    key: 'Video → Subtitles',
    path: '/video-to-subtitles',
    title: 'Video → Subtitles',
    shortDesc: 'Generate SRT or VTT subtitle files from video. Single or multi-language; ideal for YouTube and web.',
    howTo: [
      'Upload a video file.',
      'Choose output format: SRT or VTT.',
      'Select primary language. On Basic+ you can add more languages (we return a ZIP with one file per language).',
      'Click Start. When finished, download the subtitle file(s).',
      'Use "View in another language" to see plain-text translation in-app (for reading/copy); this does not create a new SRT/VTT file. For translated subtitle files, use Translate Subtitles or multi-language output.',
      'Use "Convert format" to turn the result into another format (SRT ↔ VTT ↔ TXT) without re-uploading the video.',
    ],
    expected: [
      { label: 'Input', detail: 'Video file. Same duration and size limits as Video → Transcript.' },
      { label: 'Languages', detail: 'Free: 1 language; Pro: 70+ languages. Multi-language outputs are generated in one job and returned as a ZIP.' },
    ],
    features: [
      'SRT and VTT output; optional multi-language ZIP on Pro.',
      'In-app translation viewer for reading/copy (plain text).',
      'Format conversion (SRT/VTT/TXT) from the result panel.',
      'Validation warnings (e.g. long lines, gaps) shown when relevant.',
    ],
  },
  {
    key: 'Translate Subtitles',
    path: '/translate-subtitles',
    title: 'Translate Subtitles',
    shortDesc: 'Translate existing SRT or VTT files to another language. Upload a file and get a new subtitle file with same timestamps.',
    howTo: [
      'Upload an SRT or VTT file.',
      'Select the source language (or leave as auto-detect) and the target language.',
      'Click Start. We translate the cue text and return a new SRT/VTT with the same timing.',
      'Download the translated file.',
    ],
    expected: [
      { label: 'Input', detail: 'SRT or VTT file. Format must be valid (numbered cues, timestamps).' },
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
      'Upload a video file.',
      'Choose compression profile: Web (smaller, good for sharing), Mobile, or Archive (higher quality, larger).',
      'Click Start. When done, download the compressed file.',
    ],
    expected: [
      { label: 'Input', detail: 'Video file. Same duration and size limits as Video → Transcript.' },
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
    shortDesc: 'Process multiple videos in one go. Pro only.',
    howTo: [
      'Upload multiple video files (or use the batch upload area).',
      'Set primary language and add additional languages if needed.',
      'Start the batch. We process each video in parallel and pack results into one ZIP (SRT + derived VTT + transcripts + summaries; errors logged in error_log.txt if any).',
      'Download the batch ZIP when all jobs complete.',
    ],
    expected: [
      { label: 'Availability', detail: 'Pro only. Free plan does not have batch access.' },
      { label: 'Limits', detail: 'Pro: no daily import cap; files up to 2 hours. Process at your own pace.' },
      { label: 'Output', detail: 'One ZIP per batch with transcripts, subtitles, summaries, and chapters per video; multi-language adds more files per video.' },
    ],
    features: [
      'One upload, one ZIP: all transcripts and subtitles in a single download.',
      'Parallel processing: multiple videos at once (faster than sequential).',
      'Full outputs: transcripts, SRT/VTT, AI summary, chapters, and speaker labels.',
      'Error log included in ZIP when some videos fail.',
      'Perfect for teams and content creators who produce volume.',
    ],
  },
]

/** Plan limits at a glance (authoritative summary; exact values in server/utils/limits.ts). */
const PLAN_LIMITS = [
  { plan: 'Free', uploads: '3/month', maxDuration: '30 min', maxSize: '2 GB', languages: '1', batch: '-', aiFeatures: '-' },
  { plan: 'Pro', uploads: 'No daily import cap', maxDuration: '2 h', maxSize: '10 GB', languages: '70+', batch: 'Up to 20 files', aiFeatures: 'Summary, Chapters, Speakers, Translation' },
]

export default function Guide() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-9 h-9 text-blue-600 shrink-0" strokeWidth={1.5} aria-hidden />
          <div>
            <h1 className="text-3xl font-medium text-gray-900">How to use VideoText — tools, workflows, and client guidelines</h1>
            <p className="text-gray-600 mt-1">
              A practical guide to each tool: inputs, outputs, limits, plus how freelancers prep transcripts against marketplace rules before QA.
            </p>
          </div>
        </div>

        <p className="text-gray-700 mb-6">
          This guide is the full &quot;How it works&quot; reference for VideoText. Step-by-step: how each tool works,
          what inputs we expect, and what you get. Most tools accept file uploads (MP4, MOV, AVI, WebM); YouTube → Transcript accepts direct URL input (no download needed). For billing and limits, see{' '}
          <Link to="/pricing" className="text-blue-600 hover:text-blue-700 font-medium">Pricing</Link>; for privacy, see our{' '}
          <Link to="/faq" className="text-blue-600 hover:text-blue-700 font-medium">FAQ</Link> and{' '}
          <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium">Privacy Policy</Link>. Ask Tex (bottom-right) for quick answers about any tool or plan.
        </p>

        {/* Quick persona guides */}
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { who: 'Voice notes', want: 'Record any idea or meeting in browser, get transcript instantly. No file needed.', path: '#voice-recorder' },
            { who: 'YouTubers', want: 'Paste YouTube URL, get transcript + AI chapters + multi-language subtitles. No download.', path: '#youtube-transcript' },
            { who: 'Podcast editors', want: 'Transcript + speaker labels + AI summary + chapters — all in one job', path: '#video-to-transcript' },
            { who: 'Social media creators', want: 'Subtitles burned in for silent autoplay. Translate to reach global audiences.', path: '#burn-subtitles' },
            { who: 'Teams & agencies', want: 'Batch process 20–100 videos in one go, download ZIP with SRT per video', path: '#batch-process' },
            { who: 'Meeting notes', want: 'Transcribe Zoom/Teams MP4, speaker-labelled notes + AI action items', path: '#video-to-transcript' },
            { who: 'Freelance transcriptionists', want: 'Match Rev / GoTranscript / client PDF rules before invoice — presets + cheatsheet-ready exports', path: '#guideline-format' },
            { who: 'Educators', want: 'Auto-captions + timing fix for accessibility. Translate to 70+ languages for global reach.', path: '#fix-subtitles' },
          ].map(({ who, want, path }) => (
            <a key={who} href={path} className="block bg-blue-50/50 border border-blue-100 rounded-lg p-3 hover:bg-blue-50 transition-colors">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{who}</span>
              <p className="text-sm text-gray-700 mt-1">{want}</p>
            </a>
          ))}
        </div>

        {/* Suggested workflows for creators */}
        <section className="mb-8 rounded-xl border border-blue-100 bg-blue-50/30 p-4 sm:p-6" aria-labelledby="workflows-heading">
          <h2 id="workflows-heading" className="text-base font-medium text-gray-900 mb-3">Workflows</h2>
          <p className="text-sm text-gray-600 mb-4">
            Use &quot;Next step&quot; on each tool to continue with the same file (no re-upload).
          </p>
          <div className="grid gap-4 sm:grid-cols-1">
            <div className="rounded-lg bg-white/80 border border-blue-100/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1.5">Voice notes / interviews</p>
              <p className="text-sm text-gray-700">
                <Link to="/voice-recorder" className="text-blue-600 hover:text-blue-700 font-medium">Record</Link>
                <span className="text-gray-400 mx-1">→</span>
                Copy or download .txt
              </p>
            </div>
            <div className="rounded-lg bg-white/80 border border-blue-100/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1.5">YouTubers</p>
              <p className="text-sm text-gray-700">
                <Link to="/video-to-transcript" className="text-blue-600 hover:text-blue-700 font-medium">Transcript</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/video-to-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Subtitles</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/translate-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Translate</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/burn-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Burn</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/compress-video" className="text-blue-600 hover:text-blue-700 font-medium">Compress</Link>
              </p>
            </div>
            <div className="rounded-lg bg-white/80 border border-blue-100/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1.5">Client-ready transcripts</p>
              <p className="text-sm text-gray-700">
                <Link to="/video-to-transcript" className="text-blue-600 hover:text-blue-700 font-medium">Transcript</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/guideline-format" className="text-blue-600 hover:text-blue-700 font-medium">Guideline presets</Link>
              </p>
            </div>
            <div className="rounded-lg bg-white/80 border border-blue-100/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1.5">Editors</p>
              <p className="text-sm text-gray-700">
                <Link to="/video-to-transcript" className="text-blue-600 hover:text-blue-700 font-medium">Transcript</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/video-to-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Subtitles</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/fix-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Fix</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/burn-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Burn</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/compress-video" className="text-blue-600 hover:text-blue-700 font-medium">Compress</Link>
              </p>
            </div>
            <div className="rounded-lg bg-white/80 border border-blue-100/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1.5">Clip editors</p>
              <p className="text-sm text-gray-700">
                Trim
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/video-to-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Subtitles</Link>
                <span className="text-gray-400 mx-1">/</span>
                <Link to="/video-to-transcript" className="text-blue-600 hover:text-blue-700 font-medium">Transcript</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/fix-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Fix</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/burn-subtitles" className="text-blue-600 hover:text-blue-700 font-medium">Burn</Link>
                <span className="text-gray-400 mx-1">→</span>
                <Link to="/compress-video" className="text-blue-600 hover:text-blue-700 font-medium">Compress</Link>
              </p>
            </div>
          </div>
        </section>

        {/* Quick nav */}
        <nav className="mb-12 rounded-xl border border-gray-200 bg-white p-4" aria-label="Guide sections">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Tools in this guide</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {TOOL_GUIDES.map((g) => (
              <li key={g.path}>
                <a href={`#${TOOL_SLUGS[g.key]}`} className="text-blue-600 hover:text-blue-700 font-medium">
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
                      <Icon className="w-6 h-6 text-blue-600 shrink-0" aria-hidden />
                      <h2 className="text-xl font-medium text-gray-900">{guide.title}</h2>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">{guide.shortDesc}</p>
                    <Link
                      to={guide.path}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Open {guide.title}
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </Link>
                  </div>

                  <div className="p-4 sm:p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600" strokeWidth={1.5} aria-hidden />
                        How to use
                      </h3>
                      <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
                        {guide.howTo.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">What we expect</h3>
                      <ul className="space-y-1.5 text-sm text-gray-700">
                        {guide.expected.map((e, i) => (
                          <li key={i}>
                            <span className="font-medium text-gray-800">{e.label}:</span> {e.detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Features</h3>
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
            <h2 className="text-lg font-medium text-gray-900">Plan limits at a glance</h2>
            <p className="text-sm text-gray-600 mt-1">
              Free: 3 imports/month, 30 min per video. Paid: monthly minute quota. AI features (Summary, Chapters, Speakers, Translation, Batch) are Pro and above. Exact limits enforced at upload.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 font-semibold text-gray-900">Plan</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Uploads</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Max duration</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Max file size</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Languages</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Batch</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">AI Features</th>
                </tr>
              </thead>
              <tbody>
                {PLAN_LIMITS.map((row) => (
                  <tr key={row.plan} className={`border-b border-gray-100 ${row.plan === 'Pro' ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.plan}{row.plan === 'Pro' ? <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Popular</span> : ''}</td>
                    <td className="px-4 py-3 text-gray-700">{row.uploads}</td>
                    <td className="px-4 py-3 text-gray-700">{row.maxDuration}</td>
                    <td className="px-4 py-3 text-gray-700">{row.maxSize}</td>
                    <td className="px-4 py-3 text-gray-700">{row.languages}</td>
                    <td className="px-4 py-3 text-gray-700">{row.batch}</td>
                    <td className="px-4 py-3 text-gray-700">{row.aiFeatures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pro Tips */}
        <section className="mt-14 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/20 rounded-xl border border-blue-200/30 dark:border-blue-500/20 p-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Pro tips for best results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: '⚡',
                title: 'Speed up processing',
                tips: ['Trim videos before uploading (saves time & quota)', 'Use lower resolution if file size is huge', 'Process short clips instead of full videos'],
              },
              {
                icon: '🎯',
                title: 'Improve accuracy',
                tips: ['Clear audio = better accuracy (obvious, but critical)', 'Manual language selection > auto-detect', 'Recheck timestamps for edge cases'],
              },
              {
                icon: '💰',
                title: 'Maximize value',
                tips: ['One transcript = 5+ content pieces (blog, socials, etc.)', 'Use speaker labels to create quotable clips', 'Translate transcripts to reach global audiences'],
              },
              {
                icon: '🔒',
                title: 'Privacy & security',
                tips: ['Files are deleted immediately (no backups)', 'Content never used for AI training', 'GDPR & SOC2 compliant'],
              },
            ].map((section) => (
              <div key={section.title}>
                <div className="text-3xl mb-3">{section.icon}</div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">{section.title}</h3>
                <ul className="space-y-2">
                  {section.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Popular use cases */}
        <section className="mt-14">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Popular use cases</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { to: '/podcast-transcription', label: 'Podcast Transcription', desc: 'Get transcripts with speaker labels for podcasts.' },
              { to: '/meeting-transcription', label: 'Meeting Transcription', desc: 'Transcribe Zoom, Teams, Google Meet meetings.' },
              { to: '/interview-transcription', label: 'Interview Transcription', desc: 'Capture interviews with automatic speaker ID.' },
              { to: '/youtube-transcript', label: 'YouTube Transcript', desc: 'Paste a URL and get a transcript instantly.' },
              { to: '/webinar-transcript', label: 'Webinar Transcript', desc: 'Record and transcribe webinars with SRT export.' },
              { to: '/google-meet-transcript', label: 'Google Meet Transcript', desc: 'Transcribe Google Meet calls automatically.' },
              { to: '/korean-transcription', label: 'Korean Transcription', desc: 'High-accuracy Korean to text transcription.' },
              { to: '/spanish-transcription', label: 'Spanish Transcription', desc: 'Transcribe Spanish audio and video files.' },
              { to: '/video-to-subtitles', label: 'Video to Subtitles', desc: 'Generate SRT/VTT subtitles from any video.' },
            ].map(({ to, label, desc }) => (
              <Link key={to} to={to} className="block bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                <span className="text-sm font-semibold text-blue-600">{label}</span>
                <p className="text-xs text-gray-600 mt-1">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Cross-links to related pages */}
        <section className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to: '/guideline-format', label: 'Format your transcript to a client style guide →', desc: 'Rev-, GoTranscript-, TranscribeMe-, and Scribie-style presets plus editable rule cards.' },
            { to: '/compare', label: 'Compare vs Descript, Otter, Trint', desc: 'Speed, subtitle exports, privacy, and where guideline presets fit.' },
            { to: '/blog', label: 'Blog & guides', desc: 'Zoom transcription, SRT vs VTT, batch subtitles, verbatim QA.' },
            { to: '/faq', label: 'FAQ', desc: 'Privacy, billing, accuracy, uploads, transcription vs subtitles.' },
          ].map(({ to, label, desc }) => (
            <Link key={to} to={to} className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <span className="text-sm font-semibold text-blue-600">{label} →</span>
              <p className="text-xs text-gray-500 mt-1">{desc}</p>
            </Link>
          ))}
        </section>

        <div className="mt-10 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← All tools
          </Link>
        </div>
      </div>
    </div>
  )
}
