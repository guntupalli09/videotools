import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileText, Users, ListOrdered, BookOpen, Sparkles, Hash, FileCode, Download, Eraser, FileDown, Subtitles, Film, Minimize2 } from 'lucide-react'
import FailedState from '../components/FailedState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import WorkflowChainSuggestion from '../components/WorkflowChainSuggestion'
import PaywallModal from '../components/PaywallModal'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { ResultSkeleton } from '../components/figma/ResultSkeleton'
import { TranscriptResult } from '../components/figma/TranscriptResult'
import { ToolSidebar } from '../components/figma/ToolSidebar'
import { Checkbox, ExportFormat, Input } from '../components/figma/FormControls'
import { incrementUsage } from '../lib/usage'
import { uploadFileWithProgress, getJobStatus, subscribeJobStatus, getCurrentUsage, invalidateUsageCache, getConnectionProbeIfNeeded, BACKEND_TOOL_TYPES, SessionExpiredError, getUserFacingMessage, isNetworkError, POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS } from '../lib/api'
import { getFailureMessage } from '../lib/failureMessage'
import { checkVideoPreflight } from '../lib/uploadPreflight'
import { getFilePreview, formatDuration, type FilePreviewData } from '../lib/filePreview'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, getPersistedJobId, getPersistedJobToken, clearPersistedJobId } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import { segmentsToSrt, segmentsToVtt, type Segment } from '../lib/srtExport'
import toast from 'react-hot-toast'
import { useWorkflow } from '../contexts/WorkflowContext'
import { emitToolCompleted } from '../workflow/workflowStore'

// ─── Phase 1 – Derived Transcript Utilities (client-side only) ─────────────────
const BRANCH_IDS = ['transcript', 'speakers', 'summary', 'chapters', 'highlights', 'keywords', 'clean', 'exports'] as const
type BranchId = (typeof BRANCH_IDS)[number]
const BRANCH_LABELS: Record<BranchId, string> = {
  transcript: 'Transcript',
  speakers: 'Speakers',
  summary: 'Summary',
  chapters: 'Chapters',
  highlights: 'Highlights',
  keywords: 'Keywords',
  clean: 'Clean',
  exports: 'Exports',
}
const BRANCH_ICONS: Record<BranchId, typeof FileText> = {
  transcript: FileText,
  speakers: Users,
  summary: ListOrdered,
  chapters: BookOpen,
  highlights: Sparkles,
  keywords: Hash,
  clean: Eraser,
  exports: FileCode,
}
const FILLER_WORDS = new Set(['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well', 'just', 'really', 'right', 'i mean', 'kind of', 'sort of'])
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how'])

/** Optional SEO overrides for alternate entry points (e.g. /video-to-text, /mp4-to-text). Do NOT duplicate logic here. */
export type VideoToTranscriptSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function VideoToTranscript(props: VideoToTranscriptSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('uploading')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<{
    downloadUrl: string
    fileName?: string
    segments?: { start: number; end: number; text: string; speaker?: string }[]
    summary?: { summary: string; bullets: string[]; actionItems?: string[] }
    chapters?: { title: string; startTime: number; endTime?: number }[]
  } | null>(null)
  const [transcriptPreview, setTranscriptPreview] = useState('')
  const [fullTranscript, setFullTranscript] = useState('')
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeChapters, setIncludeChapters] = useState(true)
  const [exportFormats, setExportFormats] = useState<('txt' | 'json' | 'docx' | 'pdf')[]>(['txt'])
  const [speakerDiarization, setSpeakerDiarization] = useState(false)
  const [glossary, setGlossary] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [transcriptEditMode, setTranscriptEditMode] = useState(false)
  const [editableSegments, setEditableSegments] = useState<Segment[] | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [usedMinutes, setUsedMinutes] = useState<number | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [isRehydrating, setIsRehydrating] = useState(false)
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null)
  const [, setElapsedMs] = useState(0)
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null)
  const [, setConnectionSpeed] = useState<'fast' | 'medium' | 'slow' | undefined>(undefined)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [fileFromWorkflow, setFileFromWorkflow] = useState(false)
  const uploadAbortRef = useRef<AbortController | null>(null)
  // Phase 1 – Derived Transcript Utilities: branch tab (no remount/refetch)
  const [activeBranch, setActiveBranch] = useState<BranchId>('transcript')
  const [cleanTranscriptEnabled, setCleanTranscriptEnabled] = useState(false)
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null)
  const [translatedCache, setTranslatedCache] = useState<Record<string, string>>({})
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const segmentRefsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const rehydratePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeUploadPollRef = useRef<(() => void) | null>(null)
  const pollConsecutiveNetworkErrorsRef = useRef(0)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const jobStartedTrackedRef = useRef<string | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)
  const terminalRef = useRef(false)
  const lastPartialVersionRef = useRef(0)
  const partialScrollRef = useRef<HTMLDivElement>(null)
  const savedScrollTopRef = useRef(0)
  const scrollRestoreRafRef = useRef<{ first: number; second: number }>({ first: 0, second: 0 })
  /** Phase 6: when we first show partial transcript (for min stream visibility delay). */
  const partialFirstSeenAtRef = useRef<number | null>(null)
  const minStreamDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const uploadTimelineFirstRenderLoggedRef = useRef(false)
  const [partialSegments, setPartialSegments] = useState<{ start: number; end: number; text: string; speaker?: string }[]>([])
  /** Free plan: number of export downloads used for this transcript (max 2, with watermark). */
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  /** Set on job_completed for "Processed in XX.Xs" badge (UI only). */
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  /** Set on job_completed for workflow chain suggestion (UI only). */
  const [lastJobCompletedToolId, setLastJobCompletedToolId] = useState<string | null>(null)
  /** Contextual failure message (from getFailureMessage); shown in FailedState and Tex. */
  const [failedMessage, setFailedMessage] = useState<string | undefined>(undefined)

  // Reset free export count when user gets a new result (e.g. process another file)
  useEffect(() => {
    setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  // Upload-to-first-word timeline: log firstRender when partialSegments first paints
  useEffect(() => {
    if (partialSegments.length === 0 || uploadTimelineFirstRenderLoggedRef.current) return
    uploadTimelineFirstRenderLoggedRef.current = true
    requestAnimationFrame(() => {
      const t = typeof window !== 'undefined' ? (window as any).__uploadTimeline : undefined
      if (t) t.firstRender = Date.now()
      if (t) {
        console.log('[UPLOAD_TIMELINE]', {
          uploadStart: t.uploadStart,
          upload100: t.upload100,
          uploadCompleteResponse: t.uploadCompleteResponse,
          sseStart: t.sseStart,
          firstSseMessage: t.firstSseMessage,
          firstPartialReceived: t.firstPartialReceived,
          firstRender: t.firstRender,
        })
      }
    })
  }, [partialSegments.length])

  // Instant file preview (browser only); persists through upload + processing
  useEffect(() => {
    if (!selectedFile) {
      setFilePreview(null)
      return
    }
    let cancelled = false
    getFilePreview(selectedFile).then((p) => {
      if (!cancelled) setFilePreview(p)
    })
    return () => {
      cancelled = true
    }
  }, [selectedFile])

  // Object URL for trim preview in Figma ProcessingInterface (revoke on cleanup after clearing so no ERR_FILE_NOT_FOUND)
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(selectedFile)
      setVideoPreviewUrl(url)
      return () => {
        setVideoPreviewUrl(null)
        const u = url
        setTimeout(() => URL.revokeObjectURL(u), 0)
      }
    }
    setVideoPreviewUrl(null)
  }, [selectedFile])

  // Sync editable segments from result (so inline edits are preserved until result changes)
  useEffect(() => {
    if (result?.segments?.length) {
      setEditableSegments(result.segments.map((s) => ({ start: s.start, end: s.end, text: s.text })))
    } else {
      setEditableSegments(null)
    }
    setTranscriptEditMode(false)
  }, [result?.segments])

  // Elapsed time ticker when processing (cleanup on unmount/complete/fail)
  useEffect(() => {
    if (status !== 'processing' || !processingStartedAt) {
      setElapsedMs(0)
      return
    }
    const tick = () => setElapsedMs(Date.now() - processingStartedAt)
    tick()
    const id = setInterval(tick, 500)
    return () => clearInterval(id)
  }, [status, processingStartedAt])

  // Reset translation when transcript result changes
  useEffect(() => {
    setTranslationLanguage(null)
    setTranslatedCache({})
  }, [result])

  // Restore scroll position when transitioning from partial to completed transcript.
  // Double rAF so we run after DOM/layout has stabilized (avoids jump when height changes).
  useEffect(() => {
    if (status !== 'completed' || !result) return
    const saved = savedScrollTopRef.current
    if (saved <= 0) return
    scrollRestoreRafRef.current.first = requestAnimationFrame(() => {
      scrollRestoreRafRef.current.second = requestAnimationFrame(() => {
        if (transcriptScrollRef.current) {
          transcriptScrollRef.current.scrollTop = saved
        }
      })
    })
    return () => {
      cancelAnimationFrame(scrollRestoreRafRef.current.first)
      cancelAnimationFrame(scrollRestoreRafRef.current.second)
    }
  }, [status, result])

  // Rehydrate from URL/sessionStorage after idle or reload (e.g. mobile Safari)
  useEffect(() => {
    const pathname = location.pathname
    const jobId = getPersistedJobId(pathname)
    if (!jobId) return

    terminalRef.current = false
    lastPartialVersionRef.current = 0
    setStatus('processing')
    setUploadPhase('processing')
    setUploadProgress(100)
    setCurrentJobId(jobId)
    setIsRehydrating(true)
    setProcessingStartedAt(Date.now())
    setPartialSegments([])

    const jobToken = getPersistedJobToken(pathname)
    let cancelled = false
    const run = async () => {
      try {
        const jobStatus = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
        if (cancelled) return
        pollConsecutiveNetworkErrorsRef.current = 0
        setIsRehydrating(false)
        setProgress(jobStatus.progress ?? 0)
        if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

        const transition = getJobLifecycleTransition(jobStatus)
        if (transition === 'completed') {
          terminalRef.current = true
          setPartialSegments([])
          setStatus('completed')
          setResult(jobStatus.result ?? null)
          emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript' })
          setUploadPhase('processing')
          setUploadProgress(100)
          const res = jobStatus.result
          if (res?.segments?.length) {
            const textFromSegments = res.segments.map((s: { text: string }) => s.text).join('\n\n')
            setFullTranscript(textFromSegments)
            setTranscriptPreview(textFromSegments.substring(0, 500))
          } else if (res?.downloadUrl) {
            try {
              const transcriptResponse = await fetch(getAbsoluteDownloadUrl(res.downloadUrl))
              const transcriptText = await transcriptResponse.text()
              setTranscriptPreview(transcriptText.substring(0, 500))
              setFullTranscript(transcriptText)
            } catch {
              // ignore (e.g. ZIP file)
            }
          }
          invalidateUsageCache()
          getCurrentUsage({ skipCache: true })
            .then((data) => {
              const total = data.limits.minutesPerMonth + data.overages.minutes
              setAvailableMinutes(total)
              setUsedMinutes(data.usage.totalMinutes)
            })
            .catch(() => {})
          return
        }
        if (transition === 'failed') {
          terminalRef.current = true
          setPartialSegments([])
          setIsRehydrating(false)
          setStatus('failed')
          toast.error('Processing failed. Please try again.')
          clearPersistedJobId(pathname, navigate)
          return
        }
        if (jobStatus.status === 'processing' && jobStatus.partialSegments?.length) {
          const version = jobStatus.partialVersion ?? 0
          if (version > lastPartialVersionRef.current || lastPartialVersionRef.current === 0) {
            lastPartialVersionRef.current = Math.max(version, lastPartialVersionRef.current)
            setPartialSegments(jobStatus.partialSegments)
          }
        }
        // Resume polling for queued/processing
        setStatus('processing')
        setUploadPhase('processing')
        setUploadProgress(100)
        const doPoll = async () => {
          if (cancelled) return
          try {
            if (terminalRef.current) return
            const s = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
            if (cancelled) return
            if (terminalRef.current) return
            setProgress(s.progress ?? 0)
            if (s.queuePosition !== undefined) setQueuePosition(s.queuePosition)
            const t = getJobLifecycleTransition(s)
            if (t === 'completed') {
              terminalRef.current = true
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              setPartialSegments([])
              setStatus('completed')
              setResult(s.result ?? null)
              emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript' })
              if (s.result?.segments?.length) {
                const textFromSegments = s.result.segments.map((seg: { text: string }) => seg.text).join('\n\n')
                setFullTranscript(textFromSegments)
                setTranscriptPreview(textFromSegments.substring(0, 500))
              } else if (s.result?.downloadUrl) {
                try {
                  const res = await fetch(getAbsoluteDownloadUrl(s.result.downloadUrl))
                  const text = await res.text()
                  setTranscriptPreview(text.substring(0, 500))
                  setFullTranscript(text)
                } catch {
                  // ignore
                }
              }
              invalidateUsageCache()
              getCurrentUsage({ skipCache: true })
                .then((data) => {
                  const total = data.limits.minutesPerMonth + data.overages.minutes
                  setAvailableMinutes(total)
                  setUsedMinutes(data.usage.totalMinutes)
                })
                .catch(() => {})
            } else if (t === 'failed') {
              terminalRef.current = true
              setPartialSegments([])
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              setIsRehydrating(false)
              setStatus('failed')
              toast.error('Processing failed. Please try again.')
              clearPersistedJobId(pathname, navigate)
            } else if (s.status === 'processing' && s.partialSegments?.length) {
              const version = s.partialVersion ?? 0
              if (version > lastPartialVersionRef.current || lastPartialVersionRef.current === 0) {
                lastPartialVersionRef.current = Math.max(version, lastPartialVersionRef.current)
                setPartialSegments(s.partialSegments)
              }
            }
          } catch (err) {
            if (err instanceof SessionExpiredError) {
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              clearPersistedJobId(pathname, navigate)
              toast.error(err.message)
            } else if (isNetworkError(err)) {
              pollConsecutiveNetworkErrorsRef.current += 1
              if (pollConsecutiveNetworkErrorsRef.current >= POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS) {
                if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
                rehydratePollRef.current = null
                setIsRehydrating(false)
                toast.error('Server unreachable. Start the backend and refresh the page.')
              }
            }
          }
        }
        pollConsecutiveNetworkErrorsRef.current = 0
        rehydratePollRef.current = setInterval(doPoll, JOB_POLL_INTERVAL_MS)
        doPoll()
      } catch (err) {
        if (cancelled) return
        setIsRehydrating(false)
        if (err instanceof SessionExpiredError) {
          clearPersistedJobId(pathname, navigate)
          toast.error(err.message)
        }
      }
    }
    run()
    return () => {
      cancelled = true
      if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
      rehydratePollRef.current = null
    }
  }, [location.pathname, navigate])

  // Remind user to keep tab open when they switch away during upload (helps mobile)
  useEffect(() => {
    if (uploadPhase !== 'uploading') return
    const onVisibility = () => {
      if (document.hidden) toast('Keep this tab open until the upload finishes.', { icon: '📤', duration: 4000 })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [uploadPhase])

  const workflow = useWorkflow()

  useEffect(() => {
    const state = location.state as { useWorkflowVideo?: boolean } | undefined
    if (state?.useWorkflowVideo && workflow.videoFile) {
      setSelectedFile(workflow.videoFile)
      setFileFromWorkflow(true)
    }
  }, [location.state, workflow.videoFile])

  // Keep workflow in sync when result is shown so "Next step" links pre-fill the file on the next tool
  useEffect(() => {
    if (status === 'completed' && selectedFile) workflow.setVideo(selectedFile)
  }, [status, selectedFile])

  const handleFileSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
        file_size_bytes: file.size,
      })
    } catch {
      // non-blocking
    }
    workflow.setVideo(file)
    setSelectedFile(file)
    setFileFromWorkflow(false)
    setTrimStart(null)
    setTrimEnd(null)
  }

  const handleCancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort()
      uploadAbortRef.current = null
    }
    if (activeUploadPollRef.current) {
      activeUploadPollRef.current()
      activeUploadPollRef.current = null
    }
    if (currentJobId) {
      clearPersistedJobId(location.pathname, navigate)
      setCurrentJobId(null)
      setStatus('idle')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      toast('Cancelled. You can upload a new file; the previous job may still complete in the background.', { icon: 'ℹ️', duration: 5000 })
    } else if (status === 'processing' && uploadPhase === 'uploading') {
      setStatus('idle')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      toast('Cancelled. You can try again or upload a different file.')
    }
  }

  const handleProcess = async (trimStartPercent?: number, trimEndPercent?: number) => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    const durationSeconds = filePreview?.durationSeconds ?? 0
    const trimStartSec = trimStartPercent != null ? (durationSeconds * trimStartPercent) / 100 : trimStart
    const trimEndSec = trimEndPercent != null ? (durationSeconds * trimEndPercent) / 100 : trimEnd

    // Minute-based limit check
    let usageData: Awaited<ReturnType<typeof getCurrentUsage>> | null = null
    try {
      usageData = await getCurrentUsage()
      const totalAvailable = usageData.limits.minutesPerMonth + usageData.overages.minutes
      const used = usageData.usage.totalMinutes
      setAvailableMinutes(totalAvailable)
      setUsedMinutes(used)
      const atOrOverLimit = totalAvailable > 0 && used >= totalAvailable
      if (atOrOverLimit) {
        setShowPaywall(true)
        trackEvent('paywall_shown', { tool: 'video-to-transcript' })
        return
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    let connectionSpeedResult: 'fast' | 'medium' | 'slow' | undefined
    try {
      setStatus('processing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      uploadAbortRef.current = new AbortController()
      setCurrentJobId(null)

      const limits = usageData?.limits
        ? { maxFileSize: usageData.limits.maxFileSize, maxVideoDuration: usageData.limits.maxVideoDuration }
        : {}
      const probePromise = getConnectionProbeIfNeeded(selectedFile)
      const [preflight, probeResult] = await Promise.all([
        checkVideoPreflight(selectedFile, limits),
        probePromise ?? Promise.resolve(null),
      ])
      connectionSpeedResult = probeResult ?? undefined
      setConnectionSpeed(connectionSpeedResult)
      if (!preflight.allowed) {
        uploadAbortRef.current = null
        setStatus('idle')
        toast.error(preflight.reason ?? 'Video exceeds plan limits.')
        trackEvent('paywall_shown', { tool: 'video-to-transcript', reason: 'preflight' })
        return
      }
    } catch (e) {
      uploadAbortRef.current = null
      setStatus('idle')
      toast.error('Could not validate video. Try again.')
      return
    }

    try {
      const baseOptions: Parameters<typeof uploadFileWithProgress>[1] = {
        toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
        trimmedStart: (trimStartSec ?? trimStart) ?? undefined,
        trimmedEnd: (trimEndSec ?? trimEnd) ?? undefined,
        includeSummary,
        includeChapters,
        exportFormats: exportFormats.length > 0 ? exportFormats : (['txt'] as const),
        speakerDiarization,
        glossary: glossary.trim() || undefined,
      }
      setUploadPhase('uploading')
      trackEvent('processing_started', { tool: 'video-to-transcript' })

      if (typeof window !== 'undefined') (window as any).__uploadTimeline = {}
      if (typeof window !== 'undefined') (window as any).__uploadTimeline.uploadStart = Date.now()
      uploadTimelineFirstRenderLoggedRef.current = false
      const response = await uploadFileWithProgress(
        selectedFile,
        baseOptions,
        {
          onProgress: (p) => setUploadProgress(p),
          connectionSpeed: connectionSpeedResult,
          signal: uploadAbortRef.current?.signal,
        }
      )

      const tl = typeof window !== 'undefined' ? (window as any).__uploadTimeline : undefined
      uploadAbortRef.current = null
      setCurrentJobId(response.jobId)
      persistJobId(location.pathname, response.jobId, response.jobToken)
      setUploadPhase('processing')
      setUploadProgress(100)
      terminalRef.current = false
      lastPartialVersionRef.current = 0
      partialFirstSeenAtRef.current = null
      if (minStreamDelayTimeoutRef.current) {
        clearTimeout(minStreamDelayTimeoutRef.current)
        minStreamDelayTimeoutRef.current = null
      }
      setPartialSegments([])
      const startedAt = Date.now()
      setProcessingStartedAt(startedAt)
      processingStartedAtRef.current = startedAt
      texJobStarted()

      // Status updates: first poll immediately, then SSE (with polling fallback) for lower latency.
      const jobToken = response.jobToken
      const handleJobStatus = (jobStatus: import('../lib/api').JobStatus) => {
        if (terminalRef.current) return
        setProgress(jobStatus.progress ?? 0)
        if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)
        if (jobStatus.status === 'processing' && jobStartedTrackedRef.current !== response.jobId) {
          jobStartedTrackedRef.current = response.jobId
          try {
            trackEvent('job_started', { job_id: response.jobId, tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT })
          } catch {
            // non-blocking
          }
        }
        const transition = getJobLifecycleTransition(jobStatus)
        if (transition === 'completed') {
          terminalRef.current = true
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current()
            activeUploadPollRef.current = null
          }
          jobStartedTrackedRef.current = null
          savedScrollTopRef.current = partialScrollRef.current?.scrollTop ?? 0
          const MIN_STREAM_VISIBILITY_MS = 8000
          const res = jobStatus.result
          const streamProgress = res && typeof (res as { streamProgress?: boolean }).streamProgress === 'boolean' && (res as { streamProgress?: boolean }).streamProgress
          const firstSeenAt = partialFirstSeenAtRef.current
          const remainingMs = streamProgress && firstSeenAt != null ? MIN_STREAM_VISIBILITY_MS - (Date.now() - firstSeenAt) : 0
          const applyCompletedTransition = () => {
            minStreamDelayTimeoutRef.current = null
            setPartialSegments([])
            setStatus('completed')
            setResult(jobStatus.result ?? null)
            const started = processingStartedAtRef.current ?? Date.now()
            const processingMs = Date.now() - started
            emitToolCompleted({ toolId: 'video-to-transcript', pathname: '/video-to-transcript', processingMs })
            if (res?.segments?.length) {
              const textFromSegments = res.segments.map((s: { text: string }) => s.text).join('\n\n')
              setFullTranscript(textFromSegments)
              setTranscriptPreview(textFromSegments.substring(0, 500))
            } else if (res?.downloadUrl) {
              try {
                fetch(getAbsoluteDownloadUrl(res.downloadUrl))
                  .then((transcriptResponse) => transcriptResponse.text())
                  .then((transcriptText) => {
                    setTranscriptPreview(transcriptText.substring(0, 500))
                    setFullTranscript(transcriptText)
                  })
                  .catch(() => {})
              } catch {
                // Ignore
              }
            }
            incrementUsage('video-to-transcript')
            invalidateUsageCache()
            const refreshUsage = () => {
              getCurrentUsage({ skipCache: true })
                .then((data) => {
                  const total = data.limits.minutesPerMonth + data.overages.minutes
                  setAvailableMinutes(total)
                  setUsedMinutes(data.usage.totalMinutes)
                })
                .catch(() => {})
            }
            refreshUsage()
            setTimeout(refreshUsage, 800)
            try {
              trackEvent('job_completed', {
                job_id: response.jobId,
                tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
                processing_time_ms: processingMs,
              })
              trackEvent('processing_completed', { tool: 'video-to-transcript' })
              texJobCompleted(processingMs, 'video-to-transcript')
              setLastProcessingMs(processingMs)
              setLastJobCompletedToolId('video-to-transcript')
            } catch {
              // non-blocking
            }
          }
          if (remainingMs > 0) {
            minStreamDelayTimeoutRef.current = setTimeout(() => { void applyCompletedTransition() }, remainingMs)
          } else {
            void applyCompletedTransition()
          }
        } else if (transition === 'failed') {
          terminalRef.current = true
          setPartialSegments([])
          if (activeUploadPollRef.current) {
            activeUploadPollRef.current()
            activeUploadPollRef.current = null
          }
          const msg = getFailureMessage({
            fileSizeBytes: selectedFile?.size,
            mimeType: selectedFile?.type,
            remainingMinutes: availableMinutes ?? undefined,
            planQuotaMinutes: 60,
            durationMinutes: filePreview?.durationSeconds != null ? filePreview.durationSeconds / 60 : undefined,
          })
          setFailedMessage(msg)
          setStatus('failed')
          texJobFailed(msg)
          toast.error('Processing failed. Please try again.')
        } else if (jobStatus.status === 'processing' && jobStatus.partialVersion != null && jobStatus.partialVersion > lastPartialVersionRef.current) {
          lastPartialVersionRef.current = jobStatus.partialVersion
          if (jobStatus.partialSegments?.length) {
            const t = typeof window !== 'undefined' ? (window as any).__uploadTimeline : undefined
            if (t && t.firstPartialReceived == null) t.firstPartialReceived = Date.now()
            if (partialFirstSeenAtRef.current === null) partialFirstSeenAtRef.current = Date.now()
            setPartialSegments(jobStatus.partialSegments)
          }
        }
      }
      const doPoll = async () => {
        try {
          if (terminalRef.current) return
          const jobStatus = await getJobStatus(response.jobId, jobToken ? { jobToken } : undefined)
          if (terminalRef.current) return
          pollConsecutiveNetworkErrorsRef.current = 0
          handleJobStatus(jobStatus)
        } catch (error: any) {
          if (isNetworkError(error)) {
            pollConsecutiveNetworkErrorsRef.current += 1
            if (pollConsecutiveNetworkErrorsRef.current >= POLL_STOP_AFTER_CONSECUTIVE_NETWORK_ERRORS) {
              if (activeUploadPollRef.current) {
                activeUploadPollRef.current()
                activeUploadPollRef.current = null
              }
              toast.error('Server unreachable. Start the backend and refresh the page.')
            }
          }
        }
      }
      pollConsecutiveNetworkErrorsRef.current = 0
      if (tl) tl.sseStart = Date.now()
      doPoll().then(() => {
        if (terminalRef.current) return
        activeUploadPollRef.current = subscribeJobStatus(response.jobId, jobToken ? { jobToken } : undefined, handleJobStatus)
      })
    } catch (error: any) {
      uploadAbortRef.current = null
      if (error instanceof Error && error.message === 'Upload cancelled') {
        setStatus('idle')
        setUploadPhase('uploading')
        setUploadProgress(0)
        setCurrentJobId(null)
        return
      }
      if (error instanceof SessionExpiredError) {
        clearPersistedJobId(location.pathname, navigate)
        setStatus('idle')
      } else {
        const msg = getFailureMessage({
          fileSizeBytes: selectedFile?.size,
          mimeType: selectedFile?.type,
          isNetworkError: isNetworkError(error),
        })
        setFailedMessage(msg)
        setStatus('failed')
        texJobFailed(msg)
      }
      toast.error(getUserFacingMessage(error))
    }
  }

  const handleCopyToClipboard = async () => {
    const textToCopy =
      translationLanguage && translatedCache[translationLanguage] != null
        ? translatedCache[translationLanguage]
        : (displayTranscript || fullTranscript || '').trim()
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      toast.success('Copied to clipboard!')
    } catch {
      // Fallback for environments where clipboard API is restricted
      try {
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        toast.success('Copied to clipboard!')
      } catch {
        toast.error('Failed to copy to clipboard')
      }
    }
  }

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setFilePreview(null)
    setCurrentJobId(null)
    uploadAbortRef.current = null
    terminalRef.current = false
    lastPartialVersionRef.current = 0
    partialFirstSeenAtRef.current = null
    if (minStreamDelayTimeoutRef.current) {
      clearTimeout(minStreamDelayTimeoutRef.current)
      minStreamDelayTimeoutRef.current = null
    }
    setStatus('idle')
    setProgress(0)
    setUploadPhase('uploading')
    setUploadProgress(0)
    setResult(null)
    setTranscriptPreview('')
    setFullTranscript('')
    setPartialSegments([])
    setActiveBranch('transcript')
    setCleanTranscriptEnabled(false)
    setIncludeSummary(true)
    setIncludeChapters(true)
    setExportFormats(['txt'])
    setSpeakerDiarization(false)
    setGlossary('')
    setSearchQuery('')
    setTranscriptEditMode(false)
    setEditableSegments(null)
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  // Phase 1 – scroll transcript to segment index; switch to Transcript branch first so segment is mounted
  const scrollToSegment = useCallback((index: number) => {
    setActiveBranch('transcript')
    setTimeout(() => {
      const el = segmentRefsRef.current.get(index)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  // Phase 1 – Derived Transcript Utilities (client-side; failures must not affect transcript)
  const getParagraphs = useCallback((text: string): string[] => {
    if (!text.trim()) return []
    return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  }, [])

  const getSpeakersData = useCallback((): { speaker: string; text: string; isDiarized: boolean }[] => {
    if (result?.segments?.length) {
      const rawLabels = result.segments.map((s) => s.speaker?.trim() || 'Speaker')
      const unique = [...new Set(rawLabels)]
      // Only treat as diarized when we have at least 2 distinct speaker labels from the backend
      const isDiarized = unique.length >= 2
      const labelToFriendly: Record<string, string> = {}
      unique.forEach((label, idx) => {
        labelToFriendly[label] = `Speaker ${idx + 1}`
      })
      return result.segments.map((s) => ({
        speaker: labelToFriendly[s.speaker?.trim() || 'Speaker'] || 'Speaker',
        text: s.text,
        isDiarized,
      }))
    }
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return []
      const paras = getParagraphs(raw)
      return paras.map((p, i) => ({
        speaker: `Speaker ${(i % 3) + 1}`,
        text: p,
        isDiarized: false,
      }))
    } catch {
      return []
    }
  }, [result?.segments, fullTranscript, getParagraphs])

  const getSummarySchema = useCallback((): { summary?: string; bullets: string[]; decisions: string[]; action_items: string[]; key_points: string[] } => {
    if (result?.summary) {
      return {
        summary: result.summary.summary,
        bullets: result.summary.bullets || [],
        decisions: [],
        action_items: result.summary.actionItems || [],
        key_points: result.summary.bullets || [],
      }
    }
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return { bullets: [], decisions: [], action_items: [], key_points: [] }
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean)
      const decisions: string[] = []
      const action_items: string[] = []
      const key_points: string[] = []
      const decRe = /\b(decided|decision|agree|agreed|we'll|we will)\b/i
      const actRe = /\b(action|todo|to do|will \w+|need to|must)\b/i
      const keyRe = /\b(important|key point|takeaway|summary|in conclusion)\b/i
      for (const s of sentences) {
        const t = s.trim()
        if (!t) continue
        if (decRe.test(t)) decisions.push(t)
        else if (actRe.test(t)) action_items.push(t)
        else if (keyRe.test(t)) key_points.push(t)
      }
      return { bullets: [], decisions, action_items, key_points }
    } catch {
      return { bullets: [], decisions: [], action_items: [], key_points: [] }
    }
  }, [result?.summary, fullTranscript])

  const getChaptersData = useCallback((): { label: string; segmentIndex: number; startTime?: number }[] => {
    if (result?.chapters?.length) {
      const segs = result.segments || []
      return result.chapters.map((c) => {
        let segmentIndex = 0
        if (segs.length) {
          const idx = segs.findIndex((s) => s.start >= c.startTime)
          segmentIndex = idx >= 0 ? idx : segs.length - 1
        }
        return { label: c.title, segmentIndex, startTime: c.startTime }
      })
    }
    try {
      const paras = getParagraphs(fullTranscript || '')
      if (paras.length === 0) return []
      const chunkSize = Math.max(1, Math.ceil(paras.length / 6))
      const chapters: { label: string; segmentIndex: number }[] = []
      for (let i = 0; i < paras.length; i += chunkSize) {
        const first = paras[i]
        const preview = first.length > 40 ? first.slice(0, 40) + '…' : first
        chapters.push({ label: `Section ${chapters.length + 1}: ${preview}`, segmentIndex: i })
      }
      return chapters
    } catch {
      return []
    }
  }, [result?.chapters, fullTranscript, getParagraphs])

  const getHighlightsData = useCallback((): { type: string; text: string }[] => {
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return []
      const out: { type: string; text: string }[] = []
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean)
      const defRe = /\b(means|defined as|is when|refers to)\b/i
      const conclRe = /\b(in conclusion|to conclude|therefore|thus|so we)\b/i
      const quoteRe = /^["'].*["']$|".*"/
      for (const s of sentences) {
        const t = s.trim()
        if (t.length < 15) continue
        if (defRe.test(t)) out.push({ type: 'Definition', text: t })
        else if (conclRe.test(t)) out.push({ type: 'Conclusion', text: t })
        else if (quoteRe.test(t) || t.endsWith('!')) out.push({ type: 'Quote', text: t })
        else if (/\b(important|critical|key)\b/i.test(t)) out.push({ type: 'Important', text: t })
      }
      return out
    } catch {
      return []
    }
  }, [fullTranscript])

  const getKeywordsData = useCallback((): { keyword: string; count: number; segmentIndex: number }[] => {
    try {
      const paras = getParagraphs(fullTranscript || '')
      if (paras.length === 0) return []
      const countMap = new Map<string, number>()
      const firstIndexMap = new Map<string, number>()
      paras.forEach((p, idx) => {
        const words = p.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))
        words.forEach((w) => {
          countMap.set(w, (countMap.get(w) || 0) + 1)
          if (!firstIndexMap.has(w)) firstIndexMap.set(w, idx)
        })
      })
      return Array.from(countMap.entries())
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 24)
        .map(([keyword, count]) => ({ keyword, count, segmentIndex: firstIndexMap.get(keyword) ?? 0 }))
    } catch {
      return []
    }
  }, [fullTranscript, getParagraphs])

  const getCleanTranscript = useCallback((): string => {
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return ''
      const paras = getParagraphs(raw)
      return paras
        .map((p) =>
          p.split(/\s+/)
            .filter((w) => !FILLER_WORDS.has(w.toLowerCase().replace(/[^\w]/g, '')))
            .join(' ')
            .replace(/\s+/g, ' ')
        )
        .map((s) => (s.length ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s))
        .join('\n\n')
    } catch {
      return ''
    }
  }, [fullTranscript, getParagraphs])

  const transcriptParagraphs = getParagraphs(fullTranscript || '')
  const displayTranscript =
    translationLanguage && translatedCache[translationLanguage] != null
      ? translatedCache[translationLanguage]
      : fullTranscript || ''
  const _displayParagraphs = getParagraphs(displayTranscript)
  void _displayParagraphs
  const isPaidPlan = typeof window !== 'undefined' && (localStorage.getItem('plan') || 'free').toLowerCase() !== 'free'

  // Search: match in segments (if any) or paragraphs; return { index, snippet, startTime? }
  const _searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q || q.length < 2) return []
    const snippetLen = 60
    if (result?.segments?.length) {
      return result.segments
        .map((s, i) => ({ index: i, text: s.text, start: s.start }))
        .filter((x) => x.text.toLowerCase().includes(q))
        .map((x) => ({
          index: x.index,
          snippet: x.text.length > snippetLen ? x.text.slice(0, snippetLen) + '…' : x.text,
          startTime: x.start,
        }))
    }
    return transcriptParagraphs
      .map((p, i) => ({ index: i, text: p }))
      .filter((x) => x.text.toLowerCase().includes(q))
      .map((x) => ({
        index: x.index,
        snippet: x.text.length > snippetLen ? x.text.slice(0, snippetLen) + '…' : x.text,
        startTime: undefined,
      }))
  }, [searchQuery, result?.segments, transcriptParagraphs])
  void _searchResults

  const segmentsForExport = editableSegments && editableSegments.length > 0 ? editableSegments : (result?.segments ?? null)

  const handleExportSrt = () => {
    if (!segmentsForExport?.length) {
      toast.error('Enable summary or chapters to get timestamps, then export SRT.')
      return
    }
    const srt = segmentsToSrt(segmentsForExport)
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcript.srt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('SRT downloaded')
  }

  const handleExportVtt = () => {
    if (!segmentsForExport?.length) {
      toast.error('Enable summary or chapters to get timestamps, then export VTT.')
      return
    }
    const vtt = segmentsToVtt(segmentsForExport)
    const blob = new Blob([vtt], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'transcript.vtt'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('VTT downloaded')
  }

  const breadcrumbs = [{ label: 'Video to Transcript', href: '/video-to-transcript' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Video → Transcript',
    subtitle: seoIntro ?? 'Extract spoken text from any video in seconds',
    icon: <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
    sidebar: (
      <ToolSidebar
        refreshTrigger={status}
        showWhatYouGet={status === 'idle'}
        whatYouGetContent="Transcript, Speakers, Summary, Chapters, Highlights, Keywords, Clean, Exports: all after one upload."
      />
    ),
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        {status === 'idle' && !selectedFile && (
          <UploadZone
            immediateSelect
            onFileSelect={handleFileSelect}
            initialFiles={selectedFile ? [selectedFile] : null}
            onRemove={() => {
              if (fileFromWorkflow) workflow.clearVideo()
              setSelectedFile(null)
              setFileFromWorkflow(false)
            }}
            fromWorkflowLabel={fileFromWorkflow ? 'From previous step' : undefined}
          />
        )}

        {status === 'idle' && selectedFile && (
          <ProcessingInterface
            file={{
              name: selectedFile.name,
              size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
              duration: filePreview?.durationSeconds != null ? formatDuration(filePreview.durationSeconds) : undefined,
            }}
            onRemove={() => {
              if (fileFromWorkflow) workflow.clearVideo()
              setSelectedFile(null)
              setFileFromWorkflow(false)
            }}
            actionLabel="Transcribe Video"
            onAction={(trimStartPercent, trimEndPercent) => handleProcess(trimStartPercent, trimEndPercent)}
            actionLoading={false}
            showVideoPlayer={!!(videoPreviewUrl || filePreview?.durationSeconds)}
            videoSrc={videoPreviewUrl ?? undefined}
          >
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Options</h3>
              <div className="space-y-4">
                <Checkbox
                  label="Include AI summary & bullets"
                  checked={includeSummary}
                  onChange={(checked) => setIncludeSummary(checked)}
                />
                <Checkbox
                  label="Auto-generate chapters"
                  checked={includeChapters}
                  onChange={(checked) => setIncludeChapters(checked)}
                />
                <Checkbox
                  label="Speaker labels (who said what)"
                  description="Identify and label different speakers in the transcript"
                  checked={speakerDiarization}
                  onChange={(checked) => setSpeakerDiarization(checked)}
                />
              </div>
              <Input
                label="Glossary (names, terms; improves accuracy)"
                placeholder="e.g. Acme Corp, Dr. Smith, API, SaaS"
                value={glossary}
                onChange={setGlossary}
              />
              <ExportFormat
                formats={[
                  { value: 'TXT', label: 'TXT' },
                  { value: 'JSON', label: 'JSON' },
                  { value: 'DOCX', label: 'DOCX' },
                  { value: 'PDF', label: 'PDF' },
                ]}
                selected={exportFormats.map((f) => f.toUpperCase())}
                onChange={(formats) => setExportFormats(formats.map((f) => f.toLowerCase() as 'txt' | 'json' | 'docx' | 'pdf'))}
              />
            </div>
          </ProcessingInterface>
        )}

        {status === 'processing' && (
          <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-8 border border-purple-100 dark:border-purple-900/30">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-purple-200 dark:border-purple-900/30">
              <div className="w-16 h-16 bg-purple-200 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{selectedFile?.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedFile && `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                  {filePreview?.durationSeconds != null && ` • ${formatDuration(filePreview.durationSeconds)}`}
                </p>
              </div>
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Processing', status: uploadPhase === 'processing' ? 'active' : uploadPhase === 'uploading' ? 'pending' : 'completed' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={
                isRehydrating ? 'Resuming…' :
                uploadPhase === 'uploading' ? `Uploading (${uploadProgress}%)` :
                'Processing audio and generating transcript'
              }
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime="30-60 seconds"
              statusSubtext={queuePosition !== undefined ? `${queuePosition} jobs ahead of you` : undefined}
              liveTranscript={partialSegments.map((s) => (s.speaker ? `${s.speaker}: ` : '') + s.text).join('\n')}
              onCancel={handleCancelUpload}
            />
            <ResultSkeleton variant="transcript" />
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-6">
            {/* Result header + primary actions */}
            <TranscriptResult
              fileName={result.fileName ?? selectedFile?.name?.replace(/\.[^/.]+$/, '') + '_transcript.txt'}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              fileSize={result.fileName ? undefined : undefined}
              transcript={displayTranscript || fullTranscript || transcriptPreview || ''}
              minutesRemaining={availableMinutes != null && usedMinutes != null ? availableMinutes - usedMinutes : null}
              onDownload={() => {
                const url = getDownloadUrl()
                if (url) {
                  const a = document.createElement('a')
                  a.href = url
                  a.download = result?.fileName ?? 'transcript.txt'
                  a.click()
                }
              }}
              onProcessAnother={handleProcessAnother}
              onGenerateSubtitles={() => {
                if (segmentsForExport?.length) workflow.setSrt(segmentsToSrt(segmentsForExport))
                if (selectedFile) workflow.setVideo(selectedFile)
                navigate('/video-to-subtitles', { state: { useWorkflowVideo: true } })
              }}
              onExportSrt={handleExportSrt}
              onExportVtt={handleExportVtt}
              onCopy={handleCopyToClipboard}
              onEditToggle={isPaidPlan ? () => setTranscriptEditMode((v) => !v) : undefined}
              editLabel={transcriptEditMode ? 'Done' : 'Edit'}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              showTranscriptCard={false}
              showNextSteps={false}
            />

            {/* Branch tabs and workspace views */}
            <div className="space-y-4">
              {/* Branch tabs */}
              <div className="rounded-2xl bg-gray-50/90 px-3 py-3 shadow-card" role="tablist" aria-label="Transcript branches">
                <div className="flex flex-wrap gap-2 items-center justify-start">
                  {BRANCH_IDS.map((id) => {
                    const Icon = BRANCH_ICONS[id]
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={activeBranch === id}
                        onClick={() => setActiveBranch(id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-motion ${
                          activeBranch === id
                            ? 'bg-violet-600 text-white shadow-card ring-2 ring-violet-200 ring-offset-2 ring-offset-gray-50'
                            : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800 hover:shadow-card ring-1 ring-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {BRANCH_LABELS[id]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Workflow link / suggestion */}
              <div className="min-h-[2.75rem]">
                <WorkflowChainSuggestion
                  pathname={location.pathname}
                  plan={(localStorage.getItem('plan') || 'free').toLowerCase()}
                  lastJobCompletedToolId={lastJobCompletedToolId}
                />
              </div>

              {/* Active branch views */}
              {activeBranch === 'speakers' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Users className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Who said what
                    </h3>
                    {(() => {
                      const data = getSpeakersData()
                      const hasMultipleSpeakers = data.length > 0 && data.some((d) => d.isDiarized)
                      if (!data.length) {
                        return (
                          <div className="rounded-xl bg-gray-50/80 p-4">
                            <p className="text-gray-600 text-sm font-medium mb-1">Speakers</p>
                            <p className="text-gray-500 text-sm">Enable &quot;Speaker diarization&quot; when processing to see who said what. Otherwise this view stays empty or uses paragraph grouping.</p>
                          </div>
                        )
                      }
                      return (
                        <>
                          <p className="text-sm text-gray-500 mb-4">
                            {hasMultipleSpeakers
                              ? 'Labels (Speaker 1, 2, …) come from automatic speaker detection. They are not real names; each label is one distinct voice in the video.'
                              : 'All segments are shown as one speaker. Enable &quot;Speaker diarization&quot; when you upload to get automatic labels (Speaker 1, 2, …) for different voices.'}
                          </p>
                          <div className="space-y-4 min-h-48 max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh] overflow-y-auto">
                            {data.map((item, i) => (
                              <div key={i} className="border-l-2 border-violet-300 pl-3 py-1">
                                <span className="text-xs font-semibold text-violet-600 uppercase">{item.speaker}</span>
                                <p className="text-sm text-gray-700 mt-0.5">{item.text}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                )}

              {activeBranch === 'summary' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <ListOrdered className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Summary
                    </h3>
                    {(() => {
                      const schema = getSummarySchema()
                      const hasServer = schema.summary || (schema.bullets && schema.bullets.length > 0)
                      const hasAny = hasServer || schema.decisions.length || schema.action_items.length || schema.key_points.length
                      if (!hasAny) {
                        return (
                          <div className="rounded-xl bg-gray-50/80 p-4">
                            <p className="text-gray-600 text-sm font-medium mb-1">Summary</p>
                            <p className="text-gray-500 text-sm">Enable &quot;Include AI summary&quot; when transcribing to get a paragraph and bullet points.</p>
                          </div>
                        )
                      }
                      return (
                        <div className="grid gap-4">
                          {schema.summary && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Overview</h4>
                              <p className="text-sm text-gray-700">{schema.summary}</p>
                            </div>
                          )}
                          {schema.bullets && schema.bullets.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Key points</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {schema.bullets.map((k, i) => <li key={i}>{k}</li>)}
                              </ul>
                            </div>
                          )}
                          {schema.action_items && schema.action_items.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Action items</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {schema.action_items.map((a, i) => <li key={i}>{a}</li>)}
                              </ul>
                            </div>
                          )}
                          {!hasServer && schema.decisions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Decisions</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {schema.decisions.map((d, i) => <li key={i}>{d}</li>)}
                              </ul>
                            </div>
                          )}
                          {!hasServer && schema.key_points.length > 0 && schema.key_points !== schema.bullets && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-600 mb-2">Key points</h4>
                              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                {schema.key_points.map((k, i) => <li key={i}>{k}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}

              {activeBranch === 'chapters' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Chapters
                    </h3>
                    {(() => {
                      const chapters = getChaptersData()
                      if (!chapters.length) {
                        return (
                          <div className="rounded-xl bg-gray-50/80 p-4">
                            <p className="text-gray-600 text-sm font-medium mb-1">Chapters</p>
                            <p className="text-gray-500 text-sm">Section headings derived from transcript paragraphs. Empty when the transcript has no paragraph structure.</p>
                          </div>
                        )
                      }
                      return (
                        <div className="space-y-2 min-h-48 max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh] overflow-y-auto">
                          {chapters.map((ch, i) => (
                            <button
                              key={i}
                              onClick={() => scrollToSegment(ch.segmentIndex)}
                              className="block w-full text-left px-3 py-2 rounded-xl bg-gray-50/80 hover:bg-violet-50/80 text-sm text-gray-800 ring-1 ring-gray-100"
                            >
                              {ch.label}
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}

              {activeBranch === 'highlights' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Highlights / Key moments
                    </h3>
                    {(() => {
                      const items = getHighlightsData()
                      if (!items.length) {
                        return (
                          <div className="rounded-xl bg-gray-50/80 p-4">
                            <p className="text-gray-600 text-sm font-medium mb-1">Highlights</p>
                            <p className="text-gray-500 text-sm">Definitions, conclusions, quotes, and important statements. Empty when no such segments are detected in the transcript.</p>
                          </div>
                        )
                      }
                      return (
                        <div className="space-y-3 min-h-48 max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh] overflow-y-auto">
                          {items.map((item, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-xs font-semibold text-violet-600 shrink-0">{item.type}</span>
                              <p className="text-sm text-gray-700">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}

              {activeBranch === 'keywords' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Hash className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Keywords / Topic index
                    </h3>
                    {(() => {
                      const kw = getKeywordsData()
                      if (!kw.length) {
                        return (
                          <div className="rounded-xl bg-gray-50/80 p-4">
                            <p className="text-gray-600 text-sm font-medium mb-1">Keywords</p>
                            <p className="text-gray-500 text-sm">Repeated terms that link to transcript sections. Empty when no word appears often enough to qualify.</p>
                          </div>
                        )
                      }
                      return (
                        <div className="flex flex-wrap gap-2">
                          {kw.map((item, i) => (
                            <button
                              key={i}
                              onClick={() => scrollToSegment(item.segmentIndex)}
                              className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-800 text-sm hover:bg-violet-200"
                            >
                              {item.keyword} ({item.count})
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )}

              {activeBranch === 'clean' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Clean transcript</h3>
                    <p className="text-sm text-gray-500 mb-4">Filler words removed, casing normalized, paragraph grouping. Original transcript is always preserved in the Transcript branch.</p>
                    <label className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        checked={cleanTranscriptEnabled}
                        onChange={(e) => setCleanTranscriptEnabled(e.target.checked)}
                      />
                      <span className="text-sm">Show cleaned version</span>
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 min-h-48 max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh] overflow-y-auto">
                      {cleanTranscriptEnabled ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{getCleanTranscript() || 'No content.'}</p>
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{fullTranscript || 'No transcript.'}</p>
                      )}
                    </div>
                  </div>
                )}

              {activeBranch === 'exports' && (
                  <div className="bg-white rounded-2xl p-6 shadow-card">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <FileCode className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                      Exports
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">Download transcript and derived data in your preferred format.</p>
                    {!fullTranscript ? (
                      <div className="rounded-xl bg-gray-50/80 p-4">
                        <p className="text-gray-600 text-sm font-medium mb-1">Exports</p>
                        <p className="text-gray-500 text-sm">Structured exports (JSON, CSV, Notion, Text) appear here once transcript data is available.</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500 mb-4">
                          {isPaidPlan
                            ? 'Full download available.'
                            : `Free plan: download any 2 exports with watermark (${freeExportsUsed}/2 used). Upgrade for unlimited downloads.`}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(['json', 'csv', 'notion', 'text'] as const).map((format) => {
                            const schema = getSummarySchema()
                            const speakers = getSpeakersData()
                            const chapters = getChaptersData()
                            const highlights = getHighlightsData()
                            const keywords = getKeywordsData()
                            const buildContent = () => {
                              if (format === 'json') {
                                return JSON.stringify({ summary: schema, speakers, chapters, highlights, keywords, rawPreview: fullTranscript.slice(0, 500) }, null, 2)
                              }
                              if (format === 'csv') {
                                const rows = [['type', 'content'], ['raw_preview', fullTranscript.slice(0, 300).replace(/"/g, '""')]]
                                speakers.forEach((s) => rows.push(['speaker', `"${s.speaker}","${s.text.replace(/"/g, '""')}"`]))
                                return rows.map((r) => r.join(',')).join('\n')
                              }
                              if (format === 'notion') {
                                return JSON.stringify(speakers.map((s) => ({ type: 'paragraph', rich_text: [{ text: { content: `[${s.speaker}] ${s.text}` } }] })), null, 2)
                              }
                              if (format === 'text') {
                                return fullTranscript
                              }
                              return ''
                            }
                            const content = buildContent()
                            const preview = content.slice(0, 400) + (content.length > 400 ? '…' : '')
                            const FREE_EXPORT_WATERMARK = '\n\n---\nExported from VideoText (Free) - videotext.io\n'
                            const freeCanDownload = !isPaidPlan && freeExportsUsed < 2
                            const freeUsedAll = !isPaidPlan && freeExportsUsed >= 2
                            const mimeType = format === 'json' ? 'application/json' : 'text/plain'
                            const ext = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt'
                            const handleDownload = () => {
                              if (isPaidPlan) {
                                const blob = new Blob([content], { type: mimeType })
                                const a = document.createElement('a')
                                a.href = URL.createObjectURL(blob)
                                a.download = `transcript-export.${ext}`
                                a.click()
                                URL.revokeObjectURL(a.href)
                                toast.success('Download started')
                                return
                              }
                              if (freeUsedAll) {
                                toast('You\'ve used your 2 free exports. Upgrade for unlimited downloads.')
                                return
                              }
                              const watermarkedContent = content + FREE_EXPORT_WATERMARK
                              setFreeExportsUsed((prev) => prev + 1)
                              const blob = new Blob([watermarkedContent], { type: mimeType })
                              const a = document.createElement('a')
                              a.href = URL.createObjectURL(blob)
                              a.download = `transcript-export.${ext}`
                              a.click()
                              URL.revokeObjectURL(a.href)
                              toast.success('Download started (with watermark)')
                            }
                            const downloadLabel = isPaidPlan
                              ? 'Download'
                              : freeCanDownload
                                ? 'Download with watermark'
                                : '2/2 used'
                            const canClick = isPaidPlan || freeCanDownload
                            const label = format === 'json' ? 'JSON' : format === 'csv' ? 'CSV' : format === 'notion' ? 'Notion' : 'Text'
                            return (
                              <div key={format} className="rounded-xl bg-gray-50/80 p-4">
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <span className="text-sm font-medium text-gray-800">{label}</span>
                                  <button
                                    onClick={handleDownload}
                                    disabled={!canClick}
                                    className={`flex items-center gap-1.5 text-sm font-medium ${canClick ? 'text-violet-600 hover:text-violet-700' : 'text-gray-400 cursor-not-allowed'}`}
                                  >
                                    <Download className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                                    {downloadLabel}
                                  </button>
                                </div>
                                <pre className="text-xs text-gray-600 bg-white/80 p-3 rounded-lg max-h-32 overflow-y-auto whitespace-pre-wrap break-words ring-1 ring-gray-100">
                                  {preview}
                                </pre>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
            </div>

            {/* Main transcript workspace panel (last) */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Transcript</h3>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex-1 min-w-[200px] relative">
                    <input
                      type="text"
                      placeholder="Search in transcript"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  {isPaidPlan && (
                    <button
                      type="button"
                      onClick={() => setTranscriptEditMode((v) => !v)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      {transcriptEditMode ? 'Done' : 'Edit'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExportSrt}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                  >
                    SRT
                  </button>
                  <button
                    type="button"
                    onClick={handleExportVtt}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                  >
                    VTT
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <div className="max-h-[480px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {displayTranscript || fullTranscript || transcriptPreview || ''}
                </div>
              </div>
            </div>

            {(segmentsForExport?.length ?? 0) > 0 && (
              <div className="surface-card p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Subtitles className="h-5 w-5 text-violet-600" strokeWidth={1.5} />
                  Generate subtitles from this transcript
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Same timestamps, no re-upload.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleExportSrt}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    <FileDown className="h-4 w-4" strokeWidth={1.5} />
                    Download SRT
                  </button>
                  <button
                    type="button"
                    onClick={handleExportVtt}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                  >
                    <FileDown className="h-4 w-4" strokeWidth={1.5} />
                    Download VTT
                  </button>
                </div>
              </div>
            )}

            <CrossToolSuggestions
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
                    if (segmentsForExport?.length) workflow.setSrt(segmentsToSrt(segmentsForExport))
                    if (selectedFile) workflow.setVideo(selectedFile)
                  },
                },
                { icon: Minimize2, title: 'Compress Video', path: '/compress-video', description: 'Reduce file size', state: { useWorkflowVideo: true } },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
          <FailedState
            onTryAgain={() => {
              setFailedMessage(undefined)
              handleProcessAnother()
            }}
            message={failedMessage}
          />
        )}
      </ToolLayout>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        usedMinutes={usedMinutes ?? 0}
        availableMinutes={availableMinutes ?? 0}
      />

      {faq.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 px-6 max-w-7xl mx-auto" aria-label="FAQ">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Frequently asked questions</h2>
          <dl className="space-y-4">
            {faq.map((item, i) => (
              <div key={i}>
                <dt className="font-medium text-gray-800">{item.q}</dt>
                <dd className="mt-1 text-gray-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  )
}
