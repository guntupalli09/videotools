import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// VitePWA disabled: service worker registration fails in production (sw.js 404),
// causing "session expired" crash during signup. Re-enable when PWA is a priority.
// import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  define: {
    // Ensure build uses VITE_SITE_URL from env (e.g. CI smoke test). Fallback only when unset.
    'import.meta.env.VITE_SITE_URL': JSON.stringify(
      process.env.VITE_SITE_URL || 'https://videotext.io'
    ),
    // Release ID for debugging (git SHA + build time in CI; "dev" locally)
    'import.meta.env.VITE_RELEASE': JSON.stringify(
      process.env.VITE_RELEASE || process.env.RELEASE || 'dev'
    ),
    // Sentry (optional; only used when VITE_SENTRY_DSN is set at build)
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(process.env.VITE_SENTRY_DSN || ''),
    'import.meta.env.VITE_SENTRY_ENV': JSON.stringify(process.env.VITE_SENTRY_ENV || process.env.NODE_ENV || ''),
    'import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE': JSON.stringify(process.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.05'),
  },
  plugins: [
    react(),
  ],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        // Allow long chunked uploads (large files with 1–2 MB chunks) without proxy timeout
        timeout: 600_000,
        proxyTimeout: 600_000,
      },
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core — cache separately, rarely changes
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-vendor'
          // Router — used on every navigation
          if (id.includes('node_modules/react-router')) return 'router'
          // UI libs — shared across tools
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/react-hot-toast') || id.includes('node_modules/lucide-react')) return 'ui'
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
})
