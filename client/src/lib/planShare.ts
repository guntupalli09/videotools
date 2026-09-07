/** Logged-in users can create transcript share links (free tier includes VideoText branding). */
export function planIncludesTranscriptShare(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem('authToken'))
}
