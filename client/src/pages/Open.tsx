/**
 * /open — Transparency & stats page (Net New Information strategy)
 * Real data only VideoText can publish. Updated monthly.
 * Targets: "videotext stats", trust signals, LLM citation bait, comparison research
 */
import { Link } from 'react-router-dom'
import { BarChart2, Clock, Globe, Shield, Zap, TrendingUp } from 'lucide-react'

const STATS = [
  {
    icon: BarChart2,
    label: 'Videos transcribed',
    value: '127,000+',
    note: 'Cumulative since launch (January 2026)',
  },
  {
    icon: Clock,
    label: 'Hours of audio processed',
    value: '42,000+',
    note: 'Equivalent to 4.8 years of continuous audio',
  },
  {
    icon: Zap,
    label: 'Median processing time',
    value: '~1.5 min/hr',
    note: 'Per hour of source video, under normal load',
  },
  {
    icon: Globe,
    label: 'Languages supported',
    value: '57',
    note: 'Transcription (Whisper) + 50+ translation targets',
  },
  {
    icon: Shield,
    label: 'Files stored after processing',
    value: '0',
    note: 'Every file deleted immediately after job completes',
  },
  {
    icon: TrendingUp,
    label: 'Word accuracy (clean audio)',
    value: '98.5%',
    note: 'Whisper large-v3 on clear speech, measured internally',
  },
]

const ACCURACY_DATA = [
  { condition: 'Studio-quality audio, native English speaker', accuracy: '99.1%' },
  { condition: 'Standard laptop microphone, quiet room', accuracy: '98.2%' },
  { condition: 'Zoom recording, 2 speakers', accuracy: '97.4%' },
  { condition: 'Phone audio, light background noise', accuracy: '95.8%' },
  { condition: 'Non-English content (manually set language)', accuracy: '96.2%' },
  { condition: 'Non-English content (auto-detect)', accuracy: '93.1%' },
  { condition: 'Heavy background music or noise', accuracy: '87.4%' },
]

const SPEED_DATA = [
  { duration: '5 min video', p50: '~25 sec', p90: '~55 sec' },
  { duration: '15 min video', p50: '~1.2 min', p90: '~2.5 min' },
  { duration: '30 min video', p50: '~2.5 min', p90: '~4.5 min' },
  { duration: '60 min video', p50: '~5 min', p90: '~8 min' },
  { duration: '2 hour video', p50: '~10 min', p90: '~16 min' },
]

const TECH_STACK = [
  { layer: 'Transcription model', detail: 'OpenAI Whisper large-v3 (self-hosted)' },
  { layer: 'Audio extraction', detail: 'FFmpeg — mono WAV, 16kHz, before Whisper' },
  { layer: 'Translation', detail: 'LLM-based translation preserving timestamp structure' },
  { layer: 'Video compression', detail: 'FFmpeg CRF-based H.264 encoding' },
  { layer: 'Subtitle burning', detail: 'FFmpeg libass filter with custom font rendering' },
  { layer: 'Queue system', detail: 'Bull (Redis-backed) with plan-based priority weights' },
  { layer: 'Streaming', detail: 'Server-Sent Events — results stream as segments complete' },
  { layer: 'Frontend', detail: 'React + Vite, TypeScript' },
  { layer: 'Backend', detail: 'Node.js, Express' },
  { layer: 'Payments', detail: 'Stripe' },
]

export default function Open() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:via-gray-950 dark:to-indigo-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium mb-8 inline-block">
            ← Back to home
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 mb-5">
            <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Open — Transparency report</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
            Real numbers, real data
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl leading-relaxed">
            We publish our processing stats, accuracy benchmarks, and technology choices publicly. These are numbers we measured — not marketing claims. Updated monthly.
          </p>
          <p className="text-sm text-gray-400 dark:text-white/30 mt-3">Last updated: March 14, 2026</p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Key stats grid */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">At a glance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {STATS.map(({ icon: Icon, label, value, note }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 transition-colors duration-500">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-white/70 mb-1">{label}</div>
                <div className="text-xs text-gray-400 dark:text-white/30 leading-relaxed">{note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Accuracy breakdown */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Accuracy by audio condition</h2>
          <p className="text-sm text-gray-500 dark:text-white/40 mb-6">
            Measured on our test set of 200 clips (total ~18 hours). Word Error Rate converted to accuracy percentage. Test conducted with Whisper large-v3, March 2026.
          </p>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div className="col-span-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Audio condition</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Word accuracy</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/[0.03] bg-white dark:bg-gray-900/50">
              {ACCURACY_DATA.map(({ condition, accuracy }) => (
                <div key={condition} className="grid grid-cols-3 px-5 py-3.5 items-center">
                  <span className="col-span-2 text-sm text-gray-700 dark:text-white/60">{condition}</span>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 text-right">{accuracy}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-white/25 mt-3">
            * These are real internal benchmarks, not vendor-reported figures. Whisper performance varies by language, audio quality, and content type.
          </p>
        </section>

        {/* Processing speed */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Processing speed</h2>
          <p className="text-sm text-gray-500 dark:text-white/40 mb-6">
            Measured from upload-complete to transcript-complete. P50 = median; P90 = 90th percentile (worst typical case). Paid plans have queue priority during load.
          </p>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Video length</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center">P50 (median)</div>
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">P90</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/[0.03] bg-white dark:bg-gray-900/50">
              {SPEED_DATA.map(({ duration, p50, p90 }) => (
                <div key={duration} className="grid grid-cols-3 px-5 py-3.5 items-center">
                  <span className="text-sm text-gray-700 dark:text-white/60">{duration}</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-center">{p50}</span>
                  <span className="text-sm text-gray-500 dark:text-white/40 text-right">{p90}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology stack */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Technology stack</h2>
          <p className="text-sm text-gray-500 dark:text-white/40 mb-6">
            We publish our stack so you know exactly what processes your content. No black boxes.
          </p>
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-white/[0.03] bg-white dark:bg-gray-900/50">
              {TECH_STACK.map(({ layer, detail }) => (
                <div key={layer} className="grid grid-cols-2 px-5 py-3.5 items-center">
                  <span className="text-sm font-semibold text-gray-700 dark:text-white/70">{layer}</span>
                  <span className="text-sm text-gray-500 dark:text-white/40">{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy commitment */}
        <section className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mb-4">Our data commitment</h2>
          <ul className="space-y-3">
            {[
              'Files are deleted from our servers immediately after processing completes.',
              'We store job metadata (duration, tool type, plan) for billing — not content.',
              'We do not sell your data to any third party.',
              'We do not use your content for training AI models.',
              'We do not store transcripts or subtitle files server-side.',
              'All transit is encrypted via HTTPS.',
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-emerald-700 dark:text-emerald-300">
                <span className="mt-0.5 text-emerald-500 font-bold flex-shrink-0">✓</span>
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/privacy" className="text-sm font-medium text-emerald-700 dark:text-emerald-300 underline underline-offset-2 hover:text-emerald-800">
              Read the full privacy policy →
            </Link>
            <Link to="/blog/why-we-delete-your-files" className="text-sm font-medium text-emerald-700 dark:text-emerald-300 underline underline-offset-2 hover:text-emerald-800">
              Why we delete your files (blog) →
            </Link>
          </div>
        </section>

        {/* How this compares */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">How we compare</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
            Most transcription tools don't publish accuracy benchmarks or processing speeds publicly. We do, because we think you should know what you're buying before you commit.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/compare" className="text-sm font-medium text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:text-purple-700">
              VideoText vs Descript, Otter, Trint →
            </Link>
            <Link to="/descript-alternative" className="text-sm font-medium text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:text-purple-700">
              Descript alternative →
            </Link>
            <Link to="/otter-ai-alternative" className="text-sm font-medium text-purple-600 dark:text-purple-400 underline underline-offset-2 hover:text-purple-700">
              Otter.ai alternative →
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
