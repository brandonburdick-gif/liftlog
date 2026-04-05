import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/liftlog/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'LiftLog',
        short_name: 'LiftLog',
        description: 'Personal workout tracker',
        theme_color: '#111112',
        background_color: '#111112',
        display: 'standalone',
        start_url: '/liftlog/',
        icons: [
          { src: '/liftlog/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/liftlog/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/exercisedb\.p\.rapidapi\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercisedb-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ]
})
