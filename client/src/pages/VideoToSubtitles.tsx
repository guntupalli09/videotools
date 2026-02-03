import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageSquare, Loader2 } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import PlanBadge from '../components/PlanBadge'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import VideoTrimmer from '../components/VideoTrimmer'
import LanguageSelector from '../components/LanguageSelector'
import SubtitleEditor, { SubtitleRow } from '../components/SubtitleEditor'
import { incrementUsage } from '../lib/usage'
import { uploadFile, uploadFileWithProgress, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError } from '../lib/api'
import { checkVideoPreflight } from '../lib/uploadPreflight'
import { getJobLifecycleTransition } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, getPersistedJobId, clearPersistedJobId } from '../lib/jobSession'
import { createCheckoutSession } from '../lib/billing'
import { trackEvent } from '../lib/analytics'
import toast from 'react-hot-toast'
import { Languages, Film, Wrench, FileDown } from 'lucide-react'

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
  const [convertTargetFormat, setConvertTargetFormat] = useState<'srt' | 'vtt' | 'txt'>('srt')
  const [convertProgress, setConvertProgress] = useState(false)
  const [convertPreview, setConvertPreview] = useState<string | null>(null)
  const rehydratePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const canEdit = plan !== 'free'
  const canMultiLanguage = plan === 'basic' || plan === 'pro' || plan === 'agency'
  const maxAdditionalLanguages = plan === 'agency' ? 9 : plan === 'pro' ? 4 : plan === 'basic' ? 1 : 0

  // Rehydrate from URL/sessionStorage after idle or reload (e.g. mobile Safari)
  useEffect(() => {
    const pathname = location.pathname
    const jobId = getPersistedJobId(pathname)
    if (!jobId) return

    let cancelled = false
    const run = async () => {
      try {
        const jobStatus = await getJobStatus(jobId)
        if (cancelled) return
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
            const s = await getJobStatus(jobId)
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
          }
        }
        rehydratePollRef.current = setInterval(doPoll, 2000)
        doPoll()
      } catch (err) {
        if (cancelled) return
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

    // Pre-flight: file size + duration vs plan limits
    try {
      setStatus('processing')
      setUploadPhase('preparing')
      setUploadProgress(0)
      setProgress(0)

      const limits = usageData?.limits
        ? { maxFileSize: usageData.limits.maxFileSize, maxVideoDuration: usageData.limits.maxVideoDuration }
        : {}
      const preflight = await checkVideoPreflight(selectedFile, limits)
      if (!preflight.allowed) {
        setStatus('idle')
        toast.error(preflight.reason ?? 'Video exceeds plan limits.')
        trackEvent('paywall_shown', { tool: 'video-to-subtitles', reason: 'preflight' })
        return
      }
    } catch {
      setStatus('idle')
      toast.error('Could not validate video. Try again.')
      return
    }

    try {
      setUploadPhase('uploading')
      trackEvent('processing_started', { tool: 'video-to-subtitles' })

      const response = await uploadFileWithProgress(
        selectedFile,
        {
          toolType: BACKEND_TOOL_TYPES.VIDEO_TO_SUBTITLES,
          format,
          language: language || undefined,
          trimmedStart: trimStart ?? undefined,
          trimmedEnd: trimEnd ?? undefined,
          additionalLanguages: canMultiLanguage ? additionalLanguages : undefined,
        },
        { onProgress: (p) => setUploadProgress(p) }
      )

      persistJobId(location.pathname, response.jobId)
      setUploadPhase('processing')
      setUploadProgress(100)

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
            trackEvent('processing_completed', { tool: 'video-to-subtitles' })
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
      const pollIntervalRef = { current: 0 as ReturnType<typeof setInterval> }
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(uploadRes.jobId)
          if (getJobLifecycleTransition(jobStatus) === 'completed' && jobStatus.result?.downloadUrl) {
            clearInterval(pollIntervalRef.current)
            const convertedUrl = getAbsoluteDownloadUrl(jobStatus.result.downloadUrl)
            if (plan === 'free') {
              const prevRes = await fetch(convertedUrl)
              const text = await prevRes.text()
              const lines = text.split(/\n\n|\n/).slice(0, 30)
              setConvertPreview(lines.join('\n'))
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
      pollIntervalRef.current = setInterval(doPoll, 2000)
      doPoll()
    } catch (e: any) {
      toast.error(e.message || 'Conversion failed')
    } finally {
      setConvertProgress(false)
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
          <UsageCounter />
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
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
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">
              {uploadPhase === 'preparing' && 'Preparing video…'}
              {uploadPhase === 'uploading' && `Uploading (${uploadProgress}%)`}
              {uploadPhase === 'processing' && 'Generating subtitles…'}
            </p>
            <ProgressBar
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              status={
                uploadPhase === 'uploading'
                  ? `Uploading… ${uploadProgress}%`
                  : queuePosition !== undefined
                    ? `Processing… ${queuePosition} jobs ahead of you.`
                    : 'Processing video and extracting speech'
              }
            />
            <p className="text-sm text-gray-500 mt-4">
              {uploadPhase === 'uploading' ? 'Large files may take a minute.' : 'Estimated time: 30-60 seconds'}
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

            {subtitleRows.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
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
                <p className="text-xs text-gray-500 mt-2">Free plan: preview first 30 lines only. Upgrade for full download.</p>
              )}
              {convertPreview !== null && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-700 mb-2">Preview (first 30 lines)</p>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">{convertPreview}</pre>
                </div>
              )}
            </div>

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
