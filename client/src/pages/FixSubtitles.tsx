import { useState, useEffect, useRef, Suspense, lazy, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Wrench, CheckCircle, Film, Languages, MessageSquare,
  AlignLeft, Zap, Layers, Clock, Scissors, UploadCloud, X,
  AlertTriangle, Info,
} from 'lucide-react'
import FailedState from '../components/FailedState'
import CoreToolSeoDepth from '../components/CoreToolSeoDepth'
import FreePlanNudge from '../components/FreePlanNudge'
import SecondJobUpgradeNudge from '../components/SecondJobUpgradeNudge'
import PaywallModal, { type PaywallReason } from '../components/PaywallModal'
import { isPaidPlan } from '../lib/plans'
import { WATERMARK_DOC_FOOTER, WATERMARK_DOC_HEADER, watermarkTextExport, drawPdfFreePlanWatermark } from '../lib/watermark'
import SamplesModule from '../components/SamplesModule'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { TranslateResult } from '../components/figma/TranslateResult'
import ResultUpgradeCard from '../components/ResultUpgradeCard'
import { Checkbox } from '../components/figma/FormControls'
import type { SubtitleRow } from '../components/SubtitleEditor'
const SubtitleQAReview = lazy(() => import('../components/SubtitleQAReview'))
import { incrementUsage } from '../lib/usage'
import { incrementJobCompletedCount } from '../lib/jobCount'
import { uploadFileWithProgress, uploadFixSubtitlesDual, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError, getAuthToken, claimGuestJob } from '../lib/api'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl } from '../lib/apiBase'
import { persistJobId, clearPersistedJobId, getPersistedJobId, getPersistedJobToken } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import { isLoggedIn } from '../lib/auth'
import JobAuthGateModal from '../components/JobAuthGateModal'
// import { texJobStarted, texJobCompleted, texJobFailed } from '../tex'
import toast from 'react-hot-toast'
import { trackAppEvent } from '../lib/feedbackEvents'
import { exportFileStem, joinExportFilename } from '../lib/exportFileNames'
// import { emitToolCompleted } from '../workflow/workflowStore'

// ─── Finding type metadata ────────────────────────────────────────────────────
const FINDING_META: Record<string, { icon: typeof Film; colorText: string; colorBg: string; colorBorder: string; label: string }> = {
  overlap:       { icon: Layers,     colorText: 'text-orange-600 dark:text-orange-400',  colorBg: 'bg-orange-50 dark:bg-orange-950/20',    colorBorder: 'border-orange-200 dark:border-orange-800',   label: 'Overlapping cues' },
  long_line:     { icon: AlignLeft,  colorText: 'text-blue-600 dark:text-blue-400',      colorBg: 'bg-blue-50 dark:bg-blue-950/20',         colorBorder: 'border-blue-200 dark:border-blue-800',       label: 'Line too long (CPL)' },
  fast_reading:  { icon: Zap,        colorText: 'text-amber-600 dark:text-amber-400',    colorBg: 'bg-amber-50 dark:bg-amber-950/20',       colorBorder: 'border-amber-200 dark:border-amber-800',     label: 'Reading speed (CPS)' },
  reading_speed: { icon: Zap,        colorText: 'text-amber-600 dark:text-amber-400',    colorBg: 'bg-amber-50 dark:bg-amber-950/20',       colorBorder: 'border-amber-200 dark:border-amber-800',     label: 'Reading speed (CPS)' },
  large_gap:     { icon: Clock,      colorText: 'text-gray-500 dark:text-gray-400',      colorBg: 'bg-gray-50 dark:bg-gray-900/60',         colorBorder: 'border-gray-200 dark:border-gray-700',       label: 'Large gap' },
  scene_cut:     { icon: Scissors,   colorText: 'text-violet-600 dark:text-violet-400',  colorBg: 'bg-violet-50 dark:bg-violet-950/20',     colorBorder: 'border-violet-200 dark:border-violet-800',   label: 'Spans scene cut' },
  invalid_timing:{ icon: AlertTriangle, colorText: 'text-red-600 dark:text-red-400',     colorBg: 'bg-red-50 dark:bg-red-950/20',           colorBorder: 'border-red-200 dark:border-red-800',         label: 'Invalid timing' },
}
const DEFAULT_FINDING_META = { icon: AlertTriangle, colorText: 'text-gray-600 dark:text-gray-400', colorBg: 'bg-gray-50 dark:bg-gray-900', colorBorder: 'border-gray-200 dark:border-gray-700', label: 'Issue' }

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
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null)
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
  const [originalRows, setOriginalRows] = useState<SubtitleRow[]>([])
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signup-combo' | 'login'>('signup-combo')
  const pendingDownloadRef = useRef<(() => void) | null>(null)
  const [showProPaywall, setShowProPaywall] = useState(false)
  const [proPaywallReason, setProPaywallReason] = useState<PaywallReason>('PDF_EXPORT')

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const canEdit = isPaidPlan(plan)

  const fallbackFixedName = useMemo(() => {
    const ext = selectedFile?.name.toLowerCase().endsWith('.vtt') ? '.vtt' : '.srt'
    return joinExportFilename(exportFileStem(selectedFile?.name, 'subtitles'), 'subtitles_fixed', ext)
  }, [selectedFile?.name])

  const changedCues = useMemo(() => {
    if (!subtitleRows.length || !originalRows.length) return []
    return subtitleRows.reduce<Array<{ index: number; before: SubtitleRow; after: SubtitleRow }>>((acc, fixedRow, i) => {
      const orig = originalRows[i]
      if (!orig) return acc
      if (orig.startTime !== fixedRow.startTime || orig.endTime !== fixedRow.endTime || orig.text.trim() !== fixedRow.text.trim()) {
        acc.push({ index: i, before: orig, after: fixedRow })
      }
      return acc
    }, [])
  }, [subtitleRows, originalRows])

  useEffect(() => {
    if (result?.downloadUrl) setFreeExportsUsed(0)
  }, [result?.downloadUrl])

  useEffect(() => {
    if (status === 'completed' && !isLoggedIn()) {
      setShowAuthModal(true)
    }
  }, [status])

  // Restore a completed job after page reload (e.g. user refreshed after signing in)
  useEffect(() => {
    const jobId = getPersistedJobId(location.pathname)
    if (!jobId || !isLoggedIn()) return
    const jobToken = getPersistedJobToken(location.pathname)
    ;(async () => {
      try {
        const jobStatus = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
        const transition = getJobLifecycleTransition(jobStatus)
        if (transition !== 'completed') return
        setResult(jobStatus.result ?? null)
        setIssues(jobStatus.result?.issues ?? [])
        setWarnings(jobStatus.result?.warnings ?? [])
        setShowIssues(true)
        if (jobStatus.result?.downloadUrl) {
          setStatus('completed')
          try {
            const token = getAuthToken()
            const res = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl), {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            const txt = await res.text()
            setSubtitleRows(parseSubtitlesToRows(txt))
          } catch { /* non-blocking */ }
        }
      } catch { /* non-blocking */ }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Object URL for the optional dual-uploaded video, so the QA review editor can show a
  // synced video preview the same way Video → Subtitles does.
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile)
      setVideoPreviewUrl(url)
      return () => {
        setVideoPreviewUrl(null)
        setTimeout(() => URL.revokeObjectURL(url), 0)
      }
    }
    setVideoPreviewUrl(null)
  }, [videoFile])

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

  const rowsToVtt = (rows: SubtitleRow[]): string => {
    const vttTime = (t: string) => t.replace(',', '.')
    return 'WEBVTT\n\n' + rows
      .map((r, idx) => `${idx + 1}\n${vttTime(r.startTime)} --> ${vttTime(r.endTime)}\n${r.text}`)
      .join('\n\n')
  }

  const rowsToTxt = (rows: SubtitleRow[]): string =>
    rows.map((r) => r.text).join('\n\n')

  const exportSubtitlesToPdf = async (rows: SubtitleRow[], filename: string, watermark?: string) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 20
    const textWidth = pageW - margin * 2
    const lineH = 6
    let y = margin

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) { doc.addPage(); y = margin }
    }

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Subtitle Script', margin, y)
    y += lineH * 1.8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text('Generated by VideoText.io', margin, y)
    if (watermark) { y += lineH * 0.9; doc.text(watermark, margin, y) }
    y += lineH * 2
    doc.setTextColor(0)
    doc.setFontSize(10)

    for (const row of rows) {
      const bodyLines = doc.splitTextToSize(row.text || ' ', textWidth - 8)
      ensureSpace(lineH + lineH * bodyLines.length + lineH * 0.8)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 40, 160)
      doc.text(`${row.index}  ${row.startTime} → ${row.endTime}`, margin, y)
      doc.setTextColor(0)
      y += lineH

      doc.setFont('helvetica', 'normal')
      doc.text(bodyLines, margin + 4, y)
      y += lineH * bodyLines.length + lineH * 0.8
    }

    if (watermark) drawPdfFreePlanWatermark(doc)

    doc.save(filename)
  }

  const exportSubtitlesToDocx = async (rows: SubtitleRow[], filename: string, watermark?: string) => {
    const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx')
    const children: any[] = [
      new Paragraph({ text: 'Subtitle Script', heading: HeadingLevel.HEADING_1 }),
    ]
    if (watermark) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: WATERMARK_DOC_HEADER, bold: true, color: '666666', size: 20 })],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: WATERMARK_DOC_FOOTER, italics: true, color: '888888', size: 18 })],
          spacing: { after: 200 },
        }),
      )
    }
    for (const row of rows) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${row.index}  ${row.startTime} → ${row.endTime}`, bold: true, color: '5028A0' })],
          spacing: { before: 160, after: 40 },
        }),
        new Paragraph({
          children: [new TextRun({ text: row.text })],
          spacing: { after: 120 },
        }),
      )
    }
    const doc = new Document({ sections: [{ children }] })
    const blob = new Blob([await Packer.toBlob(doc)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const triggerBlobDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const ensureUsageAvailable = async () => {
    if (!isLoggedIn()) return true
    try {
      const usage = await getCurrentUsage({ skipCache: true })
      const remaining = usage.remaining ?? (usage.limit ?? 3) - (usage.used ?? usage.usage.importCount ?? 0)
      if (usage.plan === 'free' && usage.quotaType === 'imports' && remaining <= 0) {
        setProPaywallReason('FREE_DAILY_LIMIT_REACHED'); setShowProPaywall(true); return false
      }
    } catch { /* Usage failure must not block processing. */ }
    return true
  }

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error('Please select a file')
      return
    }
    if (!(await ensureUsageAvailable())) return

    try {
      setStatus('analyzing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      const startedAt = Date.now()
      processingStartedAtRef.current = startedAt
      // texJobStarted()

      const response = videoFile
        ? await uploadFixSubtitlesDual(selectedFile, videoFile, { onProgress: (p) => setUploadProgress(p) })
        : await uploadFileWithProgress(selectedFile, {
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
            if (isLoggedIn() && !jobStatus.requiresAuth) {
              setResult(jobStatus.result ?? null)
              setIssues(jobStatus.result?.issues ?? [])
              setWarnings(jobStatus.result?.warnings ?? [])
              setShowIssues(true)
            } else {
              setShowAuthModal(true)
              setResult({ downloadUrl: '' })
            }
            setStatus('idle')
            trackAppEvent('transcription_completed', { toolId: 'fix-subtitles' })
            // texJobCompleted(Date.now() - processingStartedAtRef.current, 'fix-subtitles')
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            // texJobFailed()
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
        // texJobFailed()
      }
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleAutoFix = async () => {
    if (!selectedFile) return
    if (!(await ensureUsageAvailable())) return

    try {
      setStatus('processing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      const startedAtFix = Date.now()
      processingStartedAtRef.current = startedAtFix

      // Snapshot original content for before/after diff
      try {
        const originalText = await selectedFile.text()
        setOriginalRows(parseSubtitlesToRows(originalText))
      } catch { /* non-blocking */ }
      // texJobStarted()

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
            if (isLoggedIn() && !jobStatus.requiresAuth) {
              setResult(jobStatus.result ?? null)
            } else {
              setShowAuthModal(true)
              setResult({ downloadUrl: '' })
            }
            setIssues(isLoggedIn() && !jobStatus.requiresAuth ? (jobStatus.result?.issues ?? []) : [])
            setWarnings(isLoggedIn() && !jobStatus.requiresAuth ? (jobStatus.result?.warnings ?? []) : [])
            setShowIssues(isLoggedIn() && !jobStatus.requiresAuth)
            incrementUsage('fix-subtitles')
            trackAppEvent('transcription_completed', { toolId: 'fix-subtitles' })
            try {
              const nextJobCount = incrementJobCompletedCount()
              trackEvent('job_completed', {
                job_id: response.jobId,
                tool_type: BACKEND_TOOL_TYPES.FIX_SUBTITLES,
                processing_time_ms: processingMs,
                job_count: nextJobCount,
              })
            } catch {
              /* non-blocking */
            }
            if (isLoggedIn() && jobStatus.result?.downloadUrl) {
              try {
                const token = getAuthToken()
                const res = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl), {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                })
                if (!res.ok) throw new Error(`Preview fetch failed (${res.status})`)
                const txt = await res.text()
                setSubtitleRows(parseSubtitlesToRows(txt))
              } catch {
                setSubtitleRows([])
                toast.error("Fixed subtitles are ready, but the preview couldn't load. Use Download below to get the file.")
              }
            }
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            // texJobFailed()
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
        // texJobFailed()
      }
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setVideoFile(null)
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
    setOriginalRows([])
    setShowAuthModal(false)
  }

  const getDownloadUrl = () => {
    if (!result?.downloadUrl) return ''
    return getAbsoluteDownloadUrl(result.downloadUrl)
  }

  function requireAuthForDownload(action: () => void) {
    if (isLoggedIn()) {
      action()
    } else {
      pendingDownloadRef.current = action
      setShowAuthModal(true)
    }
  }

  const downloadFixedSubtitles = async () => {
    if (!result?.downloadUrl) {
      toast.error('Download is not ready yet')
      return
    }

    if (plan === 'free' && freeExportsUsed >= 2) {
      toast('You\'ve used your 2 free downloads. Upgrade for more.')
      return
    }

    try {
      const token = getAuthToken()
      const downloadUrl = `${getDownloadUrl()}`
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Download request failed')

      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = result.fileName || fallbackFixedName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(objectUrl)

      try {
        trackEvent('result_downloaded', { tool: 'fix-subtitles', plan })
        trackAppEvent('export_clicked', { toolId: 'fix-subtitles' })
      } catch { /* non-blocking */ }
      if (plan === 'free') {
        setFreeExportsUsed((prev) => prev + 1)
        toast.success('Download started (with watermark)')
      } else {
        toast.success('Download started')
      }
    } catch {
      toast.error('Download failed')
    }
  }

  const stemName = result?.fileName
    ? result.fileName.replace(/\.(srt|vtt)$/i, '')
    : fallbackFixedName.replace(/\.(srt|vtt)$/i, '')

  const exportRows = subtitleRows.length > 0 ? subtitleRows : []
  const isPaid = isPaidPlan(plan)
  const exportWatermark = !isPaid ? WATERMARK_DOC_FOOTER : undefined

  const handleExportSrt = () => {
    if (exportRows.length > 0) {
      const content = rowsToSrt(exportRows)
      const payload = isPaid ? content : watermarkTextExport(content, 'srt')
      triggerBlobDownload(payload, `${stemName}.srt`, 'text/plain')
      trackAppEvent('export_clicked', { toolId: 'fix-subtitles', format: 'srt' })
      toast.success(isPaid ? 'Download started' : 'Download started (with watermark)')
    } else {
      downloadFixedSubtitles()
    }
  }

  const handleExportVtt = () => {
    if (!exportRows.length) { toast.error('No subtitle data to export'); return }
    const content = rowsToVtt(exportRows)
    const payload = isPaid ? content : watermarkTextExport(content, 'vtt')
    triggerBlobDownload(payload, `${stemName}.vtt`, 'text/vtt')
    trackAppEvent('export_clicked', { toolId: 'fix-subtitles', format: 'vtt' })
  }

  const handleExportTxt = () => {
    if (!exportRows.length) { toast.error('No subtitle data to export'); return }
    const content = rowsToTxt(exportRows)
    const payload = isPaid ? content : watermarkTextExport(content, 'txt')
    triggerBlobDownload(payload, `${stemName}.txt`, 'text/plain')
    trackAppEvent('export_clicked', { toolId: 'fix-subtitles', format: 'txt' })
  }

  const handleExportPdf = async () => {
    if (!isPaid) { setProPaywallReason('PDF_EXPORT'); setShowProPaywall(true); return }
    if (!exportRows.length) { toast.error('No subtitle data to export'); return }
    try {
      await exportSubtitlesToPdf(exportRows, `${stemName}.pdf`, exportWatermark)
      trackAppEvent('export_clicked', { toolId: 'fix-subtitles', format: 'pdf' })
    } catch { toast.error('PDF export failed') }
  }

  const handleExportDocx = async () => {
    if (!isPaid) { setProPaywallReason('WORD_EXPORT'); setShowProPaywall(true); return }
    if (!exportRows.length) { toast.error('No subtitle data to export'); return }
    try {
      await exportSubtitlesToDocx(exportRows, `${stemName}.docx`, exportWatermark)
      trackAppEvent('export_clicked', { toolId: 'fix-subtitles', format: 'docx' })
    } catch { toast.error('Word export failed') }
  }

  const renderIssueEditor = () => {
    const sceneCuts = warnings.filter(w => w.type === 'scene_cut')
    const otherWarnings = warnings.filter(w => w.type !== 'scene_cut')
    const totalFindings = issues.length + warnings.length
    if (totalFindings === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950/20"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">No issues found after fixing</p>
              <p className="mt-0.5 text-sm text-green-700 dark:text-green-300">Your subtitle file passed all validation checks.</p>
            </div>
          </div>
        </motion.div>
      )
    }

    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
        aria-label="Findings after fix"
      >
        {/* Summary */}
        <div className="flex flex-wrap gap-2 pb-1">
          {issues.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {issues.length} fixed
            </span>
          )}
          {otherWarnings.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {otherWarnings.length} warning{otherWarnings.length !== 1 ? 's' : ''}
            </span>
          )}
          {sceneCuts.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <Scissors className="h-3 w-3" />
              {sceneCuts.length} scene cut{sceneCuts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Scene cuts — manual review required */}
        {sceneCuts.length > 0 && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
            <div className="mb-3 flex items-center gap-2">
              <Scissors className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Scene cuts — manual review required</p>
            </div>
            <ol className="space-y-2">
              {sceneCuts.map((w, i) => (
                <li key={i} className="rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm dark:border-violet-800 dark:bg-gray-900">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium text-violet-800 dark:text-violet-200">{w.message}</p>
                    {w.line != null && <span className="shrink-0 font-mono text-xs text-violet-500">Cue {w.line}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Auto-fixed issues */}
        {issues.length > 0 && (
          <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="border-b border-gray-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Auto-fixed
            </p>
            <ol className="divide-y divide-gray-100 dark:divide-gray-800">
              {issues.map((issue, i) => {
                const meta = FINDING_META[issue.type] ?? DEFAULT_FINDING_META
                const Icon = meta.icon
                return (
                  <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.colorText}`} />
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${meta.colorText}`}>{meta.label}</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{issue.message}</span>
                    </div>
                    {issue.index != null && (
                      <span className="shrink-0 font-mono text-xs text-gray-400">Cue {issue.index}</span>
                    )}
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* Remaining warnings */}
        {otherWarnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Informational</p>
            <ol className="space-y-2">
              {otherWarnings.map((w, i) => {
                const meta = FINDING_META[w.type] ?? DEFAULT_FINDING_META
                const Icon = meta.icon
                return (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.colorText}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-amber-900 dark:text-amber-100">{w.message}</p>
                    </div>
                    {w.line != null && <span className="shrink-0 font-mono text-xs text-amber-500">Cue {w.line}</span>}
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </motion.section>
    )
  }

  const breadcrumbs = [{ label: 'Fix Subtitles', href: '/fix-subtitles' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Fix Subtitles — Timing, CPS & Lines',
    subtitle: seoIntro ?? 'Fix overlapping timestamps, long lines, CPS/reading-speed, and formatting in SRT/VTT. Files deleted after processing. 3 free imports/mo.',
    icon: <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    tags: ['CPS', 'CPL', 'Timing', 'Scene Cuts', 'Line Breaks', 'Filler Words'],
    sidebar: null,
    compactToolHeader: true,
    coreToolPath: '/fix-subtitles',
    currentStepLabel:
      status === 'completed'
        ? 'Subtitles fixed'
        : selectedFile
          ? 'Upload configured'
          : 'Ready to upload',
  }

  return (
    <>
      <ToolLayout {...layoutProps}>
        {status === 'idle' && !selectedFile && !showIssues && (
          <div className="space-y-4">
            <UploadZone
              immediateSelect
              onFileSelect={handleFileSelect}
              initialFiles={selectedFile ? [selectedFile] : null}
              onRemove={() => { setSelectedFile(null); setIssues([]); setShowIssues(false) }}
              acceptedFormats={['SRT', 'VTT']}
              acceptAttribute=".srt,.vtt"
              maxSize="10 MB"
              title="Upload a subtitle file"
            />
            {location.pathname === '/fix-subtitles' && (
              <SamplesModule sourcePath={location.pathname} samplesHref="/samples#fix" />
            )}
          </div>
        )}

        {status === 'idle' && selectedFile && !showIssues && (
          <ProcessingInterface
            file={{
              name: selectedFile.name,
              size: `${((selectedFile.size ?? 0) / 1024).toFixed(2)} KB`,
            }}
            onRemove={() => { setSelectedFile(null); setVideoFile(null); setIssues([]); setShowIssues(false) }}
            actionLabel={videoFile ? 'Analyze + Detect Scene Cuts' : 'Analyze Subtitles'}
            onAction={() => handleAnalyze()}
            actionLoading={false}
            showVideoPlayer={false}
          >
            {/* Optional video upload for scene cut detection */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Scissors className="h-4 w-4 text-violet-500" />
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Scene cut detection
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-normal text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    optional
                  </span>
                </p>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Upload the source video to detect camera cuts. Any subtitle that spans a cut will be flagged — the class of issue no automated tool can fix without the original footage.
              </p>
              {videoFile ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-2.5 dark:border-violet-800 dark:bg-violet-950/20"
                >
                  <Film className="h-4 w-4 shrink-0 text-violet-500" />
                  <span className="flex-1 truncate text-sm font-medium text-violet-800 dark:text-violet-200">{videoFile.name}</span>
                  <button
                    onClick={() => setVideoFile(null)}
                    className="shrink-0 rounded p-0.5 text-violet-400 transition-colors hover:bg-violet-200 hover:text-violet-700 dark:hover:bg-violet-900/40 dark:hover:text-violet-300"
                    aria-label="Remove video"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ) : (
                <label className="group cursor-pointer">
                  <input
                    type="file"
                    accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideoFile(f) }}
                  />
                  <span className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 transition-colors group-hover:border-violet-400 group-hover:bg-violet-50 group-hover:text-violet-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:group-hover:border-violet-700 dark:group-hover:bg-violet-950/20 dark:group-hover:text-violet-300">
                    <UploadCloud className="h-4 w-4" />
                    Add source video
                  </span>
                </label>
              )}
            </div>
          </ProcessingInterface>
        )}

        {status === 'analyzing' && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-8">
            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {selectedFile?.name}
              {videoFile && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"><Scissors className="h-3 w-3" />scene detection enabled</span>}
            </div>
            <ProcessingProgress
              steps={[
                { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                { label: videoFile ? 'Analyzing + scene detection' : 'Analyzing', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
              ]}
              currentMessage={uploadPhase === 'uploading' ? 'Uploading files...' : videoFile ? 'Checking CPS, CPL, timing, and detecting scene cuts...' : 'Checking CPS, CPL, and timing...'}
              progress={uploadPhase === 'uploading' ? uploadProgress : progress}
              estimatedTime={uploadPhase === 'uploading' ? undefined : videoFile ? '15–45 seconds' : '5–15 seconds'}
              statusSubtext={uploadPhase === 'processing' && queuePosition !== undefined && queuePosition > 0 ? `Queue position: ${queuePosition}` : undefined}
              onCancel={handleProcessAnother}
            />
          </div>
        )}

        {status === 'idle' && showIssues && (() => {
          const sceneCuts = warnings.filter(w => w.type === 'scene_cut')
          const otherWarnings = warnings.filter(w => w.type !== 'scene_cut')
          const totalFindings = issues.length + warnings.length

          return (
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_320px] lg:items-start">

              {/* ── Left column: summary + scene cuts + fix options + CTA ── */}
              <div className="space-y-4">

                {/* Header / summary */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {totalFindings === 0 ? 'All checks passed' : `${totalFindings} finding${totalFindings !== 1 ? 's' : ''} detected`}
                      </h3>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                        {selectedFile?.name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {issues.length > 0 && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {issues.length} fixable
                        </span>
                      )}
                      {otherWarnings.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" />
                          {otherWarnings.length} warning{otherWarnings.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {sceneCuts.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          <Scissors className="h-3 w-3" />
                          {sceneCuts.length} scene cut{sceneCuts.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {totalFindings === 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          <CheckCircle className="h-3 w-3" />
                          Clean
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Scene cuts */}
                {sceneCuts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="rounded-xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950/20"
                  >
                    <div className="mb-3 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                        <Scissors className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">Scene cuts detected — manual review needed</p>
                        <p className="text-xs text-violet-600 dark:text-violet-400">These cues span a camera cut and cannot be auto-fixed.</p>
                      </div>
                    </div>
                    <ol className="space-y-2">
                      {sceneCuts.map((w, i) => (
                        <li key={i} className="flex items-start justify-between gap-3 rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm dark:border-violet-800 dark:bg-gray-900">
                          <p className="text-violet-800 dark:text-violet-200">{w.message}</p>
                          {w.line != null && <span className="shrink-0 font-mono text-xs text-violet-400">Cue {w.line}</span>}
                        </li>
                      ))}
                    </ol>
                  </motion.div>
                )}

                {/* Fix options */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Fix options</h3>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Original file is always preserved — only the downloaded copy is modified.</p>
                    </div>
                    {(fixTiming || grammarFix || lineBreakFix || removeFillers) && (
                      <button
                        onClick={() => { setFixTiming(false); setGrammarFix(false); setLineBreakFix(false); setRemoveFillers(false) }}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Checkbox
                      label="Fix timing"
                      description="Offset correction and clamp long durations"
                      checked={fixTiming}
                      onChange={setFixTiming}
                    />
                    <Checkbox
                      label="Grammar & spelling"
                      description="Fix spelling, grammar, casing, and punctuation"
                      checked={grammarFix}
                      onChange={setGrammarFix}
                    />
                    <Checkbox
                      label="Line breaks (CPL)"
                      description="Enforce 42-char/line broadcast standard"
                      checked={lineBreakFix}
                      onChange={setLineBreakFix}
                    />
                    <Checkbox
                      label="Remove filler words"
                      description="Strip um, uh, like, you know, etc."
                      checked={removeFillers}
                      onChange={setRemoveFillers}
                    />
                  </div>
                </motion.div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="space-y-3"
                >
                  {!isLoggedIn() ? (
                    <div className="space-y-2">
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        {issues.length > 0
                          ? `Sign up to auto-fix ${issues.length} issue${issues.length !== 1 ? 's' : ''} and download the corrected file.`
                          : 'Sign up to apply fixes and download the corrected file.'}
                      </p>
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => { setAuthModalMode('signup-combo'); setShowAuthModal(true) }}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
                        >
                          Create free account
                        </motion.button>
                        <button
                          onClick={() => { setAuthModalMode('login'); setShowAuthModal(true) }}
                          className="px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                        >
                          Log in
                        </button>
                      </div>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleAutoFix}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl"
                    >
                      {issues.length > 0 ? `Auto-fix ${issues.length} issue${issues.length !== 1 ? 's' : ''}` : 'Apply fixes'}
                    </motion.button>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      <Info className="mr-1 inline-block h-3 w-3" />
                      Scene cuts require manual editing — they are flagged only, not auto-fixed.
                    </p>
                    <button
                      onClick={handleProcessAnother}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Start over
                    </button>
                  </div>
                </motion.div>

              </div>

              {/* ── Right column: scrollable autofixable issues + warnings ── */}
              {(issues.length > 0 || otherWarnings.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="lg:sticky lg:top-4 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden flex flex-col"
                  style={{ maxHeight: '70vh' }}
                >
                  {issues.length > 0 && (
                    <>
                      <p className="shrink-0 border-b border-gray-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                        Auto-fixable issues ({issues.length})
                      </p>
                      <ol className="overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 flex-1">
                        {issues.map((issue, i) => {
                          const meta = FINDING_META[issue.type] ?? DEFAULT_FINDING_META
                          const Icon = meta.icon
                          return (
                            <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
                              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.colorBg}`}>
                                <Icon className={`h-3.5 w-3.5 ${meta.colorText}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`font-semibold ${meta.colorText}`}>{meta.label}</span>
                                <span className="ml-2 text-gray-600 dark:text-gray-400">{issue.message}</span>
                              </div>
                              {issue.index != null && (
                                <span className="shrink-0 font-mono text-xs text-gray-400 dark:text-gray-500">Cue {issue.index}</span>
                              )}
                            </li>
                          )
                        })}
                      </ol>
                    </>
                  )}
                  {otherWarnings.length > 0 && (
                    <>
                      <p className={`shrink-0 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 ${issues.length > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''}`}>
                        Informational warnings ({otherWarnings.length})
                      </p>
                      <ol className="overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
                        {otherWarnings.map((w, i) => {
                          const meta = FINDING_META[w.type] ?? DEFAULT_FINDING_META
                          const Icon = meta.icon
                          return (
                            <li key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
                              <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.colorBg}`}>
                                <Icon className={`h-3.5 w-3.5 ${meta.colorText}`} />
                              </div>
                              <p className="flex-1 text-gray-700 dark:text-gray-300">{w.message}</p>
                              {w.line != null && <span className="shrink-0 font-mono text-xs text-gray-400">Cue {w.line}</span>}
                            </li>
                          )
                        })}
                      </ol>
                    </>
                  )}
                </motion.div>
              )}

            </div>
          )
        })()}

        {status === 'processing' && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-8">
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

        {status === 'completed' && result && !isLoggedIn() && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center space-y-4"
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <p className="text-base font-semibold text-gray-900 dark:text-white">Your fixed subtitles are ready!</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create a free account to download your corrected subtitle file.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { setAuthModalMode('signup-combo'); setShowAuthModal(true) }}
                className="flex-1 max-w-[200px] py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                Create free account
              </button>
              <button
                onClick={() => { setAuthModalMode('login'); setShowAuthModal(true) }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                Log in
              </button>
            </div>
          </motion.div>
        )}

        {status === 'completed' && result && isLoggedIn() && (
          <div className="space-y-6">
            <TranslateResult
              title="Subtitles fixed!"
              fileName={result.fileName ?? fallbackFixedName}
              processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
              downloadLabel={plan === 'free' ? (freeExportsUsed >= 2 ? '2/2 free downloads used' : 'Download SRT') : 'Download SRT'}
              onDownload={() => requireAuthForDownload(downloadFixedSubtitles)}
              onProcessAnother={handleProcessAnother}
              processAnotherLabel="Fix another file"
              relatedTools={[]}
            />
            <ResultUpgradeCard tool="fix-srt" resultKey={result.downloadUrl} />
            <FreePlanNudge tool="fix-srt" resultKey={result.downloadUrl} />
            <SecondJobUpgradeNudge tool="fix-srt" resultKey={result.downloadUrl} milestone={2} />
            <SecondJobUpgradeNudge tool="fix-srt" resultKey={result.downloadUrl} milestone={3} />

            {changedCues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                      <Wrench className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Before &amp; after &mdash; {changedCues.length} cue{changedCues.length !== 1 ? 's' : ''} changed
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-red-200 dark:bg-red-900" />Before</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-200 dark:bg-green-900" />After</span>
                  </div>
                </div>
                <ol className="divide-y divide-gray-100 dark:divide-gray-800">
                  {changedCues.map(({ index, before, after }) => (
                    <li key={index} className="px-5 py-4 space-y-2">
                      <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        Cue {before.index}
                      </p>
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-900/50 dark:bg-red-950/20">
                        <p className="font-mono text-[11px] text-red-500 dark:text-red-400 mb-1">
                          {before.startTime} {'->'} {before.endTime}
                        </p>
                        <p className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">{before.text}</p>
                      </div>
                      <div className="rounded-lg border border-green-200 bg-green-50 px-3.5 py-2.5 dark:border-green-900/50 dark:bg-green-950/20">
                        <p className="font-mono text-[11px] text-green-600 dark:text-green-400 mb-1">
                          {after.startTime} {'->'} {after.endTime}
                        </p>
                        <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">{after.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}

            {/* ── Export formats ─────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden"
            >
              <div className="border-b border-gray-100 px-5 py-3.5 dark:border-gray-800 flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Export formats</p>
                {subtitleRows.length > 0 && changedCues.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <CheckCircle className="h-3 w-3" />
                    Includes your edits
                  </span>
                )}
              </div>
              <div className="p-5 space-y-5">
                {/* Subtitle files */}
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Subtitle files</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => requireAuthForDownload(handleExportSrt)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
                    >
                      SRT {!isPaid && <span className="text-[10px] text-gray-400">(watermark)</span>}
                    </button>
                    <button
                      onClick={() => requireAuthForDownload(handleExportVtt)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
                    >
                      VTT
                    </button>
                  </div>
                </div>
                {/* Document formats */}
                <div>
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Documents</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => requireAuthForDownload(handleExportTxt)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:text-blue-400"
                    >
                      TXT
                    </button>
                    <button
                      onClick={() => requireAuthForDownload(handleExportPdf)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                        isPaid
                          ? 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:text-blue-400'
                          : 'border-dashed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500'
                      }`}
                    >
                      PDF {!isPaid && <span className="text-[10px]">Pro</span>}
                    </button>
                    <button
                      onClick={() => requireAuthForDownload(handleExportDocx)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                        isPaid
                          ? 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:text-blue-400'
                          : 'border-dashed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500'
                      }`}
                    >
                      Word {!isPaid && <span className="text-[10px]">Pro</span>}
                    </button>
                  </div>
                  {!isPaid && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      PDF and Word export available on paid plans.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* ── QA editor — same reviewer used on Video → Subtitles (video-synced cue list,
                 live overlap/CPL/CPS/AI-artifact detection, inline edit mode) so both subtitle
                 tools give users the same review experience. Falls back to its own "no video
                 preview" state when this job had no dual-uploaded video. ── */}
            {subtitleRows.length > 0 && (
              <Suspense fallback={<div className="h-[300px] rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
                <SubtitleQAReview
                  key={result?.downloadUrl}
                  videoSrc={videoPreviewUrl}
                  rows={subtitleRows}
                  onRowsChange={canEdit ? setSubtitleRows : () => {}}
                  editable={canEdit}
                  onDownloadEdited={handleExportSrt}
                />
              </Suspense>
            )}
            {!canEdit && subtitleRows.length > 0 && (
              <button type="button" onClick={() => { setProPaywallReason('INLINE_EDIT'); setShowProPaywall(true) }} className="px-1 text-left text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                Upgrade to Pro to edit subtitle text — $7.99/mo
              </button>
            )}

            {(issues.length > 0 || warnings.length > 0) && renderIssueEditor()}

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

      {location.pathname === '/fix-subtitles' && <CoreToolSeoDepth path="/fix-subtitles" />}

      {faq.length > 0 && location.pathname !== '/fix-subtitles' && (
        <section className="mt-12 pt-8 border-t border-gray-100/70 max-w-4xl mx-auto px-4" aria-label="FAQ">
          <h2 className="text-2xl font-medium text-gray-800 mb-4">Frequently asked questions</h2>
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

      <JobAuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        jobDescription={status === 'completed' ? 'Your fixed subtitles are ready!' : 'Your subtitle analysis is ready!'}
        onAuthSuccess={async () => {
          const jobId = getPersistedJobId(location.pathname)
          const jobToken = getPersistedJobToken(location.pathname)
          if (jobId && jobToken) {
            try {
              await claimGuestJob(jobId, jobToken)
            } catch (err) {
              console.error('Failed to claim guest job:', err)
              toast.error('Could not link this job to your account. Please try again.')
            }
          }
          setShowAuthModal(false)
          if (pendingDownloadRef.current) {
            const action = pendingDownloadRef.current
            pendingDownloadRef.current = null
            action()
          } else if (result) {
            // Result is already in memory — just close the modal.
            // The download panel becomes visible on the next render since isLoggedIn() is now true.
          } else {
            window.location.reload()
          }
        }}
      />
      <PaywallModal isOpen={showProPaywall} onClose={() => setShowProPaywall(false)} reason={proPaywallReason} tool="fix-srt" />
    </>
  )
}
