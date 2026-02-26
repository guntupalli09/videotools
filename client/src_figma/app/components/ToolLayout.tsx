import { motion } from 'motion/react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router';

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
  sidebar: React.ReactNode;
}

export function ToolLayout({
  breadcrumbs,
  title,
  subtitle,
  icon,
  tags = [],
  children,
  sidebar
}: ToolLayoutProps) {
  return (
    <div className="min-h-screen pt-20 pb-12 px-6 bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <motion.nav
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 text-sm mb-8"
        >
          <Link 
            to="/"
            className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <Link
                to={crumb.href}
                className={`${
                  index === breadcrumbs.length - 1
                    ? 'text-purple-600 dark:text-purple-400 font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                } transition-colors`}
              >
                {crumb.label}
              </Link>
            </div>
          ))}
        </motion.nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-start gap-4 mb-6">
            {/* Icon */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-purple-500/30 blur-xl rounded-2xl" />
              <div className="relative w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center border border-purple-200 dark:border-purple-800">
                {icon}
              </div>
            </motion.div>

            {/* Title */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
                {title}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="flex flex-wrap gap-2"
            >
              {tags.map((tag, index) => (
                <motion.span
                  key={tag}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + (index * 0.05) }}
                  className="px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors cursor-default"
                >
                  {tag}
                </motion.span>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-2"
          >
            {children}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="lg:col-span-1"
          >
            {sidebar}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
