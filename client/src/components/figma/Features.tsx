import { Link } from "react-router-dom";
import {
  FileText,
  MessageSquare,
  Languages,
  Wrench,
  Flame,
  Package,
  FolderSync,
  ChevronRight,
  Mic,
  ArrowRight,
  ClipboardCheck,
} from "lucide-react";
import { trackEvent } from "../../lib/analytics";

const SPOTLIGHT_TOOLS = [
  {
    id: "guideline-format",
    badge: "Core workflow",
    icon: ClipboardCheck,
    name: "Apply Formatting Guidelines",
    tagline: "Stop spending 45 minutes on cleanup you could automate.",
    description:
      "Validate transcripts against Rev, GoTranscript, and custom client rules — what failed, why, and the exact fix.",
    bullets: [
      "Reduce cleanup from 45 min to 8 min per transcript",
      "Apply client formatting rules automatically",
      "Export QA-ready on first pass",
    ],
    href: "/guideline-format",
    cta: "Format transcript →",
  },
  {
    id: "video-to-transcript",
    badge: "Most popular",
    icon: FileText,
    name: "Video → Transcript",
    tagline: "From video to words at machine speed.",
    description:
      "Clean, timestamped transcripts with speaker labels. Export TXT, PDF, DOCX, or JSON.",
    bullets: [
      "Speaker detection & chapters",
      "99 languages · translate to 70+",
      "Share read-only transcript links (Pro)",
    ],
    href: "/video-to-transcript",
    cta: "Upload a video, get transcript",
  },
  {
    id: "translate-subtitles",
    badge: "70+ languages",
    icon: Languages,
    name: "Translate",
    tagline: "Translate subtitles and docs — keep formatting.",
    description:
      "Subtitles, DOCX, TXT, and JSON into 70+ languages with formatting preserved.",
    bullets: [
      "SRT, VTT, and document formats",
      "Formatting preserved",
      "Fast turnaround",
    ],
    href: "/translate-subtitles",
    cta: "Translate your file",
  },
];

const SECONDARY_TOOLS = [
  {
    icon: Mic,
    name: "Voice → Text",
    description: "Record in your browser — transcript in seconds.",
    href: "/voice-recorder",
  },
  {
    icon: MessageSquare,
    name: "Video → Subtitles",
    description: "Generate SRT and VTT files, timed and upload-ready.",
    href: "/video-to-subtitles",
  },
  {
    icon: FolderSync,
    name: "Batch Processing",
    description: "Process 50+ videos in parallel, download as ZIP.",
    href: "/batch-process",
  },
  {
    icon: Wrench,
    name: "Fix Subtitles",
    description: "Fix timing drift, overlaps, and formatting in SRT/VTT.",
    href: "/fix-subtitles",
  },
  {
    icon: Flame,
    name: "Burn Subtitles",
    description: "Hardcode captions into your video file.",
    href: "/burn-subtitles",
  },
  {
    icon: Package,
    name: "Compress Video",
    description: "Reduce file size up to 80% with quality presets.",
    href: "/compress-video",
  },
];

function SpotlightCard({
  tool,
  featured = false,
}: {
  tool: (typeof SPOTLIGHT_TOOLS)[0];
  featured?: boolean;
}) {
  const Icon = tool.icon;
  return (
    <Link
      to={tool.href}
      onClick={() => trackEvent("tool_selected", { tool: tool.name, path: tool.href })}
      className="block h-full group"
    >
      <div
        className={`h-full rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-blue-300 dark:border-white/[0.07] dark:bg-gray-900 dark:hover:border-blue-500/30 ${
          featured ? "md:p-7" : ""
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400">
            <Icon className="h-4 w-4" />
          </div>
          <span className="rounded-full border border-blue-500/20 bg-blue-600/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
            {tool.badge}
          </span>
        </div>
        <h3 className="mb-1 text-base font-medium text-gray-900 dark:text-white">{tool.name}</h3>
        <p className="mb-2 text-sm font-medium text-blue-700 dark:text-blue-300">{tool.tagline}</p>
        <p className="mb-4 text-sm leading-relaxed text-gray-500 dark:text-white/45">{tool.description}</p>
        <ul className="mb-5 space-y-2">
          {tool.bullets.map((b) => (
            <li key={b} className="flex gap-2 text-sm text-gray-600 dark:text-white/55">
              <span className="text-blue-500 dark:text-blue-400" aria-hidden>
                ·
              </span>
              {b}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1 text-sm font-medium text-gray-500 group-hover:text-blue-700 dark:text-white/45 dark:group-hover:text-blue-300">
          {tool.cta}
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function SecondaryCard({ tool }: { tool: (typeof SECONDARY_TOOLS)[0] }) {
  const Icon = tool.icon;
  return (
    <Link
      to={tool.href}
      onClick={() => trackEvent("tool_selected", { tool: tool.name, path: tool.href })}
      className="group block h-full"
    >
      <div className="h-full rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300 dark:border-white/[0.07] dark:bg-gray-900 dark:hover:border-blue-500/25">
        <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="mb-1.5 text-sm font-medium text-gray-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
          {tool.name}
        </h3>
        <p className="mb-3 text-sm leading-relaxed text-gray-500 dark:text-white/40">{tool.description}</p>
        <div className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-white/45">
          Try now <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

export function Features() {
  return (
    <section id="tools" className="bg-white py-section dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-8 text-center">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Professional transcript workflow
          </p>
          <h2 className="mb-4 font-display text-4xl font-medium leading-tight text-gray-900 dark:text-white md:text-5xl">
            Stop doing the same cleanup twice.
          </h2>
          <p className="mx-auto max-w-xl text-lg text-gray-500 dark:text-white/40">
            Transcribe, validate against client rules, and deliver without revisions — across all eight tools.
          </p>
        </div>

        <div className="mb-6">
          <SpotlightCard tool={SPOTLIGHT_TOOLS[0]} featured />
        </div>

        <div className="mb-component grid grid-cols-1 gap-4 md:grid-cols-2">
          {SPOTLIGHT_TOOLS.slice(1).map((tool) => (
            <SpotlightCard key={tool.id} tool={tool} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECONDARY_TOOLS.map((tool) => (
            <SecondaryCard key={tool.name} tool={tool} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/video-to-transcript"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-accent transition hover:bg-blue-700"
          >
            Start transcribing free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="mt-3 text-xs text-gray-400 dark:text-white/25">
            No credit card · Files deleted immediately · 3 free imports
          </p>
        </div>
      </div>
    </section>
  );
}
