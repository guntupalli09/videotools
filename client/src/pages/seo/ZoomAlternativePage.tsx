/**
 * SEO landing page: /zoom-alternative
 * Targets: "zoom transcription alternative", "zoom alternative for transcription",
 *          "zoom ai companion alternative", "free zoom transcription"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: '$20+/user/mo (Business+)' },
  { label: 'Works on any Zoom plan (incl. free)', videotext: true, competitor: false },
  { label: 'Works on downloaded MP4 offline', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'No Zoom account required', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'YouTube URL → transcript', videotext: true, competitor: false },
  { label: 'Burn captions into video', videotext: true, competitor: false },
  { label: 'Keyword index across transcript', videotext: true, competitor: false },
  { label: 'Speaker detection', videotext: true, competitor: true },
  { label: 'Auto chapter generation', videotext: true, competitor: false },
  { label: 'Whisper accuracy (1-hr meeting)', videotext: '~98.5%', competitor: '~85%' },
]

const FAQ = [
  {
    q: 'Do I need a paid Zoom plan to transcribe meetings?',
    a: 'With Zoom, AI Companion transcription requires a Business or Enterprise plan ($20+/user/month). VideoText is free to start — download your Zoom recording as MP4 and upload it here. No Zoom plan upgrade needed, no Zoom account required.',
  },
  {
    q: 'How do I get my Zoom recording to transcribe with VideoText?',
    a: 'Cloud recordings: zoom.us → Recordings → Download MP4. Local recordings: Documents/Zoom folder on your computer. Upload the MP4 to VideoText and get a full transcript with speaker labels in 5–8 minutes for a 60-minute call.',
  },
  {
    q: 'Is VideoText more accurate than Zoom\'s built-in transcription?',
    a: 'VideoText uses Whisper large-v3 (~98.5% word accuracy on clear speech). Zoom AI Companion uses its own model optimised for live meeting conditions and typically scores ~85% on playback audio. VideoText also adds chapters, keywords, and SRT export on top of the raw transcript.',
  },
  {
    q: 'Does VideoText store my Zoom recordings?',
    a: 'No. Your file is deleted immediately after transcription is complete. Zoom stores cloud recordings until you manually delete them. VideoText has zero data retention.',
  },
  {
    q: 'Can I get SRT caption files from my Zoom recording?',
    a: 'Zoom does not natively export SRT files from AI Companion transcripts. VideoText does — upload your Zoom MP4 and download an SRT or VTT file for uploading to YouTube, Vimeo, or any platform.',
  },
  {
    q: 'What if my team is on a Zoom Basic or Pro plan?',
    a: 'Zoom AI Companion is not available on Basic or Pro plans. VideoText works regardless of your Zoom tier — download the local MP4 recording, upload it here, and get a full transcript. No upgrade needed.',
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

export default function ZoomAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gray-50 py-20 dark:border-white/[0.08] dark:bg-gray-900/50 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Zoom Transcription Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="text-blue-600 dark:text-blue-400">
              Zoom transcription alternative
            </span>{' '}
            — no Business plan needed
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Zoom AI Companion transcription is locked behind Business and Enterprise plans. VideoText transcribes any Zoom MP4 recording for free — speaker labels, SRT export, and no Zoom account required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · Files deleted after processing</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for a Zoom alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why users search for a Zoom transcription alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Zoom added AI Companion transcription in 2023, but it comes with significant restrictions that push most users to look for alternatives:
          </p>
          <ul className="space-y-3">
            {[
              'Zoom AI Companion requires Business or Enterprise plan — $20+/user/month above existing subscription costs.',
              'Not available on Zoom Basic or Pro plans even with add-ons.',
              'Transcripts are stored in the Zoom cloud — you cannot control where your meeting data goes.',
              'No SRT or VTT subtitle export — output is plain text only, locked inside the Zoom interface.',
              'No subtitle translation — output is in the meeting language only.',
              'Cannot process recordings from other platforms or local video files.',
              'Accuracy on recordings with background noise or accents is typically ~85% — below Whisper large-v3.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Zoom AI Companion — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Zoom AI Companion</div>
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

        {/* When Zoom AI Companion is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Zoom AI Companion is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Zoom AI Companion is the right tool if you need <strong>real-time live transcription during the meeting itself</strong> — appearing as a live caption overlay for all participants, integrated with Zoom's smart chapters and meeting summaries inside the Zoom app. If your organisation already pays for Business/Enterprise and live meeting UX is the priority, AI Companion is convenient. VideoText is better for <strong>post-meeting processing of downloaded recordings</strong> — especially if you need subtitle files, translation, keyword search, or privacy-first file handling.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: DollarSign, title: 'No plan upgrade needed', body: 'Zoom AI Companion is locked behind Business/Enterprise. VideoText works on any Zoom plan — just download the MP4 and upload it here for free.' },
            { icon: Shield, title: 'Privacy-first processing', body: 'Zoom stores your meeting transcripts in its cloud. VideoText deletes your file immediately after transcription. Nothing is retained.' },
            { icon: Zap, title: 'SRT + translation included', body: 'Export SRT or VTT subtitle files and translate to 70+ languages. Zoom AI Companion has no subtitle export and no translation feature.' },
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Transcribe your Zoom recording now</h2>
          <p className="text-white/55 mb-8 max-w-xl mx-auto">Download the MP4 from Zoom, upload it here. Get a full transcript with speaker labels in minutes — free, no Zoom plan upgrade needed.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-blue-700">
              Try VideoText free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
