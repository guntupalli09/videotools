import { Link } from 'react-router-dom'

const stats = [
  { value: '127,000+', label: 'Videos transcribed' },
  { value: '98.5%+', label: 'Word accuracy' },
  { value: '< 5 min', label: 'Per 60-minute video' },
  { value: '40+', label: 'Countries served' },
  { value: '50+', label: 'Languages supported' },
  { value: '19', label: 'Free browser tools' },
]

const tools = [
  { name: 'Video to Transcript', path: '/video-to-transcript', desc: 'Upload any video or paste a YouTube URL. Get a transcript with speaker labels, chapters, and a summary.' },
  { name: 'Video to Subtitles', path: '/video-to-subtitles', desc: 'Generate broadcast-ready SRT and VTT subtitle files from any video with AI.' },
  { name: 'Translate Subtitles', path: '/translate-subtitles', desc: 'Translate SRT/VTT subtitle files to Arabic, Spanish, Hindi, Japanese, and 70+ languages.' },
  { name: 'Fix Subtitles', path: '/fix-subtitles', desc: 'Auto-correct overlapping timestamps, long lines, and formatting errors in any subtitle file.' },
  { name: 'Burn Subtitles', path: '/burn-subtitles', desc: 'Hardcode subtitles permanently into a video file — no player required to display them.' },
  { name: 'Batch Processing', path: '/batch-process', desc: 'Transcribe or subtitle many videos at once and download all files as a single ZIP.' },
]

const comparisons = [
  { competitor: 'Otter.ai', difference: 'Otter.ai does not support video file uploads or SRT/VTT export. VideoText does both, plus YouTube URL input.' },
  { competitor: 'Descript', difference: 'VideoText is 6× faster, starts free ($0 vs $24/month), and requires no desktop app download.' },
  { competitor: 'Trint', difference: 'Trint starts at $80/month. VideoText starts free ($0) — same Whisper AI accuracy with no usage caps on Pro ($7.99/month).' },
  { competitor: 'Rev', difference: 'Rev AI charges $0.25/minute. VideoText Pro is $7.99/month flat rate — no per-minute billing.' },
  { competitor: 'HappyScribe', difference: 'HappyScribe has no free tier and starts at $17/month. VideoText is free to start with no credit card.' },
  { competitor: 'Notta', difference: 'Notta is focused on meeting transcription. VideoText supports any video file, YouTube URLs, and subtitle burning.' },
]

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

      {/* Hero */}
      <div className="mb-16">
        <h1 className="text-4xl font-medium text-gray-900 dark:text-white mb-6">
          About VideoText
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
          VideoText is an AI-powered web application for transcribing video to text and generating subtitle files. We are built for creators, marketers, agencies, and developers who need fast, accurate transcription — without storing their content.
        </p>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          Powered by <strong>OpenAI Whisper large-v3</strong>, VideoText delivers 98.5%+ word accuracy and transcribes a 60-minute video in under 5 minutes. Every file is deleted immediately after processing. We do not retain uploads, transcripts, or outputs.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-16">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-8">By the numbers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission */}
      <div className="mb-16">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">Why we built this</h2>
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            Most transcription tools were built for enterprises — they are slow, expensive, and retain your files indefinitely. We built VideoText to be the opposite: fast enough to use mid-workflow, priced for independent creators, and private enough that you never have to think about where your content goes.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
            The decision to delete files immediately after processing is not just a privacy policy — it is an architectural constraint that makes the system leaner and faster. When you are not storing 127,000 videos, you spend that infrastructure budget on compute instead.
          </p>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            We publish our real processing stats, accuracy benchmarks, and technology stack at <Link to="/open" className="text-blue-600 dark:text-blue-400 hover:underline">videotext.io/open</Link>. We think tools should be honest about what they can and cannot do.
          </p>
        </div>
      </div>

      {/* Technology */}
      <div className="mb-16">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">Technology</h2>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">AI Engine: OpenAI Whisper large-v3</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">The most accurate open-source speech recognition model, fine-tuned for 99 languages and noisy real-world audio.</div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">Zero data retention architecture</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Files are processed in a private cloud pipeline and deleted immediately. No content is logged, retained, or used for training.</div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">YouTube URL native support</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Paste any public YouTube URL and we stream the audio directly — no download, no third-party service.</div>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">19 client-side free tools</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Format converters, subtitle validators, timing tools, and calculators that run entirely in your browser — nothing uploaded, no account required.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Tools */}
      <div className="mb-16">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-8">Core tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map(({ name, path, desc }) => (
            <Link
              key={path}
              to={path}
              className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div className="font-semibold text-gray-900 dark:text-white mb-1">{name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-16">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">Pricing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { plan: 'Free', price: '$0/mo', features: '3 uploads/day, no credit card required' },
            { plan: 'Pro', price: '$7.99/mo', features: 'Continued processing, AI features, watermark-free exports, batch' },
          ].map(({ plan, price, features }) => (
            <div key={plan} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
              <div className="font-bold text-gray-900 dark:text-white text-lg">{plan}</div>
              <div className="text-blue-600 dark:text-blue-400 font-semibold my-1">{price}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{features}</div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">All plans include a 7-day money-back guarantee.</p>
        <Link to="/pricing" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">See full pricing →</Link>
      </div>

      {/* How VideoText compares */}
      <div className="mb-16">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">How VideoText compares</h2>
        <div className="space-y-3">
          {comparisons.map(({ competitor, difference }) => (
            <div key={competitor} className="flex gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="font-semibold text-gray-900 dark:text-white w-28 shrink-0">vs {competitor}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{difference}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="mb-16">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">Privacy commitment</h2>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
            <strong>We do not store your files.</strong> When you upload a video or subtitle file, it is processed in a private pipeline and deleted immediately after your output is generated. VideoText does not retain uploads, transcripts, generated subtitles, or any content you provide.
          </p>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
            Your content is never used to train AI models. It is never shared with third parties. There are no content logs. This is the full extent of our data policy.
          </p>
          <Link to="/privacy" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Read the full privacy policy →</Link>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gray-900 dark:bg-gray-800 rounded-xl p-10">
        <h2 className="text-2xl font-medium text-white mb-3">Try VideoText free</h2>
        <p className="text-gray-400 mb-6">3 uploads per month. No credit card required. Files deleted after processing.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/signup"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Start free — no credit card
          </Link>
          <Link
            to="/pricing"
            className="px-6 py-3 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-semibold rounded-xl transition-colors"
          >
            See pricing
          </Link>
        </div>
      </div>
    </div>
  )
}
