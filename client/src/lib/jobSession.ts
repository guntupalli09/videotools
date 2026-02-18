/**
 * Persist jobId (and optional jobToken) so that after idle/background/reload we can resume polling or restore result.
 * - URL (?jobId=...) so sharing and refresh keep context
 * - sessionStorage as fallback when URL is stripped
 * - jobToken is required for polling when not logged in (server returns 403 without it)
 */

const QUERY_KEY = 'jobId'
const TOKEN_STORAGE_SUFFIX = '-token'

function getPathKey(pathname: string): string {
  const base = pathname.replace(/^\//, '').split('/')[0] || 'default'
  return `job-${base}`
}

/** Persist jobId and optional jobToken to URL/sessionStorage for the current tool path. */
export function persistJobId(pathname: string, jobId: string, jobToken?: string): void {
  const key = getPathKey(pathname)
  try {
    sessionStorage.setItem(key, jobId)
    if (jobToken) sessionStorage.setItem(key + TOKEN_STORAGE_SUFFIX, jobToken)
    else sessionStorage.removeItem(key + TOKEN_STORAGE_SUFFIX)
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

/** Read jobToken from sessionStorage (used for polling when not logged in). */
export function getPersistedJobToken(pathname: string): string | null {
  const key = getPathKey(pathname) + TOKEN_STORAGE_SUFFIX
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

/** Remove jobId and jobToken from URL and sessionStorage. */
export function clearPersistedJobId(pathname: string, navigate: (path: string, opts?: { replace?: boolean }) => void): void {
  const key = getPathKey(pathname)
  try {
    sessionStorage.removeItem(key)
    sessionStorage.removeItem(key + TOKEN_STORAGE_SUFFIX)
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
