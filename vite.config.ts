import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Dev-server fallback for the runtime auth config. In production the backend
// serves /api/config/firebase; in this environment there is no backend on
// :8000, so answer it directly with open auth mode.
function runtimeConfigPlugin() {
  return {
    name: 'runtime-config-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/config/firebase', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ authMode: 'open', firebase: null }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), runtimeConfigPlugin()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,  // listen on 0.0.0.0 — required for GitHub Codespace port forwarding
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // /dev is served by FastAPI (not part of the SPA). Proxy it so
      // the page is reachable through Vite during local development.
      '/dev': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
