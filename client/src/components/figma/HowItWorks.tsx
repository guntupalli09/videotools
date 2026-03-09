import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Upload, Cpu, Download, Shield, Zap } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: Upload,
    title: 'Upload or paste',
    description: 'Drop a video file (MP4, MOV, MKV…) or paste a YouTube URL. No download required for YouTube.',
    color: 'from-purple-500 to-indigo-600',
    shadowColor: 'shadow-purple-500/30',
  },
  {
    step: '02',
    icon: Cpu,
    title: 'AI transcribes',
    description: 'Whisper AI processes your audio — timestamps, speaker detection, and 50+ language support included.',
    color: 'from-blue-500 to-cyan-600',
    shadowColor: 'shadow-blue-500/30',
  },
  {
    step: '03',
    icon: Download,
    title: 'Download & use',
    description: 'Your transcript, SRT, or subtitle file is ready. Export as TXT, JSON, DOCX, PDF, or VTT.',
    color: 'from-emerald-500 to-green-600',
    shadowColor: 'shadow-emerald-500/30',
  },
];

const BENCHMARKS = [
  { length: '5 min', time: '~15s',   pct: 12 },
  { length: '15 min', time: '~40s',  pct: 28 },
  { length: '30 min', time: '~75s',  pct: 48 },
  { length: '60 min', time: '~2.5 min', pct: 68 },
  { length: '2 hr',   time: '~5 min',  pct: 100 },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 px-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-950 dark:to-gray-900 transition-colors duration-500 overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-purple-500/20 dark:bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 dark:bg-blue-600/20 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            How it works
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-500">
            Three steps.
            <span className="block text-gray-400 dark:text-white/30 transition-colors duration-500">Seconds to transcript.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-10 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-purple-300/50 via-blue-300/50 to-emerald-300/50 dark:from-purple-500/20 dark:via-blue-500/20 dark:to-emerald-500/20 transition-colors duration-500" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step number + icon */}
                <div className="relative z-10 mb-6">
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 3 }}
                    transition={{ duration: 0.2 }}
                    className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ${step.shadowColor} mb-0`}
                  >
                    <Icon className="w-9 h-9 text-white" />
                  </motion.div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 flex items-center justify-center transition-colors duration-500">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-white/60 transition-colors duration-500">{index + 1}</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2.5 transition-colors duration-500">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-white/40 max-w-[220px] leading-relaxed transition-colors duration-500">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Benchmark table + What you get — two columns */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Processing speed benchmark */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] transition-colors duration-500">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center flex-shrink-0 transition-colors duration-500">
                <Zap className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white transition-colors duration-500">Processing speed</h3>
                <p className="text-xs text-gray-400 dark:text-white/30 transition-colors duration-500">Measured on real jobs · Whisper AI</p>
              </div>
            </div>
            <div className="space-y-3">
              {BENCHMARKS.map((b) => (
                <div key={b.length} className="flex items-center gap-3">
                  <span className="text-[12px] text-gray-500 dark:text-white/40 w-14 flex-shrink-0 tabular-nums transition-colors duration-500">{b.length}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${b.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: 0.1 * BENCHMARKS.indexOf(b), ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold text-gray-700 dark:text-white/60 w-16 text-right tabular-nums transition-colors duration-500">{b.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What you get */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] flex flex-col justify-between transition-colors duration-500">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/15 flex items-center justify-center flex-shrink-0 transition-colors duration-500">
                  <Download className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white transition-colors duration-500">What you get from one upload</h3>
                  <p className="text-xs text-gray-400 dark:text-white/30 transition-colors duration-500">Everything. No extra steps.</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-white/40 leading-relaxed transition-colors duration-500">
                Transcript · Speakers · Summary · Chapters · Highlights · Keywords · TXT · JSON · DOCX · PDF · SRT · VTT — all from a single video. Plus Translate, Fix, Burn, Compress, and Batch options.
              </p>
            </div>
            <Link
              to="/guide"
              className="mt-6 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              Full guide →
            </Link>
          </div>
        </motion.div>

        {/* Privacy note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-white/25 transition-colors duration-500"
        >
          <Shield className="w-3.5 h-3.5" />
          Your videos are processed and immediately deleted. We never keep copies.
        </motion.div>
      </div>
    </section>
  );
}
