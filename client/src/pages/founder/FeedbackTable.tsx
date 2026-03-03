import type { DashboardFeedback } from '../../lib/founderDashboard'

export default function FeedbackTable({ feedback }: { feedback: DashboardFeedback[] }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Latest Feedback</h3>
      {feedback.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">No feedback yet.</p>
      ) : (
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-zinc-900">
                <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400">Stars</th>
                <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400">Tool</th>
                <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400">Plan</th>
                <th className="text-left py-2 pr-4 text-gray-600 dark:text-gray-400">Comment</th>
                <th className="text-left py-2 text-gray-600 dark:text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((f) => (
                <tr key={f.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 text-gray-900 dark:text-white">{f.stars ?? '—'}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{f.toolId ?? '—'}</td>
                  <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{f.planAtSubmit ?? '—'}</td>
                  <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">{f.comment}</td>
                  <td className="py-2 text-gray-500 dark:text-gray-400">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
