import { useState } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import VideoTrimmer from '../components/VideoTrimmer'
import LanguageSelector from '../components/LanguageSelector'
import SubtitleEditor, { SubtitleRow } from '../components/SubtitleEditor'
import { getUsage, getLimit, checkLimit, incrementUsage } from '../lib/usage'
import { uploadFile, uploadFromURL, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES } from '../lib/api'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { createCheckoutSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import toast from 'react-hot-toast'
import { Languages, Film, Wrench } from 'lucide-react'

type Tab = 'upload' | 'url'

export default function VideoToSubtitles() {
  const [tab, setTab] = useState<Tab>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [url, setUrl] = useState('')
  const [format, setFormat] = useState<'srt' | 'vtt'>('srt')
  const [language, setLanguage] = useState<string>('')
  const [additionalLanguages, setAdditionalLanguages] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string } | null>(null)
  const [subtitlePreview, setSubtitlePreview] = useState('')
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([])
  const [showPaywall, setShowPaywall] = useState(false)
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [usedMinutes, setUsedMinutes] = useState<number | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const canEdit = plan !== 'free'
  const canMultiLanguage = plan === 'basic' || plan === 'pro' || plan === 'agency'
  const maxAdditionalLanguages = plan === 'agency' ? 9 : plan === 'pro' ? 4 : plan === 'basic' ? 1 : 0

  const usage = getUsage('video-to-subtitles')
  const limit = getLimit('video-to-subtitles')

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setTrimStart(null)
    setTrimEnd(null)
    setAdditionalLanguages([])
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
    if (checkLimit('video-to-subtitles')) {
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
        trackEvent('paywall_shown', { tool: 'video-to-subtitles' })
        return
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    try {
      setStatus('processing')
      setProgress(0)
      trackEvent('processing_started', { tool: 'video-to-subtitles' })

      let response
      if (tab === 'upload' && selectedFile) {
        response = await uploadFile(selectedFile, {
          toolType: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
          format,
          language: language || undefined,
          trimmedStart: trimStart ?? undefined,
          trimmedEnd: trimEnd ?? undefined,
          additionalLanguages: canMultiLanguage ? additionalLanguages : undefined,
        })
      } else if (tab === 'url' && url.trim()) {
        try {
          new URL(url)
        } catch {
          toast.error('Invalid URL. Please enter a valid video URL.')
          setStatus('idle')
          return
        }
        response = await uploadFromURL(url, {
          toolType: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
          format,
          language: language || undefined,
        })
      } else {
        toast.error('Please select a file or enter a URL')
        setStatus('idle')
        return
      }

      const pollInterval = setInterval(async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId)
          setProgress(jobStatus.progress)
          if (jobStatus.queuePosition !== undefined) setQueuePosition(jobStatus.queuePosition)

          if (jobStatus.status === 'completed' && jobStatus.result) {
            clearInterval(pollInterval)
            setStatus('completed')
            setResult(jobStatus.result)

            // Fetch subtitle preview
            if (jobStatus.result.downloadUrl) {
              try {
                const subtitleResponse = await fetch(jobStatus.result.downloadUrl)
                const ct = subtitleResponse.headers.get('content-type') || ''
                const isZip =
                  jobStatus.result.fileName?.toLowerCase().endsWith('.zip') ||
                  ct.includes('application/zip')

                if (!isZip) {
                  const subtitleText = await subtitleResponse.text()
                  // Show first 10 entries
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
            trackEvent('processing_completed', { tool: 'video-to-subtitles' })
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
    setUrl('')
    setTrimStart(null)
    setTrimEnd(null)
    setAdditionalLanguages([])
    setStatus('idle')
    setProgress(0)
    setResult(null)
    setSubtitlePreview('')
    setSubtitleRows([])
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
            <MessageSquare className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Video → Subtitles</h1>
          <p className="text-lg text-gray-600 mb-6">
            Generate SRT and VTT subtitle files instantly
          </p>
          <UsageCounter used={usage.count} limit={limit} />
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6">
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
                    className="mt-6 w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Generate Subtitles
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
                  Generate Subtitles
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-white rounded-xl p-8 border border-gray-200 mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Generating subtitles...</p>
            <ProgressBar
              progress={progress}
              status={
                queuePosition !== undefined
                  ? `Processing… ${queuePosition} jobs ahead of you.`
                  : 'Processing video and extracting speech'
              }
            />
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

            {subtitleRows.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <SubtitleEditor
                  entries={subtitleRows}
                  editable={canEdit}
                  onChange={setSubtitleRows}
                />

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

            {subtitlePreview && (
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview (first 10 entries)</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{subtitlePreview}</pre>
                </div>
              </div>
            )}

            <CrossToolSuggestions
              suggestions={[
                {
                  icon: Languages,
                  title: 'Translate Subtitles',
                  path: '/translate-subtitles',
                },
                {
                  icon: Film,
                  title: 'Burn Subtitles',
                  path: '/burn-subtitles',
                },
                {
                  icon: Wrench,
                  title: 'Fix Subtitles',
                  path: '/fix-subtitles',
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
      </div>
    </div>
  )
}
