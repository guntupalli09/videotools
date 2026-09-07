import { Link } from 'react-router-dom';
import { Youtube, Mic, Building2, ChevronRight, CheckCircle2 } from 'lucide-react';

const USE_CASES = [
  {
    icon: Youtube,
    iconBg: 'bg-red-500',
    label: 'For Video Professionals',
    headline: 'Upload your video. Get a delivery-ready transcript.',
    description:
      'Drop any video file and get a clean, timestamped transcript — validated against client style guides and export-ready. No reformatting passes between draft and delivery.',
    points: [
      'Speaker labels & chapter markers auto-detected',
      'Format against Rev, GoTranscript, and custom guidelines',
      'Translate into 70+ languages for localization workflows',
    ],
    cta: 'Transcribe your video',
    href: '/video-to-transcript',
  },
  {
    icon: Mic,
    iconBg: 'bg-blue-600',
    label: 'For Podcast Teams',
    headline: 'One upload. Full episode deliverables.',
    description:
      'Drop an episode and get a timestamped transcript, AI chapter markers, and formatted show notes — all from a single upload. Built for teams handling multiple shows.',
    points: [
      'Timestamped transcript ready for show notes',
      'AI-generated chapters and episode summary',
      'Batch entire seasons — download as ZIP',
    ],
    cta: 'Try podcast transcription',
    href: '/podcast-transcription-tool',
  },
  {
    icon: Building2,
    iconBg: 'bg-blue-600',
    label: 'For Media Agencies',
    headline: 'Batch 20 client videos at once.',
    description:
      'Upload a full client backlog. The batch processor queues and transcribes everything in parallel — validates against per-client style guides and delivers a ZIP when done.',
    points: [
      'Process up to 20 videos simultaneously',
      'Per-client guideline profiles for QA',
      'Bulk SRT · VTT · DOCX export per client',
    ],
    cta: 'Try batch processing',
    href: '/batch-process',
  },
];

export function UseCases() {
  return (
    <section className="bg-gray-50 py-12 transition-colors duration-500 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600 transition-colors duration-500 dark:text-blue-400">
            Built for your workflow
          </p>
          <h2 className="tool-title mb-4 text-4xl text-gray-900 transition-colors duration-500 md:text-5xl dark:text-white">
            Built for every professional
            <span className="block text-gray-400 transition-colors duration-500 dark:text-white/30">
              transcript workflow.
            </span>
          </h2>
          <p className="mx-auto max-w-lg text-lg text-gray-500 transition-colors duration-500 dark:text-white/40">
            Whether you&apos;re a freelance transcriptionist, a podcast team, or a media agency — VideoText
            adapts to your volume and delivery requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {USE_CASES.map((uc) => {
            const Icon = uc.icon;
            return (
              <div
                key={uc.label}
                className="group h-full overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-blue-300 dark:border-white/[0.07] dark:bg-gray-950 dark:hover:border-blue-500/30"
              >
                <div className="flex h-full flex-col p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors duration-500 dark:text-white/35">
                      {uc.label}
                    </span>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${uc.iconBg}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <h3 className="mb-3 text-xl font-medium text-gray-900 transition-colors duration-500 dark:text-white">
                    {uc.headline}
                  </h3>

                  <p className="mb-6 flex-1 text-sm leading-relaxed text-gray-500 transition-colors duration-500 dark:text-white/40">
                    {uc.description}
                  </p>

                  <ul className="mb-6 space-y-2.5">
                    {uc.points.map((pt) => (
                      <li
                        key={pt}
                        className="flex items-start gap-2.5 text-sm text-gray-600 transition-colors duration-500 dark:text-white/55"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        {pt}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={uc.href}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors group-hover:text-blue-700 dark:text-blue-400 dark:group-hover:text-blue-300"
                  >
                    {uc.cta}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
