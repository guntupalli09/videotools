/** Plan snapshot at share time — free-tier shares show prominent VideoText branding + UTM. */
export function planShowsProminentShareBranding(ownerPlan: string | null | undefined): boolean {
  const p = (ownerPlan || 'free').toLowerCase()
  return p === 'free'
}

export function buildShareSignupUrl(slug: string, ownerPlan: string | null | undefined): string {
  const base = (process.env.SITE_URL || 'https://videotext.io').replace(/\/+$/, '')
  const params = new URLSearchParams({
    utm_source: 'share',
    utm_medium: 'transcript',
    utm_campaign: planShowsProminentShareBranding(ownerPlan) ? 'free_share' : 'pro_share',
    utm_content: slug,
  })
  return `${base}/video-to-transcript?${params.toString()}`
}
