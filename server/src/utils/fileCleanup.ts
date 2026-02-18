import fs from 'fs'
import path from 'path'

const tempDir =
  process.env.TEMP_FILE_PATH ||
  (process.platform === 'win32' ? path.join(process.cwd(), 'temp') : '/tmp')
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour
const FILE_MAX_AGE = 60 * 60 * 1000 // 1 hour

export function startFileCleanup() {
  // Run cleanup immediately
  cleanupFiles()

  // Then run every hour
  setInterval(cleanupFiles, CLEANUP_INTERVAL)
}

function cleanupFiles() {
  if (!fs.existsSync(tempDir)) {
    return
  }

  const files = fs.readdirSync(tempDir)
  const now = Date.now()
  let deletedCount = 0

  files.forEach((file) => {
    const filePath = path.join(tempDir, file)
    try {
      const stats = fs.lstatSync(filePath)
      if (stats.isSymbolicLink()) {
        return
      }
      if (!stats.isFile()) {
        return
      }
      const age = now - stats.mtimeMs

      if (age > FILE_MAX_AGE) {
        fs.unlinkSync(filePath)
        deletedCount++
        console.log(`Deleted old file: ${file}`)
      }
    } catch (error) {
      console.error(`Error cleaning up file ${file}:`, error)
    }
  })

  if (deletedCount > 0) {
    console.log(`File cleanup: Deleted ${deletedCount} file(s)`)
  }
}
