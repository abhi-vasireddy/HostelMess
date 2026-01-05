import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mess Connect',
        short_name: 'Mess Connect',
        description: 'Smart Mess Connect Management System',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Increased to 5MB just to be safe
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true, // 👇 FORCE DELETE old broken caches
        clientsClaim: true,          // 👇 Control the page immediately
        skipWaiting: true,           // 👇 Activate new SW immediately
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // 👇 Ensure everything is cached
      }
    })
  ],
  server: {
    host: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});