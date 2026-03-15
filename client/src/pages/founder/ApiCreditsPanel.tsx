/**
 * OpenAI credit balance panel for the Founder Dashboard.
 * Fetches from /api/admin/api-credits (cached 3h server-side).
 * Shows a visual progress bar and key numbers.
 */

import { useEffect, useState } from 'react'
import { fetchApiCredits, type ApiCreditsData } from '../../lib/founderDashboard'

function ProgressBar({ pct, color = 'bg-violet-500' }: { pct: number; color?: string }) {
  const filled = Math.round(Math.min(100, Math.max(0, pct)) / 5)  // blocks out of 20
  const empty = 20 - filled
  return (
    <div className="font-mono text-sm tracking-tight flex items-center gap-2">
      <span className="text-zinc-300">
        {'█'.repeat(filled)}
        <span className="text-zinc-700">{'░'.repeat(empty)}</span>
      </span>
    </div>
  )
}

export default function ApiCreditsPanel() {
  const [data, setData] = useState<ApiCreditsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApiCredits().then((d) => { setData(d); setLoading(false) })
  }, [])

  const handleRefresh = () => {
    setLoading(true)
    fetchApiCredits(true).then((d) => { setData(d); setLoading(false) })
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 animate-pulse">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-3" />
        <div className="h-8 w-24 bg-zinc-800 rounded" />
      </div>
    )
  }

  const openai = data?.openai

  // No data or post-paid billing
  if (!openai || openai.totalAvailableUsd == null) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">OpenAI Credits</h3>
          <button onClick={handleRefresh} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Refresh
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          {openai?.error === 'post_paid_billing'
            ? 'Post-paid billing — no prepaid credit balance.'
            : openai?.error === 'OPENAI_API_KEY not set'
            ? 'OPENAI_API_KEY not configured.'
            : 'Credit balance unavailable.'}
        </p>
        {data?.refreshedAt && (
          <p className="text-xs text-zinc-700 mt-2">
            Last checked {new Date(data.refreshedAt).toLocaleTimeString()}
          </p>
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
        <button onClick={handleRefresh} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          Refresh
        </button>
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

      {data?.refreshedAt && (
        <p className="text-xs text-zinc-700 mt-3 border-t border-zinc-800/60 pt-2">
          Updated {new Date(data.refreshedAt).toLocaleTimeString()} · refreshes every 3h
        </p>
      )}
    </div>
  )
}
