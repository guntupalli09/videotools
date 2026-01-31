/** Full API base for fetch (e.g. https://api.videotext.io/api). Set VITE_API_URL in Vercel. */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

/** Backend origin only (no /api). Use for building download URLs from relative paths like /api/download/xxx. */
export const API_ORIGIN =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, '') || (import.meta.env.VITE_API_URL as string)
    : typeof window !== 'undefined'
      ? window.location.origin
      : ''

/** Resolve relative download path to absolute URL for fetch/download. */
export function getAbsoluteDownloadUrl(relativeOrAbsolute: string): string {
  if (relativeOrAbsolute.startsWith('http')) return relativeOrAbsolute
  return API_ORIGIN + relativeOrAbsolute
}

