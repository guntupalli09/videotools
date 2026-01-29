import 'dotenv/config'
import OpenAI from 'openai'
import { SubtitleEntry, parseSRT, parseVTT, toSRT, toVTT, detectSubtitleFormat } from '../utils/srtParser'
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
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese Simplified',
  it: 'Italian',
  ru: 'Russian',
}

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
