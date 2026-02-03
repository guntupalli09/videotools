/**
 * Persist jobId so that after idle/background/reload we can resume polling or restore result.
 * - URL (?jobId=...) so sharing and refresh keep context
 * - sessionStorage as fallback when URL is stripped
 */

const QUERY_KEY = 'jobId'

function getPathKey(pathname: string): string {
  const base = pathname.replace(/^\//, '').split('/')[0] || 'default'
  return `job-${base}`
}

/** Persist jobId to URL and sessionStorage for the current tool path. */
export function persistJobId(pathname: string, jobId: string): void {
  const key = getPathKey(pathname)
  try {
    sessionStorage.setItem(key, jobId)
  } catch {
    // ignore
  }
  const url = new URL(window.location.href)
  url.searchParams.set(QUERY_KEY, jobId)
  window.history.replaceState({}, '', url.pathname + url.search)
}

/** Read jobId from URL first, then sessionStorage. */
export function getPersistedJobId(pathname: string): string | null {
  const url = new URL(window.location.href)
  const fromUrl = url.searchParams.get(QUERY_KEY)
  if (fromUrl) return fromUrl
  const key = getPathKey(pathname)
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

/** Remove jobId from URL and sessionStorage. */
export function clearPersistedJobId(pathname: string, navigate: (path: string, opts?: { replace?: boolean }) => void): void {
  const key = getPathKey(pathname)
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
  const url = new URL(window.location.href)
  if (url.searchParams.has(QUERY_KEY)) {
    url.searchParams.delete(QUERY_KEY)
    const newPath = url.pathname + (url.search ? url.search : '')
    navigate(newPath, { replace: true })
  }
}
