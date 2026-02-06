/**
 * Instant file preview using browser APIs only (no server).
 * Returns filename, duration, thumbnail (video) for use in UI that persists through upload + processing.
 */

export interface FilePreviewData {
  fileName: string
  fileSize: number
  durationSeconds?: number
  /** Data URL for video frame thumbnail; undefined for audio or on error. */
  thumbnailDataUrl?: string
  isVideo: boolean
}

const VIDEO_SNAPSHOT_TIME = 1

/**
 * Get video duration and optional thumbnail (frame at 1s) using <video> element.
 */
function getVideoPreview(file: File): Promise<Pick<FilePreviewData, 'durationSeconds' | 'thumbnailDataUrl'>> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      URL.revokeObjectURL(url)
    }

    const durationSeconds = (): number | undefined =>
      Number.isFinite(video.duration) ? video.duration : undefined

    const onMeta = () => {
      if (video.duration < VIDEO_SNAPSHOT_TIME || video.readyState < 2) {
        resolve({
          durationSeconds: durationSeconds(),
          thumbnailDataUrl: captureFrame(video),
        })
        cleanup()
        return
      }
      video.currentTime = Math.min(VIDEO_SNAPSHOT_TIME, video.duration * 0.1)
      video.addEventListener('seeked', onSeeked)
    }

    const onSeeked = () => {
      resolve({
        durationSeconds: durationSeconds(),
        thumbnailDataUrl: captureFrame(video),
      })
      cleanup()
    }

    const onError = () => {
      resolve({})
      cleanup()
    }

    video.addEventListener('loadedmetadata', onMeta)
    video.addEventListener('error', onError)
    video.src = url
  })
}

function captureFrame(video: HTMLVideoElement): string | undefined {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 90
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.7)
  } catch {
    return undefined
  }
}

/**
 * Get audio duration using AudioContext (decode first frame enough for duration).
 */
function getAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const buf = await ctx.decodeAudioData(reader.result as ArrayBuffer)
        ctx.close()
        resolve(Number.isFinite(buf.duration) ? buf.duration : undefined)
      } catch {
        resolve(undefined)
      }
    }
    reader.onerror = () => resolve(undefined)
    reader.readAsArrayBuffer(file.slice(0, 1024 * 1024 * 2))
  })
}

/**
 * Build preview data for a selected file (video or audio). Browser APIs only.
 * Thumbnail only for video; duration for both when supported.
 */
export async function getFilePreview(file: File): Promise<FilePreviewData> {
  const isVideo = file.type.startsWith('video/')
  const base = {
    fileName: file.name,
    fileSize: file.size,
    isVideo,
  }

  if (isVideo) {
    const extra = await getVideoPreview(file)
    return { ...base, durationSeconds: extra.durationSeconds, thumbnailDataUrl: extra.thumbnailDataUrl }
  }

  if (file.type.startsWith('audio/')) {
    const durationSeconds = await getAudioDuration(file)
    return { ...base, durationSeconds }
  }

  return base
}

export function formatDuration(seconds: number | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
