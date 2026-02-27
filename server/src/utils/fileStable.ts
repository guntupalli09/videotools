import fs from 'fs'

const DEFAULT_POLL_MS = 100
const DEFAULT_MAX_WAIT_MS = 10_000

/**
 * Wait until the file at filePath has not changed size for stableMs.
 * Polls every pollMs; gives up after maxWaitMs.
 * Prevents worker from reading a file that is still being written (e.g. after early enqueue).
 */
export async function waitForFileStable(
  filePath: string,
  stableMs: number,
  options?: { pollMs?: number; maxWaitMs?: number }
): Promise<void> {
  const pollMs = options?.pollMs ?? DEFAULT_POLL_MS
  const maxWaitMs = options?.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
  const start = Date.now()
  let lastSize: number | null = null
  let lastChangeAt = Date.now()

  while (Date.now() - start < maxWaitMs) {
    try {
      const stat = fs.statSync(filePath)
      const size = stat.size
      if (lastSize !== null && size === lastSize) {
        if (Date.now() - lastChangeAt >= stableMs) {
          return
        }
      } else {
        lastSize = size
        lastChangeAt = Date.now()
      }
    } catch {
      // File may not exist yet; keep waiting
    }
    await new Promise((r) => setTimeout(r, pollMs))
  }
  // Timeout: proceed anyway to avoid blocking forever; worker may still succeed if file is complete
}
