import { Sparkles } from 'lucide-react'

export interface SharePoweredByFooterProps {
  signupUrl: string
  prominent?: boolean
  slug: string
}

export default function SharePoweredByFooter({ signupUrl, prominent = false, slug }: SharePoweredByFooterProps) {
  if (prominent) {
    return (
      <footer className="mt-8 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-gray-900/80 p-6 text-center shadow-sm">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white mb-3">
          <Sparkles className="w-5 h-5" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Powered by VideoText</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-md mx-auto">
          Transcribe YouTube links and videos to SRT, VTT, and clean transcripts — free to start.
        </p>
        <a
          href={signupUrl}
          className="inline-flex mt-4 items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          data-share-slug={slug}
        >
          Try VideoText free →
        </a>
      </footer>
    )
  }

  return (
    <footer className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4 space-y-1">
      <p>
        Transcribed with{' '}
        <a href={signupUrl} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
          VideoText
        </a>
      </p>
    </footer>
  )
}
