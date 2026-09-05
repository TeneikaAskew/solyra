/**
 * The ONE place the deployed backend origins and static-host detection live.
 *
 * Imported from both sides of the toolchain:
 *  - vite.config.ts (Node, dev-server proxy fallback)
 *  - src/lib/authedFetch.ts (browser, runtime target for static hosts)
 *
 * Before this module the staging URL was duplicated in both files; renaming
 * the Cloud Run service or moving regions would update one and silently miss
 * the other (issue #11).
 *
 * If the published app ever serves from a domain that is NOT listed in
 * STATIC_FRONTEND_HOST_SUFFIXES, TWO places need the new origin:
 *  1. the suffix list below (so the browser re-points /api/* at staging), and
 *  2. the CORS allow-list in the stocks repo's API (so the browser is allowed
 *     to make that cross-origin call at all).
 * Keep this comment in sync with that reality — it is the "allowed-origin
 * story" from issue #11.
 */

/** Local FastAPI dev backend (the stocks repo's `make dev`). */
export const LOCAL_API = 'http://localhost:8000'

/**
 * Public URL of the deployed staging API. Not a secret: the service is
 * unauthenticated at the edge and gated per-request by Firebase token
 * verification, and the bundle already ships the public Firebase web config.
 */
export const STAGING_API = 'https://solyra-api-staging-28960574877.us-east1.run.app'

/**
 * Hostname suffixes of static hosts that serve the SPA with history-fallback
 * and therefore answer /api/* with index.html. Requests made from these hosts
 * must be re-pointed at STAGING_API (see authedFetch.ts). `*.lovable.app`
 * covers Lovable preview and published domains alike.
 */
const STATIC_FRONTEND_HOST_SUFFIXES = ['.lovable.app', '.lovableproject.com']

/** True when the given browser hostname is a known static (API-less) host. */
export function isStaticFrontendHost(hostname: string): boolean {
  return STATIC_FRONTEND_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
}
