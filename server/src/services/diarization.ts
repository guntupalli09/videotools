import fs from 'fs'
import path from 'path'
import { extractAudio } from './ffmpeg'

/**
 * Optional speaker diarization via Replicate (thomasmol/whisper-diarization).
 * Set REPLICATE_API_TOKEN to enable. Returns segments with speaker labels or null on skip/failure.
 * Get the latest version from https://replicate.com/thomasmol/whisper-diarization/versions and set
 * REPLICATE_WHISPER_DIARIZATION_VERSION in env, or leave unset to use the default below.
 */
const REPLICATE_VERSION = process.env.REPLICATE_WHISPER_DIARIZATION_VERSION || 'e22ed589e8d2d2a2a9a9e8f8e8d8c8b8a898786'
export interface DiarizedSegment {
  start: number
  end: number
  text: string
  speaker?: string
}

export async function transcribeWithDiarization(
  videoPath: string,
  _language?: string
): Promise<{ text: string; segments: DiarizedSegment[] } | null> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token?.trim()) return null

  const tempDir = path.dirname(videoPath)
  const audioPath = path.join(tempDir, `audio-diar-${Date.now()}.mp3`)
  try {
    await extractAudio(videoPath, audioPath)
    const audioBuf = fs.readFileSync(audioPath)
    const base64 = audioBuf.toString('base64')

    // Replicate: create prediction with file (base64 data URI or upload URL)
    const input: Record<string, unknown> = {}
    if (base64.length < 25_000_000) {
      input.audio = `data:audio/mpeg;base64,${base64}`
    }
    if (Object.keys(input).length === 0) {
      try {
        fs.unlinkSync(audioPath)
      } catch {
        // ignore
      }
      return null
    }

    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: REPLICATE_VERSION,
        input,
      }),
      signal: AbortSignal.timeout(10000),
    })
    try {
      fs.unlinkSync(audioPath)
    } catch {
      // ignore
    }
    if (!createRes.ok) return null
    const pred = (await createRes.json()) as { id?: string; urls?: { get: string } }
    const getUrl = pred.urls?.get
    if (!getUrl) return null

    for (let i = 0; i < 180; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      const statusRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } })
      const status = (await statusRes.json()) as { status: string; output?: { segments?: Array<{ start: number; end: number; text: string; speaker?: string }>; text?: string } }
      if (status.status === 'succeeded' && status.output?.segments) {
        const segs = status.output.segments.map((s) => ({
          start: Number(s.start),
          end: Number(s.end),
          text: String(s.text),
          speaker: typeof s.speaker === 'string' ? s.speaker : undefined,
        }))
        const text = typeof status.output.text === 'string' ? status.output.text : segs.map((s) => s.text).join(' ')
        return { text, segments: segs }
      }
      if (status.status === 'failed' || status.status === 'canceled') break
    }
    return null
  } catch (err: any) {
    console.warn('[diarization]', err?.message || err)
    try {
      if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
    } catch {
      // ignore
    }
    return null
  }
}
