import { useState } from 'react'
import { Languages, Loader2 } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import PlanBadge from '../components/PlanBadge'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import SubtitleEditor, { SubtitleRow } from '../components/SubtitleEditor'
import { checkLimit, incrementUsage } from '../lib/usage'
import { uploadFile, getJobStatus, BACKEND_TOOL_TYPES } from '../lib/api'
import { getJobLifecycleTransition } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import toast from 'react-hot-toast'
import { Film, Wrench } from 'lucide-react'

type Tab = 'upload' | 'paste'

/** Optional SEO overrides for alternate entry points (e.g. /srt-translator). Do NOT duplicate logic. */
export type TranslateSubtitlesSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function TranslateSubtitles(props: TranslateSubtitlesSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const [tab, setTab] = useState<Tab>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [targetLanguage, setTargetLanguage] = useState<string>('arabic')
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string; consistencyIssues?: { line: number; issueType: string }[] } | null>(null)
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([])
  const [showPaywall, setShowPaywall] = useState(false)

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const canEdit = plan !== 'free'

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
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

  const handleProcess = async () => {
    if (checkLimit('translate-subtitles')) {
      setShowPaywall(true)
      return
    }

    try {
      setStatus('processing')
      setProgress(0)

      let response

      if (tab === 'upload' && selectedFile) {
        response = await uploadFile(selectedFile, {
          toolType: BACKEND_TOOL_TYPES.TRANSLATE_SUBTITLES,
          targetLanguage,
        })
      } else if (tab === 'paste' && pastedText.trim()) {
        // For paste mode, we need to create a temporary file
        // For now, require file upload
        toast.error('Please upload a subtitle file')
        setStatus('idle')
        return
      } else {
        toast.error('Please upload a file or paste subtitle text')
        setStatus('idle')
        return
      }

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
            if (jobStatus.result?.downloadUrl) {
              try {
                const res = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl))
                const txt = await res.text()
                setSubtitleRows(parseSubtitlesToRows(txt))
              } catch {
                // ignore
              }
            }
            incrementUsage('translate-subtitles')
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
      setStatus('failed')
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleProcessAnother = () => {
    setSelectedFile(null)
    setPastedText('')
    setStatus('idle')
    setProgress(0)
    setResult(null)
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
          <div className="mb-4">
            <PlanBadge />
          </div>
          <div className="bg-violet-100 rounded-xl p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Languages className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{seoH1 ?? 'Translate Subtitles'}</h1>
          <p className="text-lg text-gray-600 mb-6">
            {seoIntro ?? 'Convert subtitles to Arabic, Hindi, and more'}
          </p>
          <UsageCounter />
          <UsageDisplay />
        </div>

        {status === 'idle' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
            {/* Language Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Translate to...
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              >
                <option value="arabic">🇸🇦 Arabic (عربي)</option>
                <option value="hindi">🇮🇳 Hindi (हिन्दी)</option>
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
                onClick={() => setTab('paste')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  tab === 'paste'
                    ? 'text-violet-600 border-b-2 border-violet-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Paste Text
              </button>
            </div>

            {tab === 'upload' ? (
              <div>
                <FileUploadZone
                  onFileSelect={handleFileSelect}
                  accept={{ 'text/*': ['.srt', '.vtt'] }}
                  maxSize={10 * 1024 * 1024}
                />
                {selectedFile && (
                  <button
                    onClick={handleProcess}
                    className="mt-6 w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                  >
                    Translate Subtitles
                  </button>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your subtitle text here (SRT or VTT format)..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent mb-4 h-48 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mb-4">
                  Note: File upload is recommended for better accuracy
                </p>
                <button
                  onClick={handleProcess}
                  disabled={!pastedText.trim()}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Translate Subtitles
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">Translating subtitles...</p>
            <ProgressBar progress={progress} status="Translating text while preserving timestamps" />
            <p className="text-sm text-gray-500 mt-4">Estimated time: 20-40 seconds</p>
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-6">
            <SuccessState
              fileName={result.fileName}
              downloadUrl={getDownloadUrl()}
              onProcessAnother={handleProcessAnother}
            />

            {result.consistencyIssues && result.consistencyIssues.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-6 shadow-sm border border-amber-100">
                <p className="text-amber-800 font-medium mb-2">Some lines may not be translated.</p>
                <p className="text-sm text-amber-900 mb-2">Non-blocking: review lines below if needed.</p>
                <ul className="text-sm text-amber-900 space-y-1">
                  {result.consistencyIssues.slice(0, 8).map((issue, i) => (
                    <li key={i}>Line {issue.line}: {issue.issueType === 'untranslated' ? 'possibly untranslated' : 'mixed language'}</li>
                  ))}
                  {result.consistencyIssues.length > 8 && <li>… and {result.consistencyIssues.length - 8} more</li>}
                </ul>
              </div>
            )}

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
                      a.download = (result.fileName || 'translated.srt').replace(/\.vtt$/i, '.srt')
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    Download Edited Subtitles
                  </button>
                  {!canEdit && (
                    <div className="text-xs text-gray-500">
                      Upgrade to Basic to edit translated subtitles.
                    </div>
                  )}
                </div>
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
                  icon: Wrench,
                  title: 'Fix Subtitles',
                  path: '/fix-subtitles',
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

        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          usedMinutes={0}
          availableMinutes={0}
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
