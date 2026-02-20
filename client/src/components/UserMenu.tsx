import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Sun, Moon, Clock, CreditCard, Mail, Gift } from 'lucide-react'
import { prefetchRoute } from '../lib/prefetch'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentUsage } from '../lib/api'
import { createBillingPortalSession } from '../lib/billing'
import { useTheme } from '../lib/theme'
import { isLoggedIn, logout } from '../lib/auth'

const tools = [
  { name: 'Video → Transcript', path: '/video-to-transcript' },
  { name: 'Video → Subtitles', path: '/video-to-subtitles' },
  { name: 'Translate Subtitles', path: '/translate-subtitles' },
  { name: 'Fix Subtitles', path: '/fix-subtitles' },
  { name: 'Burn Subtitles', path: '/burn-subtitles' },
  { name: 'Compress Video', path: '/compress-video' },
  { name: 'Batch Processing', path: '/batch-process' },
]

const SUPPORT_EMAIL = 'support@videotext.io'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<{
    plan: string
    remaining: number
    totalPlanMinutes: number
    resetDate: string
    email?: string
  } | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    getCurrentUsage()
      .then((data) => {
        const total = data.limits.minutesPerMonth + data.overages.minutes
        setUsage({
          plan: (data.plan || 'free').toLowerCase(),
          remaining: data.usage.remaining,
          totalPlanMinutes: total,
          resetDate: data.resetDate,
          email: data.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('userEmail') || undefined : undefined),
        })
      })
      .catch(() => {
        const plan = typeof localStorage !== 'undefined' ? localStorage.getItem('plan') || 'free' : 'free'
        const email = typeof localStorage !== 'undefined' ? localStorage.getItem('userEmail') || undefined : undefined
        setUsage(plan ? { plan, remaining: 0, totalPlanMinutes: 0, resetDate: new Date().toISOString(), email } : null)
      })
  }, [open])

  const isPaidPlan = usage?.plan === 'basic' || usage?.plan === 'pro' || usage?.plan === 'agency'

  async function handleManageSubscription() {
    if (!isPaidPlan) return
    setPortalLoading(true)
    try {
      const { url } = await createBillingPortalSession(
        typeof window !== 'undefined' ? window.location.origin + '/pricing' : '/pricing'
      )
      window.location.href = url
    } catch {
      setPortalLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-gray-600 hover:text-violet-600 hover:bg-violet-50 dark:text-gray-300 dark:hover:text-violet-400 dark:hover:bg-violet-900/30 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 dark:bg-black/50"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm flex flex-col h-screen"
            >
              <aside
                data-user-menu-panel
                className="w-full h-full min-h-screen flex flex-col shadow-2xl border-l border-gray-200 dark:border-gray-600 isolate bg-white dark:bg-gray-800"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600 shrink-0 bg-white dark:bg-gray-800">
                  <span className="font-semibold text-gray-900 dark:text-white">Menu</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                <div data-user-menu-body className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6">
                {/* Account email (paid plans) */}
                {usage?.email && (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account</p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white break-all">{usage.email}</p>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 capitalize">{usage.plan} plan</p>
                  </div>
                )}

                {/* Minutes left — always show a block so content is visible */}
                {usage ? (
                  <div className="rounded-xl bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 p-4">
                    <div className="flex items-center gap-2 text-violet-800 dark:text-violet-200 text-sm font-medium">
                      <Clock className="w-4 h-4 shrink-0" />
                      Minutes left
                    </div>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      {usage.remaining} <span className="text-base font-normal text-gray-600 dark:text-gray-300">min remaining</span>
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {usage.plan} plan · Resets {new Date(usage.resetDate).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Minutes left</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
                  </div>
                )}

                {/* Manage subscription */}
                <div>
                  <button
                    type="button"
                    onClick={handleManageSubscription}
                    disabled={!isPaidPlan || portalLoading}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-300" />
                    <span>
                      {portalLoading ? 'Opening…' : isPaidPlan ? 'Manage subscription' : 'Manage subscription (upgrade first)'}
                    </span>
                  </button>
                </div>

                {/* Log in / Log out */}
                {isLoggedIn() || (typeof localStorage !== 'undefined' && localStorage.getItem('userId') && localStorage.getItem('userId') !== 'demo-user') ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      setOpen(false)
                      window.location.reload()
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span>Log out</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => prefetchRoute('/login')}
                    onFocus={() => prefetchRoute('/login')}
                  >
                    <span>Log in</span>
                  </Link>
                )}

                {/* Email support */}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <Mail className="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-300" />
                  <span>Email support</span>
                </a>

                {/* Refer and earn */}
                <Link
                  to="/refer"
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => prefetchRoute('/refer')}
                  onFocus={() => prefetchRoute('/refer')}
                >
                  <Gift className="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-300" />
                  <span>Refer and earn: 45 min free (Free, Basic, Pro)</span>
                </Link>

                {/* Theme toggle */}
                <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-gray-100 dark:bg-gray-700">
                  <span className="text-gray-900 dark:text-gray-100 font-medium">Theme</span>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 shadow-card hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                    aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                  >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    {theme === 'light' ? 'Dark' : 'Light'}
                  </button>
                </div>

                {/* Nav links (for mobile: Tools + Pricing + CTA) */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600 md:hidden">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Tools</p>
                  <div className="space-y-1">
                    {tools.map((t) => (
                      <Link
                        key={t.path}
                        to={t.path}
                        className="block rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={() => setOpen(false)}
                        onMouseEnter={() => prefetchRoute(t.path)}
                        onFocus={() => prefetchRoute(t.path)}
                      >
                        {t.name}
                      </Link>
                    ))}
                  </div>
                  <Link
                    to="/pricing"
                    className="mt-3 block rounded-xl px-4 py-3 text-center font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 border border-violet-300 dark:border-violet-700"
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => prefetchRoute('/pricing')}
                    onFocus={() => prefetchRoute('/pricing')}
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/pricing"
                    className="mt-2 block rounded-xl bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 text-center font-medium transition-colors"
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => prefetchRoute('/pricing')}
                    onFocus={() => prefetchRoute('/pricing')}
                  >
                    Try Free →
                  </Link>
                </div>
                </div>
              </aside>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
