import type { DashboardUsage } from '../../lib/founderDashboard'

export default function UsageSection({ usage }: { usage: DashboardUsage }) {
  const topUsers = usage.topUsersByJobCount ?? []
  const jobsByTool = usage.jobsByToolType ?? []
  const maxCount = Math.max(...jobsByTool.map((j) => j.count), 1)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Users (30d)</h3>
        {topUsers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400">Email</th>
                  <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400">Plan</th>
                  <th className="text-right py-2 text-gray-600 dark:text-gray-400">Jobs</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u) => (
                  <tr key={u.userId} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 text-gray-900 dark:text-white">{u.email || u.userId}</td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{u.plan}</td>
                    <td className="py-2 text-right text-gray-900 dark:text-white">{u.jobCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Jobs by Tool (30d)</h3>
        {jobsByTool.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No data.</p>
        ) : (
          <div className="space-y-3">
            {jobsByTool.map((j) => (
              <div key={j.toolType}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{j.toolType}</span>
                  <span className="text-gray-500 dark:text-gray-400">{j.count}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{ width: `${(j.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
