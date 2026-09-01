import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import net from 'net'
import type { IncomingMessage, ServerResponse } from 'http'

// Where /api/* goes. This repo holds the frontend only — the FastAPI backend
// lives in the stocks repo, deployed as the trading-platform Cloud Run service.
// The proxy is server-side, so the browser still sees same-origin /api/* calls:
// neither the ~73 bare fetch('/api/...') call sites nor the API's CORS
// allow-list need to change.
const LOCAL_API = 'http://localhost:8000'
const STAGING_API = 'https://trading-platform-staging-5sjtb3yl7a-ue.a.run.app'

/**
 * Is a backend listening on localhost:8000?
 *
 * We probe the port rather than sniffing environment variables. Detecting the
 * *backend* is more robust than detecting the *environment*: it needs no
 * knowledge of what Lovable, Codespaces or CI happen to set, and stays correct
 * if any of them change. Whoever has a local API gets it; everyone else —
 * Lovable's cloud preview included — falls through to staging.
 */
function localApiIsUp(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const settle = (up: boolean) => {
      socket.destroy()
      resolve(up)
    }
    socket.setTimeout(300)
    socket.once('connect', () => settle(true))
    socket.once('timeout', () => settle(false))
    socket.once('error', () => settle(false))
    socket.connect(8000, '127.0.0.1')
  })
}

async function resolveApiTarget(): Promise<string> {
  const override = process.env.VITE_API_PROXY_TARGET
  if (override) return override
  return (await localApiIsUp()) ? LOCAL_API : STAGING_API
}

/**
 * Stubs /api/config/firebase with open auth so the SPA can boot with no backend
 * at all. Off by default: when the proxy reaches a real backend this stub would
 * shadow it, reporting authMode 'open' while the API still expects a Firebase
 * ID token — every gated call would then 401. Opt in with VITE_NO_BACKEND=1 for
 * offline UI work.
 */
function runtimeConfigPlugin(): Plugin {
  return {
    name: 'runtime-config-endpoint',
    configureServer(server) {
      server.middlewares.use(
        '/api/config/firebase',
        (_req: IncomingMessage, res: ServerResponse) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ authMode: 'open', firebase: null }))
        },
      )
    },
  }
}

export default defineConfig(async () => {
  const offline = process.env.VITE_NO_BACKEND === '1'
  const target = offline ? LOCAL_API : await resolveApiTarget()

  if (offline) {
    console.log('[api-proxy] VITE_NO_BACKEND=1 — serving stubbed open-auth config')
  } else {
    const note = target === STAGING_API ? '  (no local backend on :8000)' : ''
    console.log(`[api-proxy] /api -> ${target}${note}`)
  }

  return {
    plugins: [react(), tailwindcss(), ...(offline ? [runtimeConfigPlugin()] : [])],
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
      host: true, // listen on 0.0.0.0 — required for GitHub Codespace port forwarding
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        // /dev is served by FastAPI (not part of the SPA). Proxy it so
        // the page is reachable through Vite during local development.
        '/dev': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
