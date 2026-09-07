import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import { validateReferralCode } from '../lib/api'

interface ReferralSignupBannerProps {
  search: string
}

/** Shown on signup when ?ref= is present and valid — sets expectation before account creation. */
export default function ReferralSignupBanner({ search }: ReferralSignupBannerProps) {
  const [state, setState] = useState<'loading' | 'valid' | 'hidden'>('loading')
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(search)
    const raw = params.get('ref')?.trim()
    if (!raw) {
      setState('hidden')
      return
    }
    let cancelled = false
    validateReferralCode(raw)
      .then((res) => {
        if (cancelled) return
        if (res.valid && res.code) {
          setCode(res.code)
          setState('valid')
        } else {
          setState('hidden')
        }
      })
      .catch(() => {
        if (!cancelled) setState('hidden')
      })
    return () => {
      cancelled = true
    }
  }, [search])

  if (state !== 'valid' || !code) return null

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex gap-3 items-start">
      <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden />
      <div className="text-sm text-emerald-900 dark:text-emerald-100">
        <p className="font-semibold">Referral applied — you&apos;ll get 3 bonus uploads</p>
        <p className="text-emerald-800/90 dark:text-emerald-200/90 mt-0.5 text-xs sm:text-sm">
          Code <span className="font-mono font-semibold">{code}</span> is active. When you create your account, you and your friend each receive 3 bonus uploads (used after your daily free imports).
        </p>
      </div>
    </div>
  )
}
