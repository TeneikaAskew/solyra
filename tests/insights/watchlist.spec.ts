/**
 * E2E: the Watchlist tab's two lists (FEAT-INSIGHT-001 per-user watchlist).
 *
 * The default list is read-only (edited in Discord); the user's own list
 * shows each row's data state and adds and removes through the stocks
 * routes. Every /api call is routed through tests/helpers/fixtures/insights.ts.
 *
 * The clock is fixed at 2026-11-13T14:00:00Z, which puts the most recent
 * elapsed 00:30 America/New_York ingest boundary at 2026-11-13T05:30:00Z. A
 * null-bar row added after it says its data arrives after tonight's fetch,
 * one added before it says there is no data for the symbol, and a row with
 * a bar shows that bar's date. An implementation that always says the first,
 * or renders a blank, fails here.
 *
 * Signed in runs the Firebase sign-in of
 * tests/ai-insights-lovable/workspace-integration.spec.ts. Signed out is a
 * 401 from /api/me/watchlist in open auth mode: in Firebase mode a signed-out
 * visitor sees the sign-in screen instead of the page, so the section's own
 * signed-out copy is reachable only there. The hook treats that 401 as the
 * signed-out state; the fetch wrapper does not sign the app out on it
 * (nothing outside its own unit test registers setOnUnauthorized).
 */
import { expect, test, type Page } from '@playwright/test';
import type { TickerSearchResult } from '@/hooks/useTickerSearch';
import type { MeWatchlistRow } from '@/types/watchlist';
import { M } from '../helpers/mocks';
import { mockDefaultWatchlist, mockInsightsApi, mockMeWatchlist } from '../helpers/fixtures/insights';

const FIXED_NOW = '2026-11-13T14:00:00Z';

/** One row of each data state at FIXED_NOW. */
const SEEDED_ROWS = [
  {
    ticker: 'AMD',
    added_at: '2026-11-13T06:00:00Z',
    source: 'ui',
    name: 'Advanced Micro Devices Inc',
    exchange: 'NASDAQ',
    asset_type: 'Common Stock',
    last_daily_bar: null,
  },
  {
    ticker: 'ZZZQ',
    added_at: '2026-11-12T20:00:00Z',
    source: 'combobox-auto-add',
    name: null,
    exchange: null,
    asset_type: null,
    last_daily_bar: null,
  },
  {
    ticker: 'MSFT',
    added_at: '2026-10-01T15:00:00Z',
    source: 'ui',
    name: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    asset_type: 'Common Stock',
    last_daily_bar: '2026-11-12',
  },
] satisfies MeWatchlistRow[];

const NVDA_SEARCH = {
  keywords: 'NVDA',
  results: [
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      type: 'Equity',
      region: 'United States',
      currency: 'USD',
      match_score: 1,
    },
  ],
} satisfies TickerSearchResult;

/** Answer the Firebase config probe and identity toolkit, then sign in on the gate. */
async function signIn(page: Page) {
  await page.route('**/api/config/firebase', (r) =>
    r.fulfill(
      M.ok({
        authMode: 'firebase',
        firebase: {
          apiKey: 'AIzaSyFAKE-key-for-tests-000000000000000',
          authDomain: 'demo-test.firebaseapp.com',
          projectId: 'demo-test',
          appId: '1:1234567890:web:abcdef0123456789',
        },
      })
    )
  );
  await page.route('**/api/me', (r) => r.fulfill(M.ok({ email: 'trader@example.test', is_admin: false })));
  await page.route('https://identitytoolkit.googleapis.com/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('accounts:signInWithPassword'))
      return route.fulfill(
        M.ok({
          idToken: 'fake-id-token',
          email: 'trader@example.test',
          refreshToken: 'fake-refresh-token',
          expiresIn: '3600',
          localId: 'uid-trader',
        })
      );
    if (path.endsWith('accounts:lookup'))
      return route.fulfill(
        M.ok({
          users: [
            {
              localId: 'uid-trader',
              email: 'trader@example.test',
              emailVerified: true,
              providerUserInfo: [],
              validSince: '1',
              lastLoginAt: String(Date.parse(FIXED_NOW)),
              createdAt: String(Date.parse(FIXED_NOW)),
            },
          ],
        })
      );
    return route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'UNEXPECTED_CALL' } }),
    });
  });

  await page.goto('/insights');
  await expect(page.getByTestId('signin-screen')).toBeVisible();
  await page.getByTestId('login-email').fill('trader@example.test');
  await page.getByTestId('login-password').fill('fixture-password-9');
  await page.getByTestId('login-submit').click();
  await expect(page.getByRole('heading', { name: 'AI Insights' })).toBeVisible();
}

async function openWatchlistTab(page: Page) {
  await page.getByRole('button', { name: 'Watchlist', exact: true }).click();
}

test.describe('Watchlist tab: default list and my watchlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date(FIXED_NOW));
  });

  test('shows each data state, the read-only default list, then adds and removes a ticker', async ({ page }, testInfo) => {
    await mockInsightsApi(page);
    const me = await mockMeWatchlist(page, SEEDED_ROWS, { now: () => FIXED_NOW });
    await mockDefaultWatchlist(page);
    await page.route('**/api/insights/ticker/search**', (r) => r.fulfill(M.ok(NVDA_SEARCH)));

    await signIn(page);
    await openWatchlistTab(page);

    // The default list: three chips with their surface flags, and no control.
    const defaults = page.getByTestId('default-watchlist-section');
    await expect(defaults.getByRole('heading', { name: 'Managed in Discord', exact: true })).toBeVisible();
    for (const ticker of ['SPY', 'QQQ', 'IWM']) {
      await expect(defaults.getByText(ticker, { exact: true })).toBeVisible();
    }
    await expect(defaults.getByText('brief', { exact: true })).toHaveCount(3);
    await expect(defaults.getByText('insight', { exact: true })).toHaveCount(3);
    await expect(defaults.getByText('signals', { exact: true })).toHaveCount(3);
    await expect(defaults.getByRole('button')).toHaveCount(0);

    // My watchlist: one row of each data state under the fixed clock.
    const mine = page.getByTestId('my-watchlist-section');
    await expect(page.getByTestId('my-watchlist-row-AMD')).toContainText("data arrives after tonight's fetch");
    await expect(page.getByTestId('my-watchlist-row-ZZZQ')).toContainText('no data for this symbol');
    await expect(page.getByTestId('my-watchlist-row-MSFT')).toContainText('last bar 2026-11-12');
    await expect(page.getByTestId('my-watchlist-row-MSFT')).not.toContainText("data arrives after tonight's fetch");
    await expect(page.getByTestId('my-watchlist-row-MSFT')).not.toContainText('no data for this symbol');

    // Add NVDA through the search.
    await mine.getByRole('button', { name: 'Add Ticker', exact: true }).click();
    await mine.getByPlaceholder('Search by name or symbol (e.g. broadcom, INTC)...').fill('NVDA');
    const nvdaResult = mine.getByRole('button').filter({ hasText: 'NVIDIA Corporation' });
    await expect(nvdaResult).toBeVisible();
    await expect(page.getByTestId('my-watchlist-row-NVDA')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('my-watchlist-before-add.png') });
    await nvdaResult.click();
    await expect(page.getByTestId('my-watchlist-row-NVDA')).toContainText("data arrives after tonight's fetch");
    expect(me.posts).toEqual([{ ticker: 'NVDA', source: 'ui' }]);
    await page.screenshot({ path: testInfo.outputPath('my-watchlist-after-add.png') });

    // Remove it. Hovering the control first makes before-remove a distinct
    // state from after-add: the screenshot shows the row's remove button armed.
    const removeNvda = page.getByRole('button', { name: 'Remove NVDA from my watchlist', exact: true });
    await removeNvda.hover();
    await page.screenshot({ path: testInfo.outputPath('my-watchlist-before-remove.png') });
    await removeNvda.click();
    await expect(page.getByTestId('my-watchlist-row-NVDA')).toHaveCount(0);
    expect(me.deletes).toEqual(['NVDA']);
    // The seeded rows are still listed.
    for (const ticker of ['AMD', 'ZZZQ', 'MSFT']) {
      await expect(page.getByTestId(`my-watchlist-row-${ticker}`)).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath('my-watchlist-after-remove.png') });
  });

  test('a 401 from my watchlist shows the signed-out state, not an empty list', async ({ page }, testInfo) => {
    await mockInsightsApi(page);
    await mockDefaultWatchlist(page);
    await page.route('**/api/me/watchlist**', (r) =>
      r.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not authenticated' }),
      })
    );

    await page.goto('/insights');
    await openWatchlistTab(page);

    const mine = page.getByTestId('my-watchlist-section');
    await expect(mine.getByText('Sign in to keep a watchlist', { exact: true })).toBeVisible();
    await expect(mine.getByText('Nothing yet; add a ticker', { exact: true })).toHaveCount(0);
    await expect(mine.getByRole('button', { name: 'Add Ticker', exact: true })).toHaveCount(0);
    // The default list does not depend on the user and still renders.
    await expect(page.getByTestId('default-watchlist-section').getByText('SPY', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('my-watchlist-signed-out.png') });
  });

  test('a 503 from my watchlist shows the API detail verbatim', async ({ page }, testInfo) => {
    const detail = 'watchlist read from Cloud SQL failed: connection refused';
    await mockInsightsApi(page);
    await mockDefaultWatchlist(page);
    await page.route('**/api/me/watchlist**', (r) =>
      r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail }) })
    );

    await signIn(page);
    await openWatchlistTab(page);

    const mine = page.getByTestId('my-watchlist-section');
    // The query follows the client's default retry before it reports the failure.
    await expect(mine.getByText(detail, { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(mine.getByText('Nothing yet; add a ticker', { exact: true })).toHaveCount(0);
    await expect(mine.getByText('Sign in to keep a watchlist', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('my-watchlist-503.png') });
  });
});
