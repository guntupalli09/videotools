import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import UpgradeBanner from '../components/UpgradeBanner'
import FreePlanNudge from '../components/FreePlanNudge'
import PaywallModal, { type PaywallReason } from '../components/PaywallModal'
import { isPaidPlan as hasPaidPlan } from '../lib/plans'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  Square,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Zap,
  ShieldCheck,
  AlertCircle,
  Download,
  Sparkles,
  Lock,
  Users,
  FileText,
  Languages,
} from 'lucide-react'
import { ToolLayout } from '../components/figma/ToolLayout'
import CoreToolSeoDepth from '../components/CoreToolSeoDepth'
import TranscriptSharePanel from '../components/TranscriptSharePanel'
import JobAuthGateModal from '../components/JobAuthGateModal'
import {
  uploadFileWithProgress,
  subscribeJobStatus,
  BACKEND_TOOL_TYPES,
  getAuthToken,
  claimGuestJob,
  getCurrentUsage,
  invalidateUsageCache,
} from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { getAbsoluteDownloadUrl, getApiBase, API_ORIGIN, getWsBase } from '../lib/apiBase'
import { formatTimestamp, type Segment } from '../lib/srtExport'
import { getActiveSegmentIndexAtTime } from '../lib/segmentSync'
import PinnedAudioPlayerBar from '../components/transcript/PinnedAudioPlayerBar'
import { LANGUAGES } from '../lib/languages'
import { exportFileStem, joinExportFilename, targetLangFileSlug } from '../lib/exportFileNames'
import { trackEvent } from '../lib/analytics'
import { applyWatermarkToTxt, WATERMARK_CLIPBOARD_SUFFIX } from '../lib/watermark'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = 'idle' | 'requesting' | 'recording' | 'uploading' | 'processing' | 'result' | 'error'

// ── Constants ─────────────────────────────────────────────────────────────────
const NUM_BARS = 48
const MAX_RECORD_SECS = 3600 // 1 hour cap

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function getBestMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ]
  return (
    candidates.find((t) => {
      try {
        return MediaRecorder.isTypeSupported(t)
      } catch {
        return false
      }
    }) ?? ''
  )
}

/** Convert Web Audio float32 samples to linear16 PCM ArrayBuffer for Deepgram streaming. */
function convertToPCM16(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * 2)
  const view = new DataView(buffer)
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(i * 2, clamped < 0 ? clamped * 32768 : clamped * 32767, true)
  }
  return buffer
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceRecorder() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [recSecs, setRecSecs] = useState(0)
  const [uploadPct, setUploadPct] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [partial, setPartial] = useState('')
  const [copied, setCopied] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  // Translation (Pro)
  const [translateLanguage, setTranslateLanguage] = useState('Spanish')
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [transcriptView, setTranscriptView] = useState<'original' | 'translated'>('original')
  const [voiceJobId, setVoiceJobId] = useState<string | null>(null)
  const [voiceJobToken, setVoiceJobToken] = useState<string | null>(null)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signup-combo' | 'login'>('signup-combo')
  /** Segments + audio URL from job result — enables pinned player + highlight sync (all plans). */
  const [voiceSegments, setVoiceSegments] = useState<Segment[] | null>(null)
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null)
  // Backend-authoritative Free daily-import paywall — mirrors the pattern used by every other quota-consuming tool.
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallReason, setPaywallReason] = useState<PaywallReason>('FREE_DAILY_LIMIT_REACHED')

  const audioRef = useRef<HTMLAudioElement>(null)
  const audioPlaybackTimeRef = useRef(0)
  const scrubberRef = useRef<HTMLInputElement>(null)
  const timeDisplayRef = useRef<HTMLSpanElement>(null)
  const durationDisplayRef = useRef<HTMLSpanElement>(null)
  const volumeSliderRef = useRef<HTMLInputElement>(null)
  const segmentRefsRef = useRef<Map<number, HTMLParagraphElement>>(new Map())
  const [activeSegIdx, setActiveSegIdx] = useState(-1)
  const [audioIsPlaying, setAudioIsPlaying] = useState(false)
  const [audioDuration, setAudioDuration] = useState(0)
  const [audioVolume, setAudioVolume] = useState(1)
  const [audioMuted, setAudioMuted] = useState(false)
  const [audioSpeed, setAudioSpeed] = useState(1)
  // Live transcription state (Deepgram streaming during recording)
  const [liveFinal, setLiveFinal] = useState('')
  const [liveInterim, setLiveInterim] = useState('')

  const syncScrubberFill = useCallback(() => {
    const el = scrubberRef.current
    if (!el) return
    const max = parseFloat(el.max) || 1
    const val = parseFloat(el.value) || 0
    el.style.setProperty('--fill', `${Math.min(100, Math.max(0, (val / max) * 100))}%`)
  }, [])
  const syncVolumeFill = useCallback(() => {
    const el = volumeSliderRef.current
    if (!el) return
    const v = parseFloat(el.value)
    const pct = Number.isFinite(v) ? v * 100 : 0
    el.style.setProperty('--fill', `${Math.min(100, Math.max(0, pct))}%`)
  }, [])

  const audioObjectUrl = useMemo(
    () => voiceAudioUrl
      ? (voiceAudioUrl.startsWith('blob:') ? voiceAudioUrl : getAbsoluteDownloadUrl(voiceAudioUrl))
      : null,
    [voiceAudioUrl]
  )

  const handlePlaybackTime = useCallback(
    (t: number) => {
      audioPlaybackTimeRef.current = t
      if (voiceSegments?.length) {
        const newIdx = getActiveSegmentIndexAtTime(voiceSegments, t)
        setActiveSegIdx((prev) => (prev === newIdx ? prev : newIdx))
      }
    },
    [voiceSegments]
  )

  useEffect(() => {
    if (!audioObjectUrl) return
    syncVolumeFill()
  }, [audioObjectUrl, audioVolume, syncVolumeFill])

  useEffect(() => {
    if (phase === 'result' && !isLoggedIn()) {
      const t = setTimeout(() => setShowAuthGate(true), 3000)
      return () => clearTimeout(t)
    }
  }, [phase])

  useEffect(() => {
    if (!voiceAudioUrl) return
    setActiveSegIdx(-1)
    setAudioIsPlaying(false)
    audioPlaybackTimeRef.current = 0
    if (scrubberRef.current) {
      scrubberRef.current.value = '0'
      scrubberRef.current.style.setProperty('--fill', '0%')
    }
    if (timeDisplayRef.current) timeDisplayRef.current.textContent = formatTimestamp(0)
    if (durationDisplayRef.current) durationDisplayRef.current.textContent = formatTimestamp(0)
  }, [voiceAudioUrl])

  useEffect(() => {
    if (phase !== 'result' || activeSegIdx < 0 || !audioIsPlaying) return
    const el = segmentRefsRef.current.get(activeSegIdx)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [phase, activeSegIdx, audioIsPlaying])

  // Refs — stable, no stale closures
  const phaseRef = useRef<Phase>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const stopPollRef = useRef<(() => void) | null>(null)
  const barsRef = useRef<number[]>(new Array(NUM_BARS).fill(0.05))
  const wsLiveRef = useRef<WebSocket | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const speakersSeenRef = useRef<Set<number>>(new Set())
  const utterancesAccRef = useRef<Array<{ text: string; start?: number; end?: number }>>([]) // accumulates Deepgram finals

  // Keep phase ref in sync for RAF closure access
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  // Global cleanup on unmount
  useEffect(
    () => () => {
      releaseAudio()
      abortRef.current?.abort()
      stopPollRef.current?.()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    },
    []
  )

  // ── Audio resource cleanup ─────────────────────────────────────────────────
  function releaseAudio() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    workletNodeRef.current?.disconnect()
    workletNodeRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    analyserRef.current = null
  }

  // ── Waveform canvas ────────────────────────────────────────────────────────
  function runWaveform() {
    function frame() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const analyser = analyserRef.current
      const isRec = phaseRef.current === 'recording'
      let freq: Uint8Array | null = null

      if (analyser && isRec) {
        freq = new Uint8Array(analyser.frequencyBinCount)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — Uint8Array<ArrayBufferLike> vs Uint8Array<ArrayBuffer> TS lib mismatch; runtime-correct
        analyser.getByteFrequencyData(freq)
      }

      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const gap = 3
      const bw = (W - (NUM_BARS - 1) * gap) / NUM_BARS
      const step = freq ? Math.max(1, Math.floor(freq.length / NUM_BARS)) : 1
      const now = Date.now() / 1000

      for (let i = 0; i < NUM_BARS; i++) {
        let target: number
        if (freq && isRec) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += freq[i * step + j] ?? 0
          target = sum / step / 255
        } else {
          // Gentle breathing idle animation
          target = 0.04 + Math.abs(Math.sin(now * 0.7 + i * 0.22)) * 0.12
        }

        // Smooth lerp — slower for idle, snappy for live audio
        barsRef.current[i] += (target - barsRef.current[i]) * (isRec ? 0.35 : 0.06)

        const bh = Math.max(3, barsRef.current[i] * H * 0.88)
        const x = i * (bw + gap)
        const y = (H - bh) / 2
        const a = 0.5 + barsRef.current[i] * 0.5

        ctx.fillStyle = isRec ? `rgba(239,68,68,${a})` : `rgba(124,58,237,${a})`

        // Rounded bars via arcTo
        const r = Math.min(bw / 2, 3)
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + bw, y, x + bw, y + bh, r)
        ctx.arcTo(x + bw, y + bh, x, y + bh, r)
        ctx.arcTo(x, y + bh, x, y, r)
        ctx.arcTo(x, y, x + bw, y, r)
        ctx.closePath()
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(frame)
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(frame)
  }

  // Canvas ref callback — init dimensions once, then start animation
  const initCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el
    if (!el) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }
    const dpr = window.devicePixelRatio || 1
    const rect = el.getBoundingClientRect()
    el.width = (rect.width || 600) * dpr
    el.height = (rect.height || 64) * dpr
    const ctx = el.getContext('2d')
    ctx?.scale(dpr, dpr)
    runWaveform()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Quota preflight ───────────────────────────────────────────────────────
  /**
   * Server message for the shared Free daily-import cap (see server/src/routes/upload.ts).
   * Matched to distinguish an entitlement rejection from any other upload failure —
   * client preflight below is UX only; this match is what lets a race-condition
   * rejection from the backend (e.g. a second tab) still open the canonical paywall
   * instead of being silently swallowed.
   */
  function isFreeDailyLimitError(message: string | undefined | null): boolean {
    return typeof message === 'string' && /free imports/i.test(message)
  }

  /**
   * UX-only preflight against the authoritative usage API. Prevents starting a new
   * quota-consuming recording when the Free daily cap is already known to be used.
   * This is NOT the enforcement point — the backend upload/job-registration request
   * remains authoritative and is checked again regardless (see handleUpload).
   */
  async function ensureVoiceQuotaAvailable(): Promise<boolean> {
    if (!isLoggedIn()) return true
    try {
      const usage = await getCurrentUsage({ skipCache: true })
      const remaining = usage.remaining ?? (usage.limit ?? 3) - (usage.used ?? usage.usage?.importCountToday ?? 0)
      if (usage.plan === 'free' && usage.quotaType === 'imports' && remaining <= 0) {
        setPaywallReason('FREE_DAILY_LIMIT_REACHED')
        setShowPaywall(true)
        return false
      }
    } catch {
      // Usage lookup failure must not block recording — backend upload still enforces the cap.
    }
    return true
  }

  // ── Recording ──────────────────────────────────────────────────────────────
  async function startRecording() {
    setErrMsg('')
    if (!(await ensureVoiceQuotaAvailable())) return
    setPhase('requesting')
    try { trackEvent('recording_started') } catch { /* non-blocking */ }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrMsg('Your browser does not support microphone access. Try Chrome, Firefox, or Safari.')
      setPhase('error')
      return
    }
    if (typeof MediaRecorder === 'undefined') {
      setErrMsg('Your browser does not support audio recording. Try Chrome or Firefox.')
      setPhase('error')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: { ideal: 16000 },
        },
      })
      streamRef.current = stream

      // Web Audio API for real-time waveform
      const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const actx = new AudioCtx()
      audioCtxRef.current = actx
      const src = actx.createMediaStreamSource(stream)
      const an = actx.createAnalyser()
      an.fftSize = 512
      an.smoothingTimeConstant = 0.75
      src.connect(an)
      analyserRef.current = an

      // MediaRecorder — start immediately so the UI transitions to 'recording' without delay
      const mt = getBestMimeType()
      const rec = new MediaRecorder(stream, mt ? { mimeType: mt } : undefined)
      recRef.current = rec
      chunksRef.current = []

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mt || 'audio/webm' })
        releaseAudio()
        handleUpload(blob, mt || 'audio/webm')
      }

      rec.start(250) // chunk every 250 ms for accurate data-available events

      setRecSecs(0)
      timerRef.current = setInterval(() => {
        setRecSecs((s) => {
          if (s + 1 >= MAX_RECORD_SECS) {
            stopRecording()
            return s
          }
          return s + 1
        })
      }, 1000)

      setPhase('recording')
      runWaveform() // restart waveform in recording mode
      trackEvent('processing_started', { tool: 'voice-recorder' })

      // ── Live transcription — background, non-blocking ──────────────────────
      // Launched AFTER setPhase('recording') so the UI responds instantly.
      // AudioWorklet load is async; recording + waveform are already running.
      void (async () => {
        try {
          const sampleRate = actx.sampleRate
          const sessionId = (crypto as { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}`
          const token = getAuthToken()
          const wsUrl =
            `${getWsBase()}/api/live-transcription` +
            `?sample_rate=${Math.round(sampleRate)}&session_id=${sessionId}` +
            (token ? `&token=${encodeURIComponent(token)}` : '')

          let liveReconnects = 0
          const MAX_LIVE_RECONNECTS = 3

          function spawnWs() {
            if (liveReconnects >= MAX_LIVE_RECONNECTS) return
            if (phaseRef.current !== 'recording') return

            const ws = new WebSocket(wsUrl)
            wsLiveRef.current = ws

            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data as string) as {
                  type: string
                  text?: string
                  is_final?: boolean
                  speaker?: number
                  start?: number  // utterance start time (seconds)
                  end?: number    // utterance end time (seconds)
                }
                if (data.type === 'transcript' && data.text) {
                  if (data.is_final) {
                    // Accumulate for final result (Deepgram-only pipeline)
                    utterancesAccRef.current.push({ text: data.text, start: data.start, end: data.end })
                    // Track distinct speakers; show [S1]/[S2] only once both appear
                    if (data.speaker != null) speakersSeenRef.current.add(data.speaker)
                    const multiSpeaker = speakersSeenRef.current.size > 1
                    const label = multiSpeaker && data.speaker != null
                      ? `[S${data.speaker + 1}] `
                      : ''
                    setLiveFinal((prev) => {
                      const line = label + data.text!
                      return prev ? prev + '\n' + line : line
                    })
                    setLiveInterim('')
                  } else {
                    setLiveInterim(data.text)
                  }
                }
              } catch { /* ignore malformed messages */ }
            }

            ws.onclose = () => {
              // Only reconnect for unintended drops — stopRecording() nulls wsLiveRef
              // before close fires, so this guard prevents reconnect on intentional stop.
              if (wsLiveRef.current === null) return
              wsLiveRef.current = null
              if (phaseRef.current === 'recording') {
                liveReconnects++
                const backoff = Math.min(500 * Math.pow(2, liveReconnects - 1), 4000)
                setTimeout(spawnWs, backoff)
              }
            }

            ws.onerror = () => { /* handled by onclose */ }
          }

          // Load AudioWorklet (off-main-thread PCM capture)
          await actx.audioWorklet.addModule('/audio-pcm-processor.js')
          // Guard: user may have stopped recording while the worklet was loading
          if (phaseRef.current !== 'recording') return

          const workletNode = new AudioWorkletNode(actx, 'pcm-capture', {
            processorOptions: { targetSize: 2048 },
          })
          workletNodeRef.current = workletNode

          // Silent output keeps the AudioWorkletNode active in the audio graph
          const silentGain = actx.createGain()
          silentGain.gain.value = 0
          silentGain.connect(actx.destination)
          workletNode.connect(silentGain)
          src.connect(workletNode)

          workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
            if (wsLiveRef.current?.readyState !== WebSocket.OPEN) return
            wsLiveRef.current.send(convertToPCM16(new Float32Array(event.data)))
          }

          spawnWs()
        } catch { /* AudioWorklet unavailable or server not configured — silently degrade */ }
      })()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/permission|denied/i.test(msg)) {
        setErrMsg(
          'Microphone access denied. Click the lock icon in your browser address bar and allow microphone access, then try again.'
        )
      } else if (/NotFound|no devices/i.test(msg)) {
        setErrMsg('No microphone found. Connect a microphone and try again.')
      } else {
        setErrMsg('Could not start microphone. Check browser permissions and try again.')
      }
      setPhase('error')
    }
  }

  function stopRecording() {
    try { trackEvent('recording_stopped', { duration_seconds: recSecs }) } catch { /* non-blocking */ }
    // Close live transcription stream before stopping MediaRecorder
    wsLiveRef.current?.close()
    wsLiveRef.current = null
    if (recRef.current && recRef.current.state !== 'inactive') {
      recRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  // ── Upload + Poll ──────────────────────────────────────────────────────────
  async function handleUpload(blob: Blob, mimeType: string) {
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([blob], `voice-recording.${ext}`, { type: mimeType })
    abortRef.current = new AbortController()

    // ── Fast path: Deepgram finals available → instant result ─────────────
    const utterances = utterancesAccRef.current
    const deepgramText = utterances.map((u) => u.text.trim()).filter(Boolean).join('\n\n')

    if (deepgramText) {
      const segs = utterances
        .filter((u): u is { text: string; start: number; end: number } => u.start !== undefined)
        .map((u) => ({ start: u.start, end: u.end, text: u.text.trim() }))
      const words = deepgramText.trim().split(/\s+/).filter(Boolean).length

      // Local blob URL for immediate playback (no server round-trip needed). Showing the
      // live-captioned transcript here is UX only — it is NOT yet a confirmed,
      // quota-consuming success. That confirmation (and `processing_completed`) waits for
      // the backend upload below, which is the authoritative entitlement check.
      setVoiceAudioUrl(URL.createObjectURL(blob))
      setTranscript(deepgramText)
      setVoiceSegments(segs.length ? segs : null)
      setPhase('result')
      toast.success('Transcript ready!')
      trackEvent('realtime_transcript_shown', { tool: 'voice-recorder', words })

      // Register the job with the backend — this is what checks the shared Free daily
      // quota and (on success) increments usage. Its outcome, not the live Deepgram
      // preview, decides whether this recording counts as a completed quota-consuming job.
      try {
        const res = await uploadFileWithProgress(
          file,
          {
            toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
            uploadMode: 'audio-only',
            originalFileName: file.name,
            exportFormats: ['txt'],
            precomputedTranscript: JSON.stringify({ fullText: deepgramText, segments: segs }),
          },
          { signal: abortRef.current.signal }
        )
        setVoiceJobId(res.jobId)
        setVoiceJobToken(res.jobToken ?? null)
        invalidateUsageCache()
        trackEvent('processing_completed', { tool: 'voice-recorder', words })
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        if (isFreeDailyLimitError(message)) {
          // Backend is authoritative: even though a preflight already ran before recording
          // started, a race (e.g. a second tab) can still exhaust the quota in between.
          // The live transcript stays visible — it was already rendered during recording
          // and cannot be un-shown — but it is NOT registered as a completed job: no
          // jobId/jobToken is set, FreePlanNudge never mounts (gated on voiceJobId), and
          // processing_completed is never fired, so this never counts as, or is billed
          // toward, a successful quota-consuming result.
          setPaywallReason('FREE_DAILY_LIMIT_REACHED')
          setShowPaywall(true)
        }
        // Non-entitlement failures (network hiccup, server error, etc.) are handled the
        // same as before: the transcript the user already has stays usable; only the
        // share link / guest-claim registration for this recording is unavailable.
      }
      return
    }

    // ── Fallback path: no Deepgram data → use Whisper ─────────────────────
    setPhase('uploading')
    setUploadPct(0)

    try {
      const res = await uploadFileWithProgress(
        file,
        {
          toolType: BACKEND_TOOL_TYPES.VIDEO_TO_TRANSCRIPT,
          uploadMode: 'audio-only',
          originalFileName: file.name,
          exportFormats: ['txt'],
        },
        { onProgress: (p) => setUploadPct(p), signal: abortRef.current.signal }
      )

      setVoiceJobId(res.jobId)
      setVoiceJobToken(res.jobToken ?? null)

      setPhase('processing')
      setPartial('')

      stopPollRef.current = subscribeJobStatus(
        res.jobId,
        { jobToken: res.jobToken },
        async (s) => {
          if (s.partialTranscript) setPartial(s.partialTranscript)

          if (s.status === 'completed' && s.result) {
            stopPollRef.current?.()
            setVoiceSegments(s.result.segments?.length ? s.result.segments : null)
            setVoiceAudioUrl(s.result.audioUrl ?? null)
            let text = ''
            if (s.result.segments?.length) {
              text = s.result.segments.map((seg) => seg.text).join('\n\n')
            } else if (s.result.downloadUrl) {
              try {
                text = await fetch(getAbsoluteDownloadUrl(s.result.downloadUrl)).then((r) =>
                  r.text()
                )
              } catch {
                // fallback — empty transcript is better than crashing
              }
            }
            setTranscript(text)
            setPhase('result')
            invalidateUsageCache()
            trackEvent('processing_completed', {
              tool: 'voice-recorder',
              words: text.trim().split(/\s+/).filter(Boolean).length,
            })
            toast.success('Transcript ready!')
          } else if (s.status === 'failed') {
            stopPollRef.current?.()
            setErrMsg('Transcription failed. Please try again.')
            setPhase('error')
          }
        }
      )
    } catch (err: unknown) {
      if (abortRef.current?.signal.aborted) return
      const msg = err instanceof Error ? err.message : String(err)
      if (isFreeDailyLimitError(msg)) {
        // Authoritative backend rejection: no transcript exists yet on this path (Whisper
        // fallback has no live Deepgram preview), so there is nothing to preserve — go
        // straight to the canonical paywall instead of a generic error state.
        setPhase('idle')
        setPaywallReason('FREE_DAILY_LIMIT_REACHED')
        setShowPaywall(true)
        return
      }
      setErrMsg(msg || 'Upload failed. Please try again.')
      setPhase('error')
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function copyTranscript() {
    if (!isLoggedIn()) {
      setAuthModalMode('signup-combo')
      setShowAuthModal(true)
      return
    }
    const displayText = transcriptView === 'translated' && translatedText ? translatedText : transcript
    const textToCopy = isPaidPlan ? displayText : displayText + WATERMARK_CLIPBOARD_SUFFIX
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast.success(isPaidPlan ? 'Copied to clipboard!' : 'Copied (with watermark)')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  async function handleTranslate() {
    if (!transcript.trim() || isTranslating) return
    setIsTranslating(true)
    setTranslatedText(null)
    try {
      const token = getAuthToken()
      const res = await fetch(`${getApiBase()}/api/translate-transcript/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: transcript, targetLanguage: translateLanguage }),
      })
      if (!res.ok) throw new Error('Translation failed')
      const { translatedText: result } = await res.json() as { translatedText: string }
      setTranslatedText(result)
      setTranscriptView('translated')
    } catch {
      toast.error('Translation failed. Please try again.')
    } finally {
      setIsTranslating(false)
    }
  }

  function downloadTranscript(which: 'original' | 'translated' = 'original') {
    const useTranslated = which === 'translated' && translatedText
    const baseText = useTranslated ? translatedText! : transcript
    const content = isPaidPlan ? baseText : applyWatermarkToTxt(baseText)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = joinExportFilename(
      exportFileStem(undefined, 'voice_recording'),
      useTranslated
        ? `transcript_translated_${targetLangFileSlug(translateLanguage)}`
        : 'transcript_original_auto',
      '.txt'
    )
    a.click()
    URL.revokeObjectURL(url)
    try { trackEvent('result_downloaded', { tool: 'voice-recorder', format: 'txt', translated: useTranslated }) } catch { /* non-blocking */ }
  }

  function reset() {
    wsLiveRef.current?.close()
    wsLiveRef.current = null
    abortRef.current?.abort()
    stopPollRef.current?.()
    releaseAudio()
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setPhase('idle')
    setTranscript('')
    setPartial('')
    setRecSecs(0)
    setUploadPct(0)
    setErrMsg('')
    setLiveFinal('')
    setLiveInterim('')
    speakersSeenRef.current = new Set()
    utterancesAccRef.current = []
    setTranslatedText(null)
    setIsTranslating(false)
    setTranscriptView('original')
    setVoiceJobId(null)
    setVoiceJobToken(null)
    setVoiceSegments(null)
    setVoiceAudioUrl(null)
    setShowPaywall(false)
    setActiveSegIdx(-1)
    setAudioIsPlaying(false)
    audioPlaybackTimeRef.current = 0
    segmentRefsRef.current.clear()
    barsRef.current = new Array(NUM_BARS).fill(0.05)
    // Restart idle waveform after React paint
    setTimeout(() => canvasRef.current && runWaveform(), 50)
  }

  const isPaidPlan =
    typeof window !== 'undefined' &&
    hasPaidPlan(localStorage.getItem('plan'))

  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length
  const showCanvas = phase === 'idle' || phase === 'requesting' || phase === 'recording'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ToolLayout
      breadcrumbs={[{ label: 'Voice Recorder', href: '/voice-recorder' }]}
      title="Voice to Text — In-Browser Recorder"
      subtitle="Speak in the browser and get text. No video upload to start. Files deleted after processing. 3 free imports/mo."
      icon={<Mic className="w-5 h-5 text-blue-600" />}
      tags={['Free', '99 Languages', 'Live Transcription', 'Translation']}
      coreToolPath="/voice-recorder"
    >
      <div className={`max-w-2xl mx-auto space-y-5 ${audioObjectUrl ? 'pb-24 sm:pb-28' : 'pb-16'}`}>
        <UpgradeBanner variant="voice" tool="voice-recorder" />

        {/* ── Main recorder card ──────────────────────────────────────────── */}
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-xl shadow-card-elevated overflow-hidden"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <AnimatePresence mode="wait" initial={false}>

            {/* ── IDLE & REQUESTING ─────────────────────────────────────── */}
            {(phase === 'idle' || phase === 'requesting') && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 sm:p-10 flex flex-col items-center gap-7"
              >
                {/* Waveform canvas */}
                <div className="w-full" style={{ height: 56 }}>
                  <canvas
                    ref={initCanvas}
                    aria-hidden="true"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </div>

                {/* Mic button with breathing ring */}
                <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-blue-100 dark:bg-blue-900/30"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0.25, 0.7] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute inset-3 rounded-full bg-blue-50 dark:bg-blue-900/20"
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.15, 0.5] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                  />
                  <button
                    onClick={phase === 'idle' ? startRecording : undefined}
                    disabled={phase === 'requesting'}
                    className="relative z-10 w-[84px] h-[84px] rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-xl shadow-blue-200/70 dark:shadow-blue-900/50 transition-all duration-200 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                    aria-label="Start voice recording"
                  >
                    {phase === 'requesting' ? (
                      <motion.div
                        className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : (
                      <Mic className="w-9 h-9 text-white" strokeWidth={1.5} />
                    )}
                  </button>
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {phase === 'requesting' ? 'Requesting microphone…' : 'Tap to start recording'}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Up to 1 hour · All languages detected automatically
                  </p>
                </div>

                {/* Trust badges */}
                <div className="flex items-center gap-5 flex-wrap justify-center pt-1">
                  {[
                    { Icon: ShieldCheck, label: 'Noise suppressed' },
                    { Icon: Globe, label: '99 languages' },
                    { Icon: Zap, label: 'Results in ~8s' },
                  ].map(({ Icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                    >
                      <Icon className="w-3.5 h-3.5 text-blue-600" />
                      {label}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── RECORDING ─────────────────────────────────────────────── */}
            {phase === 'recording' && (
              <motion.div
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 sm:p-10 flex flex-col items-center gap-7"
              >
                {/* REC badge + timer */}
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                    <motion.span
                      className="w-2 h-2 rounded-full bg-red-500 inline-block"
                      animate={{ opacity: [1, 0.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    REC
                  </span>
                  <span className="text-3xl font-mono font-semibold text-gray-800 dark:text-gray-100 tabular-nums tracking-widest">
                    {formatTime(recSecs)}
                  </span>
                </div>

                {/* Live waveform */}
                <div className="w-full" style={{ height: 56 }}>
                  <canvas
                    ref={initCanvas}
                    aria-hidden="true"
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  />
                </div>

                {/* Stop button with pulsing ring */}
                <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/30"
                    animate={{ scale: [1, 1.22, 1], opacity: [0.8, 0.2, 0.8] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <button
                    onClick={stopRecording}
                    className="relative z-10 w-[84px] h-[84px] rounded-full bg-red-500 hover:bg-red-600 shadow-xl shadow-red-200/70 dark:shadow-red-900/50 transition-all duration-200 flex items-center justify-center active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                    aria-label="Stop recording"
                  >
                    <Square className="w-8 h-8 text-white fill-white" />
                  </button>
                </div>

                <div className="text-center space-y-1.5">
                  <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    Tap to stop recording
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Background noise is being filtered
                  </p>
                </div>

                {/* ── Live transcript preview ──────────────────────────── */}
                {(liveFinal || liveInterim) && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-4 max-h-44 overflow-y-auto"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"
                        animate={{ opacity: [1, 0.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                        Live
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {liveFinal}
                      {liveInterim && (
                        <span className="text-gray-400 dark:text-gray-500 italic">
                          {liveFinal ? ' ' : ''}
                          {liveInterim}
                        </span>
                      )}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── UPLOADING / PROCESSING ────────────────────────────────── */}
            {(phase === 'uploading' || phase === 'processing') && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 sm:p-10 flex flex-col items-center gap-6"
              >
                {/* Animated icon */}
                <div className="w-[76px] h-[76px] rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-9 h-9 text-blue-600 dark:text-blue-400" />
                  </motion.div>
                </div>

                <div className="text-center space-y-1.5 w-full">
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {phase === 'uploading' ? 'Uploading recording…' : 'Transcribing with AI…'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {phase === 'uploading'
                      ? 'Preparing your audio for the AI'
                      : 'Usually takes 5–8 seconds'}
                  </p>
                </div>

                {/* Upload progress bar */}
                {phase === 'uploading' && (
                  <div className="w-full max-w-xs bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${uploadPct}%` }}
                      transition={{ duration: 0.25 }}
                    />
                  </div>
                )}

                {/* Processing pulse dots */}
                {phase === 'processing' && !partial && (
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2.5 h-2.5 rounded-full bg-blue-600"
                        animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
                      />
                    ))}
                  </div>
                )}

                {/* Partial transcript preview — signed-in only */}
                {phase === 'processing' && partial && isLoggedIn() && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 max-h-32 overflow-y-auto"
                  >
                    <p className="text-sm text-blue-800 dark:text-blue-200 italic leading-relaxed">
                      "{partial}"
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── RESULT ────────────────────────────────────────────────── */}
            {phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="p-6 sm:p-8 space-y-5"
              >
                {/* Teaser card for guests */}
                {showAuthGate && !isLoggedIn() && (
                  <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden select-none">
                    <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">Voice transcript ready!</span>
                      </div>
                      <span className="text-xs text-gray-400">{wordCount.toLocaleString()} words · {formatTime(recSecs)} recorded</span>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Create a free account to view, copy, and download your transcript.
                      </p>
                      <p className="text-[11px] text-gray-400 mb-2 font-medium">Sign up to unlock:</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(['Full transcript', 'Download TXT', 'Copy text'] as const).map((feat) => (
                          <span key={feat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-400 dark:text-gray-500">
                            <Lock className="w-2.5 h-2.5" />
                            {feat}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setAuthModalMode('signup-combo'); setShowAuthModal(true) }}
                          className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                        >
                          Create free account
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAuthModalMode('login'); setShowAuthModal(true) }}
                          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          Log in
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Full result — hidden until signed in */}
                {(!showAuthGate || isLoggedIn()) && (<>
                {/* Result header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                      <Check className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        Transcript ready
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'} · {formatTime(recSecs)} recorded
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={copyTranscript}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copied ? 'Copied!' : isPaidPlan ? 'Copy' : 'Copy (watermarked)'}
                    </button>
                    <button
                      onClick={() => downloadTranscript('original')}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isPaidPlan ? 'Download original' : 'Download original (watermarked)'}
                    </button>
                    {isPaidPlan && translatedText && (
                      <button
                        type="button"
                        onClick={() => downloadTranscript('translated')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 dark:border-blue-700 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download {translateLanguage}
                      </button>
                    )}
                  </div>
                </div>

                {/* Translation sub-tabs — shown when translation is available */}
                {isPaidPlan && translatedText && (
                  <div className="flex gap-1 border-b border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setTranscriptView('original')}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        transcriptView === 'original'
                          ? 'text-gray-900 dark:text-white border-b-2 border-blue-500'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      Original
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranscriptView('translated')}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        transcriptView === 'translated'
                          ? 'text-gray-900 dark:text-white border-b-2 border-blue-500'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                      }`}
                    >
                      {translateLanguage}
                    </button>
                  </div>
                )}

                {/* Transcript body — segment highlight + tap-to-seek when audio + timed segments exist */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 max-h-80 overflow-y-auto">
                  {(() => {
                    const displayText = transcriptView === 'translated' && translatedText ? translatedText : transcript
                    const showSegmentSync =
                      audioObjectUrl &&
                      voiceSegments?.length &&
                      !(transcriptView === 'translated' && translatedText)
                    if (showSegmentSync && voiceSegments) {
                      return (
                        <div className="space-y-2">
                          {voiceSegments.map((seg, i) => {
                            const isActive = i === activeSegIdx
                            return (
                              <p
                                key={i}
                                ref={(el) => {
                                  if (el) segmentRefsRef.current.set(i, el)
                                  else segmentRefsRef.current.delete(i)
                                }}
                                onClick={() => {
                                  if (!audioRef.current) return
                                  audioRef.current.currentTime = seg.start
                                  void audioRef.current.play().catch(() => {})
                                }}
                                className={`text-sm leading-relaxed rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer ${
                                  isActive
                                    ? 'bg-amber-100/95 dark:bg-amber-900/40 text-gray-900 dark:text-gray-100 font-medium shadow-sm'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-800/60'
                                }`}
                              >
                                {seg.text}
                              </p>
                            )
                          })}
                        </div>
                      )
                    }
                    return displayText.trim() ? (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {displayText}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                        No speech detected. Try recording again in a quieter environment.
                      </p>
                    )
                  })()}
                </div>

                {/* Translation panel — Pro only */}
                {isPaidPlan && transcript.trim() && (
                  <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    translatedText ? 'border-blue-200 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20' : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-blue-500 shrink-0" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Translate</span>
                      <span className="ml-auto text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">Pro</span>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={translateLanguage}
                        onChange={(e) => {
                          setTranslateLanguage(e.target.value)
                          setTranslatedText(null)
                          setTranscriptView('original')
                        }}
                        className="flex-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleTranslate}
                        disabled={isTranslating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
                      >
                        {isTranslating ? (
                          <>
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                            Translating…
                          </>
                        ) : (
                          <>
                            <Languages className="w-3.5 h-3.5" />
                            {translatedText ? 'Re-translate' : 'Translate'}
                          </>
                        )}
                      </button>
                    </div>
                    {translatedText && (
                      <p className="text-xs text-blue-500 dark:text-blue-400">
                        Translation ready — switch tabs above to view.
                      </p>
                    )}
                  </div>
                )}

                {phase === 'result' && voiceJobId && voiceJobToken && transcript.trim() && (
                  <TranscriptSharePanel
                    jobId={voiceJobId}
                    jobToken={voiceJobToken}
                    sourceTool="voice-to-text"
                    title="Voice recording"
                    originalFullText={transcript}
                    translatedFullText={translatedText}
                    translationLanguage={translatedText ? translateLanguage : null}
                  />
                )}

                {/* Pro-locked feature teasers — free users only */}
                {!isPaidPlan && transcript.trim().length > 0 && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Unlock with Pro
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { Icon: Users,     label: 'Speaker Labels', desc: 'Who said what' },
                        { Icon: Sparkles,  label: 'AI Summary',     desc: 'Key points extracted' },
                        { Icon: Languages, label: 'Translation',    desc: '70+ languages' },
                        { Icon: FileText,  label: 'SRT Export',     desc: 'Subtitle-ready format' },
                      ] as const).map(({ Icon, label, desc }) => (
                        <Link
                          to="/pricing"
                          key={label}
                          className="flex flex-col items-center gap-1.5 rounded-lg bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700/60 p-3 text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                        >
                          <div className="relative">
                            <Icon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                            <Lock className="w-3 h-3 text-blue-600 absolute -top-1 -right-1" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                            {label}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                            {desc}
                          </span>
                        </Link>
                      ))}
                    </div>
                    <Link
                      to="/pricing"
                      className="block text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Unlock Pro — $7.99/mo →
                    </Link>
                  </div>
                )}

                </>)}{/* end gate-hidden result */}
                {voiceJobId && <FreePlanNudge tool="voice" resultKey={voiceJobId} />}

                {/* Record again */}
                <button
                  onClick={reset}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Record another
                </button>
              </motion.div>
            )}

            {/* ── ERROR ─────────────────────────────────────────────────── */}
            {phase === 'error' && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 sm:p-10 flex flex-col items-center gap-6 text-center"
              >
                <div className="w-[76px] h-[76px] rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-9 h-9 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    Something went wrong
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                    {errMsg || 'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
                <button onClick={reset} className="btn-primary px-8">
                  Try again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* ── Tip row (only in idle) ──────────────────────────────────────── */}
        <AnimatePresence>
          {showCanvas && phase === 'idle' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="flex items-center justify-center gap-6 flex-wrap"
            >
              {[
                'Works best in quiet environments',
                'Speak clearly at normal pace',
                'All accents supported',
              ].map((tip) => (
                <span key={tip} className="text-xs text-gray-400 dark:text-gray-500">
                  · {tip}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {audioObjectUrl && phase === 'result' && (
          <PinnedAudioPlayerBar
            audioSrc={audioObjectUrl}
            audioRef={audioRef}
            scrubberRef={scrubberRef}
            timeDisplayRef={timeDisplayRef}
            durationDisplayRef={durationDisplayRef}
            volumeSliderRef={volumeSliderRef}
            audioDuration={audioDuration}
            setAudioDuration={setAudioDuration}
            audioIsPlaying={audioIsPlaying}
            setAudioIsPlaying={setAudioIsPlaying}
            audioMuted={audioMuted}
            setAudioMuted={setAudioMuted}
            audioVolume={audioVolume}
            setAudioVolume={setAudioVolume}
            audioSpeed={audioSpeed}
            setAudioSpeed={setAudioSpeed}
            syncScrubberFill={syncScrubberFill}
            syncVolumeFill={syncVolumeFill}
            onPlaybackTime={handlePlaybackTime}
            crossOrigin={
              typeof window !== 'undefined' && API_ORIGIN !== window.location.origin
                ? 'anonymous'
                : undefined
            }
          />
        )}

        <CoreToolSeoDepth path="/voice-recorder" />

      </div>

      <JobAuthGateModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authModalMode}
        jobDescription="Your voice transcript is ready!"
        onAuthSuccess={async () => {
          if (voiceJobId && voiceJobToken) {
            try { await claimGuestJob(voiceJobId, voiceJobToken) } catch { /* best-effort */ }
          }
          setShowAuthGate(false)
          setShowAuthModal(false)
          window.location.reload()
        }}
      />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        reason={paywallReason}
        tool="voice-recorder"
      />
    </ToolLayout>
  )
}
