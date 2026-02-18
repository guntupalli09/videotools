import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { translateTranscriptText, TRANSCRIPT_TRANSLATION_LANGUAGES } from '../services/translation'
import { getAuthFromRequest, getEffectiveUserId } from '../utils/auth'

const router = express.Router()

const ALLOWED_LANGUAGES = new Set(TRANSCRIPT_TRANSLATION_LANGUAGES)

const translateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many translation requests. Please wait a minute.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getEffectiveUserId(req) || (req.ip ?? 'anonymous'),
})

router.post('/', translateLimiter, async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    const apiKeyUser = (req as any).apiKeyUser
    if (!auth?.userId && !apiKeyUser?.userId) {
      return res.status(401).json({ message: 'Authentication required. Use Authorization: Bearer <token> or a valid API key.' })
    }

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
