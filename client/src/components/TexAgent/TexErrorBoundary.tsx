import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * If Tex fails, render nothing. App must continue to function.
 * No business logic; observation-only UX layer.
 */
interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class TexErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      if (typeof console !== 'undefined' && console.error) {
        console.error('TexAgent error (non-fatal):', error, info.componentStack)
      }
    } catch {
      // ignore
    }
  }

  render(): ReactNode {
    if (this.state.hasError) return null
    return this.props.children
  }
}
