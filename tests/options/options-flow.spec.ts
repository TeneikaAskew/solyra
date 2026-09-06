/**
 * E2E: Options Flow ("/options") — chain heatmap, toggles, live AV fallback.
 *
 * The page was restructured (OptionsFlowPage.tsx): it now opens on the
 * Heatseeker tab (SwingMode grid cockpit) and the original chain-profile
 * body — D3 GEX heatmap, net/calls/puts toggles, source footer — lives in
 * the Profiles tab (ProfilesTab.tsx), reached via the top-level segmented
 * control. Tests that assert the chain UI click into Profiles first.
 *
 * All backend traffic is intercepted via mockOptionsApi (helpers/mocks.ts):
 * dates, chain, grid, levels, and the greeks POST — the full fan-out of the
 * page. An unmocked request would hit the Vite proxy and 500 without a
 * backend.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { mockCommon, M } from '../helpers/mocks';
import {
  mockOptionsApi,
  MOCK_OPTIONS_DATES,
  MOCK_OPTIONS_CHAIN,
  MOCK_GRID_POPULATED,
  MOCK_GREEKS,
} from '../helpers/fixtures/options';

/** Open the Profiles tab (the original chain-profile view). */
async function openProfilesTab(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Profiles' }).click();
}

test.describe('Options Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockOptionsApi(page);
  });

  test('navigates to /options', async ({ page }) => {
    await page.goto('/options');
    await page.waitForLoadState('networkidle');
    // The restructured page (OptionsFlowPage.tsx) no longer renders the
    // literal word "options" — its landmark is the Symbol combobox plus the
    // Heatseeker / Flowseeker / Profiles view switcher (TABS).
    await expect(page.getByText('Symbol', { exact: true })).toBeVisible();
    for (const tab of ['Heatseeker', 'Flowseeker', 'Profiles']) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }
  });

  test('renders strike values in chain heatmap (Profiles tab)', async ({ page }) => {
    await page.goto('/options');
    await page.waitForLoadState('networkidle');
    await openProfilesTab(page);
    // Strike 220 should appear at least once (as an axis label in the D3
    // heatmap ProfilesTab renders from the mocked chain)
    await expect(page.getByText(/220/).first()).toBeVisible();
  });

  test('renders chart axes and net/calls/puts toggle (Profiles tab)', async ({ page }) => {
    await page.goto('/options');
    await page.waitForLoadState('networkidle');
    await openProfilesTab(page);
    // ProfilesTab renders a GEX/VEX chart; toggle labels are visible in the toolbar
    await expect(page.getByText(/calls/i).first()).toBeVisible();
    await expect(page.getByText(/puts/i).first()).toBeVisible();
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/options');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });
});

// ── Live fallback: Cloud SQL 404 → AlphaVantage live proxy ────────────────
// Replaces the decommissioned Cloudflare Worker. When the EOD Cloud SQL
// endpoint returns 404 (e.g. today's date before the 9 PM fetcher), the
// Profiles tab must fall through to /api/options/live/{ticker}/{date} and
// render the same heatmap with an "AlphaVantage Live" source badge
// (ProfilesTab.tsx useOptionsData + source footer).

test.describe('Options Flow — live AV fallback', () => {
  test.beforeEach(async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/options/dates/IWM*', (r) => r.fulfill(M.ok(MOCK_OPTIONS_DATES)));
    // Cloud SQL chain endpoint 404s — segment glob is single-level so it does
    // NOT capture /api/options/live/IWM/... (and the grid/levels routes
    // registered after it take precedence for their URLs).
    await page.route('**/api/options/IWM/*', (r) =>
      r.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'No AlphaVantage options data ingested for IWM.' }),
      })
    );
    // The Swing grid and gamma levels are independent of the chain fallback;
    // keep the grid alive and let /levels 404 too (the EOD snapshot that
    // backs /levels is the same one that 404'd above). ProfilesTab then
    // estimates spot from the chain's deltas instead of the server spot.
    await page.route('**/api/options/IWM/grid*', (r) => r.fulfill(M.ok(MOCK_GRID_POPULATED)));
    await page.route('**/api/options/IWM/*/levels*', (r) =>
      r.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'No AlphaVantage options data ingested for IWM.' }),
      })
    );
    await page.route('**/api/options/greeks', (r) => r.fulfill(M.ok(MOCK_GREEKS)));
    // Live endpoint returns the chain with the live source badge.
    await page.route('**/api/options/live/IWM/*', (r) =>
      r.fulfill(
        M.ok({
          ...MOCK_OPTIONS_CHAIN,
          metadata: { source: 'alphavantage_live', data_source: 'alphavantage', row_count: 10 },
        })
      )
    );
  });

  test('falls back to live endpoint and shows AlphaVantage Live badge', async ({ page }) => {
    await page.goto('/options');
    await page.waitForLoadState('networkidle');
    await openProfilesTab(page);
    await expect(page.getByText(/AlphaVantage Live/).first()).toBeVisible();
  });
});

/**
 * The `?limit=1` contract, pinned.
 *
 * `mockOptionsApi` routes the dates endpoint with a trailing wildcard, and
 * that wildcard matches the limited and the unbounded request identically. So
 * the whole suite stays green if someone drops `?limit=1` from SwingMode —
 * silently reverting a 9,870 ms page load back onto a query that reads
 * 10,373,012 index rows to return 43 — or "unifies" ProfilesTab onto
 * `limit=1`, which collapses its date picker to a single option.
 *
 * A perf regression that no test can see is one that comes back. These assert
 * the request URLs each view actually issues.
 */
test.describe('options dates: the limit contract', () => {
  test('the Swing view asks for one date; the Profiles picker asks for all', async ({ page }) => {
    const datesRequests: string[] = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (url.pathname.startsWith('/api/options/dates/')) {
        datesRequests.push(url.pathname + url.search);
      }
    });

    await mockOptionsApi(page);
    await page.goto('/options');
    await page.waitForLoadState('networkidle');

    // Heatseeker/Swing is the landing tab and reads dates[0] only.
    expect(
      datesRequests.some((u) => u.startsWith('/api/options/dates/IWM') && u.includes('limit=1')),
      `no limited dates request; saw ${JSON.stringify(datesRequests)}`,
    ).toBe(true);

    await openProfilesTab(page);
    await page.waitForLoadState('networkidle');

    // The picker needs the history, so its request must NOT carry limit=1.
    expect(
      datesRequests.some((u) => u.startsWith('/api/options/dates/IWM') && !u.includes('limit=')),
      `no unbounded dates request for the picker; saw ${JSON.stringify(datesRequests)}`,
    ).toBe(true);
  });

  test('Trinity Mode is intercepted too — none of SPX/SPY/QQQ reaches a real backend', async ({ page }) => {
    // `mockOptionsApi` was scoped to IWM, and TrinityTab renders SPX/SPY/QQQ
    // panels that each fetch their own dates and levels. Six unrouted requests
    // went to this Vite's proxy, which falls through to `solyra-api-staging`
    // when nothing answers on :8000 — outside the hermetic boundary, and
    // silently, because the spec still passed.
    //
    // Trinity is behind an inner toggle and the page opens on Swing, so a
    // spec that only loads /options never renders it. This one clicks in,
    // which is what makes the assertion mean anything.
    const outcomes: string[] = [];
    page.on('response', (res) => {
      const url = new URL(res.url());
      if (url.pathname.startsWith('/api/options/')) {
        outcomes.push(`${res.status()} ${url.pathname}`);
      }
    });

    await mockOptionsApi(page);
    await page.goto('/options');
    // HeroUI's single-selection ToggleButtonGroup renders as a radiogroup, so
    // the mode buttons are radios rather than buttons (same as Settings).
    await page.getByRole('radio', { name: /Trinity Mode/i }).click();
    await page.waitForLoadState('networkidle');

    const trinity = outcomes.filter((o) => /\/(SPX|SPY|QQQ)\b/.test(o));
    expect(trinity.length, 'Trinity never issued its requests — did the toggle move?')
      .toBeGreaterThan(0);
    const notOk = trinity.filter((o) => !o.startsWith('2'));
    expect(notOk, `unmocked Trinity requests reached the proxy: ${JSON.stringify(notOk)}`)
      .toEqual([]);
  });
});
