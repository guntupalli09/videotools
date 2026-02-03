import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Wrench, Loader2, CheckCircle } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import PlanBadge from '../components/PlanBadge'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import UsageDisplay from '../components/UsageDisplay'
import SubtitleEditor, { SubtitleRow } from '../components/SubtitleEditor'
import { incrementUsage } from '../lib/usage'
import { uploadFile, getJobStatus, BACKEND_TOOL_TYPES, SessionExpiredError } from '../lib/api'
import { getJobLifecycleTransition } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, clearPersistedJobId } from '../lib/jobSession'
import toast from 'react-hot-toast'
import { Film, Languages } from 'lucide-react'

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
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string; issues?: any[]; warnings?: { type: string; message: string; line?: number }[] } | null>(null)
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([])

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const canEdit = plan !== 'free'

  const handleFileSelect = (file: File) => {
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
      setProgress(0)

      // Upload and process to detect issues (no fix options for analyze)
      const response = await uploadFile(selectedFile, {
        toolType: BACKEND_TOOL_TYPES.FIX_SUBTITLES,
      })

      persistJobId(location.pathname, response.jobId)
      const pollIntervalRef = { current: 0 as ReturnType<typeof setInterval> }
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId)
          setProgress(jobStatus.progress ?? 0)

          const transition = getJobLifecycleTransition(jobStatus)
          if (transition === 'completed') {
            clearInterval(pollIntervalRef.current)
            setResult(jobStatus.result ?? null)
            setIssues(jobStatus.result?.issues ?? [])
            setWarnings(jobStatus.result?.warnings ?? [])
            setShowIssues(true)
            setStatus('idle')
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            toast.error('Analysis failed. Please try again.')
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

  const handleAutoFix = async () => {
    if (!selectedFile) return

    try {
      setStatus('processing')
      setProgress(0)

      const response = await uploadFile(selectedFile, {
        toolType: BACKEND_TOOL_TYPES.FIX_SUBTITLES,
        fixTiming,
        grammarFix,
        lineBreakFix,
      })

      persistJobId(location.pathname, response.jobId)
      const pollIntervalRef = { current: 0 as ReturnType<typeof setInterval> }
      const doPoll = async () => {
        try {
          const jobStatus = await getJobStatus(response.jobId)
          setProgress(jobStatus.progress ?? 0)

          const transition = getJobLifecycleTransition(jobStatus)
          if (transition === 'completed') {
            clearInterval(pollIntervalRef.current)
            setStatus('completed')
            setResult(jobStatus.result ?? null)
            setWarnings(jobStatus.result?.warnings ?? [])
            incrementUsage('fix-subtitles')
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
    setIssues([])
    setWarnings([])
    setShowIssues(false)
    setFixTiming(false)
    setGrammarFix(false)
    setLineBreakFix(false)
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

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="mb-4">
            <PlanBadge />
          </div>
          <div className="bg-violet-100 rounded-xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Wrench className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{seoH1 ?? 'Fix Subtitles'}</h1>
          <p className="text-lg text-gray-600 mb-6">
            {seoIntro ?? 'Auto-correct timing issues and formatting errors'}
          </p>
          <UsageCounter />
          <UsageDisplay />
        </div>

        {status === 'idle' && !showIssues && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            <FileUploadZone
              onFileSelect={handleFileSelect}
              accept={{ 'text/*': ['.srt', '.vtt'] }}
              maxSize={10 * 1024 * 1024}
            />
            {selectedFile && (
              <button
                onClick={handleAnalyze}
                className="mt-6 w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Analyze Subtitles
              </button>
            )}
          </div>
        )}

        {status === 'idle' && showIssues && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">Fix options (optional)</h3>
            <p className="text-sm text-gray-600 mb-4">Fixes timing drift, long durations, and overflow issues. Original subtitles are always preserved.</p>
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fixTiming}
                  onChange={(e) => setFixTiming(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span className="text-gray-700">Fix timing (offset correction, clamp long durations)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={grammarFix}
                  onChange={(e) => setGrammarFix(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span className="text-gray-700">Grammar (normalize casing, punctuation)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lineBreakFix}
                  onChange={(e) => setLineBreakFix(e.target.checked)}
                  className="rounded text-violet-600 focus:ring-violet-500"
                />
                <span className="text-gray-700">Line breaks (max characters per line, reading speed)</span>
              </label>
            </div>
          </div>
        )}

        {status === 'analyzing' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Analyzing subtitles...</p>
            <ProgressBar progress={progress} />
          </div>
        )}

        {showIssues && (issues.length > 0 || warnings.length > 0) && status === 'idle' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
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
        )}

        {showIssues && issues.length === 0 && warnings.length === 0 && status === 'idle' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
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

        {status === 'processing' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Fixing issues...</p>
            <ProgressBar progress={progress} status="Applying fixes to subtitle file" />
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
              <div className="bg-green-50 rounded-2xl p-6 shadow-sm border border-green-100">
                <p className="text-green-800 font-medium">
                  ✓ Fixed {issues.length} issue{issues.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            <CrossToolSuggestions
              suggestions={[
                {
                  icon: Film,
                  title: 'Burn Subtitles',
                  path: '/burn-subtitles',
                },
                {
                  icon: Languages,
                  title: 'Translate Subtitles',
                  path: '/translate-subtitles',
                },
              ]}
            />
          </div>
        )}

        {status === 'failed' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <p className="text-red-600 mb-4">Processing failed. Please try again.</p>
            <button
              onClick={handleProcessAnother}
              className="text-violet-600 hover:text-violet-700 font-medium"
            >
              Try again
            </button>
          </div>
        )}

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
