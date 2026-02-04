import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Film, Loader2 } from 'lucide-react'
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
import { uploadDualFiles, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError } from '../lib/api'
import { getJobLifecycleTransition } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, clearPersistedJobId } from '../lib/jobSession'
import toast from 'react-hot-toast'
import { Minimize2 } from 'lucide-react'

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
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [position, setPosition] = useState<'bottom' | 'middle'>('bottom')
  const [backgroundOpacity, setBackgroundOpacity] = useState<'none' | 'low' | 'high'>('low')
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [usedMinutes, setUsedMinutes] = useState<number | null>(null)

  const handleVideoSelect = (file: File) => {
    setVideoFile(file)
    setTrimStart(null)
    setTrimEnd(null)
  }

  const handleSubtitleSelect = (file: File) => {
    setSubtitleFile(file)
  }

  const handleProcess = async () => {
    if (!videoFile || !subtitleFile) {
      toast.error('Please upload both video and subtitle files')
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

      const response = await uploadDualFiles(videoFile, subtitleFile, BACKEND_TOOL_TYPES.BURN_SUBTITLES, {
        trimmedStart: trimStart ?? undefined,
        trimmedEnd: trimEnd ?? undefined,
        burnFontSize: fontSize,
        burnPosition: position,
        burnBackgroundOpacity: backgroundOpacity,
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
            incrementUsage('burn-subtitles')
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
    setVideoFile(null)
    setSubtitleFile(null)
    setTrimStart(null)
    setTrimEnd(null)
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
            <Film className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{seoH1 ?? 'Burn Subtitles'}</h1>
          <p className="text-lg text-gray-600 mb-6">
            {seoIntro ?? 'Hardcode captions directly into your video'}
          </p>
          <UsageCounter />
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">Caption style (preset)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-gray-600 block mb-1">Font size</span>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div>
                  <span className="text-xs text-gray-600 block mb-1">Position</span>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as 'bottom' | 'middle')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="bottom">Bottom</option>
                    <option value="middle">Middle</option>
                  </select>
                </div>
                <div>
                  <span className="text-xs text-gray-600 block mb-1">Background</span>
                  <select
                    value={backgroundOpacity}
                    onChange={(e) => setBackgroundOpacity(e.target.value as 'none' | 'low' | 'high')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload video</label>
                <FileUploadZone
                  onFileSelect={handleVideoSelect}
                  accept={{ 'video/*': ['.mp4', '.mov', '.avi', '.webm'] }}
                  maxSize={10 * 1024 * 1024 * 1024}
                />
                {videoFile && (
                  <VideoTrimmer
                    file={videoFile}
                    onChange={(startSeconds, endSeconds) => {
                      setTrimStart(startSeconds)
                      setTrimEnd(endSeconds)
                    }}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload subtitles</label>
                <FileUploadZone
                  onFileSelect={handleSubtitleSelect}
                  accept={{ 'text/*': ['.srt', '.vtt'] }}
                  maxSize={10 * 1024 * 1024}
                />
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={!videoFile || !subtitleFile}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Process Video
            </button>
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Burning subtitles into video...</p>
            <ProgressBar
              progress={progress}
              status="Processing video with hardcoded subtitles"
              queuePosition={queuePosition}
              processingStartedAt={processingStartedAt}
            />
            <p className="text-sm text-gray-500 mt-4">
              {queuePosition !== undefined && queuePosition > 0
                ? `${queuePosition} jobs ahead of you. Then ~3–5 min for a 10-min video.`
                : 'Usually 3–5 minutes for a 10-minute video'}
            </p>
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-6">
            <SuccessState
              fileName={result.fileName}
              downloadUrl={getDownloadUrl()}
              onProcessAnother={handleProcessAnother}
            />

            <CrossToolSuggestions
              suggestions={[
                {
                  icon: Minimize2,
                  title: 'Compress Video',
                  path: '/compress-video',
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
