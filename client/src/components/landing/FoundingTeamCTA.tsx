import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Rocket, Lightbulb } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Rocket, label: 'SaaS & AI Growth' },
  { icon: Users, label: 'Enterprise Sales' },
  { icon: Lightbulb, label: 'Product Strategy' },
];

export function FoundingTeamCTA() {
  return (
    <section className="relative py-section-lg overflow-hidden bg-gray-950">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/[0.08] rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] mb-component">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-sm text-white/50 font-medium">Founding Team</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-white leading-tight mb-component-sm font-display">
            Help Build the Future of
            <span className="block bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
              AI Transcription
            </span>
          </h2>

          <p className="text-base text-white/40 max-w-xl mx-auto leading-relaxed mb-component">
            We're looking for exceptional people in SaaS, enterprise sales, AI, media, legal tech,
            or business development who can accelerate our growth. This could evolve into an advisor,
            founding team member, or co-founder opportunity.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-sm text-white/50 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="inline-block"
          >
            <Link
              to="/join"
              className="group inline-flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3.5 rounded-xl font-bold text-base shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all"
            >
              Apply to Join
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
