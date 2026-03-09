import { motion } from 'framer-motion';
import { Youtube, Mic, Building2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

const TESTIMONIALS = [
  {
    quote: "I used to spend 3 hours per video on captions. Now I drop the file, grab a coffee, and the transcript is waiting when I'm back. The accuracy with accented speech is genuinely better than anything else I've tried.",
    name: 'Marcus Chen',
    role: 'YouTube Creator',
    meta: '480K subscribers',
    avatar: 'https://i.pravatar.cc/80?img=11',
    platform: Youtube,
    platformColor: 'text-red-500',
    result: 'Saves 3 hrs/video',
    resultColor: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
  },
  {
    quote: "We produce 24 episodes a month across three shows. Batch processing handles the entire queue at once — transcripts, show notes, chapters, everything automated. It replaced a part-time contractor.",
    name: 'Sarah Okonkwo',
    role: 'Podcast Producer',
    meta: 'The Growth Lab Network',
    avatar: 'https://i.pravatar.cc/80?img=47',
    platform: Mic,
    platformColor: 'text-purple-500',
    result: 'Replaced a contractor',
    resultColor: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  },
  {
    quote: "We caption video ads for 12 clients every week. The YouTube URL feature is an absolute game-changer — paste the link, captions done, sent to client. No downloads, no drama, no back-and-forth.",
    name: 'James Rivera',
    role: 'Founder',
    meta: 'Apex Media Agency',
    avatar: 'https://i.pravatar.cc/80?img=33',
    platform: Building2,
    platformColor: 'text-blue-500',
    result: '12 clients served',
    resultColor: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  },
];

function StarRating() {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-24 bg-white dark:bg-gray-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-3 transition-colors duration-500">
            Real results
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-500">
            Loved by creators, podcasters,
            <span className="block text-gray-400 dark:text-white/30 transition-colors duration-500">and agencies.</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-white/40 max-w-lg mx-auto transition-colors duration-500">
            Don't take our word for it. Here's what teams who've switched have to say.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => {
            const Platform = t.platform;
            return (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="h-full rounded-2xl border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.02] p-6 flex flex-col transition-colors duration-500 hover:border-gray-300 dark:hover:border-white/[0.12] hover:shadow-lg hover:shadow-gray-100 dark:hover:shadow-black/20 transition-all duration-300">
                  {/* Stars + platform */}
                  <div className="flex items-center justify-between mb-5">
                    <StarRating />
                    <Platform className={`w-4 h-4 ${t.platformColor}`} />
                  </div>

                  {/* Quote */}
                  <blockquote className="text-[15px] text-gray-700 dark:text-white/65 leading-relaxed flex-1 mb-6 transition-colors duration-500">
                    "{t.quote}"
                  </blockquote>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-white/[0.05] transition-colors duration-500">
                    <ImageWithFallback
                      src={t.avatar}
                      alt={t.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-500">{t.name}</p>
                      <p className="text-[12px] text-gray-500 dark:text-white/35 transition-colors duration-500">{t.role} · {t.meta}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${t.resultColor} transition-colors duration-500`}>
                      {t.result}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom trust bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400 dark:text-white/25 transition-colors duration-500"
        >
          <span>Trusted by teams at</span>
          {['YouTube channels', 'Podcasting studios', 'Media agencies', 'SaaS companies'].map((brand) => (
            <span
              key={brand}
              className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06] text-gray-500 dark:text-white/35 font-medium transition-colors duration-500"
            >
              {brand}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
