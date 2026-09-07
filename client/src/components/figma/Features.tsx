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

const PRIMARY_TOOLS = [
  {
    id: "guideline-format",
    icon: ClipboardCheck,
    name: "Apply Formatting Guidelines",
    description:
      "Validate transcripts against Rev, GoTranscript, and custom client rules — what failed, why, and the fix.",
    href: "/guideline-format",
  },
  {
    id: "video-to-transcript",
    icon: FileText,
    name: "Video → Transcript",
    description:
      "Clean, timestamped transcripts with speaker labels. Export TXT, PDF, DOCX, or JSON.",
    href: "/video-to-transcript",
  },
  {
    id: "translate-subtitles",
    icon: Languages,
    name: "Translate",
    description:
      "Subtitles, DOCX, TXT, and JSON into 70+ languages with formatting preserved.",
    href: "/translate-subtitles",
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

function ToolCard({
  tool,
  featured = false,
}: {
  tool: (typeof PRIMARY_TOOLS)[0] | (typeof SECONDARY_TOOLS)[0];
  featured?: boolean;
}) {
  const Icon = tool.icon;
  return (
    <Link
      to={tool.href}
      onClick={() => trackEvent("tool_selected", { tool: tool.name, path: tool.href })}
      className="group block h-full"
    >
      <div
        className={`h-full rounded-xl border border-gray-200 bg-white transition-colors hover:border-blue-300 dark:border-white/[0.07] dark:bg-gray-900 dark:hover:border-blue-500/30 ${
          featured ? "p-6 md:p-7" : "p-4"
        }`}
      >
        <div
          className={`mb-3 flex items-center justify-center rounded-lg bg-blue-600/15 text-blue-600 dark:text-blue-400 ${
            featured ? "h-10 w-10" : "h-8 w-8"
          }`}
        >
          <Icon className={featured ? "h-5 w-5" : "h-4 w-4"} />
        </div>
        <h3
          className={`mb-1.5 font-medium text-gray-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300 ${
            featured ? "text-lg" : "text-sm"
          }`}
        >
          {tool.name}
        </h3>
        <p
          className={`leading-relaxed text-gray-500 dark:text-white/40 ${
            featured ? "mb-4 text-sm" : "mb-3 text-sm"
          }`}
        >
          {tool.description}
        </p>
        <div className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-white/45">
          Open tool <ChevronRight className="h-3 w-3" />
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

        <div className="mb-component grid grid-cols-1 gap-4 md:grid-cols-3">
          {PRIMARY_TOOLS.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} featured={index === 0} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECONDARY_TOOLS.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/video-to-transcript"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700"
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
