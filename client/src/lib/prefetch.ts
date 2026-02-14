/**
 * Prefetch route chunks on hover/focus so navigation feels instant.
 * Uses the same dynamic imports as App.tsx so the chunk is shared; we only trigger the load early.
 * No-op for paths not in the map. Fire-and-forget (does not await).
 */
import { getAllSeoPaths } from '../lib/seoRegistry'

const prefetchMap: Record<string, () => Promise<unknown>> = {
  '/': () => import('../pages/Home'),
  '/pricing': () => import('../pages/Pricing'),
  '/login': () => import('../pages/Login'),
  '/forgot-password': () => import('../pages/ForgotPassword'),
  '/reset-password': () => import('../pages/ResetPassword'),
  '/refer': () => import('../pages/Refer'),
  '/privacy': () => import('../pages/Privacy'),
  '/faq': () => import('../pages/Faq'),
  '/terms': () => import('../pages/Terms'),
  '/video-to-transcript': () => import('../pages/VideoToTranscript'),
  '/video-to-subtitles': () => import('../pages/VideoToSubtitles'),
  '/batch-process': () => import('../pages/BatchProcess'),
  '/translate-subtitles': () => import('../pages/TranslateSubtitles'),
  '/fix-subtitles': () => import('../pages/FixSubtitles'),
  '/burn-subtitles': () => import('../pages/BurnSubtitles'),
  '/compress-video': () => import('../pages/CompressVideo'),
  // SEO paths: one template; prefetch loads SeoToolPage (which then lazy-loads the tool)
  ...Object.fromEntries(getAllSeoPaths().map((path) => [path, () => import('../pages/SeoToolPage')])),
}

export function prefetchRoute(pathname: string): void {
  const path = pathname?.split('?')[0]?.replace(/\/$/, '') || '/'
  const load = prefetchMap[path === '' ? '/' : path]
  if (load) {
    load().catch(() => {}) // fire-and-forget; ignore errors (e.g. network)
  }
}
