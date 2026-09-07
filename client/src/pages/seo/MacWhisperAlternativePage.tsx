/**
 * SEO landing page: /macwhisper-alternative
 * Targets: "macwhisper alternative", "macwhisper browser alternative",
 *          "macwhisper windows alternative", "whisper transcription without mac"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: 'Free / $29 one-time (Pro)' },
  { label: 'Works on Windows and Linux', videotext: true, competitor: false },
  { label: 'Works on Mac', videotext: true, competitor: true },
  { label: 'Browser-based — no install needed', videotext: true, competitor: false },
  { label: 'No local model download required', videotext: true, competitor: false },
  { label: 'No GPU / storage requirements', videotext: true, competitor: false },
  { label: 'Speaker labels in transcript', videotext: true, competitor: false },
  { label: 'Summary generation', videotext: true, competitor: false },
  { label: 'Auto-generated chapters', videotext: true, competitor: false },
  { label: 'Keyword index', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: true },
  { label: 'YouTube URL input', videotext: true, competitor: false },
  { label: 'Audio runs 100% locally (privacy)', videotext: false, competitor: true },
  { label: 'Whisper large-v3 accuracy', videotext: '~98.5%', competitor: '~98.5% (large model)' },
]

const FAQ = [
  {
    q: 'What is MacWhisper and why look for an alternative?',
    a: 'MacWhisper is a polished Mac desktop app that runs Whisper transcription locally on your machine. The main reasons to look for an alternative: it only works on macOS (not Windows or Linux), requires downloading large model files (large-v3 is ~3GB), and needs sufficient CPU/GPU to process longer recordings at reasonable speed. VideoText gives you the same Whisper large-v3 accuracy in any web browser with no download or local processing.',
  },
  {
    q: 'Does VideoText work on Windows and Linux unlike MacWhisper?',
    a: 'Yes. VideoText is browser-based and works identically on Windows, Mac, and Linux. MacWhisper is macOS-only.',
  },
  {
    q: 'Is VideoText as accurate as MacWhisper?',
    a: 'Both VideoText and MacWhisper use Whisper large-v3 as their core transcription model, achieving ~98.5% word accuracy on clear speech. The accuracy is the same — the difference is convenience: VideoText processes in the cloud, MacWhisper processes locally on your device.',
  },
  {
    q: 'Does MacWhisper support speaker labels?',
    a: 'MacWhisper\'s Pro version supports speaker detection with pyannote.audio. VideoText includes speaker diarization on all plans — no separate purchase needed. VideoText also adds summary, chapters, and keyword index that MacWhisper does not generate.',
  },
  {
    q: 'Is VideoText private like MacWhisper\'s local processing?',
    a: 'MacWhisper keeps everything local — your audio never leaves your Mac. VideoText processes in the cloud and deletes your file immediately after transcription. For most users, immediate cloud deletion is sufficient privacy. For legally sensitive content (attorney-client privilege, classified material), local processing like MacWhisper is the safer choice.',
  },
  {
    q: 'Is VideoText free like MacWhisper?',
    a: 'VideoText free tier: 3 uploads/month, no credit card. MacWhisper has a free tier but limits features — Pro is a one-time $29 purchase. VideoText Pro is $7.99/month for continued processing.',
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

export default function MacWhisperAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-blue-950/20 dark:via-gray-950 dark:to-blue-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">MacWhisper Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              MacWhisper alternative
            </span>{' '}
            — works on any OS, no install
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            MacWhisper is Mac-only and requires downloading large model files. VideoText gives you Whisper large-v3 accuracy in the browser — Windows, Mac, Linux, no download, no GPU needed. Speaker labels, SRT export, summary included. Free tier.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No install · No credit card · Any OS</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for a MacWhisper alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why users search for a MacWhisper alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            MacWhisper is a high-quality app, but several practical constraints push users to look for browser-based alternatives:
          </p>
          <ul className="space-y-3">
            {[
              'MacWhisper is macOS-only — Windows and Linux users cannot use it at all.',
              'Whisper large-v3 model files are ~3GB — a one-time download that takes time and storage.',
              'Processing speed depends on your local CPU/GPU — older Macs are significantly slower.',
              'Speaker diarization (PyAnnote model) requires an additional setup step and HuggingFace token.',
              'No summary, keyword index, or chapter generation — output is raw transcript text.',
              'No YouTube URL input — must download video files manually before transcribing.',
              'No subtitle translation — English-only output without additional steps.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs MacWhisper — feature comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">MacWhisper</div>
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

        {/* When MacWhisper is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When MacWhisper is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            MacWhisper is the right tool if <strong>100% local processing</strong> is your priority — your audio never leaves your Mac, which matters for legally sensitive transcription (attorney-client privilege, medical interviews, classified content). MacWhisper is also better if you have a modern Mac with Apple Silicon (M1/M2/M3) where local Whisper processing is very fast, and you want a native app experience with Finder integration. VideoText is better for cross-platform use, quick browser access, and when you need summary, chapters, and keyword features on top of the transcript.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'Works on Windows and Linux', body: 'MacWhisper is Mac-only. VideoText runs in any browser on any operating system — no install, no platform lock-in.' },
            { icon: DollarSign, title: 'Summary, chapters, keywords included', body: 'VideoText adds auto-summary, chapter navigation, and keyword indexing on top of the transcript. MacWhisper outputs raw transcript text only.' },
            { icon: Shield, title: 'No model download or setup', body: 'MacWhisper requires a ~3GB model download and optional diarization setup. VideoText is instant — open a tab and upload your file.' },
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Whisper accuracy without the Mac setup</h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">Upload your file in the browser. Get Whisper large-v3 accuracy with speaker labels, summary, chapters, and SRT — on any OS. No installation needed.</p>
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
