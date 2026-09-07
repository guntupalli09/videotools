const REFERRAL_STORAGE_KEY = 'videotext:referral_code'

/** Persist ?ref=CODE from URL for signup attribution. */
export function captureReferralFromUrl(search?: string): void {
  if (typeof window === 'undefined') return
  try {
    const params = new URLSearchParams(search ?? window.location.search)
    const raw = params.get('ref')
    if (!raw?.trim()) return
    localStorage.setItem(REFERRAL_STORAGE_KEY, raw.trim().toUpperCase())
  } catch {
    // ignore
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const code = localStorage.getItem(REFERRAL_STORAGE_KEY)
    return code?.trim() || null
  } catch {
    return null
  }
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function buildReferralSignupPath(code: string): string {
  return `/signup?ref=${encodeURIComponent(code)}`
}
