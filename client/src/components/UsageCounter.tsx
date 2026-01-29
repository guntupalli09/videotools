interface UsageCounterProps {
  used: number
  limit: number
}

export default function UsageCounter({ used, limit }: UsageCounterProps) {
  const percentage = (used / limit) * 100

  return (
    <div className="bg-gray-100 rounded-full px-4 py-1.5 inline-flex items-center space-x-3">
      <span className="text-sm text-gray-500">
        {used} of {limit === 999999 ? '∞' : limit} free uses this month
      </span>
      {limit !== 999999 && (
        <div className="w-24 bg-gray-200 rounded-full h-2">
          <div
            className="bg-violet-600 rounded-full h-2 transition-all"
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
    </div>
  )
}
