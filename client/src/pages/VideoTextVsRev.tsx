import React from 'react'
import { Link } from 'react-router-dom'
import AnswerBlock from '../components/AnswerBlock'
void React

const CHECK = <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm">✓</span>
const CROSS = <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-600 font-bold text-sm">✗</span>
const PARTIAL = <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">~</span>

export default function VideoTextVsRev() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

        {/* Hero */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white py-16 px-6">
          <div className="mx-auto max-w-5xl">
            <nav aria-label="Breadcrumb" className="text-sm text-blue-300 mb-6">
              <Link to="/" className="hover:text-white">Home</Link>
              <span className="mx-2">›</span>
              <Link to="/compare" className="hover:text-white">Compare</Link>
              <span className="mx-2">›</span>
              <span className="text-white">VideoText vs Rev</span>
            </nav>

            <div className="inline-block bg-orange-500/20 border border-orange-400/40 text-orange-200 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              Rev AI: $0.25/min · Rev Human: $1.50+/min · VideoText: ~$0.042/min
            </div>

            <h1 className="text-4xl md:text-5xl font-medium leading-tight mb-4">
              VideoText vs Rev (2025):<br />
              <span className="text-blue-300">AI Workflow Speed vs Service-Based Transcription</span>
            </h1>

            <p className="seo-intro text-lg text-blue-200 max-w-3xl mb-8" data-speakable>
              Rev charges <strong className="text-white">$0.25/minute (AI)</strong> or <strong className="text-white">$1.50+/minute (human)</strong> and retains your files for 30 days.
              VideoText costs <strong className="text-white">~$0.042/minute</strong> on a flat subscription, produces{' '}
              <strong className="text-white">transcript + SRT + VTT + summary + chapters</strong> per upload, and deletes your files immediately.
              Here's every dimension compared.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link to="/video-to-transcript" className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
                Try VideoText Free
              </Link>
              <Link to="/pricing" className="inline-flex items-center gap-2 border border-blue-400 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors">
                See Pricing →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { stat: '6×', label: 'cheaper than Rev AI per minute' },
                { stat: '36×', label: 'cheaper than Rev Human per minute' },
                { stat: '0 days', label: 'file retention (vs Rev\'s 30 days)' },
                { stat: '4×', label: 'more outputs per upload vs Rev' },
              ].map(({ stat, label }) => (
                <div key={label} className="bg-white/10 rounded-xl p-4 text-center" data-speakable>
                  <div className="text-3xl font-extrabold text-white">{stat}</div>
                  <div className="text-xs text-blue-200 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 py-12 space-y-16">

          {/* AEO Answer Block */}
          <AnswerBlock
            question="Should I use VideoText or Rev for transcription?"
            shortAnswer="VideoText wins for AI transcription — 6× cheaper than Rev AI, more outputs, 90+ languages, zero data retention. Choose Rev Human only when human-verified output is a strict compliance requirement."
            expanded="Rev AI and Rev Human are two different services. Rev AI ($0.25/min) is purely AI transcription — similar to Temi — and VideoText beats it on cost, speed, output depth, and language support. Rev Human ($1.50+/min) employs human transcriptionists for near-100% accuracy — it's expensive but the right choice when a compliance policy explicitly requires a human-reviewed transcript (court reporting, specific legal filings). For everything else — podcasts, interviews, YouTube, training, research, corporate video — VideoText is faster, cheaper, more private, and more productive."
            bullets={[
              'VideoText Pro: $7.99/mo flat rate — Rev AI: $0.25/min (pay-per-minute)',
              'Rev Human: $1.50+/min — VideoText Pro handles same volume for $7.99/mo flat',
              'VideoText zero retention — Rev retains files 30 days, humans hear your audio',
              'VideoText: transcript + SRT + VTT + summary + chapters — Rev: transcript + subtitles only',
              'VideoText: 90+ languages — Rev AI: ~36 languages',
            ]}
          />

          {/* Pricing */}
          <section id="pricing">
            <h2 className="text-2xl md:text-3xl font-medium text-gray-900 dark:text-white mb-2">💰 Pricing: Rev vs VideoText</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              Rev's per-minute model means your costs scale unboundedly. VideoText is a flat monthly subscription with a free tier.
              See <Link to="/pricing" className="text-blue-600 hover:underline">VideoText pricing</Link> for details.
            </p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 mb-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                    <th className="px-5 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Usage</th>
                    <th className="px-5 py-3 text-left font-semibold text-orange-600">Rev AI ($0.25/min)</th>
                    <th className="px-5 py-3 text-left font-semibold text-red-600">Rev Human ($1.50/min)</th>
                    <th className="px-5 py-3 text-left font-semibold text-blue-700 dark:text-blue-400">VideoText Pro ($7.99/mo)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    ['1 hr/month', '$15', '$90', 'FREE (free tier)'],
                    ['8 hrs/month', '$120', '$720', '$7.99 flat'],
                    ['13 hrs/month (daily 30-min podcast)', '$195', '$1,170', '$7.99 flat'],
                    ['25 hrs/month', '$375', '$2,250', '$7.99 flat (Pro)'],
                  ].map(([usage, revai, revhuman, vt]) => (
                    <tr key={usage} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{usage}</td>
                      <td className="px-5 py-3 text-orange-600 font-semibold">{revai}</td>
                      <td className="px-5 py-3 text-red-600 font-semibold">{revhuman}</td>
                      <td className="px-5 py-3 text-blue-700 dark:text-blue-400 font-bold">{vt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Feature matrix */}
          <section id="features">
            <h2 className="text-2xl md:text-3xl font-medium text-gray-900 dark:text-white mb-4 scroll-mt-20">📊 Feature Comparison</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                    <th className="px-5 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-60">Feature</th>
                    <th className="px-5 py-3 text-center font-semibold text-orange-600">Rev AI</th>
                    <th className="px-5 py-3 text-center font-semibold text-red-600">Rev Human</th>
                    <th className="px-5 py-3 text-center font-semibold text-blue-700 dark:text-blue-400">VideoText</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {[
                    ['AI transcription', CHECK, PARTIAL, CHECK],
                    ['Human-reviewed transcription', CROSS, CHECK, CROSS],
                    ['Speaker labels', CHECK, CHECK, CHECK],
                    ['SRT subtitle export', CHECK, CHECK, CHECK],
                    ['VTT subtitle export', PARTIAL, PARTIAL, CHECK],
                    ['Broadcast-safe subtitle formatting', CROSS, CROSS, CHECK],
                    ['AI-generated summary', CROSS, CROSS, CHECK],
                    ['Chapter markers', CROSS, CROSS, CHECK],
                    ['YouTube URL direct input', CROSS, CROSS, CHECK],
                    ['Batch processing', PARTIAL, PARTIAL, CHECK],
                    ['Language support', <span key="r-lang" className="text-orange-600 text-xs font-semibold">~36 languages</span>, <span key="rh-lang" className="text-red-600 text-xs">English primary</span>, <span key="v-lang" className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">90+ languages</span>],
                    ['Zero data retention', CROSS, CROSS, CHECK],
                    ['Free tier', CROSS, CROSS, CHECK],
                    ['Pricing', <span key="rai-p" className="text-orange-600 text-xs">$0.25/min</span>, <span key="rh-p" className="text-red-600 text-xs">$1.50+/min</span>, <span key="v-p" className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">~$0.042/min flat</span>],
                    ['Processing speed (1-hr video)', <span key="rai-s" className="text-orange-500 text-xs">5–10 min</span>, <span key="rh-s" className="text-red-500 text-xs">12–24 hrs</span>, <span key="v-s" className="text-emerald-700 dark:text-emerald-400 text-xs font-bold">3–5 min</span>],
                    ['Burn subtitles into video', CROSS, CROSS, CHECK],
                    ['JSON / CSV export', CROSS, CROSS, CHECK],
                    ['Notion export', CROSS, CROSS, CHECK],
                  ].map(([feature, revai, revhuman, vt], i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-5 py-3 text-gray-700 dark:text-gray-300 font-medium">{feature}</td>
                      <td className="px-5 py-3 text-center">{revai}</td>
                      <td className="px-5 py-3 text-center">{revhuman}</td>
                      <td className="px-5 py-3 text-center bg-blue-50/40 dark:bg-blue-950/20">{vt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Privacy */}
          <section className="rounded-xl border-2 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-6">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-3">🔒 Data Privacy: Rev Stores Your Content</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900 p-4">
                <div className="font-bold text-red-700 dark:text-red-400 mb-2">⚠️ Rev</div>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400 text-xs">
                  <li>Files retained for up to 30 days after processing</li>
                  <li>Human transcriptionists actively listen to your audio</li>
                  <li>Third-party contractors may handle your content</li>
                  <li>Data used for service improvement per ToS</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-emerald-200 dark:border-emerald-900 p-4">
                <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-2">✅ VideoText</div>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400 text-xs">
                  <li>Files deleted immediately after processing completes</li>
                  <li>Zero retention — nothing persists on servers</li>
                  <li>No humans access your content at any stage</li>
                  <li>No model training on your data, ever</li>
                </ul>
              </div>
            </div>
            <p className="text-sm font-semibold text-red-800 dark:text-red-300" data-speakable>
              If you process confidential conversations, client calls, HR recordings, or legally sensitive audio — Rev's 30-day retention and human reviewer access is a significant risk. VideoText's zero-retention model removes this exposure entirely.
            </p>
          </section>

          {/* When Rev still wins */}
          <section className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-6">
            <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-3">When Rev Human is still the right choice</h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              We're transparent: Rev Human wins in one specific case. When your workflow has a <em>legal or compliance requirement</em> for human-verified transcription — court proceedings, certain deposition transcripts, specific regulated healthcare workflows — Rev Human's certified human reviewers provide documentation that AI tools cannot.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              For everything else — podcasts, interviews, YouTube, training videos, research, corporate video, multilingual content, social media — VideoText is faster, cheaper, more private, and produces more per file.
            </p>
          </section>

          {/* FAQ */}
          <section id="faq">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-6">❓ FAQ — VideoText vs Rev</h2>
            <dl className="space-y-5">
              {[
                {
                  q: 'Is VideoText cheaper than Rev?',
                  a: 'Yes. Rev AI: $0.25/min. Rev Human: $1.50+/min. VideoText Pro: $7.99/month flat, continued processing. For 8 hrs/month: Rev AI = $120, Rev Human = $720, VideoText = $7.99. VideoText is far cheaper than Rev AI and drastically cheaper than Rev Human.',
                },
                {
                  q: 'What is the best Rev alternative?',
                  a: 'VideoText is the best Rev AI alternative: 6× cheaper, 90+ languages, zero data retention, and produces transcript + SRT + VTT + summary + chapters per upload. For Rev Human (compliance-specific): there\'s no like-for-like AI replacement — use VideoText for AI throughput and add a human review step if required.',
                },
                {
                  q: 'Does VideoText match Rev accuracy?',
                  a: 'VideoText uses OpenAI Whisper large-v3 (96–99% on clean audio). Rev AI uses a proprietary model (~94–96%). VideoText is equal or better on English clean audio, and supports 90+ languages vs Rev AI\'s ~36. Rev Human achieves 99%+ with human correction — no AI tool matches that, but at 30× the cost.',
                },
                {
                  q: 'How fast is VideoText vs Rev?',
                  a: 'VideoText: 3–5 min for a 1-hour video. Rev AI: 5–10 min. Rev Human: 12–24 hours. VideoText is the fastest option for AI transcription.',
                },
                {
                  q: 'Does Rev retain my uploaded files?',
                  a: 'Yes. Rev retains files for up to 30 days. Rev Human transcriptionists actively listen to your audio. VideoText deletes files immediately after processing — zero retention.',
                },
                {
                  q: 'Can VideoText generate subtitles like Rev?',
                  a: 'VideoText generates SRT and VTT subtitle files with broadcast-safe line formatting — automatically. Rev exports SRT and basic VTT. VideoText goes further: broadcast-safe line breaks, reading speed compliance, and the ability to burn subtitles directly into video — in the same tool.',
                },
                {
                  q: 'Does VideoText generate summaries and chapters?',
                  a: 'Yes — automatically per upload. Neither Rev AI nor Rev Human produces summaries or chapter markers. You need separate tools for those on Rev. On VideoText, they\'re included in every transcription job.',
                },
                {
                  q: 'Is there a free plan for VideoText vs Rev?',
                  a: 'VideoText has a permanent free tier: 3 uploads per month, no credit card required. Rev has no free tier — you pay $0.25/min from the first second. VideoText Free is more useful than Temi\'s one-off trial.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="border-b border-gray-100 dark:border-gray-800 pb-5 last:border-0 last:pb-0">
                  <dt className="font-semibold text-gray-900 dark:text-white text-base mb-2">{q}</dt>
                  <dd className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* CTA */}
          <section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 text-white p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-medium mb-3">Stop Paying Rev's Per-Minute Rate</h2>
            <p className="text-blue-200 text-sm max-w-lg mx-auto mb-6">
              Flat subscription. 90+ languages. Transcript + subtitles + summary + chapters per upload. Files deleted immediately. Free tier included.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/video-to-transcript" className="inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-7 py-3.5 rounded-xl hover:bg-blue-50 transition-colors">
                Try VideoText Free →
              </Link>
              <Link to="/pricing" className="inline-flex items-center gap-2 border border-blue-400 text-white font-semibold px-6 py-3.5 rounded-xl hover:bg-blue-700 transition-colors">
                View Plans
              </Link>
            </div>
            <p className="mt-4 text-xs text-blue-300">3 uploads/month free · No credit card · Cancel anytime</p>
          </section>

          {/* Internal links */}
          <section aria-label="Related pages" className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/20 p-5 text-sm">
            <div className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Related comparisons & tools:</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {[
                { label: 'Temi vs VideoText', to: '/temi-vs-videotext' },
                { label: 'VideoText vs TurboScribe', to: '/videotext-vs-turboscribe' },
                { label: 'Otter vs VideoText', to: '/otter-vs-videotext' },
                { label: 'Descript vs VideoText', to: '/descript-vs-videotext' },
                { label: 'Rev Alternative', to: '/rev-alternative' },
                { label: 'Full Compare Table', to: '/compare' },
                { label: 'Transcription Benchmark', to: '/transcription-benchmark' },
                { label: 'Accuracy Test', to: '/accuracy-test' },
                { label: 'Video to Transcript', to: '/video-to-transcript' },
                { label: 'Video to Subtitles', to: '/video-to-subtitles' },
                { label: 'YouTube Transcript Generator', to: '/youtube-transcript-generator' },
                { label: 'Podcast Transcription Tool', to: '/podcast-transcription-tool' },
                { label: 'Best Transcription Tool', to: '/best-transcription-tool' },
                { label: 'Pricing', to: '/pricing' },
              ].map(({ label, to }) => (
                <Link key={to} to={to} className="text-blue-700 dark:text-blue-400 hover:underline">
                  {label}
                </Link>
              ))}
            </div>
          </section>

        </div>
      </div>
  )
}
