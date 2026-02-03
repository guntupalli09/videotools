import { useState, useRef, useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FileText, Copy, Loader2, Users, ListOrdered, BookOpen, Sparkles, Hash, FileCode, Download, Eraser } from 'lucide-react'
import FileUploadZone from '../components/FileUploadZone'
import UsageCounter from '../components/UsageCounter'
import PlanBadge from '../components/PlanBadge'
import ProgressBar from '../components/ProgressBar'
import SuccessState from '../components/SuccessState'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal from '../components/PaywallModal'
import UsageDisplay from '../components/UsageDisplay'
import VideoTrimmer from '../components/VideoTrimmer'
import { incrementUsage } from '../lib/usage'
import { uploadFileWithProgress, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError } from '../lib/api'
import { checkVideoPreflight } from '../lib/uploadPreflight'
import { getJobLifecycleTransition } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, getPersistedJobId, clearPersistedJobId } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import toast from 'react-hot-toast'
import { Subtitles } from 'lucide-react'

// ─── Phase 1 – Derived Transcript Utilities (client-side only) ─────────────────
const BRANCH_IDS = ['transcript', 'speakers', 'summary', 'chapters', 'highlights', 'keywords', 'clean', 'exports'] as const
type BranchId = (typeof BRANCH_IDS)[number]
const BRANCH_LABELS: Record<BranchId, string> = {
  transcript: 'Transcript',
  speakers: 'Speakers',
  summary: 'Summary',
  chapters: 'Chapters',
  highlights: 'Highlights',
  keywords: 'Keywords',
  clean: 'Clean',
  exports: 'Exports',
}
const BRANCH_ICONS: Record<BranchId, typeof FileText> = {
  transcript: FileText,
  speakers: Users,
  summary: ListOrdered,
  chapters: BookOpen,
  highlights: Sparkles,
  keywords: Hash,
  clean: Eraser,
  exports: FileCode,
}
const FILLER_WORDS = new Set(['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well', 'just', 'really', 'right', 'i mean', 'kind of', 'sort of'])
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how'])

/** Optional SEO overrides for alternate entry points (e.g. /video-to-text, /mp4-to-text). Do NOT duplicate logic here. */
export type VideoToTranscriptSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function VideoToTranscript(props: VideoToTranscriptSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState<number | null>(null)
  const [trimEnd, setTrimEnd] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<'preparing' | 'uploading' | 'processing'>('preparing')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<{
    downloadUrl: string
    fileName?: string
    segments?: { start: number; end: number; text: string; speaker?: string }[]
    summary?: { summary: string; bullets: string[]; actionItems?: string[] }
    chapters?: { title: string; startTime: number; endTime?: number }[]
  } | null>(null)
  const [transcriptPreview, setTranscriptPreview] = useState('')
  const [fullTranscript, setFullTranscript] = useState('')
  const [includeSummary, setIncludeSummary] = useState(true)
  const [includeChapters, setIncludeChapters] = useState(true)
  const [exportFormats, setExportFormats] = useState<('txt' | 'json' | 'docx' | 'pdf')[]>(['txt'])
  const [speakerDiarization, setSpeakerDiarization] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [availableMinutes, setAvailableMinutes] = useState<number | null>(null)
  const [usedMinutes, setUsedMinutes] = useState<number | null>(null)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  // Phase 1 – Derived Transcript Utilities: branch tab (no remount/refetch)
  const [activeBranch, setActiveBranch] = useState<BranchId>('transcript')
  const [cleanTranscriptEnabled, setCleanTranscriptEnabled] = useState(false)
  const transcriptScrollRef = useRef<HTMLDivElement>(null)
  const segmentRefsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const rehydratePollRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
          const res = jobStatus.result
          if (res?.segments?.length) {
            const textFromSegments = res.segments.map((s: { text: string }) => s.text).join('\n\n')
            setFullTranscript(textFromSegments)
            setTranscriptPreview(textFromSegments.substring(0, 500))
          } else if (res?.downloadUrl) {
            try {
              const transcriptResponse = await fetch(getAbsoluteDownloadUrl(res.downloadUrl))
              const transcriptText = await transcriptResponse.text()
              setTranscriptPreview(transcriptText.substring(0, 500))
              setFullTranscript(transcriptText)
            } catch {
              // ignore (e.g. ZIP file)
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
        // Resume polling for queued/processing
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
                  const text = await res.text()
                  setTranscriptPreview(text.substring(0, 500))
                  setFullTranscript(text)
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
            // other errors: keep polling
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
  }

  const handleProcess = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }

    // Minute-based limit check
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
        trackEvent('paywall_shown', { tool: 'video-to-transcript' })
        return
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    // Pre-flight: file size + duration vs plan limits (no upload if over limit)
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
        trackEvent('paywall_shown', { tool: 'video-to-transcript', reason: 'preflight' })
        return
      }
    } catch (e) {
      setStatus('idle')
      toast.error('Could not validate video. Try again.')
      return
    }

    try {
      setUploadPhase('uploading')
      trackEvent('processing_started', { tool: 'video-to-transcript' })

      const response = await uploadFileWithProgress(
        selectedFile,
        {
          toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
          trimmedStart: trimStart ?? undefined,
          trimmedEnd: trimEnd ?? undefined,
          includeSummary,
          includeChapters,
          exportFormats: exportFormats.length > 0 ? exportFormats : ['txt'],
          speakerDiarization,
        },
        { onProgress: (p) => setUploadProgress(p) }
      )

      persistJobId(location.pathname, response.jobId)
      setUploadPhase('processing')
      setUploadProgress(100)

      // Poll for status: run first poll immediately, then every 2s.
      // Lifecycle depends ONLY on jobStatus.status; missing result never causes failure.
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
            const res = jobStatus.result
            if (res?.segments?.length) {
              const textFromSegments = res.segments.map((s: { text: string }) => s.text).join('\n\n')
              setFullTranscript(textFromSegments)
              setTranscriptPreview(textFromSegments.substring(0, 500))
            } else if (res?.downloadUrl) {
              try {
                const transcriptResponse = await fetch(getAbsoluteDownloadUrl(res.downloadUrl))
                const transcriptText = await transcriptResponse.text()
                setTranscriptPreview(transcriptText.substring(0, 500))
                setFullTranscript(transcriptText)
              } catch (e) {
                // Ignore (e.g. ZIP)
              }
            }
            incrementUsage('video-to-transcript')
            trackEvent('processing_completed', { tool: 'video-to-transcript' })
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            toast.error('Processing failed. Please try again.')
          }
          // transition === 'continue': keep polling (queued | processing)
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

  const handleCopyToClipboard = async () => {
    if (transcriptPreview) {
      try {
        // Fetch full transcript
        if (result?.downloadUrl) {
          const response = await fetch(getAbsoluteDownloadUrl(result.downloadUrl))
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
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setStatus('idle')
    setProgress(0)
    setUploadPhase('preparing')
    setUploadProgress(0)
    setResult(null)
    setTranscriptPreview('')
    setFullTranscript('')
    setActiveBranch('transcript')
    setCleanTranscriptEnabled(false)
    setIncludeSummary(true)
    setIncludeChapters(true)
    setExportFormats(['txt'])
    setSpeakerDiarization(false)
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  // Phase 1 – scroll transcript to segment index; switch to Transcript branch first so segment is mounted
  const scrollToSegment = useCallback((index: number) => {
    setActiveBranch('transcript')
    setTimeout(() => {
      const el = segmentRefsRef.current.get(index)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }, [])

  // Phase 1 – Derived Transcript Utilities (client-side; failures must not affect transcript)
  const getParagraphs = useCallback((text: string): string[] => {
    if (!text.trim()) return []
    return text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  }, [])

  const getSpeakersData = useCallback((): { speaker: string; text: string }[] => {
    if (result?.segments?.length) {
      return result.segments.map((s) => ({ speaker: s.speaker || 'Speaker', text: s.text }))
    }
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return []
      const paras = getParagraphs(raw)
      return paras.map((p, i) => ({ speaker: `Speaker ${(i % 3) + 1}`, text: p }))
    } catch {
      return []
    }
  }, [result?.segments, fullTranscript, getParagraphs])

  const getSummarySchema = useCallback((): { summary?: string; bullets: string[]; decisions: string[]; action_items: string[]; key_points: string[] } => {
    if (result?.summary) {
      return {
        summary: result.summary.summary,
        bullets: result.summary.bullets || [],
        decisions: [],
        action_items: result.summary.actionItems || [],
        key_points: result.summary.bullets || [],
      }
    }
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return { decisions: [], action_items: [], key_points: [] }
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean)
      const decisions: string[] = []
      const action_items: string[] = []
      const key_points: string[] = []
      const decRe = /\b(decided|decision|agree|agreed|we'll|we will)\b/i
      const actRe = /\b(action|todo|to do|will \w+|need to|must)\b/i
      const keyRe = /\b(important|key point|takeaway|summary|in conclusion)\b/i
      for (const s of sentences) {
        const t = s.trim()
        if (!t) continue
        if (decRe.test(t)) decisions.push(t)
        else if (actRe.test(t)) action_items.push(t)
        else if (keyRe.test(t)) key_points.push(t)
      }
      return { decisions, action_items, key_points }
    } catch {
      return { decisions: [], action_items: [], key_points: [] }
    }
  }, [result?.summary, fullTranscript])

  const getChaptersData = useCallback((): { label: string; segmentIndex: number; startTime?: number }[] => {
    if (result?.chapters?.length) {
      const segs = result.segments || []
      return result.chapters.map((c) => {
        let segmentIndex = 0
        if (segs.length) {
          const idx = segs.findIndex((s) => s.start >= c.startTime)
          segmentIndex = idx >= 0 ? idx : segs.length - 1
        }
        return { label: c.title, segmentIndex, startTime: c.startTime }
      })
    }
    try {
      const paras = getParagraphs(fullTranscript || '')
      if (paras.length === 0) return []
      const chunkSize = Math.max(1, Math.ceil(paras.length / 6))
      const chapters: { label: string; segmentIndex: number }[] = []
      for (let i = 0; i < paras.length; i += chunkSize) {
        const first = paras[i]
        const preview = first.length > 40 ? first.slice(0, 40) + '…' : first
        chapters.push({ label: `Section ${chapters.length + 1}: ${preview}`, segmentIndex: i })
      }
      return chapters
    } catch {
      return []
    }
  }, [result?.chapters, fullTranscript, getParagraphs])

  const getHighlightsData = useCallback((): { type: string; text: string }[] => {
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return []
      const out: { type: string; text: string }[] = []
      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean)
      const defRe = /\b(means|defined as|is when|refers to)\b/i
      const conclRe = /\b(in conclusion|to conclude|therefore|thus|so we)\b/i
      const quoteRe = /^["'].*["']$|".*"/
      for (const s of sentences) {
        const t = s.trim()
        if (t.length < 15) continue
        if (defRe.test(t)) out.push({ type: 'Definition', text: t })
        else if (conclRe.test(t)) out.push({ type: 'Conclusion', text: t })
        else if (quoteRe.test(t) || t.endsWith('!')) out.push({ type: 'Quote', text: t })
        else if (/\b(important|critical|key)\b/i.test(t)) out.push({ type: 'Important', text: t })
      }
      return out
    } catch {
      return []
    }
  }, [fullTranscript])

  const getKeywordsData = useCallback((): { keyword: string; count: number; segmentIndex: number }[] => {
    try {
      const paras = getParagraphs(fullTranscript || '')
      if (paras.length === 0) return []
      const countMap = new Map<string, number>()
      const firstIndexMap = new Map<string, number>()
      paras.forEach((p, idx) => {
        const words = p.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOPWORDS.has(w))
        words.forEach((w) => {
          countMap.set(w, (countMap.get(w) || 0) + 1)
          if (!firstIndexMap.has(w)) firstIndexMap.set(w, idx)
        })
      })
      return Array.from(countMap.entries())
        .filter(([, c]) => c >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 24)
        .map(([keyword, count]) => ({ keyword, count, segmentIndex: firstIndexMap.get(keyword) ?? 0 }))
    } catch {
      return []
    }
  }, [fullTranscript, getParagraphs])

  const getCleanTranscript = useCallback((): string => {
    try {
      const raw = fullTranscript || ''
      if (!raw.trim()) return ''
      const paras = getParagraphs(raw)
      return paras
        .map((p) =>
          p.split(/\s+/)
            .filter((w) => !FILLER_WORDS.has(w.toLowerCase().replace(/[^\w]/g, '')))
            .join(' ')
            .replace(/\s+/g, ' ')
        )
        .map((s) => (s.length ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s))
        .join('\n\n')
    } catch {
      return ''
    }
  }, [fullTranscript, getParagraphs])

  const transcriptParagraphs = getParagraphs(fullTranscript || '')
  const isPaidPlan = typeof window !== 'undefined' && (localStorage.getItem('plan') || 'free').toLowerCase() !== 'free'

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="mb-4">
            <PlanBadge />
          </div>
          <div className="bg-violet-100/80 rounded-2xl p-5 w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText className="h-8 w-8 text-violet-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">{seoH1 ?? 'Video → Transcript'}</h1>
          <p className="text-lg text-gray-600 mb-6">
            {seoIntro ?? 'Extract spoken text from any video in seconds'}
          </p>
          <UsageCounter />
          <UsageDisplay />
        </div>

        {/* Before upload: muted branch placeholders (visual only, non-interactive) */}
        {status === 'idle' && (
          <div className="mb-6 rounded-2xl bg-gray-50/80 px-4 py-3 shadow-sm" aria-hidden="true">
            <div className="flex flex-wrap gap-3 justify-center items-center">
              {BRANCH_IDS.map((id) => {
                const Icon = BRANCH_ICONS[id]
                return (
                  <span
                    key={id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-gray-400"
                    title={BRANCH_LABELS[id]}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="text-xs font-medium text-gray-400">{BRANCH_LABELS[id]}</span>
                  </span>
                )
              })}
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">Upload a video to unlock these views</p>
          </div>
        )}

        {/* Phase 1 – Branch Bar (below header; only when transcript ready) */}
        {status === 'completed' && result && (
          <div className="mb-6 rounded-2xl bg-gray-50/90 px-3 py-3 shadow-sm" role="tablist" aria-label="Transcript branches">
            <div className="flex flex-wrap gap-2 justify-center items-center">
              {BRANCH_IDS.map((id) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeBranch === id}
                  onClick={() => setActiveBranch(id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeBranch === id
                      ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-200 ring-offset-2 ring-offset-gray-50'
                      : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-800 hover:shadow-sm border border-gray-100'
                  }`}
                >
                  {BRANCH_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
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
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                  <p className="text-sm font-medium text-gray-700">Options</p>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={includeSummary} onChange={(e) => setIncludeSummary(e.target.checked)} className="rounded border-gray-300" />
                    Include AI summary & bullets
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={includeChapters} onChange={(e) => setIncludeChapters(e.target.checked)} className="rounded border-gray-300" />
                    Auto-generate chapters
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={speakerDiarization} onChange={(e) => setSpeakerDiarization(e.target.checked)} className="rounded border-gray-300" />
                    Speaker labels (who said what)
                  </label>
                  <div className="flex flex-wrap gap-2 items-center pt-1">
                    <span className="text-sm text-gray-600">Export:</span>
                    {(['txt', 'json', 'docx', 'pdf'] as const).map((fmt) => (
                      <label key={fmt} className="flex items-center gap-1 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={exportFormats.includes(fmt)}
                          onChange={(e) => {
                            if (e.target.checked) setExportFormats((f) => [...f, fmt])
                            else setExportFormats((f) => f.filter((x) => x !== fmt))
                          }}
                          className="rounded border-gray-300"
                        />
                        {fmt.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
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
          </div>
        )}

        {status === 'processing' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center">
            <Loader2 className="h-12 w-12 text-violet-600 animate-spin mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-800 mb-4">
              {uploadPhase === 'preparing' && 'Preparing video…'}
              {uploadPhase === 'uploading' && `Uploading (${uploadProgress}%)`}
              {uploadPhase === 'processing' && 'Processing audio and generating transcript'}
            </p>
            <ProgressBar
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              status={
                uploadPhase === 'uploading'
                  ? `Uploading… ${uploadProgress}%`
                  : queuePosition !== undefined
                    ? `Processing… ${queuePosition} jobs ahead of you.`
                    : 'Processing audio and generating transcript'
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

            {/* Phase 1 – Trunk (Transcript) or branch content; transcript always preserved */}
            {activeBranch === 'transcript' && (
              <>
                {transcriptPreview && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Transcript</h3>
                      <button
                        onClick={handleCopyToClipboard}
                        className="flex items-center space-x-2 text-violet-600 hover:text-violet-700 font-medium text-sm"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy to clipboard</span>
                      </button>
                    </div>
                    <div ref={transcriptScrollRef} className="bg-gray-50/80 rounded-xl p-4 max-h-96 overflow-y-auto">
                      {fullTranscript ? (
                        transcriptParagraphs.map((p, i) => (
                          <div
                            key={i}
                            ref={(el) => {
                              if (el) segmentRefsRef.current.set(i, el)
                            }}
                            className="text-sm text-gray-700 mb-3 last:mb-0"
                          >
                            {p}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{transcriptPreview}...</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeBranch === 'speakers' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-600" />
                  Speakers
                </h3>
                {(() => {
                  const data = getSpeakersData()
                  if (!data.length) {
                    return (
                      <div className="rounded-xl bg-gray-50/80 p-4">
                        <p className="text-gray-600 text-sm font-medium mb-1">Speakers</p>
                        <p className="text-gray-500 text-sm">Groups transcript by speaker. Empty when the transcript has no paragraph breaks to assign.</p>
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {data.map((item, i) => (
                        <div key={i} className="border-l-2 border-violet-300 pl-3 py-1">
                          <span className="text-xs font-semibold text-violet-600 uppercase">{item.speaker}</span>
                          <p className="text-sm text-gray-700 mt-0.5">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {activeBranch === 'summary' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-violet-600" />
                  Summary
                </h3>
                {(() => {
                  const schema = getSummarySchema()
                  const hasServer = schema.summary || (schema.bullets && schema.bullets.length > 0)
                  const hasAny = hasServer || schema.decisions.length || schema.action_items.length || schema.key_points.length
                  if (!hasAny) {
                    return (
                      <div className="rounded-xl bg-gray-50/80 p-4">
                        <p className="text-gray-600 text-sm font-medium mb-1">Summary</p>
                        <p className="text-gray-500 text-sm">Enable &quot;Include AI summary&quot; when transcribing to get a paragraph and bullet points.</p>
                      </div>
                    )
                  }
                  return (
                    <div className="grid gap-4">
                      {schema.summary && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Overview</h4>
                          <p className="text-sm text-gray-700">{schema.summary}</p>
                        </div>
                      )}
                      {schema.bullets && schema.bullets.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Key points</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                            {schema.bullets.map((k, i) => <li key={i}>{k}</li>)}
                          </ul>
                        </div>
                      )}
                      {schema.action_items && schema.action_items.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Action items</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                            {schema.action_items.map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                      {!hasServer && schema.decisions.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Decisions</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                            {schema.decisions.map((d, i) => <li key={i}>{d}</li>)}
                          </ul>
                        </div>
                      )}
                      {!hasServer && schema.key_points.length > 0 && schema.key_points !== schema.bullets && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-600 mb-2">Key points</h4>
                          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                            {schema.key_points.map((k, i) => <li key={i}>{k}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {activeBranch === 'chapters' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-violet-600" />
                  Chapters
                </h3>
                {(() => {
                  const chapters = getChaptersData()
                  if (!chapters.length) {
                    return (
                      <div className="rounded-xl bg-gray-50/80 p-4">
                        <p className="text-gray-600 text-sm font-medium mb-1">Chapters</p>
                        <p className="text-gray-500 text-sm">Section headings derived from transcript paragraphs. Empty when the transcript has no paragraph structure.</p>
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {chapters.map((ch, i) => (
                        <button
                          key={i}
                          onClick={() => scrollToSegment(ch.segmentIndex)}
                          className="block w-full text-left px-3 py-2 rounded-xl bg-gray-50/80 hover:bg-violet-50/80 text-sm text-gray-800 border border-gray-100"
                        >
                          {ch.label}
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {activeBranch === 'highlights' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-600" />
                  Highlights / Key moments
                </h3>
                {(() => {
                  const items = getHighlightsData()
                  if (!items.length) {
                    return (
                      <div className="rounded-xl bg-gray-50/80 p-4">
                        <p className="text-gray-600 text-sm font-medium mb-1">Highlights</p>
                        <p className="text-gray-500 text-sm">Definitions, conclusions, quotes, and important statements. Empty when no such segments are detected in the transcript.</p>
                      </div>
                    )
                  }
                  return (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {items.map((item, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-xs font-semibold text-violet-600 shrink-0">{item.type}</span>
                          <p className="text-sm text-gray-700">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {activeBranch === 'keywords' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Hash className="h-5 w-5 text-violet-600" />
                  Keywords / Topic index
                </h3>
                {(() => {
                  const kw = getKeywordsData()
                  if (!kw.length) {
                    return (
                      <div className="rounded-xl bg-gray-50/80 p-4">
                        <p className="text-gray-600 text-sm font-medium mb-1">Keywords</p>
                        <p className="text-gray-500 text-sm">Repeated terms that link to transcript sections. Empty when no word appears often enough to qualify.</p>
                      </div>
                    )
                  }
                  return (
                    <div className="flex flex-wrap gap-2">
                      {kw.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => scrollToSegment(item.segmentIndex)}
                          className="px-3 py-1.5 rounded-full bg-violet-100 text-violet-800 text-sm hover:bg-violet-200"
                        >
                          {item.keyword} ({item.count})
                        </button>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {activeBranch === 'clean' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Clean transcript</h3>
                <p className="text-sm text-gray-500 mb-4">Filler words removed, casing normalized, paragraph grouping. Original transcript is always preserved in the Transcript branch.</p>
                <label className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={cleanTranscriptEnabled}
                    onChange={(e) => setCleanTranscriptEnabled(e.target.checked)}
                  />
                  <span className="text-sm">Show cleaned version</span>
                </label>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  {cleanTranscriptEnabled ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{getCleanTranscript() || 'No content.'}</p>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{fullTranscript || 'No transcript.'}</p>
                  )}
                </div>
              </div>
            )}

            {activeBranch === 'exports' && (
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-violet-600" />
                  Exports
                </h3>
                <p className="text-sm text-gray-500 mb-5">Download transcript and derived data in your preferred format.</p>
                {!fullTranscript ? (
                  <div className="rounded-xl bg-gray-50/80 p-4">
                    <p className="text-gray-600 text-sm font-medium mb-1">Exports</p>
                    <p className="text-gray-500 text-sm">Structured exports (JSON, CSV, Markdown, Notion) appear here once transcript data is available.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 mb-5">
                      {isPaidPlan ? 'Full download available.' : 'Free plan: preview only. Upgrade for full export download.'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(['json', 'csv', 'markdown', 'notion'] as const).map((format) => {
                        const buildExport = () => {
                          const schema = getSummarySchema()
                          const speakers = getSpeakersData()
                          const chapters = getChaptersData()
                          const highlights = getHighlightsData()
                          const keywords = getKeywordsData()
                          if (format === 'json') {
                            return JSON.stringify({ summary: schema, speakers, chapters, highlights, keywords, rawPreview: fullTranscript.slice(0, 500) }, null, 2)
                          }
                          if (format === 'csv') {
                            const rows = [['type', 'content'], ['raw_preview', fullTranscript.slice(0, 300).replace(/"/g, '""')]]
                            speakers.forEach((s) => rows.push(['speaker', `"${s.speaker}","${s.text.replace(/"/g, '""')}"`]))
                            return rows.map((r) => r.join(',')).join('\n')
                          }
                          if (format === 'markdown') {
                            return `# Transcript\n\n${schema.key_points.map((k) => `- ${k}`).join('\n')}\n\n## Speakers\n\n${speakers.map((s) => `**${s.speaker}**\n${s.text}`).join('\n\n')}\n\n## Raw preview\n\n${fullTranscript.slice(0, 500)}...`
                          }
                          if (format === 'notion') {
                            return JSON.stringify(speakers.map((s) => ({ type: 'paragraph', rich_text: [{ text: { content: `[${s.speaker}] ${s.text}` } }] })), null, 2)
                          }
                          return ''
                        }
                        const content = buildExport()
                        const preview = content.slice(0, 400) + (content.length > 400 ? '…' : '')
                        const handleDownload = () => {
                          if (!isPaidPlan) {
                            toast('Upgrade for full export download.')
                            return
                          }
                          const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' })
                          const a = document.createElement('a')
                          a.href = URL.createObjectURL(blob)
                          a.download = `transcript-export.${format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'md'}`
                          a.click()
                          URL.revokeObjectURL(a.href)
                          toast.success('Download started')
                        }
                        return (
                          <div key={format} className="rounded-xl bg-gray-50/80 p-4">
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-sm font-medium capitalize text-gray-800">{format}</span>
                              <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 text-violet-600 hover:text-violet-700 text-sm font-medium"
                              >
                                <Download className="h-4 w-4 shrink-0" />
                                {isPaidPlan ? 'Download' : 'Preview only'}
                              </button>
                            </div>
                            <pre className="text-xs text-gray-600 bg-white/80 p-3 rounded-lg max-h-32 overflow-y-auto whitespace-pre-wrap break-words border border-gray-100">
                              {preview}
                            </pre>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
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
          usedMinutes={usedMinutes ?? 0}
          availableMinutes={availableMinutes ?? 0}
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
