import { Link, useLocation } from 'react-router-dom'
import { getPopularFooterLinks } from '../lib/seoRegistry'
import { getBlogOutboundUrl } from '../lib/blogOutbound'

export default function Footer() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/embed/')) return null

  const popularLinks = getPopularFooterLinks()

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src="/logo.svg" alt="VideoText" width={32} height={32} className="h-8 w-8" />
              <span className="text-xl font-semibold text-white">VideoText</span>
            </div>

            <p className="text-sm text-gray-300">
              Turn speech into text: transcripts, subtitles, translation. For creators & teams. We don’t store your data.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-medium mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-white transition-colors">All tools</Link></li>
              <li><Link to="/guide" className="hover:text-white transition-colors">Guide</Link></li>
              <li><Link to="/compare" className="hover:text-white transition-colors">Compare</Link></li>
              <li><a href={getBlogOutboundUrl('/blog')} className="hover:text-white transition-colors">Blog</a></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/samples" className="hover:text-white transition-colors">Samples</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/open" className="hover:text-white transition-colors">Open stats</Link></li>
              <li><Link to="/changelog" className="hover:text-white transition-colors">Changelog</Link></li>
            </ul>
          </div>

          {/* Tools & Resources */}
          <div>
            <h3 className="text-white font-medium mb-4">Tools & Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/transcription-tools" className="hover:text-white transition-colors">Transcription tools</Link></li>
              <li><Link to="/subtitle-tools" className="hover:text-white transition-colors">Subtitle tools</Link></li>
              <li><Link to="/tools" className="hover:text-white transition-colors">Free tools</Link></li>
              <li><Link to="/alternatives" className="hover:text-white transition-colors">All alternatives</Link></li>
              <li><Link to="/subtitle-resources" className="hover:text-white transition-colors">Subtitle resources</Link></li>
              <li><Link to="/transcription-benchmark" className="hover:text-white transition-colors">Transcription benchmark</Link></li>
              <li><Link to="/accuracy-test" className="hover:text-white transition-colors">Accuracy test</Link></li>
            </ul>
          </div>

          {/* Product & resources */}
          <div>
            <h3 className="text-white font-medium mb-4">Popular pages</h3>
            <ul className="space-y-2 text-sm">
              {popularLinks.slice(0, 8).map(({ path, label }) => (
                <li key={path}>
                  <Link to={path} className="hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-medium mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('videotext:open-feedback'))}
                  className="text-left hover:text-white transition-colors"
                >
                  Feedback
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center space-y-2">
          <p>&copy; {new Date().getFullYear()} VideoText. All rights reserved.</p>
          <p className="text-xs text-gray-500">
            AI/agents: see{' '}
            <a href="https://videotext.io/llms.txt" className="hover:text-white transition-colors underline-offset-2 hover:underline">
              https://videotext.io/llms.txt
            </a>
          </p>
        </div>

        {/* Badges */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-wrap gap-4 justify-center items-center">
            {/* LaunchBoosts Badge */}
            <a
              href="https://launchboosts.com/project/videotext"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Featured on LaunchBoosts"
            >
              <img
                src="https://launchboosts.com/badges/featured-dark.svg"
                alt="Featured on LaunchBoosts"
                width={180}
                height={54}
              />
            </a>

            {/* IndieHunt Badge */}
            <a
              href="https://indiehunt.io/project/videotext"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Featured on IndieHunt"
            >
              <img
                src="https://indiehunt.io/badges/indiehunt-badge-dark.svg"
                alt="Featured on IndieHunt"
                width={265}
                height={58}
              />
            </a>

            {/* Fazier Badge */}
            <a
              href="https://fazier.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fazier badge"
            >
              <img
                src="https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light"
                alt="Fazier badge"
                width={120}
              />
            </a>

            {/* StartupHub.ai Badge */}
            <a
              href="https://www.startuphub.ai/startups/videotext"
              target="_blank"
              rel="dofollow"
              aria-label="Featured on StartupHub.ai"
            >
              <img
                src="https://www.startuphub.ai/api/badge/e603447c-ae34-4126-93b9-46056d79719b?skin=classic&theme=dark"
                alt="Featured on StartupHub.ai"
                width={180}
                height={50}
              />
            </a>

            {/* Better Launch Badge */}
            <a
              href="https://www.betterlaunch.co"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Featured on Better Launch"
            >
              <img
                src="https://www.betterlaunch.co/badge-dark.svg"
                alt="Featured on Better Launch"
                width={200}
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
