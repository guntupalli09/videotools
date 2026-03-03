import type { DashboardSnapshot } from '../../lib/founderDashboard'

export default function SnapshotCards({ snapshot }: { snapshot: DashboardSnapshot }) {
  if (snapshot.status === 'no_metrics_data') {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">No metrics data yet. Run the recompute script.</p>
      </div>
    )
  }

  const mrr = snapshot.mrrCents != null ? (snapshot.mrrCents / 100).toFixed(2) : '—'

  const cards = [
    { label: 'Total Users', value: snapshot.totalUsers ?? '—' },
    { label: 'Active Users', value: snapshot.activeUsers ?? '—' },
    { label: 'MRR', value: `$${mrr}` },
    { label: 'Jobs Completed (Last Day)', value: snapshot.jobsCompleted ?? '—' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      ))}
    </div>
  )
}
