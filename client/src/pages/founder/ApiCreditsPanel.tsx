import type { ApiCreditsData } from '../../lib/founderDashboard'

interface Props {
  data: ApiCreditsData | null
  onRefresh: () => void
}

function ProgressBar({ pct }: { pct: number }) {
  const filled = Math.round(Math.min(100, Math.max(0, pct)) / 5)
  const empty = 20 - filled
  return (
    <div className="font-mono text-sm tracking-tight">
      <span className="text-violet-400">{'█'.repeat(filled)}</span>
      <span className="text-zinc-700">{'░'.repeat(empty)}</span>
    </div>
  )
}

export default function ApiCreditsPanel({ data, onRefresh }: Props) {
  const openai = data?.openai

  if (!data) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">OpenAI Credits</h3>
          <button onClick={onRefresh} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
        </div>
        <p className="text-xs text-zinc-500">Loading…</p>
      </div>
    )
  }

  if (!openai || openai.totalAvailableUsd == null) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">OpenAI Credits</h3>
          <button onClick={onRefresh} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
        </div>
        <p className="text-xs text-zinc-500">
          {openai?.error === 'post_paid_billing'
            ? 'Post-paid billing — no prepaid credit balance.'
            : openai?.error === 'no_key'
            ? 'Set OPENAI_BILLING_KEY or OPENAI_API_KEY in your .env.'
            : openai?.error === 'HTTP 403'
            ? 'Project-scoped key (sk-proj-…) cannot access billing. Add OPENAI_BILLING_KEY with an org-level key.'
            : openai?.error
            ? `Unavailable: ${openai.error}`
            : 'Credit balance unavailable.'}
        </p>
        {data.refreshedAt && (
          <p className="text-xs text-zinc-700 mt-2">Last checked {new Date(data.refreshedAt).toLocaleTimeString()}</p>
        )}
      </div>
    )
  }

  const used = openai.totalUsedUsd ?? 0
  const total = openai.totalGrantedUsd ?? 0
  const available = openai.totalAvailableUsd
  const pctUsed = total > 0 ? (used / total) * 100 : 0

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">OpenAI Credits</h3>
        <button onClick={onRefresh} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Refresh</button>
      </div>
      <ProgressBar pct={pctUsed} />
      <div className="mt-3 space-y-1">
        <p className="text-sm font-semibold text-zinc-300">{pctUsed.toFixed(0)}% Used</p>
        <p className="text-lg font-bold text-white">${available.toFixed(2)} Remaining</p>
        <div className="flex gap-4 text-xs text-zinc-500 pt-1">
          <span>Used: <span className="text-zinc-400">${used.toFixed(2)}</span></span>
          <span>Total: <span className="text-zinc-400">${total.toFixed(2)}</span></span>
        </div>
      </div>
      {data.refreshedAt && (
        <p className="text-xs text-zinc-700 mt-3 border-t border-zinc-800/60 pt-2">
          Updated {new Date(data.refreshedAt).toLocaleTimeString()} · refreshes every 3h
        </p>
      )}
    </div>
  )
}
