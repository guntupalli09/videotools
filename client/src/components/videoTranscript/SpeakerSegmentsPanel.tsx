import { useState } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import type { Segment } from '../../lib/srtExport'
import { PenLine, Check, X } from 'lucide-react'

type Item = {
  /** Resolved display name ("Alice" or "Speaker 1") */
  speaker: string
  /** Raw backend label ("SPEAKER_00") — used as the key for renaming */
  rawSpeaker: string
  text: string
  isDiarized: boolean
}

export default function SpeakerSegmentsPanel(props: {
  data: Item[]
  segments: Segment[] | undefined
  audioObjectUrl: string | null
  activeSegIdx: number
  transcriptView: 'original' | 'translated'
  translatedSegments: Segment[] | null | undefined
  diarizationWasRequested: boolean
  speakerSegmentRefsRef: MutableRefObject<Map<number, HTMLDivElement>>
  audioRef: RefObject<HTMLAudioElement | null>
  onRenameSpeaker?: (rawSpeaker: string, newName: string) => void
}) {
  const {
    data,
    segments,
    audioObjectUrl,
    activeSegIdx,
    transcriptView,
    translatedSegments,
    diarizationWasRequested,
    speakerSegmentRefsRef,
    audioRef,
    onRenameSpeaker,
  } = props

  const speakerColors: string[] = [
    'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30',
    'border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-950/30',
    'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30',
    'border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950/30',
    'border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30',
    'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30',
  ]
  const speakerTextColors: string[] = [
    'text-blue-600 dark:text-blue-400',
    'text-sky-600 dark:text-sky-400',
    'text-emerald-600 dark:text-emerald-400',
    'text-rose-600 dark:text-rose-400',
    'text-amber-600 dark:text-amber-400',
    'text-blue-600 dark:text-blue-400',
  ]

  // Deduplicated list of unique speakers (stable order = first appearance)
  const uniqueSpeakers = [...new Set(data.map((d) => d.rawSpeaker))]

  // For each unique raw label, get the current resolved display name
  const currentNameOf = (raw: string): string => {
    const found = data.find((d) => d.rawSpeaker === raw)
    return found?.speaker ?? raw
  }

  const speakerColorIdx = (rawName: string) => uniqueSpeakers.indexOf(rawName) % speakerColors.length

  // ── Map-speakers panel state ──────────────────────────────────────────────
  const [showMapPanel, setShowMapPanel] = useState(false)
  // draft: rawSpeaker → user input value
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const openMapPanel = () => {
    // Pre-fill drafts with current display names
    const init: Record<string, string> = {}
    for (const raw of uniqueSpeakers) init[raw] = currentNameOf(raw)
    setDrafts(init)
    setShowMapPanel(true)
  }

  const cancelMapPanel = () => {
    setDrafts({})
    setShowMapPanel(false)
  }

  const applyMappings = () => {
    if (!onRenameSpeaker) return
    for (const raw of uniqueSpeakers) {
      const trimmed = (drafts[raw] ?? '').trim()
      if (trimmed && trimmed !== currentNameOf(raw)) {
        onRenameSpeaker(raw, trimmed)
      }
    }
    setShowMapPanel(false)
    setDrafts({})
  }

  // Whether rename is available: needs the callback + at least one real speaker label
  const canRename = !!onRenameSpeaker && uniqueSpeakers.length > 0

  if (!data.length) {
    return (
      <div className="rounded-xl bg-gray-50/80 dark:bg-gray-800/60 p-4">
        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Speakers</p>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {diarizationWasRequested
            ? 'Speaker identification ran but could not detect any voices.'
            : 'Check "Speaker labels" before transcribing to see who said what.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <h3 className="text-base font-medium text-gray-900 dark:text-white">Who said what</h3>
        {audioObjectUrl && (
          <span className="ml-auto text-[11px] font-normal text-gray-400 dark:text-gray-500 shrink-0">Tap a line to seek</span>
        )}
      </div>

      {/* Subtitle + Map speakers button */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">
          {diarizationWasRequested
            ? uniqueSpeakers.length >= 2
              ? `${uniqueSpeakers.length} speakers detected.`
              : 'Only one voice detected.'
            : 'Enable speaker labels before transcribing to see turns.'}
        </p>
        {canRename && (
          <button
            type="button"
            onClick={showMapPanel ? cancelMapPanel : openMapPanel}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showMapPanel
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60'
            }`}
          >
            <PenLine className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            {showMapPanel ? 'Cancel' : 'Map speakers'}
          </button>
        )}
      </div>

      {/* ── Map-speakers panel ───────────────────────────────────────────── */}
      {showMapPanel && canRename && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-3 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400 mb-3">
            Name each speaker
          </p>
          <div className="space-y-2">
            {uniqueSpeakers.map((raw, i) => {
              const textColor = speakerTextColors[i % speakerTextColors.length]
              return (
                <div key={raw} className="flex items-center gap-2">
                  {/* Current auto-label */}
                  <span className={`text-[11px] font-semibold uppercase w-20 shrink-0 truncate ${textColor}`}>
                    {currentNameOf(raw)}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">→</span>
                  {/* Custom name input */}
                  <input
                    type="text"
                    value={drafts[raw] ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [raw]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyMappings()
                      if (e.key === 'Escape') cancelMapPanel()
                    }}
                    placeholder={`e.g. ${i === 0 ? 'Alice' : i === 1 ? 'Bob' : `Speaker ${i + 1}`}`}
                    maxLength={32}
                    className="flex-1 min-w-0 text-sm px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
                  />
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={applyMappings}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
            >
              <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              Apply names
            </button>
            <button
              type="button"
              onClick={cancelMapPanel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Segment list ─────────────────────────────────────────────────── */}
      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {data.map((item, i) => {
          const seg = segments?.[i]
          const isActive = i === activeSegIdx
          const colorClass = speakerColors[speakerColorIdx(item.rawSpeaker)]
          const textColorClass = speakerTextColors[speakerColorIdx(item.rawSpeaker)]
          const ts = seg ? `${Math.floor(seg.start / 60)}:${String(Math.floor(seg.start % 60)).padStart(2, '0')}` : null

          return (
            <div
              key={i}
              ref={(el) => {
                if (el) speakerSegmentRefsRef.current.set(i, el)
                else speakerSegmentRefsRef.current.delete(i)
              }}
              onClick={() => {
                if (showMapPanel) return
                if (!audioRef.current || !seg) return
                audioRef.current.currentTime = seg.start
                void audioRef.current.play().catch(() => {})
              }}
              className={`flex gap-3 items-start border-l-2 pl-3 py-2 rounded-r-xl transition-all ${
                audioObjectUrl && !showMapPanel ? 'cursor-pointer' : ''
              } ${
                isActive
                  ? `${colorClass} shadow-sm`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/60 dark:hover:bg-gray-800/40'
              }`}
            >
              <div className="shrink-0 flex flex-col items-end gap-0.5 pt-0.5 w-16">
                <span
                  className={`text-[11px] font-semibold uppercase truncate max-w-full ${
                    isActive ? textColorClass : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {item.speaker}
                </span>
                {ts && (
                  <span className={`text-[10px] font-mono ${isActive ? textColorClass + ' opacity-70' : 'text-gray-300 dark:text-gray-600'}`}>
                    {ts}
                  </span>
                )}
              </div>
              <p className={`flex-1 text-sm leading-relaxed ${isActive ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
                {isActive && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5 mb-0.5 animate-pulse" aria-hidden />
                )}
                {transcriptView === 'translated' && translatedSegments?.[i]?.text ? translatedSegments[i].text : item.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
