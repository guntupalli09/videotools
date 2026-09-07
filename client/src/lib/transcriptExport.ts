/**
 * Client-side transcript export utilities.
 *
 * ZERO server round-trips — all formats are generated entirely in the browser
 * from the current editableSegments + speakerNameMap state. This preserves the
 * zero-data-retention guarantee: edited content never leaves the device.
 *
 * Single source of truth: every export format derives from these two inputs:
 *   - segments: Segment[]            (text, timestamps, raw speaker label)
 *   - speakerNameMap: SpeakerNameMap (rawLabel → user-defined name)
 */

import type { Segment } from './srtExport'
import { formatTimestamp } from './srtExport'
import { addAnchorTimecode } from './smpteTimecode'
import { drawPdfFreePlanWatermark, WATERMARK_DOC_FOOTER, WATERMARK_DOC_HEADER } from './watermark'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Maps raw backend speaker labels (e.g. "SPEAKER_00") to user-defined names (e.g. "Alice"). */
export type SpeakerNameMap = Record<string, string>
/**
 * Controls how timestamps appear in text-based exports.
 * - `per-speaker`: one timestamp at the start of each speaker turn (default — Adaiah feedback)
 * - `per-segment`: timestamp on every Whisper segment (old behaviour, mirrors subtitle timing)
 * - `per-interval`: a `[MM:SS]` marker is emitted every N seconds (set via `intervalSec` option)
 * - `smpte`: one SMPTE/BITC timecode (HH:MM:SS:FF) at the start of each speaker turn, computed
 *   from a starting timecode + frame rate (see `smpteAnchor`/`smpteFps` options) — opt-in only,
 *   never on by default. Frame-accurate, deterministic; never touched by the guideline formatter.
 * - `none`: no timestamps; speaker names still appear when diarisation is active
 */
export type TimestampMode = 'per-speaker' | 'per-segment' | 'per-interval' | 'smpte' | 'none'

/**
 * Controls filler-word handling in text-based exports.
 * - `full`: no post-processing, raw transcription preserved
 * - `clean`: removes common filler words / false-start patterns before export
 */
export type VerbatimMode = 'full' | 'clean'

/** A segment with the speaker field already resolved to a display name. */
export interface ResolvedSegment {
  start: number
  end: number
  text: string
  /** Resolved display name (custom or auto "Speaker N"), only set when diarization was enabled. */
  speaker?: string
}



// ─── Speaker resolution ───────────────────────────────────────────────────────

/**
 * Returns the ordered list of unique raw speaker labels from segments.
 * Order is first-appearance so "Speaker 1" always refers to the first voice heard.
 */
export function uniqueSpeakerLabels(segments: Segment[]): string[] {
  const seen: string[] = []
  for (const seg of segments) {
    const raw = seg.speaker?.trim()
    if (raw && !seen.includes(raw)) seen.push(raw)
  }
  return seen
}

/**
 * Resolves a raw backend label to its display name.
 * Priority: user-defined name → auto "Speaker N" fallback.
 */
export function resolveSpeakerName(
  rawLabel: string,
  nameMap: SpeakerNameMap,
  orderedLabels: string[],
): string {
  if (nameMap[rawLabel]) return nameMap[rawLabel]
  const idx = orderedLabels.indexOf(rawLabel)
  return `Speaker ${idx >= 0 ? idx + 1 : '?'}`
}

/**
 * Returns a copy of segments where each `speaker` field is replaced by the
 * resolved display name. Segments without a speaker are unchanged.
 * Attaches speaker labels whenever diarization produced at least one label.
 */
export function withResolvedSpeakers(
  segments: Segment[],
  nameMap: SpeakerNameMap,
): ResolvedSegment[] {
  const labels = uniqueSpeakerLabels(segments)
  const isDiarized = labels.length >= 1
  return segments.map((seg) => ({
    start: seg.start,
    end: seg.end,
    text: seg.text,
    speaker:
      isDiarized && seg.speaker?.trim()
        ? resolveSpeakerName(seg.speaker.trim(), nameMap, labels)
        : undefined,
  }))
}

// ─── Clean-verbatim helper ────────────────────────────────────────────────────

/**
 * Filler-word patterns ordered longest-to-shortest to prevent partial matches.
 * Multi-word phrases must come before their constituent words.
 */
const FILLER_PATTERN =
  /\b(you know what|you know|i mean|what i mean is|to be honest|to tell the truth|i guess|you see|let me think|let me say|as i said|sort of|kind of|basically|literally|honestly|actually|oh well|um+h?|uh+|er+h?|hmm+|hm+|ah+)\b[,.]?\s*/gi

/**
 * Produces clean-verbatim text from a raw transcript segment:
 *
 * 1. Strips filler words (um, uh, you know, basically …)
 * 2. Collapses false starts where the SAME phrase appears on both sides of a
 *    dash — "I was — I was going to say" → "I was going to say"
 * 3. Removes any remaining solo em/en dashes (e.g. dangling after step 2)
 * 4. Strips stuttered duplicate words: "and and we" → "and we"
 * 5. Fixes orphaned punctuation left by steps 1–4 (double commas, etc.)
 * 6. Collapses multiple spaces and trims.
 */
export function applyCleanVerbatim(text: string): string {
  let t = text

  // ① Fillers
  t = t.replace(FILLER_PATTERN, ' ')

  // ② False starts: "phrase — same-phrase" → keep only what follows the dash
  //    Lookahead ensures we only remove the prefix when the SAME words restart.
  //    Handles up to 4-word prefixes (covers most real false-start patterns).
  t = t.replace(/\b(\w+(?:\s+\w+){0,3})\s*[—–]\s*(?=\1\b)/gi, '')

  // ③ Solo em/en dashes left over after step ② (or originally present)
  t = t.replace(/\s*[—–]\s*/g, ' ')

  // ④ Stuttered consecutive words: "the the house" → "the house"
  t = t.replace(/\b(\w+)(\s+\1)+\b/gi, '$1')

  // ⑤ Punctuation cleanup after removal
  t = t.replace(/,\s*,/g, ',')            // double comma
  t = t.replace(/,\s*([.!?])/g, '$1')    // ", ." → "."
  t = t.replace(/([.!?])\s*,/g, '$1')    // ". ," → "."

  // ⑥ Normalise whitespace
  t = t.replace(/[ \t]{2,}/g, ' ')

  return t.trim()
}

// ─── Speaker-entry grouping ───────────────────────────────────────────────────

/**
 * Collapses consecutive segments that share the same speaker into "turns".
 *
 * paragraphGapSec (default 3.0 s): when there is a silence gap longer than
 * this threshold between two consecutive segments of the SAME speaker, a
 * paragraph break (\n\n) is inserted inside the turn rather than starting a
 * new turn.  This preserves the single-header-per-speaker-entry structure that
 * professional transcripts require while still reflecting natural pauses.
 *
 * The returned `text` field may therefore contain \n\n — callers that render
 * to a document (DOCX, PDF) should split on \n\n to create distinct paragraphs.
 */
export function groupSegmentsBySpeakerEntry(
  resolved: ResolvedSegment[],
  options: { paragraphGapSec?: number; splitOnLongPause?: boolean } = {},
): Array<{ speaker?: string; start: number; text: string }> {
  const { paragraphGapSec = 3.0, splitOnLongPause = false } = options
  type Group = { speaker?: string; start: number; end: number; text: string }
  const groups: Group[] = []

  for (const seg of resolved) {
    const last = groups[groups.length - 1]
    const isSameSpeaker = last !== undefined && last.speaker === seg.speaker
    const gapSec = last ? Math.max(0, seg.start - last.end) : Infinity
    const isLongPause = gapSec >= paragraphGapSec

    if (isSameSpeaker && !isLongPause) {
      // Same turn, seamless continuation
      last.text = last.text.trimEnd() + ' ' + seg.text.trim()
      last.end = seg.end
    } else if (isSameSpeaker && isLongPause && !splitOnLongPause) {
      // Same speaker but notable pause → new paragraph within same turn
      last.text = last.text.trimEnd() + '\n\n' + seg.text.trim()
      last.end = seg.end
    } else {
      // New speaker, first segment, or (when splitOnLongPause) a long pause —
      // starts a fresh group with its own header. smpte mode needs this: a BITC
      // reference point is only useful if it doesn't go stale across a long
      // same-speaker pause.
      groups.push({ speaker: seg.speaker, start: seg.start, end: seg.end, text: seg.text.trim() })
    }
  }

  // Strip the internal 'end' field — it was only needed for gap detection
  return groups.map(({ speaker, start, text }) => ({ speaker, start, text }))
}

// ─── Full transcript text ─────────────────────────────────────────────────────

/**
 * Joins segment texts into a single string.
 * Uses double-newline between segments so paragraphs are preserved.
 */
export function buildFullTranscript(segments: Segment[]): string {
  return segments.map((s) => s.text.trim()).filter(Boolean).join('\n\n')
}

// ─── TXT ──────────────────────────────────────────────────────────────────────

/**
 * Builds a human-readable plain-text transcript.
 *
 * timestampMode controls how timestamps appear:
 *   per-speaker (default) — one timestamp at the start of each speaker turn
 *   per-segment           — timestamp on every raw Whisper segment
 *   none                  — no timestamps
 *
 * verbatimMode controls filler-word handling:
 *   full  (default) — raw transcription, nothing removed
 *   clean           — common filler words stripped before output
 *
 * Example output (per-speaker, diarised):
 *   Alice (0:00)
 *   Hello, how are you? Doing great actually.
 *
 *   Bob (0:45)
 *   Doing well, thanks.
 */
export function buildTxt(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  options: {
    timestampMode?: TimestampMode
    verbatimMode?: VerbatimMode
    intervalSec?: number
    /** Starting BITC/SMPTE timecode (HH:MM:SS:FF or HH:MM:SS;FF), only used when timestampMode is 'smpte'. */
    smpteAnchor?: string
    /** Video frame rate (e.g. 25, 29.97, 30), only used when timestampMode is 'smpte'. */
    smpteFps?: number
  } = {},
): string {
  const {
    timestampMode = 'per-speaker',
    verbatimMode = 'full',
    intervalSec = 30,
    smpteAnchor = '00:00:00:00',
    smpteFps = 25,
  } = options
  const resolved = withResolvedSpeakers(segments, nameMap)
  const applyVerb = (t: string) => (verbatimMode === 'clean' ? applyCleanVerbatim(t) : t)
  const lines: string[] = []

  if (timestampMode === 'per-segment') {
    for (const seg of resolved) {
      if (seg.speaker) {
        lines.push(`${seg.speaker} (${formatTimestamp(seg.start)})`)
        lines.push(applyVerb(seg.text))
        lines.push('')
      } else {
        const t = applyVerb(seg.text)
        if (t) lines.push(t)
      }
    }
  } else if (timestampMode === 'per-interval') {
    // Group segments by interval block; within each block group by speaker
    let currentIntervalStart = -1
    let pendingSpeaker: string | undefined = undefined
    let pendingText = ''

    const flushPending = () => {
      if (!pendingText.trim()) return
      if (pendingSpeaker) {
        lines.push(`${pendingSpeaker}: ${pendingText.trim()}`)
      } else {
        lines.push(pendingText.trim())
      }
      pendingText = ''
    }

    for (const seg of resolved) {
      const intervalStart = Math.floor(seg.start / intervalSec) * intervalSec

      if (intervalStart !== currentIntervalStart) {
        flushPending()
        if (lines.length > 0) lines.push('')
        lines.push(`[${formatTimestamp(intervalStart)}]`)
        currentIntervalStart = intervalStart
        pendingSpeaker = seg.speaker
        pendingText = applyVerb(seg.text)
      } else if (seg.speaker === pendingSpeaker) {
        const t = applyVerb(seg.text)
        pendingText = pendingText.trimEnd() + ' ' + t.trim()
      } else {
        flushPending()
        pendingSpeaker = seg.speaker
        pendingText = applyVerb(seg.text)
      }
    }
    flushPending()
  } else {
    // per-speaker, smpte, and none: group consecutive same-speaker segments into turns.
    // smpte mode splits on a long same-speaker pause too, so a BITC reference
    // point never goes stale for minutes at a stretch.
    const groups = groupSegmentsBySpeakerEntry(resolved, { splitOnLongPause: timestampMode === 'smpte' })
    for (const g of groups) {
      const text = applyVerb(g.text)
      if (!text) continue
      if (g.speaker) {
        const header =
          timestampMode === 'none'
            ? g.speaker
            : timestampMode === 'smpte'
              ? `${g.speaker} (${addAnchorTimecode(smpteAnchor, smpteFps, g.start)})`
              : `${g.speaker} (${formatTimestamp(g.start)})`
        lines.push(header)
        lines.push(text)
        lines.push('')
      } else {
        lines.push(text)
      }
    }
  }

  return lines.join('\n').trimEnd()
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * Builds a CSV with columns: start, end, speaker, text
 * The speaker column is omitted when the transcript is not diarized.
 */
export function buildCsv(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  options: {
    timestampMode?: TimestampMode
    verbatimMode?: VerbatimMode
    smpteAnchor?: string
    smpteFps?: number
  } = {},
): string {
  const {
    timestampMode = 'per-speaker',
    verbatimMode = 'full',
    smpteAnchor = '00:00:00:00',
    smpteFps = 25,
  } = options
  const resolved = withResolvedSpeakers(segments, nameMap)
  const hasSpeakers = resolved.some((s) => s.speaker)
  const includeTimestamps = timestampMode !== 'none'
  const applyVerb = (t: string) => (verbatimMode === 'clean' ? applyCleanVerbatim(t) : t)
  const formatTc = (t: number) =>
    timestampMode === 'smpte' ? csvCell(addAnchorTimecode(smpteAnchor, smpteFps, t)) : t.toFixed(3)

  const header = includeTimestamps
    ? (hasSpeakers ? 'start,end,speaker,text' : 'start,end,text')
    : (hasSpeakers ? 'speaker,text' : 'text')
  const rows = resolved.map((seg) => {
    const cols = [
      ...(includeTimestamps ? [formatTc(seg.start), formatTc(seg.end)] : []),
      ...(hasSpeakers ? [csvCell(seg.speaker ?? '')] : []),
      csvCell(applyVerb(seg.text)),
    ]
    return cols.join(',')
  })
  return [header, ...rows].join('\n')
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export interface TranscriptJsonExport {
  fullTranscript: string
  segments: Array<{
    start?: number
    end?: number
    /** SMPTE/BITC timecode, only present when timestampMode is 'smpte'. */
    startTimecode?: string
    endTimecode?: string
    text: string
    speaker?: string
  }>
  speakers?: Array<{ speaker: string; text: string }>
  summary?: unknown
  chapters?: unknown
  highlights?: unknown
  keywords?: unknown
}

/**
 * Builds a structured JSON export.
 * Always includes fullTranscript + segments.
 * Adds a `speakers` array when diarization data is present.
 */
export function buildJson(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  extras: {
    summary?: unknown
    chapters?: unknown
    highlights?: unknown
    keywords?: unknown
  } = {},
  options: {
    timestampMode?: TimestampMode
    verbatimMode?: VerbatimMode
    smpteAnchor?: string
    smpteFps?: number
  } = {},
): string {
  const {
    timestampMode = 'per-speaker',
    verbatimMode = 'full',
    smpteAnchor = '00:00:00:00',
    smpteFps = 25,
  } = options
  const resolved = withResolvedSpeakers(segments, nameMap)
  const hasSpeakers = resolved.some((s) => s.speaker)

  const applyVerb = (t: string) => (verbatimMode === 'clean' ? applyCleanVerbatim(t) : t)
  const fullTranscript = resolved.map((s) => applyVerb(s.text)).join('\n\n').trimEnd()

  const payload: TranscriptJsonExport = {
    fullTranscript,
    segments: resolved.map((s) => ({
      ...(timestampMode !== 'none' ? { start: s.start, end: s.end } : {}),
      ...(timestampMode === 'smpte'
        ? {
            startTimecode: addAnchorTimecode(smpteAnchor, smpteFps, s.start),
            endTimecode: addAnchorTimecode(smpteAnchor, smpteFps, s.end),
          }
        : {}),
      text: applyVerb(s.text),
      ...(hasSpeakers && s.speaker ? { speaker: s.speaker } : {}),
    })),
    ...(hasSpeakers
      ? {
          speakers: resolved
            .filter((s) => s.speaker)
            .map((s) => ({ speaker: s.speaker!, text: applyVerb(s.text) })),
        }
      : {}),
    ...extras,
  }
  return JSON.stringify(payload, null, 2)
}

// ─── Notion ───────────────────────────────────────────────────────────────────

/**
 * Builds a Notion-compatible block array (paragraph blocks).
 * Speaker turns are prefixed: "[Alice] Hello there."
 */
export function buildNotion(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  options: {
    timestampMode?: TimestampMode
    verbatimMode?: VerbatimMode
    smpteAnchor?: string
    smpteFps?: number
  } = {},
): string {
  const {
    timestampMode = 'per-speaker',
    verbatimMode = 'full',
    smpteAnchor = '00:00:00:00',
    smpteFps = 25,
  } = options
  const resolved = withResolvedSpeakers(segments, nameMap)
  const applyVerb = (t: string) => (verbatimMode === 'clean' ? applyCleanVerbatim(t) : t)
  const blocks = resolved.map((seg) => ({
    type: 'paragraph',
    rich_text: [
      {
        type: 'text',
        text: {
          content:
            timestampMode === 'none'
              ? applyVerb(seg.text)
              : seg.speaker
                ? timestampMode === 'smpte'
                  ? `[${seg.speaker}] (${addAnchorTimecode(smpteAnchor, smpteFps, seg.start)}) ${applyVerb(seg.text)}`
                  : `[${seg.speaker}] ${applyVerb(seg.text)}`
                : applyVerb(seg.text),
        },
      },
    ],
  }))
  return JSON.stringify(blocks, null, 2)
}

// ─── PDF (client-side, jsPDF) ─────────────────────────────────────────────────

/**
 * Generates and triggers download of a PDF transcript.
 * Lazy-loads jsPDF to avoid adding it to the initial bundle.
 *
 * Respects timestampMode and verbatimMode:
 *   per-speaker (default) — one bold header per speaker turn, body text grouped
 *   per-segment           — header + body for every raw Whisper segment
 *   none                  — no timestamps, grouped body text only
 */
export async function exportToPdf(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  filename: string,
  watermark?: string,
  options: {
    timestampMode?: TimestampMode
    verbatimMode?: VerbatimMode
    intervalSec?: number
    smpteAnchor?: string
    smpteFps?: number
  } = {},
): Promise<void> {
  const {
    timestampMode = 'per-speaker',
    verbatimMode = 'full',
    intervalSec = 30,
    smpteAnchor = '00:00:00:00',
    smpteFps = 25,
  } = options
  const { jsPDF } = await import('jspdf')
  const resolved = withResolvedSpeakers(segments, nameMap)
  const hasSpeakers = resolved.some((s) => s.speaker)
  const applyVerb = (t: string) => (verbatimMode === 'clean' ? applyCleanVerbatim(t) : t.trim())

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 20
  const textWidth = pageW - margin * 2
  const lineH = 6
  let y = margin

  const addPage = () => {
    doc.addPage()
    y = margin
  }
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) addPage()
  }

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Video Transcript', margin, y)
  y += lineH * 1.8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text('Generated by VideoText.io', margin, y)
  y += lineH * 2
  doc.setTextColor(0)

  doc.setFontSize(11)

  if (timestampMode === 'per-segment') {
    // Legacy: one header + body per raw Whisper segment
    for (const seg of resolved) {
      const t = applyVerb(seg.text)
      const bodyLines = doc.splitTextToSize(t || ' ', textWidth)
      const blockH = hasSpeakers && seg.speaker
        ? lineH + lineH * bodyLines.length + lineH * 0.6
        : lineH * bodyLines.length + lineH * 0.4
      ensureSpace(blockH)

      if (hasSpeakers && seg.speaker) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 40, 160)
        doc.text(`${seg.speaker}  (${formatTimestamp(seg.start)})`, margin, y)
        doc.setTextColor(0)
        y += lineH
      }

      doc.setFont('helvetica', 'normal')
      doc.text(bodyLines, margin, y)
      y += lineH * bodyLines.length + lineH * 0.6
    }
  } else if (timestampMode === 'per-interval') {
    // Interval markers: group segments by N-second blocks, speaker-grouped within each block
    let currentIntervalStart = -1
    let pendingSpeaker: string | undefined = undefined
    let pendingText = ''

    const flushPendingPdf = () => {
      if (!pendingText.trim()) return
      const prefix = pendingSpeaker ? `${pendingSpeaker}: ` : ''
      const bodyLines = doc.splitTextToSize(prefix + pendingText.trim(), textWidth)
      ensureSpace(lineH * bodyLines.length + lineH * 0.4)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0)
      doc.text(bodyLines, margin, y)
      y += lineH * bodyLines.length + lineH * 0.4
      pendingText = ''
    }

    for (const seg of resolved) {
      const intervalStart = Math.floor(seg.start / intervalSec) * intervalSec

      if (intervalStart !== currentIntervalStart) {
        flushPendingPdf()
        ensureSpace(lineH * 1.5)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 40, 160)
        doc.text(`[${formatTimestamp(intervalStart)}]`, margin, y)
        doc.setTextColor(0)
        y += lineH * 1.2
        currentIntervalStart = intervalStart
        pendingSpeaker = seg.speaker
        pendingText = applyVerb(seg.text)
      } else if (seg.speaker === pendingSpeaker) {
        pendingText = pendingText.trimEnd() + ' ' + applyVerb(seg.text).trim()
      } else {
        flushPendingPdf()
        pendingSpeaker = seg.speaker
        pendingText = applyVerb(seg.text)
      }
    }
    flushPendingPdf()
  } else {
    // per-speaker / none: grouped speaker turns with intra-turn paragraph breaks
    const groups = groupSegmentsBySpeakerEntry(resolved, { splitOnLongPause: timestampMode === 'smpte' })
    for (const g of groups) {
      const paras = g.text.split('\n\n').filter(Boolean)
      const bodyText = paras.map((p) => applyVerb(p)).filter(Boolean).join('\n')
      const bodyLines = doc.splitTextToSize(bodyText || ' ', textWidth)
      const blockH =
        hasSpeakers && g.speaker
          ? lineH + lineH * bodyLines.length + lineH * 0.6
          : lineH * bodyLines.length + lineH * 0.4
      ensureSpace(blockH)

      if (hasSpeakers && g.speaker) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 40, 160)
        const headerText =
          timestampMode === 'none'
            ? g.speaker
            : timestampMode === 'smpte'
              ? `${g.speaker}  (${addAnchorTimecode(smpteAnchor, smpteFps, g.start)})`
              : `${g.speaker}  (${formatTimestamp(g.start)})`
        doc.text(headerText, margin, y)
        doc.setTextColor(0)
        y += lineH
      }

      doc.setFont('helvetica', 'normal')
      doc.text(bodyLines, margin, y)
      y += lineH * bodyLines.length + lineH * 0.6
    }
  }

  // Watermark on every page (diagonal + footer)
  if (watermark) {
    drawPdfFreePlanWatermark(doc)
  }

  doc.save(filename)
}

// ─── DOCX (client-side, docx library) ────────────────────────────────────────

/**
 * Generates and triggers download of a DOCX transcript.
 * Lazy-loads the `docx` library to avoid adding it to the initial bundle.
 *
 * Respects timestampMode and verbatimMode:
 *   per-speaker (default) — one bold header per speaker turn, body grouped
 *   per-segment           — header + body for every raw Whisper segment
 *   none                  — speaker names only (no timecodes), grouped body
 */
export async function exportToDocx(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  filename: string,
  watermark?: string,
  options: {
    timestampMode?: TimestampMode
    verbatimMode?: VerbatimMode
    intervalSec?: number
    smpteAnchor?: string
    smpteFps?: number
  } = {},
): Promise<void> {
  const {
    timestampMode = 'per-speaker',
    verbatimMode = 'full',
    intervalSec = 30,
    smpteAnchor = '00:00:00:00',
    smpteFps = 25,
  } = options
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import('docx')
  const resolved = withResolvedSpeakers(segments, nameMap)
  const hasSpeakers = resolved.some((s) => s.speaker)
  const applyVerb = (t: string) => (verbatimMode === 'clean' ? applyCleanVerbatim(t) : t.trim())

  const children: any[] = []

  // Title
  children.push(
    new Paragraph({ text: 'Video Transcript', heading: HeadingLevel.HEADING_1 }),
  )

  if (watermark) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: WATERMARK_DOC_HEADER, bold: true, color: '666666', size: 20 }),
        ],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: WATERMARK_DOC_FOOTER, italics: true, color: '888888', size: 18 })],
        spacing: { after: 240 },
      }),
    )
  }

  if (timestampMode === 'per-segment') {
    // Legacy: one header + body per raw Whisper segment
    for (const seg of resolved) {
      if (hasSpeakers && seg.speaker) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${seg.speaker}  (${formatTimestamp(seg.start)})`,
                bold: true,
                color: '5028A0',
              }),
            ],
            spacing: { before: 160, after: 40 },
          }),
        )
      }
      const t = applyVerb(seg.text)
      if (t) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: t })],
            spacing: { after: hasSpeakers && seg.speaker ? 120 : 80 },
          }),
        )
      }
    }
  } else if (timestampMode === 'per-interval') {
    // Interval markers every N seconds; speaker-grouped within each block
    let currentIntervalStart = -1
    let pendingSpeaker: string | undefined = undefined
    let pendingText = ''

    const flushPendingDocx = () => {
      if (!pendingText.trim()) return
      const prefix = pendingSpeaker ? `${pendingSpeaker}: ` : ''
      children.push(
        new Paragraph({
          children: [new TextRun({ text: prefix + pendingText.trim() })],
          spacing: { after: 80 },
        }),
      )
      pendingText = ''
    }

    for (const seg of resolved) {
      const intervalStart = Math.floor(seg.start / intervalSec) * intervalSec

      if (intervalStart !== currentIntervalStart) {
        flushPendingDocx()
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `[${formatTimestamp(intervalStart)}]`, bold: true, color: '5028A0' })],
            spacing: { before: 160, after: 40 },
          }),
        )
        currentIntervalStart = intervalStart
        pendingSpeaker = seg.speaker
        pendingText = applyVerb(seg.text)
      } else if (seg.speaker === pendingSpeaker) {
        pendingText = pendingText.trimEnd() + ' ' + applyVerb(seg.text).trim()
      } else {
        flushPendingDocx()
        pendingSpeaker = seg.speaker
        pendingText = applyVerb(seg.text)
      }
    }
    flushPendingDocx()
  } else {
    // per-speaker / smpte / none: grouped turns with intra-turn paragraph breaks
    const groups = groupSegmentsBySpeakerEntry(resolved, { splitOnLongPause: timestampMode === 'smpte' })
    for (const g of groups) {
      if (hasSpeakers && g.speaker) {
        const headerText =
          timestampMode === 'none'
            ? g.speaker
            : timestampMode === 'smpte'
              ? `${g.speaker}  (${addAnchorTimecode(smpteAnchor, smpteFps, g.start)})`
              : `${g.speaker}  (${formatTimestamp(g.start)})`
        children.push(
          new Paragraph({
            children: [new TextRun({ text: headerText, bold: true, color: '5028A0' })],
            spacing: { before: 160, after: 40 },
          }),
        )
      }
      // Split on paragraph breaks inserted by timing gaps
      const paras = g.text.split('\n\n').filter(Boolean)
      for (const para of paras) {
        const t = applyVerb(para)
        if (t) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t })],
              spacing: { after: hasSpeakers && g.speaker ? 120 : 80 },
            }),
          )
        }
      }
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const blob = await Packer.toBlob(doc)

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── DOCX — 3-column table (Speaker | Timecode | Dialogue) ──────────────────────

/**
 * Generates a DOCX with a 3-column table layout:
 *   Column 1: Speaker name
 *   Column 2: Timecode (start of speaker turn)
 *   Column 3: Dialogue text
 *
 * Consecutive segments from the same speaker are merged into one row so the
 * table reflects speaker turns rather than raw Whisper chunks.
 */
export async function exportToDocxThreeColumn(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  filename: string,
  options: {
    verbatimMode?: VerbatimMode
    timestampMode?: TimestampMode
    smpteAnchor?: string
    smpteFps?: number
  } = {},
  watermark?: string,
): Promise<void> {
  const {
    verbatimMode = 'full',
    timestampMode = 'per-speaker',
    smpteAnchor = '00:00:00:00',
    smpteFps = 25,
  } = options
  const {
    Document,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    HeadingLevel,
    Packer,
    WidthType,
    AlignmentType,
  } = await import('docx')

  const resolved = withResolvedSpeakers(segments, nameMap)
  const groups = groupSegmentsBySpeakerEntry(resolved, { splitOnLongPause: timestampMode === 'smpte' })
  const applyVerb = (t: string) => (verbatimMode === 'clean' ? applyCleanVerbatim(t) : t.trim())
  const formatTc = (start: number) =>
    timestampMode === 'smpte' ? addAnchorTimecode(smpteAnchor, smpteFps, start) : formatTimestamp(start)

  const cellPad = { top: 80, bottom: 80, left: 120, right: 120 }

  const makeHeaderCell = (text: string) =>
    new TableCell({
      margins: cellPad,
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: true, color: '5028A0' })],
        }),
      ],
    })

  const makeDataCell = (text: string, bold = false, color?: string) =>
    new TableCell({
      margins: cellPad,
      // Split on intra-turn paragraph breaks so long speaker turns render as
      // multiple Word paragraphs inside the cell rather than a single wall of text
      children: text
        .split('\n\n')
        .filter(Boolean)
        .map(
          (para) =>
            new Paragraph({
              children: [new TextRun({ text: para.trim(), bold, ...(color ? { color } : {}) })],
              spacing: { after: 60 },
            }),
        ),
    })

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeHeaderCell('Speaker'),
      makeHeaderCell('Timecode'),
      makeHeaderCell('Dialogue'),
    ],
  })

  const dataRows = groups.map(
    (g) =>
      new TableRow({
        children: [
          makeDataCell(g.speaker ?? '', !!g.speaker, g.speaker ? '5028A0' : undefined),
          makeDataCell(formatTc(g.start)),
          makeDataCell(applyVerb(g.text)),
        ],
      }),
  )

  const table = new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docChildren: any[] = [
    new Paragraph({
      text: 'Video Transcript',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
  ]

  if (watermark) {
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: WATERMARK_DOC_HEADER, bold: true, color: '666666', size: 20 })],
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: WATERMARK_DOC_FOOTER, italics: true, color: '888888', size: 18 })],
        spacing: { after: 240 },
        alignment: AlignmentType.LEFT,
      }),
    )
  }

  docChildren.push(table)

  const doc = new Document({ sections: [{ children: docChildren }] })
  const blob = await Packer.toBlob(doc)

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── PDF — 3-column table (Speaker | Timecode | Dialogue) ───────────────────────

/**
 * Generates a PDF with a 3-column layout:
 *   Column 1 (20%): Speaker name
 *   Column 2 (15%): Timecode
 *   Column 3 (65%): Dialogue text
 *
 * Mirrors the structure of exportToDocxThreeColumn for format parity.
 */
export async function exportToPdfThreeColumn(
  segments: Segment[],
  nameMap: SpeakerNameMap,
  filename: string,
  options: {
    verbatimMode?: VerbatimMode
    timestampMode?: TimestampMode
    smpteAnchor?: string
    smpteFps?: number
  } = {},
  watermark?: string,
): Promise<void> {
  const {
    verbatimMode = 'full',
    timestampMode = 'per-speaker',
    smpteAnchor = '00:00:00:00',
    smpteFps = 25,
  } = options
  const { jsPDF } = await import('jspdf')
  const resolved = withResolvedSpeakers(segments, nameMap)
  const groups = groupSegmentsBySpeakerEntry(resolved, { splitOnLongPause: timestampMode === 'smpte' })
  const applyVerb = (t: string) => (verbatimMode === 'clean' ? applyCleanVerbatim(t) : t.trim())
  const formatTc = (start: number) =>
    timestampMode === 'smpte' ? addAnchorTimecode(smpteAnchor, smpteFps, start) : formatTimestamp(start)

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15
  const lineH = 6
  let y = margin

  // Column x-positions and widths
  const col1X = margin
  const col1W = 30
  const col2X = margin + col1W + 3
  const col2W = 22
  const col3X = margin + col1W + col2W + 6
  const col3W = pageW - margin - col3X

  const addPage = () => { doc.addPage(); y = margin }
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin - 10) addPage()
  }

  // Title
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Video Transcript', margin, y)
  y += lineH * 1.4

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text('Generated by VideoText.io', margin, y)
  y += lineH * 1.6
  doc.setTextColor(0)

  if (watermark) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100)
    doc.text(WATERMARK_DOC_HEADER, margin, y)
    y += lineH * 0.9
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(140)
    doc.text(WATERMARK_DOC_FOOTER, margin, y)
    doc.setTextColor(0)
    y += lineH * 1.4
  }

  // Column headers
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 40, 160)
  doc.text('SPEAKER', col1X, y)
  doc.text('TIMECODE', col2X, y)
  doc.text('DIALOGUE', col3X, y)
  doc.setTextColor(0)
  y += lineH * 0.5

  doc.setDrawColor(180)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)
  y += lineH * 0.8

  doc.setFontSize(10)

  for (const g of groups) {
    const paras = g.text.split('\n\n').filter(Boolean)
    const bodyText = paras.map((p) => applyVerb(p)).filter(Boolean).join(' ')
    const dialogueLines = doc.splitTextToSize(bodyText || ' ', col3W)
    const speakerLines = doc.splitTextToSize(g.speaker ?? '', col1W)
    const rowLineCount = Math.max(speakerLines.length, 1, dialogueLines.length)
    const rowH = lineH * rowLineCount + lineH * 0.5

    ensureSpace(rowH)

    // Speaker
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 40, 160)
    if (g.speaker) doc.text(speakerLines, col1X, y)
    doc.setTextColor(0)

    // Timecode
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(formatTc(g.start), col2X, y)
    doc.setTextColor(0)

    // Dialogue
    doc.setFont('helvetica', 'normal')
    doc.text(dialogueLines, col3X, y)

    y += rowH

    // Light separator
    doc.setDrawColor(230)
    doc.setLineWidth(0.1)
    doc.line(margin, y - lineH * 0.2, pageW - margin, y - lineH * 0.2)
  }

  // Watermark on every page (diagonal + footer)
  if (watermark) {
    drawPdfFreePlanWatermark(doc)
  }

  doc.save(filename)
}

// ─── localStorage persistence (zero server retention) ────────────────────────

const LS_VERSION = 1

interface PersistedEdits {
  version: number
  /**
   * Fingerprint of the ORIGINAL segments at save time.
   * Used to reject stale edits when the transcript has changed (e.g. re-processed).
   * Built from segment count + total char count + first/last segment text snippet.
   */
  transcriptHash: string
  segments: Segment[]
  speakerNameMap: SpeakerNameMap
  savedAt: number
}

/**
 * Lightweight fingerprint of the original transcript segments.
 * Not cryptographic — only needs to catch the common cases:
 *   • re-processing the same file (different text → different hash)
 *   • diarization toggled (different speaker field count)
 */
export function computeTranscriptHash(segments: Segment[]): string {
  const n = segments.length
  if (n === 0) return '0'
  const totalChars = segments.reduce((acc, s) => acc + s.text.length, 0)
  const first = segments[0].text.slice(0, 24).replace(/\s+/g, ' ')
  const last = segments[n - 1].text.slice(0, 24).replace(/\s+/g, ' ')
  return `${n}:${totalChars}:${first}|${last}`
}

export function lsKey(jobId: string): string {
  return `vt_edits_v${LS_VERSION}_${jobId}`
}

export function saveEditsToStorage(
  jobId: string,
  segments: Segment[],
  speakerNameMap: SpeakerNameMap,
  transcriptHash: string,
): void {
  try {
    const payload: PersistedEdits = { version: LS_VERSION, transcriptHash, segments, speakerNameMap, savedAt: Date.now() }
    localStorage.setItem(lsKey(jobId), JSON.stringify(payload))
  } catch {
    // Storage full or unavailable — silently ignore (edits still work in-session)
  }
}

/**
 * Loads persisted edits for a job.
 * Returns null when:
 *   • nothing saved
 *   • version mismatch (old schema)
 *   • transcriptHash mismatch (transcript was re-processed — stale edits must be discarded)
 */
export function loadEditsFromStorage(jobId: string, expectedHash: string): PersistedEdits | null {
  try {
    const raw = localStorage.getItem(lsKey(jobId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedEdits
    if (parsed.version !== LS_VERSION) return null
    if (parsed.transcriptHash !== expectedHash) return null
    return parsed
  } catch {
    return null
  }
}

export function clearEditsFromStorage(jobId: string): void {
  try {
    localStorage.removeItem(lsKey(jobId))
  } catch { /* ignore */ }
}
