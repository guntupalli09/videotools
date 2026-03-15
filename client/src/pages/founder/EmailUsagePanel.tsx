/**
 * Resend email usage panel for the Founder Dashboard.
 * Shows plan, monthly limit, used count and remaining with a visual bar.
 */

import { useEffect, useState } from 'react'
import { fetchApiCredits, type ApiCreditsData } from '../../lib/founderDashboard'

function ProgressBar({ pct }: { pct: number }) {
  const filled = Math.round(Math.min(100, Math.max(0, pct)) / 5)
  const empty = 20 - filled
  return (
    <div className="font-mono text-sm tracking-tight">
      <span className="text-amber-400">{'█'.repeat(filled)}</span>
      <span className="text-zinc-700">{'░'.repeat(empty)}</span>
    </div>
  )
}

export default function EmailUsagePanel() {
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
        <div className="h-4 w-40 bg-zinc-800 rounded mb-3" />
        <div className="h-8 w-28 bg-zinc-800 rounded" />
      </div>
    )
  }

  const resend = data?.resend
  if (!resend) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Email Usage (Resend)</h3>
        <p className="text-xs text-zinc-500">No data available.</p>
      </div>
    )
  }

  const pctUsed = resend.monthlyLimit > 0 ? (resend.usedThisMonth / resend.monthlyLimit) * 100 : 0
  const isNearLimit = pctUsed >= 80

  return (
    <div className={`rounded-xl border p-5 ${isNearLimit ? 'border-amber-800/50 bg-amber-950/20' : 'border-zinc-800 bg-zinc-900'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Email Usage (Resend)</h3>
        <button onClick={handleRefresh} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
          Refresh
        </button>
      </div>

      <div className="space-y-1 mb-4 text-xs text-zinc-500">
        <div className="flex justify-between">
          <span>Plan</span>
          <span className="text-zinc-300 font-medium">{resend.plan}</span>
        </div>
        <div className="flex justify-between">
          <span>Monthly Limit</span>
          <span className="text-zinc-300 font-medium">{resend.monthlyLimit.toLocaleString()}</span>
        </div>
      </div>

      <div className="border-t border-zinc-800/60 pt-3 space-y-1 mb-3 text-xs text-zinc-500">
        <div className="flex justify-between">
          <span>Used This Month</span>
          <span className={`font-medium ${isNearLimit ? 'text-amber-400' : 'text-zinc-300'}`}>
            {resend.usedThisMonth.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Remaining</span>
          <span className="text-zinc-300 font-medium">{resend.remaining.toLocaleString()}</span>
        </div>
      </div>

      <ProgressBar pct={pctUsed} />
      <p className={`text-sm font-semibold mt-2 ${isNearLimit ? 'text-amber-400' : 'text-zinc-300'}`}>
        {pctUsed.toFixed(0)}% Used
      </p>

      {data?.refreshedAt && (
        <p className="text-xs text-zinc-700 mt-3 border-t border-zinc-800/60 pt-2">
          Updated {new Date(data.refreshedAt).toLocaleTimeString()} · refreshes every 3h
        </p>
      )}
    </div>
  )
}
