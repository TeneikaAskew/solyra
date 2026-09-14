import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { installAuthFetch } from './lib/authedFetch'

/**
 * Boot is deliberately thin (issue #26): render immediately, so `/` — the
 * public landing page — ships only landing code and issues NO
 * /api/config/firebase call. The runtime-config fetch, the fail-loud
 * config-error screen, and the awaited Firebase init all live in
 * ConfigGate (src/components/auth/ConfigGate.tsx), which wraps every route
 * that needs them: the app group behind AuthGate, and /auth/action.
 *
 * The fail-LOUD posture itself is unchanged — see ConfigGate's header and
 * tests/shared/auth-gate.spec.ts (issue #5): a config failure on an app
 * route renders the explicit error screen, never a silent open mode.
 *
 * installAuthFetch runs FIRST, before anything can fetch. The wrapper also
 * rewrites relative /api/* onto the configured absolute origin on static
 * hosts, and the landing page's own waitlist POST needs that rewrite too.
 * Token attachment no-ops until ConfigGate's setRuntimeConfig marks the
 * mode as `firebase`, so nothing else changes.
 */
installAuthFetch()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
