import { Link } from 'react-router-dom'

interface ChangelogEntry {
  date: string
  version: string
  tag: 'new' | 'improvement' | 'fix' | 'infra'
  items: string[]
}

const TAG_STYLES: Record<ChangelogEntry['tag'], string> = {
  new: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  improvement: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  fix: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  infra: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const TAG_LABELS: Record<ChangelogEntry['tag'], string> = {
  new: 'New',
  improvement: 'Improvement',
  fix: 'Fix',
  infra: 'Infrastructure',
}

const ENTRIES: ChangelogEntry[] = [
  {
    date: 'March 6, 2026',
    version: 'v1.9',
    tag: 'new',
    items: [
      'Founder Command Centre: real-time MRR, churn, job stats, failure breakdown, and server health in one dashboard.',
      'New /api/admin/recompute endpoint for on-demand metric population without SSH.',
      'Acquisition funnel breakdown (UTM, direct, organic) now visible in the dashboard.',
    ],
  },
  {
    date: 'March 1, 2026',
    version: 'v1.8',
    tag: 'improvement',
    items: [
      'UI polish pass: consistent card spacing, smoother transitions across all tool pages.',
      'Navigation refinements on mobile — hamburger menu now closes on route change.',
      'Free plan import counter now shows remaining imports inline on the upload zone.',
    ],
  },
  {
    date: 'February 26, 2026',
    version: 'v1.7',
    tag: 'improvement',
    items: [
      'Performance: extraction-first pipeline cuts time-to-first-word by ~40% on average.',
      'Streaming reassembly: transcript chunks now stream to the UI as they arrive instead of waiting for the full job.',
      'Worker priority queue tuned — Agency and Pro jobs now consistently pre-empt free-tier jobs under load.',
    ],
  },
  {
    date: 'February 25, 2026',
    version: 'v1.6',
    tag: 'new',
    items: [
      'Workflow integration: the app now suggests the next logical tool after each job (e.g. "Translate your subtitles to Spanish").',
      'Workflow Tracker panel shows all jobs in the current session with one-click re-open.',
      'Billing portal link now accessible directly from the user menu.',
      'Annual billing option with 20% discount added to all paid plans.',
    ],
  },
  {
    date: 'February 20, 2026',
    version: 'v1.5',
    tag: 'new',
    items: [
      'Server-side performance optimisations: parallel audio extraction + transcription reduces median latency by 25%.',
      'Chunked upload support (10 MB chunks) for large files on slower connections.',
      'Job streaming via Server-Sent Events — progress bar now updates in real time without polling.',
    ],
  },
  {
    date: 'February 19, 2026',
    version: 'v1.4',
    tag: 'new',
    items: [
      'Tex, the in-app AI assistant, is now live. Ask Tex anything about your transcript, subtitle timing, or which tool to use next.',
      'Post-job feedback system: rate any job 1–5 stars to help us improve accuracy.',
      'Feedback viewer page for tracking submitted ratings.',
    ],
  },
  {
    date: 'February 18, 2026',
    version: 'v1.3',
    tag: 'improvement',
    items: [
      'Design system overhaul: Plus Jakarta Sans font, consistent surface-card tokens, unified button and input styles across all pages.',
      'Video → Transcript page rebuilt with two-column layout and compact hero for faster scanning.',
      'Workflow pre-fill: switching tools now carries your uploaded file and subtitle forward automatically.',
      'Free plan watermark applied to subtitle exports; no watermark on paid plans.',
    ],
  },
  {
    date: 'February 17, 2026',
    version: 'v1.2',
    tag: 'infra',
    items: [
      'Health endpoints /healthz and /readyz now check Redis and Postgres liveness independently.',
      'CORS hardened for production; upload init route made idempotent to handle retries safely.',
      'Batch jobs migrated from in-memory to Postgres for durability across restarts.',
      'Guide page added: step-by-step instructions for all 7 tools with plan limit reference table.',
    ],
  },
  {
    date: 'February 16, 2026',
    version: 'v1.1',
    tag: 'new',
    items: [
      'SEO infrastructure: 50+ keyword-targeted landing pages (MP4 to SRT, Meeting Transcript Generator, etc.) now live.',
      'Sitemap and structured data (JSON-LD) for all routes.',
      'Breadcrumb navigation added site-wide.',
    ],
  },
  {
    date: 'February 14, 2026',
    version: 'v1.0',
    tag: 'new',
    items: [
      'VideoText launches publicly.',
      '7 core tools: Video → Transcript, Video → Subtitles, Translate Subtitles, Fix Subtitles, Burn Subtitles, Compress Video, Batch Processing.',
      'Free plan with 3 imports per month, no credit card required.',
      'Stripe-backed subscriptions: Basic, Pro, Agency, and Creator Pro (early access).',
      'We process your files and delete them — no data stored on our servers.',
    ],
  },
]

export default function Changelog() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium mb-6 inline-block">
          ← Back to home
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Changelog</h1>
          <p className="text-gray-600 dark:text-gray-400">
            What's been shipped. Updated every time something meaningful changes.{' '}
            <Link to="/blog" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium">
              Read the blog →
            </Link>
          </p>
        </div>

        <div className="space-y-10">
          {ENTRIES.map((entry) => (
            <div key={entry.version} className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-700">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-violet-500 border-2 border-white dark:border-gray-900" />

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{entry.date}</span>
                <span className="text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {entry.version}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAG_STYLES[entry.tag]}`}>
                  {TAG_LABELS[entry.tag]}
                </span>
              </div>

              <ul className="space-y-1.5">
                {entry.items.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Have a feature request?{' '}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('videotext:open-feedback'))}
              className="text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium"
            >
              Tell us what to build next.
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
