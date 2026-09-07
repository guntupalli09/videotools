import { useEffect, useRef, useState } from 'react'
import { getCurrentUsage } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { isPaidPlan } from '../lib/plans'
import { hasSubmittedCancellationReason } from '../lib/cancellationFeedback'
import CancellationReasonModal from './CancellationReasonModal'

/** Prompt for cancel reason when user returns with cancel-at-period-end active. */
export default function CancellationReturnSurvey() {
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState<string>('pro')
  const checked = useRef(false)

  useEffect(() => {
    if (!isLoggedIn() || checked.current) return
    if (hasSubmittedCancellationReason('post_cancel')) return

    let cancelled = false
    getCurrentUsage({ skipCache: true })
      .then((data) => {
        if (cancelled || !isPaidPlan(data.plan)) return
        const cancelAtPeriodEnd = (data as { cancelAtPeriodEnd?: boolean }).cancelAtPeriodEnd
        if (!cancelAtPeriodEnd) return
        checked.current = true
        setPlan(data.plan)
        setOpen(true)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onPlanUpdated = () => {
      if (hasSubmittedCancellationReason('post_cancel')) return
      getCurrentUsage({ skipCache: true })
        .then((data) => {
          if (!isPaidPlan(data.plan)) return
          const cancelAtPeriodEnd = (data as { cancelAtPeriodEnd?: boolean }).cancelAtPeriodEnd
          if (cancelAtPeriodEnd && !checked.current) {
            checked.current = true
            setPlan(data.plan)
            setOpen(true)
          }
        })
        .catch(() => {})
    }
    window.addEventListener('videotext:plan-updated', onPlanUpdated)
    return () => window.removeEventListener('videotext:plan-updated', onPlanUpdated)
  }, [])

  return (
    <CancellationReasonModal
      open={open}
      timing="post_cancel"
      plan={plan}
      onClose={() => setOpen(false)}
      onComplete={() => setOpen(false)}
    />
  )
}
