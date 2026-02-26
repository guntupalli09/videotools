/** Placeholder shown during processing to avoid visual dead air. Disappears when status === 'completed'. */
export function ResultSkeleton({ variant = 'default' }: { variant?: 'default' | 'transcript' | 'subtitle' | 'burn' | 'compress' }) {
  const base = 'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700'
  if (variant === 'transcript') {
    return (
      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className={`h-5 w-48 ${base}`} />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-4 ${base}`} style={{ width: `${80 + (i % 3) * 10}%` }} />
          ))}
        </div>
        <div className={`h-10 w-32 ${base}`} />
      </div>
    )
  }
  if (variant === 'subtitle') {
    return (
      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className={`h-5 w-40 ${base}`} />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-4 ${base}`} style={{ width: `${70 + (i % 4) * 8}%` }} />
          ))}
        </div>
        <div className={`h-10 w-28 ${base}`} />
      </div>
    )
  }
  if (variant === 'burn' || variant === 'compress') {
    return (
      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
        <div className={`h-5 w-44 ${base}`} />
        <div className={`h-24 ${base}`} />
        <div className={`h-10 w-36 ${base}`} />
      </div>
    )
  }
  return (
    <div className="mt-6 space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
      <div className={`h-5 w-40 ${base}`} />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-4 ${base}`} style={{ width: `${75 + i * 5}%` }} />
        ))}
      </div>
      <div className={`h-10 w-28 ${base}`} />
    </div>
  )
}
