import fs from 'fs'

/** Bytes to read from the start of the file for format detection (no full file load). */
const DETECT_HEAD_BYTES = 32 * 1024 // 32 KB

const VTT_HEADER = 'WEBVTT'
/** SRT/VTT timestamp pattern: HH:MM:SS,mmm or HH:MM:SS.mmm followed by --> */
const TIMESTAMP_PATTERN = /\d\d:\d\d:\d\d[.,]\d\d\d\s+-->/

export type DetectedFormat = 'srt' | 'vtt' | 'unknown'

export interface SubtitleDetectionResult {
  detectedFormat: DetectedFormat
  normalizedFormat: 'srt' | 'vtt' | null
}

/**
 * Detect subtitle format from file content only. Ignores filename/extension.
 * Reads only the first N KB of the file.
 */
export function detectSubtitleFormatFromContent(filePath: string): SubtitleDetectionResult {
  let content: string
  try {
    const fd = fs.openSync(filePath, 'r')
    const buffer = Buffer.alloc(Math.min(DETECT_HEAD_BYTES, fs.fstatSync(fd).size))
    fs.readSync(fd, buffer, 0, buffer.length, 0)
    fs.closeSync(fd)
    content = buffer.toString('utf-8')
  } catch (error) {
    console.error('[subtitleDetector] read error', { filePath, error })
    return { detectedFormat: 'unknown', normalizedFormat: null }
  }

  const trimmed = content.trimStart()

  // VTT: must start with WEBVTT
  if (trimmed.startsWith(VTT_HEADER)) {
    return { detectedFormat: 'vtt', normalizedFormat: 'vtt' }
  }

  // SRT: contains timestamp line like 00:00:00,000 --> or 00:00:00.000 -->
  if (TIMESTAMP_PATTERN.test(content)) {
    return { detectedFormat: 'srt', normalizedFormat: 'srt' }
  }

  return { detectedFormat: 'unknown', normalizedFormat: null }
}
