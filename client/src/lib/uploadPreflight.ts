/**
 * Pre-flight check before video upload: file size + duration.
 * Prevents wasted uploads and shows clear limits (plan supports X, your file is Y).
 */

const DEFAULT_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2 GB
const DEFAULT_MAX_VIDEO_DURATION_MINUTES = 5

export interface PlanLimitsForPreflight {
  maxFileSize?: number
  maxVideoDuration?: number
}

export interface PreflightResult {
  allowed: boolean
  reason?: string
  durationMinutes?: number
  fileSizeMB?: number
  maxFileSizeMB?: number
  maxDurationMinutes?: number
}

/**
 * Get video duration in seconds using <video preload="metadata"> (does not load full file).
 */
export function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('error', onError)
      URL.revokeObjectURL(url)
    }

    const onLoaded = () => {
      const duration = video.duration
      cleanup()
      resolve(Number.isFinite(duration) ? duration : 0)
    }

    const onError = () => {
      cleanup()
      reject(new Error('Could not read video duration'))
    }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('error', onError)
    video.src = url
  })
}

/**
 * Run pre-flight: check file size and video duration against plan limits.
 * Call this before starting upload. If allowed is false, show reason and do not upload.
 */
export async function checkVideoPreflight(
  file: File,
  limits: PlanLimitsForPreflight
): Promise<PreflightResult> {
  const maxFileSize = limits.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
  const maxDurationMinutes = limits.maxVideoDuration ?? DEFAULT_MAX_VIDEO_DURATION_MINUTES

  const fileSizeMB = file.size / (1024 * 1024)
  const maxFileSizeMB = maxFileSize / (1024 * 1024)

  if (file.size > maxFileSize) {
    return {
      allowed: false,
      reason: `This video is ${fileSizeMB.toFixed(0)} MB. Your plan supports up to ${maxFileSizeMB.toFixed(0)} MB per file. Upgrade to upload larger files.`,
      fileSizeMB,
      maxFileSizeMB,
      maxDurationMinutes,
    }
  }

  let durationSeconds: number
  try {
    durationSeconds = await getVideoDurationSeconds(file)
  } catch {
    // If we can't read duration (e.g. not a video or codec issue), allow upload; server will validate
    return { allowed: true }
  }

  const durationMinutes = durationSeconds / 60
  if (durationMinutes > maxDurationMinutes) {
    return {
      allowed: false,
      reason: `This video is ${durationMinutes.toFixed(1)} min. Your plan supports up to ${maxDurationMinutes} min per video. Upgrade to upload longer videos.`,
      durationMinutes,
      maxDurationMinutes,
      fileSizeMB,
      maxFileSizeMB,
    }
  }

  return {
    allowed: true,
    durationMinutes,
    fileSizeMB,
    maxFileSizeMB,
    maxDurationMinutes,
  }
}
