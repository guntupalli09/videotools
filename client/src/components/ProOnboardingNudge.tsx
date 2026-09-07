import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Layers, Clock, Film, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentUsage } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { isPaidPlan } from '../lib/plans'
import { trackEvent } from '../lib/analytics'
import { trackAppEvent } from '../lib/feedbackEvents'

type Stage = 'day1' | 'day7'

const PRO_STARTED_KEY = 'videotext:pro_started_at'
const DISMISS_PREFIX = 'vt:pro-onboarding-'

const STAGE_WINDOWS: Record<Stage, { minHours: number; maxHours: number }> = {
  day1: { minHours: 24, maxHours: 36 },
  day7: { minHours: 168, maxHours: 216 },
}

const STAGE_CONTENT: Record<
  Stage,
  { title: string; body: string; features: { icon: typeof Layers; label: string; href: string }[] }
> = {
  day1: {
    title: 'Welcome to Pro — here’s what you unlocked',
    body: 'You now have unlimited imports, longer files, and professional workflows. Try these first:',
    features: [
      { icon: Layers, label: 'Batch process up to 20 videos', href: '/batch-process' },
      { icon: Clock, label: 'Upload videos up to 2 hours', href: '/video-to-transcript' },
      { icon: Film, label: 'Burn subtitles into your video', href: '/burn-subtitles' },
      { icon: Share2, label: 'Share read-only transcript links', href: '/video-to-transcript' },
    ],
  },
  day7: {
    title: 'Get more from your Pro plan',
    body: 'Power users combine these workflows — pick one to try this week:',
    features: [
      { icon: Layers, label: 'Batch → ZIP of SRTs for a whole folder', href: '/batch-process' },
      { icon: Film, label: 'Transcript → translate → burn-in delivery', href: '/translate-subtitles' },
      { icon: Clock, label: 'Long-form podcast or interview (2 h cap)', href: '/video-to-transcript' },
      { icon: Share2, label: 'Share a transcript link with your team', href: '/video-to-transcript' },
    ],
  },
}

function resolveProStartedAt(data: { billingPeriodStart?: string | null }): number | null {
  try {
    const stored = localStorage.getItem(PRO_STARTED_KEY)
    if (stored) {
      const ts = Number(stored)
      if (Number.isFinite(ts) && ts > 0) return ts
    }
  } catch {
    /* ignore */
  }
  if (data.billingPeriodStart) {
    const ts = new Date(data.billingPeriodStart).getTime()
    if (Number.isFinite(ts)) return ts
  }
  return null
}

function pickStage(hoursSinceStart: number): Stage | null {
  if (hoursSinceStart >= STAGE_WINDOWS.day1.minHours && hoursSinceStart < STAGE_WINDOWS.day1.maxHours) {
    return 'day1'
  }
  if (hoursSinceStart >= STAGE_WINDOWS.day7.minHours && hoursSinceStart < STAGE_WINDOWS.day7.maxHours) {
    return 'day7'
  }
  return null
}

export default function ProOnboardingNudge() {
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<Stage | null>(null)

  useEffect(() => {
    if (!isLoggedIn()) return
    let cancelled = false

    getCurrentUsage({ skipCache: true })
      .then((data) => {
        if (cancelled || !isPaidPlan(data.plan)) return

        const startedAt = resolveProStartedAt(data as { billingPeriodStart?: string | null })
        if (!startedAt) return

        const hoursSinceStart = (Date.now() - startedAt) / (1000 * 60 * 60)
        const nextStage = pickStage(hoursSinceStart)
        if (!nextStage) return

        try {
          if (sessionStorage.getItem(`${DISMISS_PREFIX}${nextStage}`) === '1') return
        } catch {
          return
        }

        sessionStorage.setItem(`${DISMISS_PREFIX}${nextStage}`, '1')
        setStage(nextStage)
        setOpen(true)

        const payload = { stage: nextStage, plan: data.plan, hours_since_pro_start: Math.round(hoursSinceStart) }
        try {
          trackEvent('pro_onboarding_nudge_seen', payload)
          trackAppEvent('pro_onboarding_nudge_seen', payload)
        } catch {
          /* non-blocking */
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  if (!stage) return null
  const content = STAGE_CONTENT[stage]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-lg rounded-xl bg-white p-7 shadow-xl dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-onboarding-title"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>

            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Pro tip · {stage === 'day1' ? 'Day 1' : 'Day 7'}
            </p>
            <h2 id="pro-onboarding-title" className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {content.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{content.body}</p>

            <ul className="mt-5 space-y-2">
              {content.features.map((feature) => {
                const Icon = feature.icon
                return (
                  <li key={feature.label}>
                    <Link
                      to={feature.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-600 dark:text-white dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                      {feature.label}
                    </Link>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full py-2 text-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Got it
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function rememberProStartedAt(): void {
  try {
    if (!localStorage.getItem(PRO_STARTED_KEY)) {
      localStorage.setItem(PRO_STARTED_KEY, String(Date.now()))
    }
  } catch {
    /* non-blocking */
  }
}
