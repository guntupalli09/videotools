interface OverageModalProps {
  isOpen: boolean
  onClose: () => void
  minutesUsed: number
  minutesLimit: number
  onBuyOverage?: () => void
  onUpgrade?: () => void
}

export default function OverageModal({
  isOpen,
  onClose,
  minutesUsed,
  minutesLimit,
  onBuyOverage,
  onUpgrade,
}: OverageModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-w-md rounded-2xl bg-white p-6 shadow-card-elevated">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          You&apos;ve used {minutesUsed}/{minutesLimit} minutes this month
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Choose how you want to continue:
        </p>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <button
            onClick={onBuyOverage}
            disabled={!onBuyOverage}
            className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-left text-sm hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-semibold">Buy 100 more minutes</div>
            <div className="text-xs text-gray-500">$5 one-time</div>
          </button>
          <button
            onClick={onUpgrade}
            disabled={!onUpgrade}
            className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-left text-sm text-violet-900 hover:border-violet-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-semibold">Upgrade your plan</div>
            <div className="text-xs text-gray-600">More minutes and higher limits</div>
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Or wait until next month when your minutes reset.
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  )
}

