import type { DashboardFeedback, DashboardFeedbackByTool, DashboardStarDist } from '../../lib/founderDashboard'

const TOOL_LABELS: Record<string, string> = {
  'video-to-transcript': 'Transcript',
  'video-to-subtitles': 'Subtitles',
  'translate-subtitles': 'Translate',
  'fix-subtitles': 'Fix SRT',
  'burn-subtitles': 'Burn',
  'compress-video': 'Compress',
  'batch-process': 'Batch',
  'unknown': 'Unknown',
}

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(max - Math.round(rating))}
    </span>
  )
}

function StarBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  const color = stars >= 4 ? '#16a34a' : stars === 3 ? '#ca8a04' : '#dc2626'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-amber-400 w-4">{stars}★</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-zinc-400 tabular-nums w-6 text-right">{count}</span>
      <span className="text-zinc-600 tabular-nums w-8 text-right">{pct.toFixed(0)}%</span>
    </div>
  )
}

interface Props {
  feedback: DashboardFeedback[]
  feedbackByTool: DashboardFeedbackByTool[]
  starDistribution: DashboardStarDist[]
}

export default function FeedbackAnalytics({ feedback, feedbackByTool, starDistribution }: Props) {
  const totalRatings = starDistribution.reduce((s, d) => s + d.count, 0)
  const weightedSum = starDistribution.reduce((s, d) => s + d.stars * d.count, 0)
  const overallAvg = totalRatings > 0 ? weightedSum / totalRatings : null

  // Fill in missing star values (1-5)
  const allStars = [5, 4, 3, 2, 1].map((s) => ({
    stars: s,
    count: starDistribution.find((d) => d.stars === s)?.count ?? 0,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Overall rating */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Overall rating</h3>
        <div className="flex items-end gap-3 mb-4">
          <span className="text-4xl font-bold text-white">{overallAvg != null ? overallAvg.toFixed(1) : '—'}</span>
          <div className="pb-1">
            {overallAvg != null && <Stars rating={overallAvg} />}
            <p className="text-xs text-zinc-500 mt-0.5">{totalRatings} ratings</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {allStars.map((s) => (
            <StarBar key={s.stars} stars={s.stars} count={s.count} total={totalRatings} />
          ))}
        </div>
      </div>

      {/* Per-tool ratings */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Rating by tool</h3>
        {feedbackByTool.length === 0 ? (
          <p className="text-zinc-600 text-sm">No data.</p>
        ) : (
          <div className="space-y-3">
            {feedbackByTool.map((t) => (
              <div key={t.toolId} className="flex items-center gap-3">
                <span className="text-xs text-zinc-300 flex-1">{TOOL_LABELS[t.toolId] ?? t.toolId}</span>
                <Stars rating={t.avgStars} />
                <span className="text-xs text-zinc-500 tabular-nums w-8 text-right">{t.avgStars.toFixed(1)}</span>
                <span className="text-xs text-zinc-600 tabular-nums w-6 text-right">({t.count})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent comments */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 overflow-hidden">
        <h3 className="text-sm font-semibold text-white mb-4">Latest comments</h3>
        {feedback.length === 0 ? (
          <p className="text-zinc-600 text-sm">No feedback yet.</p>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[280px] pr-1">
            {feedback.filter((f) => f.comment && f.comment.trim()).slice(0, 10).map((f) => (
              <div key={f.id} className="border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  {f.stars != null && <Stars rating={f.stars} />}
                  <span className="text-xs text-zinc-600">{f.toolId ? (TOOL_LABELS[f.toolId] ?? f.toolId) : ''}</span>
                  <span className="text-xs text-zinc-700 ml-auto">
                    {f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{f.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
