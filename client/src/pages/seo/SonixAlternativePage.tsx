/**
 * SEO landing page: /sonix-alternative
 * Targets: "sonix alternative", "sonix transcription alternative", "alternative to sonix"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: '$22/month or $10/hour' },
  { label: 'Free tier (no credit card)', videotext: true, competitor: false },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'Video file transcription (MP4, MOV)', videotext: true, competitor: true },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: true },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: true },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: true },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '3–6 min' },
  { label: 'Whisper AI accuracy', videotext: '98.5%', competitor: '~97%' },
  { label: 'No per-minute overage charges', videotext: true, competitor: false },
]

const FAQ = [
  {
    q: 'What is the best free Sonix alternative?',
    a: 'VideoText is the strongest free Sonix alternative. Sonix has no permanent free tier — only a 30-minute trial. VideoText gives you 3 free imports per month with no credit card required, no time limit, and no hidden per-minute overages.',
  },
  {
    q: 'Is VideoText cheaper than Sonix?',
    a: 'Yes. Sonix costs $22/month for the Standard plan (roughly 100 minutes included) and charges $0.10 per additional minute. VideoText Pro is $7.99/month flat. For most users — podcasters, YouTubers, course creators — VideoText is significantly cheaper with no per-minute billing surprises.',
  },
  {
    q: 'How does VideoText accuracy compare to Sonix?',
    a: 'Both use Whisper-based AI. VideoText uses Whisper large-v3 and reports 98.5% word accuracy on clean audio. Sonix uses a custom model built on similar technology. For most real-world content (interviews, podcasts, webinars), output quality is comparable. VideoText is typically faster because it does not run an interactive editor as part of the pipeline.',
  },
  {
    q: 'Can VideoText transcribe YouTube videos without downloading them?',
    a: 'Yes. Paste any YouTube URL and VideoText streams the audio directly — no download, no file upload. Sonix requires you to download the video file and upload it manually, which adds steps for any YouTube-based workflow.',
  },
  {
    q: 'Does Sonix store my transcription files?',
    a: 'Yes. Sonix stores all your media and transcripts in their cloud until you delete them. VideoText deletes your file immediately after processing completes. If you handle confidential interviews, legal depositions, or sensitive client content, VideoText\'s deletion model is the safer choice.',
  },
  {
    q: 'Does VideoText have a transcript editor like Sonix?',
    a: 'VideoText does not provide an in-browser interactive editor — it focuses on delivering accurate output fast. Sonix has a strong editor for correcting transcripts word-by-word. If your workflow involves heavy manual correction inside the tool, Sonix\'s editor is a genuine advantage. If you want fast, accurate exports to TXT, SRT, or VTT with minimal editing, VideoText is faster and cheaper.',
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

export default function SonixAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gray-50 py-20 dark:border-white/[0.08] dark:bg-gray-900/50 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Sonix Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            The best free{' '}
            <span className="text-blue-600 dark:text-blue-400">
              Sonix alternative
            </span>{' '}
            with no per-minute fees
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Sonix charges $22/month plus $0.10 per minute over your plan. VideoText starts free — upload any video or paste a YouTube URL, get an accurate transcript with no overage billing ever.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · No per-minute billing · Files deleted after processing</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for Sonix alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why people look for a Sonix alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Sonix is a well-respected transcription platform — but its pricing model and feature gaps push many users to look for alternatives:
          </p>
          <ul className="space-y-3">
            {[
              'No free tier — only a limited 30-minute trial before requiring payment.',
              '$22/month base plan includes ~100 minutes, then $0.10/minute extra — costs spike for longer content.',
              'No YouTube URL input — every video must be downloaded and uploaded manually.',
              'No subtitle burning into video — requires a separate tool after export.',
              'Files retained in cloud until manually deleted — a risk for sensitive or confidential recordings.',
              'Per-seat pricing on team plans means costs multiply quickly for small agencies.',
              'Pay-as-you-go rate of $10/hour is expensive compared to flat-rate plans.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Sonix — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Sonix</div>
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

        {/* When Sonix is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Sonix is still the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Sonix is the right tool if your workflow depends heavily on its <strong>in-browser interactive editor</strong> — clicking words to jump to audio, correcting transcripts with synchronized playback, and sharing drafts with collaborators for review. Its editor is polished and widely used by journalists and researchers who need to correct output word-by-word. VideoText does not offer this kind of editor. If your process is export-and-done rather than edit-in-place, VideoText is faster and cheaper.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: DollarSign, title: 'No per-minute billing', body: 'Sonix charges $0.10/minute over your plan. VideoText Pro is a flat $7.99/month — no surprise invoices for longer podcasts or webinars.' },
            { icon: Zap, title: 'YouTube URL in one click', body: 'Paste any YouTube link and VideoText transcribes it directly. Sonix requires you to download the file and upload it — an extra step for every YouTube video.' },
            { icon: Shield, title: 'Deleted after processing', body: 'VideoText removes your file the instant the job finishes. Sonix retains all media and transcripts in their cloud. Critical difference for legal, HR, or medical audio.' },
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Switch from Sonix — start free today</h2>
          <p className="text-white/55 mb-8 max-w-xl mx-auto">Upload a video or paste a YouTube URL. Accurate transcript, SRT, or VTT in minutes. No per-minute fees. No file retention. Free tier, no credit card.</p>
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
