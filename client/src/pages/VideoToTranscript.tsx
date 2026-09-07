import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  FileText,
  FileCode,
  Download,
  Lock,
  Search,
  X,
  Layers,
  Sparkles,
  FolderArchive,
  AlertCircle,
  Loader2,
  ChevronRight,
  Gem,
  Upload,
  CheckCircle2,
  Languages,
  Pencil,
  Copy as CopyIcon,
} from "lucide-react";
import FailedState from "../components/FailedState";
import CoreToolSeoDepth from "../components/CoreToolSeoDepth";
import { MakeClientReadyTranscriptButton } from "../components/SuccessState";
import SamplesModule from "../components/SamplesModule";
// import WorkflowChainSuggestion from '../components/WorkflowChainSuggestion'
import PaywallModal, { type PaywallReason } from "../components/PaywallModal";
import UpgradeBanner from "../components/UpgradeBanner";
import FreePlanNudge from "../components/FreePlanNudge";
import JobAuthGateModal from "../components/JobAuthGateModal";
import { isLoggedIn } from "../lib/auth";
import { isPaidPlan as hasPaidPlan } from "../lib/plans";
import { ToolLayout } from "../components/figma/ToolLayout";
import { UploadZone } from "../components/figma/UploadZone";
import { ProcessingInterface } from "../components/figma/ProcessingInterface";
import { ProcessingProgress } from "../components/figma/ProcessingProgress";
import { ResultSkeleton } from "../components/figma/ResultSkeleton";
import TranscriptSharePanel from "../components/TranscriptSharePanel";
import SpeakerSegmentsPanel from "../components/videoTranscript/SpeakerSegmentsPanel";
import PinnedAudioPlayerBar from "../components/transcript/PinnedAudioPlayerBar";
import { getActiveSegmentIndexAtTime } from "../lib/segmentSync";
import { incrementUsage } from "../lib/usage";
import {
  uploadFileWithProgress,
  getJobStatus,
  getJobDeferredSummary,
  subscribeJobStatus,
  getCurrentUsage,
  invalidateUsageCache,
  getConnectionProbeIfNeeded,
  BACKEND_TOOL_TYPES,
  SessionExpiredError,
  getUserFacingMessage,
  isNetworkError,
  POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS,
  getAuthToken,
  submitYoutubeUrl,
  isYoutubeUrl,
  claimGuestJob,
  uploadBatch,
  getBatchStatus,
  getBatchDownloadUrl,
  type YoutubeUploadResponse,
  type BatchStatus,
} from "../lib/api";
import { getFailureMessage } from "../lib/failureMessage";
import { checkVideoPreflight } from "../lib/uploadPreflight";
import {
  getFilePreview,
  formatDuration,
  type FilePreviewData,
} from "../lib/filePreview";
import {
  getJobLifecycleTransition,
  JOB_POLL_INTERVAL_MS,
} from "../lib/jobPolling";
import { API_ORIGIN, getAbsoluteDownloadUrl, getApiBase } from "../lib/apiBase";
import { LANGUAGES, languageToCode } from "../lib/languages";
import {
  exportFileStem,
  joinExportFilename,
  langCodeForFile,
  targetLangFileSlug,
  transcriptExportName,
} from "../lib/exportFileNames";
import {
  persistJobId,
  getPersistedJobId,
  getPersistedJobToken,
  clearPersistedJobId,
  clearPersistedJobIdInPlace,
} from "../lib/jobSession";
import { trackAppEvent } from "../lib/feedbackEvents";
import { trackEvent, trackFirstOutputSeen } from "../lib/analytics";
// import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import {
  formatTimestamp,
  type Segment,
  segmentsToSrt,
  segmentsToVtt,
} from "../lib/srtExport";
import { WATERMARK_DOC_FOOTER, watermarkTextExport } from "../lib/watermark";
import { addAnchorTimecode } from "../lib/smpteTimecode";
import {
  type SpeakerNameMap,
  type TimestampMode,
  type VerbatimMode,
  withResolvedSpeakers,
  buildTxt,
  buildCsv,
  buildJson,
  buildNotion,
  saveEditsToStorage,
  loadEditsFromStorage,
  computeTranscriptHash,
  exportToPdf,
  exportToDocx,
  exportToDocxThreeColumn,
  exportToPdfThreeColumn,
  applyCleanVerbatim,
} from "../lib/transcriptExport";
import toast from "react-hot-toast";
// import { useWorkflow } from '../contexts/WorkflowContext'
// import { emitToolCompleted } from '../workflow/workflowStore'

// ─── Phase 1 – Derived Transcript Utilities (client-side only) ─────────────────
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "can",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "what",
  "which",
  "who",
  "when",
  "where",
  "why",
  "how",
]);

const ACTIVATION_CARD_DISMISS_KEY = "vt:first-activation-card-dismissed";

/** Matches server `batchEnabled` (Pro, Business, Agency, founding_workflow — not Basic). */
function batchUploadEligible(): boolean {
  if (typeof window === "undefined") return false;
  const p = (localStorage.getItem("plan") || "free").toLowerCase();
  return ["pro", "agency", "business", "founding_workflow"].includes(p);
}

const SIGNUP_STARTED_AT_KEY = "videotext:signup_started_at";
const JOB_COMPLETED_COUNT_KEY = "videotext:job_completed_count";
const EXPORT_PREFS_KEY = "vt:transcript_export_prefs";

/** Optional SEO overrides for alternate entry points (e.g. /video-to-text, /youtube-transcript-generator). Do NOT duplicate logic here. */
export type VideoToTranscriptSeoProps = {
  seoH1?: string;
  seoIntro?: string;
  faq?: { q: string; a: string }[];
  /** Open YouTube URL tab by default (for /youtube-transcript-generator SEO pages). */
  defaultInputMode?: "file" | "youtube";
  seoDeepContent?: {
    proofPoints?: string[];
    workflowSteps?: { title: string; detail: string }[];
    outputExamples?: { title: string; body: string }[];
    comparisonRows?: {
      feature: string;
      videotext: string;
      alternatives: string;
    }[];
    useCases?: { title: string; body: string }[];
    visualProof?: { title: string; body: string; image?: string }[];
    technicalExplanation?: { title: string; body: string }[];
    ctaText?: string;
    ctaPath?: string;
  };
};

export default function VideoToTranscript(
  props: VideoToTranscriptSeoProps = {},
) {
  const {
    seoIntro,
    faq = [],
    seoDeepContent,
    defaultInputMode = "file",
  } = props;
  const location = useLocation();
  const navigate = useNavigate();
  const autoStartQuery = useMemo(
    () => new URLSearchParams(location.search).get("auto_start"),
    [location.search],
  );
  const autoStartEnabled = useMemo(
    () => autoStartQuery !== "false",
    [autoStartQuery],
  );
  const sourceParam = useMemo(
    () => new URLSearchParams(location.search).get("source") || "",
    [location.search],
  );
  const sourceMessage = useMemo(() => {
    if (sourceParam === "google-meet") {
      return {
        title: "Google Meet recording flow",
        body: "Download your Google Meet recording file first, then upload it here to generate transcript text, subtitles, and summary outputs.",
      };
    }
    if (sourceParam === "zoom-meeting") {
      return {
        title: "Zoom meeting recording flow",
        body: "Download your Zoom recording (cloud or local) and upload it here to generate transcript text, subtitles, and meeting recap outputs.",
      };
    }
    if (sourceParam === "meeting-recording") {
      return {
        title: "Meeting recording upload flow",
        body: "Upload your downloaded meeting recording file (Zoom, Meet, Teams, webinar) to generate transcript text, subtitle exports, and summary outputs.",
      };
    }
    if (sourceParam === "buzz-alternative") {
      return {
        title: "Buzz alternative workflow",
        body: "Upload your recording here to get transcript, summary, and subtitle-ready outputs without local model setup or desktop app installs.",
      };
    }
    if (
      sourceParam === "trint-alternative" ||
      sourceParam === "rev-alternative" ||
      sourceParam === "notta-alternative" ||
      sourceParam === "otter-alternative" ||
      sourceParam === "fireflies-alternative"
    ) {
      const labels: Record<string, string> = {
        "trint-alternative": "Trint",
        "rev-alternative": "Rev",
        "notta-alternative": "Notta",
        "otter-alternative": "Otter",
        "fireflies-alternative": "Fireflies",
      };
      const source = labels[sourceParam] || "competitor";
      return {
        title: `${source} switch workflow`,
        body: `Upload your recording here to test the same file in VideoText and compare transcript quality, summary depth, chapters, and export outputs in one run.`,
      };
    }
    return null;
  }, [sourceParam]);
  const getFunnelProps = useCallback((source: string) => {
    const plan = (localStorage.getItem("plan") || "free").toLowerCase();
    const signupAt = localStorage.getItem(SIGNUP_STARTED_AT_KEY);
    const jobCount = Number(
      localStorage.getItem(JOB_COMPLETED_COUNT_KEY) || "0",
    );
    const hoursSinceSignup = signupAt
      ? Math.max(
          0,
          Math.round((Date.now() - new Date(signupAt).getTime()) / 36e5),
        )
      : null;
    return {
      plan,
      source,
      job_count: Number.isFinite(jobCount) ? jobCount : 0,
      ...(hoursSinceSignup != null
        ? {
            hours_since_signup: hoursSinceSignup,
            cohort_date: signupAt?.slice(0, 10),
          }
        : {}),
    };
  }, []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [trimStart, setTrimStart] = useState<number | null>(null);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [uploadZoneVisible, setUploadZoneVisible] = useState(true);
  const uploadZoneRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "processing">(
    "uploading",
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<{
    downloadUrl: string;
    fileName?: string;
    segments?: { start: number; end: number; text: string; speaker?: string }[];
    summary?: { summary: string; bullets: string[]; actionItems?: string[] };
    chapters?: { title: string; startTime: number; endTime?: number }[];
    audioUrl?: string;
  } | null>(null);
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [fullTranscript, setFullTranscript] = useState("");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeChapters, setIncludeChapters] = useState(true);
  const [exportFormats, setExportFormats] = useState<
    ("txt" | "json" | "docx" | "pdf")[]
  >(["txt"]);
  const [timestampMode, setTimestampMode] =
    useState<TimestampMode>("per-interval");
  const [verbatimMode, setVerbatimMode] = useState<VerbatimMode>("full");
  const [intervalSec, setIntervalSec] = useState(30);
  // SMPTE / BITC timecode mode — opt-in only, off unless the user explicitly
  // selects it under Timestamp format. Manual starting timecode + frame rate,
  // same one-time entry the user already does in tools like ExpressScribe;
  // VideoText then computes every segment's timecode deterministically from it.
  // Four separate numeric fields (not free-text HH:MM:SS:FF) so there's no
  // ambiguous parsing of hand-typed colons/semicolons.
  const [smpteAnchorH, setSmpteAnchorH] = useState(0);
  const [smpteAnchorM, setSmpteAnchorM] = useState(0);
  const [smpteAnchorS, setSmpteAnchorS] = useState(0);
  const [smpteAnchorF, setSmpteAnchorF] = useState(0);
  const [smpteFpsChoice, setSmpteFpsChoice] = useState("25");
  // Text-only translation panel state
  const [textTranslateOpen, setTextTranslateOpen] = useState(false);
  const [textTranslateInput, setTextTranslateInput] = useState("");
  const [textTranslateLang, setTextTranslateLang] = useState("Spanish");
  const [textTranslateResult, setTextTranslateResult] = useState("");
  const [textTranslating, setTextTranslating] = useState(false);
  const [speakerDiarization, setSpeakerDiarization] = useState(false);
  const [diarizationWasRequested, setDiarizationWasRequested] = useState(false);
  const [numSpeakers, setNumSpeakers] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [glossary, setGlossary] = useState("");
  /** Parses "29.97-df" / "29.97-ndf" / "25" etc. into { fps, dropFrame }. */
  const { smpteFps, smpteDropFrame } = useMemo(() => {
    const [ratePart, flag] = smpteFpsChoice.split("-");
    return { smpteFps: parseFloat(ratePart) || 25, smpteDropFrame: flag === "df" };
  }, [smpteFpsChoice]);
  /** "HH:MM:SS:FF" (or ";FF" for drop-frame) built from the four numeric fields — no free-text parsing. */
  const smpteAnchor = useMemo(() => {
    const pad = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");
    const sep = smpteDropFrame ? ";" : ":";
    return `${pad(smpteAnchorH)}:${pad(smpteAnchorM)}:${pad(smpteAnchorS)}${sep}${pad(smpteAnchorF)}`;
  }, [smpteAnchorH, smpteAnchorM, smpteAnchorS, smpteAnchorF, smpteDropFrame]);
  const [searchQuery, setSearchQuery] = useState("");
  const [transcriptEditMode, setTranscriptEditMode] = useState(false);
  const [editableSegments, setEditableSegments] = useState<Segment[] | null>(
    null,
  );
  /** Maps raw backend speaker labels ("SPEAKER_00") → user-defined names ("Alice"). */
  const [speakerNameMap, setSpeakerNameMap] = useState<SpeakerNameMap>({});
  /** Timestamp of the last successful localStorage save — drives the "Saved" indicator. */
  const [editsSavedAt, setEditsSavedAt] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"signup-combo" | "login">(
    "signup-combo",
  );
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null);
  const [hasCompletedJobs, setHasCompletedJobs] = useState<boolean | null>(
    null,
  );
  const [activationCardDismissed, setActivationCardDismissed] = useState(false);
  const activationWizardShownTrackedRef = useRef(false);
  const hasTrackedFirstOutputRef = useRef(false);
  const [queuePosition, setQueuePosition] = useState<number | undefined>(
    undefined,
  );
  const [isSummaryHydrating, setIsSummaryHydrating] = useState(false);
  const [isRehydrating, setIsRehydrating] = useState(false);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(
    null,
  );
  const [, setElapsedMs] = useState(0);
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null);
  const [, setConnectionSpeed] = useState<
    "fast" | "medium" | "slow" | undefined
  >(undefined);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [fileFromWorkflow, setFileFromWorkflow] = useState(false);
  /**
   * Authoritative account plan (from GET /api/usage/current), used for export/watermark/
   * copy-lock entitlement — same source of truth as FreePlanNudge/UpgradeBanner. Not
   * localStorage: localStorage can be stale or tampered with and must not gate paid
   * features. Defaults to "not paid" until the first fetch resolves.
   */
  const [accountPlan, setAccountPlan] = useState<string | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  /** Results workspace: main reading column (Transcript vs Speakers). Summary / chapters / exports live in the sidebar. */
  const [leftWorkspaceTab, setLeftWorkspaceTab] = useState<
    "transcript" | "speakers"
  >("transcript");
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(
    null,
  );
  const [translatedCache, setTranslatedCache] = useState<
    Record<string, string>
  >({});
  const [translateEnabled, setTranslateEnabled] = useState(false);
  const [transcriptView, setTranscriptView] = useState<
    "original" | "translated"
  >("original");
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const segmentRefsRef = useRef<Map<number, HTMLSpanElement>>(new Map());
  const speakerSegmentRefsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  // Audio playback for transcript sync
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioPlaybackTimeRef = useRef(0); // updated at timeupdate frequency without triggering re-renders
  const scrubberRef = useRef<HTMLInputElement>(null);
  const timeDisplayRef = useRef<HTMLSpanElement>(null);
  const durationDisplayRef = useRef<HTMLSpanElement>(null);
  const volumeSliderRef = useRef<HTMLInputElement>(null);
  const [activeSegIdx, setActiveSegIdx] = useState(-1); // re-renders only when segment boundary crosses
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const uploadCompletedAtRef = useRef<number | null>(null);
  const autoStartTriggeredForFileRef = useRef<string | null>(null);
  const shouldAutoStartNextFileRef = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXPORT_PREFS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as {
        t?: TimestampMode;
        v?: VerbatimMode;
        i?: number;
      };
      if (
        p.t &&
        ["per-speaker", "per-segment", "per-interval", "none"].includes(p.t)
      )
        setTimestampMode(p.t);
      if (p.v && ["full", "clean"].includes(p.v)) setVerbatimMode(p.v);
      if (p.i && p.i > 0) setIntervalSec(p.i);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        EXPORT_PREFS_KEY,
        JSON.stringify({ t: timestampMode, v: verbatimMode, i: intervalSec }),
      );
    } catch {
      /* ignore */
    }
  }, [timestampMode, verbatimMode, intervalSec]);
  const syncScrubberFill = useCallback(() => {
    const el = scrubberRef.current;
    if (!el) return;
    const max = parseFloat(el.max) || 1;
    const val = parseFloat(el.value) || 0;
    el.style.setProperty(
      "--fill",
      `${Math.min(100, Math.max(0, (val / max) * 100))}%`,
    );
  }, []);
  const syncVolumeFill = useCallback(() => {
    const el = volumeSliderRef.current;
    if (!el) return;
    const v = parseFloat(el.value);
    const pct = Number.isFinite(v) ? v * 100 : 0;
    el.style.setProperty("--fill", `${Math.min(100, Math.max(0, pct))}%`);
  }, []);

  useEffect(() => {
    if (!audioObjectUrl) return;
    syncVolumeFill();
  }, [audioObjectUrl, audioVolume, syncVolumeFill]);

  // Desktop performance fix: track upload zone visibility for sticky CTA
  useEffect(() => {
    if (!uploadZoneRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setUploadZoneVisible(entry.isIntersecting);
      },
      { threshold: 0.1 },
    );
    observer.observe(uploadZoneRef.current);
    return () => observer.disconnect();
  }, []);

  const handlePlaybackTime = useCallback(
    (t: number) => {
      audioPlaybackTimeRef.current = t;
      const segs = result?.segments;
      if (segs?.length) {
        const newIdx = getActiveSegmentIndexAtTime(segs, t);
        setActiveSegIdx((prev) => (prev === newIdx ? prev : newIdx));
      }
    },
    [result?.segments],
  );

  const rehydratePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeUploadPollRef = useRef<(() => void) | null>(null);
  const pollConsecutiveNetworkErrorsRef = useRef(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const jobStartedTrackedRef = useRef<string | null>(null);
  const processingStartedAtRef = useRef<number | null>(null);
  const terminalRef = useRef(false);
  const lastPartialVersionRef = useRef(0);
  const partialScrollRef = useRef<HTMLDivElement>(null);
  const savedScrollTopRef = useRef(0);
  const scrollRestoreRafRef = useRef<{ first: number; second: number }>({
    first: 0,
    second: 0,
  });
  /** Phase 6: when we first show partial transcript (for min stream visibility delay). */
  const partialFirstSeenAtRef = useRef<number | null>(null);
  const minStreamDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const uploadTimelineFirstRenderLoggedRef = useRef(false);
  const [partialSegments, setPartialSegments] = useState<
    { start: number; end: number; text: string; speaker?: string }[]
  >([]);
  /** Free plan: number of export downloads used for this transcript (max 2, with watermark). */
  const [freeExportsUsed, setFreeExportsUsed] = useState(0);
  /** Free plan: number of clipboard copies used this session (max 3). */
  const [freeCopiesUsed, setFreeCopiesUsed] = useState(0);
  /** Reason to show in PaywallModal — set before opening the modal. */
  const [paywallReason, setPaywallReason] = useState<PaywallReason | undefined>(
    undefined,
  );
  /** Set on job_completed for "Processed in XX.Xs" badge (UI only). */
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null);
  /** Contextual failure message (from getFailureMessage); shown in FailedState and Tex. */
  const [failedMessage, setFailedMessage] = useState<string | undefined>(
    undefined,
  );
  // Batch processing state (multi-file Pro mode)
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchInfo, setBatchInfo] = useState<BatchStatus | null>(null);
  const batchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Monotonic max % so the bar never steps backward if the API briefly returns a stale count. */
  const batchPctPeakRef = useRef(0);
  const [isBatchStarting, setIsBatchStarting] = useState(false);
  /** Optional: translate subtitle exports per video (ISO codes via languageToCode). */
  const [batchTranslateLanguage, setBatchTranslateLanguage] =
    useState<string>("");
  const [batchSpeakerDiarization, setBatchSpeakerDiarization] = useState(false);
  /** Whisper / batch job language (ISO code via languageToCode). */
  const [batchPrimaryLanguage, setBatchPrimaryLanguage] = useState("English");

  /** ISO-ish tag for original-language exports (batch uses chosen spoken language; single-file uses auto-detect). */
  const exportSourceLangCode = useMemo(() => {
    if (isBatchMode) return languageToCode(batchPrimaryLanguage) || "auto";
    return undefined;
  }, [isBatchMode, batchPrimaryLanguage]);

  // ── YouTube URL input mode ──────────────────────────────────────────────────
  /** 'file' = drag-and-drop upload, 'youtube' = URL paste. Persists while idle. */
  // YouTube URL mode is temporarily disabled — always file upload
  const [inputMode] = useState<"file" | "youtube">(defaultInputMode);
  /** Raw value of the YouTube URL text field. */
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  /** Metadata returned by the server after enqueueing the job (no extra round-trip). */
  const [youtubeDisplayTitle, setYoutubeDisplayTitle] = useState<string | null>(
    null,
  );
  const [youtubeThumbnailUrl, setYoutubeThumbnailUrl] = useState<string | null>(
    null,
  );
  const [youtubeDurationSec, setYoutubeDurationSec] = useState<number | null>(
    null,
  );
  /** Current stage of the YouTube pipeline (set from job status polling). */
  const [youtubeStage, setYoutubeStage] = useState<
    import("../lib/api").YoutubeJobStage | null
  >(null);
  /** Last stage before failure — used to generate a contextual error message. */
  const youtubeStageAtFailureRef = useRef<
    import("../lib/api").YoutubeJobStage | null
  >(null);

  // Reset free export count when user gets a new result (e.g. process another file)
  useEffect(() => {
    setFreeExportsUsed(0);
  }, [result?.downloadUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActivationCardDismissed(
      localStorage.getItem(ACTIVATION_CARD_DISMISS_KEY) === "1",
    );
    // Restore user output-format preferences
    const savedTs = localStorage.getItem(
      "vt:timestampMode",
    ) as TimestampMode | null;
    if (
      savedTs &&
      ["per-speaker", "per-segment", "per-interval", "none"].includes(savedTs)
    ) {
      setTimestampMode(savedTs);
    }
    const savedVb = localStorage.getItem(
      "vt:verbatimMode",
    ) as VerbatimMode | null;
    if (savedVb && ["full", "clean"].includes(savedVb))
      setVerbatimMode(savedVb);
    const savedIs = localStorage.getItem("vt:intervalSec");
    if (savedIs) {
      const n = parseInt(savedIs, 10);
      if (Number.isFinite(n) && n > 0) setIntervalSec(n);
    }
  }, []);

  // Persist output-format preferences whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("vt:timestampMode", timestampMode);
    } catch {
      /* ignore */
    }
  }, [timestampMode]);
  useEffect(() => {
    try {
      localStorage.setItem("vt:verbatimMode", verbatimMode);
    } catch {
      /* ignore */
    }
  }, [verbatimMode]);
  useEffect(() => {
    try {
      localStorage.setItem("vt:intervalSec", String(intervalSec));
    } catch {
      /* ignore */
    }
  }, [intervalSec]);

  // Soft upgrade nudge: show remaining free imports before users hit the hard paywall.
  useEffect(() => {
    getCurrentUsage({ skipCache: true })
      .then((data) => {
        if (data.quotaType !== "imports") {
          setHasCompletedJobs(false);
          return;
        }
        const used = data.used ?? data.usage?.importCount ?? 0;
        setHasCompletedJobs(used > 0);
      })
      .catch(() => {
        setHasCompletedJobs(null);
      });
  }, []);

  // Upload-to-first-word timeline: log firstRender when partialSegments first paints
  useEffect(() => {
    if (
      partialSegments.length === 0 ||
      uploadTimelineFirstRenderLoggedRef.current
    )
      return;
    uploadTimelineFirstRenderLoggedRef.current = true;
    requestAnimationFrame(() => {
      const t =
        typeof window !== "undefined"
          ? (window as any).__uploadTimeline
          : undefined;
      if (t) t.firstRender = Date.now();
      if (t) {
        console.log("[UPLOAD_TIMELINE]", {
          uploadStart: t.uploadStart,
          upload100: t.upload100,
          uploadCompleteResponse: t.uploadCompleteResponse,
          sseStart: t.sseStart,
          firstSseMessage: t.firstSseMessage,
          firstPartialReceived: t.firstPartialReceived,
          firstRender: t.firstRender,
        });
      }
    });
  }, [partialSegments.length]);

  // Instant file preview (browser only); persists through upload + processing
  useEffect(() => {
    if (!selectedFile) {
      setFilePreview(null);
      return;
    }
    let cancelled = false;
    getFilePreview(selectedFile).then((p) => {
      if (!cancelled) setFilePreview(p);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  // Object URL for trim preview in Figma ProcessingInterface (revoke on cleanup after clearing so no ERR_FILE_NOT_FOUND)
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith("video/")) {
      const url = URL.createObjectURL(selectedFile);
      setVideoPreviewUrl(url);
      return () => {
        setVideoPreviewUrl(null);
        const u = url;
        setTimeout(() => URL.revokeObjectURL(u), 0);
      };
    }
    setVideoPreviewUrl(null);
  }, [selectedFile]);

  // Audio for transcript panel playback — use server-transcoded AAC so every browser and
  // every input format (WebM, AVI, MOV, MKV, AC3, DTS, …) works, including Safari.
  // Must use API origin when VITE_API_URL points at a separate host (relative /api/audio would 404 on the SPA origin).
  useEffect(() => {
    if (status === "completed" && result?.audioUrl) {
      setAudioObjectUrl(getAbsoluteDownloadUrl(result.audioUrl));
      setActiveSegIdx(-1);
      setAudioIsPlaying(false);
      audioPlaybackTimeRef.current = 0;
      if (scrubberRef.current) {
        scrubberRef.current.value = "0";
        scrubberRef.current.style.setProperty("--fill", "0%");
      }
      if (timeDisplayRef.current)
        timeDisplayRef.current.textContent = formatTimestamp(0);
      if (durationDisplayRef.current)
        durationDisplayRef.current.textContent = formatTimestamp(0);
      return () => {
        setAudioObjectUrl(null);
      };
    }
    setAudioObjectUrl(null);
    setActiveSegIdx(-1);
    setAudioIsPlaying(false);
    audioPlaybackTimeRef.current = 0;
  }, [result?.audioUrl, status]);

  useEffect(() => {
    if (status !== "completed" || !currentJobId) {
      setIsSummaryHydrating(false);
      return;
    }
    if (
      result?.summary?.summary ||
      (result?.summary?.bullets?.length ?? 0) > 0
    ) {
      setIsSummaryHydrating(false);
      return;
    }
    let cancelled = false;
    setIsSummaryHydrating(true);
    const jobToken = getPersistedJobToken(location.pathname) || undefined;
    const poll = async () => {
      try {
        const deferred = await getJobDeferredSummary(
          currentJobId,
          jobToken ? { jobToken } : undefined,
        );
        if (cancelled) return;
        if (deferred.summary || deferred.chapters) {
          setResult((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              ...(deferred.summary
                ? {
                    summary: deferred.summary as {
                      summary: string;
                      bullets: string[];
                      actionItems?: string[];
                    },
                  }
                : {}),
              ...(deferred.chapters ? { chapters: deferred.chapters } : {}),
            };
          });
          setIsSummaryHydrating(false);
        }
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          cancelled = true;
          setIsSummaryHydrating(false);
          setCurrentJobId(null);
          clearPersistedJobId(location.pathname, navigate);
          return;
        }
        // Keep polling until summary is ready.
      }
    };
    void poll();
    const timer = setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status, currentJobId, location.pathname, result?.summary]);

  // Sync editable segments from result. Preserve speaker field so exports can apply speaker names.
  // Restore from localStorage when the same job is reopened (zero-server-retention: edits stay on device).
  useEffect(() => {
    if (result?.segments?.length) {
      // Hash the original segments so we can reject stale edits if the transcript was re-processed.
      const hash = computeTranscriptHash(result.segments);
      const saved = currentJobId
        ? loadEditsFromStorage(currentJobId, hash)
        : null;
      if (saved?.segments?.length === result.segments.length) {
        setEditableSegments(saved.segments);
        setSpeakerNameMap(saved.speakerNameMap ?? {});
      } else {
        setEditableSegments(
          result.segments.map((s) => ({
            start: s.start,
            end: s.end,
            text: s.text,
            speaker: s.speaker,
          })),
        );
        setSpeakerNameMap({});
      }
    } else {
      setEditableSegments(null);
      setSpeakerNameMap({});
    }
    setEditsSavedAt(null);
    setTranscriptEditMode(false);
  }, [result?.segments, currentJobId]);

  // Auto-save edits to localStorage (debounced 1.5 s) — zero server retention.
  // Keyed by jobId so edits survive page refresh without any server round-trip.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentJobId || !editableSegments?.length) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const hash = result?.segments
        ? computeTranscriptHash(result.segments)
        : "0";
      saveEditsToStorage(currentJobId, editableSegments, speakerNameMap, hash);
      setEditsSavedAt(Date.now());
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editableSegments, speakerNameMap, currentJobId, result?.segments]);

  /** Rename a speaker: maps raw backend label → user-defined name. */
  const handleRenameSpeaker = useCallback(
    (rawSpeaker: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      setSpeakerNameMap((prev) => ({ ...prev, [rawSpeaker]: trimmed }));
    },
    [],
  );

  // Elapsed time ticker when processing (cleanup on unmount/complete/fail)
  useEffect(() => {
    if (status !== "processing" || !processingStartedAt) {
      setElapsedMs(0);
      return;
    }
    const tick = () => setElapsedMs(Date.now() - processingStartedAt);
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [status, processingStartedAt]);

  // Reset translation when transcript result changes
  useEffect(() => {
    if (!translateEnabled) {
      setTranslationLanguage(null);
    }
    setTranslatedCache({});
    setTranscriptView("original");
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-translate transcript when enabled and transcript text becomes available
  useEffect(() => {
    if (!translateEnabled || !translationLanguage || !fullTranscript.trim())
      return;
    if (translatedCache[translationLanguage]) return; // already translated
    const token = getAuthToken();
    fetch(`${getApiBase()}/api/translate-transcript/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        text: fullTranscript,
        targetLanguage: translationLanguage,
      }),
    })
      .then((r) => r.json())
      .then(({ translatedText }: { translatedText?: string }) => {
        if (translatedText) {
          setTranslatedCache((prev) => ({
            ...prev,
            [translationLanguage]: translatedText,
          }));
        }
      })
      .catch(() => {});
  }, [fullTranscript, translateEnabled, translationLanguage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore scroll position when transitioning from partial to completed transcript.
  // Double rAF so we run after DOM/layout has stabilized (avoids jump when height changes).
  useEffect(() => {
    if (status !== "completed" || !result) return;
    const saved = savedScrollTopRef.current;
    if (saved <= 0) return;
    scrollRestoreRafRef.current.first = requestAnimationFrame(() => {
      scrollRestoreRafRef.current.second = requestAnimationFrame(() => {
        if (transcriptScrollRef.current) {
          transcriptScrollRef.current.scrollTop = saved;
        }
      });
    });
    return () => {
      cancelAnimationFrame(scrollRestoreRafRef.current.first);
      cancelAnimationFrame(scrollRestoreRafRef.current.second);
    };
  }, [status, result]);

  // Rehydrate from URL/sessionStorage after idle or reload (e.g. mobile Safari)
  useEffect(() => {
    const pathname = location.pathname;
    const jobId = getPersistedJobId(pathname);
    if (!jobId) return;

    terminalRef.current = false;
    lastPartialVersionRef.current = 0;
    setStatus("processing");
    setUploadPhase("processing");
    setUploadProgress(100);
    setCurrentJobId(jobId);
    setIsRehydrating(true);
    setProcessingStartedAt(Date.now());
    setPartialSegments([]);

    const jobToken = getPersistedJobToken(pathname);
    let cancelled = false;
    const run = async () => {
      try {
        const jobStatus = await getJobStatus(
          jobId,
          jobToken ? { jobToken } : undefined,
        );
        if (cancelled) return;
        pollConsecutiveNetworkErrorsRef.current = 0;
        setIsRehydrating(false);
        setProgress(jobStatus.progress ?? 0);
        if (jobStatus.queuePosition !== undefined)
          setQueuePosition(jobStatus.queuePosition);

        const transition = getJobLifecycleTransition(jobStatus);
        if (transition === "completed") {
          terminalRef.current = true;
          setPartialSegments([]);
          setStatus("completed");
          setResult(jobStatus.result ?? null);
          trackAppEvent("transcription_completed", {
            toolId: "video-to-transcript",
          });
          // emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript' })
          setUploadPhase("processing");
          setUploadProgress(100);
          const res = jobStatus.result;
          if (isLoggedIn()) {
            if (res?.segments?.length) {
              const textFromSegments = res.segments
                .map((s: { text: string }) => s.text)
                .join("\n\n");
              setFullTranscript(textFromSegments);
              setTranscriptPreview(textFromSegments.substring(0, 500));
            } else if (res?.downloadUrl) {
              try {
                const transcriptResponse = await fetch(
                  getAbsoluteDownloadUrl(res.downloadUrl),
                );
                const transcriptText = await transcriptResponse.text();
                setTranscriptPreview(transcriptText.substring(0, 500));
                setFullTranscript(transcriptText);
              } catch {
                // ignore (e.g. ZIP file)
              }
            }
          }
          invalidateUsageCache();
          getCurrentUsage({ skipCache: true })
            .then((data) => {
              const isImports = data.quotaType === "imports";
              const total = isImports
                ? (data.limit ?? 3)
                : data.limits.minutesPerMonth + data.overages.minutes;
              setAvailableMinutes(total);
            })
            .catch(() => {});
          return;
        }
        if (transition === "failed") {
          terminalRef.current = true;
          setPartialSegments([]);
          setIsRehydrating(false);
          setStatus("failed");
          toast.error("Processing failed. Please try again.");
          clearPersistedJobId(pathname, navigate);
          return;
        }
        if (
          jobStatus.status === "processing" &&
          jobStatus.partialSegments?.length
        ) {
          const version = jobStatus.partialVersion ?? 0;
          if (
            version > lastPartialVersionRef.current ||
            lastPartialVersionRef.current === 0
          ) {
            lastPartialVersionRef.current = Math.max(
              version,
              lastPartialVersionRef.current,
            );
            setPartialSegments(jobStatus.partialSegments);
          }
        }
        // Resume polling for queued/processing
        setStatus("processing");
        setUploadPhase("processing");
        setUploadProgress(100);
        const doPoll = async () => {
          if (cancelled) return;
          try {
            if (terminalRef.current) return;
            const s = await getJobStatus(
              jobId,
              jobToken ? { jobToken } : undefined,
            );
            if (cancelled) return;
            if (terminalRef.current) return;
            setProgress(s.progress ?? 0);
            if (s.queuePosition !== undefined)
              setQueuePosition(s.queuePosition);
            const t = getJobLifecycleTransition(s);
            if (t === "completed") {
              terminalRef.current = true;
              if (rehydratePollRef.current)
                clearInterval(rehydratePollRef.current);
              rehydratePollRef.current = null;
              setPartialSegments([]);
              setStatus("completed");
              setResult(s.result ?? null);
              trackAppEvent("transcription_completed", {
                toolId: "video-to-transcript",
              });
              // emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript' })
              if (isLoggedIn()) {
                if (s.result?.segments?.length) {
                  const textFromSegments = s.result.segments
                    .map((seg: { text: string }) => seg.text)
                    .join("\n\n");
                  setFullTranscript(textFromSegments);
                  setTranscriptPreview(textFromSegments.substring(0, 500));
                } else if (s.result?.downloadUrl) {
                  try {
                    const res = await fetch(
                      getAbsoluteDownloadUrl(s.result.downloadUrl),
                    );
                    const text = await res.text();
                    setTranscriptPreview(text.substring(0, 500));
                    setFullTranscript(text);
                  } catch {
                    // ignore
                  }
                }
              }
              invalidateUsageCache();
              getCurrentUsage({ skipCache: true })
                .then((data) => {
                  const isImports = data.quotaType === "imports";
                  const total = isImports
                    ? (data.limit ?? 3)
                    : data.limits.minutesPerMonth + data.overages.minutes;
                  setAvailableMinutes(total);
                })
                .catch(() => {});
            } else if (t === "failed") {
              terminalRef.current = true;
              setPartialSegments([]);
              if (rehydratePollRef.current)
                clearInterval(rehydratePollRef.current);
              rehydratePollRef.current = null;
              setIsRehydrating(false);
              setStatus("failed");
              toast.error("Processing failed. Please try again.");
              clearPersistedJobId(pathname, navigate);
            } else if (s.status === "processing" && s.partialSegments?.length) {
              const version = s.partialVersion ?? 0;
              if (
                version > lastPartialVersionRef.current ||
                lastPartialVersionRef.current === 0
              ) {
                lastPartialVersionRef.current = Math.max(
                  version,
                  lastPartialVersionRef.current,
                );
                setPartialSegments(s.partialSegments);
              }
            }
          } catch (err) {
            if (err instanceof SessionExpiredError) {
              if (rehydratePollRef.current)
                clearInterval(rehydratePollRef.current);
              rehydratePollRef.current = null;
              clearPersistedJobId(pathname, navigate);
              toast.error(err.message);
            } else if (isNetworkError(err)) {
              pollConsecutiveNetworkErrorsRef.current += 1;
              if (
                pollConsecutiveNetworkErrorsRef.current >=
                POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS
              ) {
                if (rehydratePollRef.current)
                  clearInterval(rehydratePollRef.current);
                rehydratePollRef.current = null;
                setIsRehydrating(false);
                toast.error(
                  "Server unreachable. Start the backend and refresh the page.",
                );
              }
            }
          }
        };
        pollConsecutiveNetworkErrorsRef.current = 0;
        rehydratePollRef.current = setInterval(doPoll, JOB_POLL_INTERVAL_MS);
        doPoll();
      } catch (err) {
        if (cancelled) return;
        setIsRehydrating(false);
        if (err instanceof SessionExpiredError) {
          clearPersistedJobId(pathname, navigate);
          toast.error(err.message);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
      if (rehydratePollRef.current) clearInterval(rehydratePollRef.current);
      rehydratePollRef.current = null;
    };
  }, [location.pathname, navigate]);

  // Remind user to keep tab open when they switch away during upload (helps mobile)
  useEffect(() => {
    if (uploadPhase !== "uploading") return;
    const onVisibility = () => {
      if (document.hidden)
        toast("Keep this tab open until the upload finishes.", {
          icon: "📤",
          duration: 4000,
        });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [uploadPhase]);

  // const workflow = useWorkflow()

  // useEffect(() => {
  //   const state = location.state as { useWorkflowVideo?: boolean } | undefined
  //   if (state?.useWorkflowVideo && workflow.videoFile) {
  //     setSelectedFile(workflow.videoFile)
  //     setFileFromWorkflow(true)
  //   }
  // }, [location.state, workflow.videoFile])

  // Pick up a file dropped on the landing page hero dropzone
  useEffect(() => {
    const w = window as Window & { __videotextPendingFile?: File };
    if (w.__videotextPendingFile) {
      setSelectedFile(w.__videotextPendingFile);
      shouldAutoStartNextFileRef.current = true;
      delete w.__videotextPendingFile;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep workflow in sync when result is shown so "Next step" links pre-fill the file on the next tool
  // useEffect(() => {
  //   if (status === 'completed' && selectedFile) workflow.setVideo(selectedFile)
  // }, [status, selectedFile])

  // Show auth gate immediately when job completes for non-logged-in users.
  useEffect(() => {
    if (status === "completed" && !isLoggedIn()) {
      setShowAuthGate(true);
      setShowAuthModal(true);
    }
  }, [status]);

  useEffect(() => {
    try {
      const key = "videotext:activation_wizard_shown";
      if (localStorage.getItem(key) === "1") return;
      trackEvent(
        "activation_wizard_shown",
        getFunnelProps("video_to_transcript"),
      );
      localStorage.setItem(key, "1");
    } catch {
      // non-blocking
    }
  }, [getFunnelProps]);

  const handleFileSelect = (file: File) => {
    try {
      trackEvent("file_selected", {
        tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
        file_size_bytes: file.size,
      });
    } catch {
      // non-blocking
    }
    // workflow.setVideo(file)
    setSelectedFile(file);
    shouldAutoStartNextFileRef.current = false;
    setFileFromWorkflow(false);
    setTrimStart(null);
    setTrimEnd(null);
  };

  const handleFilesSelect = (files: File[]) => {
    if (files.length <= 1) {
      if (files.length === 1) handleFileSelect(files[0]);
      return;
    }
    if (!batchUploadEligible()) {
      handleFileSelect(files[0]);
      toast(
        "Batch upload is on Pro and Business — upgrade to process multiple videos at once.",
        { icon: "📦", duration: 5500 },
      );
      return;
    }
    setBatchFiles(files.slice(0, 20));
    setIsBatchMode(true);
    setSelectedFile(null);
  };

  const handleProcessBatch = async () => {
    if (batchFiles.length === 0 || isBatchStarting) return;
    const paid =
      typeof window !== "undefined" &&
      (localStorage.getItem("plan") || "free").toLowerCase() !== "free";
    if (currentJobId || getPersistedJobId(location.pathname)) {
      clearPersistedJobIdInPlace(location.pathname);
      setCurrentJobId(null);
    }
    if (batchPollRef.current) {
      clearInterval(batchPollRef.current);
      batchPollRef.current = null;
    }
    batchPctPeakRef.current = 0;
    setIsBatchStarting(true);
    try {
      const extraLangs =
        batchTranslateLanguage && paid
          ? [languageToCode(batchTranslateLanguage)]
          : [];
      const primaryCode =
        languageToCode(batchPrimaryLanguage || "English") || "en";
      const res = await uploadBatch(batchFiles, primaryCode, extraLangs, {
        speakerDiarization: paid && batchSpeakerDiarization,
        ...(extraLangs.length > 0 ? { additionalLanguages: extraLangs } : {}),
      });
      const batchId = res.batchId;
      if (!batchId) throw new Error("Batch upload did not return a batchId");
      try {
        trackEvent("batch_job_created", {
          file_count: batchFiles.length,
          tool: "video-to-transcript",
        });
      } catch {
        // non-blocking
      }
      setBatchInfo({
        batchId,
        status: "queued",
        progress: {
          total: batchFiles.length,
          completed: 0,
          failed: 0,
          percentage: 0,
        },
        estimatedTimeRemaining: 0,
        errors: [],
      });
      setStatus("processing");
      const poll = setInterval(async () => {
        try {
          const s = await getBatchStatus(batchId);
          const pct = Math.max(batchPctPeakRef.current, s.progress.percentage);
          batchPctPeakRef.current = pct;
          setBatchInfo({ ...s, progress: { ...s.progress, percentage: pct } });
          if (
            s.status === "completed" ||
            s.status === "partial" ||
            s.status === "failed"
          ) {
            clearInterval(poll);
            batchPollRef.current = null;
            setStatus("completed");
          }
        } catch {
          // ignore transient poll errors
        }
      }, 3000);
      batchPollRef.current = poll;
    } catch {
      toast.error("Failed to start batch processing. Please try again.");
    } finally {
      setIsBatchStarting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (batchPollRef.current) {
        clearInterval(batchPollRef.current);
        batchPollRef.current = null;
      }
    };
  }, []);

  const handleCancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }
    if (activeUploadPollRef.current) {
      activeUploadPollRef.current();
      activeUploadPollRef.current = null;
    }
    if (currentJobId) {
      clearPersistedJobId(location.pathname, navigate);
      setCurrentJobId(null);
      setStatus("idle");
      setUploadPhase("uploading");
      setUploadProgress(0);
      setProgress(0);
      toast(
        "Cancelled. You can upload a new file; the previous job may still complete in the background.",
        { icon: "ℹ️", duration: 5000 },
      );
    } else if (status === "processing" && uploadPhase === "uploading") {
      setStatus("idle");
      setUploadPhase("uploading");
      setUploadProgress(0);
      setProgress(0);
      toast("Cancelled. You can try again or upload a different file.");
    }
  };

  const handleProcess = async (
    trimStartPercent?: number,
    trimEndPercent?: number,
    startMode: "auto" | "manual" = "manual",
  ) => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    const durationSeconds = filePreview?.durationSeconds ?? 0;
    // Only apply trim when user actually moved handles away from the default full-range (0/100).
    // ProcessingInterface always passes (0, 100) when untouched; treating that as "no trim"
    // prevents files whose duration is misreported by the browser (e.g. large WAV) from being
    // incorrectly truncated to the browser's partial duration estimate.
    const hasTrim =
      trimStartPercent != null &&
      trimEndPercent != null &&
      (trimStartPercent !== 0 || trimEndPercent !== 100);
    const trimStartSec = hasTrim
      ? (durationSeconds * trimStartPercent!) / 100
      : trimStart;
    const trimEndSec = hasTrim
      ? (durationSeconds * trimEndPercent!) / 100
      : trimEnd;

    // Quota check: imports for free/pro, minutes for grandfathered legacy plans
    let usageData: Awaited<ReturnType<typeof getCurrentUsage>> | null = null;
    try {
      usageData = await getCurrentUsage();
      const isImports = usageData.quotaType === "imports";
      const totalAvailable = isImports
        ? (usageData.limit ?? 3)
        : usageData.limits.minutesPerMonth + usageData.overages.minutes;
      const used = isImports
        ? (usageData.used ?? usageData.usage?.importCount ?? 0)
        : usageData.usage.totalMinutes;
      setAvailableMinutes(totalAvailable);
      const atOrOverLimit = isImports
        ? used >= (usageData.limit ?? 3)
        : totalAvailable > 0 && used >= totalAvailable;
      if (atOrOverLimit) {
        setShowPaywall(true);
        trackEvent("upgrade_prompt_seen", getFunnelProps("quota_gate"));
        return;
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    let connectionSpeedResult: "fast" | "medium" | "slow" | undefined;
    try {
      setStatus("processing");
      setUploadPhase("uploading");
      setUploadProgress(0);
      setProgress(0);
      uploadAbortRef.current = new AbortController();
      setCurrentJobId(null);

      const limits = usageData?.limits
        ? {
            maxFileSize: usageData.limits.maxFileSize,
            maxVideoDuration: usageData.limits.maxVideoDuration,
          }
        : {};
      const probePromise = getConnectionProbeIfNeeded(selectedFile);
      const [preflight, probeResult] = await Promise.all([
        checkVideoPreflight(selectedFile, limits),
        probePromise ?? Promise.resolve(null),
      ]);
      connectionSpeedResult = probeResult ?? undefined;
      setConnectionSpeed(connectionSpeedResult);
      if (!preflight.allowed) {
        uploadAbortRef.current = null;
        setStatus("idle");
        const isDurationLimit = preflight.maxDurationMinutes !== undefined;
        if (isDurationLimit) {
          setPaywallReason("VIDEO_TOO_LONG");
          setShowPaywall(true);
        } else {
          toast.error(preflight.reason ?? "Video exceeds plan limits.");
        }
        trackEvent("upgrade_prompt_seen", {
          ...getFunnelProps("preflight"),
          reason: preflight.reason ?? "plan_limit",
        });
        try {
          trackEvent("file_validation_failed", {
            tool: "video-to-transcript",
            reason: preflight.reason ?? "plan_limit",
            validation_type: "preflight",
          });
        } catch {
          // non-blocking
        }
        return;
      }
    } catch (e) {
      uploadAbortRef.current = null;
      setStatus("idle");
      toast.error("Could not validate video. Try again.");
      try {
        trackEvent("file_validation_failed", {
          tool: "video-to-transcript",
          reason: "probe_failed",
          validation_type: "preflight",
        });
      } catch {
        // non-blocking
      }
      return;
    }

    try {
      const _isPaid =
        typeof window !== "undefined" &&
        (localStorage.getItem("plan") || "free").toLowerCase() !== "free";
      // Speaker labels are a Pro-only feature (paid Replicate diarization cost per job) —
      // the server re-checks plan too, but never ask for it on free plan in the first place.
      const diarizationEnabledForJob = _isPaid && speakerDiarization;
      const baseOptions: Parameters<typeof uploadFileWithProgress>[1] = {
        toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
        trimmedStart: trimStartSec ?? trimStart ?? undefined,
        trimmedEnd: trimEndSec ?? trimEnd ?? undefined,
        includeSummary: _isPaid ? includeSummary : false,
        includeChapters: _isPaid ? includeChapters : false,
        exportFormats:
          exportFormats.length > 0 ? exportFormats : (["txt"] as const),
        language: selectedLanguage
          ? languageToCode(selectedLanguage) || undefined
          : undefined,
        speakerDiarization: diarizationEnabledForJob,
        numSpeakers:
          diarizationEnabledForJob && numSpeakers
            ? Number(numSpeakers)
            : undefined,
        diarizationLanguage: diarizationEnabledForJob
          ? selectedLanguage
            ? languageToCode(selectedLanguage) || undefined
            : undefined
          : undefined,
        glossary: glossary.trim() || undefined,
      };
      setDiarizationWasRequested(diarizationEnabledForJob);
      setUploadPhase("uploading");
      const uploadProps = getFunnelProps("file_upload");
      trackEvent("upload_started", uploadProps);
      trackAppEvent("upload_started", uploadProps);
      trackEvent("processing_started", { tool: "video-to-transcript" });

      if (typeof window !== "undefined") (window as any).__uploadTimeline = {};
      if (typeof window !== "undefined")
        (window as any).__uploadTimeline.uploadStart = Date.now();
      uploadTimelineFirstRenderLoggedRef.current = false;
      const response = await uploadFileWithProgress(selectedFile, baseOptions, {
        onProgress: (p) => setUploadProgress(p),
        connectionSpeed: connectionSpeedResult,
        signal: uploadAbortRef.current?.signal,
      });

      const tl =
        typeof window !== "undefined"
          ? (window as any).__uploadTimeline
          : undefined;
      uploadAbortRef.current = null;
      uploadCompletedAtRef.current = Date.now();
      try {
        trackEvent("upload_completed", {
          tool: "video-to-transcript",
          file_size_bytes: selectedFile.size,
          upload_progress_pct: 100,
          start_mode: startMode,
          auto_start_enabled: autoStartEnabled,
        });
      } catch {
        // non-blocking
      }
      setCurrentJobId(response.jobId);
      persistJobId(location.pathname, response.jobId, response.jobToken);
      setUploadPhase("processing");
      setUploadProgress(100);
      terminalRef.current = false;
      lastPartialVersionRef.current = 0;
      partialFirstSeenAtRef.current = null;
      if (minStreamDelayTimeoutRef.current) {
        clearTimeout(minStreamDelayTimeoutRef.current);
        minStreamDelayTimeoutRef.current = null;
      }
      setPartialSegments([]);
      const startedAt = Date.now();
      setProcessingStartedAt(startedAt);
      processingStartedAtRef.current = startedAt;
      // texJobStarted()

      // Status updates: first poll immediately, then SSE (with polling fallback) for lower latency.
      const jobToken = response.jobToken;
      const handleJobStatus = (jobStatus: import("../lib/api").JobStatus) => {
        if (terminalRef.current) return;
        setProgress(jobStatus.progress ?? 0);
        if (jobStatus.queuePosition !== undefined)
          setQueuePosition(jobStatus.queuePosition);
        if (
          jobStatus.status === "processing" &&
          jobStartedTrackedRef.current !== response.jobId
        ) {
          jobStartedTrackedRef.current = response.jobId;
          const uploadCompletedAt = uploadCompletedAtRef.current;
          const uploadToJobStartMs =
            uploadCompletedAt != null
              ? Date.now() - uploadCompletedAt
              : undefined;
          if (startMode === "auto") {
            trackEvent("transcription_autostarted", {
              tool: "video-to-transcript",
              job_id: response.jobId,
              upload_to_job_start_ms: uploadToJobStartMs,
            });
          } else {
            trackEvent("transcription_manual_started", {
              tool: "video-to-transcript",
              job_id: response.jobId,
              upload_to_job_start_ms: uploadToJobStartMs,
            });
          }
          try {
            trackEvent("job_started", {
              job_id: response.jobId,
              tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
            });
          } catch {
            // non-blocking
          }
        }
        const transition = getJobLifecycleTransition(jobStatus);
        if (transition === "completed") {
          terminalRef.current = true;
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current();
            activeUploadPollRef.current = null;
          }
          jobStartedTrackedRef.current = null;
          savedScrollTopRef.current = partialScrollRef.current?.scrollTop ?? 0;
          const MIN_STREAM_VISIBILITY_MS = 8000;
          const res = jobStatus.result;
          const streamProgress =
            res &&
            typeof (res as { streamProgress?: boolean }).streamProgress ===
              "boolean" &&
            (res as { streamProgress?: boolean }).streamProgress;
          const firstSeenAt = partialFirstSeenAtRef.current;
          const remainingMs =
            streamProgress && firstSeenAt != null
              ? MIN_STREAM_VISIBILITY_MS - (Date.now() - firstSeenAt)
              : 0;
          const applyCompletedTransition = () => {
            minStreamDelayTimeoutRef.current = null;
            setPartialSegments([]);
            setStatus("completed");
            setResult(jobStatus.result ?? null);
            trackAppEvent("transcription_completed", {
              toolId: "video-to-transcript",
            });
            const started = processingStartedAtRef.current ?? Date.now();
            const processingMs = Date.now() - started;
            // emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript', processingMs })
            if (isLoggedIn()) {
              if (res?.segments?.length) {
                const textFromSegments = res.segments
                  .map((s: { text: string }) => s.text)
                  .join("\n\n");
                setFullTranscript(textFromSegments);
                setTranscriptPreview(textFromSegments.substring(0, 500));
              } else if (res?.downloadUrl) {
                try {
                  fetch(getAbsoluteDownloadUrl(res.downloadUrl))
                    .then((transcriptResponse) => transcriptResponse.text())
                    .then((transcriptText) => {
                      setTranscriptPreview(transcriptText.substring(0, 500));
                      setFullTranscript(transcriptText);
                    })
                    .catch(() => {});
                } catch {
                  // Ignore
                }
              }
            }
            incrementUsage("video-to-transcript");
            setHasCompletedJobs(true);
            setActivationCardDismissed(true);
            try {
              localStorage.setItem(ACTIVATION_CARD_DISMISS_KEY, "1");
            } catch {
              // Ignore storage failures
            }
            invalidateUsageCache();
            const refreshUsage = () => {
              getCurrentUsage({ skipCache: true })
                .then((data) => {
                  const isImports = data.quotaType === "imports";
                  const total = isImports
                    ? (data.limit ?? 3)
                    : data.limits.minutesPerMonth + data.overages.minutes;
                  setAvailableMinutes(total);
                })
                .catch(() => {});
            };
            refreshUsage();
            setTimeout(refreshUsage, 800);
            try {
              trackEvent("job_completed", {
                job_id: response.jobId,
                tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
                processing_time_ms: processingMs,
                ...getFunnelProps("file_upload"),
              });
              const nextJobCount =
                (Number(localStorage.getItem(JOB_COMPLETED_COUNT_KEY) || "0") ||
                  0) + 1;
              localStorage.setItem(
                JOB_COMPLETED_COUNT_KEY,
                String(nextJobCount),
              );
              trackFirstOutputSeen({
                ...getFunnelProps("result_panel"),
                job_count: nextJobCount,
              });
              trackAppEvent("first_output_seen", {
                ...getFunnelProps("result_panel"),
                job_count: nextJobCount,
              });
              trackEvent("processing_completed", {
                tool: "video-to-transcript",
              });
              // texJobCompleted(processingMs, 'video-to-transcript')
              setLastProcessingMs(processingMs);
            } catch {
              // non-blocking
            }
          };
          if (remainingMs > 0) {
            minStreamDelayTimeoutRef.current = setTimeout(() => {
              void applyCompletedTransition();
            }, remainingMs);
          } else {
            void applyCompletedTransition();
          }
        } else if (transition === "failed") {
          terminalRef.current = true;
          setPartialSegments([]);
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current();
            activeUploadPollRef.current = null;
          }
          const msg = getFailureMessage({
            fileSizeBytes: selectedFile?.size,
            mimeType: selectedFile?.type,
            remainingMinutes: availableMinutes ?? undefined,
            planQuotaMinutes: availableMinutes ?? undefined,
            durationMinutes:
              filePreview?.durationSeconds != null
                ? filePreview.durationSeconds / 60
                : undefined,
          });
          setFailedMessage(msg);
          setStatus("failed");
          // texJobFailed(msg)
          try {
            const errorType =
              msg?.includes("quota") || msg?.includes("longer than")
                ? "quota_exceeded"
                : msg?.includes("codec") || msg?.includes("Unsupported")
                  ? "unsupported_format"
                  : "processing_failed";
            trackEvent("processing_error_shown", {
              tool: "video-to-transcript",
              error_type: errorType,
              job_id: response.jobId,
            });
          } catch {
            // non-blocking
          }
          toast.error("Processing failed. Please try again.");
        } else if (
          jobStatus.status === "processing" &&
          jobStatus.partialVersion != null &&
          jobStatus.partialVersion > lastPartialVersionRef.current
        ) {
          lastPartialVersionRef.current = jobStatus.partialVersion;
          if (jobStatus.partialSegments?.length) {
            const t =
              typeof window !== "undefined"
                ? (window as any).__uploadTimeline
                : undefined;
            if (t && t.firstPartialReceived == null)
              t.firstPartialReceived = Date.now();
            if (partialFirstSeenAtRef.current === null)
              partialFirstSeenAtRef.current = Date.now();
            setPartialSegments(jobStatus.partialSegments);
          }
        }
      };
      const doPoll = async () => {
        try {
          if (terminalRef.current) return;
          const jobStatus = await getJobStatus(
            response.jobId,
            jobToken ? { jobToken } : undefined,
          );
          if (terminalRef.current) return;
          pollConsecutiveNetworkErrorsRef.current = 0;
          handleJobStatus(jobStatus);
        } catch (error: any) {
          if (isNetworkError(error)) {
            pollConsecutiveNetworkErrorsRef.current += 1;
            if (
              pollConsecutiveNetworkErrorsRef.current >=
              POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS
            ) {
              if (activeUploadPollRef.current) {
                activeUploadPollRef.current();
                activeUploadPollRef.current = null;
              }
              toast.error(
                "Server unreachable. Start the backend and refresh the page.",
              );
            }
          }
        }
      };
      pollConsecutiveNetworkErrorsRef.current = 0;
      if (tl) tl.sseStart = Date.now();
      doPoll().then(() => {
        if (terminalRef.current) return;
        activeUploadPollRef.current = subscribeJobStatus(
          response.jobId,
          jobToken ? { jobToken } : undefined,
          handleJobStatus,
        );
      });
    } catch (error: any) {
      uploadAbortRef.current = null;
      if (error instanceof Error && error.message === "Upload cancelled") {
        setStatus("idle");
        setUploadPhase("uploading");
        setUploadProgress(0);
        setCurrentJobId(null);
        return;
      }
      if (error instanceof SessionExpiredError) {
        clearPersistedJobId(location.pathname, navigate);
        setStatus("idle");
      } else {
        const msg = getFailureMessage({
          fileSizeBytes: selectedFile?.size,
          mimeType: selectedFile?.type,
          isNetworkError: isNetworkError(error),
        });
        setFailedMessage(msg);
        setStatus("failed");
        // texJobFailed(msg)
        const errorMsg = error instanceof Error ? error.message : "";
        const isFileTooLarge =
          errorMsg.includes("plan limit") ||
          errorMsg.includes("Upgrade for larger");
        const isUnsupportedFormat =
          errorMsg.includes("codec") ||
          errorMsg.includes("Unsupported") ||
          errorMsg.includes("not supported");
        if (isFileTooLarge || isUnsupportedFormat) {
          try {
            trackEvent("file_validation_failed", {
              tool: "video-to-transcript",
              reason: errorMsg.slice(0, 120),
              validation_type: isFileTooLarge
                ? "file_too_large"
                : "unsupported_format",
            });
          } catch {
            // non-blocking
          }
        }
        try {
          const errorType = isNetworkError(error)
            ? "network_error"
            : isUnsupportedFormat
              ? "unsupported_format"
              : isFileTooLarge
                ? "file_too_large"
                : "upload_failed";
          trackEvent("processing_error_shown", {
            tool: "video-to-transcript",
            error_type: errorType,
          });
        } catch {
          // non-blocking
        }
      }
      toast.error(getUserFacingMessage(error));
    }
  };

  useEffect(() => {
    if (
      !autoStartEnabled ||
      !shouldAutoStartNextFileRef.current ||
      status !== "idle" ||
      !selectedFile
    )
      return;
    const fileKey = `${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}`;
    if (autoStartTriggeredForFileRef.current === fileKey) return;
    autoStartTriggeredForFileRef.current = fileKey;
    shouldAutoStartNextFileRef.current = false;
    void handleProcess(undefined, undefined, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartEnabled, selectedFile, status]);

  // ── YouTube submission ──────────────────────────────────────────────────────
  const handleProcessYoutube = async () => {
    const url = youtubeUrlInput.trim();
    if (!url) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    if (!isYoutubeUrl(url)) {
      toast.error("Please enter a valid YouTube URL (youtube.com or youtu.be)");
      return;
    }
    const _isPaid =
      typeof window !== "undefined" &&
      (localStorage.getItem("plan") || "free").toLowerCase() !== "free";

    // Quota check (mirrors handleProcess)
    let usageData: Awaited<ReturnType<typeof getCurrentUsage>> | null = null;
    try {
      usageData = await getCurrentUsage();
      const isImports = usageData.quotaType === "imports";
      const totalAvailable = isImports
        ? (usageData.limit ?? 3)
        : usageData.limits.minutesPerMonth + usageData.overages.minutes;
      const used = isImports
        ? (usageData.used ?? usageData.usage?.importCount ?? 0)
        : usageData.usage.totalMinutes;
      setAvailableMinutes(totalAvailable);
      const atOrOverLimit = isImports
        ? used >= (usageData.limit ?? 3)
        : totalAvailable > 0 && used >= totalAvailable;
      if (atOrOverLimit) {
        setShowPaywall(true);
        trackEvent("upgrade_prompt_seen", getFunnelProps("youtube_paywall"));
        return;
      }
    } catch {
      /* fall through on usage error */
    }

    try {
      setStatus("processing");
      setUploadPhase("processing"); // YouTube: no upload step — goes straight to processing
      setUploadProgress(100);
      setProgress(0);
      uploadAbortRef.current = new AbortController();
      setCurrentJobId(null);
      terminalRef.current = false;
      lastPartialVersionRef.current = 0;
      partialFirstSeenAtRef.current = null;
      if (minStreamDelayTimeoutRef.current) {
        clearTimeout(minStreamDelayTimeoutRef.current);
        minStreamDelayTimeoutRef.current = null;
      }
      setPartialSegments([]);
      setYoutubeStage(null);
      youtubeStageAtFailureRef.current = null;
      // Speaker labels are a Pro-only feature (paid Replicate diarization cost per job) —
      // the server re-checks plan too, but never ask for it on free plan in the first place.
      const diarizationEnabledForJob = _isPaid && speakerDiarization;
      setDiarizationWasRequested(diarizationEnabledForJob);
      trackEvent("processing_started", {
        tool: "video-to-transcript",
        source: "youtube",
      });

      const uploadProps = getFunnelProps("youtube_url");
      trackEvent("upload_started", uploadProps);
      trackAppEvent("upload_started", uploadProps);
      const response: YoutubeUploadResponse = await submitYoutubeUrl(
        url,
        {
          includeSummary: _isPaid ? includeSummary : false,
          includeChapters: _isPaid ? includeChapters : false,
          exportFormats: exportFormats.length > 0 ? exportFormats : ["txt"],
          language: selectedLanguage
            ? languageToCode(selectedLanguage) || undefined
            : undefined,
          speakerDiarization: diarizationEnabledForJob,
          numSpeakers:
            diarizationEnabledForJob && numSpeakers
              ? Number(numSpeakers)
              : undefined,
          diarizationLanguage: diarizationEnabledForJob
            ? selectedLanguage
              ? languageToCode(selectedLanguage) || undefined
              : undefined
            : undefined,
          glossary: glossary.trim() || undefined,
        },
        uploadAbortRef.current.signal,
      );
      uploadAbortRef.current = null;

      // Set display metadata immediately from the response (title + thumbnail arrive in 202)
      if (response.youtubeTitle) setYoutubeDisplayTitle(response.youtubeTitle);
      if (response.youtubeThumbnailUrl)
        setYoutubeThumbnailUrl(response.youtubeThumbnailUrl);
      if (response.youtubeDurationSec)
        setYoutubeDurationSec(response.youtubeDurationSec);

      setCurrentJobId(response.jobId);
      persistJobId(location.pathname, response.jobId, response.jobToken);
      const startedAt = Date.now();
      setProcessingStartedAt(startedAt);
      processingStartedAtRef.current = startedAt;
      // texJobStarted()

      const jobToken = response.jobToken;
      const handleJobStatus = (jobStatus: import("../lib/api").JobStatus) => {
        if (terminalRef.current) return;
        setProgress(jobStatus.progress ?? 0);
        if (jobStatus.queuePosition !== undefined)
          setQueuePosition(jobStatus.queuePosition);
        if (jobStatus.youtubeStage) {
          setYoutubeStage(jobStatus.youtubeStage);
          youtubeStageAtFailureRef.current = jobStatus.youtubeStage;
        }
        if (
          jobStatus.status === "processing" &&
          jobStartedTrackedRef.current !== response.jobId
        ) {
          jobStartedTrackedRef.current = response.jobId;
          try {
            trackEvent("job_started", {
              job_id: response.jobId,
              tool_type: "youtube-to-transcript",
            });
          } catch {
            /* non-blocking */
          }
        }
        const transition = getJobLifecycleTransition(jobStatus);
        if (transition === "completed") {
          terminalRef.current = true;
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current();
            activeUploadPollRef.current = null;
          }
          jobStartedTrackedRef.current = null;
          savedScrollTopRef.current = partialScrollRef.current?.scrollTop ?? 0;
          const MIN_STREAM_VISIBILITY_MS = 8000;
          const res = jobStatus.result;
          const streamProg =
            res &&
            typeof (res as { streamProgress?: boolean }).streamProgress ===
              "boolean" &&
            (res as { streamProgress?: boolean }).streamProgress;
          const firstSeenAt = partialFirstSeenAtRef.current;
          const remainingMs =
            streamProg && firstSeenAt != null
              ? MIN_STREAM_VISIBILITY_MS - (Date.now() - firstSeenAt)
              : 0;
          const applyCompleted = () => {
            minStreamDelayTimeoutRef.current = null;
            setPartialSegments([]);
            setStatus("completed");
            setResult(jobStatus.result ?? null);
            trackAppEvent("transcription_completed", {
              toolId: "video-to-transcript",
            });
            const started = processingStartedAtRef.current ?? Date.now();
            const processingMs = Date.now() - started;
            // emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript', processingMs })
            if (isLoggedIn()) {
              if (res?.segments?.length) {
                const text = res.segments
                  .map((s: { text: string }) => s.text)
                  .join("\n\n");
                setFullTranscript(text);
                setTranscriptPreview(text.substring(0, 500));
              } else if (res?.downloadUrl) {
                fetch(getAbsoluteDownloadUrl(res.downloadUrl))
                  .then((r) => r.text())
                  .then((t) => {
                    setTranscriptPreview(t.substring(0, 500));
                    setFullTranscript(t);
                  })
                  .catch(() => {});
              }
            }
            incrementUsage("video-to-transcript");
            setHasCompletedJobs(true);
            setActivationCardDismissed(true);
            try {
              localStorage.setItem(ACTIVATION_CARD_DISMISS_KEY, "1");
            } catch {
              // Ignore storage failures
            }
            invalidateUsageCache();
            getCurrentUsage({ skipCache: true })
              .then((data) => {
                const ii = data.quotaType === "imports";
                const total = ii
                  ? (data.limit ?? 3)
                  : data.limits.minutesPerMonth + data.overages.minutes;
                setAvailableMinutes(total);
              })
              .catch(() => {});
            try {
              trackEvent("job_completed", {
                job_id: response.jobId,
                tool_type: "youtube-to-transcript",
                processing_time_ms: processingMs,
                ...getFunnelProps("youtube_url"),
              });
              const nextJobCount =
                (Number(localStorage.getItem(JOB_COMPLETED_COUNT_KEY) || "0") ||
                  0) + 1;
              localStorage.setItem(
                JOB_COMPLETED_COUNT_KEY,
                String(nextJobCount),
              );
              trackFirstOutputSeen({
                ...getFunnelProps("result_panel"),
                job_count: nextJobCount,
              });
              trackAppEvent("first_output_seen", {
                ...getFunnelProps("result_panel"),
                job_count: nextJobCount,
              });
              trackEvent("processing_completed", {
                tool: "video-to-transcript",
                source: "youtube",
              });
              // texJobCompleted(processingMs, 'video-to-transcript')
              setLastProcessingMs(processingMs);
            } catch {
              /* non-blocking */
            }
          };
          if (remainingMs > 0) {
            minStreamDelayTimeoutRef.current = setTimeout(() => {
              void applyCompleted();
            }, remainingMs);
          } else {
            void applyCompleted();
          }
        } else if (transition === "failed") {
          terminalRef.current = true;
          setPartialSegments([]);
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current();
            activeUploadPollRef.current = null;
          }
          const stageAtFailure = youtubeStageAtFailureRef.current;
          const msg =
            stageAtFailure === "downloading_audio"
              ? "Could not download audio from this YouTube video. It may be private, age-restricted, or region-blocked. Try a different video or use the file upload."
              : stageAtFailure === "fetching_captions"
                ? "Could not retrieve captions or audio for this video. The video may be private, unavailable, or have no accessible audio track."
                : getFailureMessage({});
          setFailedMessage(msg);
          setStatus("failed");
          // texJobFailed(msg)
          toast.error(
            stageAtFailure === "downloading_audio" ||
              stageAtFailure === "fetching_captions"
              ? "YouTube processing failed. See details below."
              : "Processing failed. Please try again.",
          );
        } else if (
          jobStatus.status === "processing" &&
          jobStatus.partialVersion != null &&
          jobStatus.partialVersion > lastPartialVersionRef.current
        ) {
          lastPartialVersionRef.current = jobStatus.partialVersion;
          if (jobStatus.partialSegments?.length) {
            if (partialFirstSeenAtRef.current === null)
              partialFirstSeenAtRef.current = Date.now();
            setPartialSegments(jobStatus.partialSegments);
          }
        }
      };

      const doPoll = async () => {
        try {
          if (terminalRef.current) return;
          const s = await getJobStatus(
            response.jobId,
            jobToken ? { jobToken } : undefined,
          );
          if (terminalRef.current) return;
          pollConsecutiveNetworkErrorsRef.current = 0;
          handleJobStatus(s);
        } catch (error: any) {
          if (isNetworkError(error)) {
            pollConsecutiveNetworkErrorsRef.current += 1;
            if (
              pollConsecutiveNetworkErrorsRef.current >=
              POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS
            ) {
              if (activeUploadPollRef.current) {
                activeUploadPollRef.current();
                activeUploadPollRef.current = null;
              }
              toast.error(
                "Server unreachable. Start the backend and refresh the page.",
              );
            }
          }
        }
      };
      pollConsecutiveNetworkErrorsRef.current = 0;
      doPoll().then(() => {
        if (terminalRef.current) return;
        activeUploadPollRef.current = subscribeJobStatus(
          response.jobId,
          jobToken ? { jobToken } : undefined,
          handleJobStatus,
        );
      });
    } catch (error: any) {
      uploadAbortRef.current = null;
      if (error instanceof Error && error.message === "Upload cancelled") {
        setStatus("idle");
        setUploadPhase("uploading");
        setUploadProgress(0);
        setCurrentJobId(null);
        return;
      }
      if (error instanceof SessionExpiredError) {
        clearPersistedJobId(location.pathname, navigate);
        setStatus("idle");
      } else {
        const msg = getFailureMessage({
          isNetworkError: isNetworkError(error),
        });
        setFailedMessage(msg);
        setStatus("failed");
        // texJobFailed(msg)
      }
      toast.error(getUserFacingMessage(error));
    }
  };

  const handleCopyToClipboard = async () => {
    // Gate 1: require login
    if (!isLoggedIn()) {
      trackEvent("copy_gate_auth", { tool: "video-to-transcript" });
      setAuthModalMode("signup-combo");
      setShowAuthModal(true);
      return;
    }
    // Gate 2: 3 free copies per session for free-plan users
    const _isCopyPaid =
      typeof window !== "undefined" &&
      (localStorage.getItem("plan") || "free").toLowerCase() !== "free";
    if (!_isCopyPaid && freeCopiesUsed >= 3) {
      trackEvent("copy_gate_limit", {
        tool: "video-to-transcript",
        copies_used: freeCopiesUsed,
      });
      setPaywallReason("COPY_LIMIT_REACHED");
      setShowPaywall(true);
      return;
    }
    const textToCopy =
      translationLanguage && translatedCache[translationLanguage] != null
        ? translatedCache[translationLanguage]
        : segmentsForExport && segmentsForExport.length > 0
          ? segmentsForExport
              .map((s) => s.text)
              .join("\n\n")
              .trim()
          : (fullTranscript || "").trim();
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("Copied to clipboard!");
    } catch {
      // Fallback for environments where clipboard API is restricted
      try {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        toast.success("Copied to clipboard!");
      } catch {
        toast.error("Failed to copy to clipboard");
        return;
      }
    }
    trackEvent("transcript_copied", {
      plan: _isCopyPaid ? "paid" : "free",
      copies_used: freeCopiesUsed + 1,
    });
    // Increment counter for free users after successful copy
    if (!_isCopyPaid) setFreeCopiesUsed((n) => n + 1);
  };

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate);
    setSelectedFile(null);
    setFilePreview(null);
    setCurrentJobId(null);
    uploadAbortRef.current = null;
    terminalRef.current = false;
    lastPartialVersionRef.current = 0;
    partialFirstSeenAtRef.current = null;
    if (minStreamDelayTimeoutRef.current) {
      clearTimeout(minStreamDelayTimeoutRef.current);
      minStreamDelayTimeoutRef.current = null;
    }
    // Reset batch state
    setBatchFiles([]);
    setIsBatchMode(false);
    setBatchInfo(null);
    if (batchPollRef.current) {
      clearInterval(batchPollRef.current);
      batchPollRef.current = null;
    }
    batchPctPeakRef.current = 0;
    setIsBatchStarting(false);
    setStatus("idle");
    setProgress(0);
    setUploadPhase("uploading");
    setUploadProgress(0);
    setResult(null);
    setTranscriptPreview("");
    setFullTranscript("");
    setPartialSegments([]);
    setLeftWorkspaceTab("transcript");
    setIncludeSummary(true);
    setIncludeChapters(true);
    setExportFormats(["txt"]);
    setSpeakerDiarization(false);
    setNumSpeakers("");
    setSelectedLanguage("");
    setGlossary("");
    setSearchQuery("");
    setTranscriptEditMode(false);
    setEditableSegments(null);
    setTranslateEnabled(false);
    setTranslationLanguage(null);
    setTranslatedCache({});
    setTranscriptView("original");
    hasTrackedFirstOutputRef.current = false;
    setBatchTranslateLanguage("");
    setBatchSpeakerDiarization(false);
    setBatchPrimaryLanguage("English");
    // Reset YouTube state
    setYoutubeUrlInput("");
    setYoutubeDisplayTitle(null);
    setYoutubeThumbnailUrl(null);
    setYoutubeDurationSec(null);
    setYoutubeStage(null);
    youtubeStageAtFailureRef.current = null;
  };

  // Phase 1 – scroll transcript to segment index; switch to Transcript branch first so segment is mounted
  const scrollToSegment = useCallback((index: number) => {
    setLeftWorkspaceTab("transcript");
    setTimeout(() => {
      const el = segmentRefsRef.current.get(index);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // Auto-scroll transcript to keep active segment visible during playback
  useEffect(() => {
    if (
      leftWorkspaceTab !== "transcript" ||
      activeSegIdx < 0 ||
      !audioIsPlaying
    )
      return;
    const el = segmentRefsRef.current.get(activeSegIdx);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [leftWorkspaceTab, activeSegIdx, audioIsPlaying]);

  // Auto-scroll speakers panel to keep active segment visible during playback
  useEffect(() => {
    if (activeSegIdx < 0 || !audioIsPlaying || leftWorkspaceTab !== "speakers")
      return;
    const el = speakerSegmentRefsRef.current.get(activeSegIdx);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeSegIdx, audioIsPlaying, leftWorkspaceTab]);

  // Phase 1 – Derived Transcript Utilities (client-side; failures must not affect transcript)
  const getParagraphs = useCallback((text: string): string[] => {
    if (!text.trim()) return [];
    return text
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, []);

  const getSpeakersData = useCallback((): {
    speaker: string;
    rawSpeaker: string;
    text: string;
    isDiarized: boolean;
  }[] => {
    if (result?.segments?.length) {
      const rawLabels = result.segments.map(
        (s) => s.speaker?.trim() || "Speaker",
      );
      const unique = Array.from(new Set(rawLabels)) as string[];
      // Only treat as diarized when we have at least 2 distinct speaker labels from the backend
      const isDiarized = unique.length >= 2;
      const labelToFriendly: Record<string, string> = {};
      unique.forEach((label, idx) => {
        // User-renamed name takes priority; otherwise fall back to "Speaker N"
        labelToFriendly[label] = speakerNameMap[label] || `Speaker ${idx + 1}`;
      });
      // Use edited segment text when available (editableSegments aligned 1-to-1 with result.segments)
      return result.segments.map((s, idx) => ({
        rawSpeaker: s.speaker?.trim() || "Speaker",
        speaker: labelToFriendly[s.speaker?.trim() || "Speaker"] || "Speaker",
        text: editableSegments?.[idx]?.text ?? s.text,
        isDiarized,
      }));
    }
    try {
      const raw = fullTranscript || "";
      if (!raw.trim()) return [];
      const paras = getParagraphs(raw);
      return paras.map((p, i) => ({
        rawSpeaker: `Speaker ${(i % 3) + 1}`,
        speaker: `Speaker ${(i % 3) + 1}`,
        text: p,
        isDiarized: false,
      }));
    } catch {
      return [];
    }
  }, [
    result?.segments,
    fullTranscript,
    getParagraphs,
    speakerNameMap,
    editableSegments,
  ]);

  const speakerOptionsForExport = useMemo(() => {
    // IMPORTANT: source labels only from backend diarization output (REPLICATE_API via result.segments),
    // never from user-edited segments to avoid fabricating speaker identities.
    const raw = result?.segments ?? [];
    const labels = Array.from(
      new Set(
        raw.map((seg) => seg.speaker?.trim()).filter(Boolean) as string[],
      ),
    );
    return labels;
  }, [result?.segments]);
  const hasDiarizedSpeakersForExport = speakerOptionsForExport.length >= 1;

  const getSummarySchema = useCallback((): {
    summary?: string;
    bullets: string[];
    decisions: string[];
    action_items: string[];
    key_points: string[];
  } => {
    if (result?.summary) {
      return {
        summary: result.summary.summary,
        bullets: result.summary.bullets || [],
        decisions: [],
        action_items: result.summary.actionItems || [],
        key_points: result.summary.bullets || [],
      };
    }
    try {
      const raw = fullTranscript || "";
      if (!raw.trim())
        return { bullets: [], decisions: [], action_items: [], key_points: [] };
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
      const decisions: string[] = [];
      const action_items: string[] = [];
      const key_points: string[] = [];
      const decRe = /\b(decided|decision|agree|agreed|we'll|we will)\b/i;
      const actRe = /\b(action|todo|to do|will \w+|need to|must)\b/i;
      const keyRe = /\b(important|key point|takeaway|summary|in conclusion)\b/i;
      for (const s of sentences) {
        const t = s.trim();
        if (!t) continue;
        if (decRe.test(t)) decisions.push(t);
        else if (actRe.test(t)) action_items.push(t);
        else if (keyRe.test(t)) key_points.push(t);
      }
      return { bullets: [], decisions, action_items, key_points };
    } catch {
      return { bullets: [], decisions: [], action_items: [], key_points: [] };
    }
  }, [result?.summary, fullTranscript]);

  const getChaptersData = useCallback((): {
    label: string;
    segmentIndex: number;
    startTime?: number;
  }[] => {
    if (result?.chapters?.length) {
      const segs = result.segments || [];
      return result.chapters.map((c) => {
        let segmentIndex = 0;
        if (segs.length) {
          const idx = segs.findIndex((s) => s.start >= c.startTime);
          segmentIndex = idx >= 0 ? idx : segs.length - 1;
        }
        return { label: c.title, segmentIndex, startTime: c.startTime };
      });
    }
    try {
      const paras = getParagraphs(fullTranscript || "");
      if (paras.length === 0) return [];
      const chunkSize = Math.max(1, Math.ceil(paras.length / 6));
      const chapters: { label: string; segmentIndex: number }[] = [];
      for (let i = 0; i < paras.length; i += chunkSize) {
        const first = paras[i];
        const preview = first.length > 40 ? first.slice(0, 40) + "…" : first;
        chapters.push({
          label: `Section ${chapters.length + 1}: ${preview}`,
          segmentIndex: i,
        });
      }
      return chapters;
    } catch {
      return [];
    }
  }, [result?.chapters, fullTranscript, getParagraphs]);

  const getHighlightsData = useCallback((): {
    type: string;
    text: string;
  }[] => {
    try {
      const raw = fullTranscript || "";
      if (!raw.trim()) return [];
      const out: { type: string; text: string }[] = [];
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
      const defRe = /\b(means|defined as|is when|refers to)\b/i;
      const conclRe = /\b(in conclusion|to conclude|therefore|thus|so we)\b/i;
      const quoteRe = /^["'].*["']$|".*"/;
      for (const s of sentences) {
        const t = s.trim();
        if (t.length < 15) continue;
        if (defRe.test(t)) out.push({ type: "Definition", text: t });
        else if (conclRe.test(t)) out.push({ type: "Conclusion", text: t });
        else if (quoteRe.test(t) || t.endsWith("!"))
          out.push({ type: "Quote", text: t });
        else if (/\b(important|critical|key)\b/i.test(t))
          out.push({ type: "Important", text: t });
      }
      return out;
    } catch {
      return [];
    }
  }, [fullTranscript]);

  const getKeywordsData = useCallback((): {
    keyword: string;
    count: number;
    segmentIndex: number;
  }[] => {
    try {
      const paras = getParagraphs(fullTranscript || "");
      if (paras.length === 0) return [];
      const countMap = new Map<string, number>();
      const firstIndexMap = new Map<string, number>();
      paras.forEach((p, idx) => {
        const words = p
          .toLowerCase()
          .replace(/[^\w\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !STOPWORDS.has(w));
        words.forEach((w) => {
          countMap.set(w, (countMap.get(w) || 0) + 1);
          if (!firstIndexMap.has(w)) firstIndexMap.set(w, idx);
        });
      });
      return Array.from(countMap.entries())
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 24)
        .map(([keyword, count]) => ({
          keyword,
          count,
          segmentIndex: firstIndexMap.get(keyword) ?? 0,
        }));
    } catch {
      return [];
    }
  }, [fullTranscript, getParagraphs]);

  const transcriptParagraphs = getParagraphs(fullTranscript || "");

  const displayTranscript =
    transcriptView === "translated" &&
    translationLanguage &&
    translatedCache[translationLanguage] != null
      ? translatedCache[translationLanguage]
      : fullTranscript || "";
  const _displayParagraphs = getParagraphs(displayTranscript);
  void _displayParagraphs;

  // Per-segment translated text — align with original segments (paragraph split, line split, or length-weighted fallback)
  const translatedSegments: NonNullable<typeof result>["segments"] | null =
    useMemo(() => {
      if (
        !translationLanguage ||
        !translatedCache[translationLanguage] ||
        !result?.segments?.length
      )
        return null;
      const translatedFull = translatedCache[translationLanguage].trim();
      const segs = result.segments;
      const paras = translatedFull.split(/\n\n+/).filter(Boolean);
      if (paras.length === segs.length) {
        return segs.map((s, i) => ({ ...s, text: paras[i]?.trim() ?? s.text }));
      }
      const lines = translatedFull.split("\n").filter((l) => l.trim());
      if (lines.length === segs.length) {
        return segs.map((s, i) => ({ ...s, text: lines[i]?.trim() ?? s.text }));
      }
      const weights = segs.map((s) => Math.max(1, s.text.length));
      const totalW = weights.reduce((a, b) => a + b, 0);
      const boundaries: number[] = [0];
      let acc = 0;
      for (let i = 0; i < segs.length - 1; i++) {
        acc += (weights[i] / totalW) * translatedFull.length;
        boundaries.push(Math.round(acc));
      }
      boundaries.push(translatedFull.length);
      return segs.map((s, i) => ({
        ...s,
        text:
          translatedFull.slice(boundaries[i], boundaries[i + 1]).trim() ||
          s.text,
      }));
    }, [translationLanguage, translatedCache, result?.segments]);

  const isLoggedInUser = isLoggedIn();
  const currentPlan =
    typeof window !== "undefined"
      ? (localStorage.getItem("plan") || "free").toLowerCase()
      : "free";
  const shouldShowActivationCard =
    isLoggedInUser &&
    currentPlan === "free" &&
    hasCompletedJobs === false &&
    !activationCardDismissed;

  useEffect(() => {
    if (!shouldShowActivationCard || activationWizardShownTrackedRef.current)
      return;
    activationWizardShownTrackedRef.current = true;
    try {
      trackEvent("activation_wizard_shown", { tool: "video-to-transcript" });
    } catch {
      // non-blocking
    }
  }, [shouldShowActivationCard]);

  const handleActivationWizardCta = useCallback(() => {
    try {
      trackEvent("activation_wizard_cta_clicked", {
        tool: "video-to-transcript",
      });
    } catch {
      // non-blocking
    }
    uploadZoneRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        const fileInput = uploadZoneRef.current?.querySelector(
          'input[type="file"]',
        ) as HTMLInputElement | null;
        if (!fileInput) return;
        fileInput.focus({ preventScroll: true });
      }, 250);
    }
  }, []);

  // Authoritative plan fetch — mirrors FreePlanNudge/UpgradeBanner (GET /api/usage/current),
  // not localStorage. Runs on mount and again whenever a job completes, so a plan change
  // (upgrade, downgrade, or a legacy/founding/business account) is reflected without reload.
  useEffect(() => {
    let cancelled = false;
    getCurrentUsage({ skipCache: true })
      .then((data) => {
        if (!cancelled) setAccountPlan(data.plan);
      })
      .catch(() => {
        /* leave accountPlan as-is; export locks stay defensive (not-paid) until resolved */
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const isPaidPlan = hasPaidPlan(accountPlan);

  // Track when the AI summary teaser is shown to a free user (fires once per completed job)
  useEffect(() => {
    if (status === "completed" && result && !isPaidPlan) {
      trackEvent("ai_summary_teaser_shown", { tool: "video-to-transcript" });
    }
  }, [status, result, isPaidPlan]);

  /** Client-side PDF generation — zero server round-trip, respects edits and renamed speakers. */
  const handleExportPdf = useCallback(async () => {
    const segs =
      (editableSegments && editableSegments.length > 0
        ? editableSegments
        : result?.segments) ?? null;
    if (!segs?.length) {
      toast.error("Nothing to export");
      return;
    }
    if (!isPaidPlan && freeExportsUsed >= 2) {
      toast(
        "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
      );
      return;
    }
    const watermark = isPaidPlan ? undefined : WATERMARK_DOC_FOOTER;
    const filename = joinExportFilename(
      exportFileStem(selectedFile?.name, "video"),
      `transcript_original_${langCodeForFile(exportSourceLangCode)}`,
      ".pdf",
    );
    try {
      await exportToPdf(segs, speakerNameMap, filename, watermark, {
        timestampMode,
        verbatimMode,
        intervalSec,
        smpteAnchor,
        smpteFps,
      });
      if (!isPaidPlan) setFreeExportsUsed((n) => n + 1);
      try {
        trackEvent("result_downloaded", {
          tool: "video-to-transcript",
          format: "pdf",
          plan: isPaidPlan ? "paid" : "free",
        });
      } catch {
        /* non-blocking */
      }
      toast.success(
        isPaidPlan ? "PDF downloaded" : "PDF downloaded (with watermark)",
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("PDF generation failed");
    }
  }, [
    editableSegments,
    result?.segments,
    speakerNameMap,
    isPaidPlan,
    freeExportsUsed,
    selectedFile?.name,
    exportSourceLangCode,
    timestampMode,
    verbatimMode,
    intervalSec,
  ]);

  /** Client-side DOCX generation — zero server round-trip, respects edits and renamed speakers. */
  const handleExportDocx = useCallback(async () => {
    const segs =
      (editableSegments && editableSegments.length > 0
        ? editableSegments
        : result?.segments) ?? null;
    if (!segs?.length) {
      toast.error("Nothing to export");
      return;
    }
    if (!isPaidPlan && freeExportsUsed >= 2) {
      toast(
        "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
      );
      return;
    }
    const watermark = isPaidPlan ? undefined : WATERMARK_DOC_FOOTER;
    const filename = joinExportFilename(
      exportFileStem(selectedFile?.name, "video"),
      `transcript_original_${langCodeForFile(exportSourceLangCode)}`,
      ".docx",
    );
    try {
      await exportToDocx(segs, speakerNameMap, filename, watermark, {
        timestampMode,
        verbatimMode,
        intervalSec,
        smpteAnchor,
        smpteFps,
      });
      if (!isPaidPlan) setFreeExportsUsed((n) => n + 1);
      try {
        trackEvent("result_downloaded", {
          tool: "video-to-transcript",
          format: "docx",
          plan: isPaidPlan ? "paid" : "free",
        });
      } catch {
        /* non-blocking */
      }
      toast.success(
        isPaidPlan ? "DOCX downloaded" : "DOCX downloaded (with watermark)",
      );
    } catch (err) {
      console.error("DOCX generation failed:", err);
      toast.error("DOCX generation failed");
    }
  }, [
    editableSegments,
    result?.segments,
    speakerNameMap,
    isPaidPlan,
    freeExportsUsed,
    selectedFile?.name,
    exportSourceLangCode,
    timestampMode,
    verbatimMode,
    intervalSec,
  ]);

  /** Translated PDF — uses translatedSegments so the file is in the target language. */
  const handleExportPdfTranslated = useCallback(async () => {
    if (!translatedSegments?.length) {
      toast.error("Translation not ready yet");
      return;
    }
    if (!isPaidPlan && freeExportsUsed >= 2) {
      toast(
        "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
      );
      return;
    }
    const watermark = isPaidPlan ? undefined : WATERMARK_DOC_FOOTER;
    const slug = translationLanguage
      ? targetLangFileSlug(translationLanguage)
      : "translated";
    const filename = joinExportFilename(
      exportFileStem(selectedFile?.name, "video"),
      `transcript_translated_${slug}`,
      ".pdf",
    );
    try {
      await exportToPdf(
        translatedSegments,
        speakerNameMap,
        filename,
        watermark,
        { timestampMode, verbatimMode, intervalSec, smpteAnchor, smpteFps },
      );
      if (!isPaidPlan) setFreeExportsUsed((n) => n + 1);
      try {
        trackEvent("result_downloaded", {
          tool: "video-to-transcript",
          format: "pdf_translated",
          plan: isPaidPlan ? "paid" : "free",
        });
      } catch {
        /* non-blocking */
      }
      toast.success(
        isPaidPlan ? "PDF downloaded" : "PDF downloaded (with watermark)",
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("PDF generation failed");
    }
  }, [
    translatedSegments,
    speakerNameMap,
    isPaidPlan,
    freeExportsUsed,
    selectedFile?.name,
    translationLanguage,
    timestampMode,
    verbatimMode,
    intervalSec,
  ]);

  /** Translated DOCX — uses translatedSegments so the file is in the target language. */
  const handleExportDocxTranslated = useCallback(async () => {
    if (!translatedSegments?.length) {
      toast.error("Translation not ready yet");
      return;
    }
    if (!isPaidPlan && freeExportsUsed >= 2) {
      toast(
        "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
      );
      return;
    }
    const watermark = isPaidPlan ? undefined : WATERMARK_DOC_FOOTER;
    const slug = translationLanguage
      ? targetLangFileSlug(translationLanguage)
      : "translated";
    const filename = joinExportFilename(
      exportFileStem(selectedFile?.name, "video"),
      `transcript_translated_${slug}`,
      ".docx",
    );
    try {
      await exportToDocx(
        translatedSegments,
        speakerNameMap,
        filename,
        watermark,
        { timestampMode, verbatimMode, intervalSec, smpteAnchor, smpteFps },
      );
      if (!isPaidPlan) setFreeExportsUsed((n) => n + 1);
      try {
        trackEvent("result_downloaded", {
          tool: "video-to-transcript",
          format: "docx_translated",
          plan: isPaidPlan ? "paid" : "free",
        });
      } catch {
        /* non-blocking */
      }
      toast.success(
        isPaidPlan ? "DOCX downloaded" : "DOCX downloaded (with watermark)",
      );
    } catch (err) {
      console.error("DOCX generation failed:", err);
      toast.error("DOCX generation failed");
    }
  }, [
    translatedSegments,
    speakerNameMap,
    isPaidPlan,
    freeExportsUsed,
    selectedFile?.name,
    translationLanguage,
    timestampMode,
    verbatimMode,
    intervalSec,
  ]);

  /** DOCX 3-column table — Speaker | Timecode | Dialogue, one row per speaker turn. */
  const handleExportDocxThreeColumn = useCallback(async () => {
    const segs =
      (editableSegments && editableSegments.length > 0
        ? editableSegments
        : result?.segments) ?? null;
    if (!segs?.length) {
      toast.error("Nothing to export");
      return;
    }
    if (!isPaidPlan && freeExportsUsed >= 2) {
      toast(
        "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
      );
      return;
    }
    const watermark = isPaidPlan ? undefined : WATERMARK_DOC_FOOTER;
    const filename = joinExportFilename(
      exportFileStem(selectedFile?.name, "video"),
      `transcript_3col_${langCodeForFile(exportSourceLangCode)}`,
      ".docx",
    );
    try {
      await exportToDocxThreeColumn(
        segs,
        speakerNameMap,
        filename,
        { verbatimMode, timestampMode, smpteAnchor, smpteFps },
        watermark,
      );
      if (!isPaidPlan) setFreeExportsUsed((n) => n + 1);
      try {
        trackEvent("result_downloaded", {
          tool: "video-to-transcript",
          format: "docx_3col",
          plan: isPaidPlan ? "paid" : "free",
        });
      } catch {
        /* non-blocking */
      }
      toast.success(
        isPaidPlan
          ? "DOCX (3-col) downloaded"
          : "DOCX (3-col) downloaded (with watermark)",
      );
    } catch (err) {
      console.error("DOCX 3-col generation failed:", err);
      toast.error("DOCX generation failed");
    }
  }, [
    editableSegments,
    result?.segments,
    speakerNameMap,
    isPaidPlan,
    freeExportsUsed,
    selectedFile?.name,
    exportSourceLangCode,
    verbatimMode,
  ]);

  /** PDF 3-column table — Speaker | Timecode | Dialogue, one row per speaker turn. */
  const handleExportPdfThreeColumn = useCallback(async () => {
    const segs =
      (editableSegments && editableSegments.length > 0
        ? editableSegments
        : result?.segments) ?? null;
    if (!segs?.length) {
      toast.error("Nothing to export");
      return;
    }
    if (!isPaidPlan && freeExportsUsed >= 2) {
      toast(
        "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
      );
      return;
    }
    const watermark = isPaidPlan ? undefined : WATERMARK_DOC_FOOTER;
    const filename = joinExportFilename(
      exportFileStem(selectedFile?.name, "video"),
      `transcript_3col_${langCodeForFile(exportSourceLangCode)}`,
      ".pdf",
    );
    try {
      await exportToPdfThreeColumn(
        segs,
        speakerNameMap,
        filename,
        { verbatimMode, timestampMode, smpteAnchor, smpteFps },
        watermark,
      );
      if (!isPaidPlan) setFreeExportsUsed((n) => n + 1);
      try {
        trackEvent("result_downloaded", {
          tool: "video-to-transcript",
          format: "pdf_3col",
          plan: isPaidPlan ? "paid" : "free",
        });
      } catch {
        /* non-blocking */
      }
      toast.success(
        isPaidPlan
          ? "PDF (3-col) downloaded"
          : "PDF (3-col) downloaded (with watermark)",
      );
    } catch (err) {
      console.error("PDF 3-col generation failed:", err);
      toast.error("PDF generation failed");
    }
  }, [
    editableSegments,
    result?.segments,
    speakerNameMap,
    isPaidPlan,
    freeExportsUsed,
    selectedFile?.name,
    exportSourceLangCode,
    verbatimMode,
  ]);

  const downloadSubtitleExport = useCallback(
    (format: "srt" | "vtt") => {
      const segs =
        (editableSegments && editableSegments.length > 0
          ? editableSegments
          : result?.segments) ?? null;
      if (!segs?.length) {
        toast.error("Nothing to export");
        return;
      }
      if (!isPaidPlan && freeExportsUsed >= 2) {
        toast(
          "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
        );
        return;
      }
      const resolved = withResolvedSpeakers(segs, speakerNameMap);
      let content =
        format === "srt"
          ? segmentsToSrt(resolved)
          : segmentsToVtt(resolved);
      if (!isPaidPlan) {
        content = watermarkTextExport(content, format);
        setFreeExportsUsed((n) => n + 1);
      }
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = joinExportFilename(
        exportFileStem(selectedFile?.name, "video"),
        `subtitles_original_${langCodeForFile(exportSourceLangCode)}`,
        format === "srt" ? ".srt" : ".vtt",
      );
      a.click();
      URL.revokeObjectURL(a.href);
      try {
        trackEvent("result_downloaded", {
          tool: "video-to-transcript",
          format,
          plan: isPaidPlan ? "paid" : "free",
        });
      } catch {
        /* non-blocking */
      }
      toast.success(
        isPaidPlan
          ? "Download started"
          : "Download started (with watermark)",
      );
    },
    [
      editableSegments,
      result?.segments,
      speakerNameMap,
      isPaidPlan,
      freeExportsUsed,
      selectedFile?.name,
      exportSourceLangCode,
    ],
  );

  /** Translate a pasted plain-text transcript (no video/audio upload required). */
  const handleTextTranslate = useCallback(async () => {
    const rawText = textTranslateInput.trim();
    if (!rawText) {
      toast.error("Paste a transcript first");
      return;
    }
    if (!textTranslateLang) {
      toast.error("Select a target language");
      return;
    }
    setTextTranslating(true);
    setTextTranslateResult("");
    try {
      // ── Client-side block parsing ──────────────────────────────────────────
      // Split the input into "structural" lines (speaker headers, timestamps,
      // SRT counters, blank lines) and "dialogue" lines that need translation.
      // Structural lines are never sent to the API — they pass through as-is.
      type Block =
        | { kind: "structural"; text: string }
        | { kind: "dialogue"; text: string; id: number };
      const blocks: Block[] = [];
      let dialogueId = 1;
      for (const line of rawText.split("\n")) {
        const trimmed = line.trim();
        const isStructural =
          !trimmed || // blank line
          /^\[\d{1,2}:\d{2}(?::\d{2})?\]$/.test(trimmed) || // [0:30] interval marker
          /^[A-Za-z][^:\n]{0,40}\s*\(\d+:\d+\):?\s*$/.test(trimmed) || // Alice (0:00) speaker header
          /^SPEAKER_\d+:?\s*$/.test(trimmed) || // SPEAKER_00: raw label
          /^\d+$/.test(trimmed) || // SRT sequence number
          /\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(
            line,
          ) || // SRT/VTT timestamp
          /^WEBVTT/.test(trimmed); // VTT header
        if (isStructural) {
          blocks.push({ kind: "structural", text: line });
        } else {
          blocks.push({ kind: "dialogue", text: line, id: dialogueId++ });
        }
      }

      const dialogueBlocks = blocks.filter(
        (b): b is Extract<Block, { kind: "dialogue" }> => b.kind === "dialogue",
      );

      let translatedText: string;
      if (dialogueBlocks.length === 0) {
        // Nothing to translate (e.g. pure SRT timestamps)
        translatedText = rawText;
      } else {
        // Build numbered list request — only dialogue lines
        const numberedRequest =
          `Translate each numbered line below to ${textTranslateLang}. ` +
          `Return ONLY the numbered translations in the exact same format (1. 2. 3. etc). ` +
          `Do not add any extra text, explanations, or change the numbering.\n\n` +
          dialogueBlocks.map((b) => `${b.id}. ${b.text}`).join("\n");

        const token = getAuthToken();
        const res = await fetch(`${getApiBase()}/api/translate-transcript/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            text: numberedRequest,
            targetLanguage: textTranslateLang,
          }),
        });
        const data = (await res.json()) as {
          translatedText?: string;
          error?: string;
        };
        if (!data.translatedText) {
          toast.error(data.error ?? "Translation failed");
          return;
        }

        // Parse numbered response: "1. translated text"
        const translated: Record<number, string> = {};
        for (const line of data.translatedText.split("\n")) {
          const m = line.match(/^(\d+)\.\s+(.*)$/);
          if (m) translated[parseInt(m[1], 10)] = m[2];
        }

        // Reconstruct — structural blocks pass through, dialogue blocks get translation (fallback to original)
        translatedText = blocks
          .map((b) =>
            b.kind === "structural" ? b.text : (translated[b.id] ?? b.text),
          )
          .join("\n");
      }

      setTextTranslateResult(translatedText);
      toast.success("Translation complete");
    } catch {
      toast.error("Translation failed — check your connection");
    } finally {
      setTextTranslating(false);
    }
  }, [textTranslateInput, textTranslateLang]);

  /** Load a .txt file into the text-translation textarea. */
  const handleTextTranslateFileLoad = useCallback((file: File) => {
    if (
      !file.name.toLowerCase().endsWith(".txt") &&
      !file.name.toLowerCase().endsWith(".srt") &&
      !file.name.toLowerCase().endsWith(".vtt")
    ) {
      toast.error("Only .txt, .srt, and .vtt files are supported");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        setTextTranslateInput(text);
        toast.success("File loaded — ready to translate");
      }
    };
    reader.readAsText(file);
  }, []);

  // Search: match in segments (if any) or paragraphs; return { index, snippet, startTime? }
  const _searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    const snippetLen = 60;
    if (result?.segments?.length) {
      return result.segments
        .map((s, i) => ({ index: i, text: s.text, start: s.start }))
        .filter((x) => x.text.toLowerCase().includes(q))
        .map((x) => ({
          index: x.index,
          snippet:
            x.text.length > snippetLen
              ? x.text.slice(0, snippetLen) + "…"
              : x.text,
          startTime: x.start,
        }));
    }
    return transcriptParagraphs
      .map((p, i) => ({ index: i, text: p }))
      .filter((x) => x.text.toLowerCase().includes(q))
      .map((x) => ({
        index: x.index,
        snippet:
          x.text.length > snippetLen
            ? x.text.slice(0, snippetLen) + "…"
            : x.text,
        startTime: undefined,
      }));
  }, [searchQuery, result?.segments, transcriptParagraphs]);
  void _searchResults;

  // Raw editable segments (text + raw speaker label) — source for all exports
  const segmentsForExport =
    editableSegments && editableSegments.length > 0
      ? editableSegments
      : (result?.segments ?? null);
  const plainTranscriptForClientReady = useMemo(() => {
    const segs =
      transcriptView === "translated" && translatedSegments?.length
        ? translatedSegments
        : segmentsForExport;
    if (segs?.length) {
      // Carry real speaker + timestamp data into the guideline formatter (same
      // builder the TXT export uses) instead of bare segment text — otherwise
      // the formatter receives no speaker/time signal and fabricates its own.
      return buildTxt(segs, speakerNameMap, {
        timestampMode,
        verbatimMode,
        intervalSec,
        smpteAnchor,
        smpteFps,
      }).trim();
    }
    return (
      displayTranscript ||
      fullTranscript ||
      transcriptPreview ||
      ""
    ).trim();
  }, [
    transcriptView,
    translatedSegments,
    segmentsForExport,
    speakerNameMap,
    timestampMode,
    verbatimMode,
    intervalSec,
    smpteAnchor,
    smpteFps,
    displayTranscript,
    fullTranscript,
    transcriptPreview,
  ]);


  const breadcrumbs = [
    {
      label: "Fastest Way to Transcribe Your Audio/Video",
      href: "/video-to-transcript",
    },
  ];
  const hasDeepContent = Boolean(
    seoDeepContent?.proofPoints?.length ||
    seoDeepContent?.workflowSteps?.length ||
    seoDeepContent?.outputExamples?.length ||
    seoDeepContent?.comparisonRows?.length ||
    seoDeepContent?.useCases?.length,
  );
  const layoutProps = {
    breadcrumbs,
    title: "Fastest Way to Transcribe Your Audio/Video",
    subtitle:
      seoIntro ??
      "Upload a video or YouTube URL. Get a transcript, SRT/VTT, summary, and chapters. Whisper large-v3. Files deleted after processing. 3 free imports/mo.",
    icon: <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
    sidebar: null,
    compactToolHeader: true,
    coreToolPath: "/video-to-transcript",
    currentStepLabel:
      status === "completed"
        ? "Transcript ready"
        : selectedFile
          ? "Upload configured"
          : "Ready to upload",
  };

  return (
    <>
      <ToolLayout {...layoutProps}>
        <UpgradeBanner variant="video-length" tool="video-to-transcript" />
        {status === "idle" && !selectedFile && !isBatchMode && (
          <div className="space-y-4">
            {/* YouTube URL tab temporarily hidden — feature under development */}

            {/* ── File upload tab ── */}
            {inputMode === "file" && (
              <div className="space-y-3 sm:space-y-4">
                {batchUploadEligible() && (
                  <div
                    className="rounded-xl sm:rounded-xl border-2 border-blue-400/55 dark:border-blue-500/45 bg-gradient-to-br from-blue-600/[0.12] via-blue-600/[0.08] to-fuchsia-600/[0.06] dark:from-blue-950/60 dark:via-blue-950/40 dark:to-fuchsia-950/25 px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm shadow-blue-500/10"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <div className="shrink-0 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-600/25 dark:bg-blue-400/20 ring-2 ring-blue-600/35">
                        <Layers
                          className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700 dark:text-blue-200"
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white leading-snug">
                          Batch upload included — add several videos at once
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                          Drag in multiple files or use “browse” and select more
                          than one. You get one ZIP with all transcripts when
                          processing finishes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {sourceMessage && (
                  <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/25 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                      {sourceMessage.title}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-200/90">
                      {sourceMessage.body}
                    </p>
                  </div>
                )}
                {shouldShowActivationCard && (
                  <div className="rounded-xl border border-emerald-300/70 dark:border-emerald-700/70 bg-emerald-50/80 dark:bg-emerald-950/25 px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                          Get your first transcript in under a minute
                        </p>
                        <ol className="mt-2 space-y-1.5 text-xs sm:text-sm text-emerald-800 dark:text-emerald-100/90">
                          <li className="flex items-center gap-2">
                            <CheckCircle2
                              className="h-4 w-4 shrink-0"
                              aria-hidden
                            />
                            Step 1: Upload a video or paste URL
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2
                              className="h-4 w-4 shrink-0"
                              aria-hidden
                            />
                            Step 2: Wait ~40s
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2
                              className="h-4 w-4 shrink-0"
                              aria-hidden
                            />
                            Step 3: Download transcript/SRT
                          </li>
                        </ol>
                      </div>
                      <button
                        type="button"
                        onClick={handleActivationWizardCta}
                        className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 transition"
                      >
                        Start now
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-sky-200/70 dark:border-sky-800/50 bg-sky-50/70 dark:bg-sky-950/20 px-3 py-2">
                  <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                    Need transcript-only translation?
                  </p>
                  <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-0.5">
                    Upload TXT, DOCX, SRT, or VTT directly — no audio/video
                    required.
                    <Link
                      to="/translate-subtitles"
                      className="ml-1 underline font-semibold"
                    >
                      Open transcript translation
                    </Link>
                  </p>
                </div>
                <div ref={uploadZoneRef}>
                  <UploadZone
                    immediateSelect
                    multiple
                    onFileSelect={handleFileSelect}
                    onFilesSelect={handleFilesSelect}
                    initialFiles={selectedFile ? [selectedFile] : null}
                    onRemove={() => {
                      // if (fileFromWorkflow) workflow.clearVideo()
                      setSelectedFile(null);
                      setFileFromWorkflow(false);
                    }}
                    fromWorkflowLabel={
                      fileFromWorkflow ? "From previous step" : undefined
                    }
                  />
                </div>

                {/* ── Text-only translation panel ── */}
                <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTextTranslateOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Languages className="w-4 h-4 text-blue-500 shrink-0" />
                      Translate an existing transcript (no video upload needed)
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${textTranslateOpen ? "rotate-90" : ""}`}
                    />
                  </button>
                  {textTranslateOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400 pt-3">
                        Paste your finished transcript below or upload a
                        .txt/.srt/.vtt file, pick a target language, and
                        download the translated version. Speaker labels and
                        timestamps are preserved.
                      </p>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          Upload file
                          <input
                            type="file"
                            accept=".txt,.srt,.vtt"
                            className="sr-only"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleTextTranslateFileLoad(f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 self-center">
                          .txt · .srt · .vtt
                        </p>
                      </div>
                      <textarea
                        value={textTranslateInput}
                        onChange={(e) => setTextTranslateInput(e.target.value)}
                        placeholder="Paste your transcript here, or upload a file above…"
                        rows={6}
                        className="w-full text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                      />
                      <div className="flex gap-2">
                        <select
                          value={textTranslateLang}
                          onChange={(e) => setTextTranslateLang(e.target.value)}
                          className="flex-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
                        >
                          {LANGUAGES.filter((l) => l.value !== "English").map(
                            (l) => (
                              <option key={l.value} value={l.value}>
                                {l.label}
                              </option>
                            ),
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleTextTranslate()}
                          disabled={
                            textTranslating || !textTranslateInput.trim()
                          }
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center gap-2 shrink-0"
                        >
                          {textTranslating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Translating…
                            </>
                          ) : (
                            <>Translate</>
                          )}
                        </button>
                      </div>
                      {textTranslateResult && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              Translation ({textTranslateLang})
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const blob = new Blob([textTranslateResult], {
                                    type: "text/plain;charset=utf-8",
                                  });
                                  const a = document.createElement("a");
                                  a.href = URL.createObjectURL(blob);
                                  a.download = `transcript_translated_${textTranslateLang.toLowerCase()}.txt`;
                                  a.click();
                                  URL.revokeObjectURL(a.href);
                                  toast.success("Translation downloaded");
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                TXT
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const {
                                      Document: D,
                                      Paragraph: P,
                                      TextRun: T,
                                      Packer,
                                    } = await import("docx");
                                    const paras = textTranslateResult
                                      .split("\n")
                                      .map(
                                        (line) =>
                                          new P({
                                            children: [new T({ text: line })],
                                          }),
                                      );
                                    const doc = new D({
                                      sections: [{ children: paras }],
                                    });
                                    const blob = await Packer.toBlob(doc);
                                    const a = document.createElement("a");
                                    a.href = URL.createObjectURL(blob);
                                    a.download = `transcript_translated_${textTranslateLang.toLowerCase()}.docx`;
                                    a.click();
                                    URL.revokeObjectURL(a.href);
                                    toast.success("DOCX downloaded");
                                  } catch {
                                    toast.error("DOCX export failed");
                                  }
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                DOCX
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const { jsPDF } = await import("jspdf");
                                    const doc = new jsPDF({
                                      unit: "mm",
                                      format: "a4",
                                    });
                                    const margin = 20;
                                    const textWidth =
                                      doc.internal.pageSize.getWidth() -
                                      margin * 2;
                                    const pageH =
                                      doc.internal.pageSize.getHeight();
                                    const lineH = 6;
                                    let y = margin;
                                    doc.setFontSize(11);
                                    const allLines = doc.splitTextToSize(
                                      textTranslateResult,
                                      textWidth,
                                    ) as string[];
                                    for (const line of allLines) {
                                      if (y + lineH > pageH - margin) {
                                        doc.addPage();
                                        y = margin;
                                      }
                                      doc.text(line, margin, y);
                                      y += lineH;
                                    }
                                    doc.save(
                                      `transcript_translated_${textTranslateLang.toLowerCase()}.pdf`,
                                    );
                                    toast.success("PDF downloaded");
                                  } catch {
                                    toast.error("PDF export failed");
                                  }
                                }}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                PDF
                              </button>
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {textTranslateResult}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {location.pathname === "/video-to-transcript" && (
                  <SamplesModule
                    sourcePath={location.pathname}
                    samplesHref="/samples#transcript"
                  />
                )}
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                  Your files are processed and deleted. Nothing is stored. Ever.
                </p>
                {!batchUploadEligible() && (
                  <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                    {isPaidPlan ? (
                      <>
                        Batch processing (multiple files) is on{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-200">
                          Pro &amp; Business
                        </span>
                        .{" "}
                        <Link
                          to="/pricing"
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          View plans
                        </Link>
                      </>
                    ) : (
                      <>
                        Batch upload — process many videos in one go — is on{" "}
                        <Link
                          to="/pricing"
                          className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          Pro &amp; Business
                        </Link>
                        .
                      </>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* ── YouTube URL tab ── */}
            {inputMode === "youtube" && (
              <div className="space-y-4">
                {/* Highlighted input card */}
                <div className="rounded-xl sm:rounded-xl border-2 border-red-400/60 dark:border-red-500/50 bg-red-50/60 dark:bg-red-950/20 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    {/* YouTube icon (SVG — no lucide dependency) */}
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5 shrink-0 text-red-600"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Paste a YouTube URL
                    </h3>
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      value={youtubeUrlInput}
                      onChange={(e) => setYoutubeUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleProcessYoutube();
                      }}
                      placeholder="https://youtube.com/watch?v=..."
                      className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 dark:focus:ring-red-500 transition"
                    />
                    {youtubeUrlInput && (
                      <button
                        type="button"
                        onClick={() => setYoutubeUrlInput("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                        aria-label="Clear"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Example hint */}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Supports regular videos, Shorts, and private-link videos.
                    Example:{" "}
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      youtu.be/dQw4w9WgXcQ
                    </span>
                  </p>

                  {/* Validation feedback */}
                  {youtubeUrlInput && !isYoutubeUrl(youtubeUrlInput) && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                      That doesn't look like a YouTube URL. Check the link and
                      try again.
                    </p>
                  )}
                  {youtubeUrlInput && isYoutubeUrl(youtubeUrlInput) && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ Valid YouTube URL
                    </p>
                  )}
                </div>

                {/* Options (same as file mode) */}
                <div className="rounded-xl bg-gray-50/90 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700/50 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Options
                  </h4>
                  <div className="space-y-2">
                    {/* AI Summary — Pro only */}
                    {isPaidPlan ? (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeSummary}
                          onChange={(e) => setIncludeSummary(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Include AI summary &amp; bullets
                        </span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between opacity-60">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          Include AI summary &amp; bullets{" "}
                          <Lock className="w-3 h-3 text-gray-400" />
                        </span>
                        <Link
                          to="/pricing"
                          className="text-xs text-blue-600 font-medium hover:underline"
                        >
                          Pro
                        </Link>
                      </div>
                    )}
                    {/* Chapters — Pro only */}
                    {isPaidPlan ? (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={includeChapters}
                          onChange={(e) => setIncludeChapters(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Auto-generate chapters
                        </span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between opacity-60">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          Auto-generate chapters{" "}
                          <Lock className="w-3 h-3 text-gray-400" />
                        </span>
                        <Link
                          to="/pricing"
                          className="text-xs text-blue-600 font-medium hover:underline"
                        >
                          Pro
                        </Link>
                      </div>
                    )}
                    {/* Audio language — always visible */}
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Audio language{" "}
                        <span className="text-gray-400">
                          (optional — improves accuracy)
                        </span>
                      </label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">Auto-detect</option>
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Speaker labels — Pro only */}
                    {isPaidPlan ? (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={speakerDiarization}
                          onChange={(e) =>
                            setSpeakerDiarization(e.target.checked)
                          }
                          className="rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Speaker labels (who said what)
                        </span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between opacity-60">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          Speaker labels (who said what){" "}
                          <Lock className="w-3 h-3 text-gray-400" />
                        </span>
                        <Link
                          to="/pricing"
                          className="text-xs text-blue-600 font-medium hover:underline"
                        >
                          Pro
                        </Link>
                      </div>
                    )}
                    {isPaidPlan && speakerDiarization && (
                      <>
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                          Speaker identification adds extra processing time —
                          roughly 1.5× longer than standard transcription (e.g.
                          a 2-hour video takes ~10 min instead of ~4 min).
                        </p>
                        <div className="mt-1">
                          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                            No. of speakers
                          </label>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
                            Telling us the speaker count (e.g. a 1-on-1
                            interview) noticeably improves who-said-what
                            accuracy — auto-detect has to guess it first.
                          </p>
                          <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                            {(
                              [
                                { value: "", label: "Auto" },
                                { value: "2", label: "2" },
                                { value: "3", label: "3" },
                                { value: "4", label: "4" },
                                { value: "5", label: "5+" },
                              ] as const
                            ).map(({ value, label }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => setNumSpeakers(value)}
                                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                                  numSpeakers === value
                                    ? "bg-blue-600 text-white"
                                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {numSpeakers === "5" && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                              "5+" is sent as a floor of 5 speakers — the
                              diarization model takes an exact count, not an
                              open-ended range.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Transcribe button */}
                <button
                  type="button"
                  onClick={() => void handleProcessYoutube()}
                  disabled={!youtubeUrlInput || !isYoutubeUrl(youtubeUrlInput)}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 bg-red-500 hover:bg-red-600 text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4 shrink-0"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  Transcribe YouTube Video
                </button>
              </div>
            )}
          </div>
        )}

        {/* Batch mode — file list + process CTA */}
        {isBatchMode && status === "idle" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {batchFiles.length} video
                    {batchFiles.length !== 1 ? "s" : ""} selected
                  </h3>
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                    Pro · up to 20
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBatchFiles([]);
                    setIsBatchMode(false);
                    setBatchTranslateLanguage("");
                    setBatchSpeakerDiarization(false);
                    setBatchPrimaryLanguage("English");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {batchFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                      {f.name}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {(f.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setBatchFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      aria-label="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="block">
                <span className="sr-only">Add more files</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline">
                  + Add more
                  <input
                    type="file"
                    multiple
                    accept="video/*,audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const added = Array.from(e.target.files ?? []);
                      if (added.length)
                        setBatchFiles((prev) =>
                          [...prev, ...added].slice(0, 20),
                        );
                      e.target.value = "";
                    }}
                  />
                </span>
              </label>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 p-3 space-y-3 text-sm">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                ZIP layout:{" "}
                <span className="font-mono text-[11px]">
                  Batch/&lt;video-folder&gt;/
                </span>{" "}
                with{" "}
                <span className="font-mono text-[11px]">
                  *_transcript_original_*.txt
                </span>
                ,{" "}
                <span className="font-mono text-[11px]">
                  *_transcript_original_*.json
                </span>
                ,{" "}
                <span className="font-mono text-[11px]">
                  *_subtitles_original_*
                </span>
                , <span className="font-mono text-[11px]">*_notion.json</span>
                {isPaidPlan &&
                  ", plus speaker files and translated *_subtitles_translated_* / *_transcript_translated_*"}
                .
              </p>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Spoken language (transcription)
                </label>
                <select
                  value={batchPrimaryLanguage}
                  onChange={(e) => setBatchPrimaryLanguage(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              {isPaidPlan && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={batchSpeakerDiarization}
                      onChange={(e) =>
                        setBatchSpeakerDiarization(e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      Speaker labels (who said what)
                    </span>
                  </label>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Also translate subtitles to (optional)
                    </label>
                    <select
                      value={batchTranslateLanguage}
                      onChange={(e) =>
                        setBatchTranslateLanguage(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">— None —</option>
                      {LANGUAGES.filter((l) => l.value !== "English").map(
                        (l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={handleProcessBatch}
              disabled={batchFiles.length === 0 || isBatchStarting}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              {isBatchStarting ? (
                <>
                  <Loader2
                    className="w-4 h-4 animate-spin shrink-0"
                    aria-hidden
                  />
                  Starting…
                </>
              ) : (
                <>
                  Process {batchFiles.length} video
                  {batchFiles.length !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        )}

        {status === "idle" && selectedFile && (
          <ProcessingInterface
            file={{
              name: selectedFile.name,
              size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
              duration:
                filePreview?.durationSeconds != null
                  ? formatDuration(filePreview.durationSeconds)
                  : undefined,
            }}
            onRemove={() => {
              // if (fileFromWorkflow) workflow.clearVideo()
              setSelectedFile(null);
              setFileFromWorkflow(false);
            }}
            actionLabel="Transcribe Video"
            onAction={(trimStartPercent, trimEndPercent) =>
              handleProcess(trimStartPercent, trimEndPercent, "manual")
            }
            actionLoading={false}
            showVideoPlayer={
              !!(videoPreviewUrl || filePreview?.durationSeconds)
            }
            videoSrc={videoPreviewUrl ?? undefined}
          >
            <div className="space-y-3">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400">
                Options
              </h3>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <div className="py-2">
                  <label className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">
                    Audio language{" "}
                    <span className="text-gray-400">
                      (optional — improves accuracy)
                    </span>
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Auto-detect</option>
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="py-2">
                  <label className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">
                    Also translate to{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>
                  <select
                    value={translationLanguage ?? ""}
                    onChange={(e) => {
                      const language = e.target.value;
                      setTranslateEnabled(Boolean(language));
                      setTranslationLanguage(language || null);
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">— None —</option>
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="py-2">
                  {isPaidPlan ? (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={speakerDiarization}
                        onChange={(e) =>
                          setSpeakerDiarization(e.target.checked)
                        }
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Speaker labels (who said what)
                      </span>
                    </label>
                  ) : (
                    <div className="flex items-center justify-between opacity-60">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        Speaker labels (who said what){" "}
                        <Lock className="w-3 h-3 text-gray-400" />
                      </span>
                      <Link
                        to="/pricing"
                        className="text-xs text-blue-600 font-medium hover:underline"
                      >
                        Pro
                      </Link>
                    </div>
                  )}
                  {isPaidPlan && speakerDiarization && (
                    <>
                      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mt-2">
                        Speaker identification adds extra processing time —
                        roughly 1.5× longer than standard transcription
                        (e.g. a 2-hour video takes ~10 min instead of ~4
                        min).
                      </p>
                      <div className="mt-2">
                        <label className="mb-1 block text-[11px] text-gray-500 dark:text-gray-400">
                          No. of speakers
                        </label>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1.5">
                          Telling us the speaker count (e.g. a 1-on-1
                          interview) noticeably improves who-said-what
                          accuracy — auto-detect has to guess it first.
                        </p>
                        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                          {(
                            [
                              { value: "", label: "Auto" },
                              { value: "2", label: "2" },
                              { value: "3", label: "3" },
                              { value: "4", label: "4" },
                              { value: "5", label: "5+" },
                            ] as const
                          ).map(({ value, label }) => (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setNumSpeakers(value)}
                              className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                                numSpeakers === value
                                  ? "bg-blue-600 text-white"
                                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        {numSpeakers === "5" && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            "5+" is sent as a floor of 5 speakers — the
                            diarization model takes an exact count, not an
                            open-ended range.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </ProcessingInterface>
        )}

        {/* Batch processing progress */}
        {isBatchMode && status === "processing" && batchInfo && (
          <div className="rounded-xl border border-blue-200/80 dark:border-blue-800/50 bg-gradient-to-br from-blue-50/90 via-white to-fuchsia-50/50 dark:from-blue-950/40 dark:via-gray-900/80 dark:to-fuchsia-950/20 p-6 sm:p-8 space-y-6 shadow-lg shadow-blue-500/10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex gap-4">
                <div className="shrink-0 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-fuchsia-600 text-white shadow-md">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white tracking-tight">
                    Batch processing
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    Each video runs full transcription; then we pack everything
                    into one ZIP.
                  </p>
                </div>
              </div>
              <div className="text-right sm:pt-1">
                <p className="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-300">
                  {batchInfo.progress.completed + batchInfo.progress.failed}/
                  {batchInfo.progress.total}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  videos finished
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Overall progress</span>
                <span>{batchInfo.progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200/90 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-fuchsia-500 h-2.5 rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${Math.min(100, batchInfo.progress.percentage)}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 border border-blue-100 dark:border-blue-900/40 text-gray-700 dark:text-gray-300">
                <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                ZIP: Batch/&lt;folder&gt;/ per video
              </span>
              {batchInfo.progress.failed > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/40 px-3 py-1.5 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {batchInfo.progress.failed} failed (see ZIP error log)
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 border-t border-blue-100/80 dark:border-blue-900/30 pt-4">
              Download unlocks when every video finishes. You can leave this
              page — the job runs on our servers.
            </p>
          </div>
        )}

        {/* Batch completed results */}
        {isBatchMode && status === "completed" && batchInfo && (
          <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/60 dark:from-emerald-950/35 dark:via-gray-900/90 dark:to-teal-950/25 p-6 sm:p-8 space-y-6 shadow-lg shadow-emerald-500/10">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                <Download className="w-6 h-6" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Your batch is ready
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {batchInfo.progress.completed} of {batchInfo.progress.total}{" "}
                  transcribed successfully
                  {batchInfo.progress.failed > 0 && (
                    <span className="text-amber-700 dark:text-amber-400">
                      {" "}
                      · {batchInfo.progress.failed} could not be completed
                      (details included in the ZIP)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 leading-relaxed">
                  Inside the ZIP: <span className="font-mono">README.txt</span>{" "}
                  explains the layout. Open{" "}
                  <span className="font-mono">Batch/</span> — each subfolder is
                  one video with{" "}
                  <span className="font-mono">*_transcript_original_*</span>,
                  JSON, subtitles, optional speakers, and translations.
                </p>
              </div>
            </div>
            {batchInfo.errors && batchInfo.errors.length > 0 && (
              <div className="rounded-xl border border-amber-200/50 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-4 py-3 text-sm">
                <p className="font-medium text-amber-900 dark:text-amber-200 mb-2">
                  Issues
                </p>
                <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-300/90 text-xs">
                  {batchInfo.errors.map((e, i) => (
                    <li key={i}>
                      <span className="font-medium">{e.videoName}</span>:{" "}
                      {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a
              href={getBatchDownloadUrl(batchInfo.batchId)}
              download
              className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              Download all as ZIP
            </a>
            <button
              type="button"
              onClick={handleProcessAnother}
              className="w-full py-2.5 px-6 rounded-xl text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Process another batch
            </button>
          </div>
        )}

        {!isBatchMode && status === "processing" && (
          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl p-8 border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-blue-200 dark:border-blue-900/30">
              {/* YouTube thumbnail or file icon */}
              {youtubeThumbnailUrl ? (
                <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-800">
                  <img
                    src={youtubeThumbnailUrl}
                    alt={youtubeDisplayTitle ?? "YouTube video"}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-blue-200 dark:bg-blue-900/50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1 truncate">
                  {youtubeDisplayTitle ?? selectedFile?.name ?? "Processing…"}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {youtubeDisplayTitle ? (
                    <>
                      {youtubeDurationSec != null &&
                        formatDuration(youtubeDurationSec)}
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-3 h-3 shrink-0"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        YouTube
                      </span>
                    </>
                  ) : (
                    <>
                      {selectedFile &&
                        `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                      {filePreview?.durationSeconds != null &&
                        ` • ${formatDuration(filePreview.durationSeconds)}`}
                    </>
                  )}
                </p>
              </div>
            </div>
            <ProcessingProgress
              steps={
                youtubeDisplayTitle
                  ? [
                      {
                        label: "Captions",
                        status:
                          youtubeStage == null
                            ? "active"
                            : youtubeStage === "fetching_captions"
                              ? "active"
                              : "completed",
                      },
                      {
                        label: "Audio",
                        status:
                          youtubeStage == null
                            ? "pending"
                            : youtubeStage === "fetching_captions"
                              ? "pending"
                              : youtubeStage === "downloading_audio"
                                ? "active"
                                : "completed",
                      },
                      {
                        label: "Transcript",
                        status:
                          youtubeStage === "transcribing"
                            ? "active"
                            : progress >= 100
                              ? "completed"
                              : "pending",
                      },
                    ]
                  : [
                      {
                        label: "Uploading",
                        status:
                          uploadPhase === "uploading" ? "active" : "completed",
                      },
                      {
                        label: "Processing",
                        status:
                          uploadPhase === "processing"
                            ? "active"
                            : uploadPhase === "uploading"
                              ? "pending"
                              : "completed",
                      },
                      {
                        label: "Finalizing",
                        status: progress >= 100 ? "completed" : "pending",
                      },
                    ]
              }
              currentMessage={
                isRehydrating
                  ? "Resuming…"
                  : uploadPhase === "uploading"
                    ? `Uploading (${uploadProgress}%)`
                    : youtubeDisplayTitle &&
                        youtubeStage === "fetching_captions"
                      ? "Fetching captions…"
                      : youtubeDisplayTitle &&
                          youtubeStage === "downloading_audio"
                        ? "Downloading audio (captions unavailable)…"
                        : youtubeDisplayTitle && youtubeStage === "transcribing"
                          ? "Transcribing audio…"
                          : youtubeDisplayTitle
                            ? "Processing YouTube video…"
                            : "Processing audio and generating transcript"
              }
              progress={uploadPhase === "uploading" ? uploadProgress : progress}
              estimatedTime={youtubeDisplayTitle ? undefined : "30-60 seconds"}
              statusSubtext={
                queuePosition !== undefined
                  ? `${queuePosition} jobs ahead of you`
                  : undefined
              }
              liveTranscript={partialSegments.map((s) => s.text).join("\n")}
              onCancel={handleCancelUpload}
            />
            <ResultSkeleton variant="transcript" />
          </div>
        )}

        {!isBatchMode && status === "completed" && result && (
          <>
            {/* ── Teaser preview card (non-logged-in) — first 10% of real content ── */}
            {showAuthGate &&
              !isLoggedIn() &&
              (() => {
                const fullText =
                  displayTranscript ||
                  fullTranscript ||
                  transcriptPreview ||
                  "";
                const previewSegs = result.segments?.length
                  ? result.segments.slice(
                      0,
                      Math.max(3, Math.ceil(result.segments.length * 0.25)),
                    )
                  : null;
                const previewText = fullText.slice(
                  0,
                  Math.max(400, Math.ceil(fullText.length * 0.25)),
                );
                return (
                  <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden select-none mb-2">
                    {/* preview banner */}
                    <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-50/80 via-cyan-50/70 to-blue-50/70 dark:from-emerald-950/30 dark:via-cyan-950/20 dark:to-blue-950/20">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                          aria-hidden
                        />
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">
                          Transcript preview
                        </span>
                        {lastProcessingMs != null && (
                          <span className="text-xs text-gray-400">
                            · {(lastProcessingMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {[
                          result.segments?.length
                            ? `${result.segments.length} segments`
                            : "",
                          fullText
                            ? `~${Math.round(fullText.trim().split(/\s+/).length)} words`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>

                    {/* 10% preview — real segments or text, fades out at bottom */}
                    <div
                      className="relative overflow-hidden"
                      style={{ maxHeight: "18rem" }}
                    >
                      <div className="px-5 py-4 space-y-2">
                        {previewSegs ? (
                          previewSegs.map((seg, i) => {
                            const mins = Math.floor(seg.start / 60);
                            const secs = Math.floor(seg.start % 60);
                            const ts = `${mins}:${String(secs).padStart(2, "0")}`;
                            return (
                              <div key={i} className="flex gap-3 items-start">
                                <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5 w-8">
                                  {ts}
                                </span>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                  {seg.text}
                                </p>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {previewText}
                          </p>
                        )}
                      </div>
                      {/* strong gradient fade — covers bottom ~55% to make it feel "cut off" */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none bg-gradient-to-t from-white dark:from-gray-900 via-white/60 dark:via-gray-900/60 to-transparent"
                        aria-hidden
                      />
                    </div>

                    {/* locked features + CTA */}
                    <div className="px-5 pb-5 pt-2 pointer-events-auto">
                      <p className="text-[11px] text-gray-400 mb-2 font-medium">
                        Sign up to unlock:
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(
                          [
                            "Full transcript",
                            "Summary",
                            "Speaker labels",
                            "Chapters",
                            "SRT / VTT / PDF",
                          ] as const
                        ).map((feat) => (
                          <span
                            key={feat}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-400 dark:text-gray-500"
                          >
                            <Lock className="w-2.5 h-2.5" aria-hidden />
                            {feat}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthModalMode("signup-combo");
                            setShowAuthModal(true);
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                        >
                          Create free account
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthModalMode("login");
                            setShowAuthModal(true);
                          }}
                          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Log in
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

            <div
              className={`space-y-6 ${audioObjectUrl ? "pb-24 sm:pb-28" : ""}`}
              hidden={showAuthGate && !isLoggedIn()}
            >
              <FreePlanNudge tool="transcript" resultKey={currentJobId || result.downloadUrl} />
              {/* ── Transcript stats pills ── */}
              {(() => {
                const text =
                  displayTranscript ||
                  fullTranscript ||
                  transcriptPreview ||
                  "";
                const wordCount = text.trim()
                  ? text.trim().split(/\s+/).filter(Boolean).length
                  : 0;
                const segCount = result.segments?.length ?? 0;
                const readMin =
                  wordCount > 0 ? Math.max(1, Math.round(wordCount / 200)) : 0;
                const lastSeg = result.segments?.length
                  ? result.segments[result.segments.length - 1]
                  : null;
                const durSec = lastSeg?.end ?? 0;
                const durStr =
                  durSec > 60
                    ? `${Math.floor(durSec / 60)}m ${String(Math.floor(durSec % 60)).padStart(2, "0")}s`
                    : durSec > 0
                      ? `${Math.floor(durSec)}s`
                      : null;
                if (!wordCount) return null;
                const pills = [
                  wordCount > 0 && `${wordCount.toLocaleString()} words`,
                  segCount > 0 && `${segCount} segments`,
                  readMin > 0 && `~${readMin} min read`,
                  durStr,
                ].filter(Boolean) as string[];
                return (
                  <div className="flex flex-wrap items-center gap-2 px-1">
                    {pills.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                );
              })()}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleProcessAnother}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-600 px-3 py-2 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Upload new file
                </button>
              </div>

              {/* Main workspace: transcript / speakers (left) + insight rail (right) */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,500px)] xl:grid-cols-[minmax(0,1fr)_540px] items-start">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden flex flex-col min-h-[min(62vh,640px)]">
                  <div
                    className="flex h-10 shrink-0 gap-1 border-b border-gray-100 bg-gray-50/90 px-2 pt-1 dark:border-gray-800 dark:bg-gray-950/50"
                    role="tablist"
                    aria-label="Transcript or speakers"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={leftWorkspaceTab === "transcript"}
                      onClick={() => setLeftWorkspaceTab("transcript")}
                      className={`px-3 py-2 text-[13px] font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                        leftWorkspaceTab === "transcript"
                          ? "border-blue-600 text-gray-900 dark:text-white bg-white dark:bg-gray-900"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      Transcript
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={leftWorkspaceTab === "speakers"}
                      onClick={() => setLeftWorkspaceTab("speakers")}
                      className={`px-3 py-2 text-[13px] font-medium rounded-t-lg border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${
                        leftWorkspaceTab === "speakers"
                          ? "border-blue-600 text-gray-900 dark:text-white bg-white dark:bg-gray-900"
                          : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      Speakers
                      {!isPaidPlan && (
                        <Gem
                          className="w-3.5 h-3.5 text-blue-600 shrink-0 opacity-80"
                          aria-hidden
                        />
                      )}
                    </button>
                  </div>
                  {leftWorkspaceTab === "speakers" ? (
                    <div className="p-5 flex-1 min-h-0 flex flex-col overflow-hidden">
                      <SpeakerSegmentsPanel
                        data={getSpeakersData()}
                        segments={result?.segments}
                        audioObjectUrl={audioObjectUrl}
                        activeSegIdx={activeSegIdx}
                        transcriptView={transcriptView}
                        translatedSegments={translatedSegments ?? undefined}
                        diarizationWasRequested={diarizationWasRequested}
                        speakerSegmentRefsRef={speakerSegmentRefsRef}
                        audioRef={audioRef}
                        onRenameSpeaker={handleRenameSpeaker}
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col p-4">
                      {/* Panel header with translation sub-tabs inline */}
                      <div className="flex items-center justify-end gap-4 mb-4">
                        {/* Translation tabs — right-aligned, shown when translation is ready */}
                        {translateEnabled && translationLanguage && (
                          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                            {translatedCache[translationLanguage] ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setTranscriptView("original")}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    transcriptView === "original"
                                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                  }`}
                                >
                                  Original
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTranscriptView("translated")
                                  }
                                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    transcriptView === "translated"
                                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                                  }`}
                                >
                                  {translationLanguage}
                                </button>
                              </>
                            ) : fullTranscript ? (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-500">
                                <span className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                                Translating to {translationLanguage}…
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div className="flex-1 min-w-[160px] relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Search in transcript"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 w-full rounded-md border-0 bg-black/[0.04] pl-9 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                        {isPaidPlan && (
                          <button
                            type="button"
                            onClick={() => setTranscriptEditMode((v) => !v)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            aria-label={
                              transcriptEditMode
                                ? "Done editing"
                                : "Edit transcript"
                            }
                            title={transcriptEditMode ? "Done" : "Edit"}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {/* "Saved" indicator — appears after the 1.5 s auto-save debounce fires */}
                        {editsSavedAt && (
                          <span
                            className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 select-none"
                            aria-live="polite"
                          >
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                              aria-hidden
                            />
                            saved
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handleCopyToClipboard}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                          aria-label="Copy transcript"
                          title="Copy"
                        >
                          <CopyIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          Timestamp mode:
                        </span>
                        <span className="inline-flex items-center rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-200">
                          {timestampMode === "per-speaker"
                            ? "Per speaker"
                            : timestampMode === "per-interval"
                              ? `Per interval (${intervalSec}s)`
                              : timestampMode === "per-segment"
                                ? "Per segment"
                                : timestampMode === "smpte"
                                  ? `SMPTE/BITC (${smpteFps}fps${smpteDropFrame ? " DF" : " NDF"})`
                                  : "No timestamps"}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          Transcript mode:
                        </span>
                        <span className="inline-flex items-center rounded-full border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-200">
                          {verbatimMode === "clean"
                            ? "Clean verbatim"
                            : "Full verbatim"}
                        </span>
                      </div>
                      <div
                        ref={transcriptScrollRef}
                        className="flex-1 min-h-0 overflow-y-auto bg-white rounded-xl border border-gray-200/90 px-5 py-5 shadow-[inset_0_1px_0_0_rgba(15,23,42,0.04)] text-[14px] leading-[1.65] tracking-[-0.011em] text-[#1d1d1f] antialiased selection:bg-blue-100 selection:text-[#1d1d1f] font-[ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Helvetica_Neue',Helvetica,Arial,sans-serif]"
                      >
                        {transcriptEditMode && editableSegments?.length ? (
                          <div className="space-y-3">
                            {editableSegments.map((seg, i) => (
                              <div key={i} className="flex gap-3 items-start">
                                <span className="shrink-0 text-[12px] tabular-nums text-gray-500 font-mono mt-2.5 w-11">
                                  {formatTimestamp(seg.start)}
                                </span>
                                <textarea
                                  className="flex-1 min-h-[3.25rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-[16px] leading-relaxed text-[#1d1d1f] shadow-sm resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-300"
                                  value={seg.text}
                                  rows={2}
                                  onChange={(e) =>
                                    setEditableSegments((prev) =>
                                      prev
                                        ? prev.map((s, j) =>
                                            j === i
                                              ? { ...s, text: e.target.value }
                                              : s,
                                          )
                                        : prev,
                                    )
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        ) : result?.segments?.length ? (
                          (() => {
                            const segs =
                              transcriptView === "translated" &&
                              translatedSegments
                                ? translatedSegments
                                : (editableSegments ?? result.segments);

                            // Shared segment span renderer — preserves audio-sync refs and active highlight
                            const segSpan = (
                              seg: (typeof segs)[0],
                              globalIndex: number,
                            ) => {
                              const isActive = globalIndex === activeSegIdx;
                              const origSeg = result.segments![globalIndex];
                              const displayText =
                                verbatimMode === "clean"
                                  ? applyCleanVerbatim(seg.text)
                                  : seg.text;
                              return (
                                <span
                                  key={globalIndex}
                                  ref={(el) => {
                                    if (el)
                                      segmentRefsRef.current.set(
                                        globalIndex,
                                        el,
                                      );
                                    else
                                      segmentRefsRef.current.delete(
                                        globalIndex,
                                      );
                                  }}
                                  onClick={() => {
                                    if (!audioRef.current || !origSeg) return;
                                    audioRef.current.currentTime =
                                      origSeg.start;
                                    audioRef.current.play().catch(() => {});
                                  }}
                                  className={
                                    audioObjectUrl ? "cursor-pointer" : ""
                                  }
                                >
                                  {timestampMode === "per-segment" && (
                                    <span
                                      className={`mr-1 inline-block shrink-0 align-baseline text-[12px] font-mono tabular-nums text-gray-500 ${isActive ? "font-medium text-blue-700" : ""}`}
                                    >
                                      (
                                      {formatTimestamp(
                                        origSeg?.start ?? seg.start,
                                      )}
                                      )
                                    </span>
                                  )}
                                  <span
                                    className={
                                      isActive
                                        ? "rounded-sm bg-amber-100/95 px-0.5 text-[#1d1d1f] shadow-sm transition-colors duration-150"
                                        : ""
                                    }
                                  >
                                    {displayText}
                                  </span>{" "}
                                </span>
                              );
                            };

                            if (timestampMode === "per-segment") {
                              // Legacy chunk-of-5 view with per-segment timestamps
                              const groups: {
                                seg: (typeof segs)[0];
                                globalIndex: number;
                              }[][] = [];
                              for (let i = 0; i < segs.length; i += 5) {
                                groups.push(
                                  segs.slice(i, i + 5).map((s, j) => ({
                                    seg: s,
                                    globalIndex: i + j,
                                  })),
                                );
                              }
                              return (
                                <div className="max-w-[52rem]">
                                  {groups.map((group, pi) => (
                                    <p key={pi} className="mb-6 last:mb-0">
                                      {group.map(({ seg, globalIndex }) =>
                                        segSpan(seg, globalIndex),
                                      )}
                                    </p>
                                  ))}
                                </div>
                              );
                            }

                            if (timestampMode === "per-interval") {
                              // Interval-marker view: [MM:SS] header before the first segment in each N-second block
                              const intervalItems: {
                                markerTime?: number;
                                seg?: (typeof segs)[0];
                                globalIndex?: number;
                              }[] = [];
                              let nextMarker = 0;
                              for (let i = 0; i < segs.length; i++) {
                                while (nextMarker <= segs[i].start) {
                                  intervalItems.push({
                                    markerTime: nextMarker,
                                  });
                                  nextMarker += intervalSec;
                                }
                                intervalItems.push({
                                  seg: segs[i],
                                  globalIndex: i,
                                });
                              }
                              // Group non-marker items into paragraphs between markers
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const rendered: any[] = [];
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              let buf: any[] = [];
                              const flushBuf = (key: string) => {
                                if (buf.length) {
                                  rendered.push(
                                    <p key={key} className="mb-3 last:mb-0">
                                      {buf}
                                    </p>,
                                  );
                                  buf = [];
                                }
                              };
                              intervalItems.forEach((item, idx) => {
                                if (item.markerTime != null) {
                                  flushBuf(`para-${idx}`);
                                  rendered.push(
                                    <div
                                      key={`marker-${item.markerTime}`}
                                      className="mt-5 first:mt-0 mb-1.5 text-[13px] font-bold text-blue-600 dark:text-blue-400"
                                    >
                                      [{formatTimestamp(item.markerTime)}]
                                    </div>,
                                  );
                                } else if (
                                  item.seg != null &&
                                  item.globalIndex != null
                                ) {
                                  buf.push(segSpan(item.seg, item.globalIndex));
                                }
                              });
                              flushBuf("para-last");
                              return (
                                <div className="max-w-[52rem]">{rendered}</div>
                              );
                            }

                            // per-speaker or none: group by speaker turn with optional headers
                            const resolvedForView = withResolvedSpeakers(
                              segs,
                              speakerNameMap,
                            );
                            const showSpeakerHeaders =
                              timestampMode === "per-speaker" ||
                              timestampMode === "smpte";
                            const hasSpeakers =
                              showSpeakerHeaders &&
                              resolvedForView.some((s) => s.speaker);

                            // Build view groups (same logic as groupSegmentsBySpeakerEntry but keeping globalIndex)
                            interface VG {
                              speaker?: string;
                              startTime: number;
                              items: {
                                seg: (typeof segs)[0];
                                globalIndex: number;
                                newPara: boolean;
                              }[];
                            }
                            const vGroups: VG[] = [];
                            for (let i = 0; i < resolvedForView.length; i++) {
                              const rseg = resolvedForView[i];
                              const prev =
                                i > 0 ? resolvedForView[i - 1] : null;
                              const gap = prev
                                ? Math.max(0, rseg.start - prev.end)
                                : Infinity;
                              const last = vGroups[vGroups.length - 1];
                              if (!last || last.speaker !== rseg.speaker) {
                                vGroups.push({
                                  speaker: rseg.speaker,
                                  startTime: rseg.start,
                                  items: [
                                    {
                                      seg: segs[i],
                                      globalIndex: i,
                                      newPara: false,
                                    },
                                  ],
                                });
                              } else {
                                last.items.push({
                                  seg: segs[i],
                                  globalIndex: i,
                                  newPara: gap >= 3.0,
                                });
                              }
                            }

                            return (
                              <div className="max-w-[52rem] space-y-5">
                                {vGroups.map((vg, gi) => {
                                  // Split items into paragraphs on newPara boundaries
                                  const paras: {
                                    seg: (typeof segs)[0];
                                    globalIndex: number;
                                  }[][] = [[]];
                                  for (const item of vg.items) {
                                    if (
                                      item.newPara &&
                                      paras[paras.length - 1].length > 0
                                    )
                                      paras.push([]);
                                    paras[paras.length - 1].push({
                                      seg: item.seg,
                                      globalIndex: item.globalIndex,
                                    });
                                  }
                                  return (
                                    <div key={gi}>
                                      {hasSpeakers && vg.speaker && (
                                        <div className="mb-1.5 border-t border-black/[0.06] pt-2 font-mono text-[11px] uppercase text-gray-500">
                                          {vg.speaker}
                                          {showSpeakerHeaders && (
                                            <span className="ml-1.5 font-mono text-[11px] text-gray-400">
                                              {timestampMode === "smpte"
                                                ? addAnchorTimecode(
                                                    smpteAnchor,
                                                    smpteFps,
                                                    vg.startTime,
                                                  )
                                                : formatTimestamp(
                                                    vg.startTime,
                                                  )}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <div className="space-y-3">
                                        {paras.map((para, pi) => (
                                          <p key={pi}>
                                            {para.map(({ seg, globalIndex }) =>
                                              segSpan(seg, globalIndex),
                                            )}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="max-w-[52rem] whitespace-pre-wrap break-words text-[#1d1d1f]">
                            {displayTranscript ||
                              fullTranscript ||
                              transcriptPreview ||
                              ""}
                          </div>
                        )}
                      </div>
                      <div className="mt-6 rounded-xl border border-blue-200/80 dark:border-blue-800/70 bg-gradient-to-r from-blue-50 via-blue-50 to-fuchsia-50 dark:from-blue-950/30 dark:via-blue-950/20 dark:to-fuchsia-950/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                            Need a download?
                          </p>
                          <p className="text-xs text-blue-700/90 dark:text-blue-300/90">
                            Use the Exports panel on the right for TXT, SRT,
                            DOCX, PDF, JSON, CSV and more.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const node =
                              document.getElementById("exports-panel");
                            if (node)
                              node.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                          }}
                          className="inline-flex items-center justify-center rounded-lg bg-blue-700 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 transition-colors shrink-0"
                        >
                          Go to Exports
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <aside className="min-w-0 space-y-3 self-start lg:sticky lg:top-20">
                  {(() => {
                    const schema = getSummarySchema();
                    const previewBullets = [
                      ...(schema.bullets?.length ? schema.bullets : []),
                      ...(!schema.bullets?.length
                        ? (schema.key_points ?? [])
                        : []),
                    ];
                    const chapters = getChaptersData();
                    const highlights = getHighlightsData();
                    const keywords = getKeywordsData();
                    const detailCls =
                      "group rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-950/40 overflow-hidden";
                    const summaryCls =
                      "flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 [&::-webkit-details-marker]:hidden";
                    return (
                      <>
                        <div
                          id="exports-panel"
                          className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                        >
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              <FileCode
                                className="w-4 h-4 text-blue-600"
                                strokeWidth={1.7}
                              />
                              Exports
                            </h3>
                            <span className="text-[11px] text-gray-500">
                              All formats
                            </span>
                          </div>
                          {!fullTranscript ? (
                            <p className="text-xs text-gray-500">
                              Exports appear after transcript data is ready.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {/* ── Output settings (mirrored from pre-processing panel, always visible at export time) ── */}
                              <div className="space-y-2 rounded-lg border border-gray-100 px-2 pb-2 dark:border-gray-800">
                                <div className="flex items-center justify-between pt-2">
                                  <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                    Output settings
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    Default: Per interval
                                  </span>
                                </div>
                                <div className="pt-2">
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                                    Timestamp format
                                  </p>
                                  <div className="flex flex-col gap-1">
                                    {(
                                      [
                                        {
                                          value: "per-speaker",
                                          label: "Per speaker",
                                        },
                                        {
                                          value: "per-interval",
                                          label: "Per interval",
                                        },
                                        {
                                          value: "none",
                                          label: "No timestamps",
                                        },
                                        {
                                          value: "per-segment",
                                          label: "Per segment",
                                        },
                                        {
                                          value: "smpte",
                                          label: "SMPTE / BITC timecode",
                                        },
                                      ] as const
                                    ).map(({ value, label }) => (
                                      <label
                                        key={value}
                                        className="flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <input
                                          type="radio"
                                          name="ts-sidebar"
                                          value={value}
                                          checked={timestampMode === value}
                                          onChange={() =>
                                            setTimestampMode(value)
                                          }
                                          className="accent-blue-600"
                                        />
                                        <span className="text-xs text-gray-700 dark:text-gray-300">
                                          {label}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                  {timestampMode === "per-interval" && (
                                    <div className="flex items-center gap-2 mt-1.5 ml-4">
                                      <label className="text-[10px] text-gray-500 shrink-0">
                                        Interval:
                                      </label>
                                      <select
                                        value={intervalSec}
                                        onChange={(e) =>
                                          setIntervalSec(Number(e.target.value))
                                        }
                                        className="text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-1.5 py-0.5"
                                      >
                                        <option value={15}>15s</option>
                                        <option value={30}>30s</option>
                                        <option value={60}>1m</option>
                                        <option value={120}>2m</option>
                                        <option value={300}>5m</option>
                                      </select>
                                    </div>
                                  )}
                                  {timestampMode === "smpte" && (
                                    <div className="mt-1.5 ml-4 space-y-1.5">
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        Starting timecode (matches the video's
                                        BITC / burned-in timecode)
                                      </p>
                                      <div className="flex items-center gap-1">
                                        {(
                                          [
                                            { v: smpteAnchorH, set: setSmpteAnchorH, max: 23, label: "HH" },
                                            { v: smpteAnchorM, set: setSmpteAnchorM, max: 59, label: "MM" },
                                            { v: smpteAnchorS, set: setSmpteAnchorS, max: 59, label: "SS" },
                                            { v: smpteAnchorF, set: setSmpteAnchorF, max: 59, label: "FF" },
                                          ] as const
                                        ).map(({ v, set, max, label }, i) => (
                                          <span key={label} className="flex items-center">
                                            {i > 0 && (
                                              <span className="text-[10px] text-gray-400 px-0.5">
                                                :
                                              </span>
                                            )}
                                            <input
                                              type="number"
                                              min={0}
                                              max={max}
                                              value={v}
                                              onChange={(e) =>
                                                set(
                                                  Math.max(0, Math.min(max, Number(e.target.value) || 0)),
                                                )
                                              }
                                              title={label}
                                              className="w-10 text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-1 py-0.5"
                                            />
                                          </span>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <label className="text-[10px] text-gray-500 shrink-0">
                                          Frame rate:
                                        </label>
                                        <select
                                          value={smpteFpsChoice}
                                          onChange={(e) =>
                                            setSmpteFpsChoice(e.target.value)
                                          }
                                          className="text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-1.5 py-0.5"
                                        >
                                          <option value="23.976">23.976 fps</option>
                                          <option value="24">24 fps</option>
                                          <option value="25">25 fps (PAL)</option>
                                          <option value="29.97-ndf">
                                            29.97 fps — Non-Drop
                                          </option>
                                          <option value="29.97-df">
                                            29.97 fps — Drop-Frame (NTSC)
                                          </option>
                                          <option value="30">30 fps</option>
                                          <option value="50">50 fps</option>
                                          <option value="59.94-ndf">
                                            59.94 fps — Non-Drop
                                          </option>
                                          <option value="59.94-df">
                                            59.94 fps — Drop-Frame
                                          </option>
                                          <option value="60">60 fps</option>
                                        </select>
                                      </div>
                                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                        Computed deterministically from this
                                        anchor + frame rate — never edited by
                                        AI formatting.
                                      </p>
                                    </div>
                                  )}
                                  {timestampMode === "per-speaker" && (
                                    <div className="mt-2 ml-4 space-y-1.5">
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        Speaker labels for exports
                                      </p>
                                      {hasDiarizedSpeakersForExport ? (
                                        speakerOptionsForExport.map(
                                          (rawSpeaker, idx) => (
                                            <label
                                              key={rawSpeaker}
                                              className="flex items-center gap-2 text-[10px]"
                                            >
                                              <span className="min-w-20 text-gray-500">
                                                {rawSpeaker}
                                              </span>
                                              <input
                                                value={
                                                  speakerNameMap[rawSpeaker] ??
                                                  ""
                                                }
                                                onChange={(e) =>
                                                  setSpeakerNameMap((prev) => ({
                                                    ...prev,
                                                    [rawSpeaker]:
                                                      e.target.value,
                                                  }))
                                                }
                                                placeholder={`Speaker ${idx + 1}`}
                                                className="flex-1 min-w-0 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-1.5 py-0.5"
                                              />
                                            </label>
                                          ),
                                        )
                                      ) : (
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                                          REPLICATE_API diarization labels are
                                          still processing for this job. If no
                                          labels appear, reprocess with speaker
                                          diarization enabled.
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                                    Verbatim mode
                                  </p>
                                  <div className="flex flex-col gap-1">
                                    {(
                                      [
                                        {
                                          value: "full",
                                          label: "Full verbatim",
                                        },
                                        {
                                          value: "clean",
                                          label: "Clean verbatim",
                                        },
                                      ] as const
                                    ).map(({ value, label }) => (
                                      <label
                                        key={value}
                                        className="flex items-center gap-1.5 cursor-pointer"
                                      >
                                        <input
                                          type="radio"
                                          name="vb-sidebar"
                                          value={value}
                                          checked={verbatimMode === value}
                                          onChange={() =>
                                            setVerbatimMode(value)
                                          }
                                          className="accent-blue-600"
                                        />
                                        <span className="text-xs text-gray-700 dark:text-gray-300">
                                          {label}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">
                                  Subtitles
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {(["srt", "vtt"] as const).map((format) => (
                                    <button
                                      key={format}
                                      type="button"
                                      onClick={() => downloadSubtitleExport(format)}
                                      className="rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 px-2 py-2 text-[11px] font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                      {format.toUpperCase()}
                                      {!isPaidPlan && (
                                        <span className="text-gray-400 font-normal"> · wm</span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">
                                  Documents
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  {(["pdf", "docx", "text"] as const).map(
                                    (format) => {
                                      const canClick = true;
                                      const handleDownload = () => {
                                        if (format === "pdf") {
                                          handleExportPdf();
                                          return;
                                        }
                                        if (format === "docx") {
                                          handleExportDocx();
                                          return;
                                        }
                                        const segsForFormat =
                                          segmentsForExport ?? [];
                                        const content = buildTxt(
                                          segsForFormat,
                                          speakerNameMap,
                                          {
                                            timestampMode,
                                            verbatimMode,
                                            intervalSec,
                                            smpteAnchor,
                                            smpteFps,
                                          },
                                        );
                                        const freeCanDownload =
                                          !isPaidPlan && freeExportsUsed < 2;
                                        const freeUsedAll =
                                          !isPaidPlan && freeExportsUsed >= 2;
                                        if (isPaidPlan) {
                                          const blob = new Blob([content], {
                                            type: "text/plain",
                                          });
                                          const a = document.createElement("a");
                                          a.href = URL.createObjectURL(blob);
                                          a.download = transcriptExportName(
                                            selectedFile?.name,
                                            "text",
                                            exportSourceLangCode,
                                          );
                                          a.click();
                                          URL.revokeObjectURL(a.href);
                                          toast.success("Download started");
                                          return;
                                        }
                                        if (!freeCanDownload || freeUsedAll) {
                                          toast(
                                            "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
                                          );
                                          return;
                                        }
                                        const blob = new Blob(
                                          [watermarkTextExport(content, "txt")],
                                          { type: "text/plain" },
                                        );
                                        setFreeExportsUsed((prev) => prev + 1);
                                        const a = document.createElement("a");
                                        a.href = URL.createObjectURL(blob);
                                        a.download = transcriptExportName(
                                          selectedFile?.name,
                                          "text",
                                          exportSourceLangCode,
                                        );
                                        a.click();
                                        URL.revokeObjectURL(a.href);
                                        toast.success(
                                          "Download started (with watermark)",
                                        );
                                      };
                                      return (
                                        <button
                                          key={format}
                                          type="button"
                                          onClick={handleDownload}
                                          disabled={!canClick}
                                          className="rounded-lg border border-blue-400/70 dark:border-blue-500/70 bg-blue-600 dark:bg-blue-700 px-2 py-2 text-[11px] font-semibold tracking-wide text-white hover:bg-blue-600 dark:hover:bg-blue-600 transition-colors"
                                          title="Click to download"
                                        >
                                          {format.toUpperCase()}
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">
                                  Other formats
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {(["json", "csv", "notion"] as const).map(
                                    (format) => {
                                      const schema = getSummarySchema();
                                      const chapters = getChaptersData();
                                      const highlights = getHighlightsData();
                                      const keywords = getKeywordsData();
                                      const segsForFormat =
                                        segmentsForExport ?? [];
                                      const content =
                                        format === "json"
                                          ? buildJson(
                                              segsForFormat,
                                              speakerNameMap,
                                              {
                                                summary: schema,
                                                chapters,
                                                highlights,
                                                keywords,
                                              },
                                              {
                                                timestampMode,
                                                verbatimMode,
                                                smpteAnchor,
                                                smpteFps,
                                              },
                                            )
                                          : format === "csv"
                                            ? buildCsv(
                                                segsForFormat,
                                                speakerNameMap,
                                                {
                                                  timestampMode,
                                                  verbatimMode,
                                                  smpteAnchor,
                                                  smpteFps,
                                                },
                                              )
                                            : format === "notion"
                                              ? buildNotion(
                                                  segsForFormat,
                                                  speakerNameMap,
                                                  {
                                                    timestampMode,
                                                    verbatimMode,
                                                    smpteAnchor,
                                                    smpteFps,
                                                  },
                                                )
                                              : buildTxt(
                                                  segsForFormat,
                                                  speakerNameMap,
                                                  {
                                                    timestampMode,
                                                    verbatimMode,
                                                    intervalSec,
                                                    smpteAnchor,
                                                    smpteFps,
                                                  },
                                                );
                                        const freeCanDownload =
                                          !isPaidPlan && freeExportsUsed < 2;
                                        const freeUsedAll =
                                          !isPaidPlan && freeExportsUsed >= 2;
                                        const mimeType =
                                          format === "json"
                                            ? "application/json"
                                            : "text/plain";
                                        const canClick =
                                          isPaidPlan || freeCanDownload;
                                        const handleDownload = () => {
                                          if (isPaidPlan) {
                                            const blob = new Blob([content], {
                                              type: mimeType,
                                            });
                                            const a = document.createElement("a");
                                            a.href = URL.createObjectURL(blob);
                                            a.download = transcriptExportName(
                                              selectedFile?.name,
                                              format,
                                              exportSourceLangCode,
                                            );
                                            a.click();
                                            URL.revokeObjectURL(a.href);
                                            toast.success("Download started");
                                            return;
                                          }
                                          if (freeUsedAll) {
                                            toast(
                                              "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
                                            );
                                            return;
                                          }
                                          const blob = new Blob(
                                            [
                                              watermarkTextExport(
                                                content,
                                                format === "json"
                                                  ? "json"
                                                  : format === "csv"
                                                    ? "csv"
                                                    : "notion",
                                              ),
                                            ],
                                            { type: mimeType },
                                          );
                                        setFreeExportsUsed((prev) => prev + 1);
                                        const a = document.createElement("a");
                                        a.href = URL.createObjectURL(blob);
                                        a.download = transcriptExportName(
                                          selectedFile?.name,
                                          format,
                                          exportSourceLangCode,
                                        );
                                        a.click();
                                        URL.revokeObjectURL(a.href);
                                        toast.success(
                                          "Download started (with watermark)",
                                        );
                                      };
                                      return (
                                        <button
                                          key={format}
                                          type="button"
                                          onClick={handleDownload}
                                          disabled={!canClick}
                                          className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                                            canClick
                                              ? "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                              : "border-gray-200 dark:border-gray-700 text-gray-400 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
                                          }`}
                                        >
                                          {format.toUpperCase()}
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleExportPdfThreeColumn()
                                    }
                                    className="rounded-lg border border-blue-200 dark:border-blue-700/60 px-2 py-2 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                    title="3-column table: Speaker | Timecode | Dialogue"
                                  >
                                    PDF 3-col
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleExportDocxThreeColumn}
                                    className="rounded-lg border border-blue-200 dark:border-blue-700/60 px-2 py-2 text-[11px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                    title="3-column table: Speaker | Timecode | Dialogue"
                                  >
                                    DOCX 3-col
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                  3-col: Speaker · Timecode · Dialogue table
                                </p>
                              </div>
                              {/* ── Translated exports — only shown when translate was enabled ── */}
                              {translateEnabled &&
                                translationLanguage &&
                                (() => {
                                  const isReady = !!translatedSegments;
                                  const langLabel = translationLanguage;
                                  const slug =
                                    targetLangFileSlug(translationLanguage);
                                  const stem = exportFileStem(
                                    selectedFile?.name,
                                    "video",
                                  );
                                  const freeCanDownload =
                                    !isPaidPlan && freeExportsUsed < 2;
                                  const freeUsedAll =
                                    !isPaidPlan && freeExportsUsed >= 2;
                                  const canClick =
                                    isReady && (isPaidPlan || freeCanDownload);

                                  const makeStructuredHandler =
                                    (
                                      format: "txt" | "csv" | "json" | "notion",
                                    ) =>
                                    () => {
                                      if (!translatedSegments) return;
                                      const content =
                                        format === "json"
                                          ? buildJson(
                                              translatedSegments,
                                              speakerNameMap,
                                              {},
                                              {
                                                timestampMode,
                                                verbatimMode,
                                                smpteAnchor,
                                                smpteFps,
                                              },
                                            )
                                          : format === "csv"
                                            ? buildCsv(
                                                translatedSegments,
                                                speakerNameMap,
                                                {
                                                  timestampMode,
                                                  verbatimMode,
                                                  smpteAnchor,
                                                  smpteFps,
                                                },
                                              )
                                            : format === "notion"
                                              ? buildNotion(
                                                  translatedSegments,
                                                  speakerNameMap,
                                                  {
                                                    timestampMode,
                                                    verbatimMode,
                                                    smpteAnchor,
                                                    smpteFps,
                                                  },
                                                )
                                              : buildTxt(
                                                  translatedSegments,
                                                  speakerNameMap,
                                                  {
                                                    timestampMode,
                                                    verbatimMode,
                                                    intervalSec,
                                                    smpteAnchor,
                                                    smpteFps,
                                                  },
                                                );
                                      if (freeUsedAll) {
                                        toast(
                                          "You've used your 2 free exports. Unlock continued downloads with Pro — $7.99/mo.",
                                        );
                                        return;
                                      }
                                      const mimeType =
                                        format === "json"
                                          ? "application/json"
                                          : "text/plain";
                                      const ext =
                                        format === "json"
                                          ? ".json"
                                          : format === "csv"
                                            ? ".csv"
                                            : ".txt";
                                      const payload = isPaidPlan
                                        ? content
                                        : watermarkTextExport(content, format);
                                      if (!isPaidPlan)
                                        setFreeExportsUsed((n) => n + 1);
                                      const blob = new Blob([payload], {
                                        type: mimeType,
                                      });
                                      const a = document.createElement("a");
                                      a.href = URL.createObjectURL(blob);
                                      a.download = joinExportFilename(
                                        stem,
                                        `transcript_translated_${slug}`,
                                        ext,
                                      );
                                      a.click();
                                      URL.revokeObjectURL(a.href);
                                      toast.success(
                                        isPaidPlan
                                          ? "Download started"
                                          : "Download started (with watermark)",
                                      );
                                    };

                                  const btnCls = (active: boolean) =>
                                    `rounded-lg border px-2 py-2 text-[11px] font-medium transition-colors ${
                                      active
                                        ? "border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300 bg-sky-50/60 dark:bg-sky-950/30 hover:bg-sky-50 dark:hover:bg-sky-950/60"
                                        : "border-gray-200 dark:border-gray-700 text-gray-400 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed"
                                    }`;

                                  return (
                                    <div className="border-t border-dashed border-gray-200 dark:border-gray-700 pt-3 space-y-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] uppercase tracking-wide text-sky-600 dark:text-sky-400 font-semibold">
                                          Translated · {langLabel}
                                        </span>
                                        {!isReady && (
                                          <span className="text-[10px] text-gray-400 italic">
                                            translating…
                                          </span>
                                        )}
                                      </div>

                                      {/* Structured */}
                                      <div>
                                        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">
                                          Structured
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                          {(
                                            [
                                              "txt",
                                              "csv",
                                              "json",
                                              "notion",
                                            ] as const
                                          ).map((fmt) => (
                                            <button
                                              key={fmt}
                                              type="button"
                                              disabled={!canClick}
                                              onClick={makeStructuredHandler(
                                                fmt,
                                              )}
                                              className={btnCls(canClick)}
                                            >
                                              {fmt.toUpperCase()}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Documents */}
                                      <div>
                                        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-gray-500">
                                          Documents
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                          <button
                                            type="button"
                                            disabled={!canClick}
                                            onClick={() =>
                                              void handleExportPdfTranslated()
                                            }
                                            className={btnCls(canClick)}
                                          >
                                            PDF
                                          </button>
                                          <button
                                            type="button"
                                            disabled={!canClick}
                                            onClick={() =>
                                              void handleExportDocxTranslated()
                                            }
                                            className={btnCls(canClick)}
                                          >
                                            DOCX
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              {plainTranscriptForClientReady ? (
                                <MakeClientReadyTranscriptButton
                                  plainTranscript={
                                    plainTranscriptForClientReady
                                  }
                                  className="w-full"
                                />
                              ) : null}
                            </div>
                          )}
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              Full summary
                            </h3>
                            {result?.summary ? (
                              <span className="rounded-[3px] bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                AI-generated
                              </span>
                            ) : null}
                          </div>
                          {schema.summary ? (
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {schema.summary}
                            </p>
                          ) : isSummaryHydrating ? (
                            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                              <span className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                              Generating summary…
                            </div>
                          ) : isPaidPlan ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              No summary for this transcript yet.
                            </p>
                          ) : (
                            <div className="relative rounded-lg overflow-hidden">
                              {/* Blurred skeleton lines representing locked summary content */}
                              <div className="blur-sm select-none pointer-events-none space-y-2 py-1">
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-5/6" />
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-11/12" />
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5" />
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
                              </div>
                              {/* Overlay CTA */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/80 dark:bg-gray-900/80">
                                <Lock className="w-3.5 h-3.5 text-blue-600" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPaywallReason("AI_FEATURES");
                                    setShowPaywall(true);
                                  }}
                                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Unlock AI Summary →
                                </button>
                              </div>
                            </div>
                          )}
                          {previewBullets.length > 0 ? (
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                              <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">
                                Key bullets
                              </p>
                              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 list-disc pl-4">
                                {previewBullets.map((b, i) => (
                                  <li key={i}>{b}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                        <details className={detailCls}>
                          <summary className={summaryCls}>
                            <span>Chapters</span>
                            <ChevronRight
                              className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 shrink-0"
                              aria-hidden
                            />
                          </summary>
                          <ul className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1 max-h-48 overflow-y-auto">
                            {chapters.length === 0 ? (
                              <li className="text-xs text-gray-500">
                                No chapters available.
                              </li>
                            ) : (
                              chapters.map((c, i) => (
                                <li key={i}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      scrollToSegment(c.segmentIndex)
                                    }
                                    className="text-left text-xs text-blue-600 dark:text-blue-400 hover:underline w-full"
                                  >
                                    {c.label}
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        </details>
                        <details className={detailCls}>
                          <summary className={summaryCls}>
                            <span>Highlights</span>
                            <ChevronRight
                              className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 shrink-0"
                              aria-hidden
                            />
                          </summary>
                          <ul className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2 max-h-56 overflow-y-auto">
                            {highlights.length === 0 ? (
                              <li className="text-xs text-gray-500">
                                No highlights detected.
                              </li>
                            ) : (
                              highlights.slice(0, 12).map((h, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-gray-600 dark:text-gray-300"
                                >
                                  <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {h.type}:
                                  </span>{" "}
                                  {h.text}
                                </li>
                              ))
                            )}
                          </ul>
                        </details>
                        <details className={detailCls}>
                          <summary className={summaryCls}>
                            <span>Keywords</span>
                            <ChevronRight
                              className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 shrink-0"
                              aria-hidden
                            />
                          </summary>
                          <ul className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 pt-3 flex flex-wrap gap-2 list-none">
                            {keywords.length === 0 ? (
                              <li className="text-xs text-gray-500 w-full">
                                No recurring keywords found.
                              </li>
                            ) : (
                              keywords.slice(0, 18).map((k) => (
                                <li key={k.keyword}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      scrollToSegment(k.segmentIndex)
                                    }
                                    className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                  >
                                    {k.keyword} ({k.count})
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        </details>
                        {status === "completed" &&
                          result &&
                          (() => {
                            const jid =
                              currentJobId ||
                              getPersistedJobId(location.pathname);
                            const jtok = getPersistedJobToken(
                              location.pathname,
                            );
                            const orig = (
                              fullTranscript ||
                              transcriptPreview ||
                              ""
                            ).trim();
                            if (!jid || !jtok || !orig) return null;
                            return (
                              <div className="pt-1">
                                <TranscriptSharePanel
                                  jobId={jid}
                                  jobToken={jtok}
                                  sourceTool="video-to-transcript"
                                  title={
                                    selectedFile?.name ||
                                    result.fileName ||
                                    "Transcript"
                                  }
                                  originalFullText={
                                    fullTranscript || transcriptPreview || ""
                                  }
                                  translatedFullText={
                                    translationLanguage &&
                                    translatedCache[translationLanguage] != null
                                      ? translatedCache[translationLanguage]
                                      : null
                                  }
                                  translationLanguage={translationLanguage}
                                  segments={result.segments}
                                  translatedSegments={
                                    translatedSegments ?? undefined
                                  }
                                  summary={result.summary}
                                />
                              </div>
                            );
                          })()}
                      </>
                    );
                  })()}
                </aside>
              </div>

              {audioObjectUrl && (
                <PinnedAudioPlayerBar
                  audioSrc={audioObjectUrl}
                  audioRef={audioRef}
                  scrubberRef={scrubberRef}
                  timeDisplayRef={timeDisplayRef}
                  durationDisplayRef={durationDisplayRef}
                  volumeSliderRef={volumeSliderRef}
                  audioDuration={audioDuration}
                  setAudioDuration={setAudioDuration}
                  audioIsPlaying={audioIsPlaying}
                  setAudioIsPlaying={setAudioIsPlaying}
                  audioMuted={audioMuted}
                  setAudioMuted={setAudioMuted}
                  audioVolume={audioVolume}
                  setAudioVolume={setAudioVolume}
                  audioSpeed={audioSpeed}
                  setAudioSpeed={setAudioSpeed}
                  syncScrubberFill={syncScrubberFill}
                  syncVolumeFill={syncVolumeFill}
                  onPlaybackTime={handlePlaybackTime}
                  crossOrigin={
                    typeof window !== "undefined" &&
                    API_ORIGIN !== window.location.origin
                      ? "anonymous"
                      : undefined
                  }
                />
              )}

              {/* <CrossToolSuggestions
              workflowHint="Your last file is pre-filled on the next tool."
              suggestions={[
                { icon: Subtitles, title: 'Video → Subtitles', path: '/video-to-subtitles', description: 'Generate SRT/VTT', state: { useWorkflowVideo: true } },
                {
                  icon: Film,
                  title: 'Burn Subtitles',
                  path: '/burn-subtitles',
                  description: 'Burn captions (video + SRT pre-filled)',
                  state: { useWorkflowVideo: true, useWorkflowSrt: true },
                  onBeforeNavigate: () => {
                    // if (segmentsForExport?.length) workflow.setSrt(segmentsToSrt(segmentsForExport))
                    // if (selectedFile) workflow.setVideo(selectedFile)
                  },
                },
                { icon: Minimize2, title: 'Compress Video', path: '/compress-video', description: 'Reduce file size', state: { useWorkflowVideo: true } },
              ]}
            /> */}
            </div>
          </>
        )}

        {!isBatchMode && status === "failed" && (
          <FailedState
            onTryAgain={() => {
              setFailedMessage(undefined);
              handleProcessAnother();
            }}
            message={failedMessage}
          />
        )}
      </ToolLayout>

      {/* Sticky upload CTA for desktop when user scrolls past the form (CTR fix) */}
      {status === "idle" &&
        !selectedFile &&
        !uploadZoneVisible &&
        !isBatchMode &&
        inputMode === "file" && (
          <button
            onClick={() =>
              uploadZoneRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }
            className="hidden lg:fixed lg:bottom-6 lg:right-6 lg:flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-40"
            aria-label="Scroll back to upload form"
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium">Upload File</span>
          </button>
        )}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        reason={paywallReason}
        tool="video-to-transcript"
      />

      <JobAuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        jobDescription="Your transcript is ready!"
        onAuthSuccess={async () => {
          const jobId = currentJobId || getPersistedJobId(location.pathname);
          const jobToken = getPersistedJobToken(location.pathname);
          if (jobId && jobToken) {
            try { await claimGuestJob(jobId, jobToken); } catch { /* best-effort */ }
          }
          setShowAuthGate(false);
          setShowAuthModal(false);
          window.location.reload();
        }}
      />

      {location.pathname === "/video-to-transcript" && (
        <CoreToolSeoDepth path="/video-to-transcript" />
      )}

      {(hasDeepContent || faq.length > 0) && (
        <div className="mt-20 border-t border-gray-100 dark:border-gray-800/60" />
      )}

      {hasDeepContent && (
        <section
          className="py-16 px-4 sm:px-6 max-w-5xl mx-auto space-y-20"
          aria-label="Workflow proof and comparison"
        >
          {location.pathname === "/video-to-transcript" && (
            <div className="space-y-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Video to Transcript Online (Free &amp; Fast)
                </h2>
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  VideoText lets you convert video to transcript online in
                  minutes with one upload and one clean output package.
                </p>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Transcribe Video to Text in Minutes
                </h2>
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  Upload a file or paste a URL, then download transcript text,
                  SRT/VTT subtitles, summary, and chapters without manual
                  cleanup.
                </p>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Convert Video to Transcript Without Editing
                </h2>
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  No timeline editing, no manual cleanup, and no extra steps.
                  VideoText is built for one-click output so you can publish
                  faster.
                </p>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  The Fastest Video to Transcript Tool
                </h2>
                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  Most tools process in longer, multi-step workflows. VideoText
                  focuses on fast parallel processing for long videos, so you
                  get structured outputs in minutes.
                </p>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Related transcription tools
                </h2>
                <ul className="mt-4 space-y-2 text-blue-700 dark:text-blue-300 font-medium">
                  <li>
                    <Link
                      to="/youtube-transcript-generator"
                      className="hover:underline"
                    >
                      Transcribe YouTube videos
                    </Link>
                  </li>
                  <li>
                    <Link to="/subtitle-generator" className="hover:underline">
                      Generate subtitles automatically
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/transcribe-long-videos"
                      className="hover:underline"
                    >
                      Transcribe long videos
                    </Link>
                  </li>
                </ul>
                <p className="mt-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  More workflow tools
                </p>
                <ul className="mt-2 space-y-2 text-blue-700 dark:text-blue-300 font-medium">
                  <li>
                    <Link to="/translate-subtitles" className="hover:underline">
                      Translate your transcripts
                    </Link>
                  </li>
                  <li>
                    <Link to="/burn-subtitles" className="hover:underline">
                      Burn subtitles
                    </Link>
                  </li>
                  <li>
                    <Link to="/compress-video" className="hover:underline">
                      Compress your video
                    </Link>
                  </li>
                  <li>
                    <Link to="/voice-recorder" className="hover:underline">
                      Need notes/transcripts from your voice
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Proof points ── */}
          {seoDeepContent?.proofPoints?.length ? (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                  By the numbers
                </p>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Proof, not promises
                </h2>
              </div>
              <ul className="grid sm:grid-cols-2 gap-3" role="list">
                {seoDeepContent.proofPoints.map((point, idx) => (
                  <li
                    key={`proof-${idx}`}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-5 py-4 shadow-sm"
                  >
                    <span
                      className="mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50"
                      aria-hidden
                    >
                      <svg
                        className="w-3 h-3 text-blue-600 dark:text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {point}
                    </p>
                  </li>
                ))}
              </ul>
              {seoDeepContent.ctaText && seoDeepContent.ctaPath && (
                <div className="mt-8">
                  <Link
                    to={seoDeepContent.ctaPath}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {seoDeepContent.ctaText}
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {/* ── Visual proof ── */}
          {seoDeepContent?.visualProof?.length ? (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                  See the actual output
                </p>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  This is generated automatically in minutes
                </h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {seoDeepContent.visualProof.map((proof, idx) => (
                  <article
                    key={`proof-${idx}`}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {proof.image && (
                      <div className="relative bg-gray-100 dark:bg-gray-800 aspect-square overflow-hidden">
                        <img
                          src={proof.image}
                          alt={proof.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="mb-2 font-medium text-sm text-gray-900 dark:text-gray-100 leading-snug">
                        {proof.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {proof.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-6 text-sm text-center text-gray-600 dark:text-gray-400">
                No manual cleanup. No editing. Ready to use directly in your
                workflow.
              </p>
            </div>
          ) : null}
          {seoDeepContent?.workflowSteps?.length ? (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                  How it works
                </p>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Three steps, no setup
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {seoDeepContent.workflowSteps.map((step, idx) => (
                  <article
                    key={`step-${idx}`}
                    className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-6 shadow-sm"
                  >
                    <span
                      className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold"
                      aria-hidden
                    >
                      {idx + 1}
                    </span>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {step.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Output examples ── */}
          {seoDeepContent?.outputExamples?.length ? (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                  What you get
                </p>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Not raw text — ready-to-use content
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Transcript, summary, chapters, and subtitles. All from one
                  upload.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {seoDeepContent.outputExamples.map((example, idx) => {
                  const accentBorder = [
                    "border-t-blue-500",
                    "border-t-blue-500",
                    "border-t-emerald-500",
                  ][idx % 3];
                  return (
                    <article
                      key={`example-${idx}`}
                      className={`rounded-xl border border-gray-200 dark:border-gray-700 border-t-2 ${accentBorder} bg-white dark:bg-gray-900/70 p-6 shadow-sm`}
                    >
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        {example.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {example.body}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── Comparison table ── */}
          {seoDeepContent?.comparisonRows?.length ? (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                  Compare
                </p>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  VideoText vs alternatives
                </h2>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80">
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-1/3">
                        Feature
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 w-1/3">
                        VideoText
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 w-1/3">
                        Typical alternatives
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-950/20">
                    {seoDeepContent.comparisonRows.map((row, idx) => (
                      <tr
                        key={`cmp-${idx}`}
                        className={
                          idx % 2 === 1
                            ? "bg-gray-50/60 dark:bg-gray-900/20"
                            : ""
                        }
                      >
                        <td className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {row.feature}
                        </td>
                        <td className="px-5 py-4 font-medium text-gray-900 dark:text-gray-100">
                          {row.videotext}
                        </td>
                        <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                          {row.alternatives}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* ── Technical explanation ── */}
          {seoDeepContent?.technicalExplanation?.length ? (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                  How it works
                </p>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Why VideoText is faster than everyone else
                </h2>
              </div>
              <div className="space-y-4">
                {seoDeepContent.technicalExplanation.map((tech, idx) => (
                  <article
                    key={`tech-${idx}`}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-6 shadow-sm"
                  >
                    <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
                      {tech.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {tech.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Use cases ── */}
          {seoDeepContent?.useCases?.length ? (
            <div>
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                  Who it's for
                </p>
                <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
                  Built for people who need it done fast
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {seoDeepContent.useCases.map((useCase, idx) => (
                  <article
                    key={`usecase-${idx}`}
                    className="flex items-start gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/70 p-5 shadow-sm"
                  >
                    <span
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold"
                      aria-hidden
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                        {useCase.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {useCase.body}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
              {seoDeepContent.ctaText && seoDeepContent.ctaPath && (
                <div className="mt-8">
                  <Link
                    to={seoDeepContent.ctaPath}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    {seoDeepContent.ctaText}
                    <ChevronRight className="w-4 h-4" aria-hidden />
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      {faq.length > 0 && (
        <section
          className="py-16 px-4 sm:px-6 max-w-5xl mx-auto"
          aria-label="Frequently asked questions"
        >
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
              Got questions?
            </p>
            <h2 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-gray-100">
              Frequently asked questions
            </h2>
          </div>
          <dl className="space-y-2">
            {faq.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 overflow-hidden shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                  <dt className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {item.q}
                  </dt>
                  <ChevronRight
                    className="w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 group-open:rotate-90"
                    aria-hidden
                  />
                </summary>
                <dd className="px-6 pb-5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-4">
                  {item.a}
                </dd>
              </details>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}
