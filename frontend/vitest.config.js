import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Config de test separada de `vite.config.js` (que usa `vite-plugin-pwa` y
 * `@tailwindcss/vite`, innecesarios y con overhead en Vitest — jsdom no
 * necesita el service worker ni la compilación de CSS de producción).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    css: false,
  },
})
