import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import TrustBadge from "../TrustBadge";
import { api } from "../../lib/api";
import {
  formatPublicRatingCount,
  formatPublicRatingValue,
  parsePublicRating,
  readBootstrappedPublicRating,
  type PublicRating,
} from "../../lib/publicRating";

const CREATOR_AVATARS = [
  "https://i.pravatar.cc/80?img=12",
  "https://i.pravatar.cc/80?img=32",
  "https://i.pravatar.cc/80?img=47",
  "https://i.pravatar.cc/80?img=25",
  "https://i.pravatar.cc/80?img=56",
];

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
      <p className="mt-3 text-center text-xs font-medium text-white/45">
        No signup required <span aria-hidden>·</span> QA-ready in minutes
      </p>
    </div>
  );
}

export function Hero() {
  const publicRating = usePublicRating();

  return (
    <section className="relative flex flex-col items-center overflow-hidden bg-gray-950">
      {/* Restrained indigo ambient glow */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-blue-600/[0.08] rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-3 sm:pt-4 pb-8">
        {/* Trust badge — live stats pill */}
        <TrustBadge className="mb-4" />

        {/* H1 */}
        <h1
          className="mx-auto mb-3 max-w-4xl text-center font-display font-medium tracking-tight leading-[1.08]"
          style={{ fontSize: "clamp(2rem, 4.6vw, 3.75rem)" }}
        >
          <span className="text-white">Faster transcripts. Cleaner output. </span>
          <span className="brand-moment">Client-ready.</span>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mb-6 max-w-2xl text-center text-base leading-relaxed text-white/60 sm:text-lg">
          Upload a video or audio file. Get formatted transcripts and SRT/VTT your client can approve on the first pass — style-guide rules applied automatically, so you spend less time on QA. Files deleted after processing. Start free — 3 imports/mo.
        </p>

        <HeroActions />

        {/* Unified proof + trust block */}
        <div className="mt-6 w-full max-w-xl mx-auto flex flex-col items-center gap-4">
          {/* Operational proof grid */}
          <div className="w-full grid grid-cols-3 gap-x-6 gap-y-2.5">
            {(
              [
                { stat: "45 min → 8 min", label: "transcript cleanup" },
                { stat: "Auto-applied", label: "client formatting rules" },
                { stat: "QA-ready", label: "on first pass" },
                { stat: "Rev · GoTranscript", label: "style guide support" },
                { stat: "No repeated", label: "QA corrections" },
                { stat: "Files deleted", label: "after processing" },
              ] as const
            ).map(({ stat, label }) => (
              <div key={stat} className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-white leading-tight">
                  {stat}
                </span>
                <span className="text-xs text-white/35 leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/[0.07]" />

          {/* Social proof + friction line */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-white/35">
              {/* Stars */}
              <span
                className="flex items-center gap-1.5"
                aria-label={
                  publicRating
                    ? `Rated ${formatPublicRatingValue(publicRating)} out of 5 from ${formatPublicRatingCount(publicRating)}`
                    : undefined
                }
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="w-3.5 h-3.5 text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span
                  className="ml-0.5 font-semibold text-white/80 tabular-nums min-w-[2.5em] inline-block"
                  aria-hidden={publicRating == null}
                >
                  {publicRating != null ? formatPublicRatingValue(publicRating) : ""}
                </span>
                {publicRating != null ? (
                  <span className="font-medium text-white/55 tabular-nums">
                    {formatPublicRatingCount(publicRating)}
                  </span>
                ) : null}
              </span>
              <span className="w-px h-3 bg-white/10" />
              {/* Avatars + ICP claim */}
              <span className="flex items-center gap-2">
                <span className="flex items-center -space-x-2">
                  {CREATOR_AVATARS.map((src, i) => (
                    <ImageWithFallback
                      key={i}
                      src={src}
                      alt=""
                      width={22}
                      height={22}
                      className="w-[22px] h-[22px] rounded-full border-2 border-gray-950 object-cover"
                    />
                  ))}
                  <span className="w-[22px] h-[22px] rounded-full border-2 border-gray-950 bg-blue-600/25 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-300">
                      12K+
                    </span>
                  </span>
                </span>
                <span>
                  Built alongside{" "}
                  <span className="text-white/55 font-semibold">
                    professional transcriptionists &amp; QA reviewers
                  </span>
                </span>
              </span>
            </div>
            <p className="text-xs text-white/20">
              3 free imports · No card required
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
