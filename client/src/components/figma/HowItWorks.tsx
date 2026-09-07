import { Link } from "react-router-dom";
import { Upload, Cpu, Download, Shield, Zap, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Drop your file",
    description:
      "Any video or audio — MP4, MOV, MKV, MP3, WAV, and more. Drag and drop or click to browse.",
    detail: "All formats supported",
  },
  {
    icon: Cpu,
    title: "AI transcribes",
    description:
      "Whisper AI processes your audio — timestamps, speaker detection, and 99 language support included.",
    detail: "98.5% accuracy",
  },
  {
    icon: Download,
    title: "Download & use",
    description:
      "Your transcript, SRT, or subtitle file is ready. Export as TXT, JSON, DOCX, PDF, or VTT.",
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
    <section id="how-it-works" className="relative overflow-hidden bg-gray-950 px-6 py-section">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[400px] w-[500px] rounded-full bg-blue-600/[0.06] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-section text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-400">How it works</p>
          <h2 className="mb-4 font-display text-4xl font-medium leading-tight text-white md:text-5xl">
            Three steps. <span className="text-blue-300">Seconds to transcript.</span>
          </h2>
          <p className="mx-auto max-w-lg text-lg text-white/45">
            No editor to learn. No complex settings. Just upload and get your transcript.
          </p>
        </div>

        <div className="relative mb-10 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="absolute top-11 hidden h-px bg-blue-600/25 md:block md:left-[16%] md:right-[16%]" />
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-gray-700 bg-gray-950 text-xs font-bold text-white/60">
                    {index + 1}
                  </span>
                </div>
                <div className="mb-3 inline-flex rounded-full border border-white/[0.08] bg-white/[0.06] px-2.5 py-1">
                  <span className="text-xs font-semibold text-white/50">{step.detail}</span>
                </div>
                <h3 className="mb-2 text-base font-medium text-white">{step.title}</h3>
                <p className="max-w-[220px] text-sm leading-relaxed text-white/45">{step.description}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/15">
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <h3 className="font-display text-base font-medium text-white">Processing speed</h3>
                <p className="text-xs text-white/30">Measured on real jobs · Whisper AI</p>
              </div>
            </div>
            <div className="space-y-3">
              {BENCHMARKS.map((b) => (
                <div key={b.length} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 tabular-nums text-sm text-white/40">{b.length}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right tabular-nums text-sm font-bold text-white/60">{b.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/15">
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">6× faster than Descript</p>
                <p className="text-xs text-white/35">2hr video in ~5 min vs 15–20 min</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-6 sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/15">
                  <Download className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-display text-base font-medium text-white">What you get from one upload</h3>
                  <p className="text-xs text-white/30">Everything. No extra steps.</p>
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
                    className="rounded-lg border border-white/[0.06] bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-white/55"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <Link
                to="/guide"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 transition-colors hover:text-blue-300"
              >
                See full guide <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-blue-500/20 bg-blue-600/[0.06] p-5">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/15">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="mb-1 text-sm font-bold text-white">Zero data retention</p>
                <p className="text-sm leading-relaxed text-white/45">
                  Your videos are processed and{" "}
                  <span className="font-medium text-white/70">immediately deleted</span>. We never store copies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
