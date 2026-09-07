import express, { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { getEffectivePlan } from '../utils/subscriptionGuard'
import { getEffectiveUserId } from '../utils/auth'
import { findJobByResultFilename } from '../lib/jobAnalytics'
import { getBatchById } from '../models/BatchJob'
import { getLogger } from '../lib/logger'
import { applyWatermark, TEXT_EXTENSIONS } from '../utils/watermark'

const log = getLogger('api')
const router = express.Router()

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

/** Per-video batch zip, written by workers/videoProcessor.ts generateBatchZip() as `batch-<batchId>.zip`. */
export const BATCH_ZIP_PATTERN = /^batch-(.+)\.zip$/

/**
 * Ownership check for a requested output filename.
 *
 * Every job (including guest jobs) gets a persisted Job row with a userId
 * and jobToken (see lib/jobAnalytics.ts insertJobRecord), and every job's
 * primary output filename is recorded on that row on completion
 * (updateJobCompleted). This lets a plain filename be mapped back to its
 * owning job/user without needing Bull, matching the same ownership model
 * `GET /api/job/:jobId` already uses.
 *
 * Authenticated requests are strictly ownership-bound. A job token cannot
 * override authenticated user ownership.
 *
 * Anonymous/guest requests may access an output only with the matching
 * jobToken, preserving the existing guest-download workflow.
 *
 * A filename with no matching Job or BatchJobRecord (e.g. output from
 * before this authorization model existed) is treated as not found rather
 * than served — see docs/API_PRIVATE_BETA.md for the rollout note.
 */
async function authorizeDownload(
  req: Request,
  filename: string
): Promise<{ allowed: true } | { allowed: false; status: 404 | 401 | 403; message: string }> {
  const requestingUserId = getEffectiveUserId(req)
  const clientJobToken = (req.query.jobToken as string | undefined)?.trim() || (req.headers['x-job-token'] as string | undefined)?.trim()

  const batchMatch = filename.match(BATCH_ZIP_PATTERN)
  if (batchMatch) {
    const batch = await getBatchById(batchMatch[1])
    if (!batch) return { allowed: false, status: 404, message: 'File not found' }
    if (!requestingUserId) return { allowed: false, status: 401, message: 'Authentication required.' }
    if (requestingUserId !== batch.userId) return { allowed: false, status: 403, message: 'Access denied' }
    return { allowed: true }
  }

  const job = await findJobByResultFilename(filename)
  if (!job) return { allowed: false, status: 404, message: 'File not found' }

  // Authenticated requests are always ownership-bound.
  // A job token must never let one authenticated user access another user's file.
  if (requestingUserId) {
    if (requestingUserId !== job.userId) {
      // Hide whether another user's file/job exists.
      return { allowed: false, status: 404, message: 'File not found' }
    }

    return { allowed: true }
  }

  // Preserve existing anonymous/guest download behavior.
  // Anonymous callers must possess the exact job token.
  const allowedByToken =
    !!clientJobToken &&
    !!job.jobToken &&
    clientJobToken === job.jobToken

  if (!allowedByToken) {
    return {
      allowed: false,
      status: clientJobToken ? 403 : 401,
      message: clientJobToken ? 'Access denied' : 'Authentication required.',
    }
  }

  return { allowed: true }
}

router.get('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params
    const filePath = path.join(tempDir, filename)

    // Security: prevent directory traversal
    const resolvedPath = path.resolve(filePath)
    const resolvedDir = path.resolve(tempDir)

    if (!resolvedPath.startsWith(resolvedDir)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' })
    }

    const authz = await authorizeDownload(req, filename)
    if (!authz.allowed) {
      return res.status(authz.status).json({ message: authz.message })
    }

    // Safe filename for Content-Disposition: no CR/LF/control chars, escape quotes
    const safeForHeader = filename.replace(/[\0\r\n]/g, '').replace(/"/g, '\\"')
    const asciiSafe = safeForHeader.replace(/[^\x20-\x7E]/g, '_')

    const ext = path.extname(filename).toLowerCase()

    // Free plan: always watermark text exports (SRT/VTT/TXT/JSON/CSV). Paid: clean file.
    if (TEXT_EXTENSIONS.has(ext)) {
      const { plan } = await getEffectivePlan(req)
      if (plan === 'free') {
        const content = fs.readFileSync(filePath, 'utf-8')
        const watermarked = applyWatermark(content, ext)
        res.setHeader('Content-Disposition', `attachment; filename="${asciiSafe}"`)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        return res.send(watermarked)
      }
    }

    // Paid plan or non-text file: stream directly with optional Range support
    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const rangeHeader = req.headers.range

    if (rangeHeader) {
      const [unit, rangeStr] = rangeHeader.split('=')
      const [startStr, endStr] = (rangeStr || '').split('-')
      const start = parseInt(startStr, 10) || 0
      const end = endStr ? Math.min(parseInt(endStr, 10), fileSize - 1) : fileSize - 1
      const chunkSize = end - start + 1
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Disposition': `attachment; filename="${asciiSafe}"`,
        'Content-Type': unit === 'bytes' ? 'application/octet-stream' : 'application/octet-stream',
      })
      fs.createReadStream(filePath, { start, end }).pipe(res)
      return
    }

    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Length', fileSize)
    res.setHeader('Content-Disposition', `attachment; filename="${asciiSafe}"`)
    res.setHeader('Content-Type', 'application/octet-stream')
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (error: any) {
    log.error({ msg: 'Download error', error: String(error) })
    res.status(500).json({ message: error.message || 'Download failed' })
  }
})

export default router
