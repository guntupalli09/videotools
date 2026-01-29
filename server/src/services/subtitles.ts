import { SubtitleEntry, parseSRT, parseVTT, toSRT, toVTT, detectSubtitleFormat } from '../utils/srtParser'

export interface SubtitleIssue {
  type: 'overlap' | 'long_line' | 'fast_reading' | 'large_gap'
  index: number
  message: string
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

/**
 * Parse and fix subtitle file
 */
export function fixSubtitleFile(filePath: string): {
  content: string
  format: 'srt' | 'vtt'
  issues: SubtitleIssue[]
} {
  const format = detectSubtitleFormat(filePath)
  
  // Parse subtitle file
  const entries = format === 'srt' 
    ? parseSRT(filePath)
    : parseVTT(filePath)
  
  // Fix issues
  const { fixed, issues } = fixSubtitleIssues(entries)
  
  // Convert back to format
  const content = format === 'srt'
    ? toSRT(fixed)
    : toVTT(fixed)
  
  return { content, format, issues }
}
