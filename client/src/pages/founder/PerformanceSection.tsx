import type { DashboardPerformance } from '../../lib/founderDashboard'

export default function PerformanceSection({ performance }: { performance: DashboardPerformance }) {
  const avgSec = performance.avgProcessingMs != null ? (performance.avgProcessingMs / 1000).toFixed(1) : '0'
  const p95Sec = performance.p95ProcessingMs != null ? (performance.p95ProcessingMs / 1000).toFixed(1) : '0'
  const failurePct = (performance.failureRate != null ? performance.failureRate * 100 : 0).toFixed(1)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Avg Processing</p>
        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{avgSec}s</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">P95 Processing</p>
        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{p95Sec}s</p>
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Failure Rate</p>
        <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{failurePct}%</p>
      </div>
    </div>
  )
}
