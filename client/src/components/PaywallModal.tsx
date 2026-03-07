import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentUsage } from '../lib/api'

interface PaywallModalProps {
  isOpen: boolean
  onClose: () => void
  usedMinutes?: number
  availableMinutes?: number
  onBuyOverage?: () => void
  onUpgrade?: () => void
}

export default function PaywallModal({
  isOpen,
  onClose,
  usedMinutes: propUsed,
  availableMinutes: propAvailable,
  onBuyOverage,
  onUpgrade,
}: PaywallModalProps) {
  const [usage, setUsage] = useState<{ used: number; available: number } | null>(null)

  const [quotaType, setQuotaType] = useState<'imports' | 'minutes'>('minutes')
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    getCurrentUsage()
      .then((data) => {
        if (cancelled) return
        const isImports = data.quotaType === 'imports'
        setQuotaType(isImports ? 'imports' : 'minutes')
        if (isImports) {
          const used = data.used ?? data.usage?.importCount ?? 0
          const limit = data.limit ?? 3
          setUsage({ used, available: limit })
        } else {
          const available = data.limits.minutesPerMonth + data.overages.minutes
          setUsage({
            used: data.usage.totalMinutes,
            available,
          })
        }
      })
      .catch(() => {
        if (cancelled) return
        setUsage({
          used: propUsed ?? 0,
          available: propAvailable ?? 0,
        })
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, propUsed, propAvailable])

  const usedMinutes = usage?.used ?? propUsed ?? 0
  const availableMinutes = usage?.available ?? propAvailable ?? 0

  if (!isOpen) return null

  const isImportsQuota = quotaType === 'imports'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl p-8 max-w-lg w-full"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Upgrade to continue</h2>
          <p className="text-gray-600 mb-6">
            {isImportsQuota
              ? "You've used all 3 free imports this month. They reset on the 1st — or upgrade now for unlimited access."
              : `You've used ${usedMinutes} of ${availableMinutes} minutes this billing cycle.`}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={onBuyOverage}
              disabled={!onBuyOverage || isImportsQuota}
              className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-left hover:border-violet-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold text-gray-800 mb-1">Buy 100 more minutes</div>
              <div className="text-sm text-gray-500">$3 one-time, applies this cycle</div>
            </button>

            <button
              onClick={onUpgrade}
              disabled={!onUpgrade}
              className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-left hover:border-violet-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-semibold text-gray-800 mb-1">Upgrade your plan</div>
              <div className="text-sm text-gray-500">More minutes and higher limits</div>
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            {isImportsQuota
              ? 'Free plan includes 3 imports per month, resetting on the 1st. Upgrade for unlimited usage.'
              : 'Or wait until the next billing cycle when your minutes reset.'}
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
