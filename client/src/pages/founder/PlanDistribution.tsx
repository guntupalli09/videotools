import type { DashboardPlanCount } from '../../lib/founderDashboard'

const PLAN_CONFIG: Record<string, { color: string; label: string }> = {
  free: { color: '#52525b', label: 'Free' },
  basic: { color: '#2563eb', label: 'Basic' },
  pro: { color: '#7c3aed', label: 'Pro' },
  agency: { color: '#d97706', label: 'Agency' },
  founding_workflow: { color: '#059669', label: 'Founding' },
}

export default function PlanDistribution({ planDistribution }: { planDistribution: DashboardPlanCount[] }) {
  const total = planDistribution.reduce((s, p) => s + p.count, 0)
  if (total === 0) return null

  const paid = planDistribution.filter((p) => p.plan !== 'free').reduce((s, p) => s + p.count, 0)
  const convRate = total > 0 ? ((paid / total) * 100).toFixed(1) : '0'

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Plan distribution</h3>
        <span className="text-xs text-zinc-500">{convRate}% paid</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-5 gap-px">
        {planDistribution.map((p) => {
          const cfg = PLAN_CONFIG[p.plan] ?? { color: '#52525b', label: p.plan }
          const pct = (p.count / total) * 100
          return (
            <div
              key={p.plan}
              style={{ width: `${pct}%`, backgroundColor: cfg.color }}
              title={`${cfg.label}: ${p.count}`}
            />
          )
        })}
      </div>

      {/* Legend rows */}
      <div className="space-y-2">
        {planDistribution.map((p) => {
          const cfg = PLAN_CONFIG[p.plan] ?? { color: '#52525b', label: p.plan }
          const pct = ((p.count / total) * 100).toFixed(1)
          return (
            <div key={p.plan} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cfg.color }} />
              <span className="text-sm text-zinc-300 flex-1">{cfg.label}</span>
              <span className="text-sm font-medium text-white tabular-nums">{p.count}</span>
              <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">{pct}%</span>
            </div>
          )
        })}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800 mt-2">
          <span className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="text-sm text-zinc-500 flex-1">Total</span>
          <span className="text-sm font-bold text-white tabular-nums">{total}</span>
        </div>
      </div>
    </div>
  )
}
