/**
 * API contract: all backend routes are under /api/*
 * - VITE_API_URL must be ORIGIN ONLY (e.g. https://api.videotext.io). Do NOT include /api.
 * - Every request path must start with /api/ (enforced by api() in api.ts).
 * - Prevents 404s from /upload, /usage, /job (missing /api) or /api/api/* (double prefix).
 */
const raw = import.meta.env.VITE_API_URL as string | undefined
export const API_ORIGIN =
  raw != null && raw !== ''
    ? raw.replace(/\/api\/?$/, '').replace(/\/$/, '') // strip trailing /api or /
    : typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3001'

/** Resolve relative API path (e.g. /api/download/xxx) to absolute URL for fetch/download. */
export function getAbsoluteDownloadUrl(relativeOrAbsolute: string): string {
  if (relativeOrAbsolute.startsWith('http')) return relativeOrAbsolute
  return API_ORIGIN + relativeOrAbsolute
}
