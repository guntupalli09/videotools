import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Clock, CheckCircle2, XCircle, ChevronRight, TrendingDown } from 'lucide-react';

const COMPETITORS = [
  { name: 'Descript', slowMinutes: 18 },
  { name: 'Otter.ai', slowMinutes: 22 },
  { name: 'Trint', slowMinutes: 20 },
];

const VIDEOTEXT_MINUTES = 3;

const COMPARISON_BARS = [
  { label: 'VideoText', minutes: VIDEOTEXT_MINUTES, isUs: true },
  { label: 'Descript', minutes: 18, isUs: false },
  { label: 'Trint', minutes: 20, isUs: false },
  { label: 'Otter.ai', minutes: 22, isUs: false },
];

const MAX_MINUTES = Math.max(...COMPARISON_BARS.map((b) => b.minutes));

const FEATURE_COMPARISON = [
  {
    feature: 'Processing speed (2hr video)',
    videotext: '~3 minutes',
    descript: '15–20 min',
    otter: '20–25 min',
    trint: '18–22 min',
    highlight: true,
  },
  {
    feature: 'No heavy video editor required',
    videotext: true,
    descript: false,
    otter: false,
    trint: false,
  },
  {
    feature: 'Files deleted after processing',
    videotext: true,
    descript: false,
    otter: false,
    trint: false,
  },
  {
    feature: 'No monthly seat fee to start',
    videotext: true,
    descript: false,
    otter: false,
    trint: false,
  },
  {
    feature: 'SRT / VTT subtitle export',
    videotext: true,
    descript: true,
    otter: false,
    trint: true,
  },
  {
    feature: '99 language support',
    videotext: true,
    descript: false,
    otter: true,
    trint: true,
  },
  {
    feature: 'YouTube URL → direct transcript',
    videotext: 'Soon',
    descript: false,
    otter: false,
    trint: false,
  },
];

function BoolCell({ val }: { val: boolean | string }) {
  if (typeof val === 'string') {
    return (
      <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-600/10 px-2 py-0.5 rounded-full">
        {val}
      </span>
    );
  }
  return val ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
  ) : (
    <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
  );
}

export function CompetitorSection() {
  const speedMultiple = Math.round(COMPETITORS[0].slowMinutes / VIDEOTEXT_MINUTES);

  return (
    <section className="py-section bg-gray-50 dark:bg-gray-900 transition-colors duration-500 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-section"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 mb-6">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
              Speed comparison
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-gray-900 dark:text-white mb-4 font-display leading-tight transition-colors duration-500">
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              {speedMultiple}× faster
            </span>
            {' '}than Descript.
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-xl mx-auto transition-colors duration-500">
            VideoText processes a 2-hour video in <span className="font-bold text-blue-600 dark:text-blue-400">3 minutes</span> — while competitors take 15–25 minutes for the same job.
          </p>
        </motion.div>

        {/* Speed bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-white/[0.06] p-6 sm:p-8 mb-6 transition-colors duration-500"
        >
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-white/70">
              Processing time for a 2-hour video (minutes)
            </span>
          </div>

          <div className="space-y-component-sm">
            {COMPARISON_BARS.map((bar, i) => {
              const pct = (bar.minutes / MAX_MINUTES) * 100;
              return (
                <motion.div
                  key={bar.label}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.09, duration: 0.5 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-20 text-right">
                    <span
                      className={`text-sm font-bold ${
                        bar.isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {bar.label}
                    </span>
                  </div>
                  <div className="flex-1 relative h-10 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 rounded-xl flex items-center ${
                        bar.isUs
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.35 + i * 0.09, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="w-20 text-left flex items-center gap-1.5">
                    <span
                      className={`text-sm font-bold ${
                        bar.isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {bar.minutes} min
                    </span>
                    {bar.isUs && (
                      <span className="text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {speedMultiple}× faster
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Callout row */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-6 border-t border-gray-200 dark:border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-500"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white/80">
                  Save {COMPETITORS[0].slowMinutes - VIDEOTEXT_MINUTES}+ minutes per video
                </p>
                <p className="text-sm text-gray-500 dark:text-white/40">
                  That's {Math.round(((COMPETITORS[0].slowMinutes - VIDEOTEXT_MINUTES) / COMPETITORS[0].slowMinutes) * 100)}% faster — on every single job
                </p>
              </div>
            </div>
            <Link to="/video-to-transcript">
              <motion.span
                whileHover={{ scale: 1.03, y: -1 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
              >
                Try VideoText free
                <ChevronRight className="w-4 h-4" />
              </motion.span>
            </Link>
          </motion.div>
        </motion.div>

        {/* Feature comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="overflow-x-auto"
        >
          <div className="min-w-[640px]">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-2 mb-3 px-4">
              <div />
              <div className="text-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide bg-blue-50 dark:bg-blue-600/10 px-2.5 py-1 rounded-full">
                  VideoText ✓
                </span>
              </div>
              {COMPETITORS.map((c) => (
                <div key={c.name} className="text-center">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Table rows */}
            <div className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04] transition-colors duration-500">
              {FEATURE_COMPARISON.map((row, i) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.04 * i }}
                  className={`grid grid-cols-5 gap-2 px-4 py-3.5 items-center ${
                    row.highlight
                      ? 'bg-blue-50/70 dark:bg-blue-600/[0.05]'
                      : i % 2 === 0
                      ? 'bg-white dark:bg-gray-950'
                      : 'bg-gray-50/60 dark:bg-gray-900/60'
                  } transition-colors duration-500`}
                >
                  <div className="text-sm text-gray-700 dark:text-white/60 font-medium">
                    {row.feature}
                    {row.highlight && (
                      <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
                        KEY
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <BoolCell val={row.videotext} />
                  </div>
                  <div className="text-center">
                    <BoolCell val={row.descript} />
                  </div>
                  <div className="text-center">
                    <BoolCell val={row.otter} />
                  </div>
                  <div className="text-center">
                    <BoolCell val={row.trint} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mt-10"
        >
          <p className="text-sm text-gray-500 dark:text-white/35 mb-4">
            Switch from any competitor in minutes. No learning curve. No friction.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <motion.span
                whileHover={{ scale: 1.03, y: -1 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
              >
                Start Transcribing Free
                <ChevronRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link
              to="/compare"
              className="text-sm text-gray-500 dark:text-white/35 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
            >
              See full comparison →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
