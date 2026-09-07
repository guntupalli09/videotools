/**
 * SEO landing page: /descript-alternative
 * Targets: "descript alternative", "descript free alternative", "alternative to descript"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $19 Basic · $49 Pro', competitor: '$24/month' },
  { label: 'No credit card to start', videotext: true, competitor: false },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '8–12 min' },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'No heavy video editor required', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: true },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process up to 20 videos', videotext: true, competitor: false },
  { label: 'Works on mobile', videotext: true, competitor: false },
  { label: 'Whisper AI accuracy', videotext: '98.5%', competitor: '~95%' },
]

const FAQ = [
  {
    q: 'What is the best free Descript alternative?',
    a: 'VideoText is the most direct free alternative for pure transcription and subtitle workflows. Descript is a full video editor — if you only need transcripts, SRT files, or subtitle translation, VideoText is faster and cheaper. The free tier gives you 3 imports/month with no credit card.',
  },
  {
    q: 'Can VideoText do everything Descript does?',
    a: 'VideoText does not have Descript\'s text-based video editing features (Overdub, screen recorder, multi-track editor). If you need those, Descript is the right tool. VideoText is purpose-built for transcription, subtitle generation, translation, timing fixes, and burning captions — faster and at a much lower price.',
  },
  {
    q: 'How do I switch from Descript to VideoText?',
    a: 'Export your video from Descript as MP4, then upload to VideoText. You can also paste any YouTube URL directly. For existing subtitle files, upload them to Translate Subtitles or Fix Subtitles. No import of Descript project files is needed — just the video.',
  },
  {
    q: 'Is VideoText\'s transcription as accurate as Descript\'s?',
    a: 'Both use Whisper-based AI. VideoText uses the large-v3 model and reports 98.5% word accuracy on clean audio. Descript uses a proprietary Whisper derivative. For most content, accuracy is comparable; VideoText is typically faster because it skips the video editor overhead.',
  },
  {
    q: 'Does VideoText store my files like Descript does?',
    a: 'No. VideoText deletes your files immediately after processing. Descript stores your project files in their cloud. If you handle sensitive meetings, legal content, or client material, VideoText\'s file-deletion model is safer.',
  },
]

function Cell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (typeof val === 'string') {
    return <span className={`text-sm font-semibold ${isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{val}</span>
  }
  return val
    ? <CheckCircle2 className={`w-5 h-5 mx-auto ${isUs ? 'text-blue-500' : 'text-blue-400/80'}`} />
    : <XCircle className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-700" />
}

export default function DescriptAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gray-50 py-20 dark:border-white/[0.08] dark:bg-gray-900/50 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Descript Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            Descript alternative —{' '}
            <span className="text-blue-600 dark:text-blue-400">
              upload or paste a YouTube URL
            </span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-6">
            Problem: you need a transcript and SRT, not a desktop editor. Three steps on Video to Transcript. Free: 3 imports/mo, no card. Files deleted after processing.
          </p>
          <ol className="grid sm:grid-cols-3 gap-3 text-left max-w-3xl mx-auto mb-8">
            <li className="rounded-xl border border-blue-100 dark:border-blue-900 bg-white/80 dark:bg-gray-900/60 p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">1. Upload or paste URL</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Video file or public YouTube URL. No desktop install.</p>
            </li>
            <li className="rounded-xl border border-blue-100 dark:border-blue-900 bg-white/80 dark:bg-gray-900/60 p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">2. Whisper large-v3</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">~98.5% on clear audio. Transcript + SRT/VTT + summary + chapters.</p>
            </li>
            <li className="rounded-xl border border-blue-100 dark:border-blue-900 bg-white/80 dark:bg-gray-900/60 p-3">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">3. Download and continue</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Then Fix, Translate, or Burn if you need captions next.</p>
            </li>
          </ol>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700">
                Open Video to Transcript
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <Link to="/video-to-subtitles" className="text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline">
              Need captions only?
            </Link>
          </div>
          <p className="mt-3 text-sm text-gray-400">Free tier · no credit card · files deleted after processing</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people leave Descript */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why people look for a Descript alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Descript is a powerful product — but it is built around a text-based video editor. If you only need transcripts and subtitle files, you are paying for a toolset you will never use. Common complaints from users switching away from Descript:
          </p>
          <ul className="space-y-3">
            {[
              'The $24/month minimum is high for teams that only need transcription, not editing.',
              'The editor is slow to load and has a steep learning curve for non-editors.',
              'Processing a 2-hour video can take 15–20 minutes; VideoText does the same in ~3 minutes.',
              'Descript stores your project files in their cloud — problematic for confidential content.',
              'No direct YouTube URL input — you must download the video and upload it manually.',
              'Subtitle translation requires a third-party integration; VideoText includes it.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Descript — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Descript</div>
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

        {/* When Descript is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Descript is still the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Descript is the right tool if you need to <strong>edit video by editing text</strong> — removing filler words, replacing audio with Overdub, or producing polished podcast episodes with a visual timeline. VideoText does not have a timeline editor. If your workflow is primarily editing (not just transcribing), Descript's editor is unmatched in that category.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: '6× faster', body: 'VideoText processes a 2-hour video in ~3 minutes vs 15–20 minutes in Descript. No waiting on a cloud render.' },
            { icon: Shield, title: 'Files deleted instantly', body: 'Descript stores your project in their cloud. VideoText deletes your file the moment the job completes — nothing retained.' },
            { icon: DollarSign, title: 'Free tier + Pro at $49/mo', body: 'Descript\'s cheapest paid plan is $24/month with limited features. VideoText starts free — 3 imports/month, no card needed. Basic is $19/month. Pro is $49/month.' },
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
        <section className="rounded-xl border border-white/[0.08] bg-gray-950 p-8 text-center sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Switch from Descript in 2 minutes</h2>
          <p className="text-white/55 mb-8 max-w-xl mx-auto">Paste a YouTube URL or upload an MP4. Get your transcript or subtitle file instantly. No editor to learn. Free tier, no credit card.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-blue-700">
              Transcribe my first video free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
