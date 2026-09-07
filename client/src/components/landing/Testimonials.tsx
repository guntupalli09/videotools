import { motion } from 'framer-motion';
import { Youtube, Mic, Building2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

const TESTIMONIALS = [
  {
    quote:
      'I used to spend 3 hours per video cleaning up captions and reformatting them against Rev\'s style guide. Now I upload, run the QA formatter, and the transcript is delivery-ready in minutes. The accuracy on accented speech is genuinely better than anything else I\'ve tried.',
    name: 'Marcus Chen',
    role: 'Media Producer',
    meta: 'Rev-certified transcriptionist',
    avatar: 'https://i.pravatar.cc/80?img=11',
    platform: Youtube,
    platformColor: 'text-red-500',
    result: 'Cut QA time by 3 hrs/video',
    resultBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
    accentColor: 'from-red-500/20 to-transparent',
  },
  {
    quote:
      'We produce 24 episodes a month across three shows. Batch processing handles the entire queue at once — transcripts, show notes, chapters, everything. It replaced a part-time contractor and our turnaround went from 3 days to same-day.',
    name: 'Sarah Okonkwo',
    role: 'Podcast Producer',
    meta: 'The Growth Lab Network',
    avatar: 'https://i.pravatar.cc/80?img=47',
    platform: Mic,
    platformColor: 'text-blue-400',
    result: 'Replaced contractor + same-day delivery',
    resultBg: 'bg-blue-600/10 text-blue-400 border border-blue-500/20',
    accentColor: 'from-blue-600/20 to-transparent',
  },
  {
    quote:
      'We deliver captions for 12 clients every week. The guideline formatter cut our QA passes in half — upload, validate against each client\'s rules, fix, export. No more reformatting back-and-forth between draft and delivery.',
    name: 'James Rivera',
    role: 'Founder',
    meta: 'Apex Media Agency',
    avatar: 'https://i.pravatar.cc/80?img=33',
    platform: Building2,
    platformColor: 'text-blue-400',
    result: '50% fewer QA passes per client',
    resultBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    accentColor: 'from-blue-500/20 to-transparent',
  },
];

function StarRating({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-section bg-white dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-5xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-section"
        >
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            Real results
          </p>
          <h2 className="text-4xl md:text-5xl font-medium text-gray-900 dark:text-white mb-4 font-display leading-tight transition-colors duration-500">
            Real results from
            <span className="block text-gray-300 dark:text-white/20">professional workflows.</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/40 max-w-lg mx-auto transition-colors duration-500">
            Here's what transcription teams, podcast studios, and media agencies say after switching.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => {
            const Platform = t.platform;
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.12, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="h-full rounded-xl border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02] p-6 flex flex-col relative overflow-hidden hover:border-gray-300 dark:hover:border-white/[0.12] hover:shadow-xl hover:shadow-gray-100/60 dark:hover:shadow-black/30 transition-all duration-300"
                >
                  {/* Subtle accent top bar */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${t.accentColor}`} />

                  {/* Stars + platform */}
                  <div className="flex items-center justify-between mb-component-sm">
                    <StarRating />
                    <Platform className={`w-4 h-4 ${t.platformColor}`} />
                  </div>

                  {/* Quote */}
                  <blockquote className="text-base text-gray-700 dark:text-white/65 leading-relaxed flex-1 mb-component-sm transition-colors duration-500">
                    "{t.quote}"
                  </blockquote>

                  {/* Result badge */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${t.resultBg}`}>
                      {t.result}
                    </span>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-white/[0.05] transition-colors duration-500">
                    <ImageWithFallback
                      src={t.avatar}
                      alt={t.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white transition-colors duration-500">
                        {t.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-white/35 truncate transition-colors duration-500">
                        {t.role} · {t.meta}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400 dark:text-white/25 transition-colors duration-500"
        >
          <span>Trusted by teams at</span>
          {['Transcription teams', 'Podcast studios', 'Media agencies', 'Localization teams'].map((brand) => (
            <span
              key={brand}
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] text-gray-600 dark:text-white/40 font-medium text-xs transition-colors duration-500"
            >
              {brand}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
