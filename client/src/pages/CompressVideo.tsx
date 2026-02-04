import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Minimize2, Loader2 } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import PlanBadge from '../components/PlanBadge'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import FailedState from '../components/FailedState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import VideoTrimmer from '../components/VideoTrimmer'
import { incrementUsage } from '../lib/usage'
import { uploadFile, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError } from '../lib/api'
import { getJobLifecycleTransition } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, clearPersistedJobId } from '../lib/jobSession'
import toast from 'react-hot-toast'
import { MessageSquare } from 'lucide-react'
import { formatFileSize } from '../lib/utils'

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium')
  const [compressProfile, setCompressProfile] = useState<CompressProfile | ''>('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [usedMinutes, setUsedMinutes] = useState<number | null>(null)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
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

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    try {
      const usageData = await getCurrentUsage()
      const totalAvailable = usageData.limits.minutesPerMonth + usageData.overages.minutes
      const used = usageData.usage.totalMinutes
      setAvailableMinutes(totalAvailable)
      setUsedMinutes(used)
      const atOrOverLimit = totalAvailable > 0 && used >= totalAvailable
      if (atOrOverLimit) {
        setShowPaywall(true)
        return
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    try {
      setStatus('processing')
      setProgress(0)
      setProcessingStartedAt(Date.now())

      const response = await uploadFile(selectedFile, {
        toolType: BACKEND_TOOL_TYPES.COMPRESS_VIDEO,
        compressionLevel,
        compressProfile: compressProfile || undefined,
        trimmedStart: trimStart ?? undefined,
        trimmedEnd: trimEnd ?? undefined,
      })

      persistJobId(location.pathname, response.jobId)
      const pollIntervalRef = { current: 0 as ReturnType<typeof setInterval> }
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId)
          setProgress(jobStatus.progress ?? 0)
          if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

          const transition = getJobLifecycleTransition(jobStatus)
          if (transition === 'completed') {
            clearInterval(pollIntervalRef.current)
            setStatus('completed')
            setResult(jobStatus.result ?? null)
            incrementUsage('compress-video')
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            toast.error('Processing failed. Please try again.')
          }
        } catch (error: any) {
          // Network/parse errors: do not set failed; keep polling.
        }
      }
      pollIntervalRef.current = setInterval(doPoll, 2000)
      doPoll()
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        clearPersistedJobId(location.pathname, navigate)
        setStatus('idle')
      } else {
        setStatus('failed')
      }
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setStatus('idle')
    setProgress(0)
    setResult(null)
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="mb-4">
            <PlanBadge />
          </div>
          <div className="bg-violet-100 rounded-xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Minimize2 className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{seoH1 ?? 'Compress Video'}</h1>
          <p className="text-lg text-gray-600 mb-6">
            {seoIntro ?? 'Reduce file size while keeping quality high'}
          </p>
          <UsageCounter />
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            {/* Phase 1B: Profile (Web / Mobile / Archive) or legacy level */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Profile (recommended)</label>
              <div className="flex flex-wrap gap-3 mb-3">
                {(['web', 'mobile', 'archive'] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="profile"
                      value={p}
                      checked={compressProfile === p}
                      onChange={() => setCompressProfile(p)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-gray-700 capitalize">{p}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="profile"
                    value=""
                    checked={compressProfile === ''}
                    onChange={() => setCompressProfile('')}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-gray-700">Custom level</span>
                </label>
              </div>
            </div>

            {compressProfile === '' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Compression Level</label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-lg hover:border-violet-400 transition-colors">
                    <input
                      type="radio"
                      name="compression"
                      value="light"
                      checked={compressionLevel === 'light'}
                      onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Light (best quality, ~30% smaller)</div>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer p-4 border-2 border-violet-600 rounded-lg bg-violet-50">
                    <input
                      type="radio"
                      name="compression"
                      value="medium"
                      checked={compressionLevel === 'medium'}
                      onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Medium (recommended, ~50% smaller)</div>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-lg hover:border-violet-400 transition-colors">
                    <input
                      type="radio"
                      name="compression"
                      value="heavy"
                      checked={compressionLevel === 'heavy'}
                      onChange={(e) => setCompressionLevel(e.target.value as CompressionLevel)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Heavy (smallest size, ~70% smaller)</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* File Size Estimate */}
            {selectedFile && (
              <div className="mb-6 p-4 bg-violet-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  Your <span className="font-medium">{formatFileSize(selectedFile.size)}</span> file will be approximately{' '}
                  <span className="font-medium">{formatFileSize(getEstimatedSize())}</span>
                </p>
              </div>
            )}

            <FileUploadZone
              onFileSelect={handleFileSelect}
              accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'] }}
              maxSize={10 * 1024 * 1024 * 1024}
            />

            {selectedFile && (
              <VideoTrimmer
                file={selectedFile}
                onChange={(startSeconds, endSeconds) => {
                  setTrimStart(startSeconds)
                  setTrimEnd(endSeconds)
                }}
              />
            )}

            {selectedFile && (
              <button
                onClick={handleProcess}
                className="mt-6 w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Compress Video
              </button>
            )}
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Compressing video...</p>
            <ProgressBar
              progress={progress}
              status="Reducing file size while preserving quality"
              queuePosition={queuePosition}
              processingStartedAt={processingStartedAt}
            />
            <p className="text-sm text-gray-500 mt-4">
              {queuePosition !== undefined && queuePosition > 0
                ? `${queuePosition} jobs ahead of you. Then ~2–4 min.`
                : 'Usually 2–4 minutes'}
            </p>
          </div>
        )}

        {status === 'completed' && result && selectedFile && (
          <div className="space-y-6">
            <SuccessState
              fileName={result.fileName}
              downloadUrl={getDownloadUrl()}
              onProcessAnother={handleProcessAnother}
            />

            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Original size</p>
                  <p className="text-lg font-semibold text-gray-800">{formatFileSize(selectedFile.size)}</p>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Compressed size</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatFileSize(getEstimatedSize())}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  Quality preserved ✓
                </p>
              </div>
            </div>

            <CrossToolSuggestions
              suggestions={[
                {
                  icon: MessageSquare,
                  title: 'Video → Subtitles',
                  path: '/video-to-subtitles',
                },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
          <FailedState onTryAgain={handleProcessAnother} />
        )}

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
          <section className="mt-12 pt-8 border-t border-gray-100" aria-label="FAQ">
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
