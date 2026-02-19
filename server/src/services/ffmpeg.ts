import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffprobeInstaller from '@ffprobe-installer/ffprobe'
import path from 'path'
import fs from 'fs'
import { FfprobeData } from 'fluent-ffmpeg'
import { detectSubtitleFormat, parseSRT, parseVTT } from '../utils/srtParser'

// Explicit paths: use env in Docker (e.g. /usr/bin/ffmpeg) if the file exists, else npm installer (works on Windows)
function resolveFfmpegPath(envPath: string | undefined, fallback: string): string {
  if (envPath && fs.existsSync(envPath)) return envPath
  return fallback
}
const ffmpegPath = resolveFfmpegPath(process.env.FFMPEG_PATH, ffmpegInstaller.path)
const ffprobePath = resolveFfmpegPath(process.env.FFPROBE_PATH, ffprobeInstaller.path)
ffmpeg.setFfmpegPath(ffmpegPath)
try {
  ffmpeg.setFfprobePath(ffprobePath)
} catch (e) {
  console.warn('Could not set ffprobe path:', e)
}

/** FFmpeg thread count. Use 4+ on dedicated servers for faster encode. */
const FFMPEG_THREADS = process.env.FFMPEG_THREADS || '4'

/** When set (e.g. "true" or "1"), use GPU for decode/encode where available (e.g. CUDA/NVENC). No-op if GPU not present. */
const USE_GPU = /^(1|true|yes)$/i.test(process.env.FFMPEG_USE_GPU || '')

function getGpuInputOptions(): string[] {
  if (!USE_GPU) return []
  return ['-hwaccel', 'auto']
}

function getGpuVideoCodec(): string {
  if (!USE_GPU) return 'libx264'
  return 'h264_nvenc'
}

/** libx264 uses -preset; nvenc does not. */
function getEncodePresetOptions(): string[] {
  return getGpuVideoCodec() === 'libx264' ? ['-preset', 'fast'] : []
}

/** Phase 2.5: Kill job if no FFmpeg output for 90s. Worker will auto-retry once. */
export const HUNG_JOB_MS = 90 * 1000
export const HUNG_JOB_MESSAGE = 'HUNG_JOB'

export interface FFmpegProgress {
  percent: number
  timemark?: string
}

function setupHungProtection(
  cmd: { kill: (signal: string) => unknown },
  reject: (err: Error) => void
): { clear: () => void; reset: () => void } {
  let hungTimer: NodeJS.Timeout
  const reset = () => {
    clearTimeout(hungTimer)
    hungTimer = setTimeout(() => {
      try {
        cmd.kill('SIGKILL')
      } catch (_) {
        /* ignore */
      }
      reject(new Error(HUNG_JOB_MESSAGE))
    }, HUNG_JOB_MS)
  }
  const clear = () => clearTimeout(hungTimer)
  reset()
  return { clear, reset }
}

/**
 * Extract audio from video file (with 90s hung-job kill).
 */
export function extractAudio(
  videoPath: string,
  outputPath: string,
  onProgress?: (progress: FFmpegProgress) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(videoPath)
      .inputOptions(getGpuInputOptions())
      .outputOptions(['-threads', FFMPEG_THREADS, '-vn', '-acodec', 'libmp3lame', '-ar', '16000', '-ac', '1', '-q:a', '5'])
      .on('progress', (progress: { percent?: number; timemark?: string }) => {
        hung.reset()
        onProgress?.({
          percent: progress.percent || 0,
          timemark: progress.timemark,
        })
      })
      .on('end', () => {
        hung.clear()
        resolve(outputPath)
      })
      .on('error', (err: Error) => {
        hung.clear()
        reject(err)
      })
    const hung = setupHungProtection(cmd, reject)
    cmd.save(outputPath)
  })
}

/**
 * Split an audio file into fixed-duration chunks (for parallel transcription).
 * Returns paths to chunk files in order. Caller must delete them when done.
 */
export function splitAudioIntoChunks(
  audioPath: string,
  chunkDurationSec: number,
  outputDir: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const pattern = path.join(outputDir, `chunk_%03d.mp3`)
    ffmpeg(audioPath)
      .outputOptions([
        '-f', 'segment',
        '-segment_time', String(chunkDurationSec),
        '-reset_timestamps', '1',
        '-c', 'copy',
        '-map', '0',
      ])
      .output(pattern)
      .on('end', () => {
        const files = fs.readdirSync(outputDir)
          .filter((f) => f.startsWith('chunk_') && f.endsWith('.mp3'))
          .sort()
        resolve(files.map((f) => path.join(outputDir, f)))
      })
      .on('error', (err: Error) => reject(err))
      .run()
  })
}

/** Phase 1B — UTILITY 5B: Style presets (subtitle metadata only). No custom styling editor. */
export interface BurnStylePreset {
  fontSize?: 'small' | 'medium' | 'large'
  position?: 'bottom' | 'middle'
  backgroundOpacity?: 'none' | 'low' | 'high'
}

/**
 * Burn subtitles into video
 */
export function burnSubtitles(
  videoPath: string,
  subtitlePath: string,
  outputPath: string,
  onProgress?: (progress: FFmpegProgress) => void,
  preset?: BurnStylePreset
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if files exist
    if (!fs.existsSync(videoPath)) {
      reject(new Error(`Video file not found: ${videoPath}`))
      return
    }
    
    if (!fs.existsSync(subtitlePath)) {
      reject(new Error(`Subtitle file not found: ${subtitlePath}`))
      return
    }
    
    // Copy subtitle file to a temporary location with a simple name (no spaces/special chars)
    // This avoids FFmpeg path parsing issues on Windows
    const tempDir = path.dirname(subtitlePath)
    const originalExt = path.extname(subtitlePath).toLowerCase() || '.srt'
    const tempSubtitlePath = path.join(tempDir, `subs_${Date.now()}${originalExt}`)
    
    try {
      fs.copyFileSync(subtitlePath, tempSubtitlePath)
    } catch (copyError: any) {
      reject(new Error(`Failed to copy subtitle file: ${copyError.message}`))
      return
    }
    
    // Probe video resolution so libass doesn't assume a tiny script resolution and
    // scale the text to huge sizes (common on 1080x1920 vertical videos).
    const probeVideoSize = (p: string): Promise<{ width: number; height: number }> =>
      new Promise((res, rej) => {
        console.log('[upload] About to run ffprobe (size) on:', p)
        ;(ffmpeg as any).ffprobe(p, (err: Error | null, metadata: any) => {
          if (err) {
            console.error('[upload] ffprobe failed:', err)
            return rej(err)
          }
          console.log('[upload] ffprobe (size) succeeded for:', p)
          const v = (metadata?.streams || []).find((s: any) => s.codec_type === 'video')
          const width = Number(v?.width) || 0
          const height = Number(v?.height) || 0
          if (!width || !height) return rej(new Error('Could not read video resolution'))
          res({ width, height })
        })
      })

    probeVideoSize(videoPath)
      .then(({ width, height }) => {
        // Instead of relying on force_style (which can be flaky for SRT/VTT),
        // generate a temporary ASS file with explicit styling + PlayRes set to the
        // video resolution. This guarantees bottom placement and clean "movie" styling.

        // Scale style based on resolution; Phase 1B presets adjust scale.
        const baseFontSize = Math.max(24, Math.min(80, Math.round(height * 0.035)))
        const sizeMult = preset?.fontSize === 'small' ? 0.75 : preset?.fontSize === 'large' ? 1.25 : 1
        const fontSize = Math.round(baseFontSize * sizeMult)
        const isMiddle = preset?.position === 'middle'
        const marginV = isMiddle ? Math.round(height * 0.4) : Math.max(40, Math.min(180, Math.round(height * 0.05)))
        const marginLR = Math.max(20, Math.min(80, Math.round(width * 0.03)))
        const backAlpha = preset?.backgroundOpacity === 'none' ? '00' : preset?.backgroundOpacity === 'high' ? 'B3' : '80'

        const format = detectSubtitleFormat(tempSubtitlePath)
        const entries = format === 'srt' ? parseSRT(tempSubtitlePath) : parseVTT(tempSubtitlePath)

        console.log('Subtitle parse:', {
          format,
          entries: entries.length,
          sample: entries[0]?.text?.slice(0, 80),
        })

        if (entries.length === 0) {
          throw new Error('No subtitle entries parsed (invalid or empty subtitle file).')
        }

        const toAssTime = (seconds: number) => {
          const h = Math.floor(seconds / 3600)
          const m = Math.floor((seconds % 3600) / 60)
          const s = Math.floor(seconds % 60)
          const cs = Math.floor((seconds - Math.floor(seconds)) * 100) // centiseconds
          return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
        }

        const escapeAssText = (t: string) =>
          t.replace(/\r/g, '').split('\n').map((line) => line.replace(/{/g, '').replace(/}/g, '')).join('\\N')

        const assContent =
          `[Script Info]\n` +
          `ScriptType: v4.00+\n` +
          `PlayResX: ${width}\n` +
          `PlayResY: ${height}\n` +
          `ScaledBorderAndShadow: yes\n` +
          `\n` +
          `[V4+ Styles]\n` +
          `Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n` +
          // PrimaryColour/BackColour are &HAABBGGRR&; BackColour alpha from preset
          `Style: Default,Arial,${fontSize},&H00FFFFFF&,&H00FFFFFF&,&H00000000&,&H${backAlpha}000000&,0,0,0,0,100,100,0,0,3,0,0,${isMiddle ? '5' : '2'},${marginLR},${marginLR},${marginV},1\n` +
          `\n` +
          `[Events]\n` +
          `Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n` +
          entries
            .map((e) => {
              const start = toAssTime(e.startTime)
              const end = toAssTime(e.endTime)
              const text = escapeAssText(e.text)
              return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
            })
            .join('\n') +
          `\n`

        const tempAssPath = path.join(tempDir, `subs_${Date.now()}.ass`)
        fs.writeFileSync(tempAssPath, assContent, 'utf-8')

        // Build filter using ASS file. Escape Windows drive-letter colon.
        let assPathForFfmpeg = path.resolve(tempAssPath).replace(/\\/g, '/')
        assPathForFfmpeg = assPathForFfmpeg.replace(/^([A-Za-z]):/, '$1\\:')

        const subtitleFilter = `subtitles=filename='${assPathForFfmpeg}'`
    
    console.log('Burning subtitles:', {
      video: videoPath,
      subtitles: subtitlePath,
      tempSubtitles: tempSubtitlePath,
      tempAss: tempAssPath,
      output: outputPath,
    })
        const cmd = (ffmpeg(videoPath) as any)
          .inputOptions(getGpuInputOptions())
          .videoFilters(subtitleFilter)
          .videoCodec(getGpuVideoCodec())
          .outputOptions(['-threads', FFMPEG_THREADS, ...getEncodePresetOptions(), '-c:a', 'copy'])
          .on('progress', (progress: { percent?: number; timemark?: string }) => {
            hung.reset()
            onProgress?.({
              percent: progress.percent || 0,
              timemark: progress.timemark,
            })
          })
          .on('end', () => {
            hung.clear()
            try {
              if (fs.existsSync(tempSubtitlePath)) fs.unlinkSync(tempSubtitlePath)
              if (fs.existsSync(tempAssPath)) fs.unlinkSync(tempAssPath)
            } catch (e) { /* ignore */ }
            console.log('Subtitle burning completed:', outputPath)
            resolve(outputPath)
          })
          .on('error', (err: any, stdout: any, stderr: any) => {
            hung.clear()
            try {
              if (fs.existsSync(tempSubtitlePath)) fs.unlinkSync(tempSubtitlePath)
              if (fs.existsSync(tempAssPath)) fs.unlinkSync(tempAssPath)
            } catch (e) { /* ignore */ }
            console.error('FFmpeg error:', err?.message || err)
            reject(new Error(`FFmpeg error: ${err?.message || err}\n${stderr || ''}`))
          })
          .on('stderr', (stderrLine: string) => {
            if (stderrLine.includes('error') || stderrLine.includes('Error')) {
              console.error('FFmpeg stderr:', stderrLine)
            }
          })
        const hung = setupHungProtection(cmd, reject)
        cmd.save(outputPath)
      })
      .catch((err) => {
        try {
          if (fs.existsSync(tempSubtitlePath)) fs.unlinkSync(tempSubtitlePath)
        } catch {}
        reject(err)
      })
  })
}

/**
 * Compress video. Phase 1B: optional profile (web/mobile/archive) for resolution + CRF.
 */
export function compressVideo(
  inputPath: string,
  outputPath: string,
  crf: number,
  onProgress?: (progress: FFmpegProgress) => void,
  profile?: CompressProfile
): Promise<string> {
  return new Promise((resolve, reject) => {
    const run = (scaleFilter: string | null, useCrf: number) => {
      const opts: string[] = [
        '-threads', FFMPEG_THREADS,
        ...(getGpuVideoCodec() === 'h264_nvenc' ? [`-cq`, String(useCrf)] : [`-crf`, String(useCrf)]),
        ...getEncodePresetOptions(),
        '-movflags +faststart',
      ]
      if (scaleFilter) opts.push('-vf', scaleFilter)
      const cmd = ffmpeg(inputPath)
        .inputOptions(getGpuInputOptions())
        .videoCodec(getGpuVideoCodec())
        .outputOptions(opts)
        .on('progress', (progress: { percent?: number; timemark?: string }) => {
          hung.reset()
          onProgress?.({ percent: progress.percent || 0, timemark: progress.timemark })
        })
        .on('end', () => {
          hung.clear()
          resolve(outputPath)
        })
        .on('error', (err: Error) => {
          hung.clear()
          reject(err)
        })
      const hung = setupHungProtection(cmd, reject)
      cmd.save(outputPath)
    }

    if (!profile || profile === 'archive') {
      run(null, crf)
      return
    }

    getVideoMetadata(inputPath)
      .then(({ width, height }) => {
        const max = PROFILE_MAX[profile]
        let scaleFilter: string | null = null
        if (width > max.w || height > max.h) {
          const scale = Math.min(max.w / width, max.h / height, 1)
          const w = Math.round(width * scale)
          const h = Math.round(height * scale)
          scaleFilter = `scale=${w}:${h}:force_original_aspect_ratio=decrease`
        }
        run(scaleFilter, PROFILE_CRF[profile])
      })
      .catch(() => run(null, crf))
  })
}

/**
 * Get video duration in seconds
 */
export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // Check if file exists first
    if (!fs.existsSync(videoPath)) {
      reject(new Error(`Video file not found: ${videoPath}`))
      return
    }

    console.log('[upload] About to run ffprobe on:', videoPath)
    ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: FfprobeData) => {
      if (err) {
        console.error('[upload] ffprobe failed:', err)
        console.error('FFprobe error:', err.message)
        console.error('Video path:', videoPath)
        reject(new Error(`Failed to probe video: ${err.message}`))
        return
      }

      console.log('[upload] ffprobe succeeded for:', videoPath)

      if (!metadata || !metadata.format) {
        reject(new Error('Invalid video metadata'))
        return
      }

      const duration = metadata.format.duration || 0
      if (duration === 0) {
        reject(new Error('Could not determine video duration from metadata'))
        return
      }

      resolve(duration)
    })
  })
}

/** Phase 1B — UTILITY 6: Video metadata for resolution targeting. */
export function getVideoMetadata(videoPath: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(videoPath)) {
      reject(new Error(`Video file not found: ${videoPath}`))
      return
    }
    ffmpeg.ffprobe(videoPath, (err: Error | null, metadata: FfprobeData) => {
      if (err) return reject(err)
      const v = (metadata?.streams || []).find((s: any) => s.codec_type === 'video')
      const width = Number(v?.width) || 0
      const height = Number(v?.height) || 0
      const duration = metadata?.format?.duration || 0
      if (!width || !height) return reject(new Error('Could not read video resolution'))
      resolve({ width, height, duration })
    })
  })
}

/** Phase 1B — Preset profiles: Web (720p), Mobile (480p), Archive (original). */
export type CompressProfile = 'web' | 'mobile' | 'archive'

const PROFILE_MAX: Record<CompressProfile, { w: number; h: number }> = {
  web: { w: 1280, h: 720 },
  mobile: { w: 854, h: 480 },
  archive: { w: 4096, h: 2160 },
}

const PROFILE_CRF: Record<CompressProfile, number> = {
  web: 26,
  mobile: 28,
  archive: 23,
}
