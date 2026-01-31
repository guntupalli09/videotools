import { useEffect, useState } from 'react'
import { getCurrentUsage } from '../lib/api'

const PLAN_LABELS: Record<string, string> = {
  free: 'Free plan',
  basic: 'Basic plan',
  pro: 'Pro plan',
  agency: 'Agency plan',
}

const PLAN_STYLES: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700 border-gray-300',
  basic: 'bg-violet-50 text-violet-700 border-violet-200',
  pro: 'bg-violet-100 text-violet-800 border-violet-300',
  agency: 'bg-amber-50 text-amber-800 border-amber-200',
}

export default function PlanBadge() {
  const [plan, setPlan] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUsage()
      .then((data) => {
        if (cancelled) return
        setPlan((data.plan || 'free').toLowerCase())
      })
      .catch(() => {
        if (cancelled) return
        const stored = (localStorage.getItem('plan') || 'free').toLowerCase()
        setPlan(stored)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!plan) return null

  const label = PLAN_LABELS[plan] || PLAN_LABELS.free
  const style = PLAN_STYLES[plan] || PLAN_STYLES.free

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${style}`}
      aria-label={`Current plan: ${label}`}
    >
      {label}
    </span>
  )
}
