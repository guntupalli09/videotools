import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  href: string;
}

interface ToolLayoutProps {
  breadcrumbs: Breadcrumb[];
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tags?: string[];
  children: React.ReactNode;
  /** When null/undefined, layout is single full-width column (e.g. for result view). */
  sidebar?: React.ReactNode | null;
}

export function ToolLayout({
  breadcrumbs,
  title,
  subtitle,
  icon,
  tags = [],
  children,
  sidebar = null
}: ToolLayoutProps) {
  return (
    <div className="min-h-screen w-full max-w-full pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-12 xl:px-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 transition-colors duration-500 flex flex-col box-border">
      <div className="w-full max-w-full flex-1 min-w-0 box-border">
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-4 sm:mb-8 flex-wrap min-w-0"
          aria-label="Breadcrumb"
        >
          <Link
            to="/"
            className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors shrink-0"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Home</span>
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0 max-w-full">
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
              <Link
                to={crumb.href}
                className={`truncate max-w-[140px] sm:max-w-none ${
                  index === breadcrumbs.length - 1
                    ? 'text-purple-600 dark:text-purple-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </motion.nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.2 }}
              className="relative shrink-0"
            >
              <div className="absolute inset-0 bg-purple-500/30 blur-xl rounded-xl sm:rounded-2xl" />
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-purple-100 dark:bg-purple-900/30 rounded-xl sm:rounded-2xl flex items-center justify-center border border-purple-200 dark:border-purple-800 [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6 md:[&>svg]:w-8 md:[&>svg]:h-8">
                {icon}
              </div>
            </motion.div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 leading-tight">
                {title}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            </div>
          </div>
          {tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-wrap gap-1.5 sm:gap-2"
            >
              {tags.map((tag, index) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-300 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-default"
                >
                  {tag}
                </motion.span>
              ))}
            </motion.div>
          )}
        </motion.div>

        <div className={`grid w-full max-w-full gap-4 sm:gap-6 ${sidebar ? 'grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)]' : 'grid-cols-1'}`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="min-w-0 w-full"
          >
            {children}
          </motion.div>
          {sidebar != null && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="min-w-0 w-full"
            >
              {sidebar}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
