/**
 * SEO landing page: /rev-alternative
 */
import { DollarSign, Shield, Zap } from 'lucide-react'
import {
  SeoAlternativeShell,
  SeoAlternativeHero,
  SeoCompareTable,
  SeoDecisionSection,
  SeoTwoColumnCards,
  SeoAdvantageGrid,
  SeoRelatedLinks,
  SeoFaqSection,
  SeoFinalCta,
  SeoBody,
} from '../../components/seo/SeoAlternativeLayout'

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
    a: "Both use Whisper-based AI models. VideoText uses Whisper large-v3 and reports 98.5% word accuracy on clear audio. Rev AI reports similar figures. For 99%+ accuracy with a human reviewer, Rev's human transcription service ($1.99/min) is in a different category — VideoText does not offer human review.",
  },
  {
    q: "Does VideoText replace Rev's human transcription service?",
    a: 'No. Rev\'s human transcription is the gold standard for legal depositions, medical dictation, and formal broadcasts where every word must be guaranteed accurate. VideoText is AI-only. For creative, educational, or business content where 98%+ accuracy is acceptable, VideoText is the cost-effective choice.',
  },
  {
    q: 'Why is Rev so expensive compared to VideoText?',
    a: 'Rev\'s AI service charges per minute of audio ($0.25/min). A 10-hour course would cost $150 on Rev AI vs $7.99/month on VideoText Pro. Rev\'s human transcription adds human reviewers, which justifies the $1.99/min premium for high-stakes content.',
  },
  {
    q: 'Can I import my existing Rev transcripts into VideoText?',
    a: "VideoText does not import Rev project files. If you have subtitle files (SRT/VTT) from Rev, you can upload them to VideoText's Translate Subtitles or Fix Subtitles tools. For raw transcripts, you can upload the original video to VideoText and re-transcribe.",
  },
]

export default function RevAlternativePage() {
  return (
    <SeoAlternativeShell>
      <SeoAlternativeHero
        badge="Rev Alternative"
        title="A credible Rev alternative for teams choosing speed over human-review turnaround"
        description="This page is for buyers deciding between Rev's service model and a self-serve AI workflow. If you need human-reviewed transcripts for legal, medical, or publication-critical work, Rev can still be the right answer. If your priority is fast post-recording output for content, marketing, education, or internal ops, VideoText is usually the faster and lower-friction path."
        ctaHref="/video-to-transcript?source=rev-alternative"
        ctaLabel="Compare Rev vs VideoText on your next file"
        ctaNote="No credit card · Honest tradeoffs included"
      />

      <SeoBody>
        <SeoDecisionSection
          title="How to decide quickly: Rev or VideoText?"
          chooseUsTitle="Choose VideoText when you need:"
          chooseUsPoints={[
            'Fast self-serve turnaround for recorded files.',
            'Structured output (summary, chapters, subtitle exports) in one run.',
            'Predictable flat-rate pricing instead of per-minute variability.',
          ]}
          chooseThemTitle="Choose Rev when you need:"
          chooseThemPoints={[
            'Human-reviewed transcripts with premium accuracy expectations.',
            'Workflows where legal/compliance tolerance for AI errors is low.',
            'Service-backed review rather than pure self-serve automation.',
          ]}
        />

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/20 dark:bg-amber-500/10">
          <h2 className="mb-3 text-lg font-medium text-amber-800 dark:text-amber-300">
            Cost comparison: Rev AI vs VideoText
          </h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            {[
              { label: '1 hour of video', rev: '$15.00', us: 'Free (3 imports/month)' },
              { label: '10 hours/month', rev: '$150.00', us: '$7.99/month (Pro)' },
              { label: '20 hours/month', rev: '$300.00', us: '$7.99/month (Pro)' },
            ].map(({ label, rev, us }) => (
              <div
                key={label}
                className="rounded-lg border border-amber-100 bg-white p-4 dark:border-amber-500/10 dark:bg-gray-900"
              >
                <div className="mb-2 font-medium text-gray-700 dark:text-white/60">{label}</div>
                <div className="font-semibold text-red-500">Rev: {rev}</div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">VideoText: {us}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-medium text-gray-900 dark:text-white">
            VideoText vs Rev — feature comparison
          </h2>
          <SeoCompareTable competitorLabel="Rev AI" rows={COMPARE_ROWS} />
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-medium text-gray-900 dark:text-white">When Rev is worth the premium</h2>
          <p className="leading-relaxed text-gray-600 dark:text-gray-300">
            Rev&apos;s <strong>human transcription service ($1.99/min)</strong> is the right choice for legal
            depositions, medical dictation, journalism interviews, and formal broadcast where every word must be
            guaranteed accurate and reviewed by a human. VideoText is AI-only. If your use case requires a signed
            accuracy guarantee or human-verified output, Rev&apos;s human tier is appropriate despite the cost.
          </p>
        </section>

        <SeoTwoColumnCards
          title="Output and effort tradeoff"
          leftTitle="Rev"
          leftBody="Strong for high-stakes accuracy with human review, but slower and often more expensive for high-volume content operations."
          rightTitle="VideoText"
          rightBody="Strong for fast transcript-to-publish workflows with summary, chapters, and subtitle exports in one pass. No human-review tier."
        />

        <SeoAdvantageGrid
          items={[
            {
              icon: DollarSign,
              title: 'Flat-rate pricing',
              body: 'No per-minute billing. Pro is $7.99/month — continued processing, predictable costs for teams.',
            },
            {
              icon: Zap,
              title: 'Subtitle tools included',
              body: 'Rev AI charges separately for captions. VideoText includes SRT/VTT export, subtitle translation, timing fix, and burn in every plan.',
            },
            {
              icon: Shield,
              title: 'YouTube URL support',
              body: 'Rev requires a file upload. VideoText lets you paste any YouTube URL and processes it directly — no download step.',
            },
          ]}
        />

        <SeoRelatedLinks
          title="Alternative pages in this cluster"
          links={[
            { label: 'Trint alternative', to: '/trint-alternative' },
            { label: 'Notta alternative', to: '/notta-alternative' },
            { label: 'Fireflies alternative', to: '/fireflies-alternative' },
            { label: 'Best transcription tool', to: '/best-transcription-tool' },
            { label: 'Transcription benchmark', to: '/transcription-benchmark' },
          ]}
        />

        <SeoFaqSection faqs={FAQ} />

        <SeoFinalCta
          title="Run a real Rev-style test in minutes"
          description="Use one of your typical files and compare turnaround, export readiness, and total effort before deciding where to migrate."
          href="/video-to-transcript?source=rev-alternative"
          buttonLabel="Start your comparison run"
        />
      </SeoBody>
    </SeoAlternativeShell>
  )
}
