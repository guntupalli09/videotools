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
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
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
