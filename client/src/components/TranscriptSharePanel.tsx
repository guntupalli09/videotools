import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2, Loader2, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { isLoggedIn } from '../lib/auth'
import {
  createTranscriptShare,
  ensureGuestJobClaimed,
  type TranscriptSharePayload,
  type TranscriptShareSegment,
} from '../lib/api'

export type TranscriptShareSourceTool = 'video-to-transcript' | 'voice-to-text' | 'video-to-subtitles'

export interface TranscriptSharePanelProps {
  jobId: string
  jobToken: string
  sourceTool: TranscriptShareSourceTool
  title?: string
  originalFullText: string
  translatedFullText?: string | null
  translationLanguage?: string | null
  segments?: TranscriptShareSegment[] | null
  translatedSegments?: TranscriptShareSegment[] | null
  summary?: TranscriptSharePayload['summary'] | null
}

function absoluteShareUrl(path: string): string {
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}

export default function TranscriptSharePanel({
  jobId,
  jobToken,
  sourceTool,
  title = 'Transcript',
  originalFullText,
  translatedFullText,
  translationLanguage,
  segments,
  translatedSegments,
  summary,
}: TranscriptSharePanelProps) {
  const [busy, setBusy] = useState<'original' | 'translated' | null>(null)
  const [lastCopied, setLastCopied] = useState<'original' | 'translated' | null>(null)

  const origTrim = originalFullText.trim()
  const trTrim = translatedFullText?.trim() ?? ''
  const hasTranslated = Boolean(trTrim && translationLanguage)

  async function shareVariant(variant: 'original' | 'translated') {
    const fullText = variant === 'translated' ? trTrim : origTrim
    if (!fullText) {
      toast.error(variant === 'translated' ? 'Translate first, then share.' : 'Nothing to share yet.')
      return
    }
    const payload: TranscriptSharePayload = { fullText }
    if (variant === 'original') {
      if (segments?.length) payload.segments = segments
      if (summary && (summary.summary || summary.bullets?.length || summary.actionItems?.length)) {
        payload.summary = summary
      }
    } else {
      if (translatedSegments?.length) payload.segments = translatedSegments
    }

    setBusy(variant)
    try {
      await ensureGuestJobClaimed(jobId, jobToken)
      const { path } = await createTranscriptShare({
        jobId,
        jobToken,
        variant,
        sourceTool,
        title: title.slice(0, 300),
        targetLanguage: variant === 'translated' ? translationLanguage ?? null : null,
        payload,
      })
      const url = absoluteShareUrl(path)
      await navigator.clipboard.writeText(url)
      setLastCopied(variant)
      setTimeout(() => setLastCopied((v) => (v === variant ? null : v)), 2500)
      toast.success('Link copied — send it to anyone.')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not create link.'
      toast.error(msg)
    } finally {
      setBusy(null)
    }
  }

  if (!origTrim) return null

  if (!isLoggedIn()) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Share with a link</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sign in to create a read-only page for your transcript. Viewers do not need an account.
            </p>
            <Link
              to="/login"
              className="inline-flex mt-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Log in →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isFreePlan = (localStorage.getItem('plan') || 'free').toLowerCase() === 'free'

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/35 flex items-center justify-center">
          <Link2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Share with a link</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {sourceTool === 'video-to-subtitles'
              ? 'Read-only page — no account needed for viewers. Share original or translated subtitles separately.'
              : 'Read-only page — no account needed for viewers. Share original or a translation separately.'}
            {isFreePlan ? ' Free shares include a Powered by VideoText backlink (helps you earn referral traffic).' : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => shareVariant('original')}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {busy === 'original' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : lastCopied === 'original' ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          {lastCopied === 'original' ? 'Original link copied' : 'Copy link — original'}
        </button>

        <button
          type="button"
          disabled={busy !== null || !hasTranslated}
          onClick={() => shareVariant('translated')}
          title={hasTranslated ? `Share ${translationLanguage} version` : 'Translate first to share a translated link'}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/80 dark:bg-blue-950/25 px-4 py-3 text-sm font-semibold text-blue-800 dark:text-blue-200 hover:bg-blue-100/80 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy === 'translated' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : lastCopied === 'translated' ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          {lastCopied === 'translated'
            ? 'Translation link copied'
            : hasTranslated
              ? `Copy link — ${translationLanguage}`
              : 'Copy link — translated'}
        </button>
      </div>
    </div>
  )
}
