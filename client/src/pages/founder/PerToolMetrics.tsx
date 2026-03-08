interface ToolPerfRow {
  toolType: string
  count: number
  avgMs: number | null
  p95Ms: number | null
  avgFileSizeMb: number | null
  avgDurationSec: number | null
  totalMinutes: number | null
}

const TOOL_LABELS: Record<string, string> = {
  'video-to-transcript': 'Transcript',
  'video-to-subtitles': 'Subtitles',
  'translate-subtitles': 'Translate',
  'fix-subtitles': 'Fix SRT',
  'burn-subtitles': 'Burn',
  'compress-video': 'Compress',
  'batch-process': 'Batch',
}

const TOOL_COLOR: Record<string, string> = {
  'video-to-transcript': 'text-violet-400',
  'video-to-subtitles': 'text-blue-400',
  'translate-subtitles': 'text-pink-400',
  'fix-subtitles': 'text-emerald-400',
  'burn-subtitles': 'text-orange-400',
  'compress-video': 'text-cyan-400',
  'batch-process': 'text-indigo-400',
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtVideoLen(sec: number | null): string {
  if (sec == null) return '—'
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m${sec % 60 > 0 ? `${sec % 60}s` : ''}`
}

export default function PerToolMetrics({ toolPerf }: { toolPerf: ToolPerfRow[] }) {
  if (!toolPerf || toolPerf.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Per-tool breakdown <span className="text-zinc-500 font-normal">(30d)</span></h3>
        <p className="text-zinc-600 text-sm mt-4">No completed jobs in the last 30 days yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-semibold text-white">Per-tool breakdown <span className="text-zinc-500 font-normal">(30d completed)</span></h3>
        <p className="text-xs text-zinc-600 mt-0.5">Processing time · upload size · video duration · total minutes processed</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead className="border-y border-zinc-800 bg-zinc-900/80">
            <tr className="text-left">
              <th className="py-2.5 px-5 text-zinc-500 font-medium">Tool</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Jobs</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Avg time</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">P95 time</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Avg file size</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Avg video len</th>
              <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Total minutes</th>
            </tr>
          </thead>
          <tbody>
            {toolPerf.map((t) => (
              <tr key={t.toolType} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                <td className={`py-2.5 px-5 font-medium ${TOOL_COLOR[t.toolType] ?? 'text-zinc-400'}`}>
                  {TOOL_LABELS[t.toolType] ?? t.toolType}
                </td>
                <td className="py-2.5 px-4 text-right text-white tabular-nums font-semibold">{t.count.toLocaleString()}</td>
                <td className="py-2.5 px-4 text-right text-zinc-300 tabular-nums">{fmtDuration(t.avgMs)}</td>
                <td className="py-2.5 px-4 text-right text-zinc-400 tabular-nums">{fmtDuration(t.p95Ms)}</td>
                <td className="py-2.5 px-4 text-right text-zinc-400 tabular-nums">
                  {t.avgFileSizeMb != null ? `${t.avgFileSizeMb} MB` : '—'}
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-400 tabular-nums">{fmtVideoLen(t.avgDurationSec)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">
                  {t.totalMinutes != null ? (
                    <span className="text-violet-400 font-semibold">{t.totalMinutes.toLocaleString()} min</span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
