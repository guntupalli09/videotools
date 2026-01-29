import { Link } from 'react-router-dom'
import { ArrowRight, LucideIcon } from 'lucide-react'

interface ToolSuggestion {
  icon: LucideIcon
  title: string
  path: string
}

interface CrossToolSuggestionsProps {
  suggestions: ToolSuggestion[]
}

export default function CrossToolSuggestions({ suggestions }: CrossToolSuggestionsProps) {
  return (
    <div className="bg-violet-50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Continue with another tool</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon
          return (
            <Link
              key={suggestion.path}
              to={suggestion.path}
              className="bg-white rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow border border-gray-200"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-violet-100 rounded-lg p-2">
                  <Icon className="h-5 w-5 text-violet-600" />
                </div>
                <span className="font-medium text-gray-800">{suggestion.title}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
