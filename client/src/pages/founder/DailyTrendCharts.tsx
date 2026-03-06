import type { DashboardDailyPoint } from '../../lib/founderDashboard'

function fmtLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface SparkProps {
  data: { label: string; value: number }[]
  color: string
  height?: number
}

function Spark({ data, color, height = 80 }: SparkProps) {
  if (data.length < 2) {
    return <div className="text-xs text-zinc-600 flex items-center justify-center" style={{ height }}>No data</div>
  }

  const W = 400
  const H = height
  const PL = 4; const PR = 4; const PT = 4; const PB = 4
  const innerW = W - PL - PR
  const innerH = H - PT - PB

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values, 1)
  const range = max - min || 1

  const toX = (i: number) => PL + (i / Math.max(data.length - 1, 1)) * innerW
  const toY = (v: number) => PT + innerH - ((v - min) / range) * innerH

  const pts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`).join(' L ')
  const pathD = `M ${pts}`

  const firstX = toX(0).toFixed(1)
  const lastX = toX(data.length - 1).toFixed(1)
  const bottom = (PT + innerH).toFixed(1)
  const areaD = `M ${firstX},${bottom} L ${pts} L ${lastX},${bottom} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface ChartCardProps {
  title: string
  value: number | string
  sub?: string
  data: { label: string; value: number }[]
  color: string
}

function ChartCard({ title, value, sub, data, color }: ChartCardProps) {
  const last7 = data.slice(-7)
  const trend = last7.length >= 2
    ? ((last7[last7.length - 1].value - last7[0].value) / Math.max(last7[0].value, 1)) * 100
    : 0

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        </div>
        {last7.length >= 2 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(0)}% 7d
          </span>
        )}
      </div>
      <Spark data={data} color={color} height={72} />
    </div>
  )
}

export default function DailyTrendCharts({ daily }: { daily: DashboardDailyPoint[] }) {
  if (daily.length === 0) {
    return (
      <div className="text-sm text-zinc-600 text-center py-6 rounded-xl border border-zinc-800">
        No daily data yet. Run the recompute script.
      </div>
    )
  }

  const newUsersData = daily.map((d) => ({ label: fmtLabel(d.date), value: d.newUsers }))
  const jobsData = daily.map((d) => ({ label: fmtLabel(d.date), value: d.jobsCreated }))
  const activeUsersData = daily.map((d) => ({ label: fmtLabel(d.date), value: d.activeUsers }))
  const mrrData = daily.map((d) => ({ label: fmtLabel(d.date), value: d.mrrCents / 100 }))

  const totalNewUsers = daily.reduce((s, d) => s + d.newUsers, 0)
  const totalJobs = daily.reduce((s, d) => s + d.jobsCreated, 0)
  const lastMrr = daily[daily.length - 1]?.mrrCents ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <ChartCard
        title="New signups (30d)"
        value={totalNewUsers}
        sub="total new users"
        data={newUsersData}
        color="#7c3aed"
      />
      <ChartCard
        title="Jobs created (30d)"
        value={totalJobs.toLocaleString()}
        sub="total jobs"
        data={jobsData}
        color="#2563eb"
      />
      <ChartCard
        title="Daily active users"
        value={daily[daily.length - 1]?.activeUsers ?? 0}
        sub="latest day"
        data={activeUsersData}
        color="#059669"
      />
      <ChartCard
        title="MRR"
        value={`$${(lastMrr / 100).toFixed(0)}`}
        sub="current month"
        data={mrrData}
        color="#d97706"
      />
    </div>
  )
}
