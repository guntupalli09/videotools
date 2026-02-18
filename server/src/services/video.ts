import path from 'path'
import fs from 'fs'
import { getVideoDuration } from './ffmpeg'

/**
 * Validate video duration (max duration varies by plan; caller supplies maxDurationMinutes)
 */
export function validateVideoDuration(
  videoPath: string,
  maxDurationMinutes = 15
): Promise<{ valid: boolean; duration?: number; error?: string }> {
  // Check if file exists first
  if (!fs.existsSync(videoPath)) {
    return Promise.resolve({
      valid: false,
      error: `Video file not found: ${videoPath}`,
    })
  }

  return getVideoDuration(videoPath)
    .then(duration => {
      const maxDuration = maxDurationMinutes * 60 // minutes in seconds
      if (duration > maxDuration) {
        return {
          valid: false,
          duration,
          error: `Video exceeds ${maxDurationMinutes} minutes (${Math.round(duration / 60)} minutes). Upgrade for longer videos.`,
        }
      }
      return { valid: true, duration }
    })
    .catch(error => {
      console.error('Video duration validation error:', error)
      return {
        valid: false,
        error: error.message || 'Could not determine video duration',
      }
    })
}

/**
 * Generate output filename with suffix
 */
export function generateOutputFilename(originalName: string, suffix: string, extension?: string): string {
  const ext = extension || path.extname(originalName)
  const nameWithoutExt = path.basename(originalName, path.extname(originalName))
  return `${nameWithoutExt}${suffix}${ext}`
}

/** URL-based downloads are disabled. Rejects immediately. */
export async function downloadVideoFromURL(_url: string, _outputPath: string): Promise<string> {
  throw new Error('URL downloads are temporarily disabled.')
}
