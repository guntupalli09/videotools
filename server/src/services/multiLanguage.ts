import fs from 'fs'
import path from 'path'
import { transcribeVideo } from './transcription'
import { translateSubtitles } from './translation'
import { parseSRT, toSRT } from '../utils/srtParser'

const LANGUAGE_NAMES: Record<string, string> = {
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

export async function generateMultiLanguageSubtitles(
  videoPath: string,
  primaryLanguage: string,
  additionalLanguages: string[],
  _format: 'srt' | 'vtt' = 'srt'
): Promise<Record<string, string>> {
  // Phase 1.5: generate SRT primary, then translate the parsed entries to each language, output SRTs.
  const primarySrt = await transcribeVideo(videoPath, 'srt', primaryLanguage)

  const tempDir = path.dirname(videoPath)
  const tempPrimaryPath = path.join(tempDir, `primary-${Date.now()}.srt`)
  fs.writeFileSync(tempPrimaryPath, primarySrt)

  const primaryEntries = parseSRT(tempPrimaryPath)
  const results: Record<string, string> = {
    [primaryLanguage]: primarySrt,
  }

  const translated = await Promise.all(
    additionalLanguages.map(async (langCode) => {
      const langName = LANGUAGE_NAMES[langCode] || langCode
      const entries = await translateSubtitles(primaryEntries, langName)
      return { langCode, srt: toSRT(entries) }
    })
  )
  translated.forEach(({ langCode, srt }) => {
    results[langCode] = srt
  })

  try {
    fs.unlinkSync(tempPrimaryPath)
  } catch {
    // ignore
  }

  return results
}

