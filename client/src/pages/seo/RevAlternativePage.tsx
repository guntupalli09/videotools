/**
 * SEO landing page: /rev-alternative
 * Targets: "rev alternative", "rev ai alternative", "free rev transcription alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $10 Creator Pro', competitor: '$0.25/minute (AI) or $1.99/min (human)' },
  { label: 'Unlimited monthly plan available', videotext: true, competitor: false },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '~5 min (AI) / 12+ hrs (human)' },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: true },
  { label: 'Translate subtitles (50+ languages)', videotext: true, competitor: false },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: false },
  { label: 'Flat monthly pricing', videotext: true, competitor: false },
  { label: 'No per-minute billing surprises', videotext: true, competitor: false },
  { label: 'Works on mobile', videotext: true, competitor: true },
]

const FAQ = [
  {
    q: 'What is the best free Rev alternative for AI transcription?',
    a: 'VideoText is the most cost-effective alternative for AI transcription. Rev AI charges $0.25/minute — a 60-minute video costs $15. VideoText\'s paid plans start at $10/month for 450 minutes, dropping the per-minute cost to $0.02. Free tier included with 3 imports/month.',
  },
  {
    q: 'Is VideoText as accurate as Rev AI?',
    a: 'Both use Whisper-based AI models. VideoText uses Whisper large-v3 and reports 98.5% word accuracy on clear audio. Rev AI reports similar figures. For 99%+ accuracy with a human reviewer, Rev\'s human transcription service ($1.99/min) is in a different category — VideoText does not offer human review.',
  },
  {
    q: 'Does VideoText replace Rev\'s human transcription service?',
    a: 'No. Rev\'s human transcription is the gold standard for legal depositions, medical dictation, and formal broadcasts where every word must be guaranteed accurate. VideoText is AI-only. For creative, educational, or business content where 98%+ accuracy is acceptable, VideoText is the cost-effective choice.',
  },
  {
    q: 'Why is Rev so expensive compared to VideoText?',
    a: 'Rev\'s AI service charges per minute of audio ($0.25/min). A 10-hour course would cost $150 on Rev AI vs $49/month on VideoText\'s Pro plan (which includes 1,200 minutes). Rev\'s human transcription adds human reviewers, which justifies the $1.99/min premium for high-stakes content.',
  },
  {
    q: 'Can I import my existing Rev transcripts into VideoText?',
    a: 'VideoText does not import Rev project files. If you have subtitle files (SRT/VTT) from Rev, you can upload them to VideoText\'s Translate Subtitles or Fix Subtitles tools. For raw transcripts, you can upload the original video to VideoText and re-transcribe.',
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

export default function RevAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:via-gray-950 dark:to-indigo-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20 mb-6">
            <span className="text-[12px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Rev Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Rev alternative
            </span>{' '}
            with flat-rate pricing
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Rev charges $0.25/minute for AI transcription. VideoText starts free and scales to $10/month — no per-minute surprises. Same Whisper AI accuracy, plus subtitle export, translation, and burning.
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

        {/* Cost comparison callout */}
        <section className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-amber-800 dark:text-amber-300 mb-3">Cost comparison: Rev AI vs VideoText</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: '1 hour of video', rev: '$15.00', us: 'Free (3 imports/month)' },
              { label: '10 hours/month', rev: '$150.00', us: '$19/month (Basic)' },
              { label: '20 hours/month', rev: '$300.00', us: '$49/month (Pro)' },
            ].map(({ label, rev, us }) => (
              <div key={label} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-amber-100 dark:border-amber-500/10">
                <div className="font-medium text-gray-700 dark:text-white/60 mb-2">{label}</div>
                <div className="text-red-500 font-semibold">Rev: {rev}</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">VideoText: {us}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison table */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">VideoText vs Rev — feature comparison</h2>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Rev AI</div>
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

        {/* When Rev is the right choice */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">When Rev is worth the premium</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Rev's <strong>human transcription service ($1.99/min)</strong> is the right choice for legal depositions, medical dictation, journalism interviews, and formal broadcast where every word must be guaranteed accurate and reviewed by a human. VideoText is AI-only. If your use case requires a signed accuracy guarantee or human-verified output, Rev's human tier is appropriate despite the cost.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: DollarSign, title: 'Flat-rate pricing', body: 'No per-minute billing. $10–$129/month covers everything from 450 to 3,000 minutes. Predictable costs for teams.' },
            { icon: Zap, title: 'Subtitle tools included', body: 'Rev AI charges separately for captions. VideoText includes SRT/VTT export, subtitle translation, timing fix, and burn in every plan.' },
            { icon: Shield, title: 'YouTube URL support', body: 'Rev requires a file upload. VideoText lets you paste any YouTube URL and processes it directly — no download step.' },
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Stop paying per minute</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">VideoText is free to try, $10/month to get 450 minutes. No per-minute billing. No surprise invoices.</p>
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
