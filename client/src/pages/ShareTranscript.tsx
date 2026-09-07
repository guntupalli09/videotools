import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileText, Mic, Film, AlertCircle } from 'lucide-react'
import Seo from '../components/Seo'
import SharePoweredByFooter from '../components/SharePoweredByFooter'
import TranscriptEmbedPanel from '../components/TranscriptEmbedPanel'
import { fetchPublicTranscriptShare, type PublicTranscriptShareResponse } from '../lib/api'
import { formatTimestamp } from '../lib/srtExport'
import { buildShareSignupUrl } from '../lib/shareBranding'

export default function ShareTranscript() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<PublicTranscriptShareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug?.trim()) {
      setError('Invalid link.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const row = await fetchPublicTranscriptShare(slug)
        if (!cancelled) setData(row)
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'This link is invalid or no longer available.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  const toolLabel =
    data?.sourceTool === 'voice-to-text' ? 'Voice to Text' :
    data?.sourceTool === 'video-to-subtitles' ? 'Video to Subtitles' :
    'Video to Transcript'
  const ToolIcon =
    data?.sourceTool === 'voice-to-text' ? Mic :
    data?.sourceTool === 'video-to-subtitles' ? Film :
    FileText

  const signupUrl = data
    ? (data.signupUrl || buildShareSignupUrl(data.slug, data.showProminentBranding ?? false))
    : buildShareSignupUrl(slug || 'share', true)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Seo
        title={data?.title ? `Shared: ${data.title}` : 'Shared transcript'}
        description="Read-only transcript shared from VideoText."
        canonicalPath={slug ? `/s/${slug}` : '/'}
        noindex
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {loading && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center text-gray-500 dark:text-gray-400 text-sm">
            Loading…
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/25 p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">Unable to open this page</p>
              <p className="text-sm text-amber-800/90 dark:text-amber-300/90 mt-1">{error}</p>
              <Link to="/" className="inline-block mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Go to VideoText home →
              </Link>
            </div>
          </div>
        )}

        {!loading && data && (
          <article className="space-y-6">
            <header className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-gray-600 dark:text-gray-300">
                  <ToolIcon className="w-3.5 h-3.5" />
                  {toolLabel}
                </span>
                {data.variant === 'translated' && (
                  <span className="inline-flex rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-1">
                    Translated
                    {data.targetLanguage ? ` · ${data.targetLanguage}` : ''}
                  </span>
                )}
                {data.variant === 'original' && (
                  <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1">
                    Original
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white tracking-tight">
                {data.title}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {data.sourceTool === 'video-to-subtitles' ? 'Shared read-only subtitles' : 'Shared read-only transcript'} ·{' '}
                {new Date(data.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </header>

            {data.payload.summary &&
              (data.payload.summary.summary ||
                data.payload.summary.bullets?.length ||
                data.payload.summary.actionItems?.length) && (
                <section className="rounded-xl border border-blue-200/70 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-3">
                  <h2 className="text-sm font-medium text-blue-900 dark:text-blue-200">Summary</h2>
                  {data.payload.summary.summary && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {data.payload.summary.summary}
                    </p>
                  )}
                  {!!data.payload.summary.bullets?.length && (
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      {data.payload.summary.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {!!data.payload.summary.actionItems?.length && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Action items</p>
                      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        {data.payload.summary.actionItems.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              )}

            <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/80 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900">
                <h2 className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {data.sourceTool === 'video-to-subtitles' ? 'Subtitles' : 'Transcript'}
                </h2>
              </div>
              <div className="p-5 max-h-[70vh] overflow-y-auto">
                {data.payload.segments?.length ? (
                  <div className="space-y-4">
                    {data.payload.segments.map((seg, i) => (
                      <div key={i} className="flex gap-3 items-start text-sm">
                        <span className="shrink-0 font-mono text-[11px] text-gray-400 dark:text-gray-500 pt-0.5 w-14">
                          {formatTimestamp(seg.start)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {seg.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {data.payload.fullText}
                  </p>
                )}
              </div>
            </section>

            <TranscriptEmbedPanel slug={data.slug} />

            <SharePoweredByFooter
              slug={data.slug}
              signupUrl={signupUrl}
              prominent={data.showProminentBranding ?? false}
            />
          </article>
        )}
      </div>
    </div>
  )
}
