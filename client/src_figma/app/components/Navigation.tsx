import { motion, AnimatePresence } from 'motion/react';
import { Menu as MenuIcon, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Menu } from './Menu';
import { Link } from 'react-router';

const toolsMenu = [
  { name: 'Video → Transcript', href: '/tools/video-to-transcript' },
  { name: 'Video → Subtitles', href: '/tools/video-to-subtitles' },
  { name: 'Translate Subtitles', href: '/tools/translate-subtitles' },
  { name: 'Fix Subtitles', href: '/tools/fix-subtitles' },
  { name: 'Burn Subtitles', href: '/tools/burn-subtitles' },
  { name: 'Compress Video', href: '/tools/compress-video' },
  { name: 'Batch Processing', href: '/tools/batch-processing' },
];

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  return (
    <>
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="fixed top-0 left-0 right-0 z-40 px-6 py-4 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/50 transition-colors duration-500"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/">
            <motion.div
              className="flex items-center gap-2 cursor-pointer group"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-purple-500/25 blur-lg rounded-full"
                  animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.3, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <img src="/logo.svg" alt="" className="relative w-7 h-7" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight relative">
                VideoText
                <motion.div
                  className="absolute -bottom-0.5 left-0 h-0.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                  initial={{ width: 0 }}
                  whileHover={{ width: '100%' }}
                  transition={{ duration: 0.3 }}
                />
              </span>
            </motion.div>
          </Link>
          
          {/* Center Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {/* Tools Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setIsToolsOpen(true)}
              onMouseLeave={() => setIsToolsOpen(false)}
            >
              <button className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 font-medium flex items-center gap-1">
                Tools
                <ChevronDown className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {isToolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                  >
                    {toolsMenu.map((tool, index) => (
                      <Link
                        key={tool.href}
                        to={tool.href}
                        onClick={() => setIsToolsOpen(false)}
                      >
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                        >
                          {tool.name}
                        </motion.div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <NavButton>Pricing</NavButton>
            <NavButton>API</NavButton>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="hidden sm:block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/30 dark:hover:shadow-purple-500/50 transition-all text-sm"
            >
              Try Free
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <MenuIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Menu Sidebar */}
      <Menu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}

function NavButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 font-medium">
      {children}
    </button>
  );
}