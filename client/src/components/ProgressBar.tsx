interface ProgressBarProps {
  progress: number
  status?: string
}

export default function ProgressBar({ progress, status = 'Processing...' }: ProgressBarProps) {
  return (
    <div className="w-full">
      {status && (
        <p className="text-sm font-medium text-gray-700 mb-2">{status}</p>
      )}
      <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-violet-600 to-purple-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-sm text-gray-500 mt-2 text-right">{Math.round(progress)}%</p>
    </div>
  )
}
