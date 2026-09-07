/**
 * SEO landing page: /capcut-alternative
 * Targets: "capcut alternative for captions", "capcut subtitle alternative",
 *          "capcut srt export alternative", "better than capcut captions"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: 'Free / $9.99/mo' },
  { label: 'Export SRT / VTT subtitle file', videotext: true, competitor: false },
  { label: 'Upload SRT to YouTube / Vimeo', videotext: true, competitor: false },
  { label: 'Full plain-text transcript export', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Speaker labels in transcript', videotext: true, competitor: false },
  { label: 'Auto-generated chapter markers', videotext: true, competitor: false },
  { label: 'Keyword index across transcript', videotext: true, competitor: false },
  { label: 'Burn captions permanently into video', videotext: true, competitor: true },
  { label: 'Auto-captions with styled overlays', videotext: false, competitor: true },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'No account to try', videotext: true, competitor: false },
  { label: 'Works in any browser / OS', videotext: true, competitor: true },
  { label: 'Whisper accuracy', videotext: '~98.5%', competitor: '~88%' },
]

const FAQ = [
  {
    q: 'Why can\'t I export SRT files from CapCut?',
    a: 'CapCut\'s auto-captions are styled text overlays embedded in your video project — they are designed for TikTok and Reels playback, not for export as standalone subtitle files. There is no SRT or VTT export on any CapCut plan. VideoText generates a proper SRT file you can upload to YouTube, Vimeo, or any platform.',
  },
  {
    q: 'How do I get an SRT file from my video instead of using CapCut?',
    a: 'Upload your video (MP4, MOV, WebM, MKV, AVI) to VideoText. In 2–5 minutes you get an SRT file with accurate Whisper timestamps. Download the SRT and upload it to YouTube Studio → Subtitles, or to Vimeo → Advanced → Upload caption file.',
  },
  {
    q: 'Is VideoText more accurate than CapCut auto-captions?',
    a: 'VideoText uses Whisper large-v3 (~98.5% word accuracy on clear speech). CapCut auto-captions use a different model optimised for short-form social content and typically show ~88% accuracy — especially lower on accented speech or technical vocabulary.',
  },
  {
    q: 'Does VideoText burn captions into video like CapCut does?',
    a: 'Yes. Use the Burn Subtitles tool to permanently embed captions into your video file. This is useful for platforms that don\'t support external subtitle tracks. You can also keep the SRT as a separate file for platforms that do (YouTube, Vimeo, etc.).',
  },
  {
    q: 'Does VideoText translate captions to other languages?',
    a: 'Yes — translate your SRT to 70+ languages from the Translate Subtitles tool. Timestamps are preserved exactly. CapCut supports caption translation in limited languages for in-app display only; the translated captions cannot be exported as SRT either.',
  },
  {
    q: 'Is VideoText free like CapCut?',
    a: 'Yes. VideoText free tier: 3 uploads/day with no credit card. Exported SRT files are watermark-free on paid plans. On the free tier, a VideoText watermark appears in exports — upgrade to Pro to remove it.',
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

export default function CapCutAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">CapCut Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              CapCut alternative
            </span>{' '}
            for exportable SRT captions
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            CapCut auto-captions are styled overlays — no SRT export, no YouTube upload, no translation to proper subtitle files. VideoText generates accurate SRT and VTT files you can use anywhere. Free tier.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-subtitles">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
                Generate SRT from video
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · SRT and VTT export included</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for a CapCut alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why users search for a CapCut caption alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            CapCut is excellent for editing social media clips with styled caption overlays. But creators who publish to multiple platforms quickly hit its limitations:
          </p>
          <ul className="space-y-3">
            {[
              'CapCut cannot export SRT or VTT subtitle files — no way to upload captions to YouTube, Vimeo, or any platform independently.',
              'Captions are baked into the CapCut project — you must re-edit to change timing or text.',
              'No full-text transcript export — CapCut only shows styled caption overlays, not a readable document.',
              'Translation output cannot be exported as an SRT file.',
              'Speaker labels are not available — cannot distinguish who said what.',
              'Accuracy on longer videos or complex speech is ~88%, lower than Whisper large-v3.',
              'All processed videos and projects are stored in CapCut\'s cloud — no local-only processing option.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs CapCut — subtitle and caption comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">CapCut</div>
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

        {/* When CapCut is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When CapCut is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            CapCut is the right tool for <strong>social media video editing</strong> — if you want animated caption styles, dynamic text transitions, font customisation, and in-app publishing to TikTok and Instagram Reels, CapCut excels. It is also better for short-form content where captions are part of the visual design rather than a standalone subtitle file. VideoText is better when you need a <strong>portable SRT file</strong> for YouTube, Vimeo, or other platforms, or when you need a full readable transcript for notes or accessibility compliance.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'Real SRT & VTT export', body: 'VideoText outputs proper subtitle files with timestamps. Upload the SRT to YouTube Studio, Vimeo, or any platform. CapCut\'s captions are only visible inside CapCut.' },
            { icon: DollarSign, title: 'Translate to 70+ languages', body: 'Generate a translated SRT in any of 70+ languages with timestamps preserved. CapCut\'s translation cannot be exported as an SRT file.' },
            { icon: Shield, title: 'Full transcript included', body: 'Get the complete spoken text as a readable document — speaker-labelled, with keywords and chapters. CapCut shows captions, not transcripts.' },
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Generate your SRT file now</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload any video and get a proper SRT subtitle file in minutes. Upload it to YouTube, translate it, or burn it into your video — all from one tool.</p>
          <Link to="/video-to-subtitles">
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
