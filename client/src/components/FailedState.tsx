interface FailedStateProps {
  onTryAgain: () => void
  /** Optional custom message; default is friendly generic message. */
  message?: string
}

export default function FailedState({ onTryAgain, message }: FailedStateProps) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm mb-6 text-center border border-gray-100">
      <p className="text-gray-700 mb-1 font-medium">
        {message ?? "Something went wrong on our end. Your file wasn't changed — try again; it usually works."}
      </p>
      <p className="text-sm text-gray-500 mb-6">If it keeps failing, try a smaller file or refresh the page.</p>
      <button
        onClick={onTryAgain}
        className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
