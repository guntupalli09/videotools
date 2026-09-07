/**
 * SEO landing page: /happyscribe-alternative
 * Targets: "happyscribe alternative", "happyscribe free alternative", "alternative to happyscribe"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: '$17/month (120 min)' },
  { label: 'Free tier (no credit card)', videotext: true, competitor: false },
  { label: 'YouTube URL → transcript (no upload)', videotext: true, competitor: false },
  { label: 'Video file transcription (MP4, MOV)', videotext: true, competitor: true },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: true },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: true },
  { label: 'Burn subtitles into video', videotext: true, competitor: false },
  { label: 'Batch process multiple videos', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'Processing time (1-hour video)', videotext: '~2 min', competitor: '5–10 min' },
  { label: 'Whisper AI accuracy', videotext: '98.5%', competitor: '~97%' },
  { label: 'Works on mobile browser', videotext: true, competitor: false },
]

const FAQ = [
  {
    q: 'What is the best free HappyScribe alternative?',
    a: 'VideoText is the top free alternative to HappyScribe. HappyScribe has no permanent free tier — it only offers a 10-minute trial. VideoText gives you 3 uploads per month with no credit card, no expiry, and no upload size limit on those imports.',
  },
  {
    q: 'Is VideoText cheaper than HappyScribe?',
    a: 'Yes. HappyScribe starts at $17/month for only 120 minutes of transcription. VideoText Pro is $7.99/month with continued processing. The free tier lets you try it with no payment details.',
  },
  {
    q: 'Can VideoText transcribe YouTube videos like HappyScribe?',
    a: 'Yes — and VideoText goes further. Paste any YouTube URL and VideoText streams and transcribes the audio without requiring you to download the video. HappyScribe requires you to download and upload the video file manually.',
  },
  {
    q: 'Does VideoText have a subtitle editor like HappyScribe?',
    a: 'VideoText focuses on fast automated output rather than an in-browser editor. You get accurate SRT/VTT files you can open in any subtitle editor (Subtitle Edit, Aegisub, etc.) or upload directly to YouTube. If you need a built-in subtitle editor, HappyScribe offers one — but VideoText\'s output requires minimal editing thanks to higher accuracy.',
  },
  {
    q: 'Does HappyScribe store my files?',
    a: 'Yes. HappyScribe stores all your transcripts and media in their cloud account permanently unless you delete them. VideoText deletes your file immediately after the job completes — nothing is retained on our servers.',
  },
  {
    q: 'Can I burn subtitles into video with VideoText but not HappyScribe?',
    a: 'Correct. VideoText includes a burn-subtitles tool that hard-codes captions directly into the video file. HappyScribe does not offer this — you would need to export the SRT and use a separate tool like Premiere Pro or Kapwing. VideoText handles the full workflow in one place.',
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

export default function HappyScribeAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">HappyScribe Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            The best free{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              HappyScribe alternative
            </span>{' '}
            for transcription
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            HappyScribe charges $17/month with no free tier. VideoText starts free — paste a YouTube URL or upload any video file, get an accurate transcript or SRT file in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No credit card · Files deleted after processing</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for HappyScribe alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why people look for a HappyScribe alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            HappyScribe is a solid product used in media and broadcast — but it has pricing and workflow gaps that push users to look elsewhere:
          </p>
          <ul className="space-y-3">
            {[
              'No permanent free tier — only a 10-minute one-time trial before you must pay.',
              'Starts at $17/month for just 120 minutes, making it expensive for occasional users.',
              'No YouTube URL input — you must download the video and re-upload it manually.',
              'No subtitle burning — you get an SRT file but need a separate tool to hardcode it.',
              'No batch processing — videos must be uploaded and submitted one at a time.',
              'Files are retained in their cloud; no automatic deletion after processing.',
              'Mobile support is limited — the editor is not optimised for phone workflows.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs HappyScribe — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">HappyScribe</div>
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

        {/* When HappyScribe is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When HappyScribe is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            HappyScribe is a strong choice if you need a <strong>built-in collaborative subtitle editor</strong> with speaker detection and interactive correction workflows — particularly in a team or broadcast environment. Its web editor lets multiple people review and correct subtitles in real time. VideoText is optimised for fast, accurate output with no manual correction step. If your team spends time editing transcripts together inside the tool, HappyScribe's editor is a genuine advantage.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: DollarSign, title: 'Actually free to start', body: 'HappyScribe has no permanent free tier — only a 10-minute trial. VideoText gives you 3 free imports every month, no credit card needed, forever.' },
            { icon: Zap, title: 'YouTube URL support', body: 'Paste any YouTube link and VideoText streams and transcribes it. HappyScribe requires you to download the video locally and re-upload it — extra steps, extra time.' },
            { icon: Shield, title: 'Files deleted instantly', body: 'VideoText removes your file from our servers the moment processing finishes. HappyScribe retains all your media in their cloud until you manually delete it.' },
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Switch from HappyScribe in 2 minutes</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload any video or paste a YouTube URL. Get a transcript or SRT file in minutes. Free tier, no credit card, files deleted after processing.</p>
          <Link to="/video-to-transcript">
            <span className="inline-flex items-center gap-2 bg-white text-blue-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all">
              Transcribe my first video free
              <ChevronRight className="w-4 h-4" />
            </span>
          </Link>
        </section>
      </div>
    </div>
  )
}
