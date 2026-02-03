import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { trackEvent } from '../lib/analytics'

interface ToolCardProps {
  icon: LucideIcon
  title: string
  description: string
  path: string
}

export default function ToolCard({ icon: Icon, title, description, path }: ToolCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        to={path}
        onClick={() =>
          trackEvent('tool_selected', {
            tool: title,
            path,
          })
        }
      >
        <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer h-full border border-gray-100">
          <div className="bg-violet-100/80 rounded-xl p-4 w-16 h-16 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{description}</p>
          <span className="text-violet-600 font-medium text-sm inline-flex items-center">
            Try it free →
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
