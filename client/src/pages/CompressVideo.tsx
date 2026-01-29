import { useState } from 'react'
import { Minimize2, Loader2 } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import VideoTrimmer from '../components/VideoTrimmer'
import { getUsage, getLimit, checkLimit, incrementUsage } from '../lib/usage'
import { uploadFile, getJobStatus } from '../lib/api'
import toast from 'react-hot-toast'
import { MessageSquare } from 'lucide-react'
import { formatFileSize } from '../lib/utils'

type CompressionLevel = 'light' | 'medium' | 'heavy'

export default function CompressVideo() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [compressionLevel, setCompressionLevel] = useState<CompressionLevel>('medium')
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)

  const usage = getUsage('compress-video')
  const limit = getLimit('compress-video')

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
    if (checkLimit('compress-video')) {
      setShowPaywall(true)
      return
    }

    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    try {
      setStatus('processing')
      setProgress(0)

      const response = await uploadFile(selectedFile, {
        toolType: 'compress-video',
        compressionLevel,
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
            incrementUsage('compress-video')
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
    setSelectedFile(null)
    setStatus('idle')
    setProgress(0)
    setResult(null)
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    if (result.downloadUrl.startsWith('http')) {
      return result.downloadUrl
    }
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin
    return baseUrl + result.downloadUrl
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="bg-violet-100 rounded-xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Minimize2 className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Compress Video</h1>
          <p className="text-lg text-gray-600 mb-6">
            Reduce file size while keeping quality high
          </p>
          <UsageCounter used={usage.count} limit={limit} />
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6">
            {/* Compression Level Selector */}
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
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Compressing video...</p>
            <ProgressBar progress={progress} status="Reducing file size while preserving quality" />
            <p className="text-sm text-gray-500 mt-4">This may take 2-4 minutes</p>
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
          used={usage.count}
          limit={limit}
        />
      </div>
    </div>
  )
}
