import { useState } from 'react'
import { Film, Loader2 } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import VideoTrimmer from '../components/VideoTrimmer'
import { getUsage, getLimit, checkLimit, incrementUsage } from '../lib/usage'
import { uploadDualFiles, getJobStatus, BACKEND_TOOL_TYPES } from '../lib/api'
import { API_ORIGIN } from '../lib/apiBase'
import toast from 'react-hot-toast'
import { Minimize2 } from 'lucide-react'

export default function BurnSubtitles() {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)

  const usage = getUsage('burn-subtitles')
  const limit = getLimit('burn-subtitles')

  const handleVideoSelect = (file: File) => {
    setVideoFile(file)
    setTrimStart(null)
    setTrimEnd(null)
  }

  const handleSubtitleSelect = (file: File) => {
    setSubtitleFile(file)
  }

  const handleProcess = async () => {
    if (checkLimit('burn-subtitles')) {
      setShowPaywall(true)
      return
    }

    if (!videoFile || !subtitleFile) {
      toast.error('Please upload both video and subtitle files')
      return
    }

    try {
      setStatus('processing')
      setProgress(0)

      const response = await uploadDualFiles(videoFile, subtitleFile, BACKEND_TOOL_TYPES.BURN_SUBTITLES, {
        trimmedStart: trimStart ?? undefined,
        trimmedEnd: trimEnd ?? undefined,
      })

      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId)
          setProgress(jobStatus.progress)

          if (jobStatus.status === 'completed' && jobStatus.result) {
            clearInterval(pollInterval)
            setStatus('completed')
            setResult(jobStatus.result)
            incrementUsage('burn-subtitles')
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

  const handleProcessAnother = () => {
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
          <div className="bg-violet-100 rounded-xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Film className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Burn Subtitles</h1>
          <p className="text-lg text-gray-600 mb-6">
            Hardcode captions directly into your video
          </p>
          <UsageCounter used={usage.count} limit={limit} />
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6">
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
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Burning subtitles into video...</p>
            <ProgressBar progress={progress} status="Processing video with hardcoded subtitles" />
            <p className="text-sm text-gray-500 mt-4">
              This may take 3-5 minutes for a 10-minute video
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
          usedMinutes={usage.count}
          availableMinutes={limit}
          onUpgrade={() => {
            window.location.href = '/pricing'
          }}
        />
      </div>
    </div>
  )
}
