import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // POC: allow access through a public tunnel (ngrok, cloudflared, ...)
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:5000',
      '/mcp': 'http://localhost:5000',
      '/health': 'http://localhost:5000',
    },
  },
})
