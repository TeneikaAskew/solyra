import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { setRuntimeConfig, type RuntimeConfig } from './lib/runtimeConfig'
import { initFirebase } from './lib/firebase'
import { installAuthFetch } from './lib/authedFetch'

/**
 * Boot-time runtime-config fetch.
 *
 * GET /api/config/firebase is served by OUR OWN backend (same origin, same
 * deployment) — it is INTERNAL, not a third-party vendor. Per CLAUDE.md
 * Rule 3.7 an INTERNAL failure must fail LOUD: silently defaulting to `open`
 * mode here would strip the auth gate and render the full app to an anonymous
 * user, the exact "render as if unauthenticated" failure the no-anonymous-
 * access requirement forbids. So a network error, a non-OK status, or an
 * unparseable body surfaces an explicit error screen instead of rendering.
 *
 * In local dev `make dev` serves `{ authMode: 'open' }` (200, valid JSON), so
 * the app renders normally — open mode is reached via a real server response,
 * never via a swallowed failure.
 */
async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const r = await fetch('/api/config/firebase')
  if (!r.ok) {
    throw new Error(`/api/config/firebase returned ${r.status}`)
  }
  return (await r.json()) as RuntimeConfig
}

function renderConfigError(message: string): void {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <div
        data-testid="config-error"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '1.5rem',
          background: 'var(--surface-0, #0b0b0f)',
          color: 'var(--on-surface, #e5e7eb)',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          Could not load application configuration
        </h1>
        <p style={{ fontSize: 13, opacity: 0.8, margin: 0, maxWidth: 420 }}>
          The server did not return a valid auth configuration, so the app
          cannot start safely. This usually means the backend is unreachable or
          misconfigured. Refresh to retry.
        </p>
        <p style={{ fontSize: 11, opacity: 0.5, margin: 0 }}>{message}</p>
      </div>
    </StrictMode>,
  )
}

// Bootstrap: load the runtime auth config, init Firebase + the token-injecting
// fetch wrapper, THEN render. installAuthFetch must run before the app renders
// so the very first /api/* data call already carries the bearer token.
async function bootstrap() {
  // Install FIRST, before the config fetch below. The wrapper also rewrites
  // relative /api/* onto VITE_API_BASE_URL when that's set, and
  // /api/config/firebase is itself an /api call — installing after it would
  // leave the very first request pointing at an origin that may not serve the
  // API at all (a static host answers it with index.html, and the JSON parse
  // then fails the whole boot). Token attachment still no-ops until
  // setRuntimeConfig marks the mode as `firebase`, and this path is in
  // OPEN_PREFIXES regardless, so nothing else changes.
  installAuthFetch()

  let config: RuntimeConfig
  try {
    config = await fetchRuntimeConfig()
  } catch (err) {
    renderConfigError((err as Error).message ?? 'unknown error')
    return
  }

  setRuntimeConfig(config)
  if (config.authMode === 'firebase' && config.firebase) {
    // Awaited: initFirebase now lazy-loads the Auth SDK chunk (see
    // lib/firebase.ts), and the gate below must not render until auth state
    // can actually be observed. Other modes never reach this line, so they
    // never download the SDK at all.
    await initFirebase(config.firebase)
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
