import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  BookOpen,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { ToolLayout } from "../components/figma/ToolLayout";
import CoreToolSeoDepth from "../components/CoreToolSeoDepth";
import { api } from "../lib/api";
import {
  detectFormat,
  parseSrt,
  parseVtt,
  cuesToSrt,
  cuesToVtt,
} from "../lib/subtitleUtils";
import JobAuthGateModal from "../components/JobAuthGateModal";
import ResultUpgradeCard from "../components/ResultUpgradeCard";
import ResultHeader from "../components/ResultHeader";
import { ProcessingStateShell } from "../components/figma/ProcessingStateShell";
import { ProcessingProgress } from "../components/figma/ProcessingProgress";
import { isLoggedIn } from "../lib/auth";
import { isPaidPlan as hasPaidPlan } from "../lib/plans";
import {
  drawPdfFreePlanWatermark,
  WATERMARK_DOC_FOOTER,
  WATERMARK_DOC_HEADER,
  WATERMARK_LINE1,
  WATERMARK_LINE2,
  watermarkTextExport,
  type WatermarkTextFormat,
} from "../lib/watermark";
import {
  PRESET_DATA,
  type GuidelinePresetKey,
} from "./guidelineFormatPresetData";

type EditableRule = {
  id: string;
  category: string;
  label: string;
  defaultValue: string;
  currentValue: string;
  isEdited: boolean;
  extractionConfidence?: "high" | "medium" | "needs_review";
  extractionReason?: string;
  sourceQuote?: string;
};

const CATEGORY_ORDER = [
  "Verbatim & Fillers",
  "Speaker Labels",
  "False Starts & Stutters",
  "Contractions & Slang",
  "Tags & Notation",
  "Spelling & Numbers",
  "Profanity & Special Cases",
] as const;

type SelectValue = "" | GuidelinePresetKey | "custom";

type ParsedRule = {
  id: string;
  category: string;
  label: string;
  currentValue: string;
};

type DiffSegment = { type: "unchanged" | "added" | "removed"; text: string };

type FlaggedSegment = {
  originalText: string;
  suggestedText: string;
  ruleApplied: string;
  confidence: string;
  reason: string;
};

type ResultMode = "summary" | "review" | "full";

type JobStatusResponse = {
  status: string;
  stage?: string | null;
  outputText: string | null;
  diffData: DiffSegment[] | null;
  flaggedSegments: FlaggedSegment[] | null;
  appliedRules: string[] | null;
  validationReport?: {
    summary?: {
      verified?: { passed: number; total: number };
      likelyCompliant?: { passed: number; total: number };
      needsReview?: { passed: number; total: number };
      confidencePct?: number;
      qaReductionPct?: number;
      qaReductionBasis?: {
        inputTokens: number;
        outputTokens: number;
        fillerTokenReduction: number;
        repetitionRateDelta: number;
        verifiedChecksPassed: number;
        verifiedChecksTotal: number;
        flaggedCount: number;
      };
    };
    checks?: Array<{
      id: string;
      label: string;
      bucket: "verified" | "likely_compliant" | "needs_review";
      passed: boolean;
      details?: string;
      metrics?: Record<string, number>;
      segmentIndex?: number;
      snippet?: string;
    }>;
  } | null;
  createdAt: string;
};

function rulesFromPreset(
  preset: (typeof PRESET_DATA)[GuidelinePresetKey],
): EditableRule[] {
  return preset.rules.map((r) => ({
    id: r.id,
    category: r.category,
    label: r.label,
    defaultValue: r.defaultValue,
    currentValue: r.defaultValue,
    isEdited: false,
  }));
}

function AutoGrowTextarea({
  value,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(48, el.scrollHeight)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{ resize: "none", overflow: "hidden" }}
    />
  );
}

/** Fetch / AbortController / timeouts — suppress user-facing noise and avoid treating cancels as hard failures */
function isAbortLikeError(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  if (e instanceof Error && e.name === "AbortError") return true;
  const msg = e instanceof Error ? e.message : String(e);
  return /aborted|abort/i.test(msg);
}

const GUIDELINE_POLL_INITIAL_MS = 2000;
const GUIDELINE_POLL_MAX_BACKOFF_MS = 10_000;
const GUIDELINE_POLL_VISIBILITY_MS = 5000;
const GUIDELINE_POLL_OVERLAP_GUARD_MS = 1500;
/** Hard stop if job never reaches terminal (stale 200s, worker stuck, etc.) */
const GUIDELINE_POLL_MAX_DURATION_MS = 15 * 60 * 1000;

/** Never downgrade terminal UI from a late / reordered poll response */
function mergeGuidelinePollStatus(
  prev: JobStatusResponse | null,
  incoming: JobStatusResponse,
): JobStatusResponse {
  if (
    prev &&
    (prev.status === "completed" || prev.status === "failed") &&
    (incoming.status === "queued" || incoming.status === "processing")
  ) {
    return prev;
  }
  return incoming;
}

function applyReviewEditsToOutputText(
  outputText: string,
  flagged: FlaggedSegment[],
  edits: Record<number, string>,
): { text: string; warnings: string[] } {
  let text = outputText;
  const warnings: string[] = [];
  for (const [k, v] of Object.entries(edits)) {
    const i = Number(k);
    if (!Number.isFinite(i) || i < 0) continue;
    const seg = flagged[i];
    if (!seg) continue;
    const next = String(v ?? "");
    if (!next.trim()) continue;
    const needle = seg.suggestedText || "";
    if (!needle.trim()) continue;
    const idx = text.indexOf(needle);
    if (idx === -1) {
      warnings.push(
        `Could not apply edit for issue ${i + 1} (text not found in formatted output).`,
      );
      continue;
    }
    text = text.slice(0, idx) + next + text.slice(idx + needle.length);
  }
  return { text, warnings };
}

export default function GuidelineFormat() {
  const [transcript, setTranscript] = useState("");
  const [prefillBanner, setPrefillBanner] = useState(false);
  const [selectValue, setSelectValue] = useState<SelectValue>("");
  const [selectedPreset, setSelectedPreset] = useState<
    GuidelinePresetKey | "custom" | null
  >(null);
  const [rules, setRules] = useState<EditableRule[]>([]);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customGuideLoading, setCustomGuideLoading] = useState(false);
  const [customGuideError, setCustomGuideError] = useState<string | null>(null);
  const [customGuideConflicts, setCustomGuideConflicts] = useState<
    Array<{
      ruleIdA: string;
      ruleIdB: string;
      summary: string;
      confidence: "high" | "medium";
    }>
  >([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobToken, setJobToken] = useState<string | null>(null);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"signup-combo" | "login">(
    "signup-combo",
  );
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Transcript snapshot for the active job — used so "Original" stays stable while user edits textarea. */
  const [originalTranscriptForJob, setOriginalTranscriptForJob] = useState("");
  const [inputCaptionFormat, setInputCaptionFormat] = useState<
    "srt" | "vtt" | null
  >(null);
  const [originalCaptionCues, setOriginalCaptionCues] = useState<ReturnType<
    typeof parseSrt
  > | null>(null);
  const [focusSegment, setFocusSegment] = useState<number | null>(null);
  const [resultMode, setResultMode] = useState<ResultMode>("summary");
  const [categoryOpen, setCategoryOpen] = useState<Record<string, boolean>>({});
  const [reviewIssueCursor, setReviewIssueCursor] = useState(0);
  const [reviewEdits, setReviewEdits] = useState<Record<number, string>>({});
  const [reviewWarnings, setReviewWarnings] = useState<string[]>([]);
  const [fullTranscriptMode, setFullTranscriptMode] = useState<"all" | "focus">(
    "all",
  );
  const [focusContextExpanded, setFocusContextExpanded] = useState<
    Record<number, boolean>
  >({});
  const originalScrollRef = useRef<HTMLDivElement>(null);
  const formattedScrollRef = useRef<HTMLDivElement>(null);
  const syncScrollLockRef = useRef<"original" | "formatted" | null>(null);
  const transcriptFileInputRef = useRef<HTMLInputElement>(null);
  const transcriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const customGuideRef = useRef<HTMLInputElement>(null);
  /** Set when transcript text came from a file upload (for banner + clarity) */
  const [transcriptLoadedFromFile, setTranscriptLoadedFromFile] = useState<
    string | null
  >(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("vt_prefill_transcript");
    if (raw != null && raw !== "") {
      setTranscript(raw);
      setTranscriptLoadedFromFile(null);
      sessionStorage.removeItem("vt_prefill_transcript");
      setPrefillBanner(true);
    }
  }, []);

  useEffect(() => {
    if (!transcript.trim()) setTranscriptLoadedFromFile(null);
  }, [transcript]);

  const wordCount = useMemo(() => {
    const t = transcript.trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }, [transcript]);

  const hasGuidelineSelected =
    selectedPreset != null &&
    (selectedPreset !== "custom"
      ? true
      : customFile !== null &&
        rules.length > 0 &&
        !customGuideLoading &&
        !customGuideError);

  const canSubmit =
    transcript.trim().length > 0 && hasGuidelineSelected && !isSubmitting;

  const anyRuleEdited = rules.some((r) => r.isEdited);

  const resetJobUi = () => {
    setJobId(null);
    setJobToken(null);
    setShowAuthGate(false);
    setShowAuthModal(false);
    setJobStatus(null);
    setSubmitError(null);
    setIsSubmitting(false);
    setOriginalTranscriptForJob("");
    setInputCaptionFormat(null);
    setOriginalCaptionCues(null);
    setFocusSegment(null);
    setCustomGuideError(null);
    setCustomGuideConflicts([]);
    setResultMode("summary");
    setReviewIssueCursor(0);
    setReviewEdits({});
    setReviewWarnings([]);
    setFullTranscriptMode("all");
    setFocusContextExpanded({});
  };

  const buildRulesPayload = (): ParsedRule[] => {
    if (selectedPreset === "custom") {
      return rules.map((r) => ({
        id: r.id,
        category: r.category,
        label: r.label,
        currentValue: r.currentValue,
      }));
    }
    if (selectedPreset) {
      return rules.map((r) => ({
        id: r.id,
        category: r.category,
        label: r.label,
        currentValue: r.currentValue,
      }));
    }
    return [];
  };

  useEffect(() => {
    if (!jobId) return;
    /** False after cleanup — rejects ghost setState / schedules from an old effect.run */
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    /** Monotonic guard: stale async completion after StrictMode remount + new poll session */
    let pollSession = 0;
    const pollSessionAtStart = ++pollSession;
    const pollingStartedAt = Date.now();
    let pollDelayMs = GUIDELINE_POLL_INITIAL_MS;

    const scheduleNext = (ms: number) => {
      if (!active) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void poll(), ms);
    };

    const poll = async () => {
      if (!active) return;
      if (pollSessionAtStart !== pollSession) return;
      if (Date.now() - pollingStartedAt > GUIDELINE_POLL_MAX_DURATION_MS) {
        if (!active) return;
        setSubmitError(
          "Formatting took too long — please try again or check status later.",
        );
        setIsSubmitting(false);
        return;
      }
      if (document.visibilityState === "hidden") {
        scheduleNext(GUIDELINE_POLL_VISIBILITY_MS);
        return;
      }
      if (inFlight) {
        scheduleNext(GUIDELINE_POLL_OVERLAP_GUARD_MS);
        return;
      }
      /** When false: job finished, hard HTTP error, or non-abort failure — stop polling */
      let scheduleMore = true;
      inFlight = true;
      try {
        // Do not pass signal + timeout together: api() skips its timeout branch when signal is set.
        const tokenQuery = jobToken
          ? `?jobToken=${encodeURIComponent(jobToken)}`
          : "";
        const res = await api(`/api/guidelines/jobs/${jobId}${tokenQuery}`, {
          timeout: 15000,
        });
        const data = (await res.json()) as JobStatusResponse & {
          error?: string;
        };
        if (!active || pollSessionAtStart !== pollSession) return;
        if (!res.ok) {
          scheduleMore = false;
          setSubmitError(data.error || "Failed to fetch job status");
          setIsSubmitting(false);
          return;
        }
        pollDelayMs = GUIDELINE_POLL_INITIAL_MS;
        setJobStatus((prev) => mergeGuidelinePollStatus(prev, data));
        if (data.status === "completed" || data.status === "failed") {
          scheduleMore = false;
          setIsSubmitting(false);
          return;
        }
      } catch (e) {
        if (!active || pollSessionAtStart !== pollSession) return;
        if (isAbortLikeError(e)) {
          pollDelayMs = Math.min(
            pollDelayMs * 2,
            GUIDELINE_POLL_MAX_BACKOFF_MS,
          );
        } else {
          scheduleMore = false;
          setSubmitError(e instanceof Error ? e.message : "Network error");
          setIsSubmitting(false);
        }
      } finally {
        inFlight = false;
        if (active && pollSessionAtStart === pollSession && scheduleMore)
          scheduleNext(pollDelayMs);
      }
    };

    const onVis = () => {
      if (document.visibilityState === "visible") scheduleNext(100);
    };
    document.addEventListener("visibilitychange", onVis);

    void poll();
    return () => {
      active = false;
      pollSession += 1;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [jobId, jobToken]);

  const submitFormat = async () => {
    if (!canSubmit || !selectedPreset) return;
    const rulesPayload = buildRulesPayload();
    if (!rulesPayload.length) {
      toast.error("Select rules or a style guide file");
      return;
    }
    const trimmedTranscript = transcript.trim();
    const detected = detectFormat(trimmedTranscript);
    const captionMode =
      detected === "srt" || detected === "vtt" ? detected : null;
    let cuesPayload: any = null;
    if (captionMode) {
      const cues =
        captionMode === "vtt"
          ? parseVtt(trimmedTranscript)
          : parseSrt(trimmedTranscript);
      if (!cues.length) {
        toast.error(
          "Could not parse your captions. Please paste a valid SRT or VTT file.",
        );
        return;
      }
      setInputCaptionFormat(captionMode);
      setOriginalCaptionCues(cues);
      cuesPayload = cues.map((c) => ({
        index: c.index,
        startTime: c.startTime,
        endTime: c.endTime,
        text: c.text,
      }));
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setJobStatus(null);
    setJobId(null);
    setJobToken(null);
    setShowAuthGate(false);
    setShowAuthModal(false);
    setOriginalTranscriptForJob(trimmedTranscript);
    try {
      const res = await api("/api/guidelines/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptText: trimmedTranscript,
          rules: rulesPayload,
          presetId: selectedPreset,
          ...(captionMode
            ? { inputFormat: captionMode, cues: cuesPayload }
            : {}),
        }),
        timeout: 60000,
      });
      const data = (await res.json()) as {
        jobId?: string;
        jobToken?: string;
        error?: string;
      };
      if (!res.ok) {
        setSubmitError(data.error || "Failed to start formatting");
        setIsSubmitting(false);
        return;
      }
      if (!data.jobId) {
        setSubmitError("Invalid response from server");
        setIsSubmitting(false);
        return;
      }
      setJobToken(data.jobToken || null);
      setJobId(data.jobId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Network error");
      setIsSubmitting(false);
    }
  };

  const getExportText = (): { text: string; warnings: string[] } => {
    const base = jobStatus?.outputText || "";
    if (!base) return { text: "", warnings: [] };
    return applyReviewEditsToOutputText(base, flaggedList, reviewEdits);
  };

  const plan =
    (typeof window !== "undefined"
      ? localStorage.getItem("plan")
      : null) || "free";
  const isPaidPlan = hasPaidPlan(plan);

  const watermarkExport = (content: string, format: WatermarkTextFormat) =>
    isPaidPlan ? content : watermarkTextExport(content, format);

  const exportDownloadToast = () => {
    toast.success(
      isPaidPlan ? "Download started" : "Download started (with watermark)",
    );
  };

  const downloadFormattedTxt = () => {
    const { text, warnings } = getExportText();
    if (!text) return;
    if (warnings.length) {
      setReviewWarnings(warnings);
      toast(
        "Some review edits could not be applied. Exporting best-effort output.",
      );
    }
    const payload = watermarkExport(text, "txt");
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted_transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
    exportDownloadToast();
  };

  const downloadFormattedSrt = () => {
    if (inputCaptionFormat !== "srt" && inputCaptionFormat !== "vtt") return;
    const original = originalCaptionCues;
    const { text: formattedText, warnings } = getExportText();
    if (!original || !formattedText) return;
    if (warnings.length) {
      setReviewWarnings(warnings);
      toast(
        "Some review edits could not be applied. Exporting best-effort output.",
      );
    }
    const formattedCues =
      inputCaptionFormat === "vtt"
        ? parseVtt(formattedText)
        : parseSrt(formattedText);
    if (!formattedCues.length) {
      toast.error(
        "SRT export failed (formatted captions could not be parsed).",
      );
      return;
    }
    const content = watermarkExport(cuesToSrt(formattedCues), "srt");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "formatted_transcript.srt";
    a.click();
    URL.revokeObjectURL(a.href);
    exportDownloadToast();
  };

  const downloadFormattedVtt = () => {
    if (inputCaptionFormat !== "srt" && inputCaptionFormat !== "vtt") return;
    const { text: formattedText, warnings } = getExportText();
    if (!formattedText) return;
    if (warnings.length) {
      setReviewWarnings(warnings);
      toast(
        "Some review edits could not be applied. Exporting best-effort output.",
      );
    }
    const formattedCues =
      inputCaptionFormat === "vtt"
        ? parseVtt(formattedText)
        : parseSrt(formattedText);
    if (!formattedCues.length) {
      toast.error(
        "VTT export failed (formatted captions could not be parsed).",
      );
      return;
    }
    const content = watermarkExport(cuesToVtt(formattedCues), "vtt");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "formatted_transcript.vtt";
    a.click();
    URL.revokeObjectURL(a.href);
    exportDownloadToast();
  };

  const downloadFormattedJson = () => {
    if (!jobStatus) return;
    const { text, warnings } = getExportText();
    const payload = {
      ...jobStatus,
      jobId,
      originalText: originalTranscriptForJob,
      outputText: text || jobStatus.outputText,
      reviewWarnings: warnings.length ? warnings : undefined,
    };
    const json = watermarkExport(JSON.stringify(payload, null, 2), "json");
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "formatted_transcript.json";
    a.click();
    URL.revokeObjectURL(a.href);
    exportDownloadToast();
  };

  const downloadFlaggedCsv = () => {
    const list = Array.isArray(jobStatus?.flaggedSegments)
      ? jobStatus!.flaggedSegments!
      : [];
    const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = [
      "confidence",
      "ruleApplied",
      "reason",
      "originalText",
      "suggestedText",
    ];
    const rows = list.map((x) =>
      [x.confidence, x.ruleApplied, x.reason, x.originalText, x.suggestedText]
        .map(escape)
        .join(","),
    );
    const csv = watermarkExport([header.join(","), ...rows].join("\n"), "csv");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "flagged_segments.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    exportDownloadToast();
  };

  const downloadFormattedRtf = () => {
    const { text, warnings } = getExportText();
    if (!text) return;
    if (warnings.length) {
      setReviewWarnings(warnings);
      toast(
        "Some review edits could not be applied. Exporting best-effort output.",
      );
    }
    const wmPrefix = isPaidPlan
      ? ""
      : `${WATERMARK_LINE1.replace(/\\/g, "\\\\")}\\par ${WATERMARK_LINE2.replace(/\\/g, "\\\\")}\\par\\par `;
    const rtfEscaped = (wmPrefix + text)
      .replace(/\\/g, "\\\\")
      .replace(/{/g, "\\{")
      .replace(/}/g, "\\}")
      .replace(/\r?\n/g, "\\par\n");
    const rtf = `{\\rtf1\\ansi\\deff0\n${rtfEscaped}\n}`;
    const blob = new Blob([rtf], { type: "application/rtf;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "formatted_transcript.rtf";
    a.click();
    URL.revokeObjectURL(a.href);
    exportDownloadToast();
  };

  const downloadFormattedDocx = async () => {
    const { text, warnings } = getExportText();
    if (!text) return;
    if (warnings.length) {
      setReviewWarnings(warnings);
      toast(
        "Some review edits could not be applied. Exporting best-effort output.",
      );
    }
    try {
      const {
        Document: D,
        Paragraph: P,
        TextRun: T,
        Packer,
      } = await import("docx");
      const children = [];
      if (!isPaidPlan) {
        children.push(
          new P({
            children: [
              new T({
                text: WATERMARK_DOC_HEADER,
                bold: true,
                color: "666666",
                size: 20,
              }),
            ],
            spacing: { after: 80 },
          }),
          new P({
            children: [
              new T({
                text: WATERMARK_DOC_FOOTER,
                italics: true,
                color: "888888",
                size: 18,
              }),
            ],
            spacing: { after: 200 },
          }),
        );
      }
      children.push(
        ...text
          .split("\n")
          .map((line) => new P({ children: [new T({ text: line })] })),
      );
      const doc = new D({ sections: [{ children }] });
      const blob = await Packer.toBlob(doc);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "formatted_transcript.docx";
      a.click();
      URL.revokeObjectURL(a.href);
      exportDownloadToast();
    } catch {
      toast.error("DOCX export failed");
    }
  };

  const downloadFormattedPdf = async () => {
    const { text, warnings } = getExportText();
    if (!text) return;
    if (warnings.length) {
      setReviewWarnings(warnings);
      toast(
        "Some review edits could not be applied. Exporting best-effort output.",
      );
    }
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const margin = 20;
      const textWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const pageH = doc.internal.pageSize.getHeight();
      const lineH = 6;
      let y = margin;
      doc.setFontSize(11);
      if (!isPaidPlan) {
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(WATERMARK_DOC_HEADER, margin, y);
        y += lineH;
        doc.text(WATERMARK_DOC_FOOTER, margin, y);
        y += lineH * 2;
        doc.setTextColor(0);
        doc.setFontSize(11);
      }
      const allLines = doc.splitTextToSize(text, textWidth) as string[];
      for (const line of allLines) {
        if (y + lineH > pageH - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineH;
      }
      if (!isPaidPlan) drawPdfFreePlanWatermark(doc);
      doc.save("formatted_transcript.pdf");
      exportDownloadToast();
    } catch {
      toast.error("PDF export failed");
    }
  };

  const onSelectPreset = (v: SelectValue) => {
    setSelectValue(v);
    resetJobUi();
    if (v === "" || !v) {
      setSelectedPreset(null);
      setRules([]);
      setCustomFile(null);
      return;
    }
    if (v === "custom") {
      setSelectedPreset("custom");
      setRules([]);
      return;
    }
    setCustomFile(null);
    const key = v as GuidelinePresetKey;
    setSelectedPreset(key);
    setRules(rulesFromPreset(PRESET_DATA[key]));
  };

  const updateRuleValue = (id: string, next: string) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return { ...r, currentValue: next, isEdited: next !== r.defaultValue };
      }),
    );
  };

  const resetOneRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, currentValue: r.defaultValue, isEdited: false }
          : r,
      ),
    );
  };

  const resetAllRules = () => {
    setRules((prev) =>
      prev.map((r) => ({
        ...r,
        currentValue: r.defaultValue,
        isEdited: false,
      })),
    );
  };

  const focusTranscriptEditor = useCallback(() => {
    requestAnimationFrame(() => {
      const el = transcriptTextareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: false });
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const readTxtFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        setTranscriptLoadedFromFile(file.name);
        setTranscript(text);
        toast.success(`Loaded ${file.name}`);
        focusTranscriptEditor();
      };
      reader.onerror = () => {
        toast.error("Could not read this file.");
      };
      reader.readAsText(file, "UTF-8");
    },
    [focusTranscriptEditor],
  );

  const readDocxIntoTranscript = useCallback(
    async (file: File) => {
      const mammoth = await import("mammoth");
      const ab = await file.arrayBuffer();
      const { value } = await mammoth.extractRawText({ arrayBuffer: ab });
      const text = String(value ?? "")
        .replace(/\u0000/g, "")
        .trim();
      if (!text) {
        throw new Error("No text could be extracted from this DOCX.");
      }
      setTranscriptLoadedFromFile(file.name);
      setTranscript(text);
      focusTranscriptEditor();
    },
    [focusTranscriptEditor],
  );

  const onTranscriptFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    const mime = (file.type || "").toLowerCase();
    const isDocxMime =
      mime.includes("officedocument") && mime.includes("wordprocessing");
    if (
      lower.endsWith(".txt") ||
      lower.endsWith(".srt") ||
      lower.endsWith(".vtt")
    ) {
      readTxtFile(file);
      return;
    }
    if (lower.endsWith(".docx") || isDocxMime) {
      void toast.promise(readDocxIntoTranscript(file), {
        loading: "Reading DOCX…",
        success: () => `Loaded ${file.name} — scroll to preview below`,
        error: (e) =>
          e instanceof Error ? e.message : "Could not read this DOCX.",
      });
      return;
    }
    toast("Please upload a .txt, .srt, .vtt, or .docx file");
  };

  const onCustomGuideFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (
      !lower.endsWith(".pdf") &&
      !lower.endsWith(".docx") &&
      !lower.endsWith(".txt")
    ) {
      toast("Upload a PDF, DOCX, or TXT style guide");
      return;
    }
    setCustomFile(file);
    setCustomGuideLoading(true);
    setCustomGuideError(null);
    setRules([]);
    resetJobUi();
    const fd = new FormData();
    fd.append("file", file);
    api("/api/guidelines/parse-guide", {
      method: "POST",
      body: fd,
      timeout: 60000,
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          rules?: Array<{
            id: string;
            category: string;
            label: string;
            currentValue: string;
            extractionConfidence?: "high" | "medium" | "needs_review";
            extractionReason?: string;
            sourceQuote?: string;
          }>;
          conflicts?: Array<{
            ruleIdA: string;
            ruleIdB: string;
            summary: string;
            confidence: "high" | "medium";
          }>;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || "Failed to parse style guide");
        }
        const list = Array.isArray(data.rules) ? data.rules : [];
        if (!list.length) throw new Error("No rules extracted from this guide");
        setCustomGuideConflicts(
          Array.isArray(data.conflicts) ? data.conflicts : [],
        );
        setRules(
          list.map((r) => ({
            id: r.id,
            category: r.category,
            label: r.label,
            defaultValue: r.currentValue,
            currentValue: r.currentValue,
            isEdited: false,
            extractionConfidence: r.extractionConfidence,
            extractionReason: r.extractionReason,
            sourceQuote: r.sourceQuote,
          })),
        );
        toast.success("Rules extracted — please review before formatting");
      })
      .catch((e) => {
        setCustomGuideError(
          e instanceof Error ? e.message : "Failed to parse style guide",
        );
        toast.error("Style guide parsing failed");
      })
      .finally(() => setCustomGuideLoading(false));
  };

  const unlockClaimedGuidelineJob = async () => {
    if (!jobId || !jobToken) {
      setShowAuthGate(false);
      setShowAuthModal(false);
      return;
    }
    const claimRes = await api(`/api/guidelines/jobs/${jobId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobToken }),
      timeout: 15000,
    });
    if (!claimRes.ok && claimRes.status !== 409) {
      const data = await claimRes
        .json()
        .catch(() => ({}) as { error?: string });
      throw new Error(
        data.error || "Could not unlock this result. Please try again.",
      );
    }
    const statusRes = await api(`/api/guidelines/jobs/${jobId}`, {
      timeout: 15000,
    });
    const data = (await statusRes.json()) as JobStatusResponse & {
      error?: string;
    };
    if (!statusRes.ok) {
      throw new Error(
        data.error || "Could not load your formatted transcript.",
      );
    }
    setJobStatus((prev) => mergeGuidelinePollStatus(prev, data));
    setShowAuthGate(false);
    setShowAuthModal(false);
  };

  const rulesByCategory = useMemo(() => {
    const map = new Map<string, EditableRule[]>();
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const r of rules) {
      if (!map.has(r.category)) map.set(r.category, []);
      const list = map.get(r.category);
      if (list) list.push(r);
    }
    return map;
  }, [rules]);

  const flaggedList = Array.isArray(jobStatus?.flaggedSegments)
    ? jobStatus!.flaggedSegments!
    : [];
  const appliedRulesList = Array.isArray(jobStatus?.appliedRules)
    ? jobStatus!.appliedRules!
    : [];
  const diffSegments = Array.isArray(jobStatus?.diffData)
    ? jobStatus!.diffData!
    : [];
  const showLoadingMessage = isSubmitting && !jobStatus;
  const showProcessingMessage =
    isSubmitting &&
    jobStatus &&
    (jobStatus.status === "queued" || jobStatus.status === "processing");
  const stageLabel =
    jobStatus?.stage === "formatting"
      ? "Formatting…"
      : jobStatus?.stage === "validating"
        ? "Verifying…"
        : jobStatus?.status === "queued"
          ? "Queued…"
          : jobStatus?.status === "processing"
            ? "Processing…"
            : null;

  const originalSegments = useMemo(() => {
    const t = originalTranscriptForJob.trim();
    if (!t) return [];
    const blocks = t
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter(Boolean);
    return blocks.length ? blocks : [t];
  }, [originalTranscriptForJob]);

  const findSegmentForText = useCallback(
    (needle: string): number | null => {
      const n = (needle || "").trim();
      if (!n) return null;
      const nLower = n.toLowerCase();
      for (let i = 0; i < originalSegments.length; i++) {
        const seg = originalSegments[i];
        if (seg.toLowerCase().includes(nLower)) return i + 1;
      }
      // Fallback: try first ~80 chars to handle model-added punctuation changes
      const short = n.slice(0, 80).toLowerCase();
      if (short.length >= 12) {
        for (let i = 0; i < originalSegments.length; i++) {
          const seg = originalSegments[i];
          if (seg.toLowerCase().includes(short)) return i + 1;
        }
      }
      return null;
    },
    [originalSegments],
  );

  useEffect(() => {
    if (jobStatus?.status === "completed") {
      setResultMode("summary");
      setReviewIssueCursor(0);
      setReviewWarnings([]);
      setFullTranscriptMode("all");
      setFocusContextExpanded({});
    }
  }, [jobStatus?.status]);

  useEffect(() => {
    if (jobStatus?.status === "completed" && !isLoggedIn()) {
      setShowAuthGate(true);
      setShowAuthModal(true);
      setAuthModalMode("signup-combo");
    }
  }, [jobStatus?.status]);

  useEffect(() => {
    if (!selectedPreset || rules.length === 0) return;
    setCategoryOpen((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const [cat, list] of rulesByCategory.entries()) {
        if (!list.length) continue;
        if (typeof next[cat] !== "boolean") next[cat] = false;
      }
      return next;
    });
  }, [rules.length, rulesByCategory, selectedPreset]);

  const effectiveOutputText = useMemo(() => {
    const base = jobStatus?.outputText;
    if (!base) return "";
    const { text, warnings } = applyReviewEditsToOutputText(
      base,
      flaggedList,
      reviewEdits,
    );
    return warnings.length ? text : text;
  }, [flaggedList, jobStatus?.outputText, reviewEdits]);

  const validationHealth = useMemo(() => {
    const report = jobStatus?.validationReport;
    const checks = Array.isArray(report?.checks) ? report!.checks! : [];
    const byId = new Map(checks.map((c) => [c.id, c]));
    const speaker = byId.get("speaker_labels");
    const artifacts = byId.get("no_ai_artifacts");
    const outputPresent = byId.get("output_non_empty");
    const caption = byId.get("caption_metadata_preserved");
    const confidencePct = report?.summary?.confidencePct;
    return {
      confidencePct: typeof confidencePct === "number" ? confidencePct : null,
      outputPresent,
      artifacts,
      speaker,
      caption,
      reviewSuggestions: flaggedList.length,
      isCaptionMode: Boolean(inputCaptionFormat),
    };
  }, [flaggedList.length, inputCaptionFormat, jobStatus?.validationReport]);

  const onScrollSynced = useCallback((source: "original" | "formatted") => {
    const from =
      source === "original"
        ? originalScrollRef.current
        : formattedScrollRef.current;
    const to =
      source === "original"
        ? formattedScrollRef.current
        : originalScrollRef.current;
    if (!from || !to) return;
    if (syncScrollLockRef.current && syncScrollLockRef.current !== source)
      return;
    syncScrollLockRef.current = source;
    const fromMax = Math.max(1, from.scrollHeight - from.clientHeight);
    const toMax = Math.max(1, to.scrollHeight - to.clientHeight);
    const ratio = from.scrollTop / fromMax;
    to.scrollTop = ratio * toMax;
    window.setTimeout(() => {
      if (syncScrollLockRef.current === source)
        syncScrollLockRef.current = null;
    }, 0);
  }, []);

  return (
    <>
      <ToolLayout
        breadcrumbs={[
          {
            label: "Transcript Style Guide Formatter",
            href: "/guideline-format",
          },
        ]}
        title="Format Transcripts to Client Guidelines"
        subtitle="Apply Rev, GoTranscript, TranscribeMe, or Scribie-style rules to a transcript. Then export client-ready text. 3 free imports/mo."
        icon={
          <FileText
            className="text-blue-600 dark:text-blue-400"
            strokeWidth={1.75}
          />
        }
        sidebar={null}
        compactToolHeader
        coreToolPath="/guideline-format"
        currentStepLabel={
          jobStatus?.status === "completed"
            ? "Format ready"
            : selectedPreset === "custom"
              ? "Custom guide active"
              : selectedPreset
                ? `${PRESET_DATA[selectedPreset].label} active`
                : "Rev style guide active"
        }
      >
        <div className="max-w-6xl mx-auto space-y-component-sm">
          <div
            className="flex h-8 items-start justify-center gap-0 px-2"
            aria-label="Formatting steps"
          >
            {["Transcript", "Style guide", "Format", "Review"].map(
              (step, index) => {
                const activeIndex =
                  jobStatus?.status === "completed"
                    ? 3
                    : isSubmitting || jobStatus
                      ? 2
                      : selectedPreset
                        ? 1
                        : 0;
                const active = index === activeIndex;
                return (
                  <div
                    key={step}
                    className="flex min-w-[84px] flex-col items-center"
                  >
                    <div className="flex w-full items-center">
                      <span
                        className={`h-px flex-1 ${index === 0 ? "bg-transparent" : "bg-gray-200 dark:bg-gray-800"}`}
                      />
                      <span
                        className={`h-2 w-2 rounded-full ${active ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"}`}
                      />
                      <span
                        className={`h-px flex-1 ${index === 3 ? "bg-transparent" : "bg-gray-200 dark:bg-gray-800"}`}
                      />
                    </div>
                    <span
                      className={`mt-1 text-xs ${active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`}
                    >
                      {step}
                    </span>
                  </div>
                );
              },
            )}
          </div>
          {prefillBanner && (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
              <p>
                Transcript loaded from your VideoText job — ready to format.
              </p>
              <button
                type="button"
                onClick={() => setPrefillBanner(false)}
                className="text-emerald-800 dark:text-emerald-200 underline text-sm font-medium shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-2">
            {/* Left — transcript */}
            <section className="space-y-component-sm bg-white dark:bg-gray-900">
              <div className="flex h-9 items-center justify-between gap-3 border-b border-gray-100 px-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                  Transcript
                </p>
                <div className="flex min-w-0 items-center gap-2 text-xs font-mono text-gray-400 dark:text-gray-500">
                  {wordCount > 0 && (
                    <span>{wordCount.toLocaleString()} words</span>
                  )}
                  {transcriptLoadedFromFile && (
                    <span className="truncate">
                      From file: {transcriptLoadedFromFile}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 px-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => transcriptFileInputRef.current?.click()}
                    className="h-8 rounded-md border border-gray-300 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Upload file
                  </button>
                  <input
                    ref={transcriptFileInputRef}
                    type="file"
                    accept=".txt,.srt,.vtt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => {
                      onTranscriptFile(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Allowed formats:{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    .txt
                  </span>
                  ,{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    .srt
                  </span>
                  ,{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    .vtt
                  </span>
                  ,{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    .docx
                  </span>
                </p>
                <p
                  className="rounded-md border border-dashed border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onTranscriptFile(e.dataTransfer.files);
                  }}
                >
                  Or drop a file here (same formats as above)
                </p>
              </div>
              <div className="space-y-1.5 px-3 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="guideline-transcript-editor"
                    className="text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    Transcript content
                  </label>
                  {transcriptLoadedFromFile && (
                    <span
                      className="text-xs font-medium text-emerald-700 dark:text-emerald-300"
                      title="You can edit this text before formatting"
                    >
                      From file: {transcriptLoadedFromFile}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Everything we format is taken from this box — upload fills it
                  for you; you can edit before running Step 3.
                </p>
                <textarea
                  id="guideline-transcript-editor"
                  ref={transcriptTextareaRef}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste, type, or upload a file — the full text appears here…"
                  spellCheck={false}
                  className="w-full min-h-[min(24rem,50vh)] max-h-[min(32rem,60vh)] rounded-lg border border-gray-300 bg-white px-3 py-3 font-mono text-sm leading-[1.6] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-950 dark:text-white overflow-y-auto"
                />
              </div>
            </section>

            {/* Right — guidelines */}
            <section className="space-y-component-sm border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:border-l lg:border-t-0">
              <div className="flex h-9 items-center border-b border-gray-100 px-3 dark:border-gray-800">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                  Style guide
                </p>
              </div>

              <div className="px-3">
                <label
                  htmlFor="guideline-preset"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400"
                >
                  Guideline preset
                </label>
                <select
                  id="guideline-preset"
                  value={selectValue}
                  onChange={(e) =>
                    onSelectPreset(e.target.value as SelectValue)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-white"
                >
                  <option value="" disabled>
                    Select a guideline preset…
                  </option>
                  <optgroup label="Platform style guides">
                    <option value="rev">Rev — transcription style guide</option>
                    <option value="gotranscript">
                      GoTranscript — transcription style guide
                    </option>
                    <option value="transcribeme">
                      TranscribeMe — clean verbatim style guide
                    </option>
                    <option value="scribie">
                      Scribie — transcription style guide
                    </option>
                  </optgroup>
                  <optgroup label="────────────">
                    <option value="custom">
                      Custom — upload my own guideline
                    </option>
                  </optgroup>
                </select>
              </div>

              {selectedPreset === "custom" && rules.length > 0 && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-semibold">
                    Rules extracted from your guide — please review before
                    formatting.
                  </p>
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/90 mt-1">
                    We'll mark ambiguous rules as “Needs review” and warn on
                    conflicts.
                  </p>
                </div>
              )}

              {selectedPreset === "custom" &&
                customGuideConflicts.length > 0 && (
                  <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 px-4 py-3 space-y-micro">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                      Potential rule conflicts detected
                    </p>
                    <ul className="space-y-1 text-xs text-red-700 dark:text-red-200">
                      {customGuideConflicts.slice(0, 6).map((c, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">
                            {c.confidence === "high" ? "High" : "Medium"}{" "}
                            confidence:
                          </span>{" "}
                          {c.summary}
                        </li>
                      ))}
                      {customGuideConflicts.length > 6 && (
                        <li className="text-red-700/80 dark:text-red-200/80">
                          …and {customGuideConflicts.length - 6} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}

              {selectedPreset && rules.length > 0 && (
                <div className="px-3">
                  {[
                    ...CATEGORY_ORDER,
                    ...[...rulesByCategory.keys()].filter(
                      (k) => !(CATEGORY_ORDER as readonly string[]).includes(k),
                    ),
                  ].map((cat) => {
                    const list = rulesByCategory.get(cat) ?? [];
                    if (!list.length) return null;
                    const isOpen = Boolean(categoryOpen[cat]);
                    return (
                      <div
                        key={cat}
                        className="border-b border-gray-200 last:border-b-0 dark:border-gray-800"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setCategoryOpen((p) => ({
                              ...p,
                              [cat]: !Boolean(p[cat]),
                            }))
                          }
                          className="flex min-h-9 w-full items-center justify-between gap-3 px-0 py-2 text-left"
                          aria-expanded={isOpen}
                        >
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center text-blue-700 dark:text-blue-300">
                              {isOpen ? (
                                <ChevronDown size={10} />
                              ) : (
                                <ChevronRight size={10} />
                              )}
                            </span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              {cat}{" "}
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                ({list.length} rules)
                              </span>
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {isOpen ? "Hide" : "Show"}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="space-y-micro pb-2">
                            {list.map((rule) => (
                              <div
                                key={rule.id}
                                className="border-t border-gray-100 pt-2 dark:border-gray-800"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <label
                                    className="text-sm font-medium text-gray-800 dark:text-gray-200"
                                    htmlFor={`rule-${rule.id}`}
                                  >
                                    {rule.label}
                                  </label>
                                  {rule.isEdited && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                                        Edited{" "}
                                        <span
                                          aria-hidden
                                          className="text-amber-500"
                                        >
                                          ●
                                        </span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => resetOneRule(rule.id)}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                      >
                                        Reset
                                      </button>
                                    </div>
                                  )}
                                  {selectedPreset === "custom" &&
                                    rule.extractionConfidence && (
                                      <span
                                        className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                          rule.extractionConfidence === "high"
                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                                            : rule.extractionConfidence ===
                                                "medium"
                                              ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                                              : "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                                        }`}
                                        title={
                                          rule.extractionReason || undefined
                                        }
                                      >
                                        {rule.extractionConfidence === "high"
                                          ? "High confidence"
                                          : rule.extractionConfidence ===
                                              "medium"
                                            ? "Medium confidence"
                                            : "Needs review"}
                                      </span>
                                    )}
                                </div>
                                {selectedPreset === "custom" &&
                                  (rule.extractionReason ||
                                    rule.sourceQuote) && (
                                    <div className="mb-2 space-y-1">
                                      {rule.extractionReason && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {rule.extractionReason}
                                        </p>
                                      )}
                                      {rule.sourceQuote && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                                          “{rule.sourceQuote}”
                                        </p>
                                      )}
                                    </div>
                                  )}
                                <AutoGrowTextarea
                                  aria-label={rule.label}
                                  value={rule.currentValue}
                                  onChange={(v) => updateRuleValue(rule.id, v)}
                                  className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {anyRuleEdited && (
                    <button
                      type="button"
                      onClick={resetAllRules}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Reset all to defaults
                    </button>
                  )}
                </div>
              )}

              <h2 className="border-t border-gray-100 px-3 pt-3 text-xs font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
                Or upload your own client style guide — PDF, DOCX, or TXT
              </h2>

              {selectedPreset === "custom" && (
                <div className="space-y-micro px-3 pb-3">
                  <input
                    ref={customGuideRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={(e) => onCustomGuideFiles(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => customGuideRef.current?.click()}
                    className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-blue-950/20"
                  >
                    Drop your client style guide here
                  </button>
                  <p
                    className="text-xs text-gray-500 text-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      onCustomGuideFiles(e.dataTransfer.files);
                    }}
                  >
                    Drop PDF, DOCX, or TXT — or click above to browse
                  </p>
                  {customFile && (
                    <p className="text-sm text-gray-700 dark:text-gray-200 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2">
                      {customFile.name} received
                    </p>
                  )}
                  {customGuideLoading && (
                    <p className="text-sm text-gray-700 dark:text-gray-200 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2">
                      Parsing style guide… extracting rules
                    </p>
                  )}
                  {customGuideError && (
                    <div className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 px-3 py-2">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {customGuideError}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-white/70 dark:bg-gray-900/30 p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                  Step 3
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Run formatting
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  We'll apply your rules and return a review-ready diff and
                  flagged sections.
                </p>
              </div>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submitFormat()}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 text-sm shadow-md transition-colors"
              >
                {isSubmitting
                  ? "Generating…"
                  : "Generate Client-Ready Transcript →"}
              </button>
            </div>
          </div>

          {(showLoadingMessage || showProcessingMessage) && (
            <ProcessingStateShell>
              <ProcessingProgress
                steps={[
                  {
                    label: "Preparing",
                    status:
                      !jobStatus && showLoadingMessage
                        ? "active"
                        : jobStatus
                          ? "completed"
                          : "pending",
                  },
                  {
                    label: "Formatting",
                    status:
                      jobStatus?.stage === "formatting"
                        ? "active"
                        : jobStatus?.stage === "validating" ||
                            jobStatus?.status === "completed"
                          ? "completed"
                          : jobStatus && jobStatus.status !== "failed"
                            ? "pending"
                            : "pending",
                  },
                  {
                    label: "Validating",
                    status:
                      jobStatus?.stage === "validating"
                        ? "active"
                        : jobStatus?.status === "completed"
                          ? "completed"
                          : "pending",
                  },
                  {
                    label: "Review queue",
                    status:
                      jobStatus?.status === "completed" ? "completed" : "pending",
                  },
                ]}
                currentMessage={
                  showLoadingMessage
                    ? "Applying style guide rules to your transcript… This takes 30–60 seconds for a 1-hour transcript."
                    : stageLabel ?? "Formatting in progress…"
                }
                progress={
                  !jobStatus
                    ? 15
                    : jobStatus.stage === "validating"
                      ? 85
                      : jobStatus.stage === "formatting"
                        ? 55
                        : 35
                }
                estimatedTime="30–60 seconds for a 1-hour transcript"
                statusSubtext={
                  jobStatus?.stage === "validating"
                    ? "Running verification checks for a professional handoff…"
                    : undefined
                }
              />
            </ProcessingStateShell>
          )}

          {(submitError || jobStatus) && !(showLoadingMessage || showProcessingMessage) && (
            <div className="space-y-component-sm">
              {submitError && (
                <div className="space-y-component-sm">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {submitError}
                  </p>
                  <button
                    type="button"
                    onClick={resetJobUi}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-900/60"
                  >
                    Try again
                  </button>
                </div>
              )}
              {jobStatus?.status === "failed" && !submitError && (
                <div className="space-y-component-sm">
                  <p className="text-sm text-gray-800 dark:text-gray-100">
                    Formatting failed. Please try again.
                  </p>
                  <button
                    type="button"
                    onClick={resetJobUi}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-gray-900/60"
                  >
                    Try again
                  </button>
                </div>
              )}
              {jobStatus?.status === "completed" &&
                !submitError &&
                (showAuthGate && !isLoggedIn() ? (
                  <div className="rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-white/85 dark:bg-gray-900/60 p-component shadow-sm space-y-component-sm">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <Lock className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          Your formatted transcript is ready
                        </p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          We finished processing your style guide. Create a free
                          account or log in to unlock the formatted transcript,
                          validation report, review queue, and exports.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode("signup-combo");
                          setShowAuthModal(true);
                        }}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 text-sm shadow-md transition-colors"
                      >
                        Create free account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode("login");
                          setShowAuthModal(true);
                        }}
                        className="rounded-xl border border-gray-300 dark:border-gray-600 px-5 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-white/80 dark:hover:bg-gray-900/60"
                      >
                        Log in
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-component">
                    <ResultHeader
                      title="Format ready"
                      onAction={resetJobUi}
                      actionLabel="Format another"
                    />
                    <ResultUpgradeCard tool="guideline" resultKey={jobId} />
                    {jobStatus.validationReport?.summary && (
                      <div className="rounded-xl border border-gray-200 bg-white/80 p-2.5 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
                        <div className="flex flex-wrap items-start justify-between gap-2.5">
                          <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                              System health
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Validation Summary
                            </p>
                          </div>
                          <div className="flex items-baseline gap-2 text-right">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              validation confidence
                            </span>
                            <span className="text-gray-400">·</span>
                            <span className="font-mono text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                              {validationHealth.confidencePct ??
                                jobStatus.validationReport.summary
                                  .confidencePct}
                              %
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 h-px bg-gray-200/70 dark:bg-gray-700/70" />

                        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                          <div className="space-y-1.5 text-sm">
                            {[
                              {
                                key: "formatting_integrity",
                                label: "Formatting integrity verified",
                                passed: Boolean(
                                  validationHealth.outputPresent?.passed &&
                                  validationHealth.artifacts?.passed,
                                ),
                                details:
                                  validationHealth.outputPresent?.passed &&
                                  validationHealth.artifacts?.passed
                                    ? undefined
                                    : validationHealth.outputPresent?.details ||
                                      validationHealth.artifacts?.details,
                              },
                              {
                                key: "speaker_preservation",
                                label: "Speaker preservation verified",
                                passed:
                                  validationHealth.speaker?.passed ?? true,
                                details: validationHealth.speaker?.details,
                              },
                              ...(validationHealth.isCaptionMode
                                ? [
                                    {
                                      key: "caption_export",
                                      label: "Caption export validated",
                                      passed:
                                        validationHealth.caption?.passed ??
                                        true,
                                      details:
                                        validationHealth.caption?.details,
                                    },
                                  ]
                                : []),
                            ].map((row) => (
                              <div
                                key={row.key}
                                className="flex min-h-9 items-center justify-between gap-3 rounded-lg border border-gray-200/70 bg-white/60 px-3 py-1.5 dark:border-gray-700/70 dark:bg-gray-950/20"
                              >
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {row.label}
                                  </p>
                                  {row.details ? (
                                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                      {row.details}
                                    </p>
                                  ) : null}
                                </div>
                                <span
                                  className={`shrink-0 text-xs font-semibold ${
                                    row.passed
                                      ? "text-emerald-700 dark:text-emerald-300"
                                      : "text-red-700 dark:text-red-300"
                                  }`}
                                >
                                  {row.passed ? "✓" : "✕"}
                                </span>
                              </div>
                            ))}

                            <div className="flex min-h-9 items-center justify-between gap-3 rounded-lg border border-gray-200/70 bg-white/60 px-3 py-1.5 dark:border-gray-700/70 dark:bg-gray-950/20">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  Review suggestions
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                  Flagged sections that may need a human pass.
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                                {validationHealth.reviewSuggestions
                                  ? `⚠ ${validationHealth.reviewSuggestions}`
                                  : "✓ 0"}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-lg border border-blue-200/60 bg-blue-50/60 px-3 py-2.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                            <p className="text-sm text-gray-800 dark:text-gray-100">
                              Estimated formatting cleanup reduced by{" "}
                              <span className="font-semibold text-blue-700 dark:text-blue-300">
                                ~
                                {
                                  jobStatus.validationReport.summary
                                    .qaReductionPct
                                }
                                %
                              </span>
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                              Based on automated cleanup signals + verification
                              coverage — an estimate, not a guarantee.
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700 dark:text-gray-300">
                              <span className="rounded-[3px] border border-gray-200 bg-white/60 px-1.5 py-0.5 font-mono dark:border-gray-700 dark:bg-gray-950/20">
                                ✓{" "}
                                {jobStatus.validationReport.summary.verified
                                  ?.passed ?? 0}
                                /
                                {jobStatus.validationReport.summary.verified
                                  ?.total ?? 0}{" "}
                                verified
                              </span>
                              <span className="rounded-[3px] border border-gray-200 bg-white/60 px-1.5 py-0.5 font-mono dark:border-gray-700 dark:bg-gray-950/20">
                                ⚠{" "}
                                {jobStatus.validationReport.summary
                                  .likelyCompliant?.passed ?? 0}
                                /
                                {jobStatus.validationReport.summary
                                  .likelyCompliant?.total ?? 0}{" "}
                                likely compliant
                              </span>
                            </div>
                          </div>
                        </div>
                        {Array.isArray(jobStatus.validationReport.checks) &&
                          jobStatus.validationReport.checks.length > 0 && (
                            <details className="pt-1">
                              <summary className="cursor-pointer text-xs font-medium text-blue-700 dark:text-blue-300">
                                Show details
                              </summary>
                              <ul className="mt-2 space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                                {jobStatus.validationReport.checks.map((c) => {
                                  const prefix =
                                    c.bucket === "verified"
                                      ? "✓"
                                      : c.bucket === "likely_compliant"
                                        ? "⚠"
                                        : "👀";
                                  const tone =
                                    c.bucket === "verified"
                                      ? c.passed
                                        ? "text-emerald-700 dark:text-emerald-300"
                                        : "text-red-700 dark:text-red-300"
                                      : c.bucket === "likely_compliant"
                                        ? "text-amber-800 dark:text-amber-200"
                                        : "text-gray-700 dark:text-gray-300";
                                  const canJump =
                                    typeof c.segmentIndex === "number" &&
                                    c.segmentIndex > 0;
                                  return (
                                    <li
                                      key={c.id}
                                      className={`rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-950/30 px-3 py-2 ${tone}`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <button
                                          type="button"
                                          disabled={!canJump}
                                          onClick={() => {
                                            if (!canJump) return;
                                            const idx =
                                              c.segmentIndex as number;
                                            setFocusSegment(idx);
                                            const el = document.getElementById(
                                              `seg-${idx}`,
                                            );
                                            el?.scrollIntoView({
                                              behavior: "smooth",
                                              block: "center",
                                            });
                                          }}
                                          className={`text-left font-semibold ${canJump ? "hover:underline" : ""}`}
                                          title={
                                            canJump
                                              ? `Jump to segment ${c.segmentIndex}`
                                              : undefined
                                          }
                                        >
                                          {prefix} {c.label}
                                          {canJump ? (
                                            <span className="ml-2 text-xs font-semibold opacity-80">
                                              (Segment {c.segmentIndex})
                                            </span>
                                          ) : null}
                                        </button>
                                        <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                                          {c.bucket === "verified"
                                            ? "Verified"
                                            : c.bucket === "likely_compliant"
                                              ? "Likely compliant"
                                              : "Needs review"}
                                        </span>
                                      </div>
                                      {c.details && (
                                        <p className="mt-1 text-gray-600 dark:text-gray-300">
                                          {c.details}
                                        </p>
                                      )}
                                      {c.snippet && (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                                          “{c.snippet}”
                                        </p>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </details>
                          )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                      <span>
                        <strong className="text-gray-900 dark:text-white">
                          {flaggedList.length}
                        </strong>{" "}
                        sections flagged for review
                      </span>
                      <span>
                        <strong className="text-gray-900 dark:text-white">
                          {appliedRulesList.length}
                        </strong>{" "}
                        rules applied
                      </span>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            Ready for review
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                            Start with flagged sections (lowest cognitive load),
                            then review the full transcript.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={flaggedList.length === 0}
                            onClick={() => {
                              setResultMode("review");
                              setReviewIssueCursor(0);
                              setReviewWarnings([]);
                            }}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2"
                          >
                            Review Issues ({flaggedList.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setResultMode("full")}
                            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                          >
                            Open full transcript
                          </button>
                        </div>
                      </div>
                    </div>

                    {resultMode === "review" && (
                      <div className="space-y-component-sm">
                        {flaggedList.length === 0 ? (
                          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-2.5">
                            <p className="text-sm text-gray-800 dark:text-gray-100">
                              No issues flagged. You're good to export.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Issue {reviewIssueCursor + 1} of{" "}
                                  {flaggedList.length}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                  Resolve issues one at a time, then export.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setResultMode("full")}
                                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                >
                                  Full transcript
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setResultMode("summary")}
                                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                >
                                  Back to summary
                                </button>
                              </div>
                            </div>

                            {(() => {
                              const seg =
                                flaggedList[
                                  Math.min(
                                    flaggedList.length - 1,
                                    Math.max(0, reviewIssueCursor),
                                  )
                                ];
                              const c = (seg?.confidence || "").toLowerCase();
                              const badgeClass =
                                c === "high"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                                  : c === "low"
                                    ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                                    : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
                              const segIndex = seg
                                ? findSegmentForText(seg.originalText)
                                : null;
                              const canJump =
                                typeof segIndex === "number" && segIndex > 0;
                              const issueIdx = Math.min(
                                flaggedList.length - 1,
                                Math.max(0, reviewIssueCursor),
                              );
                              const editValue =
                                typeof reviewEdits[issueIdx] === "string"
                                  ? reviewEdits[issueIdx]
                                  : seg?.suggestedText || "";
                              const goNext = () => {
                                const nextWarnings: string[] = [];
                                const base = jobStatus.outputText ?? "";
                                if (base) {
                                  const { warnings } =
                                    applyReviewEditsToOutputText(
                                      base,
                                      flaggedList,
                                      reviewEdits,
                                    );
                                  nextWarnings.push(...warnings);
                                }
                                setReviewWarnings(nextWarnings);
                                setReviewIssueCursor((v) =>
                                  Math.min(flaggedList.length - 1, v + 1),
                                );
                              };
                              return (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-5 space-y-component-sm">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span
                                          className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeClass}`}
                                        >
                                          {seg?.confidence || "medium"}
                                        </span>
                                        <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                          {seg?.ruleApplied}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-800 dark:text-gray-100">
                                        {seg?.reason}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={!canJump}
                                      onClick={() => {
                                        if (!canJump) return;
                                        setResultMode("full");
                                        setFocusSegment(segIndex as number);
                                        window.setTimeout(() => {
                                          const el = document.getElementById(
                                            `seg-${segIndex}`,
                                          );
                                          el?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "center",
                                          });
                                        }, 50);
                                      }}
                                      className={`text-xs font-semibold ${
                                        canJump
                                          ? "text-blue-700 dark:text-blue-300 hover:underline"
                                          : "text-gray-400 dark:text-gray-500"
                                      }`}
                                      title={
                                        canJump
                                          ? `Open full transcript at segment ${segIndex}`
                                          : "Could not locate this text in the original transcript"
                                      }
                                    >
                                      {canJump
                                        ? `Open at segment ${segIndex}`
                                        : "Open at segment unavailable"}
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                                    <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-gray-950/20 p-2.5">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                        Original
                                      </p>
                                      <div className="font-mono text-xs leading-[1.5] text-gray-700 dark:text-gray-200 whitespace-pre-wrap opacity-75">
                                        {seg?.originalText || ""}
                                      </div>
                                    </div>
                                    <div className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/10 p-2.5">
                                      <div className="flex items-center justify-between gap-3 mb-2">
                                        <p className="text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                                          Formatted
                                        </p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {issueIdx in reviewEdits
                                            ? "Edited"
                                            : "Suggested"}
                                        </span>
                                      </div>
                                      <AutoGrowTextarea
                                        aria-label="Formatted suggestion"
                                        value={editValue}
                                        onChange={(v) =>
                                          setReviewEdits((p) => ({
                                            ...p,
                                            [issueIdx]: v,
                                          }))
                                        }
                                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/20 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (seg?.suggestedText)
                                            setReviewEdits((p) => ({
                                              ...p,
                                              [issueIdx]: seg.suggestedText,
                                            }));
                                          goNext();
                                        }}
                                        className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2"
                                      >
                                        Accept & Next
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReviewEdits((p) => {
                                            if (!(issueIdx in p)) return p;
                                            const {
                                              [issueIdx]: _omit,
                                              ...rest
                                            } = p;
                                            return rest;
                                          });
                                          goNext();
                                        }}
                                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                      >
                                        Skip
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setReviewIssueCursor((v) =>
                                            Math.max(0, v - 1),
                                          )
                                        }
                                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                      >
                                        Previous
                                      </button>
                                      <button
                                        type="button"
                                        onClick={goNext}
                                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                      >
                                        Next
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setResultMode("full")}
                                      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                    >
                                      Review full transcript
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}

                    {resultMode === "full" && (
                      <div className="space-y-component-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Transcript view
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                              Original is dimmed (40%). Formatted is primary
                              (60%). Scrolling stays synced — or switch to Focus
                              Mode.
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setFullTranscriptMode("all")}
                                className={`px-3 py-2 text-sm font-semibold ${
                                  fullTranscriptMode === "all"
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                    : "text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900/40"
                                }`}
                              >
                                Full
                              </button>
                              <button
                                type="button"
                                disabled={flaggedList.length === 0}
                                onClick={() => setFullTranscriptMode("focus")}
                                className={`px-3 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                                  fullTranscriptMode === "focus"
                                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                    : "text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900/40"
                                }`}
                                title={
                                  flaggedList.length
                                    ? "Show only flagged sections with expandable context"
                                    : "No flagged sections available"
                                }
                              >
                                Focus
                              </button>
                            </div>
                            {flaggedList.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setResultMode("review")}
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2"
                              >
                                Review Issues ({flaggedList.length})
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setResultMode("summary")}
                              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                            >
                              Back to summary
                            </button>
                          </div>
                        </div>

                        {fullTranscriptMode === "focus" ? (
                          <div className="space-y-component-sm">
                            {flaggedList.length === 0 ? (
                              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-2.5">
                                <p className="text-sm text-gray-800 dark:text-gray-100">
                                  No flagged sections. Switch back to Full view
                                  to review everything.
                                </p>
                              </div>
                            ) : (
                              flaggedList.map((seg, i) => {
                                const segIndex = findSegmentForText(
                                  seg.originalText,
                                );
                                const expanded = Boolean(
                                  focusContextExpanded[i],
                                );
                                const centerIdx =
                                  typeof segIndex === "number"
                                    ? segIndex - 1
                                    : null;
                                const context =
                                  centerIdx != null && originalSegments.length
                                    ? expanded
                                      ? [
                                          centerIdx - 1,
                                          centerIdx,
                                          centerIdx + 1,
                                        ].filter(
                                          (x) =>
                                            x >= 0 &&
                                            x < originalSegments.length,
                                        )
                                      : [centerIdx]
                                    : [];
                                const formatted =
                                  typeof reviewEdits[i] === "string"
                                    ? reviewEdits[i]
                                    : seg.suggestedText;
                                const c = (seg.confidence || "").toLowerCase();
                                const badgeClass =
                                  c === "high"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                                    : c === "low"
                                      ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                                      : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
                                return (
                                  <div
                                    key={i}
                                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-5 space-y-component-sm"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeClass}`}
                                          >
                                            {seg.confidence || "medium"}
                                          </span>
                                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                            {seg.ruleApplied}
                                          </span>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            Issue {i + 1} of{" "}
                                            {flaggedList.length}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-800 dark:text-gray-100">
                                          {seg.reason}
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFocusContextExpanded((p) => ({
                                              ...p,
                                              [i]: !Boolean(p[i]),
                                            }))
                                          }
                                          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 hover:bg-white dark:hover:bg-gray-900/40 text-gray-900 dark:text-gray-100 text-sm font-semibold px-4 py-2"
                                        >
                                          {expanded
                                            ? "Collapse context"
                                            : "Expand surrounding context"}
                                        </button>
                                        <button
                                          type="button"
                                          disabled={
                                            typeof segIndex !== "number" ||
                                            segIndex <= 0
                                          }
                                          onClick={() => {
                                            if (
                                              typeof segIndex !== "number" ||
                                              segIndex <= 0
                                            )
                                              return;
                                            setFullTranscriptMode("all");
                                            setFocusSegment(segIndex);
                                            window.setTimeout(() => {
                                              const el =
                                                document.getElementById(
                                                  `seg-${segIndex}`,
                                                );
                                              el?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "center",
                                              });
                                            }, 50);
                                          }}
                                          className={`rounded-lg border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-950/20 text-sm font-semibold px-4 py-2 ${
                                            typeof segIndex === "number" &&
                                            segIndex > 0
                                              ? "text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-900/40"
                                              : "text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
                                          }`}
                                        >
                                          Open in full view
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                                      <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-gray-950/20 p-2.5">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                          Original
                                        </p>
                                        {context.length ? (
                                          <div className="space-y-micro">
                                            {context.map((idx) => (
                                              <div
                                                key={idx}
                                                className="rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/60 dark:bg-gray-950/20 px-3 py-2"
                                              >
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                                  Segment {idx + 1}
                                                </p>
                                                <div className="mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed opacity-75">
                                                  {originalSegments[idx]}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="font-mono text-xs leading-[1.5] text-gray-700 dark:text-gray-200 whitespace-pre-wrap opacity-75">
                                            {seg.originalText}
                                          </div>
                                        )}
                                      </div>
                                      <div className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/10 p-2.5">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                          <p className="text-xs font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                                            Formatted
                                          </p>
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {i in reviewEdits
                                              ? "Edited"
                                              : "Suggested"}
                                          </span>
                                        </div>
                                        <AutoGrowTextarea
                                          aria-label="Formatted suggestion"
                                          value={formatted}
                                          onChange={(v) =>
                                            setReviewEdits((p) => ({
                                              ...p,
                                              [i]: v,
                                            }))
                                          }
                                          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950/20 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                            <div className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/30 p-2.5">
                              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                Original
                              </h3>
                              <div
                                ref={originalScrollRef}
                                onScroll={() => onScrollSynced("original")}
                                className="h-[60vh] overflow-auto pr-2"
                              >
                                <div className="space-y-component-sm">
                                  {originalSegments.length > 0 ? (
                                    originalSegments.map((seg, idx) => {
                                      const n = idx + 1;
                                      const isFocused = focusSegment === n;
                                      return (
                                        <div
                                          key={n}
                                          id={`seg-${n}`}
                                          className={`rounded-xl border px-3 py-2 text-xs whitespace-pre-wrap font-sans leading-relaxed transition-colors opacity-70 ${
                                            isFocused
                                              ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30 opacity-100"
                                              : "border-gray-200/70 dark:border-gray-700/70 bg-white/60 dark:bg-gray-950/20"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                              Segment {n}
                                            </span>
                                          </div>
                                          <div className="text-gray-800 dark:text-gray-200">
                                            {seg}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed opacity-75">
                                      {originalTranscriptForJob}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="lg:col-span-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-2.5 shadow-sm">
                              <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                                Formatted
                              </h3>
                              <div
                                ref={formattedScrollRef}
                                onScroll={() => onScrollSynced("formatted")}
                                className="h-[60vh] overflow-auto pr-2"
                              >
                                <div className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans">
                                  {diffSegments.length > 0 ? (
                                    diffSegments.map((seg, i) => {
                                      const key = `${i}-${seg.type}-${seg.text.slice(0, 12)}`;
                                      if (seg.type === "added") {
                                        return (
                                          <span
                                            key={key}
                                            className="bg-emerald-200/60 dark:bg-emerald-900/40 px-0.5 rounded-sm"
                                          >
                                            {seg.text}
                                          </span>
                                        );
                                      }
                                      if (seg.type === "removed") {
                                        return (
                                          <span
                                            key={key}
                                            className="text-red-600 dark:text-red-400 line-through decoration-red-500/70 px-0.5 opacity-70"
                                          >
                                            {seg.text}
                                          </span>
                                        );
                                      }
                                      return <span key={key}>{seg.text}</span>;
                                    })
                                  ) : (
                                    <pre className="whitespace-pre-wrap font-sans">
                                      {effectiveOutputText}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {reviewWarnings.length > 0 && (
                          <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                            <p className="font-semibold">
                              Some edits could not be applied to the full
                              output:
                            </p>
                            <ul className="mt-2 space-y-1 text-xs">
                              {reviewWarnings.slice(0, 5).map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                              {reviewWarnings.length > 5 ? (
                                <li>…and {reviewWarnings.length - 5} more</li>
                              ) : null}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] bg-gray-100/70 px-3 py-1.5 dark:bg-gray-950/60">
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        Ready for review · {flaggedList.length} issues flagged
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {[
                          [
                            "DOCX",
                            () => void downloadFormattedDocx(),
                            !jobStatus.outputText,
                          ],
                          [
                            "PDF",
                            () => void downloadFormattedPdf(),
                            !jobStatus.outputText,
                          ],
                          ["RTF", downloadFormattedRtf, !jobStatus.outputText],
                          ["JSON", downloadFormattedJson, !jobStatus],
                          ["CSV", downloadFlaggedCsv, flaggedList.length === 0],
                        ].map(([label, handler, disabled]) => (
                          <button
                            key={label as string}
                            type="button"
                            onClick={handler as () => void}
                            disabled={disabled as boolean}
                            className="rounded-[3px] border border-gray-300 bg-transparent px-2 py-[3px] font-mono text-xs text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
                          >
                            {label as string}
                          </button>
                        ))}
                        {inputCaptionFormat ? (
                          <>
                            <button
                              type="button"
                              onClick={downloadFormattedSrt}
                              disabled={!jobStatus.outputText}
                              className="rounded-[3px] border border-gray-300 bg-transparent px-2 py-[3px] font-mono text-xs text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
                            >
                              SRT
                            </button>
                            <button
                              type="button"
                              onClick={downloadFormattedVtt}
                              disabled={!jobStatus.outputText}
                              className="rounded-[3px] border border-gray-300 bg-transparent px-2 py-[3px] font-mono text-xs text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-100"
                            >
                              VTT
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={downloadFormattedTxt}
                          disabled={!jobStatus.outputText}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Download TXT
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </ToolLayout>

      <JobAuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        jobDescription="Your formatted transcript is ready!"
        onAuthSuccess={async () => {
          try {
            await unlockClaimedGuidelineJob();
          } catch (e) {
            toast.error(
              e instanceof Error
                ? e.message
                : "Could not unlock your formatted transcript",
            );
          }
        }}
      />

      <CoreToolSeoDepth
        path="/guideline-format"
        hideFaq
        variant="full"
        defaultCollapsed={jobStatus?.status === 'completed'}
      />

      {/* SEO FAQ section — crawlable content for Google and LLM citations */}
      <section
        className="mx-auto mt-8 max-w-3xl border-t border-white/[0.08] px-4 pt-8 pb-12 sm:px-component sm:pb-16 lg:px-8"
        aria-label="Frequently asked questions"
      >
        <h2 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-component">
          Transcript Style Guide FAQ
        </h2>
        <dl className="space-y-component">
          {[
            {
              q: "What transcription style guides does this tool support?",
              a: "Built-in presets for Rev, GoTranscript, TranscribeMe, and Scribie. Each preset encodes the platform's rules for verbatim handling, speaker label format, filler word removal (um, uh), false start treatment, punctuation, and number formatting. You can also upload your own client style guide as a PDF or DOCX.",
            },
            {
              q: "What are the Rev transcription formatting rules?",
              a: "Rev uses non-verbatim format by default: remove filler words (um, uh, like), false starts, and stutters unless meaningful. Speaker labels use [Speaker Name]: format. Numbers one through nine are spelled out; 10+ use numerals. Inaudible sections are marked [inaudible]. Simultaneous speech is marked [crosstalk]. The Rev preset applies all these rules automatically.",
            },
            {
              q: "What are the GoTranscript formatting rules?",
              a: "GoTranscript uses non-verbatim format: remove fillers and false starts, use Speaker 1: / Speaker 2: labels, include timestamps every 2 minutes, mark inaudible sections as [inaudible]. Numbers 1–10 spelled out; 11+ use numerals.",
            },
            {
              q: "What is the difference between verbatim and non-verbatim transcription?",
              a: "Verbatim captures every spoken word exactly — including filler words (um, uh, like, you know), false starts, and stutters. Non-verbatim (clean verbatim) removes these for readability. Rev, GoTranscript, and Scribie use non-verbatim by default. Legal, research, or clinical transcription often requires full verbatim.",
            },
            {
              q: "How do I format a transcript for Rev?",
              a: "Remove filler words (um, uh, like), false starts, and stutters. Use [Speaker Name]: for speaker labels. Spell out numbers one through nine. Mark inaudible sections as [inaudible]. Mark overlapping speech as [crosstalk]. Use the Rev preset in this tool to apply all rules and get a QA compliance score before submitting.",
            },
            {
              q: "Can I upload my own client's style guide?",
              a: "Yes. Upload a PDF, DOCX, or TXT containing your client's transcription guidelines. The tool parses the document and generates editable rule cards. Adjust any rule before formatting — useful for clients with custom variations of standard platform rules.",
            },
            {
              q: "What is a QA compliance score?",
              a: "After formatting, the tool runs a checklist against the selected style guide and calculates what percentage of verifiable rules were applied correctly. Scores above 90% indicate the transcript is likely compliant. Flagged segments below the threshold are surfaced for manual review before export.",
            },
          ].map(({ q, a }) => (
            <div
              key={q}
              className="border-b border-gray-200 dark:border-gray-800 pb-6"
            >
              <dt className="font-semibold text-gray-900 dark:text-white text-base mb-2">
                {q}
              </dt>
              <dd className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                {a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── QA Workflow Section ── */}
      <section
        className="mx-auto max-w-3xl px-4 sm:px-component lg:px-8 py-12 sm:py-16 border-t border-gray-100 dark:border-gray-800"
        aria-label="Transcription QA workflow"
      >
        <h2 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-3">
          The 7-Stage Transcription QA Workflow
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          Professional transcription agencies and marketplace platforms use a
          structured QA pipeline before accepting deliverables. This tool
          automates stages 2 through 5 — the most time-consuming and error-prone
          steps for freelancers.
        </p>
        <ol className="space-y-0">
          {(
            [
              {
                stage: "1",
                title: "Draft transcript generation",
                detail:
                  "Raw transcript produced from audio — either AI-generated (Whisper, Otter, etc.) or a rough human first pass. At this stage the text is accurate but unformatted: speaker labels are inconsistent, filler words are present, punctuation is uneven.",
                label: "Manual / AI",
                blue: false,
              },
              {
                stage: "2",
                title: "Formatting pass",
                detail:
                  "Apply the client style guide: normalize speaker labels to the required format ([Speaker Name]: vs SPEAKER 1: vs Speaker 1:), correct number formatting (spell out one–nine, numerals for 10+), apply capitalization rules, normalize ellipsis and dash usage. VideoText automates this pass entirely based on the selected preset.",
                label: "Automated here",
                blue: true,
              },
              {
                stage: "3",
                title: "Filler word and verbatim cleanup",
                detail:
                  "Remove or retain filler words (um, uh, like, you know) based on the platform spec. Non-verbatim platforms (Rev, GoTranscript, Scribie) require removal unless fillers are meaningful. Full verbatim platforms retain every word. False starts and stutters are cleaned in this stage. VideoText applies the correct ruleset automatically per preset.",
                label: "Automated here",
                blue: true,
              },
              {
                stage: "4",
                title: "Speaker label consistency check",
                detail:
                  'Every speaker transition must be labeled. No speaker label should appear inconsistently — mixing "Speaker 1" and "SPK 1" for the same person is a common rejection reason on Rev and GoTranscript. VideoText flags all speaker label inconsistencies in the QA compliance report before export.',
                label: "Automated here",
                blue: true,
              },
              {
                stage: "5",
                title: "Timestamp validation",
                detail:
                  "GoTranscript requires timestamps every 2 minutes; TranscribeMe requires them every paragraph. VideoText validates that required timestamps are present, correctly formatted ([00:02:00] not 00:02:00), and fall on speaker turns rather than mid-sentence. Missing or malformed timestamps are flagged before export.",
                label: "Automated here",
                blue: true,
              },
              {
                stage: "6",
                title: "Human reviewer QA pass",
                detail:
                  "A human reviewer reads through the formatted transcript against the original audio. Focus areas: proper nouns the AI may have misheard, inaudible sections that need [inaudible] tags, and any segments flagged as below the QA confidence threshold. VideoText surfaces exactly which segments need manual review — no need to scan the whole document.",
                label: "Manual",
                blue: false,
              },
              {
                stage: "7",
                title: "Final submission",
                detail:
                  "Export in the required format: plain TXT for most marketplaces, DOCX for agency clients, SRT for caption deliverables. The QA compliance score documents that style guide rules were applied systematically — useful for agencies that need to demonstrate process to clients.",
                label: "Manual",
                blue: false,
              },
            ] as Array<{
              stage: string;
              title: string;
              detail: string;
              label: string;
              blue: boolean;
            }>
          ).map(({ stage, title, detail, label, blue }, i, arr) => (
            <li key={stage} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${blue ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}
                >
                  {stage}
                </span>
                {i < arr.length - 1 && (
                  <div className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-700 mb-1" />
                )}
              </div>
              <div className="pb-7 pt-0.5 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                    {title}
                  </h3>
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${blue ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
                  >
                    {label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Before / After Format Examples ── */}
      <section
        className="mx-auto max-w-3xl px-4 sm:px-component lg:px-8 py-12 sm:py-16 border-t border-gray-100 dark:border-gray-800"
        aria-label="Transcript formatting examples"
      >
        <h2 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-3">
          Raw → Formatted → Client-Ready: What the Formatter Actually Does
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-section leading-relaxed">
          These are realistic examples of what a raw AI-generated transcript
          looks like, what it looks like after formatting, and what the final
          client-ready output contains. Every transformation shown here is
          applied automatically.
        </p>
        <div className="space-y-section">
          {/* Example 1 — Rev non-verbatim */}
          <div className="space-y-component-sm">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Example: Rev non-verbatim format
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Raw AI output
                </p>
                <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{`spk_0: um so like the the thing that we uh found was that you know the results were uh really quite significant i mean we we ran it three times

spk_1: yeah yeah and and the second run was i think more more compelling right`}</pre>
              </div>
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400 mb-2">
                  After formatting pass
                </p>
                <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{`[Speaker 1]: The thing that we found was that the results were really quite significant. We ran it three times.

[Speaker 2]: Yeah, and the second run was more compelling, right?`}</pre>
              </div>
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 mb-2">
                  Client-ready (Rev spec)
                </p>
                <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{`[Speaker 1]: The thing we found was that the results were really quite significant. We ran it three times.

[Speaker 2]: Yeah, and the second run was more compelling, right?`}</pre>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  ✓ Fillers removed ✓ Labels formatted ✓ False starts cleaned
                </p>
              </div>
            </div>
          </div>

          {/* Example 2 — GoTranscript with timestamps */}
          <div className="space-y-component-sm">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Example: GoTranscript format with 2-minute timestamps
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Raw AI output
                </p>
                <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{`Speaker 1: so we launched in Q3 and uh the response was better than we thought

[00:02:14]

Speaker 1: the first 30 days we had 4,000 signups which is uh which is above projections`}</pre>
              </div>
              <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 dark:text-amber-400 mb-2">
                  After formatting pass
                </p>
                <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{`Speaker 1: We launched in Q3 and the response was better than we thought.

[00:02:14]

Speaker 1: The first 30 days we had 4,000 signups, which is above projections.`}</pre>
              </div>
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 mb-2">
                  Client-ready (GoTranscript spec)
                </p>
                <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{`Speaker 1: We launched in Q3 and the response was better than we thought.

[00:02:14]

Speaker 1: The first 30 days we had 4,000 signups, which is above projections.`}</pre>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  ✓ Fillers removed ✓ Timestamps validated ✓ Numerals correct
                </p>
              </div>
            </div>
          </div>

          {/* Example 3 — Full verbatim */}
          <div className="space-y-component-sm">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Example: Full verbatim (legal / research format)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  Raw AI output
                </p>
                <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{`spk_0: I- I wasn't at the location on that date. I mean, uh, I was definitely not there.`}</pre>
              </div>
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500 dark:text-emerald-400 mb-2">
                  Full verbatim output
                </p>
                <pre className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{`WITNESS: I-- I wasn't at the location on that date. I mean, uh, I was definitely not there.`}</pre>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  ✓ Fillers retained ✓ False starts formatted ✓ Label normalized
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Style Guide Comparison Table ── */}
      <section
        className="mx-auto max-w-4xl px-4 sm:px-component lg:px-8 py-12 sm:py-16 border-t border-gray-100 dark:border-gray-800"
        aria-label="Transcription platform style guide comparison"
      >
        <h2 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-3">
          Style Guide Comparison: Rev, GoTranscript, TranscribeMe, Scribie
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-section leading-relaxed">
          Every platform has a distinct style guide. Submitting to the wrong
          format is the leading cause of transcript rejection and reduced QA
          scores. This table documents the key formatting rules for each
          platform as of 2026.
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="py-3 px-4 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  Rule
                </th>
                <th className="py-3 px-4 text-left font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                  Rev
                </th>
                <th className="py-3 px-4 text-left font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                  GoTranscript
                </th>
                <th className="py-3 px-4 text-left font-semibold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                  TranscribeMe
                </th>
                <th className="py-3 px-4 text-left font-semibold text-amber-700 dark:text-amber-300 whitespace-nowrap">
                  Scribie
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {(
                [
                  [
                    "Verbatim type",
                    "Non-verbatim (clean)",
                    "Non-verbatim (clean)",
                    "Non-verbatim (clean)",
                    "Non-verbatim (clean)",
                  ],
                  [
                    "Filler words (um, uh)",
                    "Remove",
                    "Remove",
                    "Remove",
                    "Remove",
                  ],
                  ["False starts", "Remove", "Remove", "Remove", "Remove"],
                  [
                    "Speaker label format",
                    "[Speaker Name]:",
                    "Speaker 1:",
                    "[Speaker Name]",
                    "Speaker 1:",
                  ],
                  [
                    "Timestamps",
                    "Not required",
                    "Every 2 minutes",
                    "Every paragraph",
                    "Not required",
                  ],
                  [
                    "Timestamp format",
                    "N/A",
                    "[00:02:00]",
                    "[00:01:30]",
                    "N/A",
                  ],
                  [
                    "Numbers 1–9",
                    "Spell out",
                    "Spell out",
                    "Numerals",
                    "Spell out",
                  ],
                  [
                    "Numbers 10+",
                    "Numerals",
                    "Numerals",
                    "Numerals",
                    "Numerals",
                  ],
                  [
                    "Inaudible sections",
                    "[inaudible]",
                    "[inaudible]",
                    "[inaudible]",
                    "[inaudible]",
                  ],
                  [
                    "Crosstalk / overlap",
                    "[crosstalk]",
                    "[crosstalk]",
                    "[crosstalk]",
                    "[crosstalk]",
                  ],
                  [
                    "Profanity",
                    "Transcribe as spoken",
                    "Transcribe as spoken",
                    "Bleep optional",
                    "Transcribe as spoken",
                  ],
                  [
                    "QA strictness",
                    "High — automated scoring",
                    "Medium — manual review",
                    "High — automated scoring",
                    "Medium — manual review",
                  ],
                  [
                    "Typical rejection cause",
                    "Retained fillers, wrong label format",
                    "Missing timestamps",
                    "Numeral inconsistency",
                    "Retained fillers",
                  ],
                ] as string[][]
              ).map(([rule, rev, gt, tm, scribie]) => (
                <tr
                  key={rule}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {rule}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {rev}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {gt}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {tm}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {scribie}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
          Style guide details verified against platform documentation. Rules may
          be updated by platforms without notice — always check the current
          platform guidelines for final submissions.
        </p>
      </section>

      {/* ── Technical Validation Section ── */}
      <section
        className="mx-auto max-w-3xl px-4 sm:px-component lg:px-8 py-12 sm:py-16 border-t border-gray-100 dark:border-gray-800"
        aria-label="How transcript format validation works"
      >
        <h2 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-3">
          How the Format Validation Engine Works
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-section leading-relaxed">
          The QA compliance score is not a spell-checker. It runs a structured
          checklist against the selected style guide, detects specific rule
          violations, and surfaces exactly which segments need manual review —
          not the entire document.
        </p>
        <div className="space-y-component-sm">
          {[
            {
              title: "Speaker label consistency detection",
              body: "The validator scans every speaker-attributed line and checks that: (1) the label format matches the selected preset exactly, (2) the same speaker is not referred to by two different label strings, and (3) no speaker turn is missing a label. Inconsistent labels — the most common QA rejection reason on Rev and GoTranscript — are flagged individually with the problematic label shown.",
            },
            {
              title: "Filler word presence check",
              body: "For non-verbatim presets, the engine scans for retained filler words (um, uh, like, you know, kind of, sort of) and flags any that were not removed during the formatting pass. Fillers inside quoted speech or technical terms are excluded from flagging. Each flagged filler is linked to the segment it appears in for one-click navigation.",
            },
            {
              title: "Timestamp integrity validation",
              body: "For formats that require timestamps (GoTranscript every 2 min, TranscribeMe every paragraph), the validator checks that: timestamps are present at required intervals, the format matches the platform spec exactly ([HH:MM:SS] vs HH:MM:SS), and timestamps fall on speaker turn boundaries rather than mid-sentence. Missing or misplaced timestamps are flagged by position in the transcript.",
            },
            {
              title: "Formatting conflict detection",
              body: 'Some editing decisions create conflicts: a speaker label that appears in both short and long form within the same document, a number rendered as both a word and a numeral within a paragraph, or punctuation that violates the selected preset. The validator surfaces these as "needs review" flags rather than treating them as outright errors, since some conflicts are intentional.',
            },
            {
              title: "Subtitle-safe formatting checks (for SRT/VTT export)",
              body: "When the input is a subtitle file (SRT or VTT), the validator additionally checks: no subtitle cue exceeds 42 characters per line, no more than 2 lines per cue, no overlapping timestamps between adjacent cues, and correct decimal separator in timestamps (comma for SRT, period for VTT). Subtitle-specific failures are surfaced separately from transcript-level formatting issues.",
            },
            {
              title: "QA confidence score interpretation",
              body: "The confidence score represents the percentage of verifiable checklist items that passed. Scores above 90% indicate the transcript is likely compliant for submission. Scores between 70–90% mean flagged issues remain — review the flagged segments before submitting. Scores below 70% indicate systematic formatting issues that likely require re-running the formatter with corrected rule settings.",
            },
          ].map(({ title, body }) => (
            <article
              key={title}
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-5 shadow-sm"
            >
              <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Professional Transcriptionist Section ── */}
      <section
        className="mx-auto max-w-3xl px-4 sm:px-component lg:px-8 py-12 sm:py-16 border-t border-gray-100 dark:border-gray-800"
        aria-label="For professional transcriptionists"
      >
        <h2 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white mb-3">
          Built for Professional Transcriptionists, Not Just Beginners
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-section leading-relaxed">
          If you work on Rev, GoTranscript, TranscribeMe, or Scribie — or
          deliver transcripts for agencies and direct clients — this tool was
          designed around your specific workflow problems.
        </p>
        <div className="space-y-component">
          {[
            {
              heading: "The repetitive formatting problem",
              body: "Experienced transcriptionists spend 20–40% of their working time on formatting tasks that have nothing to do with listening accuracy: normalizing speaker labels, removing fillers, fixing number formats, adding timestamps. These are mechanical rules applied identically to every document. This tool handles all of them in a single pass so you can focus on the parts that require human judgment — catching mishears, marking inaudibles, handling ambiguous speech.",
            },
            {
              heading: "Submission rejection: the real cost",
              body: "A rejected submission on Rev or GoTranscript does not just cost the time to fix and resubmit. It impacts your quality score, which affects job availability and pay rates on the platform. The most common rejection causes — retained filler words, wrong speaker label format, missing timestamps — are all checkable before submission. The QA compliance score tells you whether these issues exist before you click submit.",
            },
            {
              heading: "Custom client guides, not just platform presets",
              body: "Agency clients and direct clients often have their own style guides that differ from marketplace standards. Some clients want timestamps every paragraph. Some require INTERVIEWER: / RESPONDENT: rather than speaker numbers. Some have custom verbatim rules for specific terminology. Upload your client's style guide as a PDF, DOCX, or TXT file and the tool will parse it into editable rule cards. Adjust any card before running the formatter.",
            },
            {
              heading: "The two-tool workflow for maximum throughput",
              body: "The highest-output professional transcription workflow combines AI first-pass transcription with style guide formatting: (1) transcribe audio with VideoText — the full transcript, including speaker labels, is generated in minutes; (2) paste the output into this formatter; (3) select your platform preset; (4) review flagged segments only. This workflow cuts total time-per-file by 60–80% compared to transcribing manually from scratch, while keeping human review in the loop for the segments that need it.",
            },
            {
              heading: "Caption and subtitle delivery",
              body: "If you deliver SRT or VTT files alongside or instead of plain transcripts — for captioning clients, media companies, or platforms — this tool handles the subtitle formatting pass as well. Paste your SRT or VTT content directly: the formatter preserves timestamp structure, applies verbatim rules to caption text, validates line length against broadcast standards, and exports in caption-ready format. The QA report includes subtitle-specific checks for overlapping timestamps and character limits.",
            },
          ].map(({ heading, body }) => (
            <div
              key={heading}
              className="border-l-2 border-blue-200 dark:border-blue-800 pl-5"
            >
              <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                {heading}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand-specific guideline pages hub */}
      <section
        className="mx-auto max-w-4xl px-4 sm:px-component lg:px-8 py-12 sm:py-16 border-t border-gray-100 dark:border-gray-800"
        aria-label="Transcription service style guides"
      >
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-medium text-gray-900 dark:text-white">
            Platform-Specific Transcription Style Guides
          </h2>
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-7 max-w-2xl">
          Start with the guides that already get search traffic — GoTranscript,
          Scribie, Verbit, TranscribeMe, and Rev — then format your file to
          those rules in one click on this page.
        </p>
        {[
          {
            brand: "Rev",
            color: "blue",
            links: [
              {
                label: "Rev Transcript Guidelines",
                path: "/rev-transcript-guidelines",
              },
              { label: "Rev Format Guide", path: "/rev-transcription-format" },
              { label: "Rev Style Guide", path: "/rev-style-guide" },
              {
                label: "Rev Captioning Guidelines",
                path: "/rev-captioning-guidelines",
              },
              {
                label: "Rev Requirements",
                path: "/rev-transcription-requirements",
              },
              {
                label: "Rev AI Transcription Guide",
                path: "/rev-ai-transcription-guide",
              },
            ],
          },
          {
            brand: "GoTranscript",
            color: "green",
            links: [
              {
                label: "GoTranscript Guidelines",
                path: "/gotranscript-guidelines",
              },
              {
                label: "GoTranscript Format",
                path: "/gotranscript-transcription-format",
              },
              {
                label: "GoTranscript Style Guide",
                path: "/gotranscript-style-guide",
              },
              {
                label: "GoTranscript Rules",
                path: "/gotranscript-transcription-rules",
              },
              {
                label: "GoTranscript Test Guide",
                path: "/gotranscript-test-guide",
              },
            ],
          },
          {
            brand: "TranscribeMe",
            color: "blue",
            links: [
              {
                label: "TranscribeMe Guidelines",
                path: "/transcribeme-guidelines",
              },
              {
                label: "TranscribeMe Style",
                path: "/transcribeme-transcription-style",
              },
              {
                label: "TranscribeMe Format Guide",
                path: "/transcribeme-format-guide",
              },
              {
                label: "TranscribeMe Style Guide",
                path: "/transcribeme-style-guide",
              },
              {
                label: "TranscribeMe Exam Guide",
                path: "/transcribeme-exam-guide",
              },
            ],
          },
          {
            brand: "Scribie",
            color: "orange",
            links: [
              {
                label: "Scribie Guidelines",
                path: "/scribie-transcription-guidelines",
              },
              { label: "Scribie Format Guide", path: "/scribie-format-guide" },
              { label: "Scribie Rules", path: "/scribie-transcription-rules" },
              { label: "Scribie Style Guide", path: "/scribie-style-guide" },
            ],
          },
          {
            brand: "Daily Transcripts",
            color: "teal",
            links: [
              {
                label: "Daily Transcripts Guidelines",
                path: "/daily-transcripts-guidelines",
              },
              {
                label: "Daily Transcripts Format",
                path: "/daily-transcripts-format-guide",
              },
              {
                label: "Daily Transcripts Style",
                path: "/daily-transcripts-style-guide",
              },
            ],
          },
          {
            brand: "Transcribio",
            color: "blue",
            links: [
              {
                label: "Transcribio Guidelines",
                path: "/transcribio-guidelines",
              },
              {
                label: "Transcribio Format Guide",
                path: "/transcribio-format-guide",
              },
              {
                label: "Transcribio Style Guide",
                path: "/transcribio-style-guide",
              },
            ],
          },
          {
            brand: "Verbit",
            color: "slate",
            links: [
              {
                label: "Verbit Guidelines",
                path: "/verbit-transcription-guidelines",
              },
              { label: "Verbit Format Guide", path: "/verbit-format-guide" },
            ],
          },
          {
            brand: "Speechpad",
            color: "red",
            links: [
              {
                label: "Speechpad Guidelines",
                path: "/speechpad-transcription-guidelines",
              },
              {
                label: "Speechpad Format Guide",
                path: "/speechpad-format-guide",
              },
            ],
          },
          {
            brand: "Happy Scribe",
            color: "yellow",
            links: [
              {
                label: "Happy Scribe Guidelines",
                path: "/happy-scribe-transcription-guidelines",
              },
              {
                label: "Happy Scribe Format Guide",
                path: "/happy-scribe-format-guide",
              },
            ],
          },
          {
            brand: "3Play Media",
            color: "cyan",
            links: [
              {
                label: "3Play Media Guidelines",
                path: "/3play-media-transcription-guidelines",
              },
              {
                label: "3Play Media Format Guide",
                path: "/3play-media-format-guide",
              },
            ],
          },
          {
            brand: "GMR Transcription",
            color: "emerald",
            links: [
              {
                label: "GMR Transcription Guidelines",
                path: "/gmr-transcription-guidelines",
              },
              {
                label: "GMR Format Guide",
                path: "/gmr-transcript-format-guide",
              },
            ],
          },
        ].map(({ brand, links }) => (
          <div key={brand} className="mb-component">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              {brand}
            </h3>
            <div className="flex flex-wrap gap-2">
              {links.map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
                >
                  {label}
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
