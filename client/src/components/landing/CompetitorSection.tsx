import { Link } from 'react-router-dom';
import { Zap, Clock, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

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
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-sm font-bold text-blue-600 dark:bg-blue-600/10 dark:text-blue-400">
        {val}
      </span>
    );
  }
  return val ? (
    <CheckCircle2 className="mx-auto h-4 w-4 text-blue-500" />
  ) : (
    <XCircle className="mx-auto h-4 w-4 text-gray-300 dark:text-gray-600" />
  );
}

export function CompetitorSection() {
  const speedMultiple = Math.round(COMPETITORS[0].slowMinutes / VIDEOTEXT_MINUTES);

  return (
    <section className="overflow-hidden bg-gray-50 py-section transition-colors duration-500 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-section text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 dark:border-white/[0.08] dark:bg-gray-950">
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-sm font-bold uppercase tracking-wide text-gray-600 dark:text-white/55">
              Speed comparison
            </span>
          </div>

          <h2 className="mb-4 font-display text-3xl font-medium leading-tight text-gray-900 transition-colors duration-500 dark:text-white sm:text-4xl md:text-5xl">
            <span className="text-blue-600 dark:text-blue-400">{speedMultiple}× faster</span> than Descript.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-500 transition-colors duration-500 dark:text-white/45">
            VideoText processes a 2-hour video in{' '}
            <span className="font-bold text-blue-600 dark:text-blue-400">3 minutes</span> — while competitors
            take 15–25 minutes for the same job.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 transition-colors duration-500 dark:border-white/[0.06] dark:bg-gray-950 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-white/70">
              Processing time for a 2-hour video (minutes)
            </span>
          </div>

          <div className="space-y-component-sm">
            {COMPARISON_BARS.map((bar) => {
              const pct = (bar.minutes / MAX_MINUTES) * 100;
              return (
                <div key={bar.label} className="flex items-center gap-4">
                  <div className="w-20 text-right">
                    <span
                      className={`text-sm font-bold ${
                        bar.isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {bar.label}
                    </span>
                  </div>
                  <div className="relative h-10 flex-1 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`absolute inset-y-0 left-0 flex items-center rounded-xl ${
                        bar.isUs ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex w-24 items-center gap-1.5 text-left">
                    <span
                      className={`text-sm font-bold ${
                        bar.isUs ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {bar.minutes} min
                    </span>
                    {bar.isUs && (
                      <span className="whitespace-nowrap rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                        {speedMultiple}× faster
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-6 transition-colors duration-500 dark:border-white/[0.05] sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/15">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white/80">
                  Save {COMPETITORS[0].slowMinutes - VIDEOTEXT_MINUTES}+ minutes per video
                </p>
                <p className="text-sm text-gray-500 dark:text-white/40">
                  That&apos;s{' '}
                  {Math.round(((COMPETITORS[0].slowMinutes - VIDEOTEXT_MINUTES) / COMPETITORS[0].slowMinutes) * 100)}%
                  faster — on every single job
                </p>
              </div>
            </div>
            <Link
              to="/video-to-transcript"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Try VideoText free
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="mb-3 grid grid-cols-5 gap-2 px-4">
              <div />
              <div className="text-center">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-blue-600 dark:bg-blue-600/10 dark:text-blue-400">
                  VideoText ✓
                </span>
              </div>
              {COMPETITORS.map((c) => (
                <div key={c.name} className="text-center">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {c.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 transition-colors duration-500 dark:divide-white/[0.04] dark:border-white/[0.06]">
              {FEATURE_COMPARISON.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-5 items-center gap-2 px-4 py-3.5 ${
                    row.highlight
                      ? 'bg-blue-50/70 dark:bg-blue-600/[0.05]'
                      : i % 2 === 0
                        ? 'bg-white dark:bg-gray-950'
                        : 'bg-gray-50/60 dark:bg-gray-900/60'
                  } transition-colors duration-500`}
                >
                  <div className="text-sm font-medium text-gray-700 dark:text-white/60">
                    {row.feature}
                    {row.highlight && (
                      <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
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
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="mb-4 text-sm text-gray-500 dark:text-white/35">
            Switch from any competitor in minutes. No learning curve. No friction.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/video-to-transcript"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Start Transcribing Free
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              to="/compare"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-blue-600 dark:text-white/35 dark:hover:text-blue-400"
            >
              See full comparison →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
