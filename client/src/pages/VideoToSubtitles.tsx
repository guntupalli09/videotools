import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, Loader2 } from 'lucide-react'
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
import LanguageSelector from '../components/LanguageSelector'
import type { SubtitleRow } from '../components/SubtitleEditor'
const SubtitleEditor = lazy(() => import('../components/SubtitleEditor'))
import { incrementUsage } from '../lib/usage'
import { uploadFile, uploadFileWithProgress, getJobStatus, getCurrentUsage, getConnectionProbeIfNeeded, BACKEND_TOOL_TYPES, SessionExpiredError, getUserFacingMessage, isNetworkError, translateTranscript, TRANSCRIPT_TRANSLATION_LANGUAGES } from '../lib/api'
import { getFailureMessage } from '../lib/failureMessage'
import { checkVideoPreflight } from '../lib/uploadPreflight'
import { getFilePreview, type FilePreviewData } from '../lib/filePreview'
import { extractAudioInBrowser, isAudioExtractionSupported } from '../lib/audioExtraction'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { FREE_EXPORT_WATERMARK } from '../lib/watermark'
import { persistJobId, getPersistedJobId, getPersistedJobToken, clearPersistedJobId } from '../lib/jobSession'
import { createCheckoutSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import toast from 'react-hot-toast'
import { Languages, Film, Wrench, FileDown, Copy, ChevronDown, Minimize2 } from 'lucide-react'
import { useWorkflow } from '../contexts/WorkflowContext'

/** Optional SEO overrides for alternate entry points (e.g. /mp4-to-srt, /subtitle-generator). Do NOT duplicate logic. */
export type VideoToSubtitlesSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function VideoToSubtitles(props: VideoToSubtitlesSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [format, setFormat] = useState<'srt' | 'vtt'>('srt')
  const [language, setLanguage] = useState<string>('')
  const [additionalLanguages, setAdditionalLanguages] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<'preparing' | 'uploading' | 'processing'>('preparing')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string; warnings?: { type: string; message: string; line?: number }[] } | null>(null)
  const [subtitlePreview, setSubtitlePreview] = useState('')
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([])
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
  const [convertTargetFormat, setConvertTargetFormat] = useState<'srt' | 'vtt' | 'txt'>('srt')
  const [convertProgress, setConvertProgress] = useState(false)
  const [convertPreview, setConvertPreview] = useState<string | null>(null)
  const [convertDownloadUrl, setConvertDownloadUrl] = useState<string | null>(null)
  const [translationLanguage, setTranslationLanguage] = useState<string | null>(null)
  const [translatedCache, setTranslatedCache] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState(false)
  const [translateDropdownOpen, setTranslateDropdownOpen] = useState(false)
  const rehydratePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeUploadPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobStartedTrackedRef = useRef<string | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  /** Set on job_completed for "Processed in XX.Xs" badge (UI only). */
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  /** Set on job_completed for workflow chain suggestion (UI only). */
  const [lastJobCompletedToolId, setLastJobCompletedToolId] = useState<string | null>(null)
  const [failedMessage, setFailedMessage] = useState<string | undefined>(undefined)

  useEffect(() => {
    setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const canEdit = plan !== 'free'
  const canMultiLanguage = plan === 'basic' || plan === 'pro' || plan === 'agency'
  const maxAdditionalLanguages = plan === 'agency' ? 9 : plan === 'pro' ? 4 : plan === 'basic' ? 1 : 0

  // Plain text from subtitles for translation and copy
  const subtitleTextForTranslation = subtitleRows.length > 0 ? subtitleRows.map((r) => r.text).join('\n\n') : ''
  const displaySubtitleText =
    translationLanguage && translatedCache[translationLanguage] != null
      ? translatedCache[translationLanguage]
      : subtitleTextForTranslation

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

  // Reset translation when result changes (new job)
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
          if (jobStatus.result?.downloadUrl) {
            try {
              const subtitleResponse = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl))
              const ct = subtitleResponse.headers.get('content-type') || ''
              const isZip =
                jobStatus.result.fileName?.toLowerCase().endsWith('.zip') || ct.includes('application/zip')
              if (!isZip) {
                const subtitleText = await subtitleResponse.text()
                const lines = subtitleText.split('\n\n').slice(0, 10)
                setSubtitlePreview(lines.join('\n\n'))
                setSubtitleRows(parseSubtitlesToRows(subtitleText))
              } else {
                setSubtitlePreview('')
                setSubtitleRows([])
              }
            } catch {
              // ignore
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
                  const ct = res.headers.get('content-type') || ''
                  const isZip = s.result.fileName?.toLowerCase().endsWith('.zip') || ct.includes('application/zip')
                  if (!isZip) {
                    const text = await res.text()
                    const lines = text.split('\n\n').slice(0, 10)
                    setSubtitlePreview(lines.join('\n\n'))
                    setSubtitleRows(parseSubtitlesToRows(text))
                  }
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
              setIsRehydrating(false)
              setStatus('idle')
              setCurrentJobId(null)
              setUploadPhase('preparing')
              setUploadProgress(0)
              setProgress(0)
              setResult(null)
              toast.error(err.message)
            }
          }
        }
        rehydratePollRef.current = setInterval(doPoll, JOB_POLL_INTERVAL_MS)
        doPoll()
      } catch (err) {
        if (cancelled) return
        setIsRehydrating(false)
        if (err instanceof SessionExpiredError) {
          clearPersistedJobId(pathname, navigate)
          setStatus('idle')
          setCurrentJobId(null)
          setUploadPhase('preparing')
          setUploadProgress(0)
          setProgress(0)
          setResult(null)
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
        tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
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
    setAdditionalLanguages([])
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

  const parseSubtitlesToRows = (text: string): SubtitleRow[] => {
    const blocks = text
      .replace(/\r/g, '')
      .trim()
      .split('\n\n')
      .filter(Boolean)

    const rows: SubtitleRow[] = []
    for (const block of blocks) {
      const lines = block.split('\n').filter((l) => l.trim().length > 0)
      const timeLineIdx = lines.findIndex((l) => l.includes('-->'))
      if (timeLineIdx === -1) continue

      const timeLine = lines[timeLineIdx]
      const [start, end] = timeLine.split('-->').map((s) => s.trim())
      const textLines = lines.slice(timeLineIdx + 1)
      rows.push({
        index: rows.length + 1,
        startTime: start,
        endTime: end,
        text: textLines.join('\n'),
      })
    }
    return rows
  }

  const rowsToSrt = (rows: SubtitleRow[]): string => {
    return rows
      .map((r, idx) => {
        const index = idx + 1
        return `${index}\n${r.startTime} --> ${r.endTime}\n${r.text}`
      })
      .join('\n\n')
  }

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

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
        trackEvent('paywall_shown', { tool: 'video-to-subtitles' })
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
        trackEvent('paywall_shown', { tool: 'video-to-subtitles', reason: 'preflight' })
        return
      }
    } catch {
      uploadAbortRef.current = null
      setStatus('idle')
      toast.error('Could not validate video. Try again.')
      return
    }

    try {
      const baseOptions = {
        toolType: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
        format,
        language: language || undefined,
        trimmedStart: trimStart ?? undefined,
        trimmedEnd: trimEnd ?? undefined,
        additionalLanguages: canMultiLanguage ? additionalLanguages : undefined,
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
      trackEvent('processing_started', { tool: 'video-to-subtitles' })

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

      const jobToken = response.jobToken
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId, jobToken ? { jobToken } : undefined)
          setProgress(jobStatus.progress ?? 0)
          if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

          if (jobStatus.status === 'processing' && jobStartedTrackedRef.current !== response.jobId) {
            jobStartedTrackedRef.current = response.jobId
            try {
              trackEvent('job_started', { job_id: response.jobId, tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES })
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
            if (jobStatus.result?.downloadUrl) {
              try {
                const subtitleResponse = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl))
                const ct = subtitleResponse.headers.get('content-type') || ''
                const isZip =
                  jobStatus.result.fileName?.toLowerCase().endsWith('.zip') ||
                  ct.includes('application/zip')
                if (!isZip) {
                  const subtitleText = await subtitleResponse.text()
                  const lines = subtitleText.split('\n\n').slice(0, 10)
                  setSubtitlePreview(lines.join('\n\n'))
                  setSubtitleRows(parseSubtitlesToRows(subtitleText))
                } else {
                  setSubtitlePreview('')
                  setSubtitleRows([])
                }
              } catch (e) {
                // Ignore preview fetch errors
              }
            }
            incrementUsage('video-to-subtitles')
            const started = processingStartedAtRef.current ?? Date.now()
            const processingMs = Date.now() - started
            try {
              trackEvent('job_completed', {
                job_id: response.jobId,
                tool_type: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
                processing_time_ms: processingMs,
              })
              trackEvent('processing_completed', { tool: 'video-to-subtitles' })
              texJobCompleted(processingMs, 'video-to-subtitles')
              setLastProcessingMs(processingMs)
              setLastJobCompletedToolId('video-to-subtitles')
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

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setFilePreview(null)
    setCurrentJobId(null)
    uploadAbortRef.current = null
    setTrimStart(null)
    setTrimEnd(null)
    setAdditionalLanguages([])
    setStatus('idle')
    setProgress(0)
    setUploadPhase('preparing')
    setUploadProgress(0)
    setResult(null)
    setSubtitlePreview('')
    setSubtitleRows([])
    setTranslationLanguage(null)
    setTranslatedCache({})
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  const currentResultFormat = result?.fileName?.toLowerCase().endsWith('.vtt') ? 'vtt' : result?.fileName?.toLowerCase().endsWith('.txt') ? 'txt' : 'srt'

  const handleConvertFormat = async () => {
    if (!result?.downloadUrl || !result?.fileName) return
    if (convertTargetFormat === currentResultFormat) {
      window.open(getDownloadUrl(), '_blank')
      return
    }
    try {
      setConvertProgress(true)
      setConvertPreview(null)
      const res = await fetch(getDownloadUrl())
      const blob = await res.blob()
      const file = new File([blob], result.fileName || 'subtitles.srt', { type: blob.type || 'text/plain' })
      const uploadRes = await uploadFile(file, {
        toolType: BACKEND_TOOL_TYPES.CONVERT_SUBTITLES,
        targetFormat: convertTargetFormat,
      })
      const pollIntervalRef = { current: 0 as number }
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(uploadRes.jobId, uploadRes.jobToken ? { jobToken: uploadRes.jobToken } : undefined)
          if (getJobLifecycleTransition(jobStatus) === 'completed' && jobStatus.result?.downloadUrl) {
            clearInterval(pollIntervalRef.current)
            const convertedUrl = getAbsoluteDownloadUrl(jobStatus.result.downloadUrl)
            if (plan === 'free') {
              const prevRes = await fetch(convertedUrl)
              const text = await prevRes.text()
              const lines = text.split(/\n\n|\n/).slice(0, 30)
              setConvertPreview(lines.join('\n'))
              setConvertDownloadUrl(convertedUrl)
            } else {
              window.open(convertedUrl, '_blank')
            }
          } else if (getJobLifecycleTransition(jobStatus) === 'failed') {
            clearInterval(pollIntervalRef.current)
            toast.error('Conversion failed.')
          }
        } catch {
          // keep polling
        }
      }
      pollIntervalRef.current = window.setInterval(doPoll, JOB_POLL_INTERVAL_MS)
      doPoll()
    } catch (e: any) {
      toast.error(e.message || 'Conversion failed')
    } finally {
      setConvertProgress(false)
    }
  }

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
    if (!subtitleTextForTranslation.trim()) {
      toast.error('No subtitles to translate')
      return
    }
    setTranslating(true)
    setTranslateDropdownOpen(false)
    try {
      const { translatedText } = await translateTranscript(subtitleTextForTranslation, language)
      setTranslatedCache((prev) => ({ ...prev, [language]: translatedText }))
      setTranslationLanguage(language)
      toast.success(`Translated to ${language}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Translation failed')
    } finally {
      setTranslating(false)
    }
  }

  const handleCopySubtitlesToClipboard = async () => {
    const textToCopy = displaySubtitleText.trim()
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      toast.success('Copied to clipboard!')
    } catch {
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

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="mb-4">
            <PlanBadge />
          </div>
          <div className="bg-violet-100/80 rounded-2xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <MessageSquare className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{seoH1 ?? 'Video → Subtitles'}</h1>
          <p className="text-lg text-gray-600 mb-6">
            {seoIntro ?? 'Generate SRT and VTT subtitle files instantly'}
          </p>
          <UsageCounter refreshTrigger={status} />
          <UsageDisplay refreshTrigger={status} />
        </div>

        {status === 'idle' && (
          <div className="surface-card p-8 mb-8">
            {/* Format Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Subtitle Format</label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="srt"
                    checked={format === 'srt'}
                    onChange={(e) => setFormat(e.target.value as 'srt' | 'vtt')}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-700">SRT (recommended for YouTube)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="vtt"
                    checked={format === 'vtt'}
                    onChange={(e) => setFormat(e.target.value as 'srt' | 'vtt')}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-700">VTT (recommended for web)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Not sure? Use SRT for most platforms</p>
            </div>

            {/* Language Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language (optional)
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="">Auto-detect</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ar">Arabic</option>
                <option value="hi">Hindi</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

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
                <VideoTrimmer
                  file={selectedFile}
                  onChange={(startSeconds: number, endSeconds: number) => {
                    setTrimStart(startSeconds)
                    setTrimEnd(endSeconds)
                  }}
                />
              )}

              {selectedFile && canMultiLanguage && (
                <LanguageSelector
                  primaryLanguage={language || 'en'}
                  selected={additionalLanguages}
                  onChange={setAdditionalLanguages}
                  maxAdditional={maxAdditionalLanguages}
                />
              )}
              {selectedFile && (
                <button
                  onClick={handleProcess}
                  className="mt-6 w-full btn-primary"
                >
                  Generate Subtitles
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
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-base sm:text-lg font-medium text-gray-800 mb-4 break-words">
              {isRehydrating && 'Resuming…'}
              {!isRehydrating && uploadPhase === 'preparing' && 'Preparing audio…'}
              {!isRehydrating && uploadPhase === 'uploading' && `Uploading (${uploadProgress}%)`}
              {!isRehydrating && uploadPhase === 'processing' && 'Generating subtitles…'}
            </p>
            <ProgressBar
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              status={
                uploadPhase === 'uploading'
                  ? ''
                  : queuePosition !== undefined
                    ? `Processing… ${queuePosition} jobs ahead of you.`
                    : 'Processing video and extracting speech'
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
              downloadUrl={plan === 'free' ? undefined : getDownloadUrl()}
              onProcessAnother={handleProcessAnother}
              toolType={BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES}
              jobId={currentJobId ?? undefined}
              processedInSeconds={lastProcessingMs != null ? lastProcessingMs / 1000 : undefined}
              onDownloadClick={
                plan === 'free'
                  ? async () => {
                      if (freeExportsUsed >= 2) {
                        toast('You\'ve used your 2 free downloads. Upgrade for more.')
                        return
                      }
                      try {
                        const res = await fetch(getDownloadUrl())
                        const text = await res.text()
                        const watermarked = text + FREE_EXPORT_WATERMARK
                        const blob = new Blob([watermarked], { type: res.headers.get('content-type') || 'text/plain' })
                        const a = document.createElement('a')
                        a.href = URL.createObjectURL(blob)
                        a.download = result?.fileName || 'subtitles.srt'
                        a.click()
                        URL.revokeObjectURL(a.href)
                        setFreeExportsUsed((prev) => prev + 1)
                        toast.success('Download started (with watermark)')
                      } catch {
                        toast.error('Download failed')
                      }
                    }
                  : undefined
              }
              downloadLabel={plan === 'free' ? (freeExportsUsed >= 2 ? '2/2 used' : 'Download with watermark') : undefined}
            />
            <div className="mt-2 min-h-[2.75rem]">
            <WorkflowChainSuggestion
              pathname={location.pathname}
              plan={plan}
              lastJobCompletedToolId={lastJobCompletedToolId}
            />
            </div>

            {subtitleRows.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <Suspense fallback={null}>
                  <SubtitleEditor
                    entries={subtitleRows}
                    editable={canEdit}
                    onChange={setSubtitleRows}
                  />
                </Suspense>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    disabled={!canEdit}
                    onClick={() => {
                      const content = rowsToSrt(subtitleRows)
                      const blob = new Blob([content], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = (result.fileName || 'subtitles.srt').replace(/\.vtt$/i, '.srt')
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Download Edited Subtitles
                  </button>
                  {!canEdit && (
                    <div className="text-xs text-gray-500">
                      Upgrade to Basic to edit subtitles (timestamps stay locked).
                    </div>
                  )}
                </div>
              </div>
            )}

            {subtitleTextForTranslation && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Languages className="h-5 w-5 text-violet-600" />
                  View in another language
                </h3>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setTranslateDropdownOpen((o) => !o)}
                      disabled={translating || !subtitleTextForTranslation.trim()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Languages className="h-4 w-4" />
                      <span>{translationLanguage ?? 'Translate'}</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {translateDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" aria-hidden onClick={() => setTranslateDropdownOpen(false)} />
                        <div className="absolute left-0 top-full mt-1 py-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
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
                    type="button"
                    onClick={handleCopySubtitlesToClipboard}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-violet-600 hover:bg-violet-50"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                {translating ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-600 mb-2" />
                    <p className="text-sm">Translating subtitles…</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{displaySubtitleText || '—'}</p>
                  </div>
                )}
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-amber-50/80 rounded-2xl p-6 shadow-sm border border-amber-100">
                <h3 className="text-lg font-semibold text-amber-800 mb-2">Validation (informational)</h3>
                <p className="text-sm text-amber-900 mb-2">Some lines may need attention. Not blocking.</p>
                <ul className="text-sm text-amber-900 space-y-1">
                  {result.warnings.slice(0, 8).map((w, i) => (
                    <li key={i}>{w.line != null ? `Line ${w.line}: ` : ''}{w.message}</li>
                  ))}
                  {result.warnings.length > 8 && <li>… and {result.warnings.length - 8} more</li>}
                </ul>
              </div>
            )}

            {subtitlePreview && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview (first 10 entries)</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{subtitlePreview}</pre>
                </div>
              </div>
            )}

            {/* Phase 1B — UTILITY 2B: Convert format. Derived from subtitle files; free: preview 30 lines, paid: full download. */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FileDown className="h-5 w-5 text-violet-600" />
                Convert format
              </h3>
              <p className="text-sm text-gray-600 mb-4">Download subtitles in another format (SRT, VTT, or plain text).</p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={convertTargetFormat}
                  onChange={(e) => setConvertTargetFormat(e.target.value as 'srt' | 'vtt' | 'txt')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                >
                  <option value="srt">SRT</option>
                  <option value="vtt">VTT</option>
                  <option value="txt">TXT (plain text)</option>
                </select>
                <button
                  onClick={handleConvertFormat}
                  disabled={convertProgress}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {convertProgress ? 'Converting…' : `Get as ${convertTargetFormat.toUpperCase()}`}
                </button>
              </div>
              {plan === 'free' && (
                <p className="text-xs text-gray-500 mt-2">
                  Free plan: preview below. You can download 1 format with watermark ({freeExportsUsed}/2 total downloads used).
                </p>
              )}
              {convertPreview !== null && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-700 mb-2">Preview (first 30 lines)</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{convertPreview}</pre>
                </div>
              )}
              {plan === 'free' && convertDownloadUrl && freeExportsUsed < 2 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!convertDownloadUrl || freeExportsUsed >= 2) return
                    try {
                      const res = await fetch(convertDownloadUrl)
                      const text = await res.text()
                      const watermarked = text + FREE_EXPORT_WATERMARK
                      const ext = convertTargetFormat === 'srt' ? 'srt' : convertTargetFormat === 'vtt' ? 'vtt' : 'txt'
                      const blob = new Blob([watermarked], { type: 'text/plain' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `subtitles.${ext}`
                      a.click()
                      URL.revokeObjectURL(a.href)
                      setFreeExportsUsed((prev) => prev + 1)
                      setConvertDownloadUrl(null)
                      toast.success('Download started (with watermark)')
                    } catch {
                      toast.error('Download failed')
                    }
                  }}
                  className="mt-3 text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  Download converted file with watermark
                </button>
              )}
            </div>

            <CrossToolSuggestions
              workflowHint="Your last file is pre-filled on the next tool."
              suggestions={[
                { icon: Languages, title: 'Translate Subtitles', path: '/translate-subtitles', description: 'Translate to another language' },
                { icon: Film, title: 'Burn Subtitles', path: '/burn-subtitles', description: 'Burn into video', state: { useWorkflowVideo: true } },
                { icon: Wrench, title: 'Fix Subtitles', path: '/fix-subtitles', description: 'Fix timing & format' },
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
          onBuyOverage={async () => {
            try {
              const { url } = await createCheckoutSession({
                mode: 'payment',
                returnToPath: window.location.pathname,
                frontendOrigin: window.location.origin,
              })
              trackEvent('payment_completed', { type: 'overage_checkout_started' })
              window.location.href = url
            } catch (err: any) {
              toast.error(err.message || 'Failed to start payment')
            }
          }}
          onUpgrade={() => {
            // Send the user to the pricing page where they can pick a plan
            window.location.href = '/pricing'
          }}
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
  )
}
