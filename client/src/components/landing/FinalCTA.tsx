import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Lock, Zap, CreditCard } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="relative py-28 overflow-hidden bg-gray-950 transition-colors duration-500">
      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-gray-950 to-indigo-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 z-[1] opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.07] border border-white/[0.12] mb-8">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[12px] text-white/70 font-medium">AI-powered · Whisper accurate · No setup</span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] mb-6">
            Start transcribing
            <span className="block bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              right now.
            </span>
          </h2>

          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            Drop a video, paste a YouTube link, or upload an audio file. Your transcript is ready before you finish your coffee.
          </p>

          {/* CTA button */}
          <motion.div
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            className="inline-block mb-8"
          >
            <Link
              to="/video-to-transcript"
              className="group inline-flex items-center gap-2.5 bg-white text-gray-900 px-10 py-4 rounded-xl font-bold text-[16px] shadow-2xl shadow-white/10 hover:shadow-white/20 transition-all"
            >
              Transcribe My Video Now
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[13px] text-white/35">
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              No credit card required
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Try free — no signup needed to start
            </div>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Files deleted after processing
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
