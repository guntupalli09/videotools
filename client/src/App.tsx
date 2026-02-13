import { useEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { trackEvent, identifyUser, capturePageview } from './lib/analytics'
import { Toaster, toast } from 'react-hot-toast'
import Navigation from './components/Navigation'
import { getSessionDetails } from './lib/billing'
import Footer from './components/Footer'
import Seo from './components/Seo'
import { ROUTE_SEO, getOrganizationJsonLd, getWebApplicationJsonLd } from './lib/seoMeta'
import SessionErrorBoundary from './components/SessionErrorBoundary'
import OfflineBanner from './components/OfflineBanner'

// Lazy-load pages for fast initial load on any device; each route loads only when visited.
const Home = lazy(() => import('./pages/Home'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Login = lazy(() => import('./pages/Login'))
const Refer = lazy(() => import('./pages/Refer'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Faq = lazy(() => import('./pages/Faq'))
const Terms = lazy(() => import('./pages/Terms'))
const VideoToTranscript = lazy(() => import('./pages/VideoToTranscript'))
const VideoToSubtitles = lazy(() => import('./pages/VideoToSubtitles'))
const BatchProcess = lazy(() => import('./pages/BatchProcess'))
const TranslateSubtitles = lazy(() => import('./pages/TranslateSubtitles'))
const FixSubtitles = lazy(() => import('./pages/FixSubtitles'))
const BurnSubtitles = lazy(() => import('./pages/BurnSubtitles'))
const CompressVideo = lazy(() => import('./pages/CompressVideo'))
const VideoToTextPage = lazy(() => import('./pages/seo/VideoToTextPage'))
const Mp4ToTextPage = lazy(() => import('./pages/seo/Mp4ToTextPage'))
const Mp4ToSrtPage = lazy(() => import('./pages/seo/Mp4ToSrtPage'))
const SubtitleGeneratorPage = lazy(() => import('./pages/seo/SubtitleGeneratorPage'))
const SrtTranslatorPage = lazy(() => import('./pages/seo/SrtTranslatorPage'))
const MeetingTranscriptPage = lazy(() => import('./pages/seo/MeetingTranscriptPage'))
const SpeakerDiarizationPage = lazy(() => import('./pages/seo/SpeakerDiarizationPage'))
const VideoSummaryGeneratorPage = lazy(() => import('./pages/seo/VideoSummaryGeneratorPage'))
const VideoChaptersGeneratorPage = lazy(() => import('./pages/seo/VideoChaptersGeneratorPage'))
const KeywordIndexedTranscriptPage = lazy(() => import('./pages/seo/KeywordIndexedTranscriptPage'))
const SrtToVttPage = lazy(() => import('./pages/seo/SrtToVttPage'))
const SubtitleConverterPage = lazy(() => import('./pages/seo/SubtitleConverterPage'))
const SubtitleTimingFixerPage = lazy(() => import('./pages/seo/SubtitleTimingFixerPage'))
const SubtitleValidationPage = lazy(() => import('./pages/seo/SubtitleValidationPage'))
const SubtitleTranslatorPage = lazy(() => import('./pages/seo/SubtitleTranslatorPage'))
const MultilingualSubtitlesPage = lazy(() => import('./pages/seo/MultilingualSubtitlesPage'))
const SubtitleLanguageCheckerPage = lazy(() => import('./pages/seo/SubtitleLanguageCheckerPage'))
const SubtitleGrammarFixerPage = lazy(() => import('./pages/seo/SubtitleGrammarFixerPage'))
const SubtitleLineBreakFixerPage = lazy(() => import('./pages/seo/SubtitleLineBreakFixerPage'))
const HardcodedCaptionsPage = lazy(() => import('./pages/seo/HardcodedCaptionsPage'))
const VideoWithSubtitlesPage = lazy(() => import('./pages/seo/VideoWithSubtitlesPage'))
const VideoCompressorPage = lazy(() => import('./pages/seo/VideoCompressorPage'))
const ReduceVideoSizePage = lazy(() => import('./pages/seo/ReduceVideoSizePage'))
const BatchVideoProcessingPage = lazy(() => import('./pages/seo/BatchVideoProcessingPage'))
const BulkSubtitleExportPage = lazy(() => import('./pages/seo/BulkSubtitleExportPage'))
const BulkTranscriptExportPage = lazy(() => import('./pages/seo/BulkTranscriptExportPage'))

/** Minimal loading fallback for route chunks — fast, accessible, no layout shift. */
function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite" aria-label="Loading">
      <p className="text-violet-600 font-medium">Loading…</p>
    </div>
  )
}

function AppSeo() {
  const { pathname } = useLocation()
  const meta = ROUTE_SEO[pathname] || ROUTE_SEO['/']
  const isHome = pathname === '/'
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
      canonicalPath={pathname}
      jsonLd={isHome ? [getOrganizationJsonLd(), getWebApplicationJsonLd()] : undefined}
    />
  )
}

/** After Stripe checkout success: set identity (userId, plan) so the app shows the right plan and portal works. */
function PostCheckoutHandler() {
  const { search } = useLocation()
  const navigate = useNavigate()
  const handled = useRef(false)
  const cancelled = useRef(false)

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
        navigate(window.location.pathname, { replace: true })
        toast.success(`Welcome! You're now on the ${data.plan} plan.`)
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
  }, [search, navigate])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <AppSeo />
      <PostCheckoutHandler />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg">
        Skip to main content
      </a>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <OfflineBanner />
        <main id="main" className="flex-grow" role="main">
          <SessionErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/refer" element={<Refer />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/video-to-transcript" element={<VideoToTranscript />} />
            <Route path="/video-to-subtitles" element={<VideoToSubtitles />} />
            <Route path="/batch-process" element={<BatchProcess />} />
            <Route path="/translate-subtitles" element={<TranslateSubtitles />} />
            <Route path="/fix-subtitles" element={<FixSubtitles />} />
            <Route path="/burn-subtitles" element={<BurnSubtitles />} />
            <Route path="/compress-video" element={<CompressVideo />} />
            {/* SEO utility routes: same tools, alternate URLs. No backend or behavior change. */}
            <Route path="/video-to-text" element={<VideoToTextPage />} />
            <Route path="/mp4-to-text" element={<Mp4ToTextPage />} />
            <Route path="/mp4-to-srt" element={<Mp4ToSrtPage />} />
            <Route path="/subtitle-generator" element={<SubtitleGeneratorPage />} />
            <Route path="/srt-translator" element={<SrtTranslatorPage />} />
            <Route path="/meeting-transcript" element={<MeetingTranscriptPage />} />
            <Route path="/speaker-diarization" element={<SpeakerDiarizationPage />} />
            <Route path="/video-summary-generator" element={<VideoSummaryGeneratorPage />} />
            <Route path="/video-chapters-generator" element={<VideoChaptersGeneratorPage />} />
            <Route path="/keyword-indexed-transcript" element={<KeywordIndexedTranscriptPage />} />
            <Route path="/srt-to-vtt" element={<SrtToVttPage />} />
            <Route path="/subtitle-converter" element={<SubtitleConverterPage />} />
            <Route path="/subtitle-timing-fixer" element={<SubtitleTimingFixerPage />} />
            <Route path="/subtitle-validation" element={<SubtitleValidationPage />} />
            <Route path="/subtitle-translator" element={<SubtitleTranslatorPage />} />
            <Route path="/multilingual-subtitles" element={<MultilingualSubtitlesPage />} />
            <Route path="/subtitle-language-checker" element={<SubtitleLanguageCheckerPage />} />
            <Route path="/subtitle-grammar-fixer" element={<SubtitleGrammarFixerPage />} />
            <Route path="/subtitle-line-break-fixer" element={<SubtitleLineBreakFixerPage />} />
            <Route path="/hardcoded-captions" element={<HardcodedCaptionsPage />} />
            <Route path="/video-with-subtitles" element={<VideoWithSubtitlesPage />} />
            <Route path="/video-compressor" element={<VideoCompressorPage />} />
            <Route path="/reduce-video-size" element={<ReduceVideoSizePage />} />
            <Route path="/batch-video-processing" element={<BatchVideoProcessingPage />} />
            <Route path="/bulk-subtitle-export" element={<BulkSubtitleExportPage />} />
            <Route path="/bulk-transcript-export" element={<BulkTranscriptExportPage />} />
              </Routes>
            </Suspense>
          </SessionErrorBoundary>
        </main>
        <Footer />
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  )
}

export default App
