import type { DashboardJob } from '../../lib/founderDashboard'

const TOOL_LABELS: Record<string, string> = {
  'video-to-transcript': 'Transcript',
  'video-to-subtitles': 'Subtitles',
  'translate-subtitles': 'Translate',
  'fix-subtitles': 'Fix SRT',
  'burn-subtitles': 'Burn',
  'compress-video': 'Compress',
  'batch-process': 'Batch',
}

const TOOL_COLORS: Record<string, string> = {
  'video-to-transcript': 'text-violet-400',
  'video-to-subtitles': 'text-blue-400',
  'translate-subtitles': 'text-pink-400',
  'fix-subtitles': 'text-emerald-400',
  'burn-subtitles': 'text-orange-400',
  'compress-video': 'text-cyan-400',
  'batch-process': 'text-indigo-400',
}

function statusDot(status: string) {
  if (status === 'completed') return <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
  if (status === 'failed') return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
  if (status === 'processing') return <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-500" />
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function fmtDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtVideoLen(sec: number | null): string {
  if (!sec) return ''
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m${sec % 60 > 0 ? `${sec % 60}s` : ''}`
}

export default function RecentJobsFeed({ jobs }: { jobs: DashboardJob[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Recent jobs</h3>
        <span className="text-xs text-zinc-500">{jobs.length} latest</span>
      </div>
      <div className="overflow-y-auto max-h-[400px]">
        <table className="w-full text-xs min-w-[560px]">
          <thead className="sticky top-0 bg-zinc-900 z-10">
            <tr className="border-b border-zinc-800 text-left">
              <th className="py-2.5 px-4 text-zinc-500 font-medium">Time</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium">User</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium">Tool</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium">Plan</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium">Status</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Duration</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Video</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-zinc-600">No jobs yet.</td></tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-2 px-4 text-zinc-500 whitespace-nowrap">{timeAgo(j.createdAt)}</td>
                <td className="py-2 px-4 text-zinc-300 font-mono truncate max-w-[140px]">
                  {j.email ?? j.userId.slice(0, 8)}
                </td>
                <td className={`py-2 px-4 font-medium ${TOOL_COLORS[j.toolType] ?? 'text-zinc-400'}`}>
                  {TOOL_LABELS[j.toolType] ?? j.toolType}
                </td>
                <td className="py-2 px-4 text-zinc-500">{j.planAtRun ?? '—'}</td>
                <td className="py-2 px-4">
                  <span className="flex items-center gap-1.5">
                    {statusDot(j.status)}
                    <span className={j.status === 'failed' ? 'text-red-400' : 'text-zinc-400'}>{j.status}</span>
                  </span>
                  {j.status === 'failed' && j.failureReason && (
                    <span className="text-red-500 text-[10px] block truncate max-w-[160px]" title={j.failureReason}>
                      {j.failureReason}
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 text-right text-zinc-400 tabular-nums">{fmtDuration(j.processingMs)}</td>
                <td className="py-2 px-4 text-right text-zinc-500 tabular-nums">{fmtVideoLen(j.videoDurationSec)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
