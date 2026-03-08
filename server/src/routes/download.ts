import express, { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { getAuthFromRequest } from '../utils/auth'

const router = express.Router()

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

const WATERMARK_LINE = 'Subtitles by VideoText.io (Free Plan) · videotext.io'
const WATERMARK_FOOTER = '\n\n---\nExported from VideoText (Free Plan) · videotext.io\n'
const TEXT_EXTENSIONS = new Set(['.srt', '.vtt', '.txt', '.json', '.csv'])

/**
 * Apply a format-aware watermark to text file content.
 * - SRT: inject a subtitle cue at 00:00:00,500 so it appears at video start
 * - VTT: inject a cue right after the WEBVTT header
 * - TXT / CSV: wrap with header + footer lines
 * - JSON: embed a _watermark field in the root object
 */
function applyWatermark(content: string, ext: string): string {
  switch (ext) {
    case '.srt': {
      // Prepend a cue numbered "0" (players ignore numbering) at video start
      const cue = `0\n00:00:00,500 --> 00:00:03,000\n${WATERMARK_LINE}\n\n`
      return cue + content.trimStart()
    }
    case '.vtt': {
      const lines = content.split('\n')
      const headerIdx = lines.findIndex((l) => l.startsWith('WEBVTT'))
      if (headerIdx >= 0) {
        // Insert blank line + cue block right after the WEBVTT line
        lines.splice(headerIdx + 1, 0, '', '00:00:00.500 --> 00:00:03.000', WATERMARK_LINE, '')
      }
      return lines.join('\n')
    }
    case '.json': {
      try {
        const obj = JSON.parse(content)
        if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
          const watermarked = { _watermark: 'Exported from VideoText (Free Plan) · videotext.io', ...obj }
          return JSON.stringify(watermarked, null, 2)
        }
      } catch { /* fall through to footer */ }
      return content + WATERMARK_FOOTER
    }
    default:
      // TXT, CSV, and anything else
      return `[VideoText.io Free Plan · videotext.io]\n\n${content}\n\n[VideoText.io Free Plan · videotext.io]\n`
  }
}

router.get('/:filename', (req: Request, res: Response) => {
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

    // Safe filename for Content-Disposition: no CR/LF/control chars, escape quotes (F10)
    const safeForHeader = filename.replace(/[\0\r\n]/g, '').replace(/"/g, '\\"')
    const asciiSafe = safeForHeader.replace(/[^\x20-\x7E]/g, '_')

    const ext = path.extname(filename).toLowerCase()
    const isDownloadRequest = req.query.wm === '1'

    // Apply server-side watermark when ?wm=1 and user is on free plan (or unauthenticated)
    if (isDownloadRequest && TEXT_EXTENSIONS.has(ext)) {
      const auth = getAuthFromRequest(req)
      const isPaid = auth !== null && auth.plan !== 'free'

      if (!isPaid) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const watermarked = applyWatermark(content, ext)
        res.setHeader('Content-Disposition', `attachment; filename="${asciiSafe}"`)
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        return res.send(watermarked)
      }
    }

    // Paid plan or non-text file: stream directly
    res.setHeader('Content-Disposition', `attachment; filename="${asciiSafe}"`)
    res.setHeader('Content-Type', 'application/octet-stream')
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)

    fileStream.on('end', () => {
      // File will be cleaned up by cron job
    })
  } catch (error: any) {
    console.error('Download error:', error)
    res.status(500).json({ message: error.message || 'Download failed' })
  }
})

export default router
