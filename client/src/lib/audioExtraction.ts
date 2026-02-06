/**
 * Browser-side audio extraction for transcript/subtitle tools.
 * Uses FFmpeg.wasm to produce mono, speech-optimized audio (16 kHz MP3).
 * On any failure or unsupported case, returns null so caller falls back to raw video upload.
 */

const EXTRACTION_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes max for preparation
const MAX_FILE_SIZE_FOR_EXTRACTION = 150 * 1024 * 1024 // 150 MB — beyond this, fallback to avoid OOM

export interface AudioExtractionResult {
  blob: Blob
  originalName: string
  durationMs?: number
}

let ffmpegInstance: import('@ffmpeg/ffmpeg').FFmpeg | null = null
let ffmpegLoadPromise: Promise<unknown> | null = null

function getExtension(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : '.mp4'
}

/**
 * Feature detection: whether we should attempt browser-side extraction.
 * Does not load FFmpeg; just checks environment (browser, memory-ish limits).
 */
export function isAudioExtractionSupported(): boolean {
  if (typeof window === 'undefined' || typeof File === 'undefined') return false
  return true
}

/**
 * Attempt to extract audio from a video file in the browser.
 * Returns { blob, originalName } on success, null on any failure (unsupported codec, timeout, error).
 * Caller must fall back to uploading the original video when null is returned.
 */
export async function extractAudioInBrowser(
  file: File,
  options?: { timeoutMs?: number; maxFileSize?: number }
): Promise<AudioExtractionResult | null> {
  const timeoutMs = options?.timeoutMs ?? EXTRACTION_TIMEOUT_MS
  const maxFileSize = options?.maxFileSize ?? MAX_FILE_SIZE_FOR_EXTRACTION

  if (!isAudioExtractionSupported() || file.size > maxFileSize) {
    return null
  }

  const startMs = performance.now()

  try {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const { fetchFile } = await import('@ffmpeg/util')

    if (!ffmpegInstance) {
      ffmpegInstance = new FFmpeg()
      ffmpegLoadPromise = ffmpegInstance.load()
    }
    await ffmpegLoadPromise
    const ffmpeg = ffmpegInstance

    const inputExt = getExtension(file.name) || '.mp4'
    const inputName = `input${inputExt}`
    const outputName = 'output.mp3'

    const runExtraction = async (): Promise<AudioExtractionResult> => {
      await ffmpeg.writeFile(inputName, await fetchFile(file))
      const execTimeoutSec = Math.max(1, Math.floor(timeoutMs / 1000))
      await ffmpeg.exec(
        [
          '-i',
          inputName,
          '-vn',
          '-acodec',
          'libmp3lame',
          '-ar',
          '16000',
          '-ac',
          '1',
          '-q:a',
          '5',
          outputName,
        ],
        execTimeoutSec
      )
      const data = await ffmpeg.readFile(outputName)
      const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new TextEncoder().encode(String(data))
      const blob = new Blob([bytes.slice(0)], { type: 'audio/mpeg' })
      try {
        await ffmpeg.deleteFile(inputName)
        await ffmpeg.deleteFile(outputName)
      } catch {
        // ignore cleanup
      }
      const durationMs = performance.now() - startMs
      return { blob, originalName: file.name, durationMs }
    }

    const result = await Promise.race([
      runExtraction(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AUDIO_EXTRACTION_TIMEOUT')), timeoutMs)
      ),
    ])

    if (result?.durationMs !== undefined) {
      console.log('[PREPARE_AUDIO_TIMING]', {
        preparation_ms: Math.round(result.durationMs),
        success: true,
        original_size_bytes: file.size,
        output_size_bytes: result.blob.size,
      })
    }
    return result
  } catch (e) {
    const durationMs = performance.now() - startMs
    console.log('[PREPARE_AUDIO_TIMING]', {
      preparation_ms: Math.round(durationMs),
      success: false,
      reason: e instanceof Error ? e.message : 'unknown',
    })
    return null
  }
}
