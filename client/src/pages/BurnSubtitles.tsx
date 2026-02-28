import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Film } from 'lucide-react'
import { useWorkflow } from '../contexts/WorkflowContext'
import FailedState from '../components/FailedState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { ResultSkeleton } from '../components/figma/ResultSkeleton'
import { TranslateResult } from '../components/figma/TranslateResult'
import { Select } from '../components/figma/FormControls'
import { getFilePreview, formatDuration, type FilePreviewData } from '../lib/filePreview'
import { incrementUsage } from '../lib/usage'
import { uploadDualFilesWithProgress, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError } from '../lib/api'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, clearPersistedJobId } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import toast from 'react-hot-toast'
import { Minimize2, FileText, MessageSquare } from 'lucide-react'
import { dispatchJobCompletedForFeedback } from '../components/FeedbackPrompt'
import { emitToolCompleted } from '../workflow/workflowStore'

/** Optional SEO overrides for alternate entry points. Do NOT duplicate logic. */
export type BurnSubtitlesSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function BurnSubtitles(props: BurnSubtitlesSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()
  const workflow = useWorkflow()
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null)
  const [videoFromWorkflow, setVideoFromWorkflow] = useState(false)
  const [srtFromWorkflow, setSrtFromWorkflow] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')

  useEffect(() => {
    const state = location.state as { useWorkflowVideo?: boolean; useWorkflowSrt?: boolean } | undefined
    if (state?.useWorkflowVideo && workflow.videoFile) {
      setVideoFile(workflow.videoFile)
      setVideoFromWorkflow(true)
    }
    if (state?.useWorkflowSrt && workflow.srtContent) {
      const blob = new Blob([workflow.srtContent], { type: 'text/plain;charset=utf-8' })
      setSubtitleFile(new File([blob], 'subtitles.srt', { type: 'text/plain' }))
      setSrtFromWorkflow(true)
    }
  }, [location.state, workflow.videoFile, workflow.srtContent])

  // Keep workflow in sync when result is shown so "Next step" links pre-fill video on the next tool
  useEffect(() => {
    if (status === 'completed' && videoFile) workflow.setVideo(videoFile)
  }, [status, videoFile])

  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [position, setPosition] = useState<'bottom' | 'middle'>('bottom')
  const [backgroundOpacity, setBackgroundOpacity] = useState<'none' | 'low' | 'high'>('low')
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('processing')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progress, setProgress] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [usedMinutes, setUsedMinutes] = useState<number | null>(null)
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()

  useEffect(() => {
    if (result?.downloadUrl) setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  useEffect(() => {
    if (!videoFile) {
      setFilePreview(null)
      return
    }
    let cancelled = false
    getFilePreview(videoFile).then((p) => {
      if (!cancelled) setFilePreview(p)
    })
    return () => { cancelled = true }
  }, [videoFile])

  useEffect(() => {
    if (videoFile && videoFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(videoFile)
      setVideoPreviewUrl(url)
      return () => {
        setVideoPreviewUrl(null)
        const u = url
        setTimeout(() => URL.revokeObjectURL(u), 0)
      }
    }
    setVideoPreviewUrl(null)
  }, [videoFile])

  const handleVideoSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.BURN_SUBTITLES,
        file_size_bytes: file.size,
        file_role: 'video',
      })
    } catch {
      // non-blocking
    }
    workflow.setVideo(file)
    setVideoFile(file)
    setVideoFromWorkflow(false)
    setTrimStart(null)
    setTrimEnd(null)
  }

  const handleSubtitleSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.BURN_SUBTITLES,
        file_size_bytes: file.size,
        file_role: 'subtitle',
      })
    } catch {
      // non-blocking
    }
    setSubtitleFile(file)
  }

  const handleProcess = async (trimStartPercent?: number, trimEndPercent?: number) => {
    if (!videoFile || !subtitleFile) {
      toast.error('Please upload both video and subtitle files')
      return
    }

    const durationSeconds = filePreview?.durationSeconds ?? 0
    const trimStartSec = trimStartPercent != null ? (durationSeconds * trimStartPercent) / 100 : trimStart
    const trimEndSec = trimEndPercent != null ? (durationSeconds * trimEndPercent) / 100 : trimEnd

    try {
      const usageData = await getCurrentUsage()
      const isImports = usageData.quotaType === 'imports'
      const totalAvailable = isImports ? (usageData.limit ?? 3) : (usageData.limits.minutesPerMonth + usageData.overages.minutes)
      const used = isImports ? (usageData.used ?? usageData.usage?.importCount ?? 0) : usageData.usage.totalMinutes
      setAvailableMinutes(totalAvailable)
      setUsedMinutes(used)
      const atOrOverLimit = isImports ? used >= (usageData.limit ?? 3) : (totalAvailable > 0 && used >= totalAvailable)
      if (atOrOverLimit) {
        setShowPaywall(true)
        return
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    try {
      setStatus('processing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      const startedAt = Date.now()
      processingStartedAtRef.current = startedAt
      texJobStarted()

      const response = await uploadDualFilesWithProgress(videoFile, subtitleFile, BACKEND_TOOL_TYPES.BURN_SUBTITLES, {
        trimmedStart: (trimStartSec ?? trimStart) ?? undefined,
        trimmedEnd: (trimEndSec ?? trimEnd) ?? undefined,
        burnFontSize: fontSize,
        burnPosition: position,
        burnBackgroundOpacity: backgroundOpacity,
      }, { onProgress: (p) => setUploadProgress(p) })
      setUploadPhase('processing')
      setUploadProgress(100)

      persistJobId(location.pathname, response.jobId, response.jobToken)
      const pollIntervalRef = { current: 0 as number }
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId, response.jobToken ? { jobToken: response.jobToken } : undefined)
          setProgress(jobStatus.progress ?? 0)
          if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

          const transition = getJobLifecycleTransition(jobStatus)
          if (transition === 'completed') {
            clearInterval(pollIntervalRef.current)
            const started = processingStartedAtRef.current ?? Date.now()
            const processingMs = Date.now() - started
            setLastProcessingMs(processingMs)
            setStatus('completed')
            setResult(jobStatus.result ?? null)
            dispatchJobCompletedForFeedback()
            emitToolCompleted({ toolId: 'burn-subtitles', pathname: '/burn-subtitles', processingMs })
            incrementUsage('burn-subtitles')
            texJobCompleted(processingMs, 'burn-subtitles')
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            texJobFailed()
            toast.error('Processing failed. Please try again.')
          }
        } catch (error: any) {
          // Network/parse errors: do not set failed; keep polling.
        }
      }
      pollIntervalRef.current = window.setInterval(doPoll, JOB_POLL_INTERVAL_MS)
      doPoll()
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        clearPersistedJobId(location.pathname, navigate)
        setStatus('idle')
      } else {
        setStatus('failed')
        texJobFailed()
      }
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setVideoFile(null)
    setSubtitleFile(null)
    setTrimStart(null)
    setTrimEnd(null)
    setStatus('idle')
    setUploadPhase('processing')
    setUploadProgress(0)
    setProgress(0)
    setResult(null)
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  const breadcrumbs = [{ label: 'Burn Subtitles', href: '/burn-subtitles' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Burn Subtitles',
    subtitle: seoIntro ?? 'Hardcode captions directly into your video',
    icon: <Film className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
    tags: ['Hardcode', 'Burn-in', 'Permanent', 'Styling', 'Position'],
    sidebar: null,
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        {status === 'idle' && !videoFile && (
          <UploadZone
            immediateSelect
            onFileSelect={handleVideoSelect}
            initialFiles={videoFile ? [videoFile] : null}
            onRemove={() => {
              if (videoFromWorkflow) workflow.clearVideo()
              setVideoFile(null)
              setVideoFromWorkflow(false)
            }}
            fromWorkflowLabel={videoFromWorkflow ? 'From previous step' : undefined}
            acceptedFormats={['MP4', 'MOV', 'AVI', 'WEBM']}
            maxSize="10 GB"
          />
        )}

        {status === 'idle' && videoFile && !subtitleFile && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Video</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{videoFile.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (videoFromWorkflow) workflow.clearVideo()
                    setVideoFile(null)
                    setVideoFromWorkflow(false)
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload subtitles (SRT/VTT)</p>
              <UploadZone
                immediateSelect
                onFileSelect={handleSubtitleSelect}
                initialFiles={subtitleFile ? [subtitleFile] : null}
                onRemove={() => {
                  if (srtFromWorkflow) workflow.clearSrt()
                  setSubtitleFile(null)
                  setSrtFromWorkflow(false)
                }}
                fromWorkflowLabel={srtFromWorkflow ? 'From previous step' : undefined}
                acceptedFormats={['SRT', 'VTT']}
                acceptAttribute=".srt,.vtt"
                maxSize="10 MB"
              />
            </div>
          </div>
        )}

        {status === 'idle' && videoFile && subtitleFile && (
          <ProcessingInterface
            file={{
              name: videoFile.name,
              size: `${(videoFile.size / (1024 * 1024)).toFixed(2)} MB`,
              duration: filePreview?.durationSeconds != null ? formatDuration(filePreview.durationSeconds) : undefined,
            }}
            onRemove={() => {
              if (videoFromWorkflow) workflow.clearVideo()
              setVideoFile(null)
              setVideoFromWorkflow(false)
            }}
            actionLabel="Process Video"
            onAction={(trimStartPercent, trimEndPercent) => handleProcess(trimStartPercent, trimEndPercent)}
            actionLoading={false}
            showVideoPlayer={!!(videoPreviewUrl || filePreview?.durationSeconds)}
            videoSrc={videoPreviewUrl ?? undefined}
            durationSeconds={filePreview?.durationSeconds}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">Subtitle: {subtitleFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (srtFromWorkflow) workflow.clearSrt()
                    setSubtitleFile(null)
                    setSrtFromWorkflow(false)
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Remove
                </button>
              </div>
              <Select
                label="Font size"
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
                value={fontSize}
                onChange={(v) => setFontSize(v as 'small' | 'medium' | 'large')}
              />
              <Select
                label="Position"
                options={[
                  { value: 'bottom', label: 'Bottom' },
                  { value: 'middle', label: 'Middle' },
                ]}
                value={position}
                onChange={(v) => setPosition(v as 'bottom' | 'middle')}
              />
              <Select
                label="Background"
                options={[
                  { value: 'none', label: 'None' },
                  { value: 'low', label: 'Low' },
                  { value: 'high', label: 'High' },
                ]}
                value={backgroundOpacity}
                onChange={(v) => setBackgroundOpacity(v as 'none' | 'low' | 'high')}
              />
            </div>
          </ProcessingInterface>
        )}

        {status === 'processing' && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-8">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {videoFile?.name} • {subtitleFile?.name}
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Burning', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={uploadPhase === 'uploading' ? 'Uploading...' : 'Burning subtitles into video...'}
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={uploadPhase === 'uploading' ? undefined : '3–5 min for a 10-min video'}
              statusSubtext={uploadPhase === 'processing' && queuePosition !== undefined && queuePosition > 0 ? `Queue position: ${queuePosition}` : undefined}
              onCancel={handleProcessAnother}
            />
            <ResultSkeleton variant="burn" />
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-6">
            <TranslateResult
              title="Video with burned subtitles ready!"
              fileName={result.fileName ?? 'video-with-subtitles.mp4'}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              downloadLabel={plan === 'free' ? (freeExportsUsed >= 2 ? '2/2 free downloads used' : 'Download (2 free)') : 'Download Video'}
              onDownload={
                plan === 'free'
                  ? async () => {
                      if (freeExportsUsed >= 2) {
                        toast('You\'ve used your 2 free downloads. Upgrade for more.')
                        return
                      }
                      try {
                        const res = await fetch(getDownloadUrl())
                        const blob = await res.blob()
                        const a = document.createElement('a')
                        a.href = URL.createObjectURL(blob)
                        a.download = result?.fileName || 'video-with-subtitles.mp4'
                        a.click()
                        URL.revokeObjectURL(a.href)
                        setFreeExportsUsed((prev) => prev + 1)
                        toast.success('Download started')
                      } catch {
                        toast.error('Download failed')
                      }
                    }
                  : () => {
                      const a = document.createElement('a')
                      a.href = getDownloadUrl()
                      a.download = result?.fileName || 'video-with-subtitles.mp4'
                      a.click()
                    }
              }
              onProcessAnother={handleProcessAnother}
              relatedTools={[
                { path: '/compress-video', name: 'Compress Video', description: 'Reduce file size' },
                { path: '/video-to-transcript', name: 'Video → Transcript', description: 'Get transcript' },
                { path: '/video-to-subtitles', name: 'Video → Subtitles', description: 'Generate SRT/VTT' },
              ]}
            />

            <CrossToolSuggestions
              workflowHint="Your last file is pre-filled on the next tool."
              suggestions={[
                { icon: Minimize2, title: 'Compress Video', path: '/compress-video', description: 'Reduce file size', state: { useWorkflowVideo: true } },
                { icon: FileText, title: 'Video → Transcript', path: '/video-to-transcript', description: 'Get transcript', state: { useWorkflowVideo: true } },
                { icon: MessageSquare, title: 'Video → Subtitles', path: '/video-to-subtitles', description: 'Generate SRT/VTT', state: { useWorkflowVideo: true } },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
          <FailedState onTryAgain={handleProcessAnother} />
        )}
      </ToolLayout>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        usedMinutes={usedMinutes ?? 0}
        availableMinutes={availableMinutes ?? 0}
        onUpgrade={() => {
          window.location.href = '/pricing'
        }}
      />

      {faq.length > 0 && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 max-w-4xl mx-auto px-4" aria-label="FAQ">
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
