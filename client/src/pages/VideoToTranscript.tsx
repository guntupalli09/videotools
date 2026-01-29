import { useState } from 'react'
import { FileText, Copy, Loader2 } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import VideoTrimmer from '../components/VideoTrimmer'
import { getUsage, getLimit, checkLimit, incrementUsage } from '../lib/usage'
import { uploadFile, uploadFromURL, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES } from '../lib/api'
import { trackEvent } from '../lib/analytics'
import toast from 'react-hot-toast'
import { Subtitles } from 'lucide-react'

type Tab = 'upload' | 'url'

export default function VideoToTranscript() {
  const [tab, setTab] = useState<Tab>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [transcriptPreview, setTranscriptPreview] = useState('')
  const [showPaywall, setShowPaywall] = useState(false)
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [usedMinutes, setUsedMinutes] = useState<number | null>(null)

  const usage = getUsage('video-to-transcript')
  const limit = getLimit('video-to-transcript')

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setTrimStart(null)
    setTrimEnd(null)
  }

  const handleProcess = async () => {
    // Check simple per-tool limit (Phase 1.5 local counter)
    if (checkLimit('video-to-transcript')) {
      setShowPaywall(true)
      return
    }

    // Check backend minute-based limits (Phase 2)
    try {
      const usageData = await getCurrentUsage()
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

    try {
      setStatus('processing')
      setProgress(0)
      trackEvent('processing_started', { tool: 'video-to-transcript' })

      let response
      if (tab === 'upload' && selectedFile) {
        response = await uploadFile(selectedFile, {
          toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
          trimmedStart: trimStart ?? undefined,
          trimmedEnd: trimEnd ?? undefined,
        })
      } else if (tab === 'url' && url.trim()) {
        // Validate URL
        try {
          new URL(url)
        } catch {
          toast.error('Invalid URL. Please enter a valid video URL.')
          setStatus('idle')
          return
        }
        response = await uploadFromURL(url, { toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT })
      } else {
        toast.error('Please select a file or enter a URL')
        setStatus('idle')
        return
      }

      // Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId)
          setProgress(jobStatus.progress)

          if (jobStatus.status === 'completed' && jobStatus.result) {
            clearInterval(pollInterval)
            setStatus('completed')
            setResult(jobStatus.result)
            
            // Fetch transcript preview
            if (jobStatus.result.downloadUrl) {
              try {
                const transcriptResponse = await fetch(jobStatus.result.downloadUrl)
                const transcriptText = await transcriptResponse.text()
                setTranscriptPreview(transcriptText.substring(0, 500))
              } catch (e) {
                // Ignore preview fetch errors
              }
            }

            // Increment local usage counter
            incrementUsage('video-to-transcript')
            trackEvent('processing_completed', { tool: 'video-to-transcript' })
          } else if (jobStatus.status === 'failed') {
            clearInterval(pollInterval)
            setStatus('failed')
            toast.error('Processing failed. Please try again.')
          }
        } catch (error: any) {
          clearInterval(pollInterval)
          setStatus('failed')
          toast.error(error.message || 'Failed to get job status')
        }
      }, 2000)
    } catch (error: any) {
      setStatus('failed')
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleCopyToClipboard = async () => {
    if (transcriptPreview) {
      try {
        // Fetch full transcript
        if (result?.downloadUrl) {
          const response = await fetch(result.downloadUrl)
          const text = await response.text()
          await navigator.clipboard.writeText(text)
          toast.success('Copied to clipboard!')
        }
      } catch (error) {
        toast.error('Failed to copy to clipboard')
      }
    }
  }

  const handleProcessAnother = () => {
    setSelectedFile(null)
    setUrl('')
    setStatus('idle')
    setProgress(0)
    setResult(null)
    setTranscriptPreview('')
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    // If downloadUrl already starts with http, use it as-is
    if (result.downloadUrl.startsWith('http')) {
      return result.downloadUrl
    }
    // Otherwise, construct full URL
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin
    return baseUrl + result.downloadUrl
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="bg-violet-100 rounded-xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Video → Transcript</h1>
          <p className="text-lg text-gray-600 mb-6">
            Extract spoken text from any video in seconds
          </p>
          <UsageCounter used={usage.count} limit={limit} />
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6">
            {/* Tab Switcher */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200">
              <button
                onClick={() => setTab('upload')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  tab === 'upload'
                    ? 'text-violet-600 border-b-2 border-violet-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload File
              </button>
              <button
                onClick={() => setTab('url')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  tab === 'url'
                    ? 'text-violet-600 border-b-2 border-violet-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Paste URL
              </button>
            </div>

            {tab === 'upload' ? (
              <div>
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
                    Transcribe Video
                  </button>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste YouTube URL or direct video link"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent mb-4"
                />
                <button
                  onClick={handleProcess}
                  disabled={!url.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Transcribe Video
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Transcribing your video...</p>
            <ProgressBar progress={progress} status="Processing audio and generating transcript" />
            <p className="text-sm text-gray-500 mt-4">Estimated time: 30-60 seconds</p>
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-6">
            <SuccessState
              fileName={result.fileName}
              downloadUrl={getDownloadUrl()}
              onProcessAnother={handleProcessAnother}
            />

            {transcriptPreview && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Preview</h3>
                  <button
                    onClick={handleCopyToClipboard}
                    className="flex items-center space-x-2 text-violet-600 hover:text-violet-700 font-medium text-sm"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy to clipboard</span>
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcriptPreview}...</p>
                </div>
              </div>
            )}

            <CrossToolSuggestions
              suggestions={[
                {
                  icon: Subtitles,
                  title: 'Video → Subtitles',
                  path: '/video-to-subtitles',
                },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6 text-center">
            <p className="text-red-600 mb-4">Processing failed. Please try again.</p>
            <button
              onClick={handleProcessAnother}
              className="text-violet-600 hover:text-violet-700 font-medium"
            >
              Try again
            </button>
          </div>
        )}

        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          usedMinutes={usedMinutes ?? 0}
          availableMinutes={availableMinutes ?? usage.count}
        />
      </div>
    </div>
  )
}
