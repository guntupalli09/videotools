/**
 * Phase 2.5: Max 3 uploads per minute per user (includes retries + URL imports).
 * Call checkAndRecordUpload(userId) at start of upload/batch/URL-import; returns false if over limit.
 */
const WINDOW_MS = 60 * 1000
const MAX_UPLOADS_PER_WINDOW = 3

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
