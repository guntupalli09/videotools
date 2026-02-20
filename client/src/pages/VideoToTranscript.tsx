import { useState, useRef, useCallback, useEffect, useMemo, Suspense, lazy } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileText, Copy, Loader2, Users, ListOrdered, BookOpen, Sparkles, Hash, FileCode, Download, Eraser, Search, Pencil, FileDown, Languages, ChevronDown } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import FilePreviewCard from '../components/FilePreviewCard'
import UploadStageIndicator from '../components/UploadStageIndicator'
import ProcessingTimeBlock from '../components/ProcessingTimeBlock'
import UsageCounter from '../components/UsageCounter'
import PlanBadge from '../components/PlanBadge'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import FailedState from '../components/FailedState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import WorkflowChainSuggestion from '../components/WorkflowChainSuggestion'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import UsageRemaining from '../components/UsageRemaining'
const VideoTrimmer = lazy(() => import('../components/VideoTrimmer'))
import { incrementUsage } from '../lib/usage'
import { uploadFileWithProgress, getJobStatus, getCurrentUsage, getConnectionProbeIfNeeded, BACKEND_TOOL_TYPES, SessionExpiredError, getUserFacingMessage, isNetworkError, translateTranscript, TRANSCRIPT_TRANSLATION_LANGUAGES } from '../lib/api'
import { getFailureMessage } from '../lib/failureMessage'
import { checkVideoPreflight } from '../lib/uploadPreflight'
import { getFilePreview, type FilePreviewData } from '../lib/filePreview'
import { extractAudioInBrowser, isAudioExtractionSupported } from '../lib/audioExtraction'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, getPersistedJobId, getPersistedJobToken, clearPersistedJobId } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import { segmentsToSrt, segmentsToVtt, formatTimestamp, type Segment } from '../lib/srtExport'
import toast from 'react-hot-toast'
import { Subtitles, Film, Minimize2 } from 'lucide-react'
import { useWorkflow } from '../contexts/WorkflowContext'

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
  const [uploadPhase, setUploadPhase] = useState<'preparing' | 'uploading' | 'processing'>('preparing')
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
  const [elapsedMs, setElapsedMs] = useState(0)
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null)
  const [connectionSpeed, setConnectionSpeed] = useState<'fast' | 'medium' | 'slow' | undefined>(undefined)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [fileFromWorkflow, setFileFromWorkflow] = useState(false)
  const uploadAbortRef = useRef<AbortController | null>(null)
  // Phase 1 – Derived Transcript Utilities: branch tab (no remount/refetch)
  const [activeBranch, setActiveBranch] = useState<BranchId>('transcript')
  const [cleanTranscriptEnabled, setCleanTranscriptEnabled] = useState(false)
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null)
  const [translatedCache, setTranslatedCache] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState(false)
  const [translateDropdownOpen, setTranslateDropdownOpen] = useState(false)
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const segmentRefsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const rehydratePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeUploadPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobStartedTrackedRef = useRef<string | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)
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

  // Rehydrate from URL/sessionStorage after idle or reload (e.g. mobile Safari)
  useEffect(() => {
    const pathname = location.pathname
    const jobId = getPersistedJobId(pathname)
    if (!jobId) return

    setStatus('processing')
    setUploadPhase('processing')
    setUploadProgress(100)
    setCurrentJobId(jobId)
    setIsRehydrating(true)
    setProcessingStartedAt(Date.now())

    const jobToken = getPersistedJobToken(pathname)
    let cancelled = false
    const run = async () => {
      try {
        const jobStatus = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
        if (cancelled) return
        setIsRehydrating(false)
        setProgress(jobStatus.progress ?? 0)
        if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

        const transition = getJobLifecycleTransition(jobStatus)
        if (transition === 'completed') {
          setStatus('completed')
          setResult(jobStatus.result ?? null)
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
          return
        }
        if (transition === 'failed') {
          setIsRehydrating(false)
          setStatus('failed')
          toast.error('Processing failed. Please try again.')
          clearPersistedJobId(pathname, navigate)
          return
        }
        // Resume polling for queued/processing
        setStatus('processing')
        setUploadPhase('processing')
        setUploadProgress(100)
        const doPoll = async () => {
          if (cancelled) return
          try {
            const s = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
            if (cancelled) return
            setProgress(s.progress ?? 0)
            if (s.queuePosition !== undefined) setQueuePosition(s.queuePosition)
            const t = getJobLifecycleTransition(s)
            if (t === 'completed') {
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              setStatus('completed')
              setResult(s.result ?? null)
              if (s.result?.downloadUrl) {
                try {
                  const res = await fetch(getAbsoluteDownloadUrl(s.result.downloadUrl))
                  const text = await res.text()
                  setTranscriptPreview(text.substring(0, 500))
                  setFullTranscript(text)
                } catch {
                  // ignore
                }
              }
            } else if (t === 'failed') {
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              setIsRehydrating(false)
              setStatus('failed')
              toast.error('Processing failed. Please try again.')
              clearPersistedJobId(pathname, navigate)
            }
          } catch (err) {
            if (err instanceof SessionExpiredError) {
              if (rehydratePollRef.current) clearInterval(rehydratePollRef.current)
              rehydratePollRef.current = null
              clearPersistedJobId(pathname, navigate)
              toast.error(err.message)
            }
            // other errors: keep polling
          }
        }
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
      clearInterval(activeUploadPollRef.current)
      activeUploadPollRef.current = null
    }
    if (currentJobId) {
      clearPersistedJobId(location.pathname, navigate)
      setCurrentJobId(null)
      setStatus('idle')
      setUploadPhase('preparing')
      setUploadProgress(0)
      setProgress(0)
      toast('Cancelled. You can upload a new file — the previous job may still complete in the background.', { icon: 'ℹ️', duration: 5000 })
    }
  }

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

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
      setUploadPhase('preparing')
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
        trimmedStart: trimStart ?? undefined,
        trimmedEnd: trimEnd ?? undefined,
        includeSummary,
        includeChapters,
        exportFormats: exportFormats.length > 0 ? exportFormats : (['txt'] as const),
        speakerDiarization,
        glossary: glossary.trim() || undefined,
      }
      let fileToUpload: File = selectedFile
      const useAudioOnly =
        trimStart == null &&
        trimEnd == null &&
        isAudioExtractionSupported()
      if (useAudioOnly) {
        setUploadPhase('preparing')
        const extracted = await extractAudioInBrowser(selectedFile)
        if (extracted) {
          const baseName = selectedFile.name.replace(/\.[^.]+$/, '') || 'audio'
          fileToUpload = new File([extracted.blob], `${baseName}_audio.mp3`, { type: 'audio/mpeg' })
          Object.assign(baseOptions, {
            uploadMode: 'audio-only' as const,
            originalFileName: selectedFile.name,
            originalFileSize: selectedFile.size,
          })
        }
      }
      setUploadPhase('uploading')
      trackEvent('processing_started', { tool: 'video-to-transcript' })

      const response = await uploadFileWithProgress(
        fileToUpload,
        baseOptions,
        {
          onProgress: (p) => setUploadProgress(p),
          connectionSpeed: connectionSpeedResult,
          signal: uploadAbortRef.current?.signal,
        }
      )

      uploadAbortRef.current = null
      setCurrentJobId(response.jobId)
      persistJobId(location.pathname, response.jobId, response.jobToken)
      setUploadPhase('processing')
      setUploadProgress(100)
      const startedAt = Date.now()
      setProcessingStartedAt(startedAt)
      processingStartedAtRef.current = startedAt
      texJobStarted()

      // Poll for status: run first poll immediately, then every 2s.
      // Lifecycle depends ONLY on jobStatus.status; missing result never causes failure.
      const jobToken = response.jobToken
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId, jobToken ? { jobToken } : undefined)
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
            if (activeUploadPollRef.current) {
              clearInterval(activeUploadPollRef.current)
              activeUploadPollRef.current = null
            }
            jobStartedTrackedRef.current = null
            setStatus('completed')
            setResult(jobStatus.result ?? null)
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
              } catch (e) {
                // Ignore (e.g. ZIP)
              }
            }
            incrementUsage('video-to-transcript')
            const started = processingStartedAtRef.current ?? Date.now()
            const processingMs = Date.now() - started
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
          } else if (transition === 'failed') {
            if (activeUploadPollRef.current) {
              clearInterval(activeUploadPollRef.current)
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
          }
          // transition === 'continue': keep polling (queued | processing)
        } catch (error: any) {
          // Network/parse errors: do not set failed; keep polling.
        }
      }
      activeUploadPollRef.current = setInterval(doPoll, JOB_POLL_INTERVAL_MS)
      doPoll()
    } catch (error: any) {
      uploadAbortRef.current = null
      if (error instanceof Error && error.message === 'Upload cancelled') {
        setStatus('idle')
        setUploadPhase('preparing')
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
    setStatus('idle')
    setProgress(0)
    setUploadPhase('preparing')
    setUploadProgress(0)
    setResult(null)
    setTranscriptPreview('')
    setFullTranscript('')
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
  const displayParagraphs = getParagraphs(displayTranscript)
  const isPaidPlan = typeof window !== 'undefined' && (localStorage.getItem('plan') || 'free').toLowerCase() !== 'free'

  const handleTranslateLanguage = async (language: string) => {
    if (language === 'Original') {
      setTranslationLanguage(null)
      setTranslateDropdownOpen(false)
      return
    }
    if (translatedCache[language] != null) {
      setTranslationLanguage(language)
      setTranslateDropdownOpen(false)
      return
    }
    const textToTranslate = fullTranscript || ''
    if (!textToTranslate.trim()) {
      toast.error('No transcript to translate')
      return
    }
    setTranslating(true)
    setTranslateDropdownOpen(false)
    try {
      const { translatedText } = await translateTranscript(textToTranslate, language)
      setTranslatedCache((prev) => ({ ...prev, [language]: translatedText }))
      setTranslationLanguage(language)
      toast.success(`Translated to ${language}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }

  // Search: match in segments (if any) or paragraphs; return { index, snippet, startTime? }
  const searchResults = useMemo(() => {
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

  return (
    <div className="min-h-screen py-6 sm:py-8 lg:py-12 bg-gradient-to-b from-violet-50/40 to-white">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1fr,minmax(240px,280px)] lg:gap-8 lg:items-start">
          {/* Sidebar: plan + usage + what you get (desktop); on mobile shows above main */}
          <aside className="order-1 lg:order-2 space-y-4 mb-6 lg:mb-0 lg:sticky lg:top-6">
            <PlanBadge />
            <UsageCounter refreshTrigger={status} />
            <UsageDisplay refreshTrigger={status} />
            {status === 'idle' && (
              <div className="surface-card px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What you get</p>
                <p className="text-sm text-gray-600">
                  Transcript, Speakers, Summary, Chapters, Highlights, Keywords, Clean, Exports — all after one upload.
                </p>
              </div>
            )}
          </aside>

          {/* Main content */}
          <div className="order-2 lg:order-1">
            {/* Hero: compact */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-3 mb-2">
<div className="bg-primary/10 rounded-xl p-2.5 w-12 h-12 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{seoH1 ?? 'Video → Transcript'}</h1>
                  <p className="text-sm sm:text-base text-gray-600">
                    {seoIntro ?? 'Extract spoken text from any video in seconds'}
                  </p>
                </div>
              </div>
            </div>

            {/* Before upload: single compact line (inside card below) */}
            {/* Phase 1 – Branch Bar (below header; only when transcript ready) */}
            {status === 'completed' && result && (
              <div className="mb-6 rounded-2xl bg-gray-50/90 px-3 py-3 shadow-sm" role="tablist" aria-label="Transcript branches">
                <div className="flex flex-wrap gap-2 justify-center items-center">
                  {BRANCH_IDS.map((id) => {
                    const Icon = BRANCH_ICONS[id]
                    return (
                      <button
                        key={id}
                        role="tab"
                        aria-selected={activeBranch === id}
                        onClick={() => setActiveBranch(id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          activeBranch === id
                            ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-200 ring-offset-2 ring-offset-gray-50'
                            : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800 hover:shadow-sm ring-1 ring-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {BRANCH_LABELS[id]}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {status === 'idle' && (
              <div className="surface-card p-6 sm:p-8 mb-8">
                <p className="text-center text-xs text-gray-400 mb-4" aria-hidden="true">
                  {BRANCH_IDS.map((id) => BRANCH_LABELS[id]).join(' · ')} — Upload a video to unlock
                </p>
                <div>
                  <FileUploadZone
                onFileSelect={handleFileSelect}
                accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'] }}
                maxSize={10 * 1024 * 1024 * 1024}
                initialFiles={selectedFile ? [selectedFile] : null}
                onRemove={() => {
                  if (fileFromWorkflow) workflow.clearVideo()
                  setSelectedFile(null)
                  setFileFromWorkflow(false)
                }}
                fromWorkflowLabel={fileFromWorkflow ? 'From previous step' : undefined}
              />
              <UsageRemaining />
              {selectedFile && filePreview && (
                <div className="mt-4">
                  <FilePreviewCard preview={filePreview} />
                </div>
              )}
              {selectedFile && (
                <Suspense fallback={null}>
                  <VideoTrimmer
                    file={selectedFile}
onChange={(startSeconds: number, endSeconds: number) => {
                    setTrimStart(startSeconds)
                    setTrimEnd(endSeconds)
                  }}
                  />
                </Suspense>
              )}
              {selectedFile && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-gray-700">Options</p>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={includeSummary} onChange={(e) => setIncludeSummary(e.target.checked)} className="rounded border-gray-300" />
                    Include AI summary & bullets
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={includeChapters} onChange={(e) => setIncludeChapters(e.target.checked)} className="rounded border-gray-300" />
                    Auto-generate chapters
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={speakerDiarization} onChange={(e) => setSpeakerDiarization(e.target.checked)} className="rounded border-gray-300" />
                    Speaker labels (who said what)
                  </label>
                  <label className="block text-sm text-gray-600 mt-2">
                    Glossary <span className="text-gray-400 font-normal">(names, terms — improves accuracy)</span>
                  </label>
                  <textarea
                    value={glossary}
                    onChange={(e) => setGlossary(e.target.value)}
                    placeholder="e.g. Acme Corp, Dr. Smith, API, SaaS"
                    rows={2}
                    className="w-full mt-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  />
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <span className="text-sm text-gray-600">Export:</span>
                    {(['txt', 'json', 'docx', 'pdf'] as const).map((fmt) => (
                      <label key={fmt} className="flex items-center gap-1 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={exportFormats.includes(fmt)}
                          onChange={(e) => {
                            if (e.target.checked) setExportFormats((f) => [...f, fmt])
                            else setExportFormats((f) => f.filter((x) => x !== fmt))
                          }}
                          className="rounded border-gray-300"
                        />
                        {fmt.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {selectedFile && (
                <button
onClick={handleProcess}
                className="mt-6 w-full btn-primary"
              >
                Transcribe Video
                </button>
              )}
            </div>
          </div>
        )}

        {status === 'processing' && (
          <div className="surface-card p-6 sm:p-8 mb-8 text-center processing-gradient-bg overflow-x-hidden">
            <UploadStageIndicator
              uploadPhase={uploadPhase}
              status={status}
              isRehydrating={isRehydrating}
            />
            {uploadPhase === 'processing' && !isRehydrating && (
              <ProcessingTimeBlock
                elapsedMs={elapsedMs}
                videoDurationSeconds={filePreview?.durationSeconds}
                label="Processing video…"
                className="mb-4"
              />
            )}
            {filePreview && (
              <div className="flex justify-center mb-4">
                <FilePreviewCard preview={filePreview} compact />
              </div>
            )}
            {connectionSpeed === 'slow' && uploadPhase === 'uploading' && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4 inline-block" role="status">
                Slow connection detected — optimizing upload
              </p>
            )}
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-base sm:text-lg font-medium text-gray-800 mb-4 break-words">
              {isRehydrating && 'Resuming…'}
              {!isRehydrating && uploadPhase === 'preparing' && 'Preparing audio…'}
              {!isRehydrating && uploadPhase === 'uploading' && `Uploading (${uploadProgress}%)`}
              {!isRehydrating && uploadPhase === 'processing' && 'Processing audio and generating transcript'}
            </p>
            <ProgressBar
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              status={
                uploadPhase === 'uploading'
                  ? ''
                  : queuePosition !== undefined
                    ? `Processing… ${queuePosition} jobs ahead of you.`
                    : 'Processing audio and generating transcript'
              }
              isRehydrating={isRehydrating}
              isUploadPhase={uploadPhase === 'uploading'}
              queuePosition={queuePosition}
              processingStartedAt={uploadPhase === 'processing' ? processingStartedAt : null}
            />
            <p className="text-sm text-gray-500 mt-4">
              {uploadPhase === 'uploading' ? 'Large files may take a minute.' : 'Estimated time: 30-60 seconds'}
            </p>
            {(uploadPhase === 'preparing' || uploadPhase === 'uploading' || (uploadPhase === 'processing' && currentJobId)) && (
              <button
                type="button"
                onClick={handleCancelUpload}
                className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-6">
            <SuccessState
              fileName={result.fileName}
              downloadUrl={getDownloadUrl()}
              onProcessAnother={handleProcessAnother}
              toolType={BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT}
              jobId={currentJobId ?? undefined}
              processedInSeconds={lastProcessingMs != null ? lastProcessingMs / 1000 : undefined}
            />
            <div className="mt-2 min-h-[2.75rem]">
            <WorkflowChainSuggestion
              pathname={location.pathname}
              plan={(localStorage.getItem('plan') || 'free').toLowerCase()}
              lastJobCompletedToolId={lastJobCompletedToolId}
            />
            </div>

            {/* Phase 1 – Trunk (Transcript) or branch content; transcript always preserved */}
            {activeBranch === 'transcript' && (
              <>
                {transcriptPreview && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Transcript</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="search"
                            placeholder="Search in transcript…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg w-48 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                          />
                        </div>
                        {segmentsForExport && (
                          <>
                            <button
                              type="button"
                              onClick={() => setTranscriptEditMode((v) => !v)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${transcriptEditMode ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                              <Pencil className="h-4 w-4" />
                              {transcriptEditMode ? 'Done' : 'Edit'}
                            </button>
                            <button type="button" onClick={handleExportSrt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                              <FileDown className="h-4 w-4" />
                              SRT
                            </button>
                            <button type="button" onClick={handleExportVtt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                              <FileDown className="h-4 w-4" />
                              VTT
                            </button>
                          </>
                        )}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setTranslateDropdownOpen((o) => !o)}
                            disabled={translating || !fullTranscript?.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Languages className="h-4 w-4" />
                            <span>{translationLanguage ? translationLanguage : 'Translate'}</span>
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          {translateDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-10" aria-hidden onClick={() => setTranslateDropdownOpen(false)} />
                              <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                <button
                                  type="button"
                                  onClick={() => handleTranslateLanguage('Original')}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Original
                                </button>
                                {TRANSCRIPT_TRANSLATION_LANGUAGES.map((lang) => (
                                  <button
                                    key={lang}
                                    type="button"
                                    onClick={() => handleTranslateLanguage(lang)}
                                    disabled={translating}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                  >
                                    {lang}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          onClick={handleCopyToClipboard}
                          className="flex items-center space-x-2 text-violet-600 hover:text-violet-700 font-medium text-sm"
                        >
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>
                    {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                      <div className="mb-3 p-2 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                        <p className="text-xs font-medium text-gray-500 mb-1">Jump to match</p>
                        {searchResults.slice(0, 8).map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => scrollToSegment(r.index)}
                            className="block w-full text-left px-2 py-1.5 rounded text-sm text-gray-700 hover:bg-violet-50"
                          >
                            {r.startTime != null ? `${formatTimestamp(r.startTime)} — ` : ''}{r.snippet}
                          </button>
                        ))}
                        {searchResults.length > 8 && <p className="text-xs text-gray-400 mt-1">+{searchResults.length - 8} more</p>}
                      </div>
                    )}
                    <div ref={transcriptScrollRef} className="bg-gray-50/80 rounded-xl p-4 min-h-48 max-h-[60vh] sm:max-h-[65vh] lg:max-h-[70vh] overflow-y-auto">
                      {translating ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                          <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-2" />
                          <p className="text-sm">Translating transcript…</p>
                        </div>
                      ) : transcriptEditMode && editableSegments && editableSegments.length > 0 ? (
                        <div className="space-y-2">
                          {editableSegments.map((seg, i) => (
                            <div
                              key={i}
                              ref={(el) => {
                                if (el) segmentRefsRef.current.set(i, el)
                              }}
                              className="flex gap-2 items-start"
                            >
                              <span className="text-xs text-gray-400 shrink-0 pt-2 w-12">{formatTimestamp(seg.start)}</span>
                              <textarea
                                value={seg.text}
                                onChange={(e) => {
                                  const next = [...editableSegments]
                                  next[i] = { ...next[i], text: e.target.value }
                                  setEditableSegments(next)
                                }}
                                rows={2}
                                className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 resize-y"
                              />
                            </div>
                          ))}
                        </div>
                      ) : displayTranscript ? (
                        displayParagraphs.map((p, i) => (
                          <div
                            key={i}
                            ref={(el) => {
                              if (el) segmentRefsRef.current.set(i, el)
                            }}
                            className="text-sm text-gray-700 mb-3 last:mb-0"
                          >
                            {p}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcriptPreview}...</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeBranch === 'speakers' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-600" />
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
                          ? 'Labels (Speaker 1, 2, …) come from automatic speaker detection. They are not real names—each label is one distinct voice in the video.'
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
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-violet-600" />
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
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-violet-600" />
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
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
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
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Hash className="h-5 w-5 text-violet-600" />
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
              <div className="bg-white rounded-2xl p-6 shadow-sm">
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
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-violet-600" />
                  Exports
                </h3>
                <p className="text-sm text-gray-500 mb-4">Download transcript and derived data in your preferred format.</p>
                {!fullTranscript ? (
                  <div className="rounded-xl bg-gray-50/80 p-4">
                    <p className="text-gray-600 text-sm font-medium mb-1">Exports</p>
                    <p className="text-gray-500 text-sm">Structured exports (JSON, CSV, Markdown, Notion) appear here once transcript data is available.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-4">
                      {isPaidPlan
                        ? 'Full download available.'
                        : `Free plan: download any 2 exports with watermark (${freeExportsUsed}/2 used). Upgrade for unlimited downloads.`}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(['json', 'csv', 'markdown', 'notion'] as const).map((format) => {
                        const buildExport = () => {
                          const schema = getSummarySchema()
                          const speakers = getSpeakersData()
                          const chapters = getChaptersData()
                          const highlights = getHighlightsData()
                          const keywords = getKeywordsData()
                          if (format === 'json') {
                            return JSON.stringify({ summary: schema, speakers, chapters, highlights, keywords, rawPreview: fullTranscript.slice(0, 500) }, null, 2)
                          }
                          if (format === 'csv') {
                            const rows = [['type', 'content'], ['raw_preview', fullTranscript.slice(0, 300).replace(/"/g, '""')]]
                            speakers.forEach((s) => rows.push(['speaker', `"${s.speaker}","${s.text.replace(/"/g, '""')}"`]))
                            return rows.map((r) => r.join(',')).join('\n')
                          }
                          if (format === 'markdown') {
                            return `# Transcript\n\n${schema.key_points.map((k) => `- ${k}`).join('\n')}\n\n## Speakers\n\n${speakers.map((s) => `**${s.speaker}**\n${s.text}`).join('\n\n')}\n\n## Raw preview\n\n${fullTranscript.slice(0, 500)}...`
                          }
                          if (format === 'notion') {
                            return JSON.stringify(speakers.map((s) => ({ type: 'paragraph', rich_text: [{ text: { content: `[${s.speaker}] ${s.text}` } }] })), null, 2)
                          }
                          return ''
                        }
                        const content = buildExport()
                        const preview = content.slice(0, 400) + (content.length > 400 ? '…' : '')
                        const FREE_EXPORT_WATERMARK = '\n\n---\nExported from VideoText (Free) - videotext.io\n'
                        const freeCanDownload = !isPaidPlan && freeExportsUsed < 2
                        const freeUsedAll = !isPaidPlan && freeExportsUsed >= 2
                        const handleDownload = () => {
                          if (isPaidPlan) {
                            const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' })
                            const a = document.createElement('a')
                            a.href = URL.createObjectURL(blob)
                            a.download = `transcript-export.${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md'}`
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
                          const blob = new Blob([watermarkedContent], { type: format === 'json' ? 'application/json' : 'text/plain' })
                          const a = document.createElement('a')
                          a.href = URL.createObjectURL(blob)
                          a.download = `transcript-export.${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md'}`
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
                        return (
                          <div key={format} className="rounded-xl bg-gray-50/80 p-4">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-sm font-medium capitalize text-gray-800">{format}</span>
                              <button
                                onClick={handleDownload}
                                disabled={!canClick}
                                className={`flex items-center gap-1.5 text-sm font-medium ${canClick ? 'text-violet-600 hover:text-violet-700' : 'text-gray-400 cursor-not-allowed'}`}
                              >
                                <Download className="h-4 w-4 shrink-0" />
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

            {(segmentsForExport?.length ?? 0) > 0 && (
              <div className="surface-card p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <Subtitles className="h-5 w-5 text-violet-600" />
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
                    <FileDown className="h-4 w-4" />
                    Download SRT
                  </button>
                  <button
                    type="button"
                    onClick={handleExportVtt}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors"
                  >
                    <FileDown className="h-4 w-4" />
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

        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          usedMinutes={usedMinutes ?? 0}
          availableMinutes={availableMinutes ?? 0}
        />

        {faq.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-100/70" aria-label="FAQ">
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
          </div>
        </div>
      </div>
    </div>
  )
}
