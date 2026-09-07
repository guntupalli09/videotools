/**
 * SEO landing page: /otter-alternative
 * Targets: "otter ai alternative", "otter.ai alternative", "free otter ai alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: 'Free (300 min/mo) / $16.99/mo Pro' },
  { label: 'Video file transcription (MP4, MOV)', videotext: true, competitor: false },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'No account needed to start', videotext: true, competitor: false },
  { label: 'Speaker detection', videotext: true, competitor: true },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '10–15 min' },
  { label: 'Whisper AI accuracy', videotext: '98.5%', competitor: '~90%' },
]

const FAQ = [
  {
    q: 'What is a good free Otter.ai alternative for video transcription?',
    a: 'VideoText is the best free alternative if you need to transcribe video files (MP4, MOV, WebM) or YouTube videos. Otter.ai is primarily a meeting recorder and is not designed for video file uploads or subtitle generation. VideoText handles both and deletes your files after processing.',
  },
  {
    q: 'Can VideoText replace Otter.ai for meeting transcription?',
    a: 'VideoText can transcribe recorded Zoom, Teams, or Google Meet recordings (MP4 files). It does not provide a live meeting bot that joins calls in real time — that is Otter\'s core product. For post-meeting transcription of recorded files, VideoText is faster and provides subtitle export, translation, and speaker labelling.',
  },
  {
    q: 'Why does Otter.ai not support video files?',
    a: 'Otter.ai was designed for real-time audio recording from microphones and calendar integrations. It does not natively support video uploads (MP4, MOV). Users who have pre-recorded meetings or videos need to strip audio and upload M4A/MP3, or use a different tool. VideoText accepts video files directly — no conversion needed.',
  },
  {
    q: 'How accurate is VideoText compared to Otter.ai?',
    a: 'VideoText uses OpenAI Whisper large-v3 and reports approximately 98.5% word accuracy on clean audio. Otter.ai uses its own model tuned for live speech which is strong for meetings but typically shows ~90% accuracy on pre-recorded video content with varying audio quality.',
  },
  {
    q: 'Does VideoText have a free tier like Otter.ai?',
    a: 'Yes. VideoText has a free tier with 3 uploads per month. No credit card required. Otter.ai also has a free tier (300 minutes/month) but requires an account and does not support video file uploads on any tier.',
  },
]

function Cell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (typeof val === 'string') {
    return <span className={`text-sm font-semibold ${isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{val}</span>
  }
  return val
    ? <CheckCircle2 className={`w-5 h-5 mx-auto ${isUs ? 'text-emerald-500' : 'text-emerald-400'}`} />
    : <XCircle className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-700" />
}

export default function OtterAiAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Otter.ai Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            Switch from Otter when your workflow is{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              post-recording and export-first
            </span>{' '}
            instead of live-assistant-first
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-3xl mx-auto mb-8">
            This page is for teams that like Otter’s meeting search and note workflow but need stronger outputs from recorded calls. Otter is strong for live assistant capture. VideoText is stronger when your next step is publishing, sharing, or repurposing recorded meetings into transcript, summary, chapters, and subtitle exports.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript?source=otter-alternative">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
                Compare your next meeting recording
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · No live bot required</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        <section className="rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 bg-white dark:bg-gray-900/40">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Should you stay with Otter or switch?</h2>
          <div className="grid sm:grid-cols-2 gap-5 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Stay with Otter if you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Live assistant behavior during meetings.</li>
                <li>• Search across ongoing meeting history in one place.</li>
                <li>• A workflow centered on in-call capture and notes.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Switch to VideoText if you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Post-call file processing with export-ready outputs.</li>
                <li>• Subtitle workflows (SRT/VTT + translation + burn).</li>
                <li>• Simple upload-after-meeting execution without bot access.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Why people leave Otter */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why users search for an Otter.ai alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Otter.ai is excellent for live meeting capture. But it has significant limitations for any use case involving pre-recorded video or subtitle workflows:
          </p>
          <ul className="space-y-3">
            {[
              'Otter does not accept video file uploads (MP4, MOV) on any plan.',
              'No SRT or VTT subtitle export — transcripts are plain text only.',
              'No subtitle translation — outputs English only by default.',
              'Cannot burn subtitles into video files.',
              'Stores all your transcripts and audio permanently in their cloud.',
              'YouTube videos cannot be transcribed — no URL input.',
              'Accuracy on pre-recorded content with background noise is lower (~90%).',
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* Comparison table */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Otter.ai — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Otter.ai</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/[0.03] bg-white dark:bg-gray-900/50">
              {COMPARE_ROWS.map((row) => (
                <div key={row.label} className="grid grid-cols-3 px-5 py-3.5 items-center">
                  <span className="text-sm text-gray-700 dark:text-white/60">{row.label}</span>
                  <div className="text-center"><Cell val={row.videotext} isUs /></div>
                  <div className="text-center"><Cell val={row.competitor} /></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* When Otter is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Otter.ai is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Otter.ai is the right tool for <strong>live meeting transcription</strong> — especially if you need a bot that automatically joins your calendar's Zoom or Google Meet calls, transcribes in real time, and builds a searchable library of past meetings. Its speaker detection and real-time collaboration are strong. VideoText does not join live calls — it processes recordings after the fact.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Meeting notes vs production-ready deliverables</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Otter workflow</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Great for searchable conversation history and live note workflows. Less aligned with subtitle/export-heavy post-production tasks.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">VideoText workflow</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Built for recording-to-output execution: transcript, summary, chapters, and export files for handoff or publishing after the meeting ends.</p>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'Video files supported', body: 'Otter.ai does not accept MP4 or MOV uploads. VideoText handles any video format and YouTube URLs directly.' },
            { icon: Shield, title: 'Subtitle export included', body: 'VideoText exports SRT and VTT files with accurate timestamps. Otter only produces plain-text transcripts.' },
            { icon: DollarSign, title: 'Translation in 70+ languages', body: 'Translate your transcript or subtitle file to any language. Otter.ai has no subtitle translation feature.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-600/15 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 bg-white dark:bg-gray-900/40">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-3">Compare nearby switch paths</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Otter switch intent is close to Notta and Fireflies intent. These pages help users pick by workflow, not hype.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/notta-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Notta alternative</Link>
            <Link to="/fireflies-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Fireflies alternative</Link>
            <Link to="/meeting-transcription-tool" className="text-blue-600 dark:text-blue-400 hover:underline">Meeting transcription tool</Link>
            <Link to="/meeting-recording-to-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">Meeting recording to transcript</Link>
            <Link to="/transcription-benchmark" className="text-blue-600 dark:text-blue-400 hover:underline">Transcription benchmark</Link>
            <a href="https://blog.videotext.io/best-transcription-software-2026" className="text-blue-600 dark:text-blue-400 hover:underline">Best transcription software 2026</a>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">{q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 rounded-xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Try a no-bot workflow on your next call recording</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload the file after your meeting and compare how quickly you get a usable transcript package for recaps, subtitles, and handoffs.</p>
          <Link to="/video-to-transcript?source=otter-alternative">
            <span className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
              Start your no-bot test
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
