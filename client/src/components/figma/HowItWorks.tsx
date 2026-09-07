import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Upload, Cpu, Download, Shield, Zap, ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Upload,
    title: "Drop your file",
    description:
      "Any video or audio — MP4, MOV, MKV, MP3, WAV, and more. Drag and drop or click to browse.",
    color: "from-blue-600 to-blue-700",
    shadowColor: "shadow-blue-500/30",
    glow: "bg-blue-600/10",
    detail: "All formats supported",
  },
  {
    step: "02",
    icon: Cpu,
    title: "AI transcribes",
    description:
      "Whisper AI processes your audio — timestamps, speaker detection, and 99 language support included.",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/30",
    glow: "bg-blue-500/10",
    detail: "98.5% accuracy",
  },
  {
    step: "03",
    icon: Download,
    title: "Download & use",
    description:
      "Your transcript, SRT, or subtitle file is ready. Export as TXT, JSON, DOCX, PDF, or VTT.",
    color: "from-emerald-500 to-green-600",
    shadowColor: "shadow-emerald-500/30",
    glow: "bg-emerald-500/10",
    detail: "10+ export formats",
  },
];

const BENCHMARKS = [
  { length: "5 min video", time: "~15s", pct: 12 },
  { length: "15 min video", time: "~40s", pct: 28 },
  { length: "30 min video", time: "~75s", pct: 48 },
  { length: "60 min video", time: "~2.5 min", pct: 68 },
  { length: "2 hr video", time: "~5 min", pct: 100 },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative px-6 py-section bg-gray-950 transition-colors duration-500 overflow-hidden"
    >
      {/* Background dot grid */}
      <div
        className="absolute inset-0 z-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(139,92,246,0.15) 1px, transparent 0)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Ambient blobs */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-blue-600/[0.08] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-700/[0.07] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-section"
        >
          <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-4xl md:text-5xl font-medium text-white mb-4 font-display leading-tight">
            Three steps.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
              Seconds to transcript.
            </span>
          </h2>
          <p className="text-lg text-white/45 max-w-lg mx-auto">
            No editor to learn. No complex settings. Just upload and get your
            transcript.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative mb-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-[2.75rem] left-[calc(16.66%+3rem)] right-[calc(16.66%+3rem)] h-px bg-gradient-to-r from-blue-600/30 via-blue-500/30 to-emerald-500/30" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.65, delay: index * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Icon container */}
                <div className="relative z-10 mb-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ${step.shadowColor}`}
                  >
                    <Icon className="h-5 w-5 text-white" />
                    {/* Glow behind icon */}
                    <div
                      className={`absolute inset-0 rounded-xl ${step.glow} blur-xl scale-150 opacity-0 group-hover:opacity-100`}
                    />
                  </motion.div>
                  {/* Step number */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-950 border border-gray-700 flex items-center justify-center">
                    <span className="text-xs font-bold text-white/60">
                      {index + 1}
                    </span>
                  </div>
                </div>

                {/* Detail badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] mb-3">
                  <span className="text-xs font-semibold text-white/50">
                    {step.detail}
                  </span>
                </div>

                <h3 className="mb-2.5 text-base font-medium text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-white/45 max-w-[220px] leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom: Speed + Privacy cards */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Speed benchmark */}
          <div className="p-6 sm:p-8 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white font-display">
                  Processing speed
                </h3>
                <p className="text-xs text-white/30">
                  Measured on real jobs · Whisper AI
                </p>
              </div>
            </div>
            <div className="space-y-component-sm">
              {BENCHMARKS.map((b) => (
                <div key={b.length} className="flex items-center gap-3">
                  <span className="text-sm text-white/40 w-20 flex-shrink-0 tabular-nums">
                    {b.length}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${b.pct}%` }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.75,
                        delay: 0.1 * BENCHMARKS.indexOf(b),
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white/60 w-16 text-right tabular-nums">
                    {b.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Speed callout */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  6× faster than Descript
                </p>
                <p className="text-xs text-white/35">
                  2hr video in ~5 min vs 15–20 min
                </p>
              </div>
            </div>
          </div>

          {/* What you get + privacy */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 p-6 sm:p-8 rounded-xl bg-white/[0.03] border border-white/[0.07]">
              <div className="flex items-center gap-3 mb-component-sm">
                <div className="w-9 h-9 rounded-xl bg-blue-600/15 flex items-center justify-center flex-shrink-0">
                  <Download className="w-4.5 h-4.5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white font-display">
                    What you get from one upload
                  </h3>
                  <p className="text-xs text-white/30">
                    Everything. No extra steps.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Transcript",
                  "Speaker labels",
                  "Summary",
                  "Chapters",
                  "Keywords",
                  "TXT",
                  "JSON",
                  "DOCX",
                  "PDF",
                  "SRT",
                  "VTT",
                ].map((item) => (
                  <span
                    key={item}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.06] text-xs font-medium text-white/55"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <Link
                to="/guide"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                See full guide <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Privacy card */}
            <div className="p-5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.15] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">
                  Zero data retention
                </p>
                <p className="text-sm text-white/45 leading-relaxed">
                  Your videos are processed and{" "}
                  <span className="text-white/70 font-medium">
                    immediately deleted
                  </span>
                  . We never store copies. No cloud backup, no training data.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
