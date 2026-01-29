import fs from 'fs'
import crypto from 'crypto'

interface CachedResult {
  userId: string
  videoHash: string
  outputPath: string
  createdAt: Date
}

const CACHE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const cache = new Map<string, CachedResult>()

export async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', (err) => reject(err))
  })
}

export async function checkDuplicateProcessing(
  userId: string,
  videoHash: string
): Promise<CachedResult | null> {
  const key = `${userId}:${videoHash}`
  const entry = cache.get(key)
  if (!entry) return null

  const now = Date.now()
  if (now - entry.createdAt.getTime() > CACHE_WINDOW_MS) {
    cache.delete(key)
    return null
  }

  return entry
}

export async function saveDuplicateResult(
  userId: string,
  videoHash: string,
  outputPath: string
): Promise<void> {
  const key = `${userId}:${videoHash}`
  cache.set(key, {
    userId,
    videoHash,
    outputPath,
    createdAt: new Date(),
  })
}

