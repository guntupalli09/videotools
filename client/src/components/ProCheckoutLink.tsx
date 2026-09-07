import { useState } from 'react'
import { useProPricing } from '../contexts/PricingContext'
import { startCheckout } from '../lib/startCheckout'

type Props = {
  source?: string
  className?: string
}

/** Inline Pro CTA that opens Stripe checkout (not /pricing). */
export default function ProCheckoutLink({ source = 'translate_subtitles', className }: Props) {
  const { pricing } = useProPricing()
  const [loading, setLoading] = useState(false)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      await startCheckout({
        returnToPath: window.location.pathname,
        attribution: {
          source,
          tool: 'translation',
          plan: 'free',
          billing_interval: 'monthly',
        },
      })
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className ?? 'text-blue-600 hover:underline disabled:opacity-60'}
    >
      {loading ? 'Opening checkout…' : `Unlock Pro — ${pricing.priceLabel}`}
    </button>
  )
}
