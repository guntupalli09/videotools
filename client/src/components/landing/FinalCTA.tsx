import { Link } from 'react-router-dom';
import { ChevronRight, Shield, CheckCircle2, Globe } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gray-950 py-section-lg">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/[0.1] blur-[150px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="mb-component inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.07] px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
          <span className="text-sm font-medium text-white/60">
            Whisper AI · 98.5% accurate · Zero data retention
          </span>
        </div>

        <h2 className="mb-6 font-display text-5xl font-medium leading-[1.05] text-white sm:text-6xl md:text-7xl">
          Start transcribing
          <span className="block brand-moment">client-ready.</span>
        </h2>

        <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/45">
          Drop a video or audio file. Get a clean, accurate transcript before you finish your coffee.
          <span className="mt-1 block text-white/30">No editor to learn. No setup. Just results.</span>
        </p>

        <Link
          to="/video-to-transcript"
          className="group mb-component inline-flex items-center gap-2.5 rounded-xl bg-blue-600 px-10 py-4 text-base font-extrabold text-white shadow-accent transition hover:bg-blue-700 hover:shadow-accent-hover"
        >
          Start Free — No Card Needed
          <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <p className="mx-auto mb-component max-w-lg text-sm text-white/45">
          <Link
            to="/guideline-format"
            className="font-semibold text-blue-300 underline-offset-4 hover:text-blue-200 hover:underline"
          >
            Format your transcript to a client style guide →
          </Link>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-white/35">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            Files deleted immediately
          </div>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
            No credit card required
          </div>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            70+ languages
          </div>
        </div>
      </div>
    </section>
  );
}
