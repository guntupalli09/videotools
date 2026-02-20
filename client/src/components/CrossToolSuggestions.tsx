import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, LucideIcon } from 'lucide-react'

export interface ToolSuggestion {
  icon: LucideIcon
  title: string
  path: string
  /** Optional one-line workflow hint (e.g. "Then burn into video") */
  description?: string
  /** State to pass when navigating (e.g. useWorkflowVideo so next tool pre-fills from workflow) */
  state?: object
  /** Run before navigating (e.g. set workflow SRT from current transcript); then navigate with state */
  onBeforeNavigate?: () => void
}

interface CrossToolSuggestionsProps {
  suggestions: ToolSuggestion[]
  /** Optional workflow hint shown above the grid (e.g. for editors/YouTubers) */
  workflowHint?: string
}

const suggestionClass =
  'surface-card-hover p-4 flex items-center justify-between gap-3 rounded-xl w-full text-left'

export default function CrossToolSuggestions({ suggestions, workflowHint }: CrossToolSuggestionsProps) {
  const navigate = useNavigate()
  return (
    <section className="surface-card p-6" aria-labelledby="continue-tool-heading">
      <h2 id="continue-tool-heading" className="page-heading text-lg mb-2">Next step</h2>
      {workflowHint && (
        <p className="text-sm text-gray-500 mb-4" aria-hidden="true">
          {workflowHint}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon
          const content = (
            <>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-lg p-2 shrink-0" aria-hidden>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium text-gray-800">{suggestion.title}</span>
                </div>
                {suggestion.description && (
                  <span className="text-xs text-gray-500 pl-11 leading-tight block">{suggestion.description}</span>
                )}
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 shrink-0" aria-hidden />
            </>
          )
          if (suggestion.onBeforeNavigate) {
            return (
              <button
                key={suggestion.path}
                type="button"
                className={suggestionClass}
                onClick={() => {
                  suggestion.onBeforeNavigate?.()
                  navigate(suggestion.path, { state: suggestion.state })
                }}
              >
                {content}
              </button>
            )
          }
          return (
            <Link
              key={suggestion.path}
              to={suggestion.path}
              state={suggestion.state}
              className={suggestionClass}
            >
              {content}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
