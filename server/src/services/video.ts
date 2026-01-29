import path from 'path'
import fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import https from 'https'
import http from 'http'
import { URL } from 'url'
import { getVideoDuration } from './ffmpeg'

const execPromise = promisify(exec)

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

/**
 * Download video from URL (for YouTube and direct links)
 * Note: This requires yt-dlp to be installed on the system
 */
export async function downloadVideoFromURL(url: string, outputPath: string): Promise<string> {
  // Check if URL is YouTube
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
  
  if (isYouTube) {
    // Use yt-dlp to download
    // Windows note: yt-dlp must be installed and available on PATH, OR provide YTDLP_PATH in .env
    const ytDlpCmd = process.env.YTDLP_PATH?.trim() || 'yt-dlp'
    try {
      // Quick preflight: ensure yt-dlp is callable (gives a clearer error than the raw shell one)
      try {
        await execPromise(`"${ytDlpCmd}" --version`)
      } catch (e: any) {
        throw new Error(
          `yt-dlp is not installed or not found on PATH.\n` +
            `Install it, or set YTDLP_PATH to the full path of yt-dlp.exe.\n\n` +
            `Windows install options:\n` +
            `- pip: pip install -U yt-dlp\n` +
            `- winget: winget install yt-dlp.yt-dlp\n` +
            `- chocolatey: choco install yt-dlp\n` +
            `- scoop: scoop install yt-dlp\n\n` +
            `Then restart the server and try again.`
        )
      }

      // Download as MP4 when possible. Note: -o accepts a filepath; yt-dlp may adjust extension.
      await execPromise(`"${ytDlpCmd}" -f "best[ext=mp4]/best" -o "${outputPath}" "${url}"`)
      return outputPath
    } catch (error: any) {
      throw new Error(`Failed to download video from YouTube: ${error.message}`)
    }
  } else {
    // Direct download for other URLs
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url)
      const protocol = parsedUrl.protocol === 'https:' ? https : http
      
      const file = fs.createWriteStream(outputPath)
      
      protocol.get(url, (response: any) => {
        if (response.statusCode !== 200) {
          file.close()
          fs.unlinkSync(outputPath)
          reject(new Error(`Failed to download: ${response.statusCode}`))
          return
        }
        
        response.pipe(file)
        
        file.on('finish', () => {
          file.close()
          resolve(outputPath)
        })
      }).on('error', (err: Error) => {
        file.close()
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath)
        }
        reject(err)
      })
    })
  }
}
