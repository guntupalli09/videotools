import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Zap, Shield, Globe, CheckCircle2 } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="relative py-section-lg overflow-hidden bg-gray-950">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gray-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/[0.1] rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.07] border border-white/[0.1] mb-component">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-blue-600"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            <span className="text-sm text-white/60 font-medium">
              Whisper AI · 98.5% accurate · Zero data retention
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-medium text-white leading-[1.05] mb-6 font-display">
            Start transcribing
            <span className="block brand-moment">
              client-ready.
            </span>
          </h2>

          <p className="text-lg text-white/45 max-w-xl mx-auto mb-10 leading-relaxed">
            Drop a video or audio file. Get a clean, accurate transcript before you finish your coffee.
            <span className="block mt-1 text-white/30">No editor to learn. No setup. Just results.</span>
          </p>

          {/* Primary CTA */}
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="inline-block mb-component"
          >
            <Link
              to="/video-to-transcript"
              className="group inline-flex items-center gap-2.5 bg-blue-600 text-white px-10 py-4 rounded-xl font-extrabold text-base shadow-accent hover:bg-blue-700 hover:shadow-accent-hover transition-all"
            >
              Start Free — No Card Needed
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          <p className="text-sm text-white/45 max-w-lg mx-auto mb-component">
            <Link
              to="/guideline-format"
              className="font-semibold text-blue-300 hover:text-blue-200 underline-offset-4 hover:underline"
            >
              Format your transcript to a client style guide →
            </Link>
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-white/35">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              Files deleted immediately
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              No credit card required
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              3 free imports
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              70+ languages
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
