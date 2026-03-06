import type { DashboardUtmEntry } from '../../lib/founderDashboard'

const SOURCE_COLORS: Record<string, string> = {
  direct: '#52525b',
  google: '#2563eb',
  twitter: '#0891b2',
  reddit: '#ea580c',
  youtube: '#dc2626',
  linkedin: '#1d4ed8',
  facebook: '#3b82f6',
  product_hunt: '#f97316',
  organic: '#059669',
}

function getColor(source: string): string {
  const lower = source.toLowerCase()
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (lower.includes(key)) return color
  }
  return '#7c3aed'
}

export default function AcquisitionBreakdown({ utmBreakdown }: { utmBreakdown: DashboardUtmEntry[] }) {
  if (utmBreakdown.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">User acquisition</h3>
        <p className="text-zinc-600 text-sm">No UTM data yet. Add UTM params to links.</p>
      </div>
    )
  }

  const total = utmBreakdown.reduce((s, u) => s + u.count, 0)
  const max = Math.max(...utmBreakdown.map((u) => u.count), 1)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">User acquisition by source</h3>
        <span className="text-xs text-zinc-500">{total} total users</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-5 gap-px">
        {utmBreakdown.map((u) => (
          <div
            key={u.source}
            style={{ width: `${(u.count / total) * 100}%`, backgroundColor: getColor(u.source) }}
            title={`${u.source}: ${u.count}`}
          />
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2.5">
        {utmBreakdown.map((u) => {
          const pct = ((u.count / total) * 100).toFixed(1)
          const barW = (u.count / max) * 100
          return (
            <div key={u.source} className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-sm flex-shrink-0"
                style={{ backgroundColor: getColor(u.source) }}
              />
              <span className="text-sm text-zinc-300 flex-1 capitalize">{u.source}</span>
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barW}%`, backgroundColor: getColor(u.source) }}
                />
              </div>
              <span className="text-sm font-medium text-white tabular-nums w-8 text-right">{u.count}</span>
              <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
