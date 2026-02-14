/**
 * Programmatic SEO page template.
 * Renders the correct core tool for a given path using the SEO registry.
 * Includes registry-driven Related tools (4–6 links) for internal linking.
 */
import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { getSeoEntry, getRelatedSuggestionsForEntry } from '../lib/seoRegistry'
import type { SeoToolKey } from '../lib/seoRegistry'
import CrossToolSuggestions from '../components/CrossToolSuggestions'
import NotFound from './NotFound'

// Lazy-load core tools so only the needed one is loaded for each SEO URL
const VideoToTranscript = lazy(() => import('./VideoToTranscript'))
const VideoToSubtitles = lazy(() => import('./VideoToSubtitles'))
const TranslateSubtitles = lazy(() => import('./TranslateSubtitles'))
const FixSubtitles = lazy(() => import('./FixSubtitles'))
const BurnSubtitles = lazy(() => import('./BurnSubtitles'))
const CompressVideo = lazy(() => import('./CompressVideo'))
const BatchProcess = lazy(() => import('./BatchProcess'))

const TOOL_MAP: Record<SeoToolKey, React.LazyExoticComponent<React.ComponentType<any>>> = {
  'video-to-transcript': VideoToTranscript,
  'video-to-subtitles': VideoToSubtitles,
  'translate-subtitles': TranslateSubtitles,
  'fix-subtitles': FixSubtitles,
  'burn-subtitles': BurnSubtitles,
  'compress-video': CompressVideo,
  'batch-process': BatchProcess,
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <p className="text-violet-600 font-medium">Loading…</p>
    </div>
  )
}

export default function SeoToolPage() {
  const { pathname } = useLocation()
  const entry = getSeoEntry(pathname)

  if (!entry) {
    return <NotFound />
  }

  const Tool = TOOL_MAP[entry.toolKey]
  if (!Tool) {
    return <NotFound />
  }

  const related = getRelatedSuggestionsForEntry(entry)
  const suggestions = related.map(({ path, title }) => ({
    icon: FileText,
    title,
    path,
  }))

  return (
    <div className="min-h-screen">
      <Suspense fallback={<RouteFallback />}>
        <Tool
          seoH1={entry.h1}
          seoIntro={entry.intro}
          faq={entry.faq}
        />
      </Suspense>
      {suggestions.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-12">
          <CrossToolSuggestions suggestions={suggestions} />
        </div>
      )}
    </div>
  )
}
