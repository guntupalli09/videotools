import express, { Request, Response } from 'express'
import { getEffectiveUserId } from '../utils/auth'
import { prisma } from '../db'
import { insertJobRecord } from '../lib/jobAnalytics'
import { pushLogEntry } from '../lib/logRing'
import multer from 'multer'
import { PDFParse, VerbosityLevel } from 'pdf-parse'
import mammoth from 'mammoth'
import { extractRulesFromGuideText } from '../services/guidelineRuleExtractor'
import { runGuidelineFormatIntake } from '../services/guidelineIntake'

const router = express.Router()

const guideUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB is enough for most style guides
})

router.post('/format', async (req: Request, res: Response) => {
  // Core validation/plan-gating/enqueue logic lives in services/guidelineIntake.ts
  // (runGuidelineFormatIntake) so the external POST /api/v1/guideline-formats
  // route reuses exactly this pipeline instead of a second implementation.
  const result = await runGuidelineFormatIntake(req, { source: 'web' })
  if (!result.ok) {
    return res.status(result.httpStatus).json({ error: result.message })
  }
  return res.status(200).json({ jobId: result.jobId, jobToken: result.jobToken })
})

router.post('/parse-guide', guideUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ error: 'Missing file' })
    }

    const name = (file.originalname || '').toLowerCase()
    let text = ''

    if (name.endsWith('.txt') || file.mimetype.startsWith('text/')) {
      text = file.buffer.toString('utf-8')
    } else if (name.endsWith('.pdf') || file.mimetype === 'application/pdf') {
      const parser = new PDFParse({ data: file.buffer, verbosity: VerbosityLevel.ERRORS })
      const tr = await parser.getText()
      text = typeof tr === 'string' ? tr : (tr as { text?: string }).text || ''
    } else if (
      name.endsWith('.docx') ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer: file.buffer })
      text = result.value || ''
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Upload PDF, DOCX, or TXT.' })
    }

    const cleaned = text.replace(/\u0000/g, '').trim()
    if (!cleaned) {
      return res.status(400).json({ error: 'Could not extract any text from this file.' })
    }

    const extracted = await extractRulesFromGuideText(cleaned)
    if (!extracted.rules.length) {
      return res.status(400).json({ error: 'Could not extract rules from this guide. Try a different file or use a preset.' })
    }

    pushLogEntry({
      ts: new Date().toISOString(),
      level: 'info',
      service: 'api',
      msg: 'guideline_custom_guide_parsed',
      module: 'guidelines',
    })

    return res.status(200).json(extracted)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return res.status(500).json({ error: msg })
  }
})

router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    const clientJobToken =
      typeof req.query.jobToken === 'string'
        ? req.query.jobToken.trim()
        : typeof req.headers['x-job-token'] === 'string'
          ? req.headers['x-job-token'].trim()
          : ''

    const jobId = typeof req.params.jobId === 'string' ? req.params.jobId.trim() : ''
    if (!jobId) {
      return res.status(400).json({ error: 'Invalid job id' })
    }

    const row = await prisma.formattingJob.findFirst({
      where: { id: jobId },
    })

    if (!row) {
      return res.status(404).json({ error: 'Job not found' })
    }

    const allowedByUser = Boolean(userId && row.userId === userId)
    const allowedByToken = Boolean(clientJobToken && row.jobToken && clientJobToken === row.jobToken)
    if (!allowedByUser && !allowedByToken) {
      return res.status(403).json({ error: 'Access denied. Provide Authorization or jobToken.' })
    }

    const canRevealResult = allowedByUser && !row.userId.startsWith('guest_')

    return res.status(200).json({
      status: row.status,
      stage: row.stage,
      requiresAuth: row.status === 'completed' && !canRevealResult,
      outputText: canRevealResult ? row.outputText : null,
      diffData: canRevealResult ? row.diffData : null,
      flaggedSegments: canRevealResult ? row.flaggedSegments : null,
      appliedRules: canRevealResult ? row.appliedRules : null,
      validationReport: canRevealResult ? row.validationReport : null,
      createdAt: row.createdAt.toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return res.status(500).json({ error: msg })
  }
})


router.post('/jobs/:jobId/claim', async (req: Request, res: Response) => {
  try {
    const userId = getEffectiveUserId(req)
    if (!userId || userId.startsWith('guest_')) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const jobId = typeof req.params.jobId === 'string' ? req.params.jobId.trim() : ''
    const clientJobToken =
      typeof req.body?.jobToken === 'string'
        ? req.body.jobToken.trim()
        : typeof req.headers['x-job-token'] === 'string'
          ? req.headers['x-job-token'].trim()
          : ''

    if (!jobId || !clientJobToken) {
      return res.status(400).json({ error: 'jobId and jobToken are required' })
    }

    const row = await prisma.formattingJob.findFirst({ where: { id: jobId } })
    if (!row) {
      return res.status(404).json({ error: 'Job not found' })
    }
    if (!row.jobToken || row.jobToken !== clientJobToken) {
      return res.status(403).json({ error: 'Invalid job token' })
    }
    if (!row.userId.startsWith('guest_') && row.userId !== userId) {
      return res.status(409).json({ error: 'Job already claimed' })
    }

    if (row.userId !== userId) {
      await prisma.formattingJob.update({ where: { id: jobId }, data: { userId } })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error'
    return res.status(500).json({ error: msg })
  }
})

export default router
