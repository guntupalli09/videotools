import 'dotenv/config'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { extractAudio, getVideoDuration, splitAudioIntoChunks } from './ffmpeg'
import { toSRT, toVTT } from '../utils/srtParser'
import type { SubtitleEntry } from '../utils/srtParser'

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

/** Transcribe a single audio chunk with Whisper; return segments with time offset applied. */
async function transcribeChunkVerbose(
  chunkPath: string,
  timeOffsetSec: number,
  language?: string,
  prompt?: string
): Promise<WhisperSegment[]> {
  const audioFile = fs.createReadStream(chunkPath)
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile as any,
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
  onPartial?: (segments: WhisperSegment[]) => void
): Promise<{ text: string; segments: WhisperSegment[] }> {
  const tempDir = path.dirname(videoPath)
  const audioPath = isAlreadyAudio ? videoPath : path.join(tempDir, `audio-${Date.now()}.mp3`)
  let chunkPaths: string[] = []
  try {
    if (!isAlreadyAudio) {
      await extractAudio(videoPath, audioPath)
    }
    chunkPaths = await splitAudioIntoChunks(audioPath, CHUNK_DURATION_SEC, tempDir)
    const offsetStep = CHUNK_DURATION_SEC
    const resultsByIndex: (WhisperSegment[] | undefined)[] = new Array(chunkPaths.length)
    let lastContiguousK = -1

    // Contiguous prefix is strictly INDEX-based (chunk index 0..k), not start-time based.
    // If chunk 0 fails, resultsByIndex[0] is never set; when chunk 1 completes, k = -1 so we
    // do not write partial. That avoids showing out-of-order segments (e.g. later video before earlier).
    const results = await Promise.all(
      chunkPaths.map((chunkPath, i) =>
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
            }
          }
          return segs
        })
      )
    )
    const segments = results.flat().sort((a, b) => a.start - b.start)
    const text = segments.map((s) => s.text).filter(Boolean).join(' ')
    return { text, segments }
  } finally {
    if (!isAlreadyAudio) {
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
    try {
      if (!isAlreadyAudio) {
        await extractAudio(videoPath, audioPath)
      }
      const audioFile = fs.createReadStream(audioPath)
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile as any,
        model: 'whisper-1',
        response_format: responseFormat,
        language: language || undefined,
        prompt: prompt?.trim().slice(0, 1500) || undefined, // Whisper limit ~224 tokens; ~1500 chars safe
      })
      if (!isAlreadyAudio) {
        try {
          fs.unlinkSync(audioPath)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      return transcription as any
    } catch (error) {
      if (!isAlreadyAudio) {
        try {
          if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
        } catch (e) {
          // Ignore cleanup errors
        }
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
  onPartial?: (segments: WhisperSegment[]) => void
): Promise<VerboseTranscriptionResult> {
  let durationSec = 0
  try {
    durationSec = await getVideoDuration(videoPath)
  } catch {
    // fallback to single-call
  }
  if (durationSec >= PARALLEL_THRESHOLD_SEC) {
    const { text, segments } = await transcribeVideoParallel(videoPath, language, prompt, isAlreadyAudio, onPartial)
    return { text, segments }
  }
  const tempDir = path.dirname(videoPath)
  const audioPath = isAlreadyAudio ? videoPath : path.join(tempDir, `audio-${Date.now()}.mp3`)
  try {
    if (!isAlreadyAudio) {
      await extractAudio(videoPath, audioPath)
    }
    const audioFile = fs.createReadStream(audioPath)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile as any,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: language || undefined,
      prompt: prompt?.trim().slice(0, 1500) || undefined,
    }) as { text?: string; segments?: Array<{ start: number; end: number; text: string }>; language?: string }
    if (!isAlreadyAudio) {
      try {
        fs.unlinkSync(audioPath)
      } catch (e) {
        // ignore
      }
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
    return { text, segments, language: transcription.language }
  } catch (error) {
    if (!isAlreadyAudio) {
      try {
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
      } catch (e) {
        // ignore
      }
    }
    throw error
  }
}
