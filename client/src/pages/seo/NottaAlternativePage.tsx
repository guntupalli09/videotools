/**
 * SEO landing page: /notta-alternative
 * Targets: "notta alternative", "notta ai alternative", "notta vs videotext",
 *          "free notta alternative", "notta 3 minute limit alternative"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: 'Free / $13.99/mo' },
  { label: 'Max duration per file (free tier)', videotext: 'No limit', competitor: '3 minutes' },
  { label: 'Monthly allowance (free tier)', videotext: '3 full imports', competitor: '120 min/month' },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Burn captions into video', videotext: true, competitor: false },
  { label: 'Chapter auto-generation', videotext: true, competitor: false },
  { label: 'Keyword index across transcript', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'No account needed to try', videotext: true, competitor: false },
  { label: 'Speaker detection', videotext: true, competitor: true },
  { label: 'YouTube URL → transcript', videotext: true, competitor: true },
  { label: 'Live meeting bot integration', videotext: false, competitor: true },
  { label: 'Whisper accuracy', videotext: '~98.5%', competitor: '~91%' },
]

const FAQ = [
  {
    q: 'What is Notta\'s 3-minute limit and how does VideoText avoid it?',
    a: 'Notta\'s free tier limits each individual transcription to 3 minutes of audio. A 60-minute meeting would only produce the first 3 minutes as a transcript. VideoText has no per-file duration cap on the free tier — upload a 2-hour lecture or a 90-minute meeting and get the full transcript.',
  },
  {
    q: 'Does VideoText have a monthly transcription limit like Notta?',
    a: 'VideoText free tier gives you 3 monthly imports for files up to 30 minutes. Notta free tier gives 120 minutes per month but caps each file at 3 minutes. For most users, VideoText\'s model is more practical for real-world recording lengths.',
  },
  {
    q: 'Does VideoText support the same file formats as Notta?',
    a: 'Yes. VideoText accepts MP4, MOV, AVI, WebM, MKV (video) and MP3, WAV, M4A, AAC, OGG, FLAC (audio) — all the formats Notta supports, plus more video container formats.',
  },
  {
    q: 'Can VideoText replace Notta for meeting transcription?',
    a: 'For file-based transcription (uploaded recordings) — yes. VideoText transcribes downloaded Zoom, Teams, Google Meet, or any other meeting recordings with speaker labels and summary. Notta also has a live meeting bot that joins calls in real time — VideoText does not offer that feature.',
  },
  {
    q: 'Does VideoText export SRT files like Notta?',
    a: 'Yes — and unlike Notta, VideoText exports SRT and VTT subtitle files on the free tier. Notta only exports plain text on its free plan; SRT export requires a Pro subscription.',
  },
  {
    q: 'Is VideoText free to try without creating an account?',
    a: 'Yes. VideoText offers 3 free imports without requiring an account. Notta requires account creation before you can try transcription.',
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

export default function NottaAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gray-50 py-20 dark:border-white/[0.08] dark:bg-gray-900/50 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Notta Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            A practical{' '}
            <span className="text-blue-600 dark:text-blue-400">
              Notta alternative
            </span>{' '}
            for meeting files and post-call outputs
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-3xl mx-auto mb-8">
            Use this page if you’re deciding between a meeting notes assistant and a simpler file-first workflow after the call. Notta is strong for live meeting capture and searchable note history. VideoText is stronger when you need clean transcript outputs from recorded files, subtitle exports, and fast handoff assets without bot attendance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript?source=notta-alternative">
              <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700">
                Compare your next meeting file
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · No bot required · File-first workflow</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        <section className="rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 bg-white dark:bg-gray-900/40">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Should you switch from Notta?</h2>
          <div className="grid sm:grid-cols-2 gap-5 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Switch to VideoText if you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Post-meeting transcript packages from downloaded recordings.</li>
                <li>• SRT/VTT outputs, chaptered summaries, and export-ready files.</li>
                <li>• A no-bot workflow for clients or internal teams that avoid call attendees.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Stay with Notta if you need:</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Live assistant behavior during meetings.</li>
                <li>• Real-time note capture and ongoing searchable meeting archive.</li>
                <li>• A workflow centered on in-call capture instead of post-call production.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Why people look for a Notta alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why users search for a Notta alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Notta is a capable meeting transcription tool, but its free tier limitations frustrate users who work with real-world recording lengths:
          </p>
          <ul className="space-y-3">
            {[
              'Free tier hard-caps each transcription at 3 minutes — a 60-minute meeting produces only the first 3 minutes.',
              'Monthly limit of 120 minutes total on the free plan — roughly 2 full meetings per month.',
              'SRT and VTT subtitle export locked behind paid plans.',
              'No chapter generation or keyword indexing on the free tier.',
              'Transcripts stored in Notta\'s cloud — not immediately deleted after processing.',
              'Account required before any transcription can be tested.',
              'Paid plans start at $13.99/month — higher than comparable tools.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Notta — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Notta</div>
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

        {/* When Notta is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Notta is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Notta is the right tool if you need a <strong>live meeting bot</strong> that joins your Zoom, Teams, or Google Meet calls automatically via calendar integration, transcribes in real time, and builds a searchable archive of all past meetings. Its team collaboration features and meeting search across an entire organisation are also strong. VideoText is better for <strong>file-based transcription</strong> of individual recordings — especially when you need SRT export, subtitle translation, or longer files than Notta's free tier permits.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Workflow simplicity vs meeting-assistant depth</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Notta approach</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Designed for ongoing note capture and searchable meeting history, especially when your process depends on in-meeting tooling.</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.06] p-5">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">VideoText approach</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Designed for upload-after-call simplicity: recorded file in, transcript + summary + chapters + subtitle exports out, ready for handoff.</p>
            </div>
          </div>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'No per-file duration limit', body: 'Notta free tier caps files at 3 minutes. VideoText has no cap — upload a 3-hour recording and get the full transcript on the free tier.' },
            { icon: DollarSign, title: 'SRT export on free tier', body: 'VideoText includes SRT and VTT export at no cost. Notta locks subtitle export behind paid plans starting at $13.99/month.' },
            { icon: Shield, title: 'Files deleted after processing', body: 'VideoText deletes your file immediately after transcription. Notta keeps your transcripts and recordings in its cloud storage.' },
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-3">More meeting-tool alternatives</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Notta, Otter, and Fireflies often overlap for meeting users. Use these pages to compare tradeoffs clearly.</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link to="/otter-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Otter alternative</Link>
            <Link to="/fireflies-alternative" className="text-blue-600 dark:text-blue-400 hover:underline">Fireflies alternative</Link>
            <Link to="/meeting-transcription-tool" className="text-blue-600 dark:text-blue-400 hover:underline">Meeting transcription tool</Link>
            <Link to="/meeting-recording-to-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">Meeting recording to transcript</Link>
            <Link to="/google-meet-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">Google Meet transcript</Link>
            <Link to="/zoom-meeting-transcript" className="text-blue-600 dark:text-blue-400 hover:underline">Zoom meeting transcript</Link>
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Upload one recorded meeting and compare output quality</h2>
          <p className="text-white/55 mb-8 max-w-xl mx-auto">Use your next call recording to compare transcript readability, summary usefulness, chapter structure, and export coverage in one run.</p>
          <Link to="/video-to-transcript?source=notta-alternative">
            <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-blue-700">
              Start a no-bot comparison
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
