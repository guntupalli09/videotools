import type { DashboardRevenue } from '../../lib/founderDashboard'

const W = 500
const H = 200
const PAD = { left: 40, right: 20, top: 20, bottom: 30 }

export default function RevenueChart({ revenue }: { revenue: DashboardRevenue }) {
  const trend = revenue.mrrTrend ?? []
  if (trend.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">MRR Trend</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">No data yet.</p>
      </div>
    )
  }

  const values = trend.map((d) => d.mrrCents)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const range = max - min || 1
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const pts = trend
    .slice()
    .reverse()
    .map((d, i) => {
      const x = PAD.left + (i / Math.max(trend.length - 1, 1)) * innerW
      const y = PAD.top + innerH - ((d.mrrCents - min) / range) * innerH
      return `${x},${y}`
    })
    .join(' ')

  const pathD = pts ? `M ${pts.split(' ').join(' L ')}` : ''

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">MRR Trend (last 12 months)</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {trend.map((d, i) => (
          <text
            key={d.monthStart}
            x={PAD.left + (i / Math.max(trend.length - 1, 1)) * innerW}
            y={H - 8}
            textAnchor="middle"
            className="fill-gray-500 dark:fill-gray-400 text-[10px]"
          >
            {new Date(d.monthStart).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
          </text>
        ))}
        <path
          d={pathD}
          fill="none"
          stroke="rgb(139 92 246)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
