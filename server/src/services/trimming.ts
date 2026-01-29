import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

const tempDir = process.env.TEMP_FILE_PATH || path.join(process.cwd(), 'temp')

export interface TrimOptions {
  inputPath: string
  startTime: number // seconds
  endTime: number // seconds
}

export interface TrimResult {
  outputPath: string
  trimmedDuration: number
}

export function trimVideoSegment(options: TrimOptions): Promise<TrimResult> {
  const { inputPath, startTime, endTime } = options
  const duration = Math.max(0, endTime - startTime)
  const outputPath = path.join(
    tempDir,
    `trimmed-${Date.now()}-${path.basename(inputPath)}`
  )

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
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

