import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    // Ensure build uses VITE_SITE_URL from env (e.g. CI smoke test). Fallback only when unset.
    'import.meta.env.VITE_SITE_URL': JSON.stringify(
      process.env.VITE_SITE_URL || 'https://www.videotext.io'
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
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // Do not add runtimeCaching for /api — API is always network so usage/billing/jobs stay correct.
      },
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
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
