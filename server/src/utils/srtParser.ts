import fs from 'fs'
import { detectSubtitleFormatFromContent } from './subtitleDetector'

export interface SubtitleEntry {
  index: number
  startTime: number // in seconds
  endTime: number // in seconds
  text: string
}

/**
 * Parse SRT subtitle file
 */
export function parseSRT(filePath: string): SubtitleEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const entries: SubtitleEntry[] = []
  
  // Split by double newlines to get individual subtitle blocks
  const blocks = content.trim().split(/\n\s*\n/)
  
  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue
    
    const index = parseInt(lines[0], 10)
    if (isNaN(index)) continue
    
    // Parse timestamp line (format: 00:00:00,000 --> 00:00:00,000)
    const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
    if (!timeMatch) continue
    
    const startTime = 
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000
    
    const endTime = 
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000
    
    // Get text (all lines after timestamp)
    const text = lines.slice(2).join('\n').trim()
    
    entries.push({
      index,
      startTime,
      endTime,
      text,
    })
  }
  
  return entries
}

/**
 * Parse VTT subtitle file
 */
export function parseVTT(filePath: string): SubtitleEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const entries: SubtitleEntry[] = []
  
  // Remove WEBVTT header and metadata
  const lines = content.split('\n')
  let i = 0
  
  // Skip header
  while (i < lines.length && (lines[i].startsWith('WEBVTT') || lines[i].trim() === '' || lines[i].startsWith('NOTE'))) {
    i++
  }
  
  let index = 1
  while (i < lines.length) {
    // Skip empty lines
    if (lines[i].trim() === '') {
      i++
      continue
    }
    
    // Check if this is a timestamp line
    const timeMatch = lines[i].match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/)
    if (timeMatch) {
      const startTime = 
        parseInt(timeMatch[1]) * 3600 +
        parseInt(timeMatch[2]) * 60 +
        parseInt(timeMatch[3]) +
        parseInt(timeMatch[4]) / 1000
      
      const endTime = 
        parseInt(timeMatch[5]) * 3600 +
        parseInt(timeMatch[6]) * 60 +
        parseInt(timeMatch[7]) +
        parseInt(timeMatch[8]) / 1000
      
      // Collect text lines until next timestamp or empty line
      i++
      const textLines: string[] = []
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].match(/\d{2}:\d{2}:\d{2}/)) {
        textLines.push(lines[i].trim())
        i++
      }
      
      if (textLines.length > 0) {
        entries.push({
          index: index++,
          startTime,
          endTime,
          text: textLines.join('\n'),
        })
      }
    } else {
      i++
    }
  }
  
  return entries
}

/**
 * Convert subtitle entries back to SRT format
 */
export function toSRT(entries: SubtitleEntry[]): string {
  return entries.map(entry => {
    const start = formatSRTTime(entry.startTime)
    const end = formatSRTTime(entry.endTime)
    return `${entry.index}\n${start} --> ${end}\n${entry.text}\n`
  }).join('\n')
}

/**
 * Convert subtitle entries back to VTT format
 */
export function toVTT(entries: SubtitleEntry[]): string {
  const header = 'WEBVTT\n\n'
  const body = entries.map(entry => {
    const start = formatVTTTime(entry.startTime)
    const end = formatVTTTime(entry.endTime)
    return `${start} --> ${end}\n${entry.text}\n`
  }).join('\n')
  
  return header + body
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.floor((seconds % 1) * 1000)
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`
}

function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const millis = Math.floor((seconds % 1) * 1000)
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`
}

/**
 * Detect subtitle format from file content only (no extension). Uses first N KB.
 * Defaults to 'srt' when unknown so callers can still attempt parse.
 */
export function detectSubtitleFormat(filePath: string): 'srt' | 'vtt' {
  const { normalizedFormat } = detectSubtitleFormatFromContent(filePath)
  return normalizedFormat === 'vtt' ? 'vtt' : 'srt'
}
