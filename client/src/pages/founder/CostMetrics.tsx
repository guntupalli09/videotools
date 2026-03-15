/**
 * Per-job cost metrics panel for the Founder Dashboard.
 * Shows average Whisper cost, estimated revenue per job, and gross margin.
 * Data comes from the main dashboard payload (costMetrics field).
 */

import type { DashboardCostMetrics, DashboardSnapshot } from '../../lib/founderDashboard'

interface Props {
  costMetrics: DashboardCostMetrics | null
  snapshot: DashboardSnapshot
  /** MRR in cents — used to estimate revenue per job */
  recentJobsCount?: number
}

function MetricRow({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-zinc-800/60 last:border-0">
      <div>
        <p className="text-xs text-zinc-400">{label}</p>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
      </div>
      <p className={`text-sm font-bold tabular-nums ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}

export default function CostMetrics({ costMetrics, snapshot, recentJobsCount }: Props) {
  if (!costMetrics || costMetrics.jobsWithCost === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Cost per Job (30d)</h3>
        <p className="text-xs text-zinc-500">
          No cost data yet. Costs will appear here after the next transcription job completes.
        </p>
      </div>
    )
  }

  const avgWhisper = costMetrics.avgWhisperCostUsd ?? 0
  const totalWhisper = costMetrics.totalWhisperCostUsd ?? 0

  // Estimate revenue per job: MRR / jobs completed last 30d
  const jobsCompleted30d = snapshot.jobsCompleted ?? 0
  const mrrUsd = snapshot.mrrCents != null ? snapshot.mrrCents / 100 : null
  const revenuePerJob = mrrUsd != null && jobsCompleted30d > 0
    ? mrrUsd / jobsCompleted30d
    : null

  // Gross margin: (revenue - cost) / revenue
  const grossMarginPct = revenuePerJob != null && revenuePerJob > 0
    ? Math.round(((revenuePerJob - avgWhisper) / revenuePerJob) * 100)
    : null

  // Average video duration
  const avgDurMin = costMetrics.avgDurationSec != null
    ? (costMetrics.avgDurationSec / 60).toFixed(1)
    : null

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Cost per Job (30d)</h3>
          <p className="text-xs text-zinc-600 mt-0.5">{costMetrics.jobsWithCost.toLocaleString()} jobs tracked</p>
        </div>
      </div>

      <div className="space-y-0">
        {avgDurMin && (
          <MetricRow label="Avg video length" value={`${avgDurMin} min`} sub="per transcription job" />
        )}
        <MetricRow
          label="Avg Whisper cost"
          value={`$${avgWhisper.toFixed(4)}`}
          sub="$0.006/min (OpenAI Whisper)"
        />
        <MetricRow
          label="30d Whisper spend"
          value={`$${totalWhisper.toFixed(2)}`}
          sub="total last 30 days"
        />
        {revenuePerJob != null && (
          <MetricRow
            label="Est. revenue per job"
            value={`$${revenuePerJob.toFixed(2)}`}
            sub="MRR ÷ jobs completed (30d)"
          />
        )}
        {grossMarginPct != null && (
          <MetricRow
            label="Est. gross margin"
            value={`${grossMarginPct}%`}
            sub="(revenue − whisper) ÷ revenue"
            accent={grossMarginPct > 70}
          />
        )}
      </div>

      {revenuePerJob == null && (
        <p className="text-xs text-zinc-600 mt-3 italic">
          Revenue-per-job requires MRR data from Stripe.
        </p>
      )}
    </div>
  )
}
