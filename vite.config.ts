import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base disesuaikan dengan nama repo GitHub Pages:
// https://federico2884.github.io/Japanese-Learning-Application---NihonGo/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Japanese-Learning-Application---NihonGo/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
