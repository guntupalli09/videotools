/**
 * SEO landing page: /deepgram-alternative
 * Targets: "deepgram alternative", "deepgram no-code alternative",
 *          "deepgram ui alternative", "speech to text without api"
 */
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, ChevronRight, Zap, Shield, DollarSign } from 'lucide-react'

const COMPARE_ROWS = [
  { label: 'Starting price', videotext: 'Free / $7.99/mo Pro', competitor: 'Free ($200 credits) / pay-per-use' },
  { label: 'Web UI — no code needed', videotext: true, competitor: false },
  { label: 'API key required', videotext: false, competitor: true },
  { label: 'Programming knowledge required', videotext: false, competitor: true },
  { label: 'Upload video files (MP4, MOV)', videotext: true, competitor: false },
  { label: 'YouTube URL → transcript', videotext: true, competitor: false },
  { label: 'Speaker labels in transcript', videotext: true, competitor: true },
  { label: 'SRT / VTT subtitle export', videotext: true, competitor: false },
  { label: 'Translate subtitles (70+ languages)', videotext: true, competitor: false },
  { label: 'Summary generation', videotext: true, competitor: false },
  { label: 'Auto-generated chapters', videotext: true, competitor: false },
  { label: 'Keyword index', videotext: true, competitor: false },
  { label: 'Files deleted after processing', videotext: true, competitor: false },
  { label: 'Real-time streaming API', videotext: false, competitor: true },
  { label: 'Custom vocabulary / model training', videotext: false, competitor: true },
]

const FAQ = [
  {
    q: 'What is the difference between Deepgram and VideoText?',
    a: 'Deepgram is a speech-to-text API for developers — you integrate it into your application with API calls and custom code. VideoText is a web application for end users — upload a file in the browser and get a transcript. No API, no code, no developer setup required.',
  },
  {
    q: 'Can I use VideoText without writing any code?',
    a: 'Yes. VideoText is entirely browser-based. Upload your file (or paste a YouTube URL), click Transcribe, and download the result. No API key, no programming language, no command line.',
  },
  {
    q: 'Is Deepgram or Whisper (VideoText) more accurate?',
    a: 'Deepgram Nova-2 and Whisper large-v3 (VideoText) are comparable in English — both achieve ~97–99% word accuracy on clean speech. For non-English languages and lower-resource languages, Whisper generally outperforms Nova-2 since it was trained on 680K hours of multilingual audio. VideoText also includes 70+ language translation on top of the transcript.',
  },
  {
    q: 'Does VideoText work for video files unlike Deepgram?',
    a: 'Yes. VideoText natively accepts video files (MP4, MOV, AVI, WebM, MKV). Deepgram accepts audio only — you must extract the audio from video before submitting to the API. VideoText handles video directly in the browser with no pre-processing.',
  },
  {
    q: 'Does VideoText support real-time streaming like Deepgram?',
    a: 'No. VideoText processes uploaded files after the fact — it does not stream real-time audio from a microphone or live source. Deepgram excels at real-time streaming for voice applications, call centres, and live captioning systems. VideoText is better for post-processing recorded content.',
  },
  {
    q: 'Is VideoText free unlike Deepgram?',
    a: 'VideoText free tier: 3 imports/month, no credit card, no API key setup. Deepgram offers $200 in free credits (~45 hours of audio) but requires account creation, API key setup, and code to make any transcription request.',
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

export default function DeepgramAlternativePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="border-b border-gray-200 bg-gray-50 py-20 dark:border-white/[0.08] dark:bg-gray-900/50 sm:py-28">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200/60 dark:border-blue-500/20 mb-6">
            <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Deepgram Alternative</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-medium text-gray-900 dark:text-white mb-5 leading-tight">
            The best{' '}
            <span className="text-blue-600 dark:text-blue-400">
              Deepgram alternative
            </span>{' '}
            — transcription without code
          </h1>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
            Deepgram requires API keys and programming to transcribe a single file. VideoText is the no-code alternative — upload any video or audio in the browser and get a full transcript in minutes. Free tier, no API.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <span className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-blue-700">
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
            <span className="text-sm text-gray-400">No API key · No code · Free tier</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-16">

        {/* Why people look for a Deepgram alternative */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">Why users search for a Deepgram alternative</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Deepgram is an excellent API for developers building voice applications. Non-developers and small teams frequently look for an alternative because:
          </p>
          <ul className="space-y-3">
            {[
              'Using Deepgram requires generating API keys, writing HTTP requests, and handling responses in code.',
              'No web UI — you cannot upload a file and click a button; everything must be done programmatically.',
              'Deepgram only accepts audio files — video files must be pre-extracted to audio before submission.',
              'No SRT or VTT subtitle generation — you must build subtitle output from the raw JSON response yourself.',
              'No summary, chapters, or keyword index — these require additional LLM calls on top of the transcription.',
              'Pricing is per-minute ($0.0059–$0.0145/minute) — harder to predict cost for variable-length content.',
              'Account setup, API documentation, and code debugging adds friction for one-off transcription needs.',
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
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">VideoText vs Deepgram — comparison</h2>
          <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05]">
              <div />
              <div className="text-center text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">VideoText</div>
              <div className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">Deepgram</div>
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

        {/* When Deepgram is better */}
        <section>
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-4">When Deepgram is the right choice</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Deepgram is the right tool for <strong>developers building voice-powered applications</strong> — call centre analytics, real-time live captioning, voice bots, and custom speech workflows at scale. It supports real-time streaming, custom vocabulary, model fine-tuning, and enterprise-grade SLAs. VideoText is better for <strong>individuals, researchers, content creators, and small teams</strong> who need to transcribe individual files without writing code or managing API infrastructure.
          </p>
        </section>

        {/* Key advantages */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { icon: Zap, title: 'No code — just upload and go', body: 'Deepgram requires API calls and code to transcribe anything. VideoText: upload your file, get your transcript. No programming needed.' },
            { icon: DollarSign, title: 'Video files supported natively', body: 'VideoText accepts MP4, MOV, MKV directly. Deepgram only accepts audio — you must strip the audio track from video files before submitting to the API.' },
            { icon: Shield, title: 'SRT export + summary included', body: 'VideoText generates SRT subtitle files, a summary, chapters, and keyword index automatically. Deepgram returns raw JSON — all formatting is your responsibility to build.' },
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
          <h2 className="text-2xl sm:text-3xl font-medium mb-3">Transcribe without writing a single line of code</h2>
          <p className="text-white/55 mb-8 max-w-xl mx-auto">Upload your video or audio file in the browser. Get a full transcript with speaker labels, SRT export, summary, and keywords — instantly. No API key needed.</p>
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
