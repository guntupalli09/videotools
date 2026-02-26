/**
 * Phase 2.5: Max N uploads per minute per user (includes retries + URL imports).
 * Call checkAndRecordUpload(userId) at start of upload/batch/URL-import; returns false if over limit.
 * In dev, UPLOAD_RATE_LIMIT_PER_MIN can increase the limit (e.g. 10) so retries don't block.
 */
const WINDOW_MS = 60 * 1000
const MAX_UPLOADS_PER_WINDOW =
  typeof process.env.UPLOAD_RATE_LIMIT_PER_MIN !== 'undefined'
    ? Math.max(1, parseInt(process.env.UPLOAD_RATE_LIMIT_PER_MIN, 10) || 3)
    : process.env.NODE_ENV === 'production'
      ? 3
      : 10

const timestampsByUser = new Map<string, number[]>()

function prune(userId: string): void {
  const now = Date.now()
  const list = timestampsByUser.get(userId) || []
  const kept = list.filter((t) => now - t < WINDOW_MS)
  if (kept.length === 0) timestampsByUser.delete(userId)
  else timestampsByUser.set(userId, kept)
}

/** Returns true if upload is allowed and records the attempt. Returns false if over limit (caller should return 429). */
export function checkAndRecordUpload(userId: string): boolean {
  prune(userId)
  const list = timestampsByUser.get(userId) || []
  if (list.length >= MAX_UPLOADS_PER_WINDOW) return false
  list.push(Date.now())
  timestampsByUser.set(userId, list)
  return true
}
