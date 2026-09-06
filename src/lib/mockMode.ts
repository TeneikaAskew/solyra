/**
 * Mock-data mode ("dev mode"): the app serves every `/api/*` request from
 * the bundled fixtures in `src/mocks/` and NOTHING leaves the browser.
 *
 * Who gets it:
 *  - an account with the `dev` role (server-verified via /api/me `is_dev`)
 *    auto-enters mock mode on sign-in, unless they explicitly turned it off;
 *  - an admin can toggle it from the Support menu.
 *
 * The preference is tri-state on purpose: 'on' | 'off' | unset. Unset is
 * what lets the dev-role auto-enable fire exactly once per browser — after
 * a dev explicitly exits ('off'), they stay out until they opt back in, so
 * the toggle never fights the auto-enable in a loop.
 *
 * Toggling RELOADS the page. Mock mode changes what every fetch returns
 * (including /api/config/firebase, which decides the auth mode at boot), so
 * flipping it mid-session would leave React Query caches and runtime config
 * half real, half fixture. A reload re-derives the whole app from one world.
 *
 * localStorage per CLAUDE.md: a per-browser convenience, wrapped in
 * try/catch because the accessor itself can throw (privacy modes). With
 * storage unavailable, mock mode simply reports inactive.
 */

const STORAGE_KEY = 'solyra-mock-mode';

export type MockModePreference = 'on' | 'off';

export function mockModePreference(): MockModePreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'on' || raw === 'off' ? raw : null;
  } catch {
    return null;
  }
}

export function isMockModeActive(): boolean {
  return mockModePreference() === 'on';
}

/**
 * Persist the preference and reload into the new world. Returns whether the
 * preference actually persisted; on failure nothing reloads — reloading
 * would change nothing, and a write-accepting storage that reads back null
 * would otherwise loop (write → reload → unset → auto-enable → write …).
 */
export function setMockMode(on: boolean): boolean {
  const want: MockModePreference = on ? 'on' : 'off';
  try {
    localStorage.setItem(STORAGE_KEY, want);
  } catch {
    // Storage unavailable: nothing persisted, so reloading would change
    // nothing. Fail visibly rather than pretending the mode flipped.
    console.error('mock mode: localStorage unavailable, cannot persist the toggle');
    return false;
  }
  if (mockModePreference() !== want) {
    console.error('mock mode: preference did not persist, staying in the current world');
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Auto-enable for dev-role accounts: fires only while the preference is
 * UNSET, so an explicit exit ('off') is never overridden. Returns true when
 * it actually enabled (and is about to reload).
 */
export function autoEnableMockModeForDev(): boolean {
  if (mockModePreference() !== null) return false;
  return setMockMode(true);
}

/**
 * Cross-tab convergence: `authedFetch` re-reads the preference on every
 * request, so when one tab toggles the mode, a sibling tab would otherwise
 * silently start answering from the OTHER world while keeping this world's
 * runtime config, caches, and banner. The `storage` event fires only in
 * those sibling tabs (never in the writer, which reloads itself in
 * setMockMode), so reloading here re-derives every open tab from the new
 * preference the moment it changes.
 */
// Guarded on the function, not just `window`: unit-test environments stub a
// partial window without an event target.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.oldValue !== e.newValue) {
      window.location.reload();
    }
  });
}
