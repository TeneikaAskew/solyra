/**
 * Typed fixtures + mock-mode routes for the public landing page (`/`).
 *
 * The page is otherwise static — its copy and imagery come from
 * src/components/landing/fixtures.ts — but <WaitlistSection> posts to a real
 * endpoint:
 *   POST /api/waitlist   submitWaitlist() → 200 { status: 'ok' },
 *                        or a JSON { detail } error
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/landing.ts re-exports them for its Playwright
 * wiring (which also covers the rejection/error branches; mock mode answers
 * the happy path only).
 *
 * Contract notes (waitlist.py): duplicates are absorbed by ON CONFLICT DO
 * UPDATE and return 200 — there is NO 409 path. The real rejections are
 * 400 (invalid email), 429 (rate limit) and 503 (store failure).
 */
import type { MockRoute } from './types';

/** Server's rate-limit rejection (HTTP 429), in the `{ detail }` shape
 *  submitWaitlist() unwraps for its thrown Error message. */
export const MOCK_WAITLIST_RATE_LIMITED = {
  detail: 'too many attempts — try again later',
};

/**
 * Mock-mode route table for `/` — the happy-path translation of
 * `mockLandingApi` (tests/helpers/fixtures/landing.ts) with its default
 * `waitlist: 'ok'` option: the signup is accepted with the backend's
 * literal success body.
 */
export const landingRoutes: MockRoute[] = [
  { method: 'POST', pattern: /^\/api\/waitlist$/, reply: () => ({ body: { status: 'ok' } }) },
];
