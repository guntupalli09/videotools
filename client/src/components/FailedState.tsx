interface FailedStateProps {
  onTryAgain: () => void
  /** Optional custom message; default is friendly generic message. */
  message?: string
}

export default function FailedState({ onTryAgain, message }: FailedStateProps) {
  return (
    <div className="surface-card p-8 mb-8 text-center">
      <div className="min-h-[3.5rem] flex items-center justify-center mb-2">
        <p className="text-gray-700 dark:text-gray-300 font-medium">
          {message ?? "We couldn’t complete this. Your file wasn’t changed. Retrying typically resolves this."}
        </p>
      </div>
      <p className="text-sm font-normal text-gray-500 dark:text-gray-400 leading-relaxed mb-6">If it persists, try a smaller file or refresh the page.</p>
      <button type="button" onClick={onTryAgain} className="btn-primary">
        Retry
      </button>
    </div>
  )
}
