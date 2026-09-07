import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import Seo from '../components/Seo'
import SharePoweredByFooter from '../components/SharePoweredByFooter'
import { fetchPublicTranscriptShare, type PublicTranscriptShareResponse } from '../lib/api'
import { formatTimestamp } from '../lib/srtExport'
import { buildShareSignupUrl } from '../lib/shareBranding'

/** Minimal iframe-friendly transcript view (embeddable on blogs / course sites). */
export default function EmbedTranscript() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<PublicTranscriptShareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug?.trim()) {
      setError('Invalid embed link.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const row = await fetchPublicTranscriptShare(slug)
        if (!cancelled) setData(row)
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'This embed is unavailable.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const signupUrl = data
    ? (data.signupUrl || buildShareSignupUrl(data.slug, data.showProminentBranding ?? false))
    : buildShareSignupUrl(slug || 'embed', true)

  return (
    <div className="min-h-0 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <Seo title={data?.title ? `Embed: ${data.title}` : 'Transcript embed'} description="Embedded transcript from VideoText." canonicalPath={slug ? `/embed/${slug}` : '/'} noindex />

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8" role="status">
            Loading transcript…
          </p>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/25 p-4 flex gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <p>{error}</p>
          </div>
        )}

        {!loading && data && (
          <article className="space-y-4">
            <header className="space-y-1 border-b border-gray-100 dark:border-gray-800 pb-3">
              <h1 className="text-lg font-semibold leading-snug">{data.title}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {data.sourceTool === 'video-to-subtitles' ? 'Subtitles' : 'Transcript'}
                {data.variant === 'translated' && data.targetLanguage ? ` · ${data.targetLanguage}` : ''}
              </p>
            </header>

            <div className="max-h-[60vh] overflow-y-auto text-sm leading-relaxed">
              {data.payload.segments?.length ? (
                <div className="space-y-3">
                  {data.payload.segments.map((seg, i) => (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="shrink-0 font-mono text-[10px] text-gray-400 w-12 pt-0.5">
                        {formatTimestamp(seg.start)}
                      </span>
                      <p className="min-w-0 flex-1 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{seg.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.payload.fullText}</p>
              )}
            </div>

            <SharePoweredByFooter
              slug={data.slug}
              signupUrl={signupUrl}
              prominent={data.showProminentBranding ?? true}
            />
          </article>
        )}
      </div>
    </div>
  )
}
