import type { DashboardFailureReason } from '../../lib/founderDashboard'

export default function FailureBreakdown({ failureReasons }: { failureReasons: DashboardFailureReason[] }) {
  if (failureReasons.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-white">Failure reasons (30d)</h3>
        <p className="text-emerald-400 text-sm">No failures recorded.</p>
      </div>
    )
  }

  const total = failureReasons.reduce((s, f) => s + f.count, 0)
  const max = Math.max(...failureReasons.map((f) => f.count), 1)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Failure reasons (30d)</h3>
        <span className="text-xs text-red-400 font-medium">{total} failures</span>
      </div>
      <div className="space-y-2.5">
        {failureReasons.map((f) => {
          const pct = ((f.count / total) * 100).toFixed(1)
          const barW = (f.count / max) * 100
          return (
            <div key={f.reason}>
              <div className="flex items-center gap-2 text-xs mb-0.5">
                <span className="text-zinc-300 flex-1 truncate font-mono" title={f.reason}>{f.reason}</span>
                <span className="text-red-400 font-medium tabular-nums">{f.count}</span>
                <span className="text-zinc-600 tabular-nums w-9 text-right">{pct}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 rounded-full"
                  style={{ width: `${barW}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
