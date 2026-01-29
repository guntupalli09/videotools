import express, { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'

const router = express.Router()

const tempDir = process.env.TEMP_FILE_PATH || path.join(process.cwd(), 'temp')

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

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/octet-stream')

    // Stream file
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)

    // Optionally delete file after download
    fileStream.on('end', () => {
      // File will be cleaned up by cron job, but we can delete immediately if desired
      // fs.unlinkSync(filePath)
    })
  } catch (error: any) {
    console.error('Download error:', error)
    res.status(500).json({ message: error.message || 'Download failed' })
  }
})

export default router
