import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches render errors so we never show raw 404 / edge errors to the user.
 * Shows a friendly "Session expired" style message and a single CTA.
 */
export default class SessionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch() {
    // Log to console in dev; could report to monitoring in prod
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Your session expired or something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please upload again or start from the home page.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-6 py-3 text-white font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              Go to home
            </Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
