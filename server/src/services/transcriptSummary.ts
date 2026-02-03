import 'dotenv/config'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface SummaryResult {
  summary: string
  bullets: string[]
  actionItems?: string[]
}

export interface ChapterResult {
  title: string
  startTime: number
  endTime?: number
}

/**
 * Generate AI summary (paragraph + bullets, optional action items) from transcript text.
 */
export async function generateSummary(
  transcriptText: string,
  options?: { includeActionItems?: boolean }
): Promise<SummaryResult> {
  if (!transcriptText?.trim()) {
    return { summary: '', bullets: [], actionItems: options?.includeActionItems ? [] : undefined }
  }
  const truncated = transcriptText.length > 28000 ? transcriptText.slice(0, 28000) + '\n[...truncated]' : transcriptText
  const sys = `You are a concise assistant. Given a transcript, output valid JSON only, no markdown. Keys: "summary" (2-4 sentence paragraph), "bullets" (array of 3-7 key points), and optionally "actionItems" (array of action items or decisions, if present in the transcript).`
  const user = `Transcript:\n${truncated}\n\nOutput JSON with keys: summary, bullets${options?.includeActionItems ? ', actionItems' : ''}.`
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })
  const raw = completion.choices[0]?.message?.content
  if (!raw) return { summary: '', bullets: [], actionItems: options?.includeActionItems ? [] : undefined }
  try {
    const parsed = JSON.parse(raw) as { summary?: string; bullets?: string[]; actionItems?: string[] }
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
      actionItems: options?.includeActionItems && Array.isArray(parsed.actionItems) ? parsed.actionItems : undefined,
    }
  } catch {
    return { summary: '', bullets: [], actionItems: options?.includeActionItems ? [] : undefined }
  }
}

/**
 * Generate chapters (title + startTime) from segments. Uses segment boundaries.
 */
export async function generateChapters(segments: TranscriptSegment[]): Promise<ChapterResult[]> {
  if (!segments?.length) return []
  const truncated = segments.slice(0, 200).map((s, i) => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n')
  if (truncated.length > 24000) {
    const fewer = segments.filter((_, i) => i % 2 === 0).slice(0, 100)
    const str = fewer.map((s) => `[${s.start.toFixed(1)}s] ${s.text}`).join('\n')
    return generateChaptersFromText(str)
  }
  return generateChaptersFromText(truncated)
}

async function generateChaptersFromText(segmentText: string): Promise<ChapterResult[]> {
  const sys = `You are an assistant. Given lines like "[12.5s] Some text", suggest 3-10 chapter markers. Output valid JSON only with a single key "chapters": an array of objects, each with "title" (string) and "startTime" (number, seconds). Use only start times that appear in the input (round to 1 decimal).`
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: segmentText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })
  const raw = completion.choices[0]?.message?.content
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as { chapters?: unknown[] }
    const arr = Array.isArray(parsed.chapters) ? parsed.chapters : []
    return arr
      .filter((c: any) => c && typeof c.title === 'string' && typeof c.startTime === 'number')
      .map((c: any) => ({ title: c.title, startTime: Number(c.startTime), endTime: undefined }))
  } catch {
    return []
  }
}
