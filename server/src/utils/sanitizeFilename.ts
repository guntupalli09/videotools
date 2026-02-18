import path from 'path'

/**
 * Safe character set for stored filenames: letters, numbers, dot, dash, underscore, space.
 * Used to prevent path traversal and shell injection from user-controlled names.
 */
const SAFE_FILENAME_REGEX = /[^a-zA-Z0-9._\-\s]/g

/**
 * Sanitize a user-provided filename for safe storage under tempDir.
 * - Takes basename (strips path components)
 * - Strips NULL bytes and path separators
 * - Restricts to safe chars (letters, numbers, dot, dash, underscore, space)
 * - Collapses and trims whitespace
 * - Returns non-empty fallback "file" if result would be empty
 */
export function sanitizeFilename(originalName: string | undefined): string {
  if (originalName == null || typeof originalName !== 'string') {
    return 'file'
  }
  // Basename only; strip path separators and null bytes
  let base = path.basename(originalName.replace(/\0/g, ''))
  base = base.replace(/[/\\]/g, '')
  if (!base.trim()) return 'file'
  // Restrict to safe characters
  const safe = base.replace(SAFE_FILENAME_REGEX, '').replace(/\s+/g, ' ').trim()
  return safe.length > 0 ? safe : 'file'
}
