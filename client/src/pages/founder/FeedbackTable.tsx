import type { DashboardFeedback } from '../../lib/founderDashboard'

export default function FeedbackTable({ feedback }: { feedback: DashboardFeedback[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">All recent feedback</h3>
        <span className="text-xs text-zinc-500">{feedback.length} entries</span>
      </div>
      {feedback.length === 0 ? (
        <p className="text-zinc-600 text-sm p-5">No feedback yet.</p>
      ) : (
        <div className="max-h-[360px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-zinc-900 z-10">
              <tr className="border-b border-zinc-800 text-left">
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Stars</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Tool</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Plan</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">User</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Comment</th>
                <th className="py-2.5 px-4 text-zinc-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((f) => (
                <tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2.5 px-4 text-amber-400">{f.stars != null ? '★'.repeat(f.stars) + '☆'.repeat(5 - f.stars) : '—'}</td>
                  <td className="py-2.5 px-4 text-zinc-400">{f.toolId ?? '—'}</td>
                  <td className="py-2.5 px-4 text-zinc-500">{f.planAtSubmit ?? '—'}</td>
                  <td className="py-2.5 px-4 text-zinc-400 max-w-[180px] truncate" title={f.userNameOrEmail ?? f.userId ?? undefined}>{f.userNameOrEmail ?? f.userId ?? '—'}</td>
                  <td className="py-2.5 px-4 text-zinc-300 max-w-[260px] truncate" title={f.comment}>{f.comment || '—'}</td>
                  <td className="py-2.5 px-4 text-zinc-600 whitespace-nowrap">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
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
