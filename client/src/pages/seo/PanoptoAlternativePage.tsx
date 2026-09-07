/**
 * SEO landing page: /panopto-alternative
 * Targets: "panopto alternative", "panopto transcription alternative",
 *          "panopto caption export", "transcribe panopto lecture", "panopto srt"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: 'Institutional subscription only' },
  { label: 'Works without institutional account', videotext: true, competitor: false },
  { label: 'Export transcript as TXT file', videotext: true, competitor: false },
  { label: 'Export SRT / VTT subtitle file', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Auto-generated chapter markers', videotext: true, competitor: false },
  { label: 'Keyword index across transcript', videotext: true, competitor: false },
  { label: 'Works on videos from any source', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'Speaker separation by turn', videotext: true, competitor: false },
  { label: 'Search inside transcript', videotext: true, competitor: true },
  { label: 'Auto-captions in player', videotext: false, competitor: true },
  { label: 'Whisper accuracy', videotext: '~98.5%', competitor: '~80%' },
]

const FAQ = [
  {
    q: 'Can I transcribe a Panopto lecture video?',
    a: 'Yes. Download the Panopto video as MP4 (Settings → Downloads tab inside the video), upload it to VideoText, and get a full transcript with speaker labels, chapters, and keywords. No Panopto account needed for VideoText.',
  },
  {
    q: 'How do I download a Panopto video to transcribe?',
    a: 'In Panopto: open the video → click the Settings gear icon → Downloads tab → Download the primary video as MP4. If downloads are disabled by your institution, ask your instructor for the file or use the Panopto desktop recorder app to capture the screen. Upload the MP4 to VideoText for a full transcript.',
  },
  {
    q: 'Why is Panopto\'s auto-caption accuracy lower than VideoText?',
    a: 'Panopto uses its own speech recognition system which is optimised for playback sync and searchability inside its platform. VideoText uses Whisper large-v3, which scores ~98.5% word accuracy on clear speech — significantly better on accented speech and technical vocabulary common in lectures.',
  },
  {
    q: 'Can I export Panopto captions as SRT or TXT?',
    a: 'Panopto\'s caption export options are restricted — most institutional deployments do not allow public SRT download. VideoText generates a complete SRT file and plain-text transcript that you can download immediately, share, or use for accessibility compliance.',
  },
  {
    q: 'Is VideoText free for students using Panopto?',
    a: 'Yes. VideoText free tier includes 3 imports per month — enough for students to cover their most important lecture recordings. No credit card required.',
  },
  {
    q: 'Does VideoText generate study notes from lecture videos?',
    a: 'Yes. The Summary feature generates a concise summary of the lecture content. Chapters breaks the lecture into labelled sections by topic. Keywords indexes every important term and its timestamp. All of these help turn a raw lecture recording into structured study notes.',
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

export default function PanoptoAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Panopto Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Panopto alternative
            </span>{' '}
            for lecture transcription
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Panopto captions are locked inside the player — no SRT export, no full-text download. VideoText transcribes any Panopto lecture to searchable text with chapters, keywords, and SRT export. Free for students.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · Free for students</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for a Panopto alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why students and educators search for a Panopto alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Panopto is widely used by universities to record and distribute lecture content. Its built-in captions exist, but they come with significant limitations for students who want more from their recordings:
          </p>
          <ul className="space-y-3">
            {[
              'Panopto captions are display-only inside the Panopto player — cannot be downloaded as SRT or TXT files on most institutional deployments.',
              'No full plain-text transcript export — only searchable words inside the platform.',
              'Caption accuracy is ~80% on complex lecture content with technical vocabulary.',
              'No translation — captions are only shown in the original lecture language.',
              'Requires institutional login — cannot be accessed once you leave the university.',
              'No chapter markers, keyword index, or summary generation.',
              'Downloaded captions (when enabled) are in Panopto\'s proprietary format, not standard SRT.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Panopto — transcription comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Panopto</div>
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

        {/* When Panopto is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Panopto is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Panopto is the institutional video management system — it handles recording, distribution, access control, and LMS integration for universities. It is the right tool for your institution's IT team managing video at scale. VideoText is the right tool for <strong>individual students and educators</strong> who want to extract more value from lecture recordings — readable transcripts, study notes, accessibility-compliant SRT files, and translated content.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'Exportable SRT and TXT', body: 'Download a full SRT subtitle file or plain-text transcript from any Panopto video. Panopto keeps captions locked inside its player.' },
            { icon: DollarSign, title: 'Free for students', body: '3 free imports per month, no credit card, no institutional account needed. Use VideoText even after you leave the university.' },
            { icon: Shield, title: 'Chapters and keyword study notes', body: 'Auto-generate chapters by topic, a keyword index with timestamps, and a summary — turning your lecture recording into structured study notes.' },
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
        <section className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 rounded-xl p-8 sm:p-12 text-white text-center">
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Turn your Panopto lecture into study notes</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Download the lecture as MP4, upload it here. Get a full transcript, chapters, keywords, and SRT — free, no institutional account needed.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
              Try VideoText free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
