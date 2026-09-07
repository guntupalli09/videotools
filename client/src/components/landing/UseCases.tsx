import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Youtube, Mic, Building2, ChevronRight, CheckCircle2 } from 'lucide-react';

const USE_CASES = [
  {
    icon: Youtube,
    iconBg: 'bg-red-500',
    label: 'For Video Professionals',
    headline: 'Upload your video. Get a delivery-ready transcript.',
    description: 'Drop any video file and get a clean, timestamped transcript — validated against client style guides and export-ready. No reformatting passes between draft and delivery.',
    points: [
      'Speaker labels & chapter markers auto-detected',
      'Format against Rev, GoTranscript, and custom guidelines',
      'Translate into 70+ languages for localization workflows',
    ],
    cta: 'Transcribe your video',
    href: '/video-to-transcript',
    gradient: 'from-red-500 to-rose-600',
    bgGlow: 'from-red-500/10 via-transparent to-transparent dark:from-red-500/5',
    borderHover: 'hover:border-red-200 dark:hover:border-red-500/20',
  },
  {
    icon: Mic,
    iconBg: 'bg-blue-600',
    label: 'For Podcast Teams',
    headline: 'One upload. Full episode deliverables.',
    description: 'Drop an episode and get a timestamped transcript, AI chapter markers, and formatted show notes — all from a single upload. Built for teams handling multiple shows.',
    points: [
      'Timestamped transcript ready for show notes',
      'AI-generated chapters and episode summary',
      'Batch entire seasons — download as ZIP',
    ],
    cta: 'Try podcast transcription',
    href: '/podcast-transcription-tool',
    gradient: 'from-blue-600 to-blue-700',
    bgGlow: 'from-blue-600/10 via-transparent to-transparent dark:from-blue-600/5',
    borderHover: 'hover:border-blue-200 dark:hover:border-blue-500/20',
  },
  {
    icon: Building2,
    iconBg: 'bg-blue-600',
    label: 'For Media Agencies',
    headline: 'Batch 20 client videos at once.',
    description: 'Upload a full client backlog. The batch processor queues and transcribes everything in parallel — validates against per-client style guides and delivers a ZIP when done.',
    points: [
      'Process up to 20 videos simultaneously',
      'Per-client guideline profiles for QA',
      'Bulk SRT · VTT · DOCX export per client',
    ],
    cta: 'Try batch processing',
    href: '/batch-process',
    gradient: 'from-blue-600 to-cyan-600',
    bgGlow: 'from-blue-500/10 via-transparent to-transparent dark:from-blue-500/5',
    borderHover: 'hover:border-blue-200 dark:hover:border-blue-500/20',
  },
];

export function UseCases() {
  return (
    <section className="py-12 bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
      <div className="max-w-5xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            Built for your workflow
          </p>
          <h2 className="tool-title mb-4 text-4xl text-gray-900 transition-colors duration-500 md:text-5xl dark:text-white">
            Built for every professional
            <span className="block text-gray-400 dark:text-white/30 transition-colors duration-500">transcript workflow.</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/40 max-w-lg mx-auto transition-colors duration-500">
            Whether you're a freelance transcriptionist, a podcast team, or a media agency — Videotext adapts to your volume and delivery requirements.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USE_CASES.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <motion.div
                key={uc.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={`group h-full rounded-xl border border-gray-200 dark:border-white/[0.07] bg-white dark:bg-gray-950 overflow-hidden ${uc.borderHover} hover:shadow-xl hover:shadow-gray-100 dark:hover:shadow-black/30 transition-all duration-300`}>
                  {/* Top gradient strip */}
                  <div className={`h-1.5 bg-gradient-to-r ${uc.gradient}`} />

                  {/* Card body */}
                  <div className="p-6 flex flex-col h-full">
                    {/* Label + icon */}
                    <div className="flex items-center justify-between mb-5">
                      <span className="text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors duration-500 dark:text-white/35">
                        {uc.label}
                      </span>
                      <div className={`w-9 h-9 rounded-xl ${uc.iconBg} flex items-center justify-center shadow-md`}>
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                    </div>

                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3 transition-colors duration-500">
                      {uc.headline}
                    </h3>

                    <p className="text-sm text-gray-500 dark:text-white/40 leading-relaxed mb-6 flex-1 transition-colors duration-500">
                      {uc.description}
                    </p>

                    {/* Feature points */}
                    <ul className="space-y-2.5 mb-6">
                      {uc.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-white/55 transition-colors duration-500">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {pt}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link
                      to={uc.href}
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r ${uc.gradient} bg-clip-text text-transparent group-hover:gap-2.5 transition-all`}
                    >
                      {uc.cta}
                      <ChevronRight className={`w-3.5 h-3.5 bg-gradient-to-r ${uc.gradient} bg-clip-text text-transparent`} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
