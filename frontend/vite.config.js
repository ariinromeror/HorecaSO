import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  /** `vite preview` no usa `server.proxy` por defecto; sin esto, /api no llega al backend. */
  preview: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
