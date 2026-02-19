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
        <div className="surface-card-hover p-6 cursor-pointer h-full">
          <div className="bg-primary/10 rounded-xl p-4 w-14 h-14 flex items-center justify-center mb-4">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">{description}</p>
          <span className="text-primary font-medium text-sm inline-flex items-center">
            Try it free →
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
