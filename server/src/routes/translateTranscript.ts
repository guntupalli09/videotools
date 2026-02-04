import express, { Request, Response } from 'express'
import { translateTranscriptText, TRANSCRIPT_TRANSLATION_LANGUAGES } from '../services/translation'

const router = express.Router()

const ALLOWED_LANGUAGES = new Set(TRANSCRIPT_TRANSLATION_LANGUAGES)

router.post('/', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage } = req.body as { text?: string; targetLanguage?: string }
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ message: 'Missing or invalid text' })
    }
    if (typeof targetLanguage !== 'string' || !targetLanguage.trim()) {
      return res.status(400).json({ message: 'Missing or invalid targetLanguage' })
    }
    const lang = targetLanguage.trim()
    if (!ALLOWED_LANGUAGES.has(lang as (typeof TRANSCRIPT_TRANSLATION_LANGUAGES)[number])) {
      return res.status(400).json({
        message: `Unsupported language. Use one of: ${TRANSCRIPT_TRANSLATION_LANGUAGES.join(', ')}`,
      })
    }
    const translated = await translateTranscriptText(text, lang)
    return res.json({ translatedText: translated })
  } catch (err) {
    console.error('translate-transcript error:', err)
    return res.status(500).json({ message: 'Translation failed. Please try again.' })
  }
})

export default router
