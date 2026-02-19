interface FailedStateProps {
  onTryAgain: () => void
  /** Optional custom message; default is friendly generic message. */
  message?: string
}

export default function FailedState({ onTryAgain, message }: FailedStateProps) {
  return (
    <div className="surface-card p-8 mb-6 text-center">
      <p className="text-gray-700 dark:text-gray-300 mb-1 font-medium">
        {message ?? "Something went wrong on our end. Your file wasn't changed — try again; it usually works."}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">If it keeps failing, try a smaller file or refresh the page.</p>
      <button onClick={onTryAgain} className="btn-primary">
        Try again
      </button>
    </div>
  )
}
