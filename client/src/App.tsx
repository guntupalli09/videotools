import { useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import Navigation from './components/Navigation'
import { getSessionDetails } from './lib/billing'
import Footer from './components/Footer'
import Seo from './components/Seo'
import { ROUTE_SEO, getOrganizationJsonLd, getWebApplicationJsonLd } from './lib/seoMeta'
import Home from './pages/Home'
import Pricing from './pages/Pricing'
import Refer from './pages/Refer'
import VideoToTranscript from './pages/VideoToTranscript'
import VideoToSubtitles from './pages/VideoToSubtitles'
import BatchProcess from './pages/BatchProcess'
import TranslateSubtitles from './pages/TranslateSubtitles'
import FixSubtitles from './pages/FixSubtitles'
import BurnSubtitles from './pages/BurnSubtitles'
import CompressVideo from './pages/CompressVideo'
// SEO entry points: reuse same tool components. Do NOT add new API or duplicate logic.
import VideoToTextPage from './pages/seo/VideoToTextPage'
import Mp4ToTextPage from './pages/seo/Mp4ToTextPage'
import Mp4ToSrtPage from './pages/seo/Mp4ToSrtPage'
import SubtitleGeneratorPage from './pages/seo/SubtitleGeneratorPage'
import SrtTranslatorPage from './pages/seo/SrtTranslatorPage'
import MeetingTranscriptPage from './pages/seo/MeetingTranscriptPage'
import SpeakerDiarizationPage from './pages/seo/SpeakerDiarizationPage'
import VideoSummaryGeneratorPage from './pages/seo/VideoSummaryGeneratorPage'
import VideoChaptersGeneratorPage from './pages/seo/VideoChaptersGeneratorPage'
import KeywordIndexedTranscriptPage from './pages/seo/KeywordIndexedTranscriptPage'
import SrtToVttPage from './pages/seo/SrtToVttPage'
import SubtitleConverterPage from './pages/seo/SubtitleConverterPage'
import SubtitleTimingFixerPage from './pages/seo/SubtitleTimingFixerPage'
import SubtitleValidationPage from './pages/seo/SubtitleValidationPage'
import SubtitleTranslatorPage from './pages/seo/SubtitleTranslatorPage'
import MultilingualSubtitlesPage from './pages/seo/MultilingualSubtitlesPage'
import SubtitleLanguageCheckerPage from './pages/seo/SubtitleLanguageCheckerPage'
import SubtitleGrammarFixerPage from './pages/seo/SubtitleGrammarFixerPage'
import SubtitleLineBreakFixerPage from './pages/seo/SubtitleLineBreakFixerPage'
import HardcodedCaptionsPage from './pages/seo/HardcodedCaptionsPage'
import VideoWithSubtitlesPage from './pages/seo/VideoWithSubtitlesPage'
import VideoCompressorPage from './pages/seo/VideoCompressorPage'
import ReduceVideoSizePage from './pages/seo/ReduceVideoSizePage'
import BatchVideoProcessingPage from './pages/seo/BatchVideoProcessingPage'
import BulkSubtitleExportPage from './pages/seo/BulkSubtitleExportPage'
import BulkTranscriptExportPage from './pages/seo/BulkTranscriptExportPage'

function AppSeo() {
  const { pathname } = useLocation()
  const meta = ROUTE_SEO[pathname] || ROUTE_SEO['/']
  const isHome = pathname === '/'
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
        handled.current = true
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
        <main id="main" className="flex-grow" role="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/refer" element={<Refer />} />
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
        </main>
        <Footer />
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  )
}

export default App
