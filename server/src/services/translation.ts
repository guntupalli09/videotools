import 'dotenv/config'
import OpenAI from 'openai'
import type { SubtitleEntry } from '../utils/srtParser'
import { parseSRT, parseVTT, toSRT, toVTT, detectSubtitleFormat } from '../utils/srtParser'
import { transcribeVideo } from './transcription'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set. Translation will fail.')
}

const LANGUAGE_CODES: Record<string, string> = {
  'arabic': 'ar',
  'hindi': 'hi',
}

const LANGUAGE_NAMES_BY_CODE: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ar: 'Arabic',
  hi: 'Hindi',
  te: 'Telugu',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  it: 'Italian',
  ru: 'Russian',
}

/** Supported display names for transcript translation (frontend sends these). */
export const TRANSCRIPT_TRANSLATION_LANGUAGES = ['English', 'Hindi', 'Telugu', 'Spanish', 'Chinese', 'Russian'] as const

/**
 * Translate subtitle entries
 */
export async function translateSubtitles(
  entries: SubtitleEntry[],
  targetLanguage: string
): Promise<SubtitleEntry[]> {
  // Translate in batches to avoid token limits and improve reliability
  const BATCH_SIZE = 20
  const translatedEntries: SubtitleEntry[] = []
  
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    
    // Create a numbered list for translation
    const numberedText = batch.map((entry, idx) => {
      const num = i + idx + 1
      return `${num}. ${entry.text.replace(/\n/g, ' ')}`
    }).join('\n')
    
    // Translate the batch
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Translate the following ${batch.length} subtitle lines from English to ${targetLanguage}.

CRITICAL REQUIREMENTS:
- You MUST translate ALL ${batch.length} lines
- Return EXACTLY ${batch.length} lines, no more, no less
- Format: "1. translated text" (one per line)
- Do NOT skip any lines
- Do NOT add explanations, comments, or extra text
- Preserve the meaning and natural flow

Text to translate:
${numberedText}

Return ALL ${batch.length} translations in numbered format (1. through ${batch.length}.):`
      }],
      temperature: 0.3,
      max_tokens: 2000, // Ensure enough tokens for all translations
    })
    
    let translatedText = response.choices[0]?.message?.content || ''
    
    // Clean up the response - remove any markdown code blocks or extra formatting
    translatedText = translatedText.replace(/```[\s\S]*?```/g, '') // Remove code blocks
    translatedText = translatedText.replace(/^Translation:?\s*/i, '') // Remove "Translation:" prefix
    translatedText = translatedText.trim()
    
    // Parse the translated lines - be more flexible with format
    const allLines = translatedText.split('\n').filter(line => line.trim().length > 0)
    const translatedLines: string[] = []
    
    for (const line of allLines) {
      // Try multiple patterns to extract the translated text
      let extracted = ''
      
      // Pattern 1: "12. translated text"
      const match1 = line.match(/^\d+\.\s*(.+)$/)
      if (match1) {
        extracted = match1[1].trim()
      } else {
        // Pattern 2: "12) translated text" or "12 - translated text"
        const match2 = line.match(/^\d+[\)\-]\s*(.+)$/)
        if (match2) {
          extracted = match2[1].trim()
        } else {
          // Pattern 3: Just the text (if AI didn't include numbers)
          extracted = line.trim()
        }
      }
      
      if (extracted.length > 0) {
        translatedLines.push(extracted)
      }
    }
    
    // If we got fewer translations than expected, log a warning
    if (translatedLines.length < batch.length) {
      console.warn(`Warning: Expected ${batch.length} translations, got ${translatedLines.length}`)
    }
    
    // Map translated lines back to entries, preserving original line breaks
    batch.forEach((entry, idx) => {
      // Try to find the translation - first by index, then by matching content structure
      let translated = translatedLines[idx]
      
      // If we don't have enough translations, try to find by position or use original
      if (!translated && idx < translatedLines.length) {
        translated = translatedLines[idx]
      }
      
      // Fallback to original if no translation found
      if (!translated || translated.length === 0) {
        console.warn(`No translation found for entry ${i + idx + 1}, using original text`)
        translated = entry.text
      }
      // Restore original line breaks if the original had them
      const originalLines = entry.text.split('\n')
      const translatedWords = translated.split(' ')
      
      // If original had line breaks, try to preserve them in translation
      let finalText = translated
      if (originalLines.length > 1 && translatedWords.length > 10) {
        // Simple heuristic: if original was split, try to split translation similarly
        const midPoint = Math.floor(translatedWords.length / 2)
        // Find a good break point (after punctuation or at word boundary)
        for (let j = midPoint; j < translatedWords.length && j < midPoint + 5; j++) {
          if (translatedWords[j].match(/[.,!?]/)) {
            finalText = translatedWords.slice(0, j + 1).join(' ') + '\n' + translatedWords.slice(j + 1).join(' ')
            break
          }
        }
      }
      
      translatedEntries.push({
        ...entry,
        text: finalText,
      })
    })
  }
  
  return translatedEntries
}

/**
 * Translate plain transcript text to a target language.
 * Splits by paragraphs and translates in batches to stay within token limits.
 */
export async function translateTranscriptText(
  text: string,
  targetLanguage: string
): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const paragraphs = trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  if (paragraphs.length === 0) return trimmed

  const BATCH_SIZE = 15
  const translatedParts: string[] = []

  for (let i = 0; i < paragraphs.length; i += BATCH_SIZE) {
    const batch = paragraphs.slice(i, i + BATCH_SIZE)
    const block = batch.join('\n\n')

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Translate the following transcript text to ${targetLanguage}.

CRITICAL:
- Preserve paragraph breaks (each paragraph separated by a blank line).
- Translate naturally; keep the same structure and number of paragraphs.
- Do not add explanations, titles, or extra text. Output only the translated transcript.

Transcript to translate:
${block}`,
      }],
      temperature: 0.3,
      max_tokens: 4000,
    })

    let out = response.choices[0]?.message?.content?.trim() ?? ''
    out = out.replace(/```[\s\S]*?```/g, '').replace(/^Translation:?\s*/i, '').trim()
    translatedParts.push(out || block)
  }

  return translatedParts.join('\n\n')
}

/** Phase 1B — UTILITY 3A: Language consistency. Detect mixed-language or untranslated lines. */
export interface LanguageConsistencyIssue {
  line: number
  issueType: 'mixed_language' | 'untranslated'
}

const ARABIC_SCRIPT = /\p{Script=Arabic}/u
const DEVANAGARI_SCRIPT = /\p{Script=Devanagari}/u
const LATIN_SCRIPT = /\p{Script=Latin}/u

function countScriptRanges(text: string): { arabic: number; devanagari: number; latin: number } {
  let arabic = 0, devanagari = 0, latin = 0
  for (const ch of text) {
    if (ARABIC_SCRIPT.test(ch)) arabic++
    else if (DEVANAGARI_SCRIPT.test(ch)) devanagari++
    else if (LATIN_SCRIPT.test(ch)) latin++
  }
  return { arabic, devanagari, latin }
}

export function detectLanguageConsistency(
  translatedEntries: SubtitleEntry[],
  targetLanguage: string
): { issues: LanguageConsistencyIssue[] } {
  const issues: LanguageConsistencyIssue[] = []
  const target = targetLanguage.toLowerCase()
  const expectArabic = target === 'arabic' || target === 'ar'
  const expectHindi = target === 'hindi' || target === 'hi'

  for (const entry of translatedEntries) {
    const text = entry.text.trim()
    if (!text) continue
    const counts = countScriptRanges(text)
    const total = counts.arabic + counts.devanagari + counts.latin
    if (total === 0) continue

    if (expectArabic) {
      if (counts.latin > total * 0.7) {
        issues.push({ line: entry.index, issueType: 'untranslated' })
      } else if (counts.arabic > 0 && counts.latin > total * 0.3) {
        issues.push({ line: entry.index, issueType: 'mixed_language' })
      }
    } else if (expectHindi) {
      if (counts.latin > total * 0.7) {
        issues.push({ line: entry.index, issueType: 'untranslated' })
      } else if (counts.devanagari > 0 && counts.latin > total * 0.3) {
        issues.push({ line: entry.index, issueType: 'mixed_language' })
      }
    }
  }

  return { issues }
}

/**
 * Translate subtitle file
 */
export async function translateSubtitleFile(
  filePath: string,
  targetLanguage: string
): Promise<{ content: string; format: 'srt' | 'vtt' }> {
  const format = detectSubtitleFormat(filePath)
  
  // Parse subtitle file
  const entries = format === 'srt' 
    ? parseSRT(filePath)
    : parseVTT(filePath)
  
  // Translate
  const translatedEntries = await translateSubtitles(entries, targetLanguage)
  
  // Convert back to format
  const content = format === 'srt'
    ? toSRT(translatedEntries)
    : toVTT(translatedEntries)
  
  return { content, format }
}

/**
 * Generate subtitles in multiple languages from a single video upload.
 * Returns a map: { [langCode]: subtitleContent }
 */
export async function generateMultiLanguageSubtitlesFromVideo(
  videoPath: string,
  primaryLanguageCode: string,
  additionalLanguageCodes: string[]
): Promise<Record<string, string>> {
  // 1) Primary transcription (always SRT internally)
  const primarySrt = await transcribeVideo(videoPath, 'srt', primaryLanguageCode)

  // Parse primary SRT for translation
  const tempDir = path.dirname(videoPath)
  const tempPrimary = path.join(tempDir, `primary-${Date.now()}.srt`)
  fs.writeFileSync(tempPrimary, primarySrt)

  const primaryEntries = parseSRT(tempPrimary)

  const out: Record<string, string> = {
    [primaryLanguageCode]: primarySrt,
  }

  for (const code of additionalLanguageCodes) {
    const languageName = LANGUAGE_NAMES_BY_CODE[code] || code
    const translatedEntries = await translateSubtitles(primaryEntries, languageName)
    out[code] = toSRT(translatedEntries)
  }

  try {
    fs.unlinkSync(tempPrimary)
  } catch {
    // ignore
  }

  return out
}
