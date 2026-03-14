/**
 * SEO landing page: /otter-ai-alternative
 * Targets: "otter ai alternative", "otter.ai alternative", "free otter ai alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $10 Creator Pro', competitor: 'Free (300 min/mo) / $16.99/mo Pro' },
  { label: 'Video file transcription (MP4, MOV)', videotext: true, competitor: false },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (50+ languages)', videotext: true, competitor: false },
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
    a: 'Yes. VideoText has a free tier with 3 imports per month (resets on the 1st). No credit card required. Otter.ai also has a free tier (300 minutes/month) but requires an account and does not support video file uploads on any tier.',
  },
]

function Cell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (typeof val === 'string') {
    return <span className={`text-sm font-semibold ${isUs ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300'}`}>{val}</span>
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
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:via-gray-950 dark:to-indigo-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20 mb-6">
            <span className="text-[12px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Otter.ai Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Otter.ai alternative
            </span>{' '}
            for video files
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Otter.ai is built for live meetings — not video files or subtitles. VideoText transcribes any MP4, MOV, or YouTube URL in minutes, then exports SRT, VTT, or plain text. Free tier available.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · Files deleted after processing</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people leave Otter */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why users search for an Otter.ai alternative</h2>
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
                <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* Comparison table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">VideoText vs Otter.ai — feature comparison</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">VideoText</div>
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">When Otter.ai is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Otter.ai is the right tool for <strong>live meeting transcription</strong> — especially if you need a bot that automatically joins your calendar's Zoom or Google Meet calls, transcribes in real time, and builds a searchable library of past meetings. Its speaker detection and real-time collaboration are strong. VideoText does not join live calls — it processes recordings after the fact.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'Video files supported', body: 'Otter.ai does not accept MP4 or MOV uploads. VideoText handles any video format and YouTube URLs directly.' },
            { icon: Shield, title: 'Subtitle export included', body: 'VideoText exports SRT and VTT files with accurate timestamps. Otter only produces plain-text transcripts.' },
            { icon: DollarSign, title: 'Translation in 50+ languages', body: 'Translate your transcript or subtitle file to any language. Otter.ai has no subtitle translation feature.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{body}</p>
            </div>
          ))}
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">{q}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Transcribe your first video in 2 minutes</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload any video or paste a YouTube URL. Get a transcript or subtitle file. No meeting bot needed — just the recording.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 bg-white text-purple-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
              Try VideoText free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
