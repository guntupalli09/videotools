/**
 * SEO landing page: /tactiq-alternative
 * Targets: "tactiq alternative", "tactiq alternative for recordings",
 *          "transcribe past meetings without tactiq", "tactiq google meet alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: 'Free / $8/mo' },
  { label: 'Transcribes uploaded recording files', videotext: true, competitor: false },
  { label: 'Works on past recordings you already have', videotext: true, competitor: false },
  { label: 'Browser extension required', videotext: false, competitor: true },
  { label: 'Works on any video/audio format', videotext: true, competitor: false },
  { label: 'YouTube URL → transcript', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Burn captions into video', videotext: true, competitor: false },
  { label: 'Speaker labels', videotext: true, competitor: true },
  { label: 'Auto-generated chapters', videotext: true, competitor: false },
  { label: 'Keyword index', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'Live Google Meet / Zoom transcription', videotext: false, competitor: true },
  { label: 'Calendar integration', videotext: false, competitor: true },
]

const FAQ = [
  {
    q: 'What is the difference between Tactiq and VideoText?',
    a: 'Tactiq is a browser extension that transcribes live Google Meet, Zoom, and Teams calls in real time as they happen. You must be in the meeting with Tactiq running to get a transcript. VideoText processes uploaded recording files — upload any past meeting recording (MP4, M4A, etc.) and get a full transcript. If you forgot to run Tactiq during a meeting, VideoText is your alternative.',
  },
  {
    q: 'Can I transcribe a past Google Meet or Zoom recording without Tactiq?',
    a: 'Yes. Download your Google Meet recording from Google Drive as MP4 (or your Zoom recording from the Zoom recordings folder). Upload the MP4 to VideoText and get a full transcript with speaker labels. No browser extension needed, no need to have had Tactiq running during the original meeting.',
  },
  {
    q: 'Does VideoText require installing a browser extension like Tactiq?',
    a: 'No. VideoText is a web app — open the URL, upload your file, done. No browser extension, no permissions granted to your microphone or screen, no calendar access.',
  },
  {
    q: 'Can VideoText export SRT subtitle files unlike Tactiq?',
    a: 'Yes. VideoText exports SRT and VTT subtitle files with accurate timestamps from any uploaded video. Tactiq focuses on meeting transcription text — it does not produce subtitle files for video editing or platform upload.',
  },
  {
    q: 'Does VideoText work for interviews and podcast recordings, not just meetings?',
    a: 'Yes. VideoText transcribes any uploaded audio or video file — interviews, podcasts, lectures, YouTube videos, voice memos, Zoom meetings, Google Meet recordings, Teams recordings. Tactiq is limited to live meetings on Google Meet, Zoom, and Teams.',
  },
  {
    q: 'Is VideoText free like Tactiq?',
    a: 'Yes. VideoText free tier: 3 imports/month, no credit card, no browser extension install. Tactiq free tier: 5 meeting transcriptions/month, but only if you run the extension during the live call.',
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

export default function TactiqAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Tactiq Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Tactiq alternative
            </span>{' '}
            — transcribe recordings, not just live calls
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Tactiq only transcribes calls while you are live in the meeting. VideoText transcribes uploaded recordings — any past meeting, interview, or lecture. No browser extension. Free tier.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No extension · No credit card · Any recording</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for a Tactiq alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why users search for a Tactiq alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Tactiq is great for live meeting capture, but it cannot help in several common situations:
          </p>
          <ul className="space-y-3">
            {[
              'You forgot to run Tactiq during a meeting — there is no way to transcribe the recording after the fact.',
              'Tactiq only works during live calls — it cannot transcribe downloaded video or audio files.',
              'Browser extension required — adds a permission layer and must be installed on Chrome or Edge.',
              'Only supports Google Meet, Zoom, and Teams — no support for Webex, in-person recordings, podcast files, or video uploads.',
              'No SRT or VTT subtitle file export — output is meeting transcript text only.',
              'No YouTube URL transcription — cannot process YouTube videos or other online content.',
              'Free tier limited to 5 meetings/month — only if the extension was active during each call.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Tactiq — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tactiq</div>
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

        {/* When Tactiq is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Tactiq is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Tactiq is the right tool if you need <strong>live, real-time transcription during Google Meet, Zoom, or Teams calls</strong> — the extension shows transcription appearing in real time while the meeting is happening, which is useful for quick note-taking and AI meeting summaries immediately after the call. Its calendar integration for automatic meeting capture is also useful. VideoText is better when you have an <strong>existing recording file</strong> to process — past meetings, interviews, podcasts, or any audio/video content that was not captured live.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'Works on past recordings', body: 'Tactiq requires you to be live in the meeting. VideoText processes any recording you already have — even meetings from years ago.' },
            { icon: DollarSign, title: 'No browser extension needed', body: 'VideoText runs as a web app — no extension install, no microphone permissions, no calendar access. Upload a file and get your transcript.' },
            { icon: Shield, title: 'SRT, translation, and video captions', body: 'VideoText exports SRT subtitle files, translates to 70+ languages, and burns captions into video. Tactiq outputs meeting text only.' },
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Transcribe any recording — live or past</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload your meeting recording, podcast, or interview. Get a full speaker-labelled transcript in minutes — no extension, no live meeting required.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
              Try VideoText free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
