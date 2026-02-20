import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { trackEvent, identifyUser, capturePageview } from './lib/analytics'
import { Toaster, toast } from 'react-hot-toast'
import Navigation from './components/Navigation'
import Breadcrumb from './components/Breadcrumb'
import { getSessionDetails, setupPassword } from './lib/billing'
import Footer from './components/Footer'
import Seo from './components/Seo'
import { ROUTE_SEO, ROUTE_BREADCRUMB, getOrganizationJsonLd, getWebApplicationJsonLd, getFaqJsonLd, getFaqJsonLdFromItems, getBreadcrumbJsonLd } from './lib/seoMeta'
import { getSeoEntry, getAllSeoPaths } from './lib/seoRegistry'
import SessionErrorBoundary from './components/SessionErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
import { WorkflowProvider } from './contexts/WorkflowContext'
import { TexAgent } from './components/TexAgent'
import TexErrorBoundary from './components/TexAgent/TexErrorBoundary'

// Lazy-load pages for fast initial load on any device; each route loads only when visited.
const Home = lazy(() => import('./pages/Home'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Refer = lazy(() => import('./pages/Refer'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Faq = lazy(() => import('./pages/Faq'))
const Guide = lazy(() => import('./pages/Guide'))
const Terms = lazy(() => import('./pages/Terms'))
const VideoToTranscript = lazy(() => import('./pages/VideoToTranscript'))
const VideoToSubtitles = lazy(() => import('./pages/VideoToSubtitles'))
const BatchProcess = lazy(() => import('./pages/BatchProcess'))
const TranslateSubtitles = lazy(() => import('./pages/TranslateSubtitles'))
const FixSubtitles = lazy(() => import('./pages/FixSubtitles'))
const BurnSubtitles = lazy(() => import('./pages/BurnSubtitles'))
const CompressVideo = lazy(() => import('./pages/CompressVideo'))
const SeoToolPage = lazy(() => import('./pages/SeoToolPage'))
const FeedbackView = lazy(() => import('./pages/FeedbackView'))
const NotFound = lazy(() => import('./pages/NotFound'))

/** Minimal loading fallback for route chunks — fast, accessible, no layout shift. */
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite" aria-label="Loading">
      <p className="text-violet-600 font-medium">Loading…</p>
    </div>
  )
}

/** Wraps route content with 200ms fade+translate on route change (CSS only). */
function RouteTransitionLayout() {
  const { pathname } = useLocation()
  return (
    <div key={pathname} className="route-transition-enter">
      <Outlet />
    </div>
  )
}

function AppSeo() {
  const { pathname } = useLocation()
  const hasRoute = pathname in ROUTE_SEO
  const meta = ROUTE_SEO[pathname] || {
    title: 'Page not found',
    description: "The page you're looking for doesn't exist or has been moved.",
  }
  const isHome = pathname === '/'
  const is404 = !hasRoute
  const breadcrumb = ROUTE_BREADCRUMB[pathname]
  const seoEntry = getSeoEntry(pathname)
  const jsonLd = is404
    ? undefined
    : isHome
      ? [getOrganizationJsonLd(), getWebApplicationJsonLd()]
      : pathname === '/faq'
        ? [getFaqJsonLd()]
        : breadcrumb
          ? seoEntry?.faq?.length
            ? [getBreadcrumbJsonLd(pathname, breadcrumb), getFaqJsonLdFromItems(seoEntry.faq)]
            : [getBreadcrumbJsonLd(pathname, breadcrumb)]
          : undefined
  useEffect(() => {
    try {
      capturePageview(pathname) // feeds Web analytics dashboard (visitors, page views, sessions)
      trackEvent('page_viewed', { pathname })
    } catch {
      // non-blocking
    }
  }, [pathname])
  return (
    <Seo
      title={meta.title}
      description={meta.description}
      canonicalPath={is404 ? '/' : pathname}
      jsonLd={jsonLd}
      noindex={is404}
    />
  )
}

/** After Stripe checkout success: set identity (userId, plan), then prompt to set password so user can log in later. */
function PostCheckoutHandler() {
  const { search, pathname } = useLocation()
  const navigate = useNavigate()
  const handled = useRef(false)
  const cancelled = useRef(false)
  const [setPasswordPending, setSetPasswordPending] = useState<{ token: string; plan: string } | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(search)
    const paymentSuccess = params.get('payment') === 'success'
    const sessionId = params.get('session_id')
    if (!paymentSuccess || !sessionId || handled.current) return

    cancelled.current = false
    const run = async (retries = 2) => {
      try {
        const data = await getSessionDetails(sessionId)
        if (cancelled.current) return
        localStorage.setItem('userId', data.userId)
        localStorage.setItem('plan', data.plan.toLowerCase())
        if (data.email) localStorage.setItem('userEmail', data.email)
        handled.current = true
        try {
          identifyUser(data.userId, { plan: data.plan.toLowerCase(), email: data.email })
          trackEvent('plan_upgraded', { plan: data.plan.toLowerCase() })
        } catch {
          // non-blocking
        }
        if (data.passwordSetupToken) {
          setSetPasswordPending({ token: data.passwordSetupToken, plan: data.plan })
        } else {
          navigate(pathname, { replace: true })
          toast.success(`Welcome! You're now on the ${data.plan} plan.`)
        }
      } catch {
        if (cancelled.current) return
        if (retries > 0) {
          setTimeout(() => run(retries - 1), 2000)
        } else {
          toast.error('Could not load your plan. Refresh the page or go to Pricing.')
        }
      }
    }
    run()
    return () => { cancelled.current = true }
  }, [search, pathname, navigate])

  const finishCheckout = (showWelcomeToast = false) => {
    const plan = setPasswordPending?.plan
    setSetPasswordPending(null)
    setPassword('')
    setConfirmPassword('')
    setPasswordError('')
    navigate(pathname, { replace: true })
    if (showWelcomeToast && plan) {
      toast.success(`Welcome! You're now on the ${plan} plan.`)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    if (!setPasswordPending) return
    setSubmitting(true)
    try {
      await setupPassword(setPasswordPending.token, password)
      toast.success('Password set. You can log in anytime from the menu.')
      finishCheckout(false)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to set password.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    finishCheckout(true)
  }

  if (setPasswordPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="set-password-title">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6">
          <h2 id="set-password-title" className="text-lg font-semibold text-gray-900 dark:text-white">Set your password</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            So you can log in later and access your plan from any device.
          </p>
          <form onSubmit={handleSetPassword} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password (min 8 characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              autoComplete="new-password"
              minLength={8}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              autoComplete="new-password"
            />
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {submitting ? 'Setting…' : 'Set password'}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return null
}

function App() {
  return (
    <BrowserRouter>
      <WorkflowProvider>
      <AppSeo />
      <PostCheckoutHandler />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        <Navigation />
        <OfflineBanner />
        <main id="main" className="flex-grow" role="main">
          <Breadcrumb />
          <SessionErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
            <Route element={<RouteTransitionLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/feedback" element={<FeedbackView />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/video-to-transcript" element={<VideoToTranscript />} />
            <Route path="/video-to-subtitles" element={<VideoToSubtitles />} />
            <Route path="/batch-process" element={<BatchProcess />} />
            <Route path="/translate-subtitles" element={<TranslateSubtitles />} />
            <Route path="/fix-subtitles" element={<FixSubtitles />} />
            <Route path="/burn-subtitles" element={<BurnSubtitles />} />
            <Route path="/compress-video" element={<CompressVideo />} />
            {/* SEO utility routes: registry-driven; same tools, alternate URLs. No backend or behavior change. */}
            {getAllSeoPaths().map((path) => (
              <Route key={path} path={path} element={<SeoToolPage />} />
            ))}
            <Route path="*" element={<NotFound />} />
            </Route>
              </Routes>
            </Suspense>
          </SessionErrorBoundary>
        </main>
        <Footer />
        <TexErrorBoundary>
          <TexAgent />
        </TexErrorBoundary>
        <Toaster position="top-right" />
      </div>
      </WorkflowProvider>
    </BrowserRouter>
  )
}

export default App
