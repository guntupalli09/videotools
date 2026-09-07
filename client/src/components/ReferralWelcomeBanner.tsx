import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Gift, X } from 'lucide-react'
import { consumePendingReferralReward } from '../lib/referralReward'

/** One-time banner after signup when a referral reward was granted. */
export default function ReferralWelcomeBanner() {
  const { pathname } = useLocation()
  const [bonus, setBonus] = useState<number | null>(null)

  useEffect(() => {
    const pending = consumePendingReferralReward()
    if (pending) setBonus(pending)
  }, [])

  if (pathname.startsWith('/embed/') || !bonus) return null

  return (
    <div className="bg-emerald-600 text-white px-4 py-3 shadow-md" role="status" aria-live="polite">
      <div className="max-w-5xl mx-auto flex items-start sm:items-center gap-3">
        <Gift className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" aria-hidden />
        <p className="text-sm flex-1 leading-snug">
          <strong>Referral bonus unlocked:</strong> {bonus} extra uploads are on your account. Use your 3 daily free imports first — bonus uploads kick in automatically after that.
          {' '}
          <Link to="/refer" className="underline font-semibold hover:text-emerald-100 whitespace-nowrap">
            Refer friends →
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setBonus(null)}
          className="shrink-0 p-1 rounded hover:bg-emerald-500/80 transition-colors"
          aria-label="Dismiss referral bonus message"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
