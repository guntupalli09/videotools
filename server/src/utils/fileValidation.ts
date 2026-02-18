import { fromFile as fileTypeFromFile } from 'file-type'
import { detectSubtitleFormatFromContent } from './subtitleDetector'

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]

const ALLOWED_VIDEO_EXT = ['.mp4', '.mov', '.avi', '.webm']

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export function validateFileSize(size: number): string | null {
  if (size > MAX_FILE_SIZE) {
    return 'File exceeds 100MB. Upgrade for larger files.'
  }
  return null
}

/** If originalFilename is provided and has .mp4/.mov/.avi/.webm, allow when magic-byte detection fails (e.g. some AVI variants). */
function hasAllowedVideoExtension(originalFilename: string): boolean {
  const lower = originalFilename.toLowerCase()
  return ALLOWED_VIDEO_EXT.some((ext) => lower.endsWith(ext))
}

export async function validateFileType(filePath: string, originalFilename?: string): Promise<string | null> {
  try {
    const fileType = await fileTypeFromFile(filePath)
    console.log('[upload] detected fileType:', fileType)

    if (!fileType) {
      if (originalFilename && hasAllowedVideoExtension(originalFilename)) {
        return null
      }
      return 'Please upload MP4, MOV, AVI, or WEBM'
    }

    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      if (originalFilename && hasAllowedVideoExtension(originalFilename)) {
        return null
      }
      return 'Please upload MP4, MOV, AVI, or WEBM'
    }

    return null
  } catch (error) {
    console.error('File type validation error:', error)
    if (originalFilename && hasAllowedVideoExtension(originalFilename)) {
      return null
    }
    return 'Please upload MP4, MOV, AVI, or WEBM'
  }
}

export type SubtitleValidationResult =
  | { error: null; format: 'srt' | 'vtt'; detectedFormat: 'srt' | 'vtt' }
  | { error: string; detectedFormat: 'srt' | 'vtt' | 'unknown' }

const UNSUPPORTED_SUBTITLE_MESSAGE =
  'Unsupported subtitle format. Upload a valid SRT or VTT file.'

/**
 * Validate subtitle file by content only. Ignores filename/extension.
 * Uses subtitleDetector to read first N KB and detect SRT vs VTT.
 */
export async function validateSubtitleFile(filePath: string): Promise<SubtitleValidationResult> {
  try {
    const { detectedFormat, normalizedFormat } = detectSubtitleFormatFromContent(filePath)

    if (normalizedFormat === null || detectedFormat === 'unknown') {
      return { error: UNSUPPORTED_SUBTITLE_MESSAGE, detectedFormat: 'unknown' }
    }

    return { error: null, format: normalizedFormat, detectedFormat }
  } catch (error) {
    console.error('Subtitle validation error:', error)
    return {
      error: 'Please upload a valid SRT or VTT subtitle file.',
      detectedFormat: 'unknown',
    }
  }
}
