import type { DashboardRevenue, DashboardSnapshot } from '../../lib/founderDashboard'

function fmtMo(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

interface NewChurnBarsProps {
  newMrr: { monthStart: string; newMrrCents: number }[]
  churnedMrr: { monthStart: string; churnedMrrCents: number }[]
}

function NewChurnBars({ newMrr, churnedMrr }: NewChurnBarsProps) {
  const sorted = [...newMrr].reverse()
  const maxVal = Math.max(
    ...sorted.map((d) => d.newMrrCents),
    ...churnedMrr.map((d) => d.churnedMrrCents),
    1
  )

  if (sorted.length === 0) return <p className="text-zinc-600 text-sm">No data yet.</p>

  return (
    <div className="space-y-2 mt-2">
      {sorted.map((d, i) => {
        const churn = churnedMrr.find((c) =>
          new Date(c.monthStart).getMonth() === new Date(d.monthStart).getMonth() &&
          new Date(c.monthStart).getFullYear() === new Date(d.monthStart).getFullYear()
        )
        const newW = (d.newMrrCents / maxVal) * 100
        const churnW = ((churn?.churnedMrrCents ?? 0) / maxVal) * 100

        return (
          <div key={d.monthStart} className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 w-12 shrink-0 text-right">{fmtMo(d.monthStart)}</span>
            <div className="flex-1 flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${newW}%`, minWidth: newW > 0 ? 2 : 0 }} />
                {d.newMrrCents > 0 && <span className="text-emerald-400">+${(d.newMrrCents / 100).toFixed(0)}</span>}
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 rounded-full bg-red-600" style={{ width: `${churnW}%`, minWidth: churnW > 0 ? 2 : 0 }} />
                {(churn?.churnedMrrCents ?? 0) > 0 && (
                  <span className="text-red-400">-${((churn?.churnedMrrCents ?? 0) / 100).toFixed(0)}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <div className="flex gap-4 pt-2 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />New MRR</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-600 inline-block" />Churned MRR</span>
      </div>
    </div>
  )
}

interface ChurnRateProps {
  trend: { monthStart: string; churnRatePercent: number | null }[]
}

function ChurnRateChart({ trend }: ChurnRateProps) {
  const sorted = [...trend].reverse().filter((d) => d.churnRatePercent != null)
  if (sorted.length === 0) return <p className="text-zinc-600 text-sm">No churn data.</p>

  const W = 300; const H = 80
  const PL = 28; const PR = 8; const PT = 8; const PB = 20
  const innerW = W - PL - PR; const innerH = H - PT - PB

  const values = sorted.map((d) => d.churnRatePercent!)
  const max = Math.max(...values, 5)

  const toX = (i: number) => PL + (i / Math.max(sorted.length - 1, 1)) * innerW
  const toY = (v: number) => PT + innerH - (v / max) * innerH

  const pts = sorted.map((d, i) => `${toX(i).toFixed(1)},${toY(d.churnRatePercent!).toFixed(1)}`).join(' L ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
      <path d={`M ${pts}`} fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {sorted.map((d, i) => (
        <g key={d.monthStart}>
          <circle cx={toX(i)} cy={toY(d.churnRatePercent!)} r="2" fill="#f87171" />
          {(i === 0 || i === sorted.length - 1) && (
            <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)">
              {fmtMo(d.monthStart)}
            </text>
          )}
        </g>
      ))}
      <text x={PL - 2} y={PT + 4} textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.35)">{max.toFixed(1)}%</text>
    </svg>
  )
}

interface Props {
  revenue: DashboardRevenue
  snapshot: DashboardSnapshot
}

export default function RevenueDetails({ revenue, snapshot }: Props) {
  const latestChurnRate = revenue.churnRateTrend?.[0]?.churnRatePercent
  const arpu = snapshot.arpuCents != null ? `$${(snapshot.arpuCents / 100).toFixed(2)}` : '—'
  const totalNewMrr = revenue.newMrrTrend?.reduce((s, d) => s + d.newMrrCents, 0) ?? 0
  const totalChurnedMrr = revenue.churnedMrrTrend?.reduce((s, d) => s + d.churnedMrrCents, 0) ?? 0
  const netNewMrr = totalNewMrr - totalChurnedMrr

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* KPIs */}
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">ARPU</p>
          <p className="text-2xl font-bold text-white mt-0.5">{arpu}</p>
          <p className="text-xs text-zinc-600 mt-0.5">per paid user / month</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Churn rate (latest)</p>
          <p className={`text-2xl font-bold mt-0.5 ${latestChurnRate != null && latestChurnRate > 5 ? 'text-red-400' : 'text-white'}`}>
            {latestChurnRate != null ? `${latestChurnRate.toFixed(1)}%` : '—'}
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">monthly</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Net new MRR (12m)</p>
          <p className={`text-2xl font-bold mt-0.5 ${netNewMrr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {netNewMrr >= 0 ? '+' : ''}${(netNewMrr / 100).toFixed(0)}
          </p>
          <p className="text-xs text-zinc-600 mt-0.5">new − churned</p>
        </div>
      </div>

      {/* New vs Churned MRR bars */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-1">New vs Churned MRR</h3>
        <p className="text-xs text-zinc-500 mb-3">Last 12 months</p>
        <NewChurnBars newMrr={revenue.newMrrTrend ?? []} churnedMrr={revenue.churnedMrrTrend ?? []} />
      </div>

      {/* Churn rate trend */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Churn rate trend</h3>
        <p className="text-xs text-zinc-500 mb-3">Monthly %</p>
        <ChurnRateChart trend={revenue.churnRateTrend ?? []} />
        {snapshot.newPaidUsers != null && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-zinc-500">New paid today</p>
              <p className="text-lg font-bold text-emerald-400">{snapshot.newPaidUsers}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Churned today</p>
              <p className={`text-lg font-bold ${(snapshot.churnedUsers ?? 0) > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                {snapshot.churnedUsers ?? 0}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
