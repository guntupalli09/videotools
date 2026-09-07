import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Minimize2, Lock } from 'lucide-react'
import { isLoggedIn } from '../lib/auth'
// import { useWorkflow } from '../contexts/WorkflowContext'
import FailedState from '../components/FailedState'
import CoreToolSeoDepth from '../components/CoreToolSeoDepth'
import SamplesModule from '../components/SamplesModule'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
// import WorkflowChainSuggestion from '../components/WorkflowChainSuggestion'
import PaywallModal from '../components/PaywallModal'
import FreePlanNudge from '../components/FreePlanNudge'
import SecondJobUpgradeNudge from '../components/SecondJobUpgradeNudge'
import { isPaidPlan } from '../lib/plans'
import JobAuthGateModal from '../components/JobAuthGateModal'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { ResultSkeleton } from '../components/figma/ResultSkeleton'
import { TranslateResult } from '../components/figma/TranslateResult'
import { ExportsPanel, ExportSection } from '../components/figma/ExportsPanel'
import { ProcessingStateShell } from '../components/figma/ProcessingStateShell'
import ResultUpgradeCard from '../components/ResultUpgradeCard'
import ResultHeader from '../components/ResultHeader'
import { RadioGroup } from '../components/figma/FormControls'
import { getFilePreview, formatDuration, type FilePreviewData } from '../lib/filePreview'
import { incrementUsage } from '../lib/usage'
import { incrementJobCompletedCount } from '../lib/jobCount'
import { uploadFileWithProgress, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError, claimGuestJob, getAuthToken } from '../lib/api'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, clearPersistedJobId, getPersistedJobId, getPersistedJobToken } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
// import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import toast from 'react-hot-toast'
import { MessageSquare, Film, FileText } from 'lucide-react'
import { formatFileSize } from '../lib/utils'
import { trackAppEvent } from '../lib/feedbackEvents'
import { exportFileStem, joinExportFilename } from '../lib/exportFileNames'
// import { emitToolCompleted } from '../workflow/workflowStore'

type CompressionLevel = 'light' | 'medium' | 'heavy'
type CompressProfile = 'web' | 'mobile' | 'archive'

/** Optional SEO overrides for alternate entry points. Do NOT duplicate logic. */
export type CompressVideoSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function CompressVideo(props: CompressVideoSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()
  // const workflow = useWorkflow()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileFromWorkflow, setFileFromWorkflow] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')

  // useEffect(() => {
  //   const state = location.state as { useWorkflowVideo?: boolean } | undefined
  //   if (state?.useWorkflowVideo && workflow.videoFile) {
  //     setSelectedFile(workflow.videoFile)
  //     setFileFromWorkflow(true)
  //   }
  // }, [location.state, workflow.videoFile])

  // Keep workflow in sync when result is shown so "Next step" links pre-fill the file on the next tool
  // useEffect(() => {
  //   if (status === 'completed' && selectedFile) workflow.setVideo(selectedFile)
  // }, [status, selectedFile])

  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium')
  const [compressProfile, setCompressProfile] = useState<CompressProfile | ''>('')
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('processing')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progress, setProgress] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signup-combo' | 'login'>('signup-combo')
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<FilePreviewData | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const hasPaidPlan = isPaidPlan(plan)

  const fallbackCompressedName = useMemo(
    () => joinExportFilename(exportFileStem(selectedFile?.name, 'video'), 'video_compressed', '.mp4'),
    [selectedFile?.name]
  )

  useEffect(() => {
    if (result?.downloadUrl) setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  useEffect(() => {
    if (status === 'completed' && !isLoggedIn()) {
      const t = setTimeout(() => setShowAuthGate(true), 3000)
      return () => clearTimeout(t)
    }
  }, [status])

  useEffect(() => {
    if (!selectedFile) {
      setFilePreview(null)
      return
    }
    let cancelled = false
    getFilePreview(selectedFile).then((p) => {
      if (!cancelled) setFilePreview(p)
    })
    return () => { cancelled = true }
  }, [selectedFile])

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

  const handleFileSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.COMPRESS_VIDEO,
        file_size_bytes: file.size,
      })
    } catch {
      // non-blocking
    }
    // workflow.setVideo(file)
    setSelectedFile(file)
    setFileFromWorkflow(false)
    setTrimStart(null)
    setTrimEnd(null)
  }

  const getEstimatedSize = (): number => {
    if (!selectedFile) return 0
    const reductionMap: Record<CompressionLevel, number> = {
      light: 0.3, // 30% smaller
      medium: 0.5, // 50% smaller
      heavy: 0.7, // 70% smaller
    }
    return selectedFile.size * (1 - reductionMap[compressionLevel])
  }

  const handleProcess = async (trimStartPercent?: number, trimEndPercent?: number) => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    const durationSeconds = filePreview?.durationSeconds ?? 0
    const hasTrim = trimStartPercent != null && trimEndPercent != null && (trimStartPercent !== 0 || trimEndPercent !== 100)
    const trimStartSec = hasTrim ? (durationSeconds * trimStartPercent!) / 100 : trimStart
    const trimEndSec = hasTrim ? (durationSeconds * trimEndPercent!) / 100 : trimEnd

    try {
      const usageData = await getCurrentUsage()
      const isImports = usageData.quotaType === 'imports'
      const totalAvailable = isImports ? (usageData.limit ?? 3) : (usageData.limits.minutesPerMonth + usageData.overages.minutes)
      const used = isImports ? (usageData.used ?? usageData.usage?.importCount ?? 0) : usageData.usage.totalMinutes
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
      // texJobStarted()

      const response = await uploadFileWithProgress(selectedFile, {
        toolType: BACKEND_TOOL_TYPES.COMPRESS_VIDEO,
        compressionLevel,
        compressProfile: compressProfile || undefined,
        trimmedStart: (trimStartSec ?? trimStart) ?? undefined,
        trimmedEnd: (trimEndSec ?? trimEnd) ?? undefined,
      }, { onProgress: (p) => setUploadProgress(p) })
      setUploadPhase('processing')
      setUploadProgress(100)

      persistJobId(location.pathname, response.jobId, response.jobToken)
      setCurrentJobId(response.jobId)
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
            trackAppEvent('transcription_completed', { toolId: 'compress-video' })
            // emitToolCompleted({ toolId: 'compress-video', pathname: '/compress-video', processingMs })
            incrementUsage('compress-video')
            try {
              const nextJobCount = incrementJobCompletedCount()
              trackEvent('job_completed', {
                job_id: response.jobId,
                tool_type: BACKEND_TOOL_TYPES.COMPRESS_VIDEO,
                processing_time_ms: processingMs,
                job_count: nextJobCount,
              })
            } catch {
              /* non-blocking */
            }
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            // texJobFailed()
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
        // texJobFailed()
      }
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
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

  /** Fetch a download URL with the required auth header and trigger a real file save (a plain <a> click can't carry the Bearer token, so it 401s). */
  const downloadAuthedUrl = async (url: string, filename: string) => {
    const token = getAuthToken()
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) throw new Error(`Download failed (${res.status})`)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const breadcrumbs = [{ label: 'Compress Video', href: '/compress-video' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Compress Video — Light, Medium, Heavy',
    subtitle: seoIntro ?? 'Shrink a video with light, medium, or heavy compression. Files deleted after processing. 3 free imports/mo.',
    icon: <Minimize2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    tags: ['Compression', 'Reduce size', 'Quality', 'Optimize'],
    sidebar: null,
    compactToolHeader: true,
    coreToolPath: '/compress-video',
    currentStepLabel:
      status === 'completed'
        ? 'Video compressed'
        : selectedFile
          ? 'Upload configured'
          : 'Ready to upload',
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        {status === 'idle' && !selectedFile && (
          <div className="space-y-component-sm">
            <UploadZone
              immediateSelect
              onFileSelect={handleFileSelect}
              initialFiles={selectedFile ? [selectedFile] : null}
              onRemove={() => {
                // if (fileFromWorkflow) workflow.clearVideo()
                setSelectedFile(null)
                setFileFromWorkflow(false)
              }}
              fromWorkflowLabel={fileFromWorkflow ? 'From previous step' : undefined}
              acceptedFormats={['MP4', 'MOV', 'AVI', 'WEBM', 'MKV']}
              maxSize="10 GB"
            />
            {location.pathname === '/compress-video' && (
              <SamplesModule sourcePath={location.pathname} samplesHref="/samples#compress" />
            )}
          </div>
        )}

        {status === 'idle' && selectedFile && (
          <ProcessingInterface
            file={{
              name: selectedFile.name,
              size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
              duration: filePreview?.durationSeconds != null ? formatDuration(filePreview.durationSeconds) : undefined,
            }}
            onRemove={() => {
              // if (fileFromWorkflow) workflow.clearVideo()
              setSelectedFile(null)
              setFileFromWorkflow(false)
            }}
            actionLabel="Compress Video"
            onAction={(trimStartPercent, trimEndPercent) => handleProcess(trimStartPercent, trimEndPercent)}
            actionLoading={false}
            showVideoPlayer={!!(videoPreviewUrl || filePreview?.durationSeconds)}
            videoSrc={videoPreviewUrl ?? undefined}
            durationSeconds={filePreview?.durationSeconds}
          >
            <div className="space-y-component">
              <RadioGroup
                label="Profile (recommended)"
                options={[
                  { value: 'web', label: 'Web', description: 'Streaming & web playback' },
                  { value: 'mobile', label: 'Mobile', description: 'Phones & tablets' },
                  { value: 'archive', label: 'Archive', description: 'Long-term storage' },
                  { value: '', label: 'Custom level', description: 'Choose light / medium / heavy' },
                ]}
                value={compressProfile}
                onChange={(v) => setCompressProfile(v as CompressProfile | '')}
              />
              {compressProfile === '' && (
                <RadioGroup
                  label="Compression level"
                  options={[
                    { value: 'light', label: 'Light', description: 'Best quality, ~30% smaller' },
                    { value: 'medium', label: 'Medium', description: 'Recommended, ~50% smaller' },
                    { value: 'heavy', label: 'Heavy', description: 'Smallest size, ~70% smaller' },
                  ]}
                  value={compressionLevel}
                  onChange={(v) => setCompressionLevel(v as CompressionLevel)}
                />
              )}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Your <span className="font-medium">{formatFileSize(selectedFile.size)}</span> file → approximately{' '}
                  <span className="font-medium">{formatFileSize(getEstimatedSize())}</span>
                </p>
              </div>
            </div>
          </ProcessingInterface>
        )}

        {status === 'processing' && (
          <ProcessingStateShell>
            <div className="mb-component-sm text-sm text-gray-600 dark:text-gray-400">
              {selectedFile?.name} • {filePreview?.durationSeconds != null ? formatDuration(filePreview.durationSeconds) : '—'}
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Compressing', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={uploadPhase === 'uploading' ? 'Uploading...' : 'Compressing video...'}
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={uploadPhase === 'uploading' ? undefined : '2–4 minutes'}
              statusSubtext={uploadPhase === 'processing' && queuePosition !== undefined && queuePosition > 0 ? `Queue position: ${queuePosition}` : undefined}
              onCancel={handleProcessAnother}
            />
            <ResultSkeleton variant="compress" />
          </ProcessingStateShell>
        )}

        {status === 'completed' && result && selectedFile && (
          <div className="space-y-component">
            {/* Teaser card for guests */}
            {showAuthGate && !isLoggedIn() && (
              <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden select-none">
                <ResultHeader
                  embedded
                  title="Video compressed"
                  processingTime={
                    lastProcessingMs != null
                      ? `${(lastProcessingMs / 1000).toFixed(1)}s`
                      : null
                  }
                />
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-component-sm">
                    <span>Original: {formatFileSize(selectedFile.size)}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-emerald-600 font-semibold">Compressed: {formatFileSize(getEstimatedSize())}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2 font-medium">Sign up to unlock:</p>
                  <div className="flex flex-wrap gap-1.5 mb-component-sm">
                    {(['Download compressed video', '2 free exports', 'No watermark'] as const).map((feat) => (
                      <span key={feat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-400 dark:text-gray-500">
                        <Lock className="w-2.5 h-2.5" />
                        {feat}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setAuthModalMode('signup-combo'); setShowAuthModal(true) }}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    >
                      Create free account
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthModalMode('login'); setShowAuthModal(true) }}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Log in
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Full result — hidden until signed in */}
            {(!showAuthGate || isLoggedIn()) && (
            <>
            <TranslateResult
              title="Video compressed!"
              fileName={result.fileName ?? fallbackCompressedName}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              hideDownload
              onProcessAnother={handleProcessAnother}
              relatedTools={[]}
            />

            <div className="grid grid-cols-1 items-start gap-component-sm lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-component min-w-0">
                <div className="rounded-xl border border-green-200 bg-green-50 p-component dark:border-green-900/40 dark:bg-green-950/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Original size</p>
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Compressed size</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatFileSize(getEstimatedSize())}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-green-200 pt-4 dark:border-green-900/40">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">
                      Quality preserved ✓
                    </p>
                  </div>
                </div>

                <CrossToolSuggestions
                  workflowHint="Your last file is pre-filled on the next tool."
                  suggestions={[
                    { icon: Film, title: 'Burn Subtitles', path: '/burn-subtitles', description: 'Burn captions into video', state: { useWorkflowVideo: true } },
                    { icon: MessageSquare, title: 'Video → Subtitles', path: '/video-to-subtitles', description: 'Generate SRT/VTT', state: { useWorkflowVideo: true } },
                    { icon: FileText, title: 'Video → Transcript', path: '/video-to-transcript', description: 'Get transcript & chapters', state: { useWorkflowVideo: true } },
                  ]}
                />
              </div>

              <ExportsPanel freeExportsUsed={!hasPaidPlan ? freeExportsUsed : undefined}>
                <ExportSection title="Video">
                  <button
                    type="button"
                    onClick={
                      !hasPaidPlan
                        ? async () => {
                            if (freeExportsUsed >= 2) {
                              toast('You\'ve used your 2 free downloads. Upgrade for more.')
                              return
                            }
                            try {
                              await downloadAuthedUrl(getDownloadUrl(), result?.fileName || fallbackCompressedName)
                              trackAppEvent('export_clicked', { toolId: 'compress-video' })
                              try { trackEvent('result_downloaded', { tool: 'compress-video', plan: 'free' }) } catch { /* non-blocking */ }
                              setFreeExportsUsed((prev) => prev + 1)
                              toast.success('Download started')
                            } catch {
                              toast.error('Download failed')
                            }
                          }
                        : async () => {
                            try {
                              await downloadAuthedUrl(getDownloadUrl(), result?.fileName || fallbackCompressedName)
                              try { trackEvent('result_downloaded', { tool: 'compress-video', plan: 'paid' }) } catch { /* non-blocking */ }
                            } catch {
                              toast.error('Download failed')
                            }
                          }
                    }
                    disabled={!hasPaidPlan && freeExportsUsed >= 2}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {!hasPaidPlan && freeExportsUsed >= 2 ? '2/2 free downloads used' : 'Download Video'}
                  </button>
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {formatFileSize(getEstimatedSize())} compressed file
                  </p>
                </ExportSection>
              </ExportsPanel>
            </div>
            </>
            )}{/* end gate-hidden result */}
            <ResultUpgradeCard tool="compress" resultKey={result.downloadUrl} />
            <FreePlanNudge tool="compress-video" resultKey={result.downloadUrl} />
            <SecondJobUpgradeNudge tool="compress-video" resultKey={result.downloadUrl} milestone={2} />
            <SecondJobUpgradeNudge tool="compress-video" resultKey={result.downloadUrl} milestone={3} />
            <div className="mt-2 min-h-[2.75rem]" />
          </div>
        )}

        {status === 'failed' && (
          <FailedState onTryAgain={handleProcessAnother} />
        )}
      </ToolLayout>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        tool="compress-video"
      />

      <JobAuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        jobDescription="Your video is compressed!"
        onAuthSuccess={async () => {
          const jobId = currentJobId || getPersistedJobId(location.pathname)
          const jobToken = getPersistedJobToken(location.pathname)
          if (jobId && jobToken) {
            try { await claimGuestJob(jobId, jobToken) } catch { /* best-effort */ }
          }
          setShowAuthGate(false)
          setShowAuthModal(false)
          window.location.reload()
        }}
      />


      {location.pathname === '/compress-video' && <CoreToolSeoDepth path="/compress-video" />}

      {faq.length > 0 && location.pathname !== '/compress-video' && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 max-w-4xl mx-auto px-4" aria-label="FAQ">
          <h2 className="text-2xl font-medium text-gray-800 mb-component-sm">Frequently asked questions</h2>
          <dl className="space-y-component-sm">
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
