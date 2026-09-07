/**
 * SEO landing page: /trint-alternative
 * Targets: "trint alternative", "cheaper trint alternative", "trint free alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: '$80/month' },
  { label: 'No credit card to start', videotext: true, competitor: false },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '8–15 min' },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: true },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: true },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: false },
  { label: 'Works without enterprise sales', videotext: true, competitor: false },
  { label: 'Works on mobile', videotext: true, competitor: false },
  { label: 'Whisper AI accuracy', videotext: '98.5%', competitor: '~93%' },
]

const FAQ = [
  {
    q: 'What is a cheaper Trint alternative?',
    a: 'VideoText is the most direct budget alternative to Trint for pure transcription and subtitle workflows. Trint starts at $80/month for individuals; VideoText starts free and Pro is $7.99/month. Both use AI transcription, but VideoText also includes subtitle burning, video compression, and batch processing.',
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
    a: 'VideoText supports transcription in 99 languages via Whisper and subtitle translation into 70+ languages. Trint supports 40+ languages. For most common languages, VideoText covers the same range at a fraction of the price.',
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

export default function TrintAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gray-50 py-20 dark:border-white/[0.08] dark:bg-gray-900/50 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Trint Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            Switch from Trint if you need a faster, simpler{' '}
            <span className="text-blue-600 dark:text-blue-400">
              file-first transcription workflow
            </span>{' '}
            with lower cost to start
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-3xl mx-auto mb-8">
            This page is for solo creators, podcast teams, and marketing/video ops teams that tried Trint and felt the workflow was heavier than needed. Trint is strong for collaborative newsroom editing. VideoText is stronger when your priority is post-recording speed: upload a file (or a YouTube URL), get transcript + summary + chapters + subtitle exports, and move on.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript?source=trint-alternative">
              <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700">
                Run your next Trint file in VideoText
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · Clear tradeoffs · Files deleted after processing</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        <section className="rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 bg-white dark:bg-gray-900/40">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Should you switch from Trint?</h2>
          <div className="grid sm:grid-cols-2 gap-5 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Switch to VideoText if you want:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Faster self-serve transcription without enterprise-style overhead.</li>
                <li>• One-pass output (transcript, summary, chapters, SRT/VTT exports).</li>
                <li>• File-first processing for recorded content and YouTube URLs.</li>
                <li>• Lower entry cost before committing team-wide.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Stay with Trint if you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Multi-editor transcript collaboration inside one shared workspace.</li>
                <li>• Newsroom-style review and publishing workflows at team scale.</li>
                <li>• A workflow centered on editing/transcript collaboration over export speed.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Why people leave Trint */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why teams look for a Trint alternative</h2>
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
                <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Workflow differences that matter in real projects</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Trint-style workflow</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Best when teams need shared transcript editing and enterprise process controls. Tradeoff: higher starting price and more workflow steps for simple transcript-to-export jobs.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">VideoText workflow</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Best when one person or a small team needs fast, structured output from recorded files. Tradeoff: no multi-user transcript collaboration layer.</p>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Trint — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
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
            { icon: DollarSign, title: 'About 90% cheaper', body: 'Trint\'s minimum is $80/month. VideoText Pro is $7.99/month flat rate — and starts free with no credit card.' },
            { icon: Zap, title: 'No enterprise sales process', body: 'Trint requires contacting sales for team plans. VideoText is self-serve — sign up, upgrade instantly, no calls.' },
            { icon: Shield, title: 'Complete file deletion', body: 'VideoText deletes your files after processing. Trint stores everything in their cloud by default.' },
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-3">Compare your next-best options</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">If Trint feels heavy for your workflow, compare other file-first options before you switch.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/rev-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Rev alternative</Link>
            <Link to="/notta-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Notta alternative</Link>
            <Link to="/otter-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Otter alternative</Link>
            <Link to="/best-transcription-tool" className="text-blue-600 dark:text-blue-400 hover:underline">Best transcription tool</Link>
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
        <section className="rounded-xl border border-white/[0.08] bg-gray-950 p-8 text-center sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Test a real Trint job before you switch</h2>
          <p className="text-white/55 mb-8 max-w-xl mx-auto">Upload one of your normal recordings and compare speed, output structure, and export readiness directly in your own workflow.</p>
          <Link to="/video-to-transcript?source=trint-alternative">
            <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-blue-700">
              Compare with your own file
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
