import { Link } from 'react-router-dom'
import { getPopularFooterLinks } from '../lib/seoRegistry'

export default function Footer() {
  const popularLinks = getPopularFooterLinks()
  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <img src="/logo.svg" alt="VideoText" className="h-8 w-8" />
              <span className="text-xl font-semibold text-white">VideoText</span>
            </div>
            <p className="text-sm">
              Turn speech into text: transcripts, subtitles, translation. For creators & teams. We don’t store your data.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  All tools
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/guide" className="hover:text-white transition-colors">
                  Guide
                </Link>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-white transition-colors">
                  How it works
                </a>
              </li>
            </ul>
          </div>
          {/* Popular tools: from registry (core + selected SEO paths). */}
          <div>
            <h3 className="text-white font-semibold mb-4">Popular tools</h3>
            <ul className="space-y-2 text-sm">
              {popularLinks.map(({ path, label }) => (
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
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-gray-500">Contact: use in-app support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-800 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} VideoText. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
