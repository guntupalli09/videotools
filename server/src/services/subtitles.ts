import { SubtitleEntry, parseSRT, parseVTT, toSRT, toVTT, detectSubtitleFormat } from '../utils/srtParser'

export interface SubtitleIssue {
  type: 'overlap' | 'long_line' | 'fast_reading' | 'large_gap'
  index: number
  message: string
}

/** Phase 1B — UTILITY 2E: Validation warning (informational only, no blocking). */
export interface SubtitleWarning {
  type: string
  message: string
  line?: number
}

/** Phase 1B — UTILITY 2D: Lightweight timing normalization. Offset (+/- ms), clamp long durations. No text change. */
const DEFAULT_MAX_DURATION_SEC = 10
const MIN_DURATION_SEC = 0.5

export function normalizeTimingOnly(
  entries: SubtitleEntry[],
  offsetMs: number = 0,
  maxDurationSec: number = DEFAULT_MAX_DURATION_SEC
): SubtitleEntry[] {
  const offsetSec = offsetMs / 1000
  const result: SubtitleEntry[] = entries.map((e, i) => ({
    index: i + 1,
    startTime: Math.max(0, e.startTime + offsetSec),
    endTime: Math.max(0, e.endTime + offsetSec),
    text: e.text,
  }))

  for (let i = 0; i < result.length; i++) {
    let duration = result[i].endTime - result[i].startTime
    if (duration > maxDurationSec) {
      result[i].endTime = result[i].startTime + maxDurationSec
      duration = maxDurationSec
    }
    if (duration < MIN_DURATION_SEC) {
      result[i].endTime = result[i].startTime + MIN_DURATION_SEC
    }
  }

  for (let i = 0; i < result.length - 1; i++) {
    if (result[i].endTime > result[i + 1].startTime) {
      result[i].endTime = result[i + 1].startTime - 0.1
      if (result[i].endTime <= result[i].startTime) {
        result[i].endTime = result[i].startTime + MIN_DURATION_SEC
      }
    }
  }

  return result
}

/** Phase 1B — UTILITY 2E: Validation only. Returns warnings; does not modify. */
const LINE_LENGTH_THRESHOLD = 42
const READING_SPEED_CHARS_PER_SEC = 25

export function validateSubtitleEntries(entries: SubtitleEntry[]): { warnings: SubtitleWarning[] } {
  const warnings: SubtitleWarning[] = []
  const sorted = [...entries].sort((a, b) => a.startTime - b.startTime)

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    const lineNum = e.index

    if (e.text.length > LINE_LENGTH_THRESHOLD) {
      warnings.push({
        type: 'long_line',
        message: `Line longer than ${LINE_LENGTH_THRESHOLD} characters (${e.text.length})`,
        line: lineNum,
      })
    }

    const duration = e.endTime - e.startTime
    if (duration > 0 && e.text.length / duration > READING_SPEED_CHARS_PER_SEC) {
      warnings.push({
        type: 'reading_speed',
        message: `Reading speed may be too high (${(e.text.length / duration).toFixed(0)} chars/s)`,
        line: lineNum,
      })
    }

    if (i < sorted.length - 1 && e.endTime > sorted[i + 1].startTime) {
      warnings.push({
        type: 'overlap',
        message: 'Overlapping with next subtitle',
        line: lineNum,
      })
    }
  }

  return { warnings }
}

export function validateSubtitleFile(filePath: string): { warnings: SubtitleWarning[] } {
  const format = detectSubtitleFormat(filePath)
  const entries = format === 'srt' ? parseSRT(filePath) : parseVTT(filePath)
  return validateSubtitleEntries(entries)
}

/**
 * Detect and fix subtitle issues
 */
export function fixSubtitleIssues(
  entries: SubtitleEntry[]
): { fixed: SubtitleEntry[]; issues: SubtitleIssue[] } {
  const issues: SubtitleIssue[] = []
  const fixed: SubtitleEntry[] = [...entries]
  
  // Sort by start time
  fixed.sort((a, b) => a.startTime - b.startTime)
  
  // 1. Fix overlapping timestamps
  for (let i = 0; i < fixed.length - 1; i++) {
    if (fixed[i].endTime > fixed[i + 1].startTime) {
      issues.push({
        type: 'overlap',
        index: fixed[i].index,
        message: `Overlapping with next subtitle`,
      })
      // Fix: Set endTime to startTime of next - 0.1 seconds
      fixed[i].endTime = fixed[i + 1].startTime - 0.1
      if (fixed[i].endTime <= fixed[i].startTime) {
        fixed[i].endTime = fixed[i].startTime + 0.5 // Minimum 0.5s display
      }
    }
  }
  
  // 2. Fix lines longer than 42 characters (YouTube limit)
  for (let i = 0; i < fixed.length; i++) {
    const entry = fixed[i]
    if (entry.text.length > 42) {
      issues.push({
        type: 'long_line',
        index: entry.index,
        message: `Line too long (${entry.text.length} characters)`,
      })
      
      // Split at nearest space before character 21
      const splitPoint = entry.text.lastIndexOf(' ', 21)
      if (splitPoint > 0) {
        const line1 = entry.text.substring(0, splitPoint)
        const line2 = entry.text.substring(splitPoint + 1)
        entry.text = `${line1}\n${line2}`
      } else {
        // No space found, force split at 21
        entry.text = `${entry.text.substring(0, 21)}\n${entry.text.substring(21)}`
      }
    }
  }
  
  // 3. Fix reading speed too fast
  for (let i = 0; i < fixed.length; i++) {
    const entry = fixed[i]
    const duration = entry.endTime - entry.startTime
    if (duration < 1.5 && entry.text.length > 20) {
      issues.push({
        type: 'fast_reading',
        index: entry.index,
        message: `Reading speed too fast (${duration.toFixed(1)}s for ${entry.text.length} chars)`,
      })
      
      // Extend endTime to ensure minimum 1.5s display
      const minEndTime = entry.startTime + 1.5
      if (entry.endTime < minEndTime) {
        // Check if next subtitle allows extension
        if (i < fixed.length - 1) {
          const maxEndTime = fixed[i + 1].startTime - 0.1
          entry.endTime = Math.min(minEndTime, maxEndTime)
        } else {
          entry.endTime = minEndTime
        }
      }
    }
  }
  
  // 4. Detect large gaps (don't auto-fix, just report)
  for (let i = 0; i < fixed.length - 1; i++) {
    const gap = fixed[i + 1].startTime - fixed[i].endTime
    if (gap > 5) {
      issues.push({
        type: 'large_gap',
        index: fixed[i].index,
        message: `Large gap of ${gap.toFixed(1)}s before next subtitle`,
      })
    }
  }
  
  // Re-index entries
  fixed.forEach((entry, index) => {
    entry.index = index + 1
  })
  
  return { fixed, issues }
}

export interface FixSubtitleOptions {
  fixTiming?: boolean
  timingOffsetMs?: number
  grammarFix?: boolean
  lineBreakFix?: boolean
  removeFillers?: boolean
}

/** Filler words/phrases to remove when removeFillers is true. Case-insensitive, whole-word. */
const FILLER_PATTERN = /\b(um|uh|hmm|hm|er|ah|like|you know|basically|actually|literally|so\s+|well\s+|just\s+|really\s+|right\s+|i mean|kind of|sort of)\b/gi

function removeFillerWordsFromEntries(entries: SubtitleEntry[]): SubtitleEntry[] {
  const result: SubtitleEntry[] = []
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    let text = e.text.replace(FILLER_PATTERN, ' ').replace(/\s+/g, ' ').trim()
    if (!text) {
      // Empty after removal: merge timing into previous or next
      if (result.length > 0) {
        result[result.length - 1].endTime = e.endTime
      }
      continue
    }
    result.push({ ...e, text, index: result.length + 1 })
  }
  return result
}

/**
 * Phase 1B — 4A: Normalize casing and punctuation; preserve timestamps.
 */
function grammarAndFormattingFix(entries: SubtitleEntry[]): SubtitleEntry[] {
  return entries.map((e) => {
    let text = e.text.trim()
    if (!text) return { ...e }
    text = text.replace(/\s+/g, ' ')
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1)
      if (!/[.!?]$/.test(text)) text = text + '.'
    }
    return { ...e, text }
  })
}

/**
 * Parse and fix subtitle file. Phase 1B: optional timing pass, grammar, line-break.
 */
export function fixSubtitleFile(
  filePath: string,
  options: FixSubtitleOptions = {}
): {
  content: string
  format: 'srt' | 'vtt'
  issues: SubtitleIssue[]
  warnings?: SubtitleWarning[]
} {
  const format = detectSubtitleFormat(filePath)
  let entries = format === 'srt' ? parseSRT(filePath) : parseVTT(filePath)

  let warnings: SubtitleWarning[] = []
  try {
    const val = validateSubtitleEntries(entries)
    warnings = val.warnings
  } catch {
    // Validation failure must not block job
  }

  if (options.fixTiming) {
    entries = normalizeTimingOnly(entries, options.timingOffsetMs ?? 0)
  }
  if (options.removeFillers) {
    entries = removeFillerWordsFromEntries(entries)
  }
  if (options.grammarFix) {
    entries = grammarAndFormattingFix(entries)
  }
  const { fixed, issues } = fixSubtitleIssues(entries)
  if (options.lineBreakFix) {
    // fixSubtitleIssues already does long_line and fast_reading; lineBreakFix just ensures we ran it
  }

  const content = format === 'srt' ? toSRT(fixed) : toVTT(fixed)
  return { content, format, issues, warnings }
}
