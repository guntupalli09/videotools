import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, AlertTriangle, AlertCircle, CheckCircle2,
  Repeat, Download, Eye, EyeOff, X, Pencil,
} from 'lucide-react'
import type { SubtitleRow } from './SubtitleEditor'
import { parseTimeToMs } from '../lib/subtitleUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubtitleQAReviewProps {
  videoSrc: string | null
  rows: SubtitleRow[]
  onRowsChange: (rows: SubtitleRow[]) => void
  editable: boolean
  onDownloadEdited: () => void
}

interface ParsedCue {
  index: number
  cueNumber: number
  startMs: number
  endMs: number
  startSec: number
  endSec: number
  text: string
  speaker: string | null
}

interface QAIssue {
  cueIndex: number
  type: 'overlap' | 'long-line' | 'fast-reading' | 'empty' | 'bad-timing' | 'short-duration' | 'ai-artifact' | 'large-gap'
  message: string
  severity: 'error' | 'warning'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 76
const OVERSCAN = 6
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

const AI_ARTIFACT_PATTERNS: RegExp[] = [
  /\[inaudible\]/i,
  /\[unintelligible\]/i,
  /\[crosstalk\]/i,
  /\[noise\]/i,
  /\[applause\]/i,
  /\[laughter\]/i,
  /♪/,
  /\b(\w{3,})\s+\1\s+\1\b/i,
]

const ISSUE_TYPE_LABELS: Record<QAIssue['type'], string> = {
  overlap: 'Overlap',
  'long-line': 'Long line',
  'fast-reading': 'Fast CPS',
  empty: 'Empty',
  'bad-timing': 'Bad timing',
  'short-duration': 'Short',
  'ai-artifact': 'AI artifact',
  'large-gap': 'Gap',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCues(rows: SubtitleRow[]): ParsedCue[] {
  return rows.map((row, i) => {
    const startMs = parseTimeToMs(row.startTime)
    const endMs = parseTimeToMs(row.endTime)
    const speakerMatch = row.text.match(/^\[([^\]]+)\]:\s*/)
    return {
      index: i,
      cueNumber: row.index,
      startMs,
      endMs,
      startSec: startMs / 1000,
      endSec: endMs / 1000,
      text: speakerMatch ? row.text.slice(speakerMatch[0].length) : row.text,
      speaker: speakerMatch ? speakerMatch[1] : null,
    }
  })
}

function runValidation(cues: ParsedCue[]): QAIssue[] {
  const issues: QAIssue[] = []
  for (let i = 0; i < cues.length; i++) {
    const c = cues[i]
    const durSec = (c.endMs - c.startMs) / 1000

    if (!c.text.trim())
      issues.push({ cueIndex: i, type: 'empty', message: `Cue ${c.cueNumber}: Empty subtitle text`, severity: 'error' })

    if (c.endMs <= c.startMs)
      issues.push({ cueIndex: i, type: 'bad-timing', message: `Cue ${c.cueNumber}: End time is not after start time`, severity: 'error' })

    if (durSec < 0.8 && durSec > 0 && c.text.trim())
      issues.push({ cueIndex: i, type: 'short-duration', message: `Cue ${c.cueNumber}: Very short display time (${durSec.toFixed(2)}s)`, severity: 'warning' })

    if (i + 1 < cues.length && c.endMs > cues[i + 1].startMs) {
      const overlapMs = c.endMs - cues[i + 1].startMs
      issues.push({ cueIndex: i, type: 'overlap', message: `Cue ${c.cueNumber} overlaps cue ${cues[i + 1].cueNumber} by ${overlapMs}ms`, severity: 'error' })
    }

    const longestLine = c.text.split('\n').reduce((mx, l) => Math.max(mx, l.length), 0)
    if (longestLine > 42)
      issues.push({ cueIndex: i, type: 'long-line', message: `Cue ${c.cueNumber}: Line too long (${longestLine} chars, max 42)`, severity: 'warning' })

    const chars = c.text.replace(/\n/g, ' ').length
    const cps = durSec > 0 ? chars / durSec : 0
    if (cps > 21)
      issues.push({ cueIndex: i, type: 'fast-reading', message: `Cue ${c.cueNumber}: Reading speed too high (${cps.toFixed(1)} CPS, max 21)`, severity: 'warning' })

    if (i + 1 < cues.length) {
      const gapSec = (cues[i + 1].startMs - c.endMs) / 1000
      if (gapSec > 4)
        issues.push({ cueIndex: i, type: 'large-gap', message: `Cue ${c.cueNumber}: ${gapSec.toFixed(1)}s gap to next cue`, severity: 'warning' })
    }

    for (const pattern of AI_ARTIFACT_PATTERNS) {
      if (pattern.test(c.text)) {
        issues.push({ cueIndex: i, type: 'ai-artifact', message: `Cue ${c.cueNumber}: Possible AI artifact detected`, severity: 'warning' })
        break
      }
    }
  }
  return issues
}

function findActiveCue(timeSec: number, cues: ParsedCue[]): number {
  if (!cues.length) return -1
  let lo = 0, hi = cues.length - 1, best = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (cues[mid].startSec <= timeSec) { best = mid; lo = mid + 1 }
    else hi = mid - 1
  }
  if (best >= 0 && timeSec < cues[best].endSec) return best
  return -1
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubtitleQAReview({
  videoSrc,
  rows,
  onRowsChange,
  editable,
  onDownloadEdited,
}: SubtitleQAReviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const loopStateRef = useRef({ isLoopingCue: false, activeCueIdx: -1, loopRange: null as [number, number] | null })
  const lastAutoScrollIdx = useRef(-1)
  const editTextareaRef = useRef<HTMLTextAreaElement>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [activeCueIdx, setActiveCueIdx] = useState(-1)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const [isLoopingCue, setIsLoopingCue] = useState(false)
  const [loopRange] = useState<[number, number] | null>(null)
  const [reviewed, setReviewed] = useState<Set<number>>(new Set())
  const [issuesOpen, setIssuesOpen] = useState(false)
  const [activeIssuePtr, setActiveIssuePtr] = useState(0)
  const [listScrollTop, setListScrollTop] = useState(0)
  const [listHeight, setListHeight] = useState(480)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [showReviewed, setShowReviewed] = useState(true)
  const [editMode, setEditMode] = useState(false)

  const parsedCues = useMemo(() => parseCues(rows), [rows])
  const issues = useMemo(() => runValidation(parsedCues), [parsedCues])

  const errorCount = useMemo(() => issues.filter((iss: QAIssue) => iss.severity === 'error').length, [issues])
  const warnCount = useMemo(() => issues.filter((iss: QAIssue) => iss.severity === 'warning').length, [issues])

  const issuesByCue = useMemo(() => {
    const map = new Map<number, QAIssue[]>()
    for (const issue of issues) {
      const arr = map.get(issue.cueIndex) ?? []
      arr.push(issue)
      map.set(issue.cueIndex, arr)
    }
    return map
  }, [issues])

  const visibleFirst = Math.max(0, Math.floor(listScrollTop / ROW_HEIGHT) - OVERSCAN)
  const visibleLast = Math.min(parsedCues.length - 1, Math.ceil((listScrollTop + listHeight) / ROW_HEIGHT) + OVERSCAN)

  useEffect(() => {
    loopStateRef.current = { isLoopingCue, activeCueIdx, loopRange }
  }, [isLoopingCue, activeCueIdx, loopRange])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setListHeight(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    const t = vid.currentTime
    setCurrentTime(t)

    const { isLoopingCue, activeCueIdx, loopRange } = loopStateRef.current

    if (isLoopingCue && activeCueIdx >= 0) {
      const cue = parsedCues[activeCueIdx]
      if (cue && t >= cue.endSec - 0.05) {
        vid.currentTime = cue.startSec
        return
      }
    }

    if (loopRange) {
      const [s, e] = loopRange
      if (t >= e) { vid.currentTime = s; return }
    }
  }, [parsedCues])

  useEffect(() => {
    const idx = findActiveCue(currentTime, parsedCues)
    setActiveCueIdx(idx)
    if (idx >= 0) setSelectedIdx(idx)
  }, [currentTime, parsedCues])

  useEffect(() => {
    if (activeCueIdx < 0 || activeCueIdx === lastAutoScrollIdx.current) return
    const el = listRef.current
    if (!el) return
    lastAutoScrollIdx.current = activeCueIdx
    const itemTop = activeCueIdx * ROW_HEIGHT
    const itemBottom = itemTop + ROW_HEIGHT
    const viewTop = el.scrollTop
    const viewBottom = el.scrollTop + el.clientHeight
    if (itemTop < viewTop + 20 || itemBottom > viewBottom - 20) {
      const target = itemTop - el.clientHeight / 2 + ROW_HEIGHT / 2
      el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
    }
  }, [activeCueIdx])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = containerRef.current
      if (!el || (!el.contains(document.activeElement) && document.activeElement !== el)) return

      if (e.code === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx((prev: number) => {
          const next = Math.max(0, prev - 1)
          scrollToIdx(next)
          return next
        })
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx((prev: number) => {
          const next = Math.min(parsedCues.length - 1, prev + 1)
          scrollToIdx(next)
          return next
        })
      }
      if ((e.code === 'Enter' || e.code === 'Space') && editingIdx === null) {
        e.preventDefault()
        if (selectedIdx >= 0) seekToCue(selectedIdx, true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [parsedCues.length, selectedIdx, editingIdx])

  const scrollToIdx = (idx: number) => {
    const el = listRef.current
    if (!el) return
    const target = idx * ROW_HEIGHT - el.clientHeight / 2 + ROW_HEIGHT / 2
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }

  const seekToCue = (idx: number, autoPlay = true) => {
    const cue = parsedCues[idx]
    if (!cue) return
    setSelectedIdx(idx)
    if (videoRef.current) {
      videoRef.current.currentTime = cue.startSec
      if (autoPlay) videoRef.current.play().catch(() => {})
    }
    scrollToIdx(idx)
  }

  const replayMinus3 = () => {
    if (!videoRef.current) return
    videoRef.current.currentTime = Math.max(0, currentTime - 3)
    videoRef.current.play().catch(() => {})
  }

  const toggleMarkReviewed = (e: React.MouseEvent<HTMLElement>, idx: number) => {
    e.stopPropagation()
    setReviewed((prev: Set<number>) => {
      const s = new Set(prev)
      s.has(idx) ? s.delete(idx) : s.add(idx)
      return s
    })
  }

  const jumpToIssue = (ptr: number) => {
    const issue = issues[ptr]
    if (!issue) return
    setActiveIssuePtr(ptr)
    seekToCue(issue.cueIndex, false)
  }

  const commitEdit = (idx: number, value: string) => {
    onRowsChange(rows.map((r: SubtitleRow, i: number) => (i === idx ? { ...r, text: value } : r)))
    setEditingIdx(null)
  }

  const startEdit = (e: React.MouseEvent<HTMLElement>, idx: number) => {
    if (!editable) return
    e.stopPropagation()
    setEditDraft(rows[idx]?.text ?? '')
    setEditingIdx(idx)
    setTimeout(() => editTextareaRef.current?.focus(), 0)
  }

  const getRowClasses = (idx: number): string => {
    const cueIssues = issuesByCue.get(idx)
    const hasError = cueIssues?.some((iss: QAIssue) => iss.severity === 'error')
    const hasWarning = cueIssues?.some((iss: QAIssue) => iss.severity === 'warning')
    const isActive = idx === activeCueIdx
    const isSelected = idx === selectedIdx

    if (isActive) return 'bg-blue-50 border-l-[3px] border-l-blue-500'
    if (hasError) return 'bg-red-50/70 border-l-[3px] border-l-red-500'
    if (hasWarning) return 'bg-amber-50/70 border-l-[3px] border-l-amber-500/70'
    if (isSelected) return 'bg-gray-100 border-l-[3px] border-l-gray-300'
    return 'border-l-[3px] border-l-transparent'
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="rounded-xl overflow-hidden bg-white border border-gray-200 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className="text-sm font-medium text-gray-900 tracking-tight">QA Review</span>
          <span className="text-xs text-gray-400 tabular-nums">{parsedCues.length} cues</span>
          {reviewed.size > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-emerald-600 tabular-nums">{reviewed.size} reviewed</span>
            </>
          )}
          {errorCount > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-red-600 tabular-nums">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
            </>
          )}
          {warnCount > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-amber-600 tabular-nums">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <button
            onClick={() => setShowReviewed(!showReviewed)}
            title={showReviewed ? 'Hide reviewed cues' : 'Show reviewed cues'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {showReviewed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Reviewed</span>
          </button>
          {editable && (
            <button
              onClick={() => setEditMode(m => !m)}
              title={editMode ? 'Exit edit mode' : 'Edit subtitle text'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                editMode
                  ? 'bg-blue-50 text-blue-600 border-blue-300'
                  : 'text-gray-600 border-gray-200 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{editMode ? 'Editing' : 'Edit'}</span>
            </button>
          )}
          {editable && (
            <button
              onClick={onDownloadEdited}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              Export edited
            </button>
          )}
        </div>
      </div>

      {/* ── Edit mode banner ───────────────────────────────────────────── */}
      {editMode && editable && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
          <Pencil className="h-3 w-3 text-blue-500 shrink-0" />
          <span className="text-xs text-blue-600">Click any subtitle to edit · Enter to save · Esc to cancel</span>
        </div>
      )}

      {/* ── Main split layout ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:h-[420px]">

        {/* ── Left: Video Player ──────────────────────────────────────── */}
        <div className="w-full lg:w-[40%] lg:h-full flex flex-col border-b border-gray-200 dark:border-gray-800 lg:border-b-0 lg:border-r bg-black">
          {videoSrc ? (
            <>
              {/* Video area */}
              <div className="relative w-full aspect-video lg:aspect-auto lg:flex-1 lg:min-h-0 flex items-center justify-center bg-black overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="max-w-full max-h-full object-contain"
                  preload="metadata"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
                {/* Subtitle overlay */}
                {activeCueIdx >= 0 && (
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none px-4">
                    <div className="bg-black/80 text-white text-sm text-center px-3 py-1.5 rounded-lg max-w-[90%] leading-snug">
                      {parsedCues[activeCueIdx].speaker && (
                        <span className="text-purple-300 mr-1">[{parsedCues[activeCueIdx].speaker}]</span>
                      )}
                      {parsedCues[activeCueIdx].text}
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 space-y-1.5 shrink-0">
                {/* Seek bar */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 tabular-nums w-9 shrink-0">{fmtTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.05}
                    value={currentTime}
                    onChange={e => {
                      const t = Number(e.target.value)
                      if (videoRef.current) videoRef.current.currentTime = t
                      setCurrentTime(t)
                    }}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600 bg-gray-200 dark:bg-gray-700"
                  />
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 tabular-nums w-9 text-right shrink-0">{fmtTime(duration)}</span>
                </div>

                {/* Button row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Play / Pause */}
                  <button
                    onClick={() => videoRef.current && (isPlaying ? videoRef.current.pause() : videoRef.current.play().catch(() => {}))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shrink-0 shadow-sm"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>

                  {/* Replay −3s */}
                  <button
                    onClick={replayMinus3}
                    title="Replay last 3 seconds"
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-gray-700 transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>−3s</span>
                  </button>

                  {/* Loop cue */}
                  <button
                    onClick={() => setIsLoopingCue(!isLoopingCue)}
                    title="Loop current cue"
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isLoopingCue
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Repeat className="h-3.5 w-3.5" />
                    <span>Loop</span>
                  </button>

                  {/* Speed */}
                  <select
                    value={speed}
                    onChange={e => {
                      const s = Number(e.target.value)
                      setSpeed(s)
                      if (videoRef.current) videoRef.current.playbackRate = s
                    }}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    title="Playback speed"
                  >
                    {SPEED_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}×</option>
                    ))}
                  </select>

                  {/* Volume */}
                  <button
                    onClick={() => {
                      const next = !muted
                      setMuted(next)
                      if (videoRef.current) videoRef.current.muted = next
                    }}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ml-auto"
                    title={muted ? 'Unmute' : 'Mute'}
                  >
                    {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={e => {
                      const v = Number(e.target.value)
                      setVolume(v)
                      if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0 }
                      if (v > 0 && muted) setMuted(false)
                    }}
                    className="w-16 h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600 bg-gray-200 dark:bg-gray-700 shrink-0"
                  />
                </div>

              </div>
            </>
          ) : (
            <div className="min-h-[120px] lg:flex-1 flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-900 p-component">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                <Play className="h-5 w-5 text-gray-400 dark:text-gray-500 ml-0.5" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-snug">
                No video preview available.<br />
                <span className="text-xs text-gray-400 dark:text-gray-500">Timing and validation checks are still active.</span>
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Subtitle list (virtualized) ──────────────────────── */}
        <div className="w-full lg:w-[60%] flex flex-col bg-white min-h-0 h-64 lg:h-full">
          {/* Column headers */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 shrink-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.06em] text-gray-500">
              <span className="w-6 text-right shrink-0">#</span>
              <span className="w-24 shrink-0">Timestamps</span>
              <span className="flex-1">Text</span>
              <span className="w-8 text-right shrink-0">QA</span>
            </div>
          </div>

          {/* Virtual list */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
            onScroll={e => setListScrollTop((e.currentTarget).scrollTop)}
          >
            <div style={{ height: parsedCues.length * ROW_HEIGHT, position: 'relative' }}>
              {parsedCues.slice(visibleFirst, visibleLast + 1).map((cue) => {
                const idx = cue.index
                const cueIssues = issuesByCue.get(idx)
                const hasError = cueIssues?.some((iss: QAIssue) => iss.severity === 'error') ?? false
                const hasWarning = cueIssues?.some((iss: QAIssue) => iss.severity === 'warning') ?? false
                const isActive = idx === activeCueIdx
                const isReviewed = reviewed.has(idx)
                const isEditing = editingIdx === idx

                if (!showReviewed && isReviewed && !hasError && !hasWarning && !isActive) {
                  return (
                    <div
                      key={idx}
                      style={{ position: 'absolute', top: idx * ROW_HEIGHT, height: ROW_HEIGHT, left: 0, right: 0 }}
                      className="flex items-center px-3 gap-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 border-l-[3px] border-l-emerald-400/50"
                      onClick={() => seekToCue(idx, true)}
                    >
                      <span className="text-xs text-gray-400 tabular-nums w-6 text-right shrink-0">{cue.cueNumber}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/50 dark:text-emerald-600/50 shrink-0" />
                      <span className="text-xs text-gray-400 italic">Reviewed</span>
                    </div>
                  )
                }

                return (
                  <div
                    key={idx}
                    style={{ position: 'absolute', top: idx * ROW_HEIGHT, height: ROW_HEIGHT, left: 0, right: 0 }}
                    className={`flex items-start gap-2 px-3 py-2 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${getRowClasses(idx)}`}
                    onClick={() => seekToCue(idx, true)}
                  >
                    {/* Cue number */}
                    <span className="text-xs text-gray-400 tabular-nums w-6 text-right shrink-0 pt-0.5">{cue.cueNumber}</span>

                    {/* Timestamps + speaker */}
                    <div className="shrink-0 w-24">
                      <div className="text-xs font-mono text-blue-600 leading-tight tabular-nums truncate">{rows[idx]?.startTime}</div>
                      <div className="text-xs font-mono text-gray-400 leading-tight tabular-nums truncate">{rows[idx]?.endTime}</div>
                      {cue.speaker && (
                        <div className="text-xs text-purple-600 leading-tight mt-0.5 truncate font-medium">{cue.speaker}</div>
                      )}
                    </div>

                    {/* Text / edit */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <textarea
                          ref={editTextareaRef}
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onBlur={() => commitEdit(idx, editDraft)}
                          onKeyDown={e => {
                            e.stopPropagation()
                            if (e.key === 'Escape') { setEditingIdx(null); return }
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(idx, editDraft) }
                          }}
                          rows={3}
                          className="w-full bg-white border border-blue-500 text-gray-900 text-xs rounded-lg px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                        />
                      ) : (
                        <>
                          <p
                            className={`text-xs leading-snug text-gray-900 whitespace-pre-wrap break-words line-clamp-2 rounded transition-colors ${
                              editMode
                                ? 'cursor-text px-1 -mx-1 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200'
                                : ''
                            }`}
                            onClick={editMode ? e => startEdit(e, idx) : undefined}
                            onDoubleClick={e => startEdit(e, idx)}
                            title={editMode ? 'Click to edit' : editable ? 'Double-click to edit' : undefined}
                          >
                            {cue.text || <em className="text-gray-400">empty</em>}
                          </p>
                          {/* Issue badges */}
                          {cueIssues && cueIssues.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {cueIssues.slice(0, 3).map((issue, ii) => (
                                <span
                                  key={ii}
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium leading-none ${
                                    issue.severity === 'error'
                                      ? 'bg-red-50 text-red-600 border border-red-200'
                                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                                  }`}
                                >
                                  {ISSUE_TYPE_LABELS[issue.type]}
                                </span>
                              ))}
                              {cueIssues.length > 3 && (
                                <span className="text-[9px] text-gray-400">+{cueIssues.length - 3}</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Status icons */}
                    <div className="shrink-0 w-8 flex flex-col items-center gap-1 pt-0.5">
                      {hasError && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                      {!hasError && hasWarning && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      {isReviewed
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        : (
                          <button
                            onClick={e => toggleMarkReviewed(e, idx)}
                            title="Mark as reviewed"
                            className="h-3.5 w-3.5 rounded-full border border-gray-300 hover:border-emerald-500 transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
                          />
                        )
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Issues Panel ────────────────────────────────────────────────── */}
      {issues.length > 0 && (
        <div className="border-t border-gray-200 bg-white">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <button
              onClick={() => setIssuesOpen(!issuesOpen)}
              className="flex items-center gap-2 flex-1 text-left min-w-0"
            >
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm font-medium text-gray-900">{issues.length} Validation Issues</span>
              <span className="hidden sm:flex items-center gap-2 ml-1">
                {errorCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                  </span>
                )}
                {warnCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-medium">
                    {warnCount} warning{warnCount !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </button>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              <button
                onClick={() => { const p = Math.max(0, activeIssuePtr - 1); jumpToIssue(p) }}
                disabled={activeIssuePtr <= 0}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous issue"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-500 tabular-nums w-12 text-center">
                {activeIssuePtr + 1} / {issues.length}
              </span>
              <button
                onClick={() => { const p = Math.min(issues.length - 1, activeIssuePtr + 1); jumpToIssue(p) }}
                disabled={activeIssuePtr >= issues.length - 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next issue"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIssuesOpen(!issuesOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors ml-0.5"
              >
                {issuesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Issue list */}
          {issuesOpen && (
            <div className="max-h-32 overflow-y-auto divide-y divide-gray-100">
              {issues.map((issue, i) => (
                <button
                  key={i}
                  onClick={() => jumpToIssue(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                    i === activeIssuePtr
                      ? 'bg-gray-50'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {issue.severity === 'error'
                    ? <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  }
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 leading-snug">{issue.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        issue.severity === 'error'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-xs text-gray-400">{ISSUE_TYPE_LABELS[issue.type]}</span>
                    </div>
                  </div>
                  {i === activeIssuePtr && (
                    <X className="h-3.5 w-3.5 text-gray-300 ml-auto mt-0.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
