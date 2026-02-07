import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from './lib/theme'
import { initAnalytics, identifyUser } from './lib/analytics'
import App from './App.tsx'
import './index.css'

initAnalytics()
const userId = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null
const plan = typeof localStorage !== 'undefined' ? localStorage.getItem('plan') : null
if (userId && userId !== 'demo-user') {
  identifyUser(userId, { plan: plan ?? undefined })
}

// Safety net: uncaught promise rejections (e.g. missing catch) get a user-visible message instead of silent failure.
window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[unhandledrejection]', event.reason)
  }
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason)
  if (message && !message.includes('ResizeObserver')) {
    import('react-hot-toast').then(({ default: toast }) => {
      toast.error('Something went wrong. Please try again.')
    })
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
