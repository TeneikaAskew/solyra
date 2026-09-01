/**
 * Route wiring for the public landing page (`/`).
 *
 * The page is otherwise static — its copy and imagery come from
 * src/components/landing/fixtures.ts — but <WaitlistSection> posts to a real
 * endpoint:
 *   POST /api/waitlist   submitWaitlist() → 200, or a JSON { detail } error
 *
 * landing.spec.ts only exercised the INVALID-email path, which short-circuits
 * in validateEmail() before any fetch. A valid submission therefore hit the
 * live endpoint (or the dead proxy). Both branches are wired here because the
 * failure path is the one with real behaviour: waitlist.ts throws a
 * user-readable Error and the form must SHOW it — never a fake success.
 */
import type { Page } from '@playwright/test';
import { mockCommon } from '../mocks';

/** Server's duplicate-signup rejection, in the `{ detail }` shape
 *  submitWaitlist() unwraps for its thrown Error message. */
export const MOCK_WAITLIST_CONFLICT = { detail: 'That email is already on the list.' };

export interface LandingMockOpts {
  /** 'ok' accepts the signup; 'conflict' returns a 409 the form must show;
   *  'error' returns a 500 with a non-JSON body (status-code message path). */
  waitlist?: 'ok' | 'conflict' | 'error';
  /** Called with the parsed POST body, for asserting email/source/website. */
  onSubmit?: (body: unknown) => void;
}

/**
 * Intercept the landing page's only network call.
 * Includes `mockCommon`, so callers don't need it separately.
 */
export async function mockLandingApi(page: Page, opts: LandingMockOpts = {}) {
  await mockCommon(page);
  const mode = opts.waitlist ?? 'ok';

  await page.route('**/api/waitlist', (r) => {
    try {
      opts.onSubmit?.(JSON.parse(r.request().postData() || '{}'));
    } catch {
      opts.onSubmit?.(null);
    }
    if (mode === 'conflict') {
      return r.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WAITLIST_CONFLICT),
      });
    }
    if (mode === 'error') {
      // Non-JSON body on purpose: submitWaitlist() falls back to its
      // status-code message when the error body doesn't parse.
      return r.fulfill({ status: 500, contentType: 'text/plain', body: 'upstream failure' });
    }
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
}
