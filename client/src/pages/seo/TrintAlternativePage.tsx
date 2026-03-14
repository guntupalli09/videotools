/**
 * SEO landing page: /trint-alternative
 * Targets: "trint alternative", "cheaper trint alternative", "trint free alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $10 Creator Pro', competitor: '$80/month' },
  { label: 'No credit card to start', videotext: true, competitor: false },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '8–15 min' },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: true },
  { label: 'Translate subtitles (50+ languages)', videotext: true, competitor: true },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: false },
  { label: 'Works without enterprise sales', videotext: true, competitor: false },
  { label: 'Works on mobile', videotext: true, competitor: false },
  { label: 'Whisper AI accuracy', videotext: '98.5%', competitor: '~93%' },
]

const FAQ = [
  {
    q: 'What is a cheaper Trint alternative?',
    a: 'VideoText is the most direct budget alternative to Trint for pure transcription and subtitle workflows. Trint starts at $80/month for individuals; VideoText starts free and scales to $10–$129/month. Both use AI transcription, but VideoText also includes subtitle burning, video compression, and batch processing.',
  },
  {
    q: 'Is VideoText as accurate as Trint?',
    a: 'VideoText uses OpenAI Whisper large-v3 (98.5% accuracy on clean audio). Trint uses a proprietary model that performs around 93% on average. For general content, VideoText is comparable or better; Trint\'s human-review add-on is superior for legal, medical, or broadcast content where every word must be exact.',
  },
  {
    q: 'Can I use VideoText for broadcast or professional journalism?',
    a: 'VideoText is suitable for content creators, marketers, educators, and SMB teams. For high-stakes broadcast or legal transcription requiring guaranteed human review and formal accuracy SLAs, Trint\'s enterprise tier may be more appropriate. VideoText does not offer human-review add-ons.',
  },
  {
    q: 'How do I switch from Trint to VideoText?',
    a: 'Export your video from Trint or download it from your original source, then upload to VideoText. For existing subtitle files from Trint, you can upload them to VideoText\'s Translate Subtitles or Fix Subtitles tools. No Trint project file import is needed.',
  },
  {
    q: 'Does VideoText work for the same languages as Trint?',
    a: 'VideoText supports transcription in 50+ languages via Whisper and subtitle translation into 50+ languages. Trint supports 40+ languages. For most common languages, VideoText covers the same range at a fraction of the price.',
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

export default function TrintAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:via-gray-950 dark:to-indigo-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20 mb-6">
            <span className="text-[12px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Trint Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
            A cheaper{' '}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Trint alternative
            </span>{' '}
            that starts free
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Trint starts at $80/month and is built for enterprise broadcast teams. VideoText gives you the same AI transcription quality, subtitle export, and multi-language support — starting free, with plans from $10/month.
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

        {/* Why people leave Trint */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why teams look for a Trint alternative</h2>
          <ul className="space-y-3">
            {[
              'Trint starts at $80/month — the highest entry price of any mainstream transcription tool.',
              'Designed for enterprise broadcast teams; heavy UI for simple one-off transcription.',
              'No free tier — you must commit to a paid plan to try it.',
              'No YouTube URL input — download the video first, then upload.',
              'No subtitle burning feature — you need a separate tool to add captions to video.',
              'No video compression built in — separate workflow step required.',
              'Files stored in Trint\'s cloud; not suitable for confidential or sensitive content.',
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">VideoText vs Trint — feature comparison</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Trint</div>
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

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: DollarSign, title: '92% cheaper to start', body: 'Trint\'s minimum is $80/month. VideoText\'s Creator Pro is $10/month, locked for early users. Free tier included.' },
            { icon: Zap, title: 'No enterprise sales process', body: 'Trint requires contacting sales for team plans. VideoText is self-serve — sign up, upgrade instantly, no calls.' },
            { icon: Shield, title: 'Complete file deletion', body: 'VideoText deletes your files after processing. Trint stores everything in their cloud by default.' },
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Get started in 2 minutes — free</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">No enterprise sales call. No $80/month minimum. Just upload a video or paste a YouTube URL and get your transcript.</p>
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
