import fs from 'fs'
import path from 'path'
import * as Sentry from '@sentry/node'
import { getLogger } from '../lib/logger'
const cleanupLog = getLogger('api')

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')

const CLEANUP_INTERVAL = 15 * 60 * 1000  // 15 minutes
const FILE_MAX_AGE = 150 * 60 * 1000      // 2.5 hours (normal) — jobs routinely take 10–30 min, 1 hr was too tight
const EMERGENCY_AGE_MS = 40 * 60 * 1000   // 40 minutes (disk pressure) — safe buffer for active jobs
const DISK_EMERGENCY_THRESHOLD = 0.80     // 80% full triggers emergency mode

export function startFileCleanup() {
  cleanupFiles()
  setInterval(cleanupFiles, CLEANUP_INTERVAL)
}

function getDiskUsageRatio(): number {
  try {
    const stat = fs.statfsSync(tempDir)
    const total = stat.blocks * stat.bsize
    if (total === 0) return 0
    const used = (stat.blocks - stat.bfree) * stat.bsize
    return used / total
  } catch {
    return 0
  }
}

function cleanupFiles() {
  if (!fs.existsSync(tempDir)) {
    return
  }

  const diskRatio = getDiskUsageRatio()
  const emergency = diskRatio >= DISK_EMERGENCY_THRESHOLD
  const maxAge = emergency ? EMERGENCY_AGE_MS : FILE_MAX_AGE

  if (emergency) {
    cleanupLog.warn({ msg: '[FileCleanup] Disk emergency mode', diskPct: Math.round(diskRatio * 100), maxAgeMin: maxAge / 60000 })
  }

  const files = fs.readdirSync(tempDir)
  const now = Date.now()
  let deletedCount = 0
  let deletedBytes = 0

  files.forEach((file) => {
    const filePath = path.join(tempDir, file)
    try {
      const stats = fs.lstatSync(filePath)
      if (stats.isSymbolicLink() || !stats.isFile()) return
      const age = now - stats.mtimeMs
      if (age > maxAge) {
        fs.unlinkSync(filePath)
        deletedCount++
        deletedBytes += stats.size
      }
    } catch (error) {
      cleanupLog.error({ msg: '[FileCleanup] Error cleaning up file', file, error: String(error) })
      Sentry.captureException(error, { tags: { service: 'file-cleanup', file } })
    }
  })

  if (deletedCount > 0) {
    const mb = (deletedBytes / 1024 / 1024).toFixed(1)
    cleanupLog.info({ msg: '[FileCleanup] Cleanup complete', files: deletedCount, freedMb: mb })
  }
}
