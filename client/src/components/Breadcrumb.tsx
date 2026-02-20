import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ROUTE_BREADCRUMB } from '../lib/seoMeta'

/** Lightweight breadcrumb nav for SEO and UX. Renders only when path has breadcrumb data. */
export default function Breadcrumb() {
  const { pathname } = useLocation()
  const items = ROUTE_BREADCRUMB[pathname]
  if (!items || items.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          {items.map((item, i) => (
            <li key={item.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" aria-hidden />}
              {i === items.length - 1 ? (
                <span className="font-medium text-gray-900 dark:text-white" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link to={item.path} className="hover:text-violet-600 dark:hover:text-violet-400 link-secondary">
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
