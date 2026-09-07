/**
 * SEO landing page: /rev-alternative
 * Targets: "rev alternative", "rev ai alternative", "free rev transcription alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: '$0.25/minute (AI) or $1.99/min (human)' },
  { label: 'Flat-rate monthly plan available', videotext: true, competitor: false },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '~5 min (AI) / 12+ hrs (human)' },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: true },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: false },
  { label: 'Flat monthly pricing', videotext: true, competitor: false },
  { label: 'No per-minute billing surprises', videotext: true, competitor: false },
  { label: 'Works on mobile', videotext: true, competitor: true },
]

const FAQ = [
  {
    q: 'What is the best free Rev alternative for AI transcription?',
    a: 'VideoText is the most cost-effective alternative for AI transcription. Rev AI charges $0.25/minute — a 60-minute video costs $15. VideoText Pro is $7.99/month flat with no per-minute charges. Free tier included with 3 uploads/month, no card needed.',
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
    a: 'Rev\'s AI service charges per minute of audio ($0.25/min). A 10-hour course would cost $150 on Rev AI vs $7.99/month on VideoText Pro. Rev\'s human transcription adds human reviewers, which justifies the $1.99/min premium for high-stakes content.',
  },
  {
    q: 'Can I import my existing Rev transcripts into VideoText?',
    a: 'VideoText does not import Rev project files. If you have subtitle files (SRT/VTT) from Rev, you can upload them to VideoText\'s Translate Subtitles or Fix Subtitles tools. For raw transcripts, you can upload the original video to VideoText and re-transcribe.',
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

export default function RevAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Rev Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            A credible{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Rev alternative
            </span>{' '}
            for teams choosing speed over human-review turnaround
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-3xl mx-auto mb-8">
            This page is for buyers deciding between Rev’s service model and a self-serve AI workflow. If you need human-reviewed transcripts for legal, medical, or publication-critical work, Rev can still be the right answer. If your priority is fast post-recording output for content, marketing, education, or internal ops, VideoText is usually the faster and lower-friction path.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript?source=rev-alternative">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
                Compare Rev vs VideoText on your next file
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · Honest tradeoffs included</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        <section className="rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 bg-white dark:bg-gray-900/40">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">How to decide quickly: Rev or VideoText?</h2>
          <div className="grid sm:grid-cols-2 gap-5 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Choose VideoText when you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Fast self-serve turnaround for recorded files.</li>
                <li>• Structured output (summary, chapters, subtitle exports) in one run.</li>
                <li>• Predictable flat-rate pricing instead of per-minute variability.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Choose Rev when you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Human-reviewed transcripts with premium accuracy expectations.</li>
                <li>• Workflows where legal/compliance tolerance for AI errors is low.</li>
                <li>• Service-backed review rather than pure self-serve automation.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Cost comparison callout */}
        <section className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <h2 className="text-lg font-medium text-amber-800 dark:text-amber-300 mb-3">Cost comparison: Rev AI vs VideoText</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: '1 hour of video', rev: '$15.00', us: 'Free (3 imports/month)' },
              { label: '10 hours/month', rev: '$150.00', us: '$7.99/month (Pro)' },
              { label: '20 hours/month', rev: '$300.00', us: '$7.99/month (Pro)' },
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Rev — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Rev is worth the premium</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Rev's <strong>human transcription service ($1.99/min)</strong> is the right choice for legal depositions, medical dictation, journalism interviews, and formal broadcast where every word must be guaranteed accurate and reviewed by a human. VideoText is AI-only. If your use case requires a signed accuracy guarantee or human-verified output, Rev's human tier is appropriate despite the cost.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Output and effort tradeoff</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Rev</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Strong for high-stakes accuracy with human review, but slower and often more expensive for high-volume content operations.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">VideoText</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Strong for fast transcript-to-publish workflows with summary, chapters, and subtitle exports in one pass. No human-review tier.</p>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: DollarSign, title: 'Flat-rate pricing', body: 'No per-minute billing. Pro is $7.99/month — continued processing, predictable costs for teams.' },
            { icon: Zap, title: 'Subtitle tools included', body: 'Rev AI charges separately for captions. VideoText includes SRT/VTT export, subtitle translation, timing fix, and burn in every plan.' },
            { icon: Shield, title: 'YouTube URL support', body: 'Rev requires a file upload. VideoText lets you paste any YouTube URL and processes it directly — no download step.' },
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-3">Alternative pages in this cluster</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Rev is strong for human-verified work. For faster AI-first workflows, compare these options.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/trint-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Trint alternative</Link>
            <Link to="/notta-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Notta alternative</Link>
            <Link to="/fireflies-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Fireflies alternative</Link>
            <Link to="/best-transcription-tool" className="text-blue-600 dark:text-blue-400 hover:underline">Best transcription tool</Link>
            <Link to="/transcription-benchmark" className="text-blue-600 dark:text-blue-400 hover:underline">Transcription benchmark</Link>
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Run a real Rev-style test in minutes</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Use one of your typical files and compare turnaround, export readiness, and total effort before deciding where to migrate.</p>
          <Link to="/video-to-transcript?source=rev-alternative">
            <span className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
              Start your comparison run
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
