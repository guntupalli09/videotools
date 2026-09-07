import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  DEFAULT_PRO_PRICING,
  fetchProPricing,
  getCachedProPricing,
  type ProPriceDisplay,
} from '../lib/pricingApi'

type PricingContextValue = {
  pricing: ProPriceDisplay
  loaded: boolean
}

const PricingContext = createContext<PricingContextValue>({
  pricing: DEFAULT_PRO_PRICING,
  loaded: false,
})

export function PricingProvider({ children }: { children: ReactNode }) {
  const [pricing, setPricing] = useState<ProPriceDisplay>(getCachedProPricing())
  const [loaded, setLoaded] = useState(Boolean(getCachedProPricing() !== DEFAULT_PRO_PRICING))

  useEffect(() => {
    let cancelled = false
    fetchProPricing().then((data) => {
      if (cancelled) return
      setPricing(data)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PricingContext.Provider value={{ pricing, loaded }}>
      {children}
    </PricingContext.Provider>
  )
}

export function useProPricing(): PricingContextValue {
  return useContext(PricingContext)
}
