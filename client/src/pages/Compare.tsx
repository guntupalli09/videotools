import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Zap, Clock, Shield, DollarSign, ChevronRight, TrendingDown, Star } from 'lucide-react';

const COMPETITORS = [
  {
    name: 'Descript',
    slug: 'descript',
    description: 'Video editor with transcription built in. Complex, slow for pure transcription.',
    avgProcessingMinutes: 18,
    pricing: 'From $24/mo',
    requiresAccount: true,
    hasHeavyEditor: true,
    deletesFiles: false,
  },
  {
    name: 'Otter.ai',
    slug: 'otter',
    description: 'Meeting-focused transcription. Limited video support, no subtitle export.',
    avgProcessingMinutes: 22,
    pricing: 'From $16.99/mo',
    requiresAccount: true,
    hasHeavyEditor: false,
    deletesFiles: false,
  },
  {
    name: 'Trint',
    slug: 'trint',
    description: 'Enterprise transcription platform. High price, steep learning curve.',
    avgProcessingMinutes: 20,
    pricing: 'From $80/mo',
    requiresAccount: true,
    hasHeavyEditor: true,
    deletesFiles: false,
  },
];

const FEATURE_ROWS = [
  {
    category: 'Speed',
    features: [
      {
        label: 'Processing time (2-hour video)',
        videotext: '~3 minutes',
        descript: '15–20 min',
        otter: '20–25 min',
        trint: '18–22 min',
        highlight: true,
      },
      {
        label: 'YouTube URL direct processing',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
      },
      {
        label: 'Instant results (no waiting)',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
      },
    ],
  },
  {
    category: 'Simplicity',
    features: [
      {
        label: 'No heavy editor to learn',
        videotext: true,
        descript: false,
        otter: true,
        trint: false,
      },
      {
        label: 'Paste link or upload, done',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
      },
      {
        label: 'Works on mobile',
        videotext: true,
        descript: false,
        otter: true,
        trint: false,
      },
    ],
  },
  {
    category: 'Output Quality',
    features: [
      {
        label: 'Accuracy (Whisper AI)',
        videotext: '98.5%',
        descript: '~95%',
        otter: '~90%',
        trint: '~93%',
      },
      {
        label: '50+ language support',
        videotext: true,
        descript: false,
        otter: true,
        trint: true,
      },
      {
        label: 'Speaker detection',
        videotext: true,
        descript: true,
        otter: true,
        trint: true,
      },
      {
        label: 'SRT / VTT subtitle export',
        videotext: true,
        descript: true,
        otter: false,
        trint: true,
      },
      {
        label: 'TXT, PDF, DOCX, JSON export',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
      },
    ],
  },
  {
    category: 'Privacy & Security',
    features: [
      {
        label: 'Files deleted after processing',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
        highlight: true,
      },
      {
        label: 'No file storage on servers',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
      },
    ],
  },
  {
    category: 'Pricing',
    features: [
      {
        label: 'Free trial (no credit card)',
        videotext: true,
        descript: false,
        otter: true,
        trint: false,
      },
      {
        label: 'Starting price',
        videotext: '$0 free / $10 Creator Pro',
        descript: '$24/mo',
        otter: '$16.99/mo',
        trint: '$80/mo',
        highlight: true,
      },
      {
        label: 'Pay-as-you-go option',
        videotext: true,
        descript: false,
        otter: false,
        trint: false,
      },
    ],
  },
];

function BoolCell({ val, isUs = false }: { val: boolean | string; isUs?: boolean }) {
  if (typeof val === 'string') {
    return (
      <span className={`text-[13px] font-semibold ${isUs ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300'}`}>
        {val}
      </span>
    );
  }
  return val
    ? <CheckCircle2 className={`w-5 h-5 ${isUs ? 'text-emerald-500' : 'text-emerald-400'} mx-auto`} />
    : <XCircle className="w-5 h-5 text-gray-300 dark:text-gray-700 mx-auto" />;
}

function SpeedCalculator() {
  const videoDurationHours = [0.5, 1, 2, 4];
  const tools = [
    { name: 'VideoText', minsPerHour: 1.5, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/15' },
    { name: 'Descript', minsPerHour: 9, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
    { name: 'Otter.ai', minsPerHour: 11, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 sm:p-8 transition-colors duration-500">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Time-Saved Calculator</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-white/40 mb-6">
        Estimated processing time per video length. VideoText is typically <strong className="text-purple-600 dark:text-purple-400">6–8x faster</strong> than alternatives.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-3">Video length</th>
              {tools.map(t => (
                <th key={t.name} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide pb-3">
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
            {videoDurationHours.map(h => (
              <tr key={h}>
                <td className="py-3 text-sm font-medium text-gray-700 dark:text-white/70">
                  {h < 1 ? `${h * 60} min video` : `${h}-hour video`}
                </td>
                {tools.map(t => {
                  const mins = Math.round(h * t.minsPerHour);
                  return (
                    <td key={t.name} className="py-3 text-center">
                      <span className={`text-sm font-bold ${t.color} ${t.name === 'VideoText' ? 'px-2 py-0.5 rounded-md ' + t.bg : ''}`}>
                        ~{mins < 1 ? '<1' : mins} min
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 dark:text-white/20 mt-4">
        * Times are estimates based on typical processing speeds. Actual times vary by server load and file size.
      </p>
    </div>
  );
}

export default function Compare() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-500">
      {/* Hero */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-950/20 dark:via-gray-950 dark:to-indigo-950/20 transition-colors duration-500" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 mb-6">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              <span className="text-[12px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Competitor comparison</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-5 leading-tight">
              VideoText vs{' '}
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                the competition
              </span>
            </h1>
            <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto mb-8">
              We built VideoText because existing tools were slow, bloated, and expensive. See exactly how we stack up — speed, simplicity, privacy, and price.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/video-to-transcript">
                <motion.span
                  whileHover={{ scale: 1.03, y: -1 }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-7 py-3.5 rounded-xl font-semibold text-[15px] shadow-lg shadow-purple-500/25 hover:shadow-xl transition-all"
                >
                  Try VideoText free
                  <ChevronRight className="w-4 h-4" />
                </motion.span>
              </Link>
              <span className="text-sm text-gray-400">No credit card · Files deleted instantly</span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 pb-24 space-y-16">

        {/* Competitor summary cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            The alternatives — and why they fall short
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {COMPETITORS.map((c, i) => (
              <motion.div
                key={c.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/[0.06] p-6 transition-colors duration-500"
              >
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">{c.name}</h3>
                <p className="text-sm text-gray-500 dark:text-white/40 mb-4 leading-relaxed">{c.description}</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">~{c.avgProcessingMinutes} min for 2-hour video</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-400">{c.pricing}</span>
                  </div>
                  {c.hasHeavyEditor && (
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">Complex editor required</span>
                    </div>
                  )}
                  {!c.deletesFiles && (
                    <div className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="text-gray-600 dark:text-gray-400">Stores your files</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Time-Saved Calculator */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Time-Saved Calculator
          </h2>
          <SpeedCalculator />
        </motion.section>

        {/* Full feature comparison */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Full feature comparison
          </h2>

          <div className="space-y-8">
            {FEATURE_ROWS.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-purple-400" />
                  {section.category}
                </h3>

                <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden transition-colors duration-500">
                  {/* Header row */}
                  <div className="grid grid-cols-5 gap-2 bg-gray-50 dark:bg-gray-900 px-5 py-3 border-b border-gray-200 dark:border-white/[0.05] transition-colors duration-500">
                    <div className="col-span-1" />
                    <div className="text-center">
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">VideoText</span>
                    </div>
                    {COMPETITORS.map(c => (
                      <div key={c.name} className="text-center">
                        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{c.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Feature rows */}
                  <div className="divide-y divide-gray-100 dark:divide-white/[0.03] bg-white dark:bg-gray-900/50 transition-colors duration-500">
                    {section.features.map((row) => (
                      <div
                        key={row.label}
                        className={`grid grid-cols-5 gap-2 px-5 py-3.5 items-center ${row.highlight ? 'bg-purple-50/50 dark:bg-purple-500/[0.04]' : ''} transition-colors duration-500`}
                      >
                        <div className="text-sm text-gray-700 dark:text-white/60">
                          {row.label}
                          {row.highlight && (
                            <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">KEY</span>
                          )}
                        </div>
                        <div className="text-center"><BoolCell val={row.videotext} isUs /></div>
                        <div className="text-center"><BoolCell val={row.descript} /></div>
                        <div className="text-center"><BoolCell val={row.otter} /></div>
                        <div className="text-center"><BoolCell val={row.trint} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Why VideoText wins */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 rounded-3xl p-8 sm:p-12 text-white"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Why VideoText wins on all fronts</h2>
          <p className="text-white/70 mb-8 max-w-2xl">We're purpose-built for one thing: getting you accurate transcripts and subtitles as fast as possible. No bloated editor. No complex UI. Just results.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { icon: Zap, label: 'Fastest', desc: '6–8x faster than competitors on 2-hour videos' },
              { icon: Shield, label: 'Safest', desc: 'Files deleted immediately. We never store your data.' },
              { icon: Star, label: 'Simplest', desc: 'Paste URL or upload. No setup, no editor to learn.' },
              { icon: DollarSign, label: 'Cheapest', desc: 'Start free. Scale at $10/mo locked forever.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{item.label}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/video-to-transcript">
              <motion.span
                whileHover={{ scale: 1.03, y: -1 }}
                className="inline-flex items-center gap-2 bg-white text-purple-700 px-8 py-3.5 rounded-xl font-bold text-[15px] shadow-lg hover:shadow-xl transition-all"
              >
                Transcribe My Video Now
                <ChevronRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <span className="text-white/50 text-sm">No credit card · Files deleted after processing</span>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
