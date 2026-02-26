import 'dotenv/config'
import OpenAI, { toFile } from 'openai'
import pLimit from 'p-limit'
import fs from 'fs'
import path from 'path'
import { convertAudioToWav, extractAudio, extractAudioToWav, extractAndSplitAudio, getVideoDuration, splitAudioIntoChunks } from './ffmpeg'
import { PROCESSING_V2 } from '../utils/featureFlags'
import { toSRT, toVTT } from '../utils/srtParser'
import type { SubtitleEntry } from '../utils/srtParser'
import { getLogger } from '../lib/logger'

const transcriptionLog = getLogger('worker')
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set. Transcription will fail.')
}

/** Use parallel chunked transcription for videos this long or longer (seconds). */
const PARALLEL_THRESHOLD_SEC = 150
/** Duration of each chunk for parallel transcription (seconds). Whisper limit 25MB; ~3 min mono 16kHz is safe. */
const CHUNK_DURATION_SEC = 180
/** Max concurrent Whisper API calls in parallel path (env MAX_WHISPER_CONCURRENCY, default 4). */
const MAX_WHISPER_CONCURRENCY = Math.max(1, Math.min(16, parseInt(process.env.MAX_WHISPER_CONCURRENCY || '4', 10)))

/** Segment from Whisper verbose_json */
export interface WhisperSegment {
  start: number
  end: number
  text: string
}

/** Result when requesting verbose_json (segment-level timestamps) */
export interface VerboseTranscriptionResult {
  text: string
  segments: WhisperSegment[]
  language?: string
}

/** Min bytes for an audio file to be sent to Whisper (avoids "format not supported" for empty/corrupt extraction). */
const MIN_AUDIO_BYTES = 256

const EXTRACT_EMPTY_MSG =
  'The extracted audio is empty or too short. The source file may have no audio track or an unsupported codec.'

/** Read audio file and return a File with explicit name so Whisper can detect format (avoids 400 on Windows/path/stream). */
async function readAudioAsFile(audioPath: string, filename = 'audio.mp3'): Promise<File> {
  const buf = await fs.promises.readFile(audioPath)
  if (buf.length < MIN_AUDIO_BYTES) {
    throw new Error(EXTRACT_EMPTY_MSG)
  }
  return toFile(buf, filename)
}

/**
 * If extracted MP3 is too small (unsupported codec), try WAV extraction. Returns path and filename to use; caller must delete cleanupWav if set.
 */
async function ensureAudioForWhisper(
  videoPath: string,
  extractedMp3Path: string
): Promise<{ path: string; filename: string; cleanupWav?: string }> {
  const stat = await fs.promises.stat(extractedMp3Path).catch(() => null)
  if (stat && stat.size >= MIN_AUDIO_BYTES) {
    return { path: extractedMp3Path, filename: path.basename(extractedMp3Path) || 'audio.mp3' }
  }
  const tempDir = path.dirname(videoPath)
  const wavPath = path.join(tempDir, `audio-${Date.now()}.wav`)
  await extractAudioToWav(videoPath, wavPath)
  const wavStat = await fs.promises.stat(wavPath).catch(() => null)
  if (!wavStat || wavStat.size < MIN_AUDIO_BYTES) {
    try {
      fs.unlinkSync(wavPath)
    } catch {
      /* ignore */
    }
    throw new Error(EXTRACT_EMPTY_MSG)
  }
  return { path: wavPath, filename: 'audio.wav', cleanupWav: wavPath }
}

/** Transcribe a single audio chunk with Whisper; return segments with time offset applied. Chunk is converted to WAV so API always gets a supported format. */
async function transcribeChunkVerbose(
  chunkPath: string,
  timeOffsetSec: number,
  language?: string,
  prompt?: string
): Promise<WhisperSegment[]> {
  const tempDir = path.dirname(chunkPath)
  const wavPath = path.join(tempDir, `whisper_${Date.now()}_${path.basename(chunkPath, path.extname(chunkPath))}.wav`)
  try {
    await convertAudioToWav(chunkPath, wavPath)
    const audioFile = await readAudioAsFile(wavPath, 'chunk.wav')
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: language || undefined,
      prompt: prompt?.trim().slice(0, 1500) || undefined,
    }) as { segments?: Array<{ start: number; end: number; text: string }> }
    const segments = (transcription.segments || []).map((s) => ({
      start: Number(s.start) + timeOffsetSec,
      end: Number(s.end) + timeOffsetSec,
      text: typeof s.text === 'string' ? s.text.trim() : '',
    })).filter((s) => s.text)
    return segments
  } finally {
    try {
      if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath)
    } catch {
      /* ignore */
    }
  }
}

const PARTIAL_SEGMENTS_CAP = 2000

function mergeContiguousSegments(
  resultsByIndex: (WhisperSegment[] | undefined)[],
  upToK: number
): WhisperSegment[] {
  const merged: WhisperSegment[] = []
  for (let i = 0; i <= upToK; i++) {
    const segs = resultsByIndex[i]
    if (segs) merged.push(...segs)
  }
  const sorted = merged.sort((a, b) => a.start - b.start)
  const deduped: WhisperSegment[] = []
  for (const s of sorted) {
    const last = deduped[deduped.length - 1]
    if (!last || last.start !== s.start || last.end !== s.end) {
      deduped.push(s)
    }
  }
  return deduped.slice(0, PARTIAL_SEGMENTS_CAP)
}

/** Parallel path: extract audio (or use path as audio when isAlreadyAudio), split into chunks, transcribe in parallel, merge segments. */
async function transcribeVideoParallel(
  videoPath: string,
  language?: string,
  prompt?: string,
  isAlreadyAudio?: boolean,
  onPartial?: (segments: WhisperSegment[]) => void,
  onChunkProgress?: (contiguousChunks: number, totalChunks: number) => void,
  jobId?: string | number
): Promise<{ text: string; segments: WhisperSegment[] }> {
  const tempDir = path.dirname(videoPath)
  const audioPath = isAlreadyAudio ? videoPath : path.join(tempDir, `audio-${Date.now()}.mp3`)
  let chunkPaths: string[] = []
  let extractAudioMs: number | undefined
  let chunkSplitMs: number | undefined
  let extractAndSplitMs: number | undefined
  try {
    const phaseStart = Date.now()
    if (isAlreadyAudio) {
      chunkPaths = await splitAudioIntoChunks(audioPath, CHUNK_DURATION_SEC, tempDir)
      chunkSplitMs = Date.now() - phaseStart
    } else if (PROCESSING_V2) {
      chunkPaths = await extractAndSplitAudio(videoPath, CHUNK_DURATION_SEC, tempDir)
      extractAndSplitMs = Date.now() - phaseStart
    } else {
      await extractAudio(videoPath, audioPath)
      extractAudioMs = Date.now() - phaseStart
      const splitStart = Date.now()
      chunkPaths = await splitAudioIntoChunks(audioPath, CHUNK_DURATION_SEC, tempDir)
      chunkSplitMs = Date.now() - splitStart
    }
    const offsetStep = CHUNK_DURATION_SEC
    const resultsByIndex: (WhisperSegment[] | undefined)[] = new Array(chunkPaths.length)
    let lastContiguousK = -1

    const whisperStartMs = Date.now()
    const limit = pLimit(MAX_WHISPER_CONCURRENCY)

    // TTFW: Prioritize chunk 0 — run it first and emit first partial immediately when it completes.
    // Then run remaining chunks with limit (MAX_WHISPER_CONCURRENCY respected).
    const chunk0Segs = await transcribeChunkVerbose(chunkPaths[0], 0 * offsetStep, language, prompt)
    resultsByIndex[0] = chunk0Segs
    if (onPartial && chunk0Segs.length > 0) {
      lastContiguousK = 0
      onPartial(mergeContiguousSegments(resultsByIndex, 0))
    }
    if (onChunkProgress) onChunkProgress(1, chunkPaths.length)

    // Remaining chunks (1..n-1) with concurrency limit.
    const rest = await Promise.all(
      chunkPaths.slice(1).map((chunkPath, idx) => {
        const i = idx + 1
        return limit(() =>
          transcribeChunkVerbose(chunkPath, i * offsetStep, language, prompt).then((segs) => {
            resultsByIndex[i] = segs
            if (onPartial) {
              let k = 0
              while (k < resultsByIndex.length && resultsByIndex[k] !== undefined) k++
              k--
              if (k >= 0 && k > lastContiguousK) {
                lastContiguousK = k
                const partial = mergeContiguousSegments(resultsByIndex, k)
                if (partial.length > 0) onPartial(partial)
                if (onChunkProgress) onChunkProgress(k + 1, chunkPaths.length)
              }
            }
            return segs
          })
        )
      })
    )
    const results = [chunk0Segs, ...rest]
    const whisperTotalMs = Date.now() - whisperStartMs
    if (jobId != null) {
      transcriptionLog.info({
        msg: 'transcription_timing',
        jobId: String(jobId),
        ...(extractAudioMs != null && { extractAudioMs }),
        ...(chunkSplitMs != null && { chunkSplitMs }),
        ...(extractAndSplitMs != null && { extractAndSplitMs }),
        whisperTotalMs,
      })
    }
    const segments = results.flat().sort((a, b) => a.start - b.start)
    const text = segments.map((s) => s.text).filter(Boolean).join(' ')
    return { text, segments }
  } finally {
    if (!isAlreadyAudio && !PROCESSING_V2) {
      try {
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
      } catch {}
    }
    chunkPaths.forEach((p) => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      } catch {}
    })
  }
}

/**
 * Transcribe video to text using Whisper API.
 * Optional prompt/glossary improves accuracy for proper nouns and domain terms (max ~224 tokens).
 * Long videos (>= PARALLEL_THRESHOLD_SEC) use parallel chunked transcription for speed.
 */
export async function transcribeVideo(
  videoPath: string,
  responseFormat: 'text' | 'srt' | 'vtt' = 'text',
  language?: string,
  prompt?: string,
  isAlreadyAudio?: boolean
): Promise<string> {
  let durationSec = 0
  try {
    durationSec = await getVideoDuration(videoPath)
  } catch {
    // fallback to single-call
  }
  if (durationSec < PARALLEL_THRESHOLD_SEC) {
    const audioPath = isAlreadyAudio ? videoPath : path.join(path.dirname(videoPath), `audio-${Date.now()}.mp3`)
    let cleanupWav: string | undefined
    try {
      if (!isAlreadyAudio) {
        await extractAudio(videoPath, audioPath)
        const ensured = await ensureAudioForWhisper(videoPath, audioPath)
        cleanupWav = ensured.cleanupWav
        const audioFile = await readAudioAsFile(ensured.path, ensured.filename)
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          response_format: responseFormat,
          language: language || undefined,
          prompt: prompt?.trim().slice(0, 1500) || undefined, // Whisper limit ~224 tokens; ~1500 chars safe
        })
        if (!isAlreadyAudio) {
          try { fs.unlinkSync(audioPath) } catch { /* ignore */ }
          if (cleanupWav) try { fs.unlinkSync(cleanupWav) } catch { /* ignore */ }
        }
        return transcription as any
      }
      const name = path.basename(audioPath) && path.extname(audioPath) ? path.basename(audioPath) : 'audio.mp3'
      const audioFile = await readAudioAsFile(audioPath, name)
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: responseFormat,
        language: language || undefined,
        prompt: prompt?.trim().slice(0, 1500) || undefined,
      })
      return transcription as any
    } catch (error) {
      if (!isAlreadyAudio) {
        try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath) } catch { /* ignore */ }
        if (cleanupWav) try { fs.unlinkSync(cleanupWav) } catch { /* ignore */ }
      }
      throw error
    }
  }
  const { text, segments } = await transcribeVideoParallel(videoPath, language, prompt, isAlreadyAudio)
  if (responseFormat === 'text') return text
  const entries: SubtitleEntry[] = segments.map((s, i) => ({
    index: i + 1,
    startTime: s.start,
    endTime: s.end,
    text: s.text,
  }))
  return responseFormat === 'srt' ? toSRT(entries) : toVTT(entries)
}

/**
 * Transcribe with segment-level timestamps (verbose_json). Optional prompt for vocabulary/names.
 * Long videos (>= PARALLEL_THRESHOLD_SEC) use parallel chunked transcription for speed.
 * When onPartial is provided, it is called with chronological segment snapshots (contiguous prefix only).
 */
export async function transcribeVideoVerbose(
  videoPath: string,
  language?: string,
  prompt?: string,
  isAlreadyAudio?: boolean,
  onPartial?: (segments: WhisperSegment[]) => void,
  onChunkProgress?: (contiguousChunks: number, totalChunks: number) => void,
  jobId?: string | number
): Promise<VerboseTranscriptionResult> {
  let durationSec = 0
  try {
    durationSec = await getVideoDuration(videoPath)
  } catch {
    // fallback to single-call
  }
  if (durationSec >= PARALLEL_THRESHOLD_SEC) {
    const { text, segments } = await transcribeVideoParallel(videoPath, language, prompt, isAlreadyAudio, onPartial, onChunkProgress, jobId)
    return { text, segments }
  }
  const tempDir = path.dirname(videoPath)
  const audioPath = isAlreadyAudio ? videoPath : path.join(tempDir, `audio-${Date.now()}.mp3`)
  let cleanupWav: string | undefined
  try {
    let extractAudioMs: number | undefined
    let pathToUse = audioPath
    let filenameToUse = path.basename(audioPath) && path.extname(audioPath) ? path.basename(audioPath) : 'audio.mp3'
    if (!isAlreadyAudio) {
      const t0 = Date.now()
      await extractAudio(videoPath, audioPath)
      extractAudioMs = Date.now() - t0
      const ensured = await ensureAudioForWhisper(videoPath, audioPath)
      pathToUse = ensured.path
      filenameToUse = ensured.filename
      cleanupWav = ensured.cleanupWav
    }
    const whisperStart = Date.now()
    const audioFile = await readAudioAsFile(pathToUse, filenameToUse)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: language || undefined,
      prompt: prompt?.trim().slice(0, 1500) || undefined,
    }) as { text?: string; segments?: Array<{ start: number; end: number; text: string }>; language?: string }
    const whisperTotalMs = Date.now() - whisperStart
    if (jobId != null) {
      transcriptionLog.info({
        msg: 'transcription_timing',
        jobId: String(jobId),
        ...(extractAudioMs != null && { extractAudioMs }),
        whisperTotalMs,
      })
    }
    if (!isAlreadyAudio) {
      try { fs.unlinkSync(audioPath) } catch { /* ignore */ }
      if (cleanupWav) try { fs.unlinkSync(cleanupWav) } catch { /* ignore */ }
    }
    const text = typeof transcription.text === 'string' ? transcription.text : ''
    const segments: WhisperSegment[] = (transcription.segments || []).map((s) => ({
      start: Number(s.start),
      end: Number(s.end),
      text: typeof s.text === 'string' ? s.text.trim() : '',
    })).filter((s) => s.text)
    if (onPartial && segments.length > 0) {
      onPartial(segments.slice(0, PARTIAL_SEGMENTS_CAP))
    }
    if (onChunkProgress) onChunkProgress(1, 1)
    return { text, segments, language: transcription.language }
  } catch (error) {
    if (!isAlreadyAudio) {
      try { if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath) } catch { /* ignore */ }
      if (cleanupWav) try { fs.unlinkSync(cleanupWav) } catch { /* ignore */ }
    }
    throw error
  }
}
