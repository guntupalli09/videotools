import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

interface CachedResult {
  userId: string
  videoHash: string
  outputPath: string
  fileName: string
  createdAt: Date
}

/** TTL in ms. 0 = disable cache. Default 7 days. */
const CACHE_TTL_MS = Math.max(
  0,
  (Number(process.env.CACHE_TTL_DAYS) || 7) * 24 * 60 * 60 * 1000
)

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

/** Deterministic hash of options that affect output (so same file + same options = cache hit). */
export function computeOptionsHash(
  toolType: string,
  options?: Record<string, unknown> | null
): string {
  if (!options || Object.keys(options).length === 0) {
    return crypto.createHash('sha256').update(toolType).digest('hex').slice(0, 16)
  }
  const sorted: Record<string, unknown> = {}
  for (const k of Object.keys(options).sort()) {
    const v = options[k]
    if (v === undefined) continue
    sorted[k] = Array.isArray(v) ? [...v].sort() : v
  }
  return crypto
    .createHash('sha256')
    .update(toolType + JSON.stringify(sorted))
    .digest('hex')
    .slice(0, 16)
}

function cacheKey(userId: string, videoHash: string, toolType: string, optionsHash: string): string {
  return `${userId}:${videoHash}:${toolType}:${optionsHash}`
}

export async function checkDuplicateProcessing(
  userId: string,
  videoHash: string,
  toolType: string,
  options?: Record<string, unknown> | null
): Promise<CachedResult | null> {
  if (CACHE_TTL_MS === 0) return null

  const optionsHash = computeOptionsHash(toolType, options)
  const key = cacheKey(userId, videoHash, toolType, optionsHash)
  const entry = cache.get(key)
  if (!entry) return null

  const now = Date.now()
  if (now - entry.createdAt.getTime() > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }

  return entry
}

export async function saveDuplicateResult(
  userId: string,
  videoHash: string,
  outputPath: string,
  toolType: string,
  options?: Record<string, unknown> | null,
  fileName?: string
): Promise<void> {
  if (CACHE_TTL_MS === 0) return

  const optionsHash = computeOptionsHash(toolType, options)
  const key = cacheKey(userId, videoHash, toolType, optionsHash)
  cache.set(key, {
    userId,
    videoHash,
    outputPath,
    fileName: fileName ?? path.basename(outputPath),
    createdAt: new Date(),
  })
}

