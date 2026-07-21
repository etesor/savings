import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repo from a subpath: etesor.github.io/savings/
  base: '/savings/',
  plugins: [
    react(),
    VitePWA({
      // Rebuild + reload picks up a new service worker automatically.
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Ahorros — ahorros personales',
        short_name: 'Ahorros',
        description:
          'Registra tus ahorros por buckets, con metas e historial. Tus datos viven solo en tu equipo.',
        lang: 'es',
        theme_color: '#16a34a',
        background_color: '#111827',
        display: 'standalone',
        // Relative so it also works from a GitHub Pages subpath later.
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Serve the app shell for any route when offline (SPA fallback).
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      // Keep the service worker out of `npm run dev` to avoid caching surprises
      // while developing; it activates in `npm run build` / `npm run preview`.
      devOptions: { enabled: false },
    }),
  ],
})
