import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

/** Align with services/ffmpeg.ts. */
const FFMPEG_THREADS = process.env.FFMPEG_THREADS || '4'

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

export interface TrimOptions {
  inputPath: string
  startTime: number // seconds
  endTime: number // seconds
}

export interface TrimResult {
  outputPath: string
  trimmedDuration: number
}

/**
 * Trim video segment. Uses stream copy (-c copy) for speed; no re-encode.
 * Cut points may be up to one keyframe off; use for speed-first workflows.
 */
export function trimVideoSegment(options: TrimOptions): Promise<TrimResult> {
  const { inputPath, startTime, endTime } = options
  const duration = Math.max(0, endTime - startTime)
  const outputPath = path.join(
    tempDir,
    `trimmed-${Date.now()}-${path.basename(inputPath)}`
  )

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(['-ss', String(startTime)])
      .outputOptions([
        '-threads', FFMPEG_THREADS,
        '-c', 'copy',
        '-t', String(duration),
        '-avoid_negative_ts', 'make_zero',
      ])
      .output(outputPath)
      .on('end', () => {
        resolve({
          outputPath,
          trimmedDuration: duration,
        })
      })
      .on('error', (err) => {
        reject(err)
      })
      .run()
  })
}

