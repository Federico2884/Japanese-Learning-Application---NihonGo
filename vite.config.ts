import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base disesuaikan dengan nama repo GitHub Pages:
// https://federico2884.github.io/Japanese-Learning-Application---NihonGo/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Japanese-Learning-Application---NihonGo/' : '/',
  plugins: [
    react(),
    VitePWA({
      // Versi baru diunduh diam-diam lalu dipakai saat aplikasi dibuka lagi.
      // Tanpa pemberitahuan, dan tanpa muat ulang mendadak yang bisa
      // menghapus goresan yang sedang ditulis.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'NihonGo — Belajar Hiragana & Katakana',
        short_name: 'NihonGo',
        description:
          'Hafalkan hiragana dan katakana, lalu latih tangan menulisnya langsung di layar dengan stylus.',
        lang: 'id',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'any',
        background_color: '#171513',
        theme_color: '#171513',
        categories: ['education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Seluruh aset ikut disimpan, termasuk data goresan KanjiVG (~250 KB)
        // dan berkas font, supaya aplikasi utuh saat dibuka tanpa internet.
        globPatterns: ['**/*.{js,css,html,json,woff2,png,svg,wav}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Versi lama tetap dipakai selama aplikasi masih terbuka; versi baru
        // mengambil alih setelah aplikasi ditutup dan dibuka kembali.
        skipWaiting: false,
        clientsClaim: false,
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
