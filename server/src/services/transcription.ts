import 'dotenv/config'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { extractAudio } from './ffmpeg'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set. Transcription will fail.')
}

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

/**
 * Transcribe video to text using Whisper API.
 * Optional prompt/glossary improves accuracy for proper nouns and domain terms (max ~224 tokens).
 */
export async function transcribeVideo(
  videoPath: string,
  responseFormat: 'text' | 'srt' | 'vtt' = 'text',
  language?: string,
  prompt?: string
): Promise<string> {
  const tempDir = path.dirname(videoPath)
  const audioPath = path.join(tempDir, `audio-${Date.now()}.mp3`)
  try {
    await extractAudio(videoPath, audioPath)
    const audioFile = fs.createReadStream(audioPath)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile as any,
      model: 'whisper-1',
      response_format: responseFormat,
      language: language || undefined,
      prompt: prompt?.trim().slice(0, 1500) || undefined, // Whisper limit ~224 tokens; ~1500 chars safe
    })
    
    // Cleanup audio file
    try {
      fs.unlinkSync(audioPath)
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return transcription as any
  } catch (error) {
    // Cleanup audio file on error
    try {
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath)
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    throw error
  }
}

/**
 * Transcribe with segment-level timestamps (verbose_json). Optional prompt for vocabulary/names.
 */
export async function transcribeVideoVerbose(
  videoPath: string,
  language?: string,
  prompt?: string
): Promise<VerboseTranscriptionResult> {
  const tempDir = path.dirname(videoPath)
  const audioPath = path.join(tempDir, `audio-${Date.now()}.mp3`)
  try {
    await extractAudio(videoPath, audioPath)
    const audioFile = fs.createReadStream(audioPath)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile as any,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: language || undefined,
      prompt: prompt?.trim().slice(0, 1500) || undefined,
    }) as { text?: string; segments?: Array<{ start: number; end: number; text: string }>; language?: string }
    try {
      fs.unlinkSync(audioPath)
    } catch (e) {
      // ignore
    }
    const text = typeof transcription.text === 'string' ? transcription.text : ''
    const segments: WhisperSegment[] = (transcription.segments || []).map((s) => ({
      start: Number(s.start),
      end: Number(s.end),
      text: typeof s.text === 'string' ? s.text.trim() : '',
    })).filter((s) => s.text)
    return { text, segments, language: transcription.language }
  } catch (error) {
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
    } catch (e) {
      // ignore
    }
    throw error
  }
}
