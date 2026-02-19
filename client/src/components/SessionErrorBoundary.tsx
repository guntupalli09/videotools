import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  isChunkError?: boolean
}

function isChunkLoadError(error: Error): boolean {
  const msg = (error?.message || '').toLowerCase()
  return msg.includes('loading chunk') || msg.includes('chunkloaderror') || msg.includes('dynamic import')
}

/**
 * Catches render errors so we never show raw 404 / edge errors to the user.
 * Shows a friendly "Session expired" style message and a single CTA.
 * Detects lazy-chunk load failures and offers Retry (reload) instead.
 */
export default class SessionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (isChunkLoadError(error)) {
      this.setState({ isChunkError: true })
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[SessionErrorBoundary]', error, errorInfo)
    } else {
      // eslint-disable-next-line no-console
      console.error('[SessionErrorBoundary]', error?.message, errorInfo?.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunk = this.state.isChunkError
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {isChunk ? 'This page failed to load' : 'Your session expired or something went wrong'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {isChunk
                ? 'Check your connection and try again, or start from the home page.'
                : 'Please upload again or start from the home page.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isChunk && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-6 py-3 text-white font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                >
                  Retry
                </button>
              )}
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-6 py-3 text-white font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 sm:bg-gray-100 sm:text-gray-800 sm:hover:bg-gray-200"
              >
                Go to home
              </Link>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
