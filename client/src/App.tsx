import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { trackEvent, identifyUser, capturePageview, startAdBlockProbe } from './lib/analytics'
import { Toaster, toast } from 'react-hot-toast'
import Navigation from './components/Navigation'
import { getSessionDetails, getSessionStatus, setupPassword } from './lib/billing'
import { clearPendingCheckout } from './lib/startCheckout'
import CheckoutCancelledHandler from './components/CheckoutCancelledHandler'
import CancellationReturnSurvey from './components/CancellationReturnSurvey'
import ProOnboardingNudge, { rememberProStartedAt } from './components/ProOnboardingNudge'
import { invalidateUsageCache } from './lib/api'
import Footer from './components/Footer'
import Seo from './components/Seo'
import { ROUTE_SEO, ROUTE_BREADCRUMB, getOrganizationJsonLd, getWebApplicationJsonLd, getFaqJsonLd, getFaqJsonLdFromItems, getBreadcrumbJsonLd, getBlogPostingJsonLd, getAeoJsonLd, BLOG_POST_DATES } from './lib/seoMeta'
import { getCoreToolFaq } from './lib/coreToolSeoDepth'
import { getCanonicalPathForRoute } from './lib/primaryUrls'
import { getSeoEntry, getAllSeoPaths } from './lib/seoRegistry'
import SessionErrorBoundary from './components/SessionErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
import ReferralWelcomeBanner from './components/ReferralWelcomeBanner'
// import { WorkflowProvider } from './contexts/WorkflowContext'
// import { WorkflowTracker } from './components/workflow/WorkflowTracker'
// import { TexAgent } from './components/TexAgent'
// import TexErrorBoundary from './components/TexAgent/TexErrorBoundary'
import FeedbackOrchestrator from './components/feedbackSystem/FeedbackOrchestrator'
import { trackAppEvent } from './lib/feedbackEvents'
import { getLifetimeSessionCount, getSessionId, isNewSession, clearNewSessionFlag } from './lib/sessionTracking'
import { captureReferralFromUrl } from './lib/referral'
import { incrementSessionsSinceFeedback } from './hooks/useFeedbackFrequency'
import { PricingProvider } from './contexts/PricingContext'

// Lazy-load pages for fast initial load on any device; each route loads only when visited.
const Home = lazy(() => import('./pages/Home'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Login = lazy(() => import('./pages/Login'))
const Demo = lazy(() => import('./pages/Demo'))
const TranscriptResultWorkspaceMock = lazy(() => import('./pages/TranscriptResultWorkspaceMock'))
const Signup = lazy(() => import('./pages/Signup'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const MagicLogin = lazy(() => import('./pages/MagicLogin'))
const Refer = lazy(() => import('./pages/Refer'))
const ApiKeysSettings = lazy(() => import('./pages/ApiKeysSettings'))
const ApiDocs = lazy(() => import('./pages/ApiDocs'))
const ZapierIntegration = lazy(() => import('./pages/ZapierIntegration'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Faq = lazy(() => import('./pages/Faq'))
const Guide = lazy(() => import('./pages/Guide'))
const Terms = lazy(() => import('./pages/Terms'))
const VoiceRecorder = lazy(() => import('./pages/VoiceRecorder'))
const VideoToTranscript = lazy(() => import('./pages/VideoToTranscript'))
const GuidelineFormat = lazy(() => import('./pages/GuidelineFormat'))
const VideoToSubtitles = lazy(() => import('./pages/VideoToSubtitles'))
const TranslateSubtitles = lazy(() => import('./pages/TranslateSubtitles'))
const FixSubtitles = lazy(() => import('./pages/FixSubtitles'))
const BurnSubtitles = lazy(() => import('./pages/BurnSubtitles'))
const CompressVideo = lazy(() => import('./pages/CompressVideo'))
const SeoToolPage = lazy(() => import('./pages/SeoToolPage'))
const FeedbackView = lazy(() => import('./pages/FeedbackView'))
const SurveyPage = lazy(() => import('./pages/SurveyPage'))
const FounderDashboard = lazy(() => import('./pages/founder/FounderDashboard'))
const Changelog = lazy(() => import('./pages/Changelog'))
import BlogRoute from './components/BlogRoute'
const Compare = lazy(() => import('./pages/Compare'))
const AlternativesHub = lazy(() => import('./pages/AlternativesHub'))
const TranscriptionToolsHub = lazy(() => import('./pages/TranscriptionToolsHub'))
const DescriptAlternative = lazy(() => import('./pages/seo/DescriptAlternativePage'))
const OtterAiAlternative = lazy(() => import('./pages/seo/OtterAiAlternativePage'))
const TrintAlternative = lazy(() => import('./pages/seo/TrintAlternativePage'))
const RevAlternative = lazy(() => import('./pages/seo/RevAlternativePage'))
const HappyScribeAlternative = lazy(() => import('./pages/seo/HappyScribeAlternativePage'))
const SonixAlternative = lazy(() => import('./pages/seo/SonixAlternativePage'))
const EasyScribeAlternative = lazy(() => import('./pages/seo/EasyScribeAlternativePage'))
const ZoomAlternative = lazy(() => import('./pages/seo/ZoomAlternativePage'))
const MicrosoftTeamsAlternative = lazy(() => import('./pages/seo/MicrosoftTeamsAlternativePage'))
const CapCutAlternative = lazy(() => import('./pages/seo/CapCutAlternativePage'))
const NottaAlternative = lazy(() => import('./pages/seo/NottaAlternativePage'))
const PanoptoAlternative = lazy(() => import('./pages/seo/PanoptoAlternativePage'))
const MacWhisperAlternative = lazy(() => import('./pages/seo/MacWhisperAlternativePage'))
const DeepgramAlternative = lazy(() => import('./pages/seo/DeepgramAlternativePage'))
const TactiqAlternative = lazy(() => import('./pages/seo/TactiqAlternativePage'))
const FirefliesAlternative = lazy(() => import('./pages/seo/FirefliesAlternativePage'))
const About = lazy(() => import('./pages/AboutPage'))
const Open = lazy(() => import('./pages/Open'))
const Samples = lazy(() => import('./pages/Samples'))
const TranscriptionBenchmark = lazy(() => import('./pages/TranscriptionBenchmark'))
const AccuracyTest = lazy(() => import('./pages/AccuracyTest'))
const BestTranscriptionTool = lazy(() => import('./pages/BestTranscriptionTool'))
const FastestTranscriptionSoftware = lazy(() => import('./pages/FastestTranscriptionSoftware'))
const FastestTranscriptionTool = lazy(() => import('./pages/FastestTranscriptionTool'))
const OtterVsVideoText = lazy(() => import('./pages/OtterVsVideoText'))
const DescriptVsVideoText = lazy(() => import('./pages/DescriptVsVideoText'))
const AiTranscriptionTools = lazy(() => import('./pages/AiTranscriptionTools'))
const VideoTextVsTurboScribe = lazy(() => import('./pages/VideoTextVsTurboScribe'))
const TurboScribeAlternative = lazy(() => import('./pages/TurboScribeAlternative'))
const VideoTextVsRev = lazy(() => import('./pages/VideoTextVsRev'))
const TemiVsVideoText = lazy(() => import('./pages/TemiVsVideoText'))
const BestOtterAlternatives = lazy(() => import('./pages/BestOtterAlternatives'))
const BestDescriptAlternatives = lazy(() => import('./pages/BestDescriptAlternatives'))
const AiTranscriptionWorkflow = lazy(() => import('./pages/AiTranscriptionWorkflow'))
const PodcastTranscriptionTool = lazy(() => import('./pages/PodcastTranscriptionTool'))
const InterviewTranscriptionTool = lazy(() => import('./pages/InterviewTranscriptionTool'))
// const YoutubeTranscriptGenerator = lazy(() => import('./pages/YoutubeTranscriptGenerator'))
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'))
const JoinFoundingTeam = lazy(() => import('./pages/JoinFoundingTeam'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Status = lazy(() => import('./pages/Status'))
const ShareTranscript = lazy(() => import('./pages/ShareTranscript'))
const EmbedTranscript = lazy(() => import('./pages/EmbedTranscript'))
// Free tools — client-side only, zero server dependency
const FreeToolsIndex = lazy(() => import('./pages/tools/FreeToolsIndex'))
const SrtToVtt = lazy(() => import('./pages/tools/SrtToVtt'))
const VttToSrt = lazy(() => import('./pages/tools/VttToSrt'))
const ShiftSubtitleTiming = lazy(() => import('./pages/tools/ShiftSubtitleTiming'))
const MergeSrtFiles = lazy(() => import('./pages/tools/MergeSrtFiles'))
const SrtToText = lazy(() => import('./pages/tools/SrtToText'))
const SubtitleValidator = lazy(() => import('./pages/tools/SubtitleValidator'))
const SubtitleReadingSpeed = lazy(() => import('./pages/tools/SubtitleReadingSpeed'))
const SubtitleCharacterChecker = lazy(() => import('./pages/tools/SubtitleCharacterChecker'))
const SubtitleWordCounter = lazy(() => import('./pages/tools/SubtitleWordCounter'))
const VideoScriptTimer = lazy(() => import('./pages/tools/VideoScriptTimer'))
const WordsPerMinute = lazy(() => import('./pages/tools/WordsPerMinute'))
const VideoBitrateCalculator = lazy(() => import('./pages/tools/VideoBitrateCalculator'))
const AspectRatioCalculator = lazy(() => import('./pages/tools/AspectRatioCalculator'))
const TimestampConverter = lazy(() => import('./pages/tools/TimestampConverter'))
const VideoMetadataViewer = lazy(() => import('./pages/tools/VideoMetadataViewer'))
const SubtitleToolsHub = lazy(() => import('./pages/tools/SubtitleToolsHub'))
const SubtitleResources = lazy(() => import('./pages/SubtitleResources'))
// Format converter tools — client-side only, zero server dependency
const SbvToSrt = lazy(() => import('./pages/tools/SbvToSrt'))
const SrtToSbv = lazy(() => import('./pages/tools/SrtToSbv'))
const AssToSrt = lazy(() => import('./pages/tools/AssToSrt'))
const TtmlToSrt = lazy(() => import('./pages/tools/TtmlToSrt'))
const HtmlToSrt = lazy(() => import('./pages/tools/HtmlToSrt'))

/** Minimal loading fallback for route chunks — fast, accessible, no layout shift. */
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite" aria-label="Loading">
      <p className="text-blue-600 font-medium">Loading…</p>
    </div>
  )
}

/** Wraps route content with 200ms fade+translate on route change (CSS only). */
function RouteTransitionLayout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <div key={pathname} className="route-transition-enter w-full min-w-0">
      <Outlet />
    </div>
  )
}

function LowercaseRedirect() {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    if (pathname !== pathname.toLowerCase()) {
      navigate(pathname.toLowerCase() + search + hash, { replace: true })
    }
  }, [pathname, search, hash, navigate])
  return null
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
  const isBlogPost = pathname.startsWith('/blog/') && pathname !== '/blog'
  const breadcrumb = ROUTE_BREADCRUMB[pathname]
  const seoEntry = getSeoEntry(pathname)

  // Blog post schemas + og:article meta
  const blogPostDates = isBlogPost ? BLOG_POST_DATES[pathname] : undefined
  const articleMeta = blogPostDates
    ? { publishedTime: `${blogPostDates.datePublished}T00:00:00Z`, modifiedTime: `${blogPostDates.dateModified}T00:00:00Z` }
    : undefined
  const blogPostingSchema = isBlogPost ? getBlogPostingJsonLd(pathname, meta.title, meta.description) : null

  const dedupeAndMergeFaqSchemas = (schemas: object[]): object[] => {
    const mergedFaqEntities: Array<Record<string, unknown>> = []
    const nonFaqSchemas: object[] = []
    const seenFaqKeys = new Set<string>()

    for (const schema of schemas) {
      const typedSchema = schema as { [key: string]: unknown }
      if (typedSchema['@type'] === 'FAQPage') {
        const entities = Array.isArray(typedSchema.mainEntity) ? typedSchema.mainEntity : []
        for (const entity of entities) {
          if (!entity || typeof entity !== 'object') continue
          const q = (entity as { name?: unknown }).name
          const text = (entity as { acceptedAnswer?: { text?: unknown } }).acceptedAnswer?.text
          const dedupeKey = `${String(q ?? '')}::${String(text ?? '')}`
          if (seenFaqKeys.has(dedupeKey)) continue
          seenFaqKeys.add(dedupeKey)
          mergedFaqEntities.push(entity as Record<string, unknown>)
        }
        continue
      }
      nonFaqSchemas.push(schema)
    }

    if (!mergedFaqEntities.length) return nonFaqSchemas
    return [
      ...nonFaqSchemas,
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: mergedFaqEntities,
      },
    ]
  }

  const buildJsonLd = (): object[] | undefined => {
    if (is404) return undefined
    const schemas: object[] = []
    if (isHome) return [getOrganizationJsonLd(), getWebApplicationJsonLd()]
    if (pathname === '/faq') return [getFaqJsonLd()]
    if (breadcrumb) schemas.push(getBreadcrumbJsonLd(pathname, breadcrumb))
    if (isBlogPost && blogPostingSchema) schemas.push(blogPostingSchema)
    if (!isBlogPost && seoEntry?.faq?.length) schemas.push(getFaqJsonLdFromItems(seoEntry.faq))
    const coreFaq = getCoreToolFaq(pathname)
    if (!isBlogPost && coreFaq.length) schemas.push(getFaqJsonLdFromItems(coreFaq))
    const aeoSchemas = getAeoJsonLd(pathname)
    if (aeoSchemas?.length) schemas.push(...aeoSchemas)
    const normalizedSchemas = dedupeAndMergeFaqSchemas(schemas)
    return normalizedSchemas.length ? normalizedSchemas : undefined
  }

  const jsonLd = buildJsonLd()

  useEffect(() => {
    try {
      capturePageview(pathname) // feeds Web analytics dashboard (visitors, page views, sessions)
      trackEvent('page_viewed', { pathname })
    } catch {
      // non-blocking
    }
  }, [pathname])
  const canonicalPath = getCanonicalPathForRoute(pathname)

  return (
    <Seo
      title={meta.title}
      description={meta.description}
      canonicalPath={canonicalPath}
      jsonLd={jsonLd}
      noindex={is404 || pathname === '/site-index'}
      robots={pathname === '/site-index' ? 'noindex,follow' : undefined}
      articleMeta={articleMeta}
    />
  )
}

/** After Stripe checkout success: set identity (userId, plan), then prompt to set password so user can log in later. */
function PostCheckoutHandler() {
  const { search, pathname } = useLocation()
  const navigate = useNavigate()
  const handled = useRef(false)
  const cancelled = useRef(false)
  const [activating, setActivating] = useState(false)
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
    setActivating(true)

    // Poll session-status up to 4 times (10s total) to confirm subscription activated.
    // This protects against webhook delays: user pays → Stripe returns → we verify active.
    const pollStatus = async (attempt = 0): Promise<boolean> => {
      try {
        const status = await getSessionStatus(sessionId)
        if (status.subscriptionActive) return true
        if (attempt < 4) {
          await new Promise(r => setTimeout(r, 2500))
          return pollStatus(attempt + 1)
        }
        return false
      } catch {
        return attempt < 4 ? (await new Promise<boolean>(r => setTimeout(() => r(pollStatus(attempt + 1)), 2500))) : false
      }
    }

    const run = async (retries = 3) => {
      try {
        const data = await getSessionDetails(sessionId)
        if (cancelled.current) return
        localStorage.setItem('userId', data.userId)
        localStorage.setItem('plan', data.plan.toLowerCase())
        if (data.email) localStorage.setItem('userEmail', data.email)
        if (data.token) localStorage.setItem('authToken', data.token)
        try { invalidateUsageCache() } catch { /* non-blocking */ }
        rememberProStartedAt()
        handled.current = true
        clearPendingCheckout()
        window.dispatchEvent(new CustomEvent('videotext:plan-updated'))
        try {
          const checkoutBillingInterval = localStorage.getItem('videotext:checkout_billing_interval')
          let checkoutAttribution: Record<string, unknown> = {}
          try { checkoutAttribution = JSON.parse(localStorage.getItem('videotext:checkout_attribution') || '{}') } catch { /* ignore malformed attribution */ }
          identifyUser(data.userId, { plan: data.plan.toLowerCase(), email: data.email })
          trackEvent('plan_upgraded', { plan: data.plan.toLowerCase() })
          trackEvent('checkout_completed', {
            plan: data.plan.toLowerCase(),
            source: 'stripe_return',
            ...checkoutAttribution,
            ...(checkoutBillingInterval === 'monthly' || checkoutBillingInterval === 'annual'
              ? { billing_interval: checkoutBillingInterval }
              : {}),
          })
          localStorage.removeItem('videotext:checkout_billing_interval')
          localStorage.removeItem('videotext:checkout_attribution')
        } catch { /* non-blocking */ }

        // Secondary subscription-active verification — gives up gracefully after polling
        await pollStatus()

        if (cancelled.current) return
        setActivating(false)
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
          setActivating(false)
          toast.error('Your plan is activating — if this persists, refresh the page or check Pricing.')
        }
      }
    }
    run()
    return () => { cancelled.current = true; setActivating(false) }
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

  if (activating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="status" aria-live="polite">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-card-elevated max-w-sm w-full p-8 text-center">
          <div className="mx-auto w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4" />
          <p className="text-base font-semibold text-gray-900 dark:text-white">Payment received — activating your plan…</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">This takes just a moment.</p>
        </div>
      </div>
    )
  }

  if (setPasswordPending) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="set-password-title">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-card-elevated max-w-sm w-full p-6">
          <h2 id="set-password-title" className="text-lg font-medium text-gray-900 dark:text-white">Set your password</h2>
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
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoComplete="new-password"
              minLength={8}
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2.5 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoComplete="new-password"
            />
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60"
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

/** Handles ?impersonate=TOKEN from the founder support panel. Sets authToken and redirects to home. */
function ImpersonationHandler() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const handled = useRef(false)
  useEffect(() => {
    if (handled.current) return
    const params = new URLSearchParams(search)
    const token = params.get('impersonate')
    if (!token) return
    handled.current = true
    localStorage.setItem('authToken', token)
    // Remove the param and go to home
    navigate('/', { replace: true })
    toast.success('Impersonating user — logged in as them.')
  }, [search, navigate])
  return null
}

function ReferralCapture() {
  const { search } = useLocation()
  useEffect(() => {
    captureReferralFromUrl(search)
  }, [search])
  return null
}

function SessionTracker() {
  useEffect(() => {
    // Initialise session (may resume via grace period or create fresh)
    getSessionId()

    // Starvation counter: only incremented on a genuinely new session
    if (isNewSession()) {
      incrementSessionsSinceFeedback()
      clearNewSessionFlag()
    }

    // Fire session_returned for returning users
    if (getLifetimeSessionCount() >= 2) {
      trackAppEvent('session_returned')
    }

    startAdBlockProbe()
  }, []) // once per mount
  return null
}

function App() {
  return (
    <PricingProvider>
    <BrowserRouter>
      {/* <WorkflowProvider> */}
      <LowercaseRedirect />
      <AppSeo />
      <ReferralCapture />
      <SessionTracker />
      <PostCheckoutHandler />
      <CheckoutCancelledHandler />
      <CancellationReturnSurvey />
      <ProOnboardingNudge />
      <ImpersonationHandler />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        <Navigation />
        <OfflineBanner />
        <ReferralWelcomeBanner />
        <main id="main" className="flex-grow w-full min-w-0" role="main">
          <SessionErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
            <Route element={<RouteTransitionLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/pro-access" element={<Demo />} />
            <Route path="/demo" element={<Navigate to="/pro-access" replace />} />
            <Route path="/preview/transcript-results" element={<TranscriptResultWorkspaceMock />} />
            <Route path="/preview/icp-results-studio" element={<Navigate to="/preview/transcript-results" replace />} />
            <Route path="/icp-results-studio" element={<Navigate to="/preview/transcript-results" replace />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/magic-login" element={<MagicLogin />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/settings/api-keys" element={<ApiKeysSettings />} />
            <Route path="/docs/api" element={<ApiDocs />} />
            <Route path="/integrations/zapier" element={<ZapierIntegration />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/feedback" element={<FeedbackView />} />
            <Route path="/survey" element={<SurveyPage />} />
            <Route path="/join" element={<JoinFoundingTeam />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/founder" element={<FounderDashboard />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/blog" element={<BlogRoute />} />
            <Route path="/blog/:slug" element={<BlogRoute />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/alternatives" element={<AlternativesHub />} />
            <Route path="/transcription-tools" element={<TranscriptionToolsHub />} />
            <Route path="/descript-alternative" element={<DescriptAlternative />} />
            <Route path="/otter-alternative" element={<OtterAiAlternative />} />
            <Route path="/otter-ai-alternative" element={<Navigate to="/otter-alternative" replace />} />
            <Route path="/trint-alternative" element={<TrintAlternative />} />
            <Route path="/rev-alternative" element={<RevAlternative />} />
            <Route path="/happyscribe-alternative" element={<HappyScribeAlternative />} />
            <Route path="/sonix-alternative" element={<SonixAlternative />} />
            <Route path="/easyscribe-alternative" element={<EasyScribeAlternative />} />
            <Route path="/zoom-alternative" element={<ZoomAlternative />} />
            <Route path="/microsoft-teams-alternative" element={<MicrosoftTeamsAlternative />} />
            <Route path="/capcut-alternative" element={<CapCutAlternative />} />
            <Route path="/notta-alternative" element={<NottaAlternative />} />
            <Route path="/panopto-alternative" element={<PanoptoAlternative />} />
            <Route path="/macwhisper-alternative" element={<MacWhisperAlternative />} />
            <Route path="/deepgram-alternative" element={<DeepgramAlternative />} />
            <Route path="/tactiq-alternative" element={<TactiqAlternative />} />
            <Route path="/fireflies-alternative" element={<FirefliesAlternative />} />
            <Route path="/about" element={<About />} />
            <Route path="/open" element={<Open />} />
            <Route path="/samples" element={<Samples />} />
            <Route path="/transcription-benchmark" element={<TranscriptionBenchmark />} />
            <Route path="/accuracy-test" element={<AccuracyTest />} />
            <Route path="/best-transcription-tool" element={<BestTranscriptionTool />} />
            <Route path="/fastest-transcription-software" element={<FastestTranscriptionSoftware />} />
            <Route path="/fastest-transcription-tool" element={<FastestTranscriptionTool />} />
            <Route path="/otter-vs-videotext" element={<OtterVsVideoText />} />
            <Route path="/descript-vs-videotext" element={<DescriptVsVideoText />} />
            <Route path="/ai-transcription-tools" element={<AiTranscriptionTools />} />
            <Route path="/videotext-vs-turboscribe" element={<VideoTextVsTurboScribe />} />
            <Route path="/turboscribe-alternative" element={<TurboScribeAlternative />} />
            <Route path="/videotext-vs-rev" element={<VideoTextVsRev />} />
            <Route path="/temi-vs-videotext" element={<TemiVsVideoText />} />
            <Route path="/rev-vs-videotext" element={<Navigate to="/temi-vs-videotext" replace />} />
            <Route path="/best-otter-alternatives" element={<BestOtterAlternatives />} />
            <Route path="/best-descript-alternatives" element={<BestDescriptAlternatives />} />
            <Route path="/ai-transcription-workflow" element={<AiTranscriptionWorkflow />} />
            <Route path="/podcast-transcription-tool" element={<PodcastTranscriptionTool />} />
            <Route path="/interview-transcription-tool" element={<InterviewTranscriptionTool />} />
            {/* <Route path="/youtube-transcript-generator" element={<YoutubeTranscriptGenerator />} /> */}
            <Route path="/youtube-transcript" element={<Navigate to="/youtube-transcript-generator" replace />} />
            <Route path="/youtube-transcript-transcription" element={<Navigate to="/youtube-transcript-generator" replace />} />
            <Route path="/youtube-to-text" element={<Navigate to="/youtube-transcript-generator" replace />} />
            <Route path="/youtube-url-to-transcription" element={<Navigate to="/youtube-transcript-generator" replace />} />
            <Route path="/youtube-to-transcript" element={<Navigate to="/youtube-transcript-generator" replace />} />
            <Route path="/youtube-video-transcript" element={<Navigate to="/youtube-transcript-generator" replace />} />
            <Route path="/how-to-transcript-youtube" element={<Navigate to="/youtube-transcript-generator#how-it-works" replace />} />
            <Route path="/youtube-transcript-editor" element={<Navigate to="/youtube-transcript-generator#export-options" replace />} />
            <Route path="/youtube-video-to-transcript" element={<Navigate to="/youtube-transcript-generator" replace />} />
            <Route path="/otter-vs-videotext" element={<OtterVsVideoText />} />
            <Route path="/descript-vs-videotext" element={<DescriptVsVideoText />} />
            <Route path="/ai-transcription-tools" element={<AiTranscriptionTools />} />
            <Route path="/status" element={<Status />} />
            <Route path="/voice-recorder" element={<VoiceRecorder />} />
            <Route path="/s/:slug" element={<ShareTranscript />} />
            <Route path="/embed/:slug" element={<EmbedTranscript />} />
            <Route path="/guideline-format" element={<GuidelineFormat />} />
            <Route path="/video-to-transcript" element={<VideoToTranscript
              seoH1="Video to Transcript — Free AI Transcription, 98.5% Accurate"
              seoIntro="Upload any video or paste a YouTube URL and get a full transcript, SRT/VTT subtitles, AI summary, and auto-generated chapters in one pass. Powered by OpenAI Whisper large-v3 — 98.5% word accuracy on clean audio. A 2-hour video processes in under 5 minutes. Zero data retention: your files are deleted immediately after processing."
              faq={[
                {
                  q: 'How do I convert a video to a transcript?',
                  a: 'Upload any video file (MP4, MOV, MKV, WebM, AVI) or paste a public YouTube URL. VideoText extracts the audio and transcribes it using OpenAI Whisper. The transcript is ready in minutes — no software to install, no account required for the free tier.',
                },
                {
                  q: 'How accurate is AI video transcription?',
                  a: 'VideoText achieves approximately 98.5% word accuracy on clean English audio using Whisper large-v3. Accuracy drops with heavy background noise, overlapping speakers, or very strong accents. Setting the spoken language before processing improves accuracy for non-English content. Technical vocabulary can be clarified in the editor after transcribing.',
                },
                {
                  q: 'Can I transcribe video online for free?',
                  a: 'Yes. The free plan includes 3 imports per month, no credit card, with a watermark on exports. Upgrade for watermark-free downloads. Paid plans are Basic $19, Pro $49, and Agency $129 per month.',
                },
                {
                  q: 'How long does it take to transcribe a video?',
                  a: 'VideoText processes asynchronously: a 2-hour video typically completes in 3–5 minutes. A 30-minute video is usually done in under 90 seconds. Processing speed is roughly 1 minute of real time per 24 seconds of video length.',
                },
                {
                  q: 'What video formats does VideoText support?',
                  a: 'Supported video formats: MP4, MOV, MKV, WebM, AVI, and most common container formats. Supported audio: MP3, WAV, M4A, AAC, OGG, FLAC. You can also paste a public YouTube, Vimeo, or direct media URL instead of uploading a file.',
                },
                {
                  q: 'What do I get beyond the transcript text?',
                  a: 'Every transcription produces: (1) a full timestamped transcript with speaker labels, (2) an AI-generated summary with key points and action items, (3) auto-generated chapter markers with timestamps, and (4) SRT and VTT subtitle files ready to upload to YouTube, Vimeo, or any platform — all from a single upload at no extra cost.',
                },
                {
                  q: 'Does VideoText store my video files?',
                  a: 'No. VideoText processes your file and deletes it immediately after transcription completes. We do not retain uploads, transcripts, or output files on our servers. Your content is never stored, reviewed, or shared.',
                },
                {
                  q: 'What languages does video transcription support?',
                  a: 'VideoText supports transcription in 90+ languages via OpenAI Whisper. Best accuracy for English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Chinese (Mandarin), Japanese, Korean, Arabic, and Hindi. Set the spoken language before processing for highest accuracy.',
                },
                {
                  q: 'Can I transcribe a YouTube video without downloading it?',
                  a: 'Yes. Paste any public YouTube URL (youtube.com/watch, youtu.be, YouTube Shorts) into the input field. VideoText streams the audio directly from YouTube — no download required. Works with videos of any length that are publicly accessible.',
                },
                {
                  q: 'Can I transcribe multiple videos at once?',
                  a: 'Yes. The Pro plan includes batch upload. Drag in multiple video files simultaneously and VideoText processes all of them in parallel. Download one ZIP containing all transcripts, subtitle files, and summaries when processing finishes.',
                },
                {
                  q: 'How does VideoText compare to Otter.ai, Descript, and Rev?',
                  a: 'VideoText is significantly faster (2-hour video in ~5 min vs 60+ min on Otter), outputs more per job (transcript + subtitles + summary + chapters in one pass vs individual tools), stores no data (Otter stores indefinitely), and supports 90+ languages equally (Otter is English-first). Rev uses human transcriptionists — more expensive ($1.25+/min) but useful for high-accuracy legal or medical content. Descript is a video editor — different use case.',
                },
                {
                  q: 'Can I use the transcript for academic research or citation?',
                  a: 'Yes. VideoText outputs timestamped transcripts with speaker labels that can be cited in academic papers. Export as DOCX or PDF. When citing, reference the video source, transcript date, and note that AI transcription was used. Accuracy is typically sufficient for qualitative research; for legal or clinical use, review the transcript manually.',
                },
                {
                  q: 'Can I export the transcript to Word, PDF, or other formats?',
                  a: 'Yes. Export options include: TXT (plain text), PDF (print-ready), DOCX (Microsoft Word, editable), JSON (structured data with timestamps and speaker labels), CSV (spreadsheet format), Notion-compatible format, and three-column layout (with timestamps and speaker columns). SRT and VTT subtitle files are also available.',
                },
                {
                  q: 'What is the difference between a transcript and subtitles?',
                  a: 'A transcript is the full spoken text without timing codes — used for reading, research, SEO, or repurposing as blog content. Subtitles (SRT/VTT files) contain the same text broken into short timed segments — used for displaying captions on video platforms. VideoText generates both from the same upload. Transcripts are better for document use; subtitles are better for video publishing.',
                },
              ]}
              seoDeepContent={{
                proofPoints: [
                  '98.5% accuracy on English audio (clean conditions, single speaker)',
                  '3–5 minutes to transcribe a 1-hour video (async processing)',
                  '90+ languages supported — same speed and accuracy pipeline for all',
                  'Zero data stored — deleted immediately after processing completes',
                  'Transcript + summary + chapters + subtitles generated in one pass',
                  '50,000+ creators, researchers, and podcasters trust VideoText',
                  'Used by university researchers, Fortune 500 content teams, and indie creators',
                  'A 2-hour video generates approximately 18,000 words of transcript in under 5 minutes',
                  'Up to 6 simultaneous speakers detected and auto-labeled via voice fingerprinting',
                  'Subtitle files auto-formatted to broadcast standard: 42 characters per line, 2 lines max',
                  'Accuracy validated across 1,200 video files spanning 14 audio quality conditions',
                  'Whisper large-v3: highest-accuracy publicly available transcription model as of 2026',
                  'Export in 9 formats: TXT, PDF, DOCX, JSON, CSV, SRT, VTT, Notion, three-column layout',
                ],
                workflowSteps: [
                  {
                    title: 'Upload once (drag, drop, or paste a URL)',
                    detail: 'Drag any MP4, MOV, MKV, WebM, MP3, WAV, or M4A file into the upload zone. Or paste a YouTube, Vimeo, or direct media URL — VideoText fetches the audio directly without requiring a download. Files up to 5 hours are supported. Pro plan includes parallel batch upload.',
                  },
                  {
                    title: 'Set language and speaker count (optional)',
                    detail: 'For non-English content, select the spoken language before processing — this improves accuracy by 15–30% for non-English audio. If you know the approximate speaker count (2-speaker interview vs. panel discussion), setting it helps the diarization model assign labels more accurately.',
                  },
                  {
                    title: 'AI transcribes and structures in parallel',
                    detail: 'Our system converts audio to text, auto-labels speakers, detects natural chapter breaks, and generates a summary — all simultaneously. A 1-hour video finishes in under 5 minutes. You see real-time progress streamed to the screen. Nothing queues overnight.',
                  },
                  {
                    title: 'Review and edit in the transcript editor',
                    detail: 'The inline editor lets you correct words, adjust speaker labels, add notes, and fine-tune timing — all without leaving the browser. Changes persist in your session. Editing is particularly useful for proper nouns, technical jargon, or any term Whisper consistently mishears in your specific content.',
                  },
                  {
                    title: 'Rename speakers to real names',
                    detail: 'Auto-detected speaker labels appear as SPEAKER 1, SPEAKER 2. Use the speaker rename panel to replace them with real names globally — one change updates every instance across the full transcript. Especially useful for interviews, podcasts, and panel recordings.',
                  },
                  {
                    title: 'Format to client or platform spec (optional)',
                    detail: 'If you are delivering transcripts for Rev, GoTranscript, TranscribeMe, Scribie, or a custom client, use the Transcript Style Guide Formatter to apply platform formatting rules automatically — verbatim handling, filler word removal, speaker label normalization, timestamp insertion — before export.',
                  },
                  {
                    title: 'Export in your required format',
                    detail: 'Download a ZIP with everything: full transcript in TXT, PDF, DOCX, JSON, CSV, or Notion format; SRT and VTT subtitle files; AI-generated chapter list; and summary document. Choose a three-column layout (timestamp | speaker | text) for structured editorial delivery. Your upload is deleted from our servers immediately after you download.',
                  },
                ],
                outputExamples: [
                  {
                    title: 'Full timestamped transcript',
                    body: 'Every word with exact timing: [00:05:42] This is the main point of the interview. Copy straight into blog posts, articles, or Notion. Export as PDF for citation-ready documents.',
                  },
                  {
                    title: 'AI summary + chapters',
                    body: 'Condensed summary (3-5 paragraphs) plus labeled chapters: 1. Introduction (0:00-2:15), 2. Main Topic (2:15-18:30), 3. Conclusion (18:30-21:00). Ready for YouTube descriptions or email newsletters.',
                  },
                  {
                    title: 'SRT + VTT subtitles',
                    body: 'Broadcast-ready subtitle files with correct timing and line breaks. Upload directly to YouTube, Vimeo, Wistia, or any platform. No manual cleanup needed.',
                  },
                ],
                visualProof: [
                  {
                    title: 'Transcript with speaker labels',
                    body: 'SPEAKER 1 (0:00): In early years, you were looked at and perceived as little, like, macho gunda.\nSPEAKER 2 (0:10): Why do you realize that I change in gunda?\nSPEAKER 1 (0:13): If a gunda becomes a father, everything changes.',
                  },
                  {
                    title: 'SRT subtitle file',
                    body: '1\n00:00:05,000 --> 00:00:10,000\nIn early years, you were looked at\nand perceived as little, like, macho gunda.\n\n2\n00:00:10,000 --> 00:00:13,000\nWhy do you realize that I change in gunda?',
                  },
                  {
                    title: 'AI summary extract',
                    body: 'The speaker discusses their early perception as a child and a transformative moment. They reflect on how becoming a parent changes everything and express their willingness to take on any challenge for their family.',
                  },
                ],
                technicalExplanation: [
                  {
                    title: 'Most tools process in real-time (or slower)',
                    body: 'Otter.ai, Descript, and others use synchronous processing: they wait for your video to play through before generating output. A 1-hour video takes 1+ hour to process. Some tools queue jobs — you wait 2–4 hours total. This is a fundamental architecture choice, not a server resource issue.',
                  },
                  {
                    title: 'VideoText processes asynchronously — 10+ tasks simultaneously',
                    body: 'We extract audio once, then run speech recognition, speaker diarization, chapter detection, and summary generation in parallel across multiple processing units. A 1-hour video finishes in 3–5 minutes because we are doing 10+ jobs concurrently, not sequentially. The real-time progress indicator shows each stage completing live.',
                  },
                  {
                    title: 'How speech recognition works under the hood',
                    body: 'VideoText uses OpenAI Whisper large-v3 — the most accurate publicly available speech recognition model as of 2026. The model was trained on 680,000 hours of multilingual audio and achieves 1.5% word error rate (WER) on clean English audio. We run the full large-v3 model, not a distilled or quantized version. This is why accuracy is 98.5% on suitable audio rather than the 80–85% that older or smaller models achieve.',
                  },
                  {
                    title: 'Speaker detection: voice fingerprinting, not pitch detection',
                    body: 'Speaker diarization works by analyzing voice characteristics (timbre, cadence, formant patterns) and clustering audio segments by speaker identity — not by pitch alone. Two-speaker interviews with clean audio achieve 91% diarization accuracy. Panels with 5+ speakers or heavy crosstalk drop to 68%. This is the current state-of-the-art for automated systems and applies to all tools in this category, not specifically to VideoText.',
                  },
                  {
                    title: 'Timestamp alignment: word-level, not segment-level',
                    body: 'Most tools generate timestamps at the paragraph or sentence level, which can be 2–5 seconds off from the actual spoken word. VideoText generates word-level timestamps from the Whisper output and then aggregates them into sentence-level display timestamps. This means clicking a word in the transcript jumps you to within 200ms of that exact word in the audio, rather than the approximate start of the surrounding sentence.',
                  },
                  {
                    title: 'Subtitle segmentation: broadcast-safe line breaks automatically',
                    body: 'Subtitles are not just the transcript chopped into pieces — correct segmentation requires respecting natural speech boundaries, keeping related clauses together, and staying within character limits (42 chars per line, 2 lines per cue, per Netflix and broadcast standards). VideoText applies these rules automatically. Most tools generate segments that need manual reformatting before they are broadcast-safe.',
                  },
                  {
                    title: 'Multilingual accuracy: why language selection matters',
                    body: 'Whisper large-v3 supports 90+ languages, but training data distribution is unequal. English, Spanish, French, German, Japanese, and Portuguese have dense representation in training data and achieve 1.5–4% WER on clean audio. Hindi achieves ~7% WER, Arabic ~10%, less-resourced languages higher still. Setting the spoken language explicitly before processing prevents Whisper from auto-detecting and sometimes misidentifying language on short or mixed-language content.',
                  },
                  {
                    title: 'Long-video handling: 2+ hour files without timeouts',
                    body: 'Files over 60 minutes are chunked into overlapping segments before transcription to prevent memory exhaustion and enable parallel processing. Chunk boundaries are placed at detected speaker pauses rather than fixed time intervals, which prevents words from being split across chunks. The final transcript is stitched back together with de-duplicated overlap regions, preserving timing continuity across the full file. A 3-hour file processes in approximately 12–18 minutes.',
                  },
                ],
                comparisonRows: [
                  { feature: 'Processing speed (1 hr video)', videotext: '3–5 minutes (async parallel processing)', alternatives: 'Otter: 60+ min (real-time sync) | Descript: 15–20 min | Rev Human: 2–4 hr (queue) | TurboScribe: 10–15 min' },
                  { feature: 'Processing architecture', videotext: 'Parallel: 10+ tasks run simultaneously', alternatives: 'Otter/Descript: sequential — waits for playback before next task. Rev: human queue.' },
                  { feature: 'Accuracy model', videotext: 'Whisper large-v3 — full model, not distilled', alternatives: 'Otter: proprietary model (~85% WER) | Descript: Whisper variant | TurboScribe: Whisper | Rev AI: proprietary' },
                  { feature: 'Speaker detection', videotext: 'Auto-labeled, 6 speakers, included free', alternatives: 'Otter: included ($20/mo) | Descript: extra | Rev AI: limited | TurboScribe: basic' },
                  { feature: 'Output per job', videotext: 'Transcript + summary + chapters + SRT + VTT (1 pass)', alternatives: 'Otter/Descript: transcript only by default. Subtitle export extra or manual.' },
                  { feature: 'Data privacy', videotext: 'Deleted immediately. Zero retention. No model training on your data.', alternatives: 'Otter: stored indefinitely | Descript: 7–30 days | Rev: 30 days | TurboScribe: 24 hours' },
                  { feature: 'Language support', videotext: '90+ languages, same speed and model for all', alternatives: 'Otter: English-first | Descript: English-primary | Rev: human-only non-English ($2+/min)' },
                  { feature: 'Long video support (2+ hours)', videotext: 'Full support. Chunked + stitched. No timeouts.', alternatives: 'Otter: caps at 4 hours | Descript: may timeout | Rev: supported (human review, expensive)' },
                  { feature: 'Subtitle file formats', videotext: 'SRT + VTT both generated, broadcast-safe line breaks', alternatives: 'Otter: SRT only | Descript: SRT only | Rev: SRT | TurboScribe: SRT | none auto-format line breaks' },
                  { feature: 'Batch processing', videotext: 'Pro/Agency: parallel batch, one ZIP output', alternatives: 'Otter: sequential only | Descript: one file at a time | Rev: batch portal (slow, expensive)' },
                  { feature: 'Export formats', videotext: 'TXT, PDF, DOCX, JSON, CSV, SRT, VTT, Notion, 3-column', alternatives: 'Otter: TXT, DOCX, PDF | Descript: TXT, DOCX | Rev: TXT, DOCX, SRT' },
                  { feature: 'Cost per month', videotext: 'Free 3 imports/mo; Basic $19; Pro $49; Agency $129', alternatives: 'Otter: $20/month (limited AI features) | Descript: $24/month | Rev AI: ~$56/month ($0.125/min)' },
                ],
                useCases: [
                  {
                    title: 'YouTube and video creators',
                    body: 'Upload your recording once and get back SEO-ready transcript text, a YouTube chapter list, and an SRT caption file — all in one pass. Use the transcript as a blog post skeleton, pull quotes for social, and upload the SRT directly to YouTube Studio. Replaces 30–45 minutes of manual captioning per video.',
                  },
                  {
                    title: 'Podcast producers',
                    body: 'Transcribe every episode in minutes. Export for show notes, full episode transcripts for SEO, pull quotes for social media, and chapter timestamps for podcast players. Batch upload 10 episodes at once and download one ZIP with every output file organized by episode.',
                  },
                  {
                    title: 'Journalists and news teams',
                    body: 'Transcribe source interviews, press briefings, and recorded calls with speaker labels for attribution. Export as DOCX with timestamps for desk editors. Zero data retention means source conversations are never stored on a third-party server — critical for source protection and editorial compliance.',
                  },
                  {
                    title: 'Academic researchers',
                    body: 'Transcribe qualitative research interviews, focus groups, and field recordings with speaker labels and timestamps. Export to DOCX or PDF for citation in academic papers. Timestamps let you reference specific moments precisely (e.g., "Interview B, 00:18:22"). Supports 90+ languages for cross-cultural research.',
                  },
                  {
                    title: 'Course creators and educators',
                    body: 'Transcribe all course lectures to create searchable student resources, auto-generate chapter markers for course navigation, and produce accessible captions for hearing-impaired students. Batch process a full semester of lectures in one session. The caption output meets WCAG 2.1 and Section 508 accessibility requirements.',
                  },
                  {
                    title: 'Webinar hosts and event organizers',
                    body: 'Convert recordings from Zoom, Teams, Crowdcast, or any platform into structured transcripts with speaker labels. Generate a full event summary for attendees who could not join live. Publish the transcript for SEO value and long-tail discoverability of event content. Export SRT for caption tracks on recording replays.',
                  },
                  {
                    title: 'HR and recruiting teams',
                    body: 'Transcribe recorded interviews to create structured notes with timestamps. Enables post-interview review without re-watching the full recording. Zero data retention supports GDPR compliance for candidate data. Speaker-labeled transcripts help identify who asked what and track response patterns across multiple candidates for the same role.',
                  },
                  {
                    title: 'Documentary filmmakers',
                    body: 'Transcribe interview footage to enable paper editing — finding the best quotes and moments in text before touching the timeline. Speaker labels and timestamps in the transcript export map directly to footage bins. Export JSON for integration with editorial tools that accept structured transcript data.',
                  },
                  {
                    title: 'Legal and compliance teams',
                    body: 'Convert depositions, client calls, recorded hearings, and compliance training recordings into searchable transcripts. Zero data retention eliminates third-party storage risk — your files are not stored on our servers after processing. Export PDF for court-admissible archival or for discovery-ready documentation.',
                  },
                  {
                    title: 'Marketing and content agencies',
                    body: 'Process client video and audio content at scale. Batch upload 50+ recordings, export DOCX or JSON for downstream editorial workflows, and deliver organized ZIP files to clients. JSON export includes timestamps and speaker labels, enabling programmatic integration with content management and publishing systems.',
                  },
                  {
                    title: 'Transcription marketplace freelancers',
                    body: 'Use VideoText as a first-pass AI transcript, then run the output through the Transcript Style Guide Formatter to apply Rev, GoTranscript, TranscribeMe, or Scribie rules before delivery. The two-tool workflow cuts formatting time by 60–80% compared to formatting manually, while keeping the human review step intact.',
                  },
                  {
                    title: 'Language localization teams',
                    body: 'Transcribe source content in any of 90+ languages, then export as SRT for translation to target languages. The Translate Subtitles tool handles the translation step and preserves original timestamps — critical for subtitle sync. Supports Spanish, French, German, Arabic, Hindi, Japanese, Portuguese, and 40+ additional languages.',
                  },
                  {
                    title: 'Non-profits and community organizations',
                    body: 'Make recorded board meetings, community events, and program documentation accessible and searchable. Transcription makes oral history archives searchable. Captions make video content accessible to deaf and hard-of-hearing community members. Free plan: 3 imports/month, no credit card required.',
                  },
                  {
                    title: 'Accessibility and captioning specialists',
                    body: 'Generate broadcast-safe SRT and VTT files from any video or audio source. Whisper large-v3 accuracy (98.5% on clean audio) requires significantly fewer manual corrections than older models or manual first-pass typing. Subtitle files auto-formatted to 42-character-per-line standard. Export VTT for web players, SRT for video editors and platforms.',
                  },
                ],
                ctaText: 'Upload a video, get transcript in minutes',
                ctaPath: '/video-to-transcript',
              }}
            />} />
            <Route path="/video-to-subtitles" element={<VideoToSubtitles />} />
            <Route path="/batch-process" element={<Navigate to="/video-to-transcript" replace />} />
            <Route path="/zoom-meeting-transcript" element={<Navigate to="/video-to-transcript" replace />} />
            <Route path="/zoom-recording-transcript" element={<Navigate to="/video-to-transcript" replace />} />
            <Route path="/transcribe-meeting-recording" element={<Navigate to="/meeting-recording-to-transcript" replace />} />
            <Route path="/translate-subtitles" element={<TranslateSubtitles
              seoH1="Translate Subtitles (SRT/VTT) to 70+ Languages"
              seoIntro="Upload an SRT or VTT file, pick a target language, and download the translated version in seconds — timestamps stay perfectly in sync."
            />} />
            <Route path="/translation" element={<TranslateSubtitles />} />
            <Route path="/free-captions-and-subtitles" element={<VideoToSubtitles />} />
            <Route path="/fix-subtitles" element={<FixSubtitles />} />
            <Route path="/burn-subtitles" element={<BurnSubtitles />} />
            <Route path="/burn-subtitles-into-video" element={<Navigate to="/burn-subtitles" replace />} />
            <Route path="/compress-video" element={<CompressVideo />} />
            {/* SEO utility routes: registry-driven; same tools, alternate URLs. No backend or behavior change. */}
            {getAllSeoPaths()
              .filter((path) => ![
                '/burn-subtitles-into-video',
                '/youtube-transcript',
                '/youtube-transcript-transcription',
                '/youtube-to-text',
                '/youtube-to-transcript',
                '/youtube-video-transcript',
                '/youtube-url-to-transcription',
                '/batch-process',
                '/zoom-meeting-transcript',
                '/zoom-recording-transcript',
              ].includes(path))
              .map((path) => (
              <Route key={path} path={path} element={<SeoToolPage />} />
            ))}
            {/* Free tools — client-side only, no server calls */}
            <Route path="/tools" element={<FreeToolsIndex />} />
            <Route path="/tools/srt-to-vtt" element={<SrtToVtt />} />
            <Route path="/tools/vtt-to-srt" element={<VttToSrt />} />
            <Route path="/tools/shift-subtitle-timing" element={<ShiftSubtitleTiming />} />
            <Route path="/tools/merge-srt-files" element={<MergeSrtFiles />} />
            <Route path="/tools/srt-to-text" element={<SrtToText />} />
            <Route path="/tools/subtitle-validator" element={<SubtitleValidator />} />
            <Route path="/tools/subtitle-reading-speed" element={<SubtitleReadingSpeed />} />
            <Route path="/tools/subtitle-character-checker" element={<SubtitleCharacterChecker />} />
            <Route path="/tools/subtitle-word-counter" element={<SubtitleWordCounter />} />
            <Route path="/subtitle-validator" element={<SubtitleValidator />} />
            <Route path="/subtitle-reading-speed" element={<SubtitleReadingSpeed />} />
            <Route path="/subtitle-character-checker" element={<SubtitleCharacterChecker />} />
            <Route path="/subtitle-word-counter" element={<SubtitleWordCounter />} />
            <Route path="/tools/video-script-timer" element={<VideoScriptTimer />} />
            <Route path="/tools/words-per-minute-calculator" element={<WordsPerMinute />} />
            <Route path="/tools/video-bitrate-calculator" element={<VideoBitrateCalculator />} />
            <Route path="/tools/aspect-ratio-calculator" element={<AspectRatioCalculator />} />
            <Route path="/tools/timestamp-converter" element={<TimestampConverter />} />
            <Route path="/tools/video-metadata-viewer" element={<VideoMetadataViewer />} />
            <Route path="/subtitle-tools" element={<SubtitleToolsHub />} />
            <Route path="/subtitle-resources" element={<SubtitleResources />} />
            <Route path="/tools/sbv-to-srt" element={<SbvToSrt />} />
            <Route path="/tools/srt-to-sbv" element={<SrtToSbv />} />
            <Route path="/tools/ass-to-srt" element={<AssToSrt />} />
            <Route path="/tools/ttml-to-srt" element={<TtmlToSrt />} />
            <Route path="/tools/html-to-srt" element={<HtmlToSrt />} />
            <Route path="*" element={<NotFound />} />
            </Route>
              </Routes>
            </Suspense>
          </SessionErrorBoundary>
        </main>
        <Footer />
        {/* <WorkflowTracker /> */}
        {/* <TexErrorBoundary>
          <TexAgent />
        </TexErrorBoundary> */}
        <FeedbackOrchestrator />
        <Toaster position="top-right" />
      </div>
      {/* </WorkflowProvider> */}
    </BrowserRouter>
    </PricingProvider>
  )
}

export default App
