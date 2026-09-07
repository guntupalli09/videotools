import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import TranslateLangCluster from '../components/TranslateLangCluster'
import { Languages, Copy, Check, Download, ArrowRight, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import FailedState from '../components/FailedState'
import CoreToolSeoDepth from '../components/CoreToolSeoDepth'
import SamplesModule from '../components/SamplesModule'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import PaywallModal, { type PaywallReason } from '../components/PaywallModal'
import JobAuthGateModal from '../components/JobAuthGateModal'
import UpgradeBanner from '../components/UpgradeBanner'
import FreePlanNudge from '../components/FreePlanNudge'
import SecondJobUpgradeNudge from '../components/SecondJobUpgradeNudge'
import ProCheckoutLink from '../components/ProCheckoutLink'
import ResultUpgradeCard from '../components/ResultUpgradeCard'
import ResultHeader from '../components/ResultHeader'
import { ToolLayout } from '../components/figma/ToolLayout'
import { UploadZone } from '../components/figma/UploadZone'
import { ProcessingInterface } from '../components/figma/ProcessingInterface'
import { ProcessingProgress } from '../components/figma/ProcessingProgress'
import { ProcessingStateShell } from '../components/figma/ProcessingStateShell'
import { ExportsPanel, ExportSection } from '../components/figma/ExportsPanel'
import { TranslateResult } from '../components/figma/TranslateResult'
import { Select } from '../components/figma/FormControls'
import type { SubtitleRow } from '../components/SubtitleEditor'
const SubtitleEditor = lazy(() => import('../components/SubtitleEditor'))
import { incrementUsage } from '../lib/usage'
import { incrementJobCompletedCount } from '../lib/jobCount'
import { uploadFileWithProgress, getJobStatus, getCurrentUsage, BACKEND_TOOL_TYPES, SessionExpiredError, getAuthToken } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { isPaidPlan as hasPaidPlan } from '../lib/plans'
import { watermarkTextExport, watermarkClipboardText, applyWatermarkToVtt, applyWatermarkToAss, drawPdfFreePlanWatermark, WATERMARK_DOC_FOOTER, WATERMARK_DOC_HEADER } from '../lib/watermark'
import { getJobLifecycleTransition, JOB_POLL_INTERVAL_MS } from '../lib/jobPolling'
import { getAbsoluteDownloadUrl, getApiBase } from '../lib/apiBase'
import { persistJobId, clearPersistedJobId, getPersistedJobId, getPersistedJobToken } from '../lib/jobSession'
import { trackEvent } from '../lib/analytics'
import toast from 'react-hot-toast'
import { Film, Wrench, MessageSquare } from 'lucide-react'
import { trackAppEvent } from '../lib/feedbackEvents'
import { LANGUAGES } from '../lib/languages'
import { exportFileStem, joinExportFilename, targetLangFileSlug } from '../lib/exportFileNames'

type Tab = 'upload' | 'paste'
type InputKind = 'subtitles' | 'documents'

interface SubStyles {
  fontFamily: string
  fontSize: number
  color: string
  bgColor: string
  bgOpacity: number
  bold: boolean
  italic: boolean
  position: 'top' | 'center' | 'bottom'
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

function hexToAssColor(hex: string): string {
  const r = hex.slice(1, 3).toUpperCase()
  const g = hex.slice(3, 5).toUpperCase()
  const b = hex.slice(5, 7).toUpperCase()
  return `&H00${b}${g}${r}`
}

function hexToAssBackColor(hex: string, opacity: number): string {
  const alpha = Math.round((1 - opacity) * 255).toString(16).padStart(2, '0').toUpperCase()
  const r = hex.slice(1, 3).toUpperCase()
  const g = hex.slice(3, 5).toUpperCase()
  const b = hex.slice(5, 7).toUpperCase()
  return `&H${alpha}${b}${g}${r}`
}

function srtTimeToAss(t: string): string {
  // "00:00:01,500" → "0:00:01.50"
  const norm = t.trim().replace(',', '.')
  const stripped = norm.replace(/^0(\d:)/, '$1')
  return stripped.replace(/(\.\d{2})\d*$/, '$1')
}

function generateStyledVtt(rows: SubtitleRow[], styles: SubStyles, baseFilename: string, isPaidPlan: boolean): void {
  const { fontFamily, fontSize, color, bgColor, bgOpacity, bold, italic, position } = styles
  const linePos = position === 'top' ? ' line:5%' : position === 'center' ? ' line:50%' : ' line:90%'
  let vtt = `WEBVTT\n\nSTYLE\n::cue {\n`
  vtt += `  font-family: ${fontFamily};\n`
  vtt += `  font-size: ${fontSize}px;\n`
  vtt += `  color: ${color};\n`
  vtt += `  background-color: ${hexToRgba(bgColor, bgOpacity)};\n`
  if (bold) vtt += `  font-weight: bold;\n`
  if (italic) vtt += `  font-style: italic;\n`
  vtt += `}\n\n`
  for (let i = 0; i < rows.length; i++) {
    vtt += `${i + 1}\n${rows[i].startTime} --> ${rows[i].endTime}${linePos}\n${rows[i].text}\n\n`
  }
  if (!isPaidPlan) vtt = applyWatermarkToVtt(vtt)
  downloadBlob(vtt, 'text/vtt', `${baseFilename}_styled.vtt`)
}

function generateAssFile(rows: SubtitleRow[], styles: SubStyles, baseFilename: string, isPaidPlan: boolean): void {
  const { fontFamily, fontSize, color, bgColor, bgOpacity, bold, italic, position } = styles
  const alignment = position === 'top' ? 6 : position === 'center' ? 10 : 2
  const primaryColor = hexToAssColor(color)
  const backColor = hexToAssBackColor(bgColor, bgOpacity)
  const boldFlag = bold ? -1 : 0
  const italicFlag = italic ? -1 : 0
  let ass = `[Script Info]\nScriptType: v4.00+\nCollisions: Normal\n\n`
  ass += `[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`
  ass += `Style: Default,${fontFamily},${fontSize},${primaryColor},&H000000FF,&H00000000,${backColor},${boldFlag},${italicFlag},0,0,100,100,0,0,3,1,0,${alignment},10,10,10,1\n\n`
  ass += `[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`
  for (const row of rows) {
    const start = srtTimeToAss(row.startTime)
    const end = srtTimeToAss(row.endTime)
    const text = row.text.replace(/\n/g, '\\N')
    ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`
  }
  if (!isPaidPlan) ass = applyWatermarkToAss(ass)
  downloadBlob(ass, 'text/plain', `${baseFilename}.ass`)
}

function downloadBlob(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType + ';charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Block-based translation (structure preserved) ──────────────────────────────

type Block =
  | { kind: 'structural'; text: string }
  | { kind: 'dialogue'; text: string; id: number }

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  let id = 0
  return lines.map((line) => {
    const t = line.trim()
    const structural =
      !t ||
      /^\[\d+:\d+\]/.test(t) ||
      /^.+\s+\(\d{1,2}:\d{2}(:\d{2})?\)$/.test(t) ||
      /^SPEAKER_\d+/.test(t) ||
      /^\d+$/.test(t) ||
      /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*/.test(t) ||
      /^WEBVTT/.test(t) ||
      /^NOTE\b/.test(t) ||
      /^STYLE\b/.test(t)
    return structural ? { kind: 'structural', text: line } : { kind: 'dialogue', text: line, id: id++ }
  })
}

async function translateWithBlocks(text: string, targetLanguage: string): Promise<string> {
  const blocks = parseBlocks(text)
  const dialogues = blocks.filter((b): b is Extract<Block, { kind: 'dialogue' }> => b.kind === 'dialogue')
  if (dialogues.length === 0) return text
  const numbered = dialogues.map((b) => `${b.id + 1}. ${b.text}`).join('\n')
  const token = getAuthToken()
  const res = await fetch(`${getApiBase()}/api/translate-transcript/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ text: numbered, targetLanguage }),
  })
  if (res.status === 401) throw new Error('auth')
  if (res.status === 403) throw new Error('paywall')
  if (!res.ok) throw new Error('failed')
  const { translatedText } = await res.json() as { translatedText: string }
  const map: Record<number, string> = {}
  for (const line of translatedText.split('\n')) {
    const m = line.match(/^(\d+)\.\s*(.*)$/)
    if (m) map[parseInt(m[1]) - 1] = m[2]
  }
  return blocks.map((b) => b.kind === 'structural' ? b.text : (map[b.id] ?? b.text)).join('\n')
}

async function extractDocText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const ab = await file.arrayBuffer()
    const { value } = await mammoth.extractRawText({ arrayBuffer: ab })
    return value
  }
  if (ext === 'json') {
    const raw = await file.text()
    try { return JSON.stringify(JSON.parse(raw), null, 2) } catch { return raw }
  }
  return file.text()
}

/** Optional SEO overrides for alternate entry points (e.g. /srt-translator). Do NOT duplicate logic. */
export type TranslateSubtitlesSeoProps = {
  seoH1?: string
  seoIntro?: string
  faq?: { q: string; a: string }[]
}

export default function TranslateSubtitles(props: TranslateSubtitlesSeoProps = {}) {
  const { seoH1, seoIntro, faq = [] } = props
  const location = useLocation()
  const navigate = useNavigate()

  // ── Input kind ────────────────────────────────────────────────────────────
  const [inputKind, setInputKind] = useState<InputKind>('subtitles')

  // ── Shared ────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pastedText, setPastedText] = useState('')
  const [searchParams] = useSearchParams()
  const [targetLanguage, setTargetLanguage] = useState<string>(() => {
    const fromQuery = searchParams.get('to')
    if (fromQuery && LANGUAGES.some((l) => l.value === fromQuery)) return fromQuery
    return 'Spanish'
  })
  const [copied, setCopied] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallReason, setPaywallReason] = useState<PaywallReason>('FREE_DAILY_LIMIT_REACHED')
  const [showAuthGate, setShowAuthGate] = useState(false)
  const pendingDownloadRef = useRef<(() => void) | null>(null)
  const pendingCopyRef = useRef<(() => void) | null>(null)

  /** Gate any download action behind authentication. */
  function requireAuthForDownload(action: () => void) {
    if (isLoggedIn()) {
      action()
    } else {
      pendingDownloadRef.current = action
      setShowAuthGate(true)
    }
  }

  /** Gate copy-to-clipboard behind authentication. */
  function requireAuthForCopy(action: () => void) {
    if (isLoggedIn()) {
      action()
    } else {
      pendingCopyRef.current = action
      setShowAuthGate(true)
    }
  }

  // ── Subtitles (job queue) ──────────────────────────────────────────────────
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle')
  const [uploadPhase, setUploadPhase] = useState<'uploading' | 'processing'>('processing')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progress, setProgress] = useState(0)
  const [queuePosition, setQueuePosition] = useState<number | undefined>(undefined)
  const [result, setResult] = useState<{ downloadUrl: string; fileName?: string; consistencyIssues?: { line: number; issueType: string }[] } | null>(null)
  const [subtitleRows, setSubtitleRows] = useState<SubtitleRow[]>([])
  const [plainTextResult, setPlainTextResult] = useState<string | null>(null)
  const [freeExportsUsed, setFreeExportsUsed] = useState(0)
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null)
  const processingStartedAtRef = useRef<number | null>(null)

  // ── Subtitle styles ───────────────────────────────────────────────────────
  const [subStyles, setSubStyles] = useState<SubStyles>({
    fontFamily: 'Arial',
    fontSize: 24,
    color: '#ffffff',
    bgColor: '#000000',
    bgOpacity: 0.7,
    bold: false,
    italic: false,
    position: 'bottom',
  })
  const updateStyle = <K extends keyof SubStyles>(key: K, val: SubStyles[K]) =>
    setSubStyles((s) => ({ ...s, [key]: val }))

  // ── Documents (client-side) ───────────────────────────────────────────────
  const [docText, setDocText] = useState<string | null>(null)
  const [docTranslated, setDocTranslated] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docProgress, setDocProgress] = useState(0)

  useEffect(() => {
    if (status === 'completed' && !isLoggedIn()) {
      setShowAuthGate(true)
    }
  }, [status])

  useEffect(() => {
    if (docTranslated && !isLoggedIn()) {
      setShowAuthGate(true)
    }
  }, [docTranslated])

  const plan = (localStorage.getItem('plan') || 'free').toLowerCase()
  const isPaidPlan = hasPaidPlan(plan)
  const canEdit = hasPaidPlan(plan)

  /** Paste / .txt upload → .txt; file upload → .srt (or .vtt from server). */
  const translateFallbackExt: '.srt' | '.txt' =
    !selectedFile || selectedFile.name.toLowerCase().endsWith('.txt') ? '.txt' : '.srt'

  const fallbackTranslatedName = (ext: '.srt' | '.vtt' | '.txt') =>
    joinExportFilename(
      exportFileStem(selectedFile?.name, 'subtitles'),
      `subtitles_translated_${targetLangFileSlug(targetLanguage)}`,
      ext
    )

  const subtitleBaseName = (result?.fileName ?? fallbackTranslatedName('.srt')).replace(/\.\w+$/, '')

  useEffect(() => {
    const fromQuery = searchParams.get('to')
    if (fromQuery && LANGUAGES.some((l) => l.value === fromQuery)) {
      setTargetLanguage(fromQuery)
    }
  }, [searchParams])

  // On mount: restore a completed job if jobId is persisted in URL/sessionStorage
  // (handles browser refresh after a translate job completes)
  useEffect(() => {
    const jobId = getPersistedJobId(location.pathname)
    if (!jobId) return
    const jobToken = getPersistedJobToken(location.pathname)
    ;(async () => {
      try {
        const jobStatus = await getJobStatus(jobId, jobToken ? { jobToken } : undefined)
        const transition = getJobLifecycleTransition(jobStatus)
        if (transition !== 'completed') return
        setStatus('completed')
        if (jobStatus.requiresAuth || !isLoggedIn()) {
          setShowAuthGate(true)
          setResult(jobStatus.result?.fileName ? { downloadUrl: '', fileName: jobStatus.result.fileName } : { downloadUrl: '' })
          return
        }
        setResult(jobStatus.result ?? null)
        if (jobStatus.result?.downloadUrl) {
          try {
            const res = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl))
            const txt = await res.text()
            const isTxt = (jobStatus.result.fileName ?? '').toLowerCase().endsWith('.txt')
            if (isTxt) setPlainTextResult(txt)
            else setSubtitleRows(parseSubtitlesToRows(txt))
          } catch { /* non-blocking */ }
        }
      } catch { /* non-blocking */ }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Subtitle file select ──────────────────────────────────────────────────
  const handleFileSelect = (file: File) => {
    try { trackEvent('file_selected', { tool_type: BACKEND_TOOL_TYPES.TRANSLATE_SUBTITLES, file_size_bytes: file.size }) } catch { /* non-blocking */ }
    setSelectedFile(file)
    setSubtitleRows([])
    setPlainTextResult(null)
  }

  // ── Document file select (client-side read) ────────────────────────────────
  const handleDocFileSelect = async (file: File) => {
    setSelectedFile(file)
    setDocText(null)
    setDocTranslated(null)
    try {
      const text = await extractDocText(file)
      setDocText(text)
    } catch {
      toast.error('Could not read file')
    }
  }

  // ── Document translate ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!docLoading) {
      setDocProgress(0)
      return
    }
    setDocProgress(12)
    const id = window.setInterval(() => {
      setDocProgress((p) => Math.min(92, p + 4))
    }, 450)
    return () => window.clearInterval(id)
  }, [docLoading])

  const handleDocTranslate = async () => {
    const src = tab === 'paste' ? pastedText : docText
    if (!src?.trim()) { toast.error('No text to translate'); return }
    if (!isPaidPlan) {
      const today = new Date().toISOString().slice(0, 10)
      const used = parseInt(localStorage.getItem(`docTranslateUsed_${today}`) ?? '0', 10)
      if (used >= 3) { setPaywallReason('DOCUMENT_TRANSLATION_LIMIT'); setShowPaywall(true); return }
    }
    try {
      setDocLoading(true)
      setDocTranslated(null)
      const translated = await translateWithBlocks(src, targetLanguage)
      setDocTranslated(translated)
      if (!isPaidPlan) {
        const today = new Date().toISOString().slice(0, 10)
        const used = parseInt(localStorage.getItem(`docTranslateUsed_${today}`) ?? '0', 10)
        localStorage.setItem(`docTranslateUsed_${today}`, String(used + 1))
      }
    } catch (e: unknown) {
      const err = e as Error
      if (err.message === 'auth') toast.error('Sign in to translate')
      else if (err.message === 'paywall') { setPaywallReason('DOCUMENT_TRANSLATION_LIMIT'); setShowPaywall(true) }
      else toast.error('Translation failed. Please try again.')
    } finally {
      setDocLoading(false)
    }
  }

  const downloadDocAsDocx = async (text: string, filename: string, isPaid: boolean) => {
    const { Document, Paragraph, TextRun, Packer } = await import('docx')
    const children = []
    if (!isPaid) {
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
    children.push(
      ...text.split('\n').map((line) =>
        new Paragraph({ children: [new TextRun({ text: line || ' ' })] }),
      ),
    )
    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadDocAsPdf = async (text: string, filename: string, isPaid: boolean) => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    let y = 15
    if (!isPaid) {
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(WATERMARK_DOC_HEADER, 15, y)
      y += 6
      doc.text(WATERMARK_DOC_FOOTER, 15, y)
      y += 12
      doc.setTextColor(0)
      doc.setFontSize(11)
    }
    const lines = doc.splitTextToSize(text, 180) as string[]
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 15 }
      doc.text(line, 15, y)
      y += 6
    }
    if (!isPaid) drawPdfFreePlanWatermark(doc)
    doc.save(filename)
  }

  const parseSubtitlesToRows = (text: string): SubtitleRow[] => {
    const blocks = text.replace(/\r/g, '').trim().split('\n\n').filter(Boolean)
    const rows: SubtitleRow[] = []
    for (const block of blocks) {
      const lines = block.split('\n').filter((l) => l.trim().length > 0)
      const timeLineIdx = lines.findIndex((l) => l.includes('-->'))
      if (timeLineIdx === -1) continue
      const [start, end] = lines[timeLineIdx].split('-->').map((s) => s.trim())
      rows.push({ index: rows.length + 1, startTime: start, endTime: end, text: lines.slice(timeLineIdx + 1).join('\n') })
    }
    return rows
  }

  const rowsToSrt = (rows: SubtitleRow[]): string =>
    rows.map((r, idx) => `${idx + 1}\n${r.startTime} --> ${r.endTime}\n${r.text}`).join('\n\n')

  // ── Subtitle upload translate (job queue) ─────────────────────────────────
  const handleProcess = async () => {
    try {
      const usageData = await getCurrentUsage()
      const isImports = usageData.quotaType === 'imports'
      const totalAvailable = isImports ? (usageData.limit ?? 3) : (usageData.limits.minutesPerMonth + usageData.overages.minutes)
      const used = isImports ? (usageData.used ?? usageData.usage?.importCount ?? 0) : usageData.usage.totalMinutes
      const atOrOverLimit = isImports ? used >= (usageData.limit ?? 3) : (totalAvailable > 0 && used >= totalAvailable)
      if (atOrOverLimit) {
        setPaywallReason('FREE_DAILY_LIMIT_REACHED')
        setShowPaywall(true)
        return
      }
    } catch {
      // If usage lookup fails, fall back to allowing processing
    }

    try {
      setStatus('processing')
      setUploadPhase('uploading')
      setUploadProgress(0)
      setProgress(0)
      const startedAt = Date.now()
      processingStartedAtRef.current = startedAt

      let fileToUpload: File

      if (tab === 'upload' && selectedFile) {
        fileToUpload = selectedFile
      } else if (tab === 'paste' && pastedText.trim()) {
        // Wrap pasted text as a .txt file and send through the same queue
        const blob = new Blob([pastedText], { type: 'text/plain' })
        fileToUpload = new File([blob], 'paste.txt', { type: 'text/plain' })
      } else {
        toast.error('Please upload a file or paste text to translate')
        setStatus('idle')
        return
      }

      const response = await uploadFileWithProgress(fileToUpload, {
        toolType: BACKEND_TOOL_TYPES.TRANSLATE_SUBTITLES,
        targetLanguage,
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
            setLastProcessingMs(Date.now() - started)
            setStatus('completed')
            trackAppEvent('transcription_completed', { toolId: 'translate-subtitles' })

            if (jobStatus.requiresAuth || !isLoggedIn()) {
              setShowAuthGate(true)
              setResult(jobStatus.result?.fileName ? { downloadUrl: '', fileName: jobStatus.result.fileName } : { downloadUrl: '' })
            } else {
              setResult(jobStatus.result ?? null)
              if (jobStatus.result?.downloadUrl) {
                try {
                  const token = getAuthToken()
                  const res = await fetch(getAbsoluteDownloadUrl(jobStatus.result.downloadUrl), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                  })
                  const txt = await res.text()
                  const isTxt = (jobStatus.result.fileName ?? '').toLowerCase().endsWith('.txt')
                  if (isTxt) {
                    setPlainTextResult(txt)
                  } else {
                    setSubtitleRows(parseSubtitlesToRows(txt))
                  }
                } catch {
                  // ignore
                }
              }
              incrementUsage('translate-subtitles')
              try {
                const nextJobCount = incrementJobCompletedCount()
                trackEvent('job_completed', {
                  job_id: response.jobId,
                  tool_type: BACKEND_TOOL_TYPES.TRANSLATE_SUBTITLES,
                  processing_time_ms: Date.now() - started,
                  job_count: nextJobCount,
                })
              } catch {
                /* non-blocking */
              }
            }
          } else if (transition === 'failed') {
            clearInterval(pollIntervalRef.current)
            setStatus('failed')
            toast.error('Processing failed. Please try again.')
          }
        } catch {
          // Network/parse errors: keep polling
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
      }
      toast.error(error.message || 'Upload failed')
    }
  }

  const handleProcessAnother = () => {
    clearPersistedJobId(location.pathname, navigate)
    setSelectedFile(null)
    setPastedText('')
    setStatus('idle')
    setUploadPhase('processing')
    setUploadProgress(0)
    setProgress(0)
    setResult(null)
    setSubtitleRows([])
    setPlainTextResult(null)
  }

  const getDownloadUrl = () => result?.downloadUrl ? getAbsoluteDownloadUrl(result.downloadUrl) : ''

  const copyToClipboard = async (text: string) => {
    requireAuthForCopy(async () => {
      try {
        const payload = isPaidPlan ? text : watermarkClipboardText(text)
        await navigator.clipboard.writeText(payload)
        setCopied(true)
        toast.success(isPaidPlan ? 'Copied!' : 'Copied (with watermark)')
        setTimeout(() => setCopied(false), 2000)
      } catch { toast.error('Copy failed') }
    })
  }

  const switchKind = (k: InputKind) => {
    setInputKind(k)
    setSelectedFile(null)
    setPastedText('')
    setDocText(null)
    setDocTranslated(null)
    setStatus('idle')
    setResult(null)
    setSubtitleRows([])
    setTab('upload')
  }

  const breadcrumbs = [{ label: 'Translate', href: '/translation' }]
  const layoutProps = {
    breadcrumbs,
    title: seoH1 ?? 'Translate Subtitles to Any Language',
    subtitle: seoIntro ?? 'Upload SRT or VTT, pick a target language, download a timed file. 70+ languages. Timestamps stay in sync. Try it free.',
    icon: <Languages className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    tags: ['SRT', 'VTT', 'TXT', 'DOCX', 'JSON', '70+ Languages'],
    sidebar: null,
    compactToolHeader: true,
    coreToolPath: location.pathname === '/translate-subtitles' ? '/translate-subtitles' : undefined,
    currentStepLabel:
      status === 'completed'
        ? 'Translation ready'
        : selectedFile || pastedText.trim()
          ? 'Upload configured'
          : 'Ready to upload',
  }

  // ── Shared tab bar (used in both modes) ────────────────────────────────────
  const tabBar = (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-3">
      {(['upload', 'paste'] as Tab[]).map((t) => (
        <button
          key={t}
          onClick={() => { setTab(t); setSelectedFile(null); setPastedText(''); setDocText(null); setDocTranslated(null) }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === t
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t === 'upload' ? 'Upload file' : 'Paste text'}
        </button>
      ))}
    </div>
  )

  // ── Subtitle style panel (shown after successful subtitle translation) ──────
  const subtitleStylePanel = subtitleRows.length > 0 && (
    <div className="surface-card rounded-xl p-6 space-y-5">
      <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100">Subtitle Style</h3>
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Controls */}
        <div className="flex-1 space-y-4">
          {/* Font */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Font</label>
              <select
                value={subStyles.fontFamily}
                onChange={(e) => updateStyle('fontFamily', e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {['Arial', 'Helvetica', 'Georgia', 'Courier New', 'Impact', 'Trebuchet MS', 'Verdana'].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Size: {subStyles.fontSize}px</label>
              <input
                type="range" min={12} max={56} step={2}
                value={subStyles.fontSize}
                onChange={(e) => updateStyle('fontSize', Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>
          {/* Colors */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Text color</label>
              <input type="color" value={subStyles.color} onChange={(e) => updateStyle('color', e.target.value)}
                className="h-8 w-14 cursor-pointer rounded border border-gray-200 dark:border-gray-700 bg-transparent p-0.5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Background</label>
              <input type="color" value={subStyles.bgColor} onChange={(e) => updateStyle('bgColor', e.target.value)}
                className="h-8 w-14 cursor-pointer rounded border border-gray-200 dark:border-gray-700 bg-transparent p-0.5" />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Opacity {Math.round(subStyles.bgOpacity * 100)}%</label>
              <input type="range" min={0} max={1} step={0.05}
                value={subStyles.bgOpacity}
                onChange={(e) => updateStyle('bgOpacity', Number(e.target.value))}
                className="w-full accent-blue-600" />
            </div>
          </div>
          {/* Style toggles */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => updateStyle('bold', !subStyles.bold)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${subStyles.bold ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              <Bold className="w-3.5 h-3.5" /> Bold
            </button>
            <button
              onClick={() => updateStyle('italic', !subStyles.italic)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${subStyles.italic ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              <Italic className="w-3.5 h-3.5" /> Italic
            </button>
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(['top', 'center', 'bottom'] as const).map((pos, i) => (
                <button key={pos} onClick={() => updateStyle('position', pos)}
                  title={`Position: ${pos}`}
                  className={`px-3 py-1.5 text-sm transition-colors ${subStyles.position === pos ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'} ${i > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''}`}
                >
                  {pos === 'top' ? <AlignLeft className="w-3.5 h-3.5 rotate-90" /> : pos === 'center' ? <AlignCenter className="w-3.5 h-3.5 rotate-90" /> : <AlignRight className="w-3.5 h-3.5 rotate-90" />}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">Position</span>
          </div>
        </div>
        {/* Preview card */}
        <div className="w-full sm:w-52 shrink-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Preview</p>
          <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-gray-700 to-gray-900" />
            <div className={`absolute left-0 right-0 flex justify-center px-3 ${
              subStyles.position === 'top' ? 'top-3' : subStyles.position === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-3'
            }`}>
              <span
                className="px-1.5 py-0.5 text-center leading-snug rounded"
                style={{
                  fontFamily: subStyles.fontFamily,
                  fontSize: `${Math.round(subStyles.fontSize * 0.45)}px`,
                  color: subStyles.color,
                  backgroundColor: hexToRgba(subStyles.bgColor, subStyles.bgOpacity),
                  fontWeight: subStyles.bold ? 700 : 400,
                  fontStyle: subStyles.italic ? 'italic' : 'normal',
                }}
              >
                Subtitle preview text
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Export buttons moved to right-rail ExportsPanel on result view */}
    </div>
  )

  const docBaseName = `${selectedFile?.name.replace(/\.\w+$/, '') ?? 'document'}_${targetLanguage.toLowerCase()}`

  const kindTab = (k: InputKind, label: string, helper: string) => (
    <button
      onClick={() => switchKind(k)}
      className={`group flex-1 min-w-[240px] text-left px-4 py-3 rounded-xl border transition-all ${
        inputKind === k
          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
          : 'bg-white/80 dark:bg-gray-800/70 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-400 dark:hover:border-blue-500'
      }`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className={`mt-1 text-xs ${inputKind === k ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>{helper}</p>
    </button>
  )

  const kindSelector = (status === 'idle' || inputKind === 'documents') && !docTranslated && (
    <div className="mb-5 rounded-xl border border-blue-300/60 dark:border-blue-500/40 bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-950/30 dark:to-blue-950/20 p-4 sm:p-5">
      <p className="text-xs font-bold tracking-wide uppercase text-blue-700 dark:text-blue-300">Choose what to translate</p>
      <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">Translate subtitle files or full transcript documents from this same page.</p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        {kindTab('subtitles', 'Subtitles (SRT / VTT)', 'Best for video captions with timestamps preserved.')}
        {kindTab('documents', 'Documents (DOCX, TXT, JSON…)', 'Best for scripts, transcripts, notes, and structured text.')}
      </div>
    </div>
  )

  return (
    <>
      <ToolLayout {...layoutProps}>
        <UpgradeBanner variant="video-length" tool="translate-subtitles" />

        {kindSelector}

        {/* ══════════════ SUBTITLES PATH ══════════════ */}
        {inputKind === 'subtitles' && (
          <>
            {status === 'idle' && tabBar}

            {/* Upload: no file */}
            {status === 'idle' && tab === 'upload' && !selectedFile && (
              <div className="space-y-4">
                <UploadZone
                  immediateSelect
                  onFileSelect={handleFileSelect}
                  initialFiles={null}
                  onRemove={() => setSelectedFile(null)}
                  acceptedFormats={['SRT', 'VTT']}
                  acceptAttribute=".srt,.vtt"
                  maxSize="10 MB"
                />
                {location.pathname === '/translate-subtitles' && (
                  <SamplesModule sourcePath={location.pathname} samplesHref="/samples#translate" />
                )}
              </div>
            )}

            {/* Upload: file ready */}
            {status === 'idle' && tab === 'upload' && selectedFile && (
              <ProcessingInterface
                file={{ name: selectedFile.name, size: `${(selectedFile.size / 1024).toFixed(2)} KB` }}
                onRemove={() => setSelectedFile(null)}
                actionLabel="Translate"
                onAction={handleProcess}
                actionLoading={false}
                showVideoPlayer={false}
              >
                <div className="space-y-3">
                  <Select label="Translate to" options={LANGUAGES} value={targetLanguage} onChange={setTargetLanguage} />
                  {!isPaidPlan && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Free plan: 3 translations per month ·{' '}
                      <ProCheckoutLink source="translate_subtitles_upload" />
                    </p>
                  )}
                </div>
              </ProcessingInterface>
            )}

            {/* Paste tab */}
            {status === 'idle' && tab === 'paste' && (
              <div className="space-y-4">
                <Select label="Translate to" options={LANGUAGES} value={targetLanguage} onChange={setTargetLanguage} />
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your SRT, VTT, or plain text here…"
                  className="w-full h-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                {!isPaidPlan && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Free plan: 3 translations per month ·{' '}
                    <ProCheckoutLink source="translate_subtitles_paste" />
                  </p>
                )}
                <button
                  onClick={handleProcess}
                  disabled={!pastedText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Languages className="w-4 h-4" />
                  Translate to {targetLanguage}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Processing */}
            {status === 'processing' && (
              <ProcessingStateShell>
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {selectedFile?.name ?? 'Pasted text'} · Translating to {targetLanguage}
                </div>
                <ProcessingProgress
                  steps={[
                    { label: 'Uploading', status: uploadPhase === 'uploading' ? 'active' : 'completed' },
                    { label: 'Translating', status: uploadPhase === 'processing' ? 'active' : 'pending' },
                    { label: 'Finalizing', status: progress >= 100 ? 'completed' : 'pending' },
                  ]}
                  currentMessage={uploadPhase === 'uploading' ? 'Uploading…' : `Translating to ${targetLanguage}…`}
                  progress={uploadPhase === 'uploading' ? uploadProgress : progress}
                  estimatedTime={uploadPhase === 'uploading' ? undefined : '10–40 seconds'}
                  statusSubtext={uploadPhase === 'processing' && queuePosition !== undefined && queuePosition > 0 ? `Queue position: ${queuePosition}` : undefined}
                  onCancel={handleProcessAnother}
                />
              </ProcessingStateShell>
            )}

            {/* Completed — guests see signup only */}
            {status === 'completed' && result && !isLoggedIn() && (
              <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden select-none">
                <ResultHeader
                  embedded
                  title="Translation complete"
                  processingTime={
                    lastProcessingMs != null
                      ? `${(lastProcessingMs / 1000).toFixed(1)}s`
                      : null
                  }
                />
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create a free account to view, copy, and download your translation.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAuthGate(true)}
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                    >
                      Create free account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Completed — full result for signed-in users */}
            {status === 'completed' && result && isLoggedIn() && (
              <div className="space-y-6">
                <TranslateResult
                  title="Translation complete!"
                  fileName={result.fileName ?? fallbackTranslatedName(translateFallbackExt)}
                  processingTime={lastProcessingMs != null ? `${(lastProcessingMs / 1000).toFixed(1)}s` : '—'}
                  hideDownload
                  onProcessAnother={handleProcessAnother}
                  relatedTools={[]}
                />
                {inputKind === 'subtitles' && <FreePlanNudge tool="translation" resultKey={result.downloadUrl} />}
                {inputKind === 'subtitles' && (
                  <ResultUpgradeCard tool="translation" resultKey={result.downloadUrl} />
                )}
                {inputKind === 'subtitles' && (
                  <>
                    <SecondJobUpgradeNudge tool="translation" resultKey={result.downloadUrl} milestone={2} />
                    <SecondJobUpgradeNudge tool="translation" resultKey={result.downloadUrl} milestone={3} />
                  </>
                )}

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0 space-y-6">
                    {plainTextResult && (
                      <div className="surface-card space-y-3 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Translated text</p>
                          <button
                            onClick={() => copyToClipboard(plainTextResult)}
                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                          >
                            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
                          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300">{plainTextResult}</pre>
                        </div>
                      </div>
                    )}

                    {result.consistencyIssues && result.consistencyIssues.length > 0 && (
                      <div className="shadow-card rounded-xl border border-amber-100 bg-amber-50 p-6">
                        <p className="mb-2 font-medium text-amber-800">Some lines may not be translated.</p>
                        <ul className="space-y-1 text-sm text-amber-900">
                          {result.consistencyIssues.slice(0, 8).map((issue, i) => (
                            <li key={i}>Line {issue.line}: {issue.issueType === 'untranslated' ? 'possibly untranslated' : 'mixed language'}</li>
                          ))}
                          {result.consistencyIssues.length > 8 && <li>… and {result.consistencyIssues.length - 8} more</li>}
                        </ul>
                      </div>
                    )}

                    {subtitleStylePanel}

                    {subtitleRows.length > 0 && (
                      <div className="surface-card rounded-xl p-6">
                        <Suspense fallback={null}>
                          <SubtitleEditor entries={subtitleRows} editable={canEdit} onChange={setSubtitleRows} />
                        </Suspense>
                        {!canEdit && (
                          <p className="mt-3 text-xs text-gray-500">Upgrade to edit translated subtitles inline.</p>
                        )}
                      </div>
                    )}

                    <CrossToolSuggestions
                      workflowHint="Burn into video or fix timing on another file."
                      suggestions={[
                        { icon: Film, title: 'Burn Subtitles', path: '/burn-subtitles', description: 'Burn translated captions into video' },
                        { icon: Wrench, title: 'Fix Subtitles', path: '/fix-subtitles', description: 'Fix timing, grammar, line breaks' },
                        { icon: MessageSquare, title: 'Video → Subtitles', path: '/video-to-subtitles', description: 'Generate SRT/VTT from another video' },
                      ]}
                    />
                  </div>

                  <ExportsPanel freeExportsUsed={!isPaidPlan ? freeExportsUsed : undefined}>
                    <ExportSection title="Primary">
                      <button
                        type="button"
                        onClick={() => requireAuthForDownload(async () => {
                          if (!isPaidPlan && freeExportsUsed >= 2) {
                            toast('You\'ve used your 2 free downloads. Upgrade for more.')
                            return
                          }
                          try {
                            const token = getAuthToken()
                            const res = await fetch(getDownloadUrl(), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
                            const blob = await res.blob()
                            const a = document.createElement('a')
                            a.href = URL.createObjectURL(blob)
                            a.download = result?.fileName || fallbackTranslatedName(translateFallbackExt)
                            a.click()
                            URL.revokeObjectURL(a.href)
                            try { trackEvent('result_downloaded', { tool: 'translate-subtitles', plan: isPaidPlan ? 'paid' : 'free' }) } catch { /* non-blocking */ }
                            if (!isPaidPlan) setFreeExportsUsed((prev) => prev + 1)
                            toast.success('Download started')
                          } catch {
                            toast.error('Download failed')
                          }
                        })}
                        disabled={!isPaidPlan && freeExportsUsed >= 2}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {!isPaidPlan && freeExportsUsed >= 2
                          ? '2/2 free downloads used'
                          : isPaidPlan
                            ? 'Download translated file'
                            : 'Download with watermark'}
                      </button>
                    </ExportSection>
                    {subtitleRows.length > 0 && (
                      <>
                        <ExportSection title="Edited subtitles">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => {
                              let content = rowsToSrt(subtitleRows)
                              if (!isPaidPlan) content = watermarkTextExport(content, 'srt')
                              downloadBlob(content, 'text/plain', (result.fileName || fallbackTranslatedName('.srt')).replace(/\.vtt$/i, '.srt'))
                            }}
                            className="w-full rounded-lg border border-gray-200 px-2 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                          >
                            Download edited SRT
                          </button>
                        </ExportSection>
                        <ExportSection title="Styled exports">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => requireAuthForDownload(() => generateStyledVtt(subtitleRows, subStyles, subtitleBaseName, isPaidPlan))}
                              className="rounded-lg border border-gray-200 px-2 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              Styled VTT
                            </button>
                            <button
                              onClick={() => requireAuthForDownload(() => generateAssFile(subtitleRows, subStyles, subtitleBaseName, isPaidPlan))}
                              className="rounded-lg border border-gray-200 px-2 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                              ASS / SSA
                            </button>
                          </div>
                          <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                            For Premiere, DaVinci, Aegisub, and styled players
                          </p>
                        </ExportSection>
                      </>
                    )}
                  </ExportsPanel>
                </div>
              </div>
            )}

            {status === 'failed' && <FailedState onTryAgain={handleProcessAnother} />}
          </>
        )}

        {/* ══════════════ DOCUMENTS PATH ══════════════ */}
        {inputKind === 'documents' && (
          <>
            {!docTranslated && !docLoading && tabBar}

            {/* Upload: no file */}
            {!docTranslated && !docLoading && tab === 'upload' && !selectedFile && (
              <UploadZone
                immediateSelect
                onFileSelect={handleDocFileSelect}
                initialFiles={null}
                onRemove={() => { setSelectedFile(null); setDocText(null) }}
                acceptedFormats={['TXT', 'DOCX', 'JSON', 'SRT', 'VTT']}
                acceptAttribute=".txt,.docx,.json,.srt,.vtt"
                maxSize="10 MB"
              />
            )}

            {/* Upload: file selected, reading */}
            {!docTranslated && !docLoading && tab === 'upload' && selectedFile && !docText && (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Reading {selectedFile.name}…
              </div>
            )}

            {/* Upload: file read, ready to translate */}
            {!docTranslated && !docLoading && tab === 'upload' && selectedFile && docText && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{docText.length.toLocaleString()} characters</p>
                  </div>
                  <button onClick={() => { setSelectedFile(null); setDocText(null) }} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Remove</button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 rounded-xl p-4 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap font-sans">{docText.slice(0, 600)}{docText.length > 600 ? '\n…' : ''}</pre>
                </div>
                <Select label="Translate to" options={LANGUAGES} value={targetLanguage} onChange={setTargetLanguage} />
                {!isPaidPlan && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Free plan: 3 translations per month ·{' '}
                    <ProCheckoutLink source="translate_documents_upload" />
                  </p>
                )}
                <button
                  onClick={handleDocTranslate}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  <Languages className="w-4 h-4" />
                  Translate to {targetLanguage}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Paste tab */}
            {!docTranslated && !docLoading && tab === 'paste' && (
              <div className="space-y-4">
                <Select label="Translate to" options={LANGUAGES} value={targetLanguage} onChange={setTargetLanguage} />
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste text from any document, transcript, or file…"
                  className="w-full h-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                {!isPaidPlan && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Free plan: 3 translations per month ·{' '}
                    <ProCheckoutLink source="translate_documents_paste" />
                  </p>
                )}
                <button
                  onClick={handleDocTranslate}
                  disabled={docLoading || !pastedText.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Languages className="w-4 h-4" />
                  Translate to {targetLanguage}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Translating */}
            {docLoading && (
              <ProcessingStateShell>
                <ProcessingProgress
                  steps={[
                    { label: 'Preparing', status: 'completed' },
                    { label: 'Translating', status: 'active' },
                  ]}
                  currentMessage={`Translating to ${targetLanguage}…`}
                  progress={docProgress}
                  estimatedTime="10–30 seconds"
                />
              </ProcessingStateShell>
            )}

            {/* Result — signed-in only */}
            {docTranslated && !isLoggedIn() && (
              <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 text-center space-y-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Translation complete!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a free account to view, copy, and download your translated document.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAuthGate(true)}
                  className="w-full max-w-xs mx-auto py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  Create free account
                </button>
              </div>
            )}

            {docTranslated && isLoggedIn() && (
              <div className="space-y-4">
                <ResultHeader
                  title="Translation complete"
                  meta={`Translated to ${targetLanguage}`}
                  actionLabel="Translate another"
                  onAction={() => { setDocTranslated(null); setDocText(null); setSelectedFile(null); setPastedText('') }}
                />

                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => copyToClipboard(docTranslated)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900/60">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300">{docTranslated}</pre>
                    </div>
                  </div>

                  <ExportsPanel>
                    <ExportSection title="Documents">
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => requireAuthForDownload(() => downloadBlob(
                            isPaidPlan ? docTranslated : watermarkTextExport(docTranslated, 'txt'),
                            'text/plain',
                            `${docBaseName}.txt`,
                          ))}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <Download className="h-3.5 w-3.5" /> Download TXT
                        </button>
                        <button
                          onClick={() => requireAuthForDownload(() => downloadDocAsDocx(docTranslated, `${docBaseName}.docx`, isPaidPlan))}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <Download className="h-3.5 w-3.5" /> Download DOCX
                        </button>
                        <button
                          onClick={() => requireAuthForDownload(() => downloadDocAsPdf(docTranslated, `${docBaseName}.pdf`, isPaidPlan))}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-2 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <Download className="h-3.5 w-3.5" /> Download PDF
                        </button>
                      </div>
                    </ExportSection>
                  </ExportsPanel>
                </div>
              </div>
            )}
          </>
        )}
      </ToolLayout>

      {location.pathname === '/translate-subtitles' && (
        <>
          <TranslateLangCluster />
          <CoreToolSeoDepth path="/translate-subtitles" />
        </>
      )}


      <JobAuthGateModal
        isOpen={showAuthGate}
        onClose={() => { setShowAuthGate(false); pendingDownloadRef.current = null; pendingCopyRef.current = null }}
        dismissable={false}
        jobDescription="Sign up to view and download your translation"
        onAuthSuccess={() => {
          setShowAuthGate(false)
          pendingDownloadRef.current?.()
          pendingDownloadRef.current = null
          pendingCopyRef.current?.()
          pendingCopyRef.current = null
          window.location.reload()
        }}
      />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        reason={paywallReason}
        tool="translate-subtitles"
      />

      {faq.length > 0 && (
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
    </>
  )
}
