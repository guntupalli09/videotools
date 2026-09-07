import { useState } from 'react'
import { Check, Code2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { buildEmbedIframeCode } from '../lib/shareBranding'

export interface TranscriptEmbedPanelProps {
  slug: string
}

export default function TranscriptEmbedPanel({ slug }: TranscriptEmbedPanelProps) {
  const [copied, setCopied] = useState(false)
  const code = buildEmbedIframeCode(slug)

  async function copyEmbed() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success('Embed code copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy embed code')
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/35 flex items-center justify-center">
          <Code2 className="w-5 h-5 text-violet-700 dark:text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Embed on your site</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Paste this iframe into a blog post, Notion page, or course site. Includes a VideoText backlink for viewers.
          </p>
        </div>
      </div>
      <pre className="text-[11px] leading-relaxed overflow-x-auto rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-3 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        type="button"
        onClick={copyEmbed}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied embed code' : 'Copy embed code'}
      </button>
    </section>
  )
}
