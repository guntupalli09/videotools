import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Sun, Moon, CreditCard, Mail, Gift, MessageCircle, KeyRound } from 'lucide-react'
import { prefetchRoute } from '../lib/prefetch'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentUsage } from '../lib/api'
import { isPaidPlan } from '../lib/plans'
import { createBillingPortalSession } from '../lib/billing'
import { useTheme } from '../lib/theme'
import { isLoggedIn, logout, isDemo } from '../lib/auth'
import { useFounderStatus } from '../hooks/useFounderStatus'
import { CORE_AI_TOOLS_NAV } from '../config/coreAiToolsNav'

const tools = [...CORE_AI_TOOLS_NAV]

const SUPPORT_EMAIL = 'support@videotext.io'
/** Set to true to re-enable referral program */
const SHOW_REFERRAL = true

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const [usage, setUsage] = useState<{
    plan: string
    email?: string
    quotaType?: 'imports' | 'minutes' | 'unlimited'
    dailyRemaining?: number
    bonusImportCredits?: number
    limit?: number
  } | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { isFounder, loading } = useFounderStatus()

  const refreshUsage = useCallback(() => {
    if (!isLoggedIn()) {
      setUsage(null)
      return
    }
    getCurrentUsage({ skipCache: true })
      .then((data) => {
        const isImports = data.quotaType === 'imports'
        const isUnlimited = data.quotaType === 'unlimited'
        setUsage({
          plan: (data.plan || 'free').toLowerCase(),
          email: data.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('userEmail') || undefined : undefined),
          quotaType: isImports ? 'imports' : isUnlimited ? 'unlimited' : 'minutes',
          dailyRemaining: isImports ? (data.dailyRemaining ?? Math.max(0, (data.limit ?? 3) - (data.used ?? 0))) : undefined,
          bonusImportCredits: isImports ? (data.bonusImportCredits ?? 0) : undefined,
          limit: isImports ? (data.limit ?? 3) : undefined,
        })
      })
      .catch(() => {
        if (!isLoggedIn()) {
          setUsage(null)
          return
        }
        const plan = typeof localStorage !== 'undefined' ? localStorage.getItem('plan') || 'free' : 'free'
        const email = typeof localStorage !== 'undefined' ? localStorage.getItem('userEmail') || undefined : undefined
        setUsage(plan ? { plan, email } : null)
      })
  }, [])

  useEffect(() => {
    refreshUsage()
  }, [open, refreshUsage])

  useEffect(() => {
    const onPlanUpdated = () => refreshUsage()
    const onLogout = () => setUsage(null)
    window.addEventListener('videotext:plan-updated', onPlanUpdated)
    window.addEventListener('videotext:logout', onLogout)
    return () => {
      window.removeEventListener('videotext:plan-updated', onPlanUpdated)
      window.removeEventListener('videotext:logout', onLogout)
    }
  }, [refreshUsage])

  const hasPaidPlan = isPaidPlan(usage?.plan)

  async function handleManageSubscription() {
    if (!hasPaidPlan) return
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
        className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
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
              className="fixed inset-0 z-40 bg-black/55"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ x: '100%', opacity: 1, scale: 0.98 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: '100%', opacity: 1, scale: 0.99 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.65 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm flex flex-col h-screen"
            >
              <aside
                data-user-menu-panel
                className="w-full h-full min-h-screen flex flex-col shadow-2xl border-l border-gray-200 dark:border-slate-700 isolate bg-white dark:bg-slate-900"
              >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-900">
                  <span className="font-semibold text-gray-900 dark:text-white">Menu</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="p-2 rounded-lg text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                </div>

                <div data-user-menu-body className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 bg-white dark:bg-slate-900">
                {/* Account email (paid plans) — only when logged in and not a demo session */}
                {isLoggedIn() && !isDemo() && usage?.email && (
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 p-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Account</p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white break-all">{usage.email}</p>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300 capitalize">{usage.plan} plan</p>
                  </div>
                )}

                {/* Quota left — hidden for demo sessions; imports for free, minutes for paid */}
                {!isLoggedIn() || isDemo() ? null : usage ? (
                  <div className="rounded-xl bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 p-4">
                    <div className="flex items-center gap-2 text-violet-800 dark:text-violet-200 text-sm font-medium">
                      {usage.quotaType === 'imports' ? 'Imports' : usage.quotaType === 'unlimited' ? 'Plan access' : 'Minutes'}
                    </div>
                    <p className="mt-2 text-base text-gray-900 dark:text-white">
                      {usage.quotaType === 'unlimited'
                        ? <span>No daily cap <span className="font-normal text-gray-600 dark:text-gray-300">on imports</span></span>
                        : usage.quotaType === 'imports'
                        ? (
                          <span className="font-normal">
                            {(usage.dailyRemaining ?? usage.limit ?? 3)} of {usage.limit ?? 3} daily imports
                            {(usage.bonusImportCredits ?? 0) > 0 && (
                              <> · <span className="text-emerald-700 dark:text-emerald-300">{usage.bonusImportCredits} bonus</span></>
                            )}
                          </span>
                        )
                        : <span className="font-normal">Minutes-based plan active</span>}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Quota</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Loading…</p>
                  </div>
                )}

                {/* Subscription management / upgrade — hidden for demo sessions */}
                {!isDemo() && (
                <div>
                  {hasPaidPlan ? (
                    <button
                      type="button"
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 bg-white/80 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 transition-colors border border-gray-200/80 dark:border-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard className="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-300" />
                      <span>{portalLoading ? 'Opening…' : 'Manage subscription'}</span>
                    </button>
                  ) : isLoggedIn() ? (
                    <Link
                      to="/pricing"
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => prefetchRoute('/pricing')}
                      onFocus={() => prefetchRoute('/pricing')}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/45 transition-colors border border-blue-200/80 dark:border-blue-700/70"
                    >
                      <CreditCard className="w-5 h-5 shrink-0" />
                      <span>Upgrade plan</span>
                    </Link>
                  ) : null}
                </div>
                )}

                {isLoggedIn() && !isDemo() && (
                  <Link
                    to="/settings/api-keys"
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => prefetchRoute('/settings/api-keys')}
                    onFocus={() => prefetchRoute('/settings/api-keys')}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                  >
                    <KeyRound className="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-300" />
                    <span>API Keys</span>
                  </Link>
                )}

                {!loading && isFounder && (
                  <Link
                    to="/founder"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => prefetchRoute('/founder')}
                    onFocus={() => prefetchRoute('/founder')}
                  >
                    <span>Founder</span>
                  </Link>
                )}

                {/* Log in / Log out */}
                {isLoggedIn() ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout()
                      setOpen(false)
                      window.location.replace('/')
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span>Log out</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => prefetchRoute('/login')}
                    onFocus={() => prefetchRoute('/login')}
                  >
                    <span>Log in</span>
                  </Link>
                )}

                {/* Share feedback */}
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => {
                    setOpen(false)
                    window.dispatchEvent(new CustomEvent('videotext:open-feedback'))
                  }}
                >
                  <MessageCircle className="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-300" />
                  <span>Share feedback</span>
                </button>

                {/* Email support */}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <Mail className="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-300" />
                  <span>Email support</span>
                </a>

                {SHOW_REFERRAL && (
                <Link
                  to="/refer"
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => prefetchRoute('/refer')}
                  onFocus={() => prefetchRoute('/refer')}
                >
                  <Gift className="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-300" />
                  <span>Refer and earn: 3 bonus uploads each</span>
                </Link>
                )}

                {/* Theme toggle */}
                <div className="flex items-center justify-between rounded-xl px-4 py-3 bg-white/85 dark:bg-slate-800/85 border border-gray-200/80 dark:border-slate-700/80">
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
                    className="mt-3 block rounded-xl px-4 py-3 text-center font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => prefetchRoute('/pricing')}
                    onFocus={() => prefetchRoute('/pricing')}
                  >
                    Pricing
                  </Link>
                  {!isLoggedIn() && (
                    <>
                      <Link
                        to="/login"
                        className="mt-2 block rounded-xl px-4 py-3 text-center font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                        onClick={() => setOpen(false)}
                        onMouseEnter={() => prefetchRoute('/login')}
                        onFocus={() => prefetchRoute('/login')}
                      >
                        Login
                      </Link>
                      <Link
                        to="/signup"
                        className="mt-2 block rounded-xl px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors"
                        onClick={() => setOpen(false)}
                        onMouseEnter={() => prefetchRoute('/signup')}
                        onFocus={() => prefetchRoute('/signup')}
                      >
                        Signup
                      </Link>
                    </>
                  )}
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
