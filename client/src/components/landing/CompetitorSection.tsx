import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Clock, CheckCircle2, XCircle, ChevronRight, TrendingDown } from 'lucide-react';

const COMPETITORS = [
  { name: 'Descript', color: 'text-blue-500', slowMinutes: 18 },
  { name: 'Otter.ai', color: 'text-green-600', slowMinutes: 22 },
  { name: 'Trint', color: 'text-orange-500', slowMinutes: 20 },
];

const VIDEOTEXT_MINUTES = 3;
const VIDEO_DURATION = 120; // 2-hour video in minutes

// Bar chart comparison data
const COMPARISON_BARS = [
  { label: 'VideoText', minutes: VIDEOTEXT_MINUTES, isUs: true },
  { label: 'Descript', minutes: 18, isUs: false },
  { label: 'Otter.ai', minutes: 22, isUs: false },
  { label: 'Trint', minutes: 20, isUs: false },
];

const MAX_MINUTES = Math.max(...COMPARISON_BARS.map(b => b.minutes));

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
    feature: 'No heavy editor required',
    videotext: true,
    descript: false,
    otter: false,
    trint: false,
  },
  {
    feature: 'YouTube URL → direct transcript',
    videotext: 'Soon',
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
    feature: 'No monthly seat fee to get started',
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
    feature: '50+ language support',
    videotext: true,
    descript: false,
    otter: true,
    trint: true,
  },
];

function BoolCell({ val }: { val: boolean | string }) {
  if (typeof val === 'string') {
    return <span className="text-[13px] font-semibold text-purple-600 dark:text-purple-400">{val}</span>;
  }
  return val
    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
    : <XCircle className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />;
}

export function CompetitorSection() {
  return (
    <section className="py-24 bg-white dark:bg-gray-950 transition-colors duration-500 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 mb-6">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[12px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Speed comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-500">
            Tired of{' '}
            <span className="line-through text-gray-400 dark:text-gray-600">{COMPETITORS[0].name}'s</span>{' '}
            slowness?
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/45 max-w-2xl mx-auto transition-colors duration-500">
            See how VideoText processes a 2-hour video in{' '}
            <span className="font-bold text-purple-600 dark:text-purple-400">3 minutes</span>{' '}
            — while competitors take 15–25 minutes for the same job.
          </p>
        </motion.div>

        {/* Speed bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/[0.06] p-8 mb-12 transition-colors duration-500"
        >
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-white/70">Processing time for a 2-hour video (minutes)</span>
          </div>

          <div className="space-y-4">
            {COMPARISON_BARS.map((bar, i) => {
              const pct = (bar.minutes / MAX_MINUTES) * 100;
              return (
                <motion.div
                  key={bar.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-20 text-right">
                    <span className={`text-sm font-semibold ${bar.isUs ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {bar.label}
                    </span>
                  </div>
                  <div className="flex-1 relative h-9 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 rounded-lg flex items-center ${
                        bar.isUs
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <div className="w-16 text-left">
                    <span className={`text-sm font-bold ${bar.isUs ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {bar.minutes} min
                      {bar.isUs && (
                        <span className="ml-1 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                          {Math.round((COMPETITORS[0].slowMinutes / VIDEOTEXT_MINUTES))}x faster
                        </span>
                      )}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Time saved callout */}
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
                  Save {VIDEO_DURATION / VIDEOTEXT_MINUTES - VIDEO_DURATION / COMPETITORS[0].slowMinutes < 1
                    ? '15+ minutes'
                    : `${Math.floor(COMPETITORS[0].slowMinutes - VIDEOTEXT_MINUTES)} minutes`} per video
                </p>
                <p className="text-[12px] text-gray-500 dark:text-white/40">
                  VideoText processes a 2-hour video in ~{VIDEOTEXT_MINUTES} min vs {COMPETITORS[0].name}'s ~{COMPETITORS[0].slowMinutes} min
                </p>
              </div>
            </div>
            <Link to="/video-to-transcript">
              <motion.span
                whileHover={{ scale: 1.03 }}
                className="inline-flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
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
          transition={{ delay: 0.2, duration: 0.6 }}
          className="overflow-x-auto"
        >
          <div className="min-w-[640px]">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-2 mb-3 px-4">
              <div className="col-span-1" />
              <div className="text-center">
                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-full">VideoText ✓</span>
              </div>
              {COMPETITORS.map(c => (
                <div key={c.name} className="text-center">
                  <span className={`text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide`}>{c.name}</span>
                </div>
              ))}
            </div>

            {/* Table rows */}
            <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] overflow-hidden divide-y divide-gray-100 dark:divide-white/[0.04] transition-colors duration-500">
              {FEATURE_COMPARISON.map((row, i) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * i }}
                  className={`grid grid-cols-5 gap-2 px-4 py-3.5 items-center ${
                    row.highlight
                      ? 'bg-purple-50/60 dark:bg-purple-500/[0.04]'
                      : i % 2 === 0
                        ? 'bg-white dark:bg-gray-900'
                        : 'bg-gray-50/50 dark:bg-gray-900/50'
                  } transition-colors duration-500`}
                >
                  <div className="text-sm text-gray-700 dark:text-white/60 font-medium">
                    {row.feature}
                    {row.highlight && (
                      <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-semibold">KEY</span>
                    )}
                  </div>
                  <div className="text-center"><BoolCell val={row.videotext} /></div>
                  <div className="text-center"><BoolCell val={row.descript} /></div>
                  <div className="text-center"><BoolCell val={row.otter} /></div>
                  <div className="text-center"><BoolCell val={row.trint} /></div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA footer */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center mt-10"
        >
          <p className="text-sm text-gray-500 dark:text-white/35 mb-4">
            Switch from any competitor in minutes. No learning curve.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/video-to-transcript">
              <motion.span
                whileHover={{ scale: 1.03, y: -1 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-7 py-3 rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/20 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
              >
                Transcribe My Video Now
                <ChevronRight className="w-4 h-4" />
              </motion.span>
            </Link>
            <Link
              to="/compare"
              className="text-sm text-gray-500 dark:text-white/35 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium"
            >
              See full comparison →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
