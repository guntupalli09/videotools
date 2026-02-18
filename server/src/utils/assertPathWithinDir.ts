import path from 'path'

/**
 * Assert that a resolved file path is within the given directory (no path traversal).
 * Uses path.resolve and startsWith check; safe on Unix and Windows.
 * @throws Error if filePath resolves outside dir
 */
export function assertPathWithinDir(dir: string, filePath: string): void {
  const resolvedDir = path.resolve(dir)
  const resolvedPath = path.resolve(filePath)
  if (!resolvedPath.startsWith(resolvedDir)) {
    throw new Error('Path must be within allowed directory')
  }
}
