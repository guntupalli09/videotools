import { useEffect, useState } from 'react'
import { lookupSupportUser, type SupportUser, type SupportJob } from '../../lib/founderDashboard'

const TOOL_LABELS: Record<string, string> = {
  'video-to-transcript': 'Transcript',
  'voice-to-transcript': 'Voice',
  'video-to-subtitles': 'Subtitles',
  'translate-subtitles': 'Translate',
  'fix-subtitles': 'Fix SRT',
  'burn-subtitles': 'Burn',
  'compress-video': 'Compress',
  'batch-process': 'Batch',
}

const TOOL_COLORS: Record<string, string> = {
  'video-to-transcript': 'text-blue-400',
  'voice-to-transcript': 'text-rose-400',
  'video-to-subtitles': 'text-blue-400',
  'translate-subtitles': 'text-pink-400',
  'fix-subtitles': 'text-emerald-400',
  'burn-subtitles': 'text-blue-400',
  'compress-video': 'text-cyan-400',
  'batch-process': 'text-blue-400',
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

function fmtVideoLen(sec: number | null): string {
  if (!sec) return '—'
  if (sec < 60) return `${sec}s`
  return `${Math.floor(sec / 60)}m${sec % 60 > 0 ? `${sec % 60}s` : ''}`
}

function fmtDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed')
    return <span className="inline-flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />completed</span>
  if (status === 'failed')
    return <span className="inline-flex items-center gap-1 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />failed</span>
  if (status === 'processing')
    return <span className="inline-flex items-center gap-1 text-amber-400"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />processing</span>
  return <span className="text-zinc-500">{status}</span>
}

interface Props {
  email: string
  onClose: () => void
}

export default function UserHistoryModal({ email, onClose }: Props) {
  const [user, setUser] = useState<SupportUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    lookupSupportUser(email).then((data) => {
      if (!data) setError('User not found.')
      else setUser(data)
    }).catch(() => setError('Failed to load user history.')).finally(() => setLoading(false))
  }, [email])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const completedJobs = user?.jobs.filter(j => j.status === 'completed').length ?? 0
  const failedJobs = user?.jobs.filter(j => j.status === 'failed').length ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">{email}</h2>
            {user && (
              <p className="text-zinc-500 text-xs mt-0.5">
                Plan: <span className="text-zinc-300">{user.plan}</span>
                <span className="mx-2 text-zinc-700">·</span>
                Joined: <span className="text-zinc-300">{fmtTimestamp(user.createdAt)}</span>
                {user.lastActiveAt && (
                  <>
                    <span className="mx-2 text-zinc-700">·</span>
                    Last active: <span className="text-zinc-300">{fmtTimestamp(user.lastActiveAt)}</span>
                  </>
                )}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-lg leading-none ml-4"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Stats bar */}
        {user && (
          <div className="flex gap-6 px-5 py-3 border-b border-zinc-800 text-xs shrink-0">
            <div>
              <span className="text-zinc-500">Total jobs</span>
              <span className="ml-2 text-white font-medium">{user.jobs.length}</span>
            </div>
            <div>
              <span className="text-zinc-500">Completed</span>
              <span className="ml-2 text-emerald-400 font-medium">{completedJobs}</span>
            </div>
            <div>
              <span className="text-zinc-500">Failed</span>
              <span className="ml-2 text-red-400 font-medium">{failedJobs}</span>
            </div>
            <div>
              <span className="text-zinc-500">Usage this month</span>
              <span className="ml-2 text-zinc-300 font-medium">{user.usageThisMonth.totalMinutes} min</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading && (
            <div className="py-12 text-center text-zinc-500 text-sm">Loading history…</div>
          )}
          {error && (
            <div className="py-12 text-center text-red-400 text-sm">{error}</div>
          )}
          {user && user.jobs.length === 0 && (
            <div className="py-12 text-center text-zinc-600 text-sm">No jobs found for this user.</div>
          )}
          {user && user.jobs.length > 0 && (
            <table className="w-full text-xs min-w-[540px]">
              <thead className="sticky top-0 bg-zinc-900 z-10">
                <tr className="border-b border-zinc-800 text-left">
                  <th className="py-2.5 px-4 text-zinc-500 font-medium">Date &amp; Time</th>
                  <th className="py-2.5 px-4 text-zinc-500 font-medium">Tool</th>
                  <th className="py-2.5 px-4 text-zinc-500 font-medium">Plan</th>
                  <th className="py-2.5 px-4 text-zinc-500 font-medium">Status</th>
                  <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Media Length</th>
                  <th className="py-2.5 px-4 text-zinc-500 font-medium text-right">Process Time</th>
                </tr>
              </thead>
              <tbody>
                {user.jobs.map((job: SupportJob) => (
                  <>
                    <tr
                      key={job.id}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                    >
                      <td className="py-2 px-4 text-zinc-400 whitespace-nowrap tabular-nums">
                        {fmtTimestamp(job.createdAt)}
                      </td>
                      <td className={`py-2 px-4 font-medium ${TOOL_COLORS[job.toolType] ?? 'text-zinc-400'}`}>
                        {TOOL_LABELS[job.toolType] ?? job.toolType}
                      </td>
                      <td className="py-2 px-4 text-zinc-500">{job.planAtRun ?? '—'}</td>
                      <td className="py-2 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-2 px-4 text-right text-zinc-400 tabular-nums">
                        {fmtVideoLen(job.videoDurationSec)}
                      </td>
                      <td className="py-2 px-4 text-right text-zinc-400 tabular-nums">
                        {fmtDuration(job.processingMs)}
                      </td>
                    </tr>
                    {expandedJob === job.id && job.failureReason && (
                      <tr key={`${job.id}-detail`} className="border-b border-zinc-800/50 bg-zinc-800/20">
                        <td colSpan={6} className="px-4 py-2">
                          <span className="text-red-400 text-[11px]">
                            <span className="text-zinc-500 mr-1">Failure reason:</span>
                            {job.failureReason}
                          </span>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-800 text-zinc-600 text-[11px] shrink-0">
          Showing last {user?.jobs.length ?? 0} jobs · Click a failed row to see the error
        </div>
      </div>
    </div>
  )
}
