import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Wrench, CheckCircle } from 'lucide-react'
import FailedState from '../components/FailedState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { TranslateResult } from '../components/figma/TranslateResult'
import { Checkbox } from '../components/figma/FormControls'
import type { SubtitleRow } from '../components/SubtitleEditor'
const SubtitleEditor = lazy(() => import('../components/SubtitleEditor'))
import { incrementUsage } from '../lib/usage'
import { uploadFileWithProgress, getJobStatus, BACKEND_TOOL_TYPES, SessionExpiredError } from '../lib/api'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { FREE_EXPORT_WATERMARK } from '../lib/watermark'
import { persistJobId, clearPersistedJobId } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import toast from 'react-hot-toast'
import { Film, Languages, MessageSquare } from 'lucide-react'
import { dispatchJobCompletedForFeedback } from '../components/FeedbackPrompt'
import { emitToolCompleted } from '../workflow/workflowStore'

/** Optional SEO overrides for alternate entry points. Do NOT duplicate logic. */
export type FixSubtitlesSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function FixSubtitles(props: FixSubtitlesSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [issues, setIssues] = useState<any[]>([])
  const [warnings, setWarnings] = useState<{ type: string; message: string; line?: number }[]>([])
  const [showIssues, setShowIssues] = useState(false)
  const [fixTiming, setFixTiming] = useState(false)
  const [grammarFix, setGrammarFix] = useState(false)
  const [lineBreakFix, setLineBreakFix] = useState(false)
  const [removeFillers, setRemoveFillers] = useState(false)
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'processing' | 'completed' | 'failed'>('idle')
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('processing')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progress, setProgress] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string; issues?: any[]; warnings?: { type: string; message: string; line?: number }[] } | null>(null)
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([])
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const canEdit = ['basic', 'pro', 'agency'].includes(plan)

  useEffect(() => {
    if (result?.downloadUrl) setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  const handleFileSelect = (file: File) => {
    try {
      trackEvent('file_selected', {
        tool_type: BACKEND_TOOL_TYPES.FIX_SUBTITLES,
        file_size_bytes: file.size,
      })
    } catch {
      // non-blocking
    }
    setSelectedFile(file)
    setIssues([])
    setShowIssues(false)
    setSubtitleRows([])
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
      const [start, end] = lines[timeLineIdx].split('-->').map((s) => s.trim())
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
      .map((r, idx) => `${idx + 1}\n${r.startTime} --> ${r.endTime}\n${r.text}`)
      .join('\n\n')
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    try {
      setStatus('analyzing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      const startedAt = Date.now()
      processingStartedAtRef.current = startedAt
      texJobStarted()

      const response = await uploadFileWithProgress(selectedFile, {
        toolType: BACKEND_TOOL_TYPES.FIX_SUBTITLES,
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
            setResult(jobStatus.result ?? null)
            setIssues(jobStatus.result?.issues ?? [])
            setWarnings(jobStatus.result?.warnings ?? [])
            setShowIssues(true)
            setStatus('idle')
            const started = processingStartedAtRef.current ?? Date.now()
            texJobCompleted(Date.now() - started, 'fix-subtitles')
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            texJobFailed()
            toast.error('Analysis failed. Please try again.')
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

  const handleAutoFix = async () => {
    if (!selectedFile) return

    try {
      setStatus('processing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      const startedAtFix = Date.now()
      processingStartedAtRef.current = startedAtFix
      texJobStarted()

      const response = await uploadFileWithProgress(selectedFile, {
        toolType: BACKEND_TOOL_TYPES.FIX_SUBTITLES,
        fixTiming,
        grammarFix,
        lineBreakFix,
        removeFillers,
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
            emitToolCompleted({ toolId: 'fix-subtitles', pathname: '/fix-subtitles', processingMs })
            setWarnings(jobStatus.result?.warnings ?? [])
            incrementUsage('fix-subtitles')
            texJobCompleted(processingMs, 'fix-subtitles')
            if (jobStatus.result?.downloadUrl) {
              try {
                const res = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl))
                const txt = await res.text()
                setSubtitleRows(parseSubtitlesToRows(txt))
              } catch {
                // ignore
              }
            }
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
    setSelectedFile(null)
    setIssues([])
    setWarnings([])
    setShowIssues(false)
    setFixTiming(false)
    setGrammarFix(false)
    setLineBreakFix(false)
    setRemoveFillers(false)
    setStatus('idle')
    setProgress(0)
    setResult(null)
    setSubtitleRows([])
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      overlap: 'Overlapping timestamps',
      long_line: 'Line too long',
      fast_reading: 'Reading speed too fast',
      large_gap: 'Large gap',
    }
    return labels[type] || type
  }

  const breadcrumbs = [{ label: 'Fix Subtitles', href: '/fix-subtitles' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Fix Subtitles',
    subtitle: seoIntro ?? 'Auto-correct timing issues and formatting errors',
    icon: <Wrench className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
    tags: ['Timing', 'Sync', 'Format', 'Clean', 'Repair', 'Auto-fix'],
    sidebar: null,
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        {status === 'idle' && !selectedFile && !showIssues && (
          <UploadZone
            immediateSelect
            onFileSelect={handleFileSelect}
            initialFiles={selectedFile ? [selectedFile] : null}
            onRemove={() => { setSelectedFile(null); setIssues([]); setShowIssues(false) }}
            acceptedFormats={['SRT', 'VTT']}
            acceptAttribute=".srt,.vtt"
            maxSize="10 MB"
          />
        )}

        {status === 'idle' && selectedFile && !showIssues && (
          <ProcessingInterface
            file={{
              name: selectedFile.name,
              size: `${((selectedFile.size ?? 0) / 1024).toFixed(2)} KB`,
            }}
            onRemove={() => { setSelectedFile(null); setIssues([]); setShowIssues(false) }}
            actionLabel="Analyze Subtitles"
            onAction={() => handleAnalyze()}
            actionLoading={false}
            showVideoPlayer={false}
          />
        )}

        {status === 'analyzing' && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-8">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {selectedFile?.name} • {((selectedFile?.size ?? 0) / 1024).toFixed(2)} KB
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Analyzing', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={uploadPhase === 'uploading' ? 'Uploading...' : 'Analyzing subtitles...'}
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={uploadPhase === 'uploading' ? undefined : '10–30 seconds'}
              statusSubtext={uploadPhase === 'processing' && queuePosition !== undefined && queuePosition > 0 ? `Queue position: ${queuePosition}` : undefined}
              onCancel={handleProcessAnother}
            />
          </div>
        )}

        {status === 'idle' && showIssues && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">Fix options (optional)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Fixes timing drift, long durations, and overflow issues. Original subtitles are always preserved.</p>
              <div className="space-y-4 mb-6">
                <Checkbox label="Fix timing (offset correction, clamp long durations)" checked={fixTiming} onChange={setFixTiming} />
                <Checkbox label="Grammar (normalize casing, punctuation)" checked={grammarFix} onChange={setGrammarFix} />
                <Checkbox label="Line breaks (max characters per line, reading speed)" checked={lineBreakFix} onChange={setLineBreakFix} />
                <Checkbox label="Remove filler words (um, uh, like, you know, etc.)" checked={removeFillers} onChange={setRemoveFillers} />
              </div>
            </div>

            {((issues.length > 0 || warnings.length > 0) && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" strokeWidth={1.5} />
              <h3 className="text-xl font-semibold text-gray-800">
                {issues.length > 0
                  ? `Found ${issues.length} issue${issues.length !== 1 ? 's' : ''} in your subtitles`
                  : 'Validation results'}
              </h3>
            </div>

            {warnings.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-amber-800 mb-2">Warnings (informational)</p>
                <div className="space-y-2">
                  {warnings.map((w, i) => (
                    <div key={i} className="bg-amber-50 rounded-lg p-3 text-sm text-amber-900">
                      {w.line != null && <span className="font-mono">Line {w.line}: </span>}
                      {w.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {issues.length > 0 && (
              <div className="space-y-2 mb-6">
                {issues.map((issue, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-800">
                      • {getIssueTypeLabel(issue.type)}: {issue.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleAutoFix}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Auto-fix all issues →
            </button>
              </div>
            ))}

            {issues.length === 0 && warnings.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No issues found!</h3>
            <p className="text-gray-600 mb-4">Your subtitles are already in good shape. You can still apply optional fixes (timing, grammar, line breaks) above.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleAutoFix}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Apply optional fixes
              </button>
              <button
                onClick={handleProcessAnother}
                className="text-violet-600 hover:text-violet-700 font-medium"
              >
                Process another file
              </button>
            </div>
          </div>
            )}
          </div>
        )}

        {status === 'processing' && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-8">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {selectedFile?.name} • {((selectedFile?.size ?? 0) / 1024).toFixed(2)} KB
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: 'Fixing', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={uploadPhase === 'uploading' ? 'Uploading...' : 'Fixing issues...'}
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={uploadPhase === 'uploading' ? undefined : '10–30 seconds'}
              statusSubtext={uploadPhase === 'processing' && queuePosition !== undefined && queuePosition > 0 ? `Queue position: ${queuePosition}` : undefined}
              onCancel={handleProcessAnother}
            />
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-6">
            <TranslateResult
              title="Subtitles fixed!"
              fileName={result.fileName ?? 'fixed.srt'}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              downloadLabel={plan === 'free' ? (freeExportsUsed >= 2 ? '2/2 free downloads used' : 'Download with watermark') : 'Download fixed subtitles'}
              onDownload={
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
                        a.download = result?.fileName || 'fixed.srt'
                        a.click()
                        URL.revokeObjectURL(a.href)
                        setFreeExportsUsed((prev) => prev + 1)
                        toast.success('Download started (with watermark)')
                      } catch {
                        toast.error('Download failed')
                      }
                    }
                  : () => {
                      const a = document.createElement('a')
                      a.href = getDownloadUrl()
                      a.download = result?.fileName || 'fixed.srt'
                      a.click()
                    }
              }
              onProcessAnother={handleProcessAnother}
              relatedTools={[
                { path: '/burn-subtitles', name: 'Burn Subtitles', description: 'Hardcode into video' },
                { path: '/translate-subtitles', name: 'Translate Subtitles', description: 'Translate to another language' },
                { path: '/video-to-subtitles', name: 'Video → Subtitles', description: 'Generate SRT/VTT from video' },
              ]}
            />

            {subtitleRows.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-card">
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
                      a.download = (result.fileName || 'fixed.srt').replace(/\.vtt$/i, '.srt')
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Download Edited Subtitles
                  </button>
                  {!canEdit && (
                    <div className="text-xs text-gray-500">
                      Upgrade to Basic to edit fixed subtitles.
                    </div>
                  )}
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                <p className="text-amber-800 font-medium mb-2">Warnings (informational)</p>
                <ul className="text-sm text-amber-900 space-y-1">
                  {warnings.slice(0, 5).map((w, i) => (
                    <li key={i}>{w.line != null ? `Line ${w.line}: ` : ''}{w.message}</li>
                  ))}
                  {warnings.length > 5 && <li>… and {warnings.length - 5} more</li>}
                </ul>
              </div>
            )}

            {issues.length > 0 && (
              <div className="bg-green-50 rounded-2xl p-6 shadow-card border border-green-100">
                <p className="text-green-800 font-medium">
                  ✓ Fixed {issues.length} issue{issues.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <CrossToolSuggestions
              workflowHint="Burn into video, translate, or generate subtitles from video."
              suggestions={[
                { icon: Film, title: 'Burn Subtitles', path: '/burn-subtitles', description: 'Burn fixed captions into video' },
                { icon: Languages, title: 'Translate Subtitles', path: '/translate-subtitles', description: 'Translate to another language' },
                { icon: MessageSquare, title: 'Video → Subtitles', path: '/video-to-subtitles', description: 'Generate SRT/VTT from video' },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
          <FailedState onTryAgain={handleProcessAnother} />
        )}
      </ToolLayout>

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
