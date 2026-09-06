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
 * Mock-mode route table for `/` — deliberately EMPTY. The landing page
 * renders outside AppShell, so it has no MockModeBanner: a mocked 200 on
 * POST /api/waitlist would tell a real person "you're on the list" with no
 * indicator that nothing was saved (Rule 4: fabricated success). Leaving
 * the mutation unwired means the engine's 501 loud-miss flows through
 * submitWaitlist's error branch and the form shows an honest failure —
 * same convention as the unwired journal import mutations (./journal).
 */
export const landingRoutes: MockRoute[] = [];
