/**
 * Pause-based segmentation: extract structure from Whisper timestamps.
 * Uses pauses between segments to infer phrase and paragraph boundaries.
 * Matches Otter-style transcript structure.
 *
 * Production-safe:
 * - Pre-merges adjacent segments with tiny pauses (Whisper chunk artifacts)
 * - Requires pause + length for period insertion (no blind punctuation)
 * - Paragraph by count only when pause at break is meaningful
 */

export interface TimestampedSegment {
  start: number
  end: number
  text: string
}

const MERGE_PAUSE_MS = 120
const SENTENCE_PAUSE_MS = 200
const PARAGRAPH_PAUSE_MS = 700
const PERIOD_PAUSE_MS = 400
const SENTENCES_PER_PARAGRAPH = 6
const MIN_PARAGRAPH_CHARS = 300
const MIN_PARAGRAPH_PAUSE_MS = 300
const MAX_PARAGRAPH_CHARS = 900
const MIN_LENGTH_FOR_PERIOD = 40

interface MergedChunk {
  text: string
  start: number
  end: number
}

/**
 * Pre-merge: collapse adjacent segments with pause < 120ms.
 * Whisper segments are often arbitrary chunks; tiny gaps are not meaningful.
 */
function mergeSmallPauseSegments(segments: TimestampedSegment[]): MergedChunk[] {
  const chunks: MergedChunk[] = []
  let i = 0

  while (i < segments.length) {
    const seg = segments[i]
    let text = seg.text.trim()
    let start = seg.start
    let end = seg.end

    if (!text) {
      i++
      continue
    }

    while (i + 1 < segments.length) {
      const next = segments[i + 1]
      const nextText = next.text.trim()
      const pauseMs = Math.max(0, (next.start - end) * 1000)

      if (!nextText || pauseMs >= MERGE_PAUSE_MS) break

      text = text + ' ' + nextText
      end = next.end
      i++
    }
    chunks.push({ text, start, end })
    i++
  }
  return chunks
}

/**
 * Build structured transcript from Whisper segments using pause detection.
 * - Pre-merge: pause < 120ms → concatenate (Whisper chunk artifact)
 * - Pause > 200ms → phrase boundary
 * - Pause > 700ms → paragraph
 * - Period: only when pause >= 400ms AND length >= 40 (both signals)
 * - Paragraph by count: only when pause >= 300ms at break (avoid mid-topic)
 */
export function segmentToStructuredText(segments: TimestampedSegment[]): string {
  if (!segments || segments.length === 0) return ''

  const chunks = mergeSmallPauseSegments(segments)
  if (chunks.length === 0) return ''

  const parts: string[] = []
  let sentenceCount = 0
  let paragraphChars = 0
  let lastEnd = -1

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const text = chunk.text.trim()
    if (!text) continue

    const rawPauseMs = lastEnd >= 0 ? (chunk.start - lastEnd) * 1000 : 0
    const pauseMs = Math.max(0, rawPauseMs)
    lastEnd = chunk.end

    if (i === 0) {
      parts.push(maybeSentenceEnd(text, pauseMs))
      sentenceCount = 1
      paragraphChars = text.length
      continue
    }

    if (pauseMs >= SENTENCE_PAUSE_MS) {
      const forceParagraphByPause = pauseMs >= PARAGRAPH_PAUSE_MS
      const forceParagraphByCount =
        sentenceCount >= SENTENCES_PER_PARAGRAPH &&
        paragraphChars >= MIN_PARAGRAPH_CHARS &&
        pauseMs >= MIN_PARAGRAPH_PAUSE_MS

      if (forceParagraphByPause || forceParagraphByCount) {
        parts.push('\n\n')
        sentenceCount = 0
        paragraphChars = 0
      } else {
        parts.push(' ')
      }
      parts.push(maybeSentenceEnd(text, pauseMs))
      sentenceCount += 1
      paragraphChars += text.length
      if (paragraphChars > MAX_PARAGRAPH_CHARS) {
        parts.push('\n\n')
        sentenceCount = 0
        paragraphChars = text.length
      }
    } else {
      parts.push(' ')
      parts.push(text)
      paragraphChars += text.length
      if (paragraphChars > MAX_PARAGRAPH_CHARS) {
        parts.push('\n\n')
        sentenceCount = 0
        paragraphChars = text.length
      }
    }
  }

  return parts
    .join('')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n\n+/g, '\n\n')
    .trim()
}

/**
 * Add period only when both pause and length indicate a complete thought.
 * pause >= 400ms + length >= 40 → high confidence.
 */
function maybeSentenceEnd(text: string, pauseMs: number): string {
  const t = text.trim()
  if (!t) return t
  if (/[.!?]$/.test(t)) return t
  if (pauseMs >= PERIOD_PAUSE_MS && t.length >= MIN_LENGTH_FOR_PERIOD) return t + '.'
  return t
}
