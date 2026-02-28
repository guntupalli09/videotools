import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import UserMenu from './UserMenu'
import { prefetchRoute } from '../lib/prefetch'
import { isLoggedIn } from '../lib/auth'

const tools = [
  { name: 'Video → Transcript', path: '/video-to-transcript' },
  { name: 'Video → Subtitles', path: '/video-to-subtitles' },
  { name: 'Translate Subtitles', path: '/translate-subtitles' },
  { name: 'Fix Subtitles', path: '/fix-subtitles' },
  { name: 'Burn Subtitles', path: '/burn-subtitles' },
  { name: 'Compress Video', path: '/compress-video' },
  { name: 'Batch Processing', path: '/batch-process' },
]

export default function Navigation() {
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false)
  const [showTryFree, setShowTryFree] = useState(true)

  useEffect(() => {
    setShowTryFree(!isLoggedIn())
  }, [])

  useEffect(() => {
    const onLoginOrLogout = () => setShowTryFree(!isLoggedIn())
    window.addEventListener('videotext:plan-updated', onLoginOrLogout)
    window.addEventListener('videotext:logout', onLoginOrLogout)
    return () => {
      window.removeEventListener('videotext:plan-updated', onLoginOrLogout)
      window.removeEventListener('videotext:logout', onLoginOrLogout)
    }
  }, [])

  return (
    <nav className="sticky top-0 z-[60] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 shadow-nav">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 w-full">
          {/* Brand: top left */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0"
            onMouseEnter={() => prefetchRoute('/')}
            onFocus={() => prefetchRoute('/')}
          >
            <img src="/logo.svg" alt="VideoText" width={32} height={32} className="h-8 w-8" />
            <span className="text-xl font-display font-semibold text-gray-800 dark:text-white">VideoText</span>
          </Link>

          {/* Top right: Tools, Pricing, menu, Try Free */}
          <div className="hidden md:flex items-center justify-end gap-6 lg:gap-8 shrink-0">
            <div
              className="relative"
              onMouseEnter={() => setToolsDropdownOpen(true)}
              onMouseLeave={() => setToolsDropdownOpen(false)}
            >
              <button className="flex items-center space-x-1 text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion">
                <span>Tools</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {toolsDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-card-elevated border border-gray-100 dark:border-gray-700 py-2"
                  >
                    {tools.map((tool) => (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 transition-motion"
                        onMouseEnter={() => prefetchRoute(tool.path)}
                        onFocus={() => prefetchRoute(tool.path)}
                      >
                        {tool.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              to="/pricing"
              className="text-gray-700 dark:text-gray-200 hover:text-violet-600 dark:hover:text-violet-400 transition-motion"
              onMouseEnter={() => prefetchRoute('/pricing')}
              onFocus={() => prefetchRoute('/pricing')}
            >
              Pricing
            </Link>

            <UserMenu />

            {showTryFree && (
              <Link
                to="/pricing"
                className="btn-primary px-4 py-2 text-sm"
                onMouseEnter={() => prefetchRoute('/pricing')}
                onFocus={() => prefetchRoute('/pricing')}
              >
                Try Free →
              </Link>
            )}
          </div>

          {/* Mobile: only hamburger (UserMenu) */}
          <div className="md:hidden flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  )
}
