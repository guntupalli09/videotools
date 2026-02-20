import { Link } from 'react-router-dom'
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
    <Link
      to={path}
      onClick={() =>
        trackEvent('tool_selected', {
          tool: title,
          path,
        })
      }
      className="block h-full"
    >
      <div className="surface-card-hover p-6 cursor-pointer h-full">
        <div className="bg-primary/10 rounded-xl p-4 w-14 h-14 flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="page-heading text-lg mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">{description}</p>
        <span className="text-primary font-medium text-sm inline-flex items-center">
          Try it free →
        </span>
      </div>
    </Link>
  )
}
