import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import Home from './pages/Home'
import Pricing from './pages/Pricing'
import VideoToTranscript from './pages/VideoToTranscript'
import VideoToSubtitles from './pages/VideoToSubtitles'
import BatchProcess from './pages/BatchProcess'
import TranslateSubtitles from './pages/TranslateSubtitles'
import FixSubtitles from './pages/FixSubtitles'
import BurnSubtitles from './pages/BurnSubtitles'
import CompressVideo from './pages/CompressVideo'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/video-to-transcript" element={<VideoToTranscript />} />
            <Route path="/video-to-subtitles" element={<VideoToSubtitles />} />
            <Route path="/batch-process" element={<BatchProcess />} />
            <Route path="/translate-subtitles" element={<TranslateSubtitles />} />
            <Route path="/fix-subtitles" element={<FixSubtitles />} />
            <Route path="/burn-subtitles" element={<BurnSubtitles />} />
            <Route path="/compress-video" element={<CompressVideo />} />
          </Routes>
        </main>
        <Footer />
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  )
}

export default App
