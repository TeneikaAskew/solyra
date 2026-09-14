/**
 * Boot gate for every route that needs the runtime auth config — the app
 * group behind AuthGate, and the public /auth/action page (its Firebase SDK
 * calls need the web config even signed-out).
 *
 * Until issue #26 this work ran in main.tsx BEFORE anything rendered, so a
 * logged-out marketing visit to `/` blocked on GET /api/config/firebase and
 * (in firebase mode) the Auth SDK chunk. The landing page needs neither —
 * the fetch now starts when the FIRST config-needing route mounts, and `/`
 * ships only landing code (the acceptance in landing.spec.ts pins it).
 *
 * The fail-loud posture is unchanged and still load-bearing (issue #5):
 * GET /api/config/firebase is served by OUR OWN backend — INTERNAL, per
 * CLAUDE.md Rule 4 — so a network error, a non-OK status, or an unparseable
 * body renders the explicit config-error screen. Silently defaulting to
 * `open` here would strip the auth gate and render the full app to an
 * anonymous visitor — exactly what commit 34588bc once shipped and
 * tests/shared/auth-gate.spec.ts forbids. In local dev `make dev` serves
 * `{ authMode: 'open' }` (200, valid JSON), so open mode is only ever
 * reached via a real server response.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { setRuntimeConfig, type RuntimeConfig } from '@/lib/runtimeConfig';
import { isStaticFrontendHost } from '@/lib/apiTargets';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  const r = await fetch('/api/config/firebase');
  if (!r.ok) {
    throw new Error(`/api/config/firebase returned ${r.status}`);
  }
  // Guard against non-JSON responses (e.g. a static host's SPA fallback
  // returning index.html with a 200). Parse defensively and validate shape:
  // authMode must be one of the modes the app implements — an unknown mode
  // behaving as `open` would strip the gate on a misconfigured backend
  // (the API's schema pins the same Literal server-side).
  const text = await r.text();
  try {
    const data = JSON.parse(text) as RuntimeConfig;
    if (
      data &&
      (data.authMode === 'open' || data.authMode === 'firebase' || data.authMode === 'iap')
    ) {
      return data;
    }
  } catch {
    /* fall through to error below */
  }
  throw new Error('/api/config/firebase did not return a valid config payload');
}

/**
 * Turn a raw boot failure into an actionable message. On a static Lovable
 * host the /api/* calls are re-pointed cross-origin at the deployed API, so
 * a bare "Failed to fetch" almost always means that exact origin is missing
 * from the backend's CORS allow-list, not that the API is down.
 */
export function describeBootFailure(err: Error): string {
  const base = err?.message ?? 'unknown error';
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (base.toLowerCase().includes('failed to fetch') && isStaticFrontendHost(host)) {
    return `${base} (origin ${window.location.origin} is likely not in the API CORS allow-list)`;
  }
  return base;
}

/**
 * One boot per page load, however many gated routes mount and however many
 * times StrictMode re-runs the effect: the promise is module-level, so the
 * config fetch and (in firebase mode) the awaited SDK init happen exactly
 * once, and every gate instance settles on the same outcome.
 */
let bootPromise: Promise<void> | null = null;

function bootOnce(): Promise<void> {
  bootPromise ??= (async () => {
    const config = await fetchRuntimeConfig();
    setRuntimeConfig(config);
    if (config.authMode === 'firebase' && config.firebase) {
      // Dynamic import: ConfigGate itself sits in the entry chunk, and a
      // static import here would drag the firebase facade (and its authGate
      // store) into every route including `/` — the landing spec's fence
      // caught exactly that. The facade in turn lazy-loads the real SDK
      // chunk, and only in firebase mode; the await matters because
      // AuthGate must not render until auth state can be observed.
      const { initFirebase } = await import('@/lib/firebase');
      await initFirebase(config.firebase);
    }
  })();
  return bootPromise;
}

/** The fail-LOUD surface for a broken boot — see the header comment. */
function ConfigErrorScreen({ message }: { message: string }) {
  return (
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
  );
}

export function ConfigGate({
  children,
  preload,
}: {
  children: ReactNode;
  /** Import of the lazy chunk this gate will render once ready. Fired on
   *  mount so the download runs IN PARALLEL with the config fetch (and, in
   *  firebase mode, the awaited SDK init) instead of chaining behind them —
   *  without it a cold /dashboard visit paid config → shell → page as three
   *  serial round trips. Render still waits for `ready`. */
  preload?: () => Promise<unknown>;
}) {
  const [state, setState] = useState<
    { phase: 'loading' } | { phase: 'error'; message: string } | { phase: 'ready' }
  >({ phase: 'loading' });

  useEffect(() => {
    // Swallowing a preload failure is safe only because React.lazy re-runs
    // the SAME import when the child renders — the error then surfaces
    // through the route error boundary, once, instead of twice.
    void preload?.().catch(() => {});
  }, [preload]);

  useEffect(() => {
    let cancelled = false;
    bootOnce().then(
      () => {
        if (!cancelled) setState({ phase: 'ready' });
      },
      (err: unknown) => {
        // Fail loud, never open — a swallowed failure here would render the
        // full app ungated to an anonymous visitor (issue #5).
        if (!cancelled) {
          setState({ phase: 'error', message: describeBootFailure(err as Error) });
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.phase === 'error') return <ConfigErrorScreen message={state.message} />;
  if (state.phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }
  return <>{children}</>;
}
