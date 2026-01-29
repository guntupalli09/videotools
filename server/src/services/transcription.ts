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

/**
 * Transcribe video to text using Whisper API
 */
export async function transcribeVideo(
  videoPath: string,
  responseFormat: 'text' | 'srt' | 'vtt' = 'text',
  language?: string
): Promise<string> {
  // Extract audio first
  const tempDir = path.dirname(videoPath)
  const audioPath = path.join(tempDir, `audio-${Date.now()}.mp3`)
  
  try {
    await extractAudio(videoPath, audioPath)
    
    // Create file stream for OpenAI
    const audioFile = fs.createReadStream(audioPath)
    
    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile as any,
      model: 'whisper-1',
      response_format: responseFormat,
      language: language || undefined, // auto-detect if not specified
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
