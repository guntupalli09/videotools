import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { User, X, Sun, Moon, CreditCard, Mail, Gift, MessageCircle, KeyRound } from 'lucide-react'
import { prefetchRoute } from '../lib/prefetch'
import { motion, AnimatePresence } from 'framer-motion'
import { getCurrentUsage } from '../lib/api'
import { isPaidPlan } from '../lib/plans'
import { createBillingPortalSession } from '../lib/billing'
import { useTheme } from '../lib/theme'
import { isLoggedIn, logout, isDemo } from '../lib/auth'
import { useFounderStatus } from '../hooks/useFounderStatus'
import CancellationReasonModal from './CancellationReasonModal'
import { hasSubmittedCancellationReason } from '../lib/cancellationFeedback'

const SUPPORT_EMAIL = 'support@videotext.io'
/** Set to true to re-enable referral program */
const SHOW_REFERRAL = true

function MenuRow({
  children,
  className = '',
  ...props
}: React.ComponentProps<'button'> & { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-white/85 transition-colors hover:bg-white/[0.06] ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function MenuLink({
  to,
  children,
  onNavigate,
  className = '',
}: {
  to: string
  children: React.ReactNode
  onNavigate: () => void
  className?: string
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      onMouseEnter={() => prefetchRoute(to)}
      onFocus={() => prefetchRoute(to)}
      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-white/85 transition-colors hover:bg-white/[0.06] ${className}`}
    >
      {children}
    </Link>
  )
}

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
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false)
  const [pendingPortalRedirect, setPendingPortalRedirect] = useState(false)
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

  async function openBillingPortal() {
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

  async function handleManageSubscription() {
    if (!hasPaidPlan) return
    setOpen(false)
    if (hasSubmittedCancellationReason('pre_portal')) {
      await openBillingPortal()
      return
    }
    setPendingPortalRedirect(true)
    setCancelReasonOpen(true)
  }

  async function finishManageSubscriptionFlow() {
    setCancelReasonOpen(false)
    if (pendingPortalRedirect) {
      setPendingPortalRedirect(false)
      await openBillingPortal()
    }
  }

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        aria-label="Open account menu"
      >
        <User className="h-6 w-6" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[72] bg-black/60"
              onClick={close}
              aria-hidden
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.65 }}
              data-user-menu-panel
              className="fixed top-0 right-0 bottom-0 z-[73] flex w-full max-w-sm flex-col border-l border-white/[0.08] bg-gray-950 shadow-2xl"
              aria-label="Account menu"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
                <span className="font-display text-base font-semibold text-white">Account</span>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
                  aria-label="Close account menu"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>

              <div data-user-menu-body className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4">
                {isLoggedIn() && !isDemo() && usage?.email && (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Signed in</p>
                    <p className="mt-1 break-all text-sm text-white">{usage.email}</p>
                    <p className="mt-0.5 text-xs capitalize text-white/55">{usage.plan} plan</p>
                  </div>
                )}

                {!isLoggedIn() || isDemo() ? null : usage ? (
                  <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
                      {usage.quotaType === 'imports' ? 'Imports' : usage.quotaType === 'unlimited' ? 'Plan access' : 'Minutes'}
                    </div>
                    <p className="mt-2 text-sm text-white/90">
                      {usage.quotaType === 'unlimited' ? (
                        <span>
                          No daily cap <span className="text-white/55">on imports</span>
                        </span>
                      ) : usage.quotaType === 'imports' ? (
                        <span>
                          {(usage.dailyRemaining ?? usage.limit ?? 3)} of {usage.limit ?? 3} daily imports
                          {(usage.bonusImportCredits ?? 0) > 0 && (
                            <>
                              {' '}
                              · <span className="text-blue-200">{usage.bonusImportCredits} bonus</span>
                            </>
                          )}
                        </span>
                      ) : (
                        <span>Minutes-based plan active</span>
                      )}
                    </p>
                  </div>
                ) : isLoggedIn() && !isDemo() ? (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                    <p className="text-sm font-medium text-white/80">Quota</p>
                    <p className="mt-1 text-sm text-white/55">Loading…</p>
                  </div>
                ) : null}

                {!isDemo() && (
                  <div>
                    {hasPaidPlan ? (
                      <MenuRow
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                        className="border border-white/[0.08] bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CreditCard className="h-5 w-5 shrink-0 text-white/55" />
                        <span>{portalLoading ? 'Opening…' : 'Manage subscription'}</span>
                      </MenuRow>
                    ) : isLoggedIn() ? (
                      <MenuLink
                        to="/pricing"
                        onNavigate={close}
                        className="border border-blue-500/30 bg-blue-600/15 font-semibold text-blue-200 hover:bg-blue-600/25"
                      >
                        <CreditCard className="h-5 w-5 shrink-0" />
                        <span>Upgrade plan</span>
                      </MenuLink>
                    ) : null}
                  </div>
                )}

                {isLoggedIn() && !isDemo() && (
                  <MenuLink to="/settings/api-keys" onNavigate={close}>
                    <KeyRound className="h-5 w-5 shrink-0 text-white/55" />
                    <span>API Keys</span>
                  </MenuLink>
                )}

                {!loading && isFounder && (
                  <MenuLink to="/founder" onNavigate={close}>
                    <span>Founder</span>
                  </MenuLink>
                )}

                {isLoggedIn() ? (
                  <MenuRow
                    onClick={() => {
                      logout()
                      close()
                      window.location.replace('/')
                    }}
                  >
                    <span>Log out</span>
                  </MenuRow>
                ) : (
                  <MenuLink to="/login" onNavigate={close}>
                    <span>Log in</span>
                  </MenuLink>
                )}

                <MenuRow
                  onClick={() => {
                    close()
                    window.dispatchEvent(new CustomEvent('videotext:open-feedback'))
                  }}
                >
                  <MessageCircle className="h-5 w-5 shrink-0 text-white/55" />
                  <span>Share feedback</span>
                </MenuRow>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-white/85 transition-colors hover:bg-white/[0.06]"
                  onClick={close}
                >
                  <Mail className="h-5 w-5 shrink-0 text-white/55" />
                  <span>Email support</span>
                </a>

                {SHOW_REFERRAL && (
                  <MenuLink to="/refer" onNavigate={close}>
                    <Gift className="h-5 w-5 shrink-0 text-white/55" />
                    <span>Refer and earn: 3 bonus uploads each</span>
                  </MenuLink>
                )}

                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-sm font-medium text-white/85">Theme</span>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/[0.1]"
                    aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                  >
                    {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    {theme === 'light' ? 'Dark' : 'Light'}
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CancellationReasonModal
        open={cancelReasonOpen}
        timing="pre_portal"
        plan={usage?.plan ?? 'pro'}
        onClose={() => {
          setCancelReasonOpen(false)
          setPendingPortalRedirect(false)
        }}
        onComplete={finishManageSubscriptionFlow}
      />
    </>
  )
}
