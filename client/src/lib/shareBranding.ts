/** UTM-backed signup URL for shared transcript pages (distribution attribution). */
export function buildShareSignupUrl(slug: string, prominentBranding: boolean): string {
  if (typeof window === 'undefined') {
    return `https://videotext.io/video-to-transcript?utm_source=share&utm_medium=transcript&utm_campaign=${prominentBranding ? 'free_share' : 'pro_share'}&utm_content=${encodeURIComponent(slug)}`
  }
  const params = new URLSearchParams({
    utm_source: 'share',
    utm_medium: 'transcript',
    utm_campaign: prominentBranding ? 'free_share' : 'pro_share',
    utm_content: slug,
  })
  return `${window.location.origin}/video-to-transcript?${params.toString()}`
}

export function buildEmbedIframeCode(slug: string, height = 480): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://videotext.io'
  const src = `${origin}/embed/${slug}`
  return `<iframe src="${src}" title="VideoText transcript" width="100%" height="${height}" frameborder="0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allow="clipboard-read; clipboard-write"></iframe>`
}
