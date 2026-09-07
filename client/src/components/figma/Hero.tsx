import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, CheckCircle2, Star } from "lucide-react";
import TrustBadge from "../TrustBadge";
import { api } from "../../lib/api";
import {
  formatPublicRatingCount,
  formatPublicRatingValue,
  parsePublicRating,
  readBootstrappedPublicRating,
  type PublicRating,
} from "../../lib/publicRating";

function usePublicRating(): PublicRating | null {
  const [rating, setRating] = useState<PublicRating | null>(readBootstrappedPublicRating);

  useEffect(() => {
    let cancelled = false;
    api("/api/stats/public/rating")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        const parsed = parsePublicRating(data);
        if (!cancelled && parsed) setRating(parsed);
      })
      .catch(() => {/* degrade silently — keep bootstrap or hide */});
    return () => {
      cancelled = true;
    };
  }, []);

  return rating;
}

/** Three trust signals that cover all 8 tools + commercial conversion */
const TRUST_CHIPS = [
  {
    icon: Shield,
    title: "Files deleted after processing",
    detail: "Zero retention on uploads",
  },
  {
    icon: CheckCircle2,
    title: "Transcript · subtitles · format · translate",
    detail: "8 pro tools, one workflow",
  },
  {
    icon: Star,
    title: "98.5% accuracy",
    detail: "Whisper AI · client-ready output",
  },
] as const;

function HeroActions() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full max-w-3xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link
          to="/video-to-transcript"
          className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-accent transition hover:bg-blue-700 hover:shadow-accent-hover"
        >
          Get client-ready transcript
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          to="/video-to-subtitles"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.07] px-6 py-3 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/[0.12]"
        >
          Create clean subtitles
        </Link>
        <Link
          to="/guideline-format"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-white/75 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
        >
          Format for client delivery
        </Link>
      </div>
    </div>
  );
}

function HeroTrustChips({ publicRating }: { publicRating: PublicRating | null }) {
  const chips = TRUST_CHIPS.map((chip, i) => {
    if (i === 2 && publicRating) {
      return {
        ...chip,
        title: `${formatPublicRatingValue(publicRating)} / 5 rated`,
        detail: formatPublicRatingCount(publicRating),
      };
    }
    return chip;
  });

  return (
    <ul className="mt-6 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
      {chips.map(({ icon: Icon, title, detail }) => (
        <li
          key={title}
          className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3"
        >
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-white">{title}</p>
            <p className="mt-0.5 text-xs leading-snug text-white/40">{detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Hero() {
  const publicRating = usePublicRating();

  return (
    <section className="relative flex flex-col items-center overflow-hidden bg-gray-950">
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/[0.08] rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-3 sm:pt-4 pb-8">
        <TrustBadge className="mb-4" />

        <h1
          className="mx-auto mb-3 max-w-4xl text-center font-display font-medium tracking-tight leading-[1.08]"
          style={{ fontSize: "clamp(2rem, 4.6vw, 3.75rem)" }}
        >
          <span className="text-white">Faster transcripts. Cleaner output. </span>
          <span className="brand-moment">Client-ready.</span>
        </h1>

        <p className="mx-auto mb-6 max-w-2xl text-center text-base leading-relaxed text-white/60 sm:text-lg">
          Upload a video or audio file. Get formatted transcripts and SRT/VTT your client can approve on the first pass — style-guide rules applied automatically, so you spend less time on QA.
        </p>

        <HeroActions />
        <HeroTrustChips publicRating={publicRating} />

        <p className="mt-4 text-center text-xs font-medium text-white/35">
          3 free imports · No card required
        </p>
      </div>
    </section>
  );
}
