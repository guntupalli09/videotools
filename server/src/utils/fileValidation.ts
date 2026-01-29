import { fileTypeFromFile } from 'file-type'

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export function validateFileSize(size: number): string | null {
  if (size > MAX_FILE_SIZE) {
    return 'File exceeds 100MB. Upgrade for larger files.'
  }
  return null
}

export async function validateFileType(filePath: string): Promise<string | null> {
  try {
    const fileType = await fileTypeFromFile(filePath)
    
    if (!fileType) {
      return 'Please upload MP4, MOV, AVI, or WEBM'
    }

    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      return 'Please upload MP4, MOV, AVI, or WEBM'
    }

    return null
  } catch (error) {
    console.error('File type validation error:', error)
    return 'Please upload MP4, MOV, AVI, or WEBM'
  }
}

export async function validateSubtitleFile(filePath: string): Promise<string | null> {
  try {
    const fs = require('fs')
    const content = fs.readFileSync(filePath, 'utf-8')
    const ext = filePath.toLowerCase().split('.').pop()
    
    if (ext === 'srt') {
      // Basic SRT validation - check for timestamp pattern
      if (!content.match(/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/)) {
        return 'Invalid SRT file format'
      }
      return null
    }
    
    if (ext === 'vtt') {
      // Basic VTT validation - check for WEBVTT header or timestamp pattern
      if (!content.startsWith('WEBVTT') && !content.match(/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/)) {
        return 'Invalid VTT file format'
      }
      return null
    }
    
    return 'Please upload a valid SRT or VTT subtitle file'
  } catch (error) {
    console.error('Subtitle validation error:', error)
    return 'Please upload a valid SRT or VTT subtitle file'
  }
}