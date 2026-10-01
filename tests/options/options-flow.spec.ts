/**
 * E2E: Options Flow ("/options") — chain heatmap, toggles, live AV fallback.
 *
 * The page was restructured (OptionsFlowPage.tsx): it now opens on the
 * Gamma Map tab (SwingMode grid cockpit) and the original chain-profile
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
  MOCK_GREEKS_WITH_NODES,
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
    // Gamma Map / Flow / Profiles view switcher (TABS).
    await expect(page.getByText('Symbol', { exact: true })).toBeVisible();
    for (const tab of ['Gamma Map', 'Flow', 'Profiles']) {
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

  test('renders King/Gatekeeper/Midpoint badges when the taxonomy is populated (Profiles tab)', async ({
    page,
  }) => {
    // Registered AFTER the beforeEach's mockOptionsApi, so this wins
    // (Playwright matches routes newest-first). MOCK_GREEKS itself always
    // ships an EMPTY taxonomy, so without this override the badge path —
    // including ProfilesTab's two `!`-asserted midpoint bounds — never
    // executes in any spec (issue #32 coverage gap).
    await page.route('**/api/options/greeks', (r) => r.fulfill(M.ok(MOCK_GREEKS_WITH_NODES)));
    await page.goto('/options');
    await page.waitForLoadState('networkidle');
    await openProfilesTab(page);
    // The heatmap draws each badge as an SVG text node whose ENTIRE text is
    // the bare glyph — exact matching separates them from the levels chips
    // ("◆ Gate $219.00" etc.), which substring-match the same characters.
    // ★ king (220), ◆ gatekeepers (219/222), ● the one row inside the
    // midpoint band (221, bounds 220.5–221.5).
    await expect(page.getByText('★', { exact: true })).toHaveCount(1);
    await expect(page.getByText('◆', { exact: true })).toHaveCount(2);
    await expect(page.getByText('●', { exact: true })).toHaveCount(1);
    await expect(page.getByText('★', { exact: true })).toBeVisible();
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

  test('the borrowed internal module names never appear in the app UI (issue #27)', async ({
    page,
  }) => {
    // Same negative fence the landing page carries (landing.spec.ts):
    // "Heatseeker"/"Flowseeker" are Skylit's module names and were renamed
    // to the public "Gamma Map"/"Flow" before launch. Assert on the page
    // that used to render them so a stray label cannot come back.
    await page.goto('/options');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/heatseeker|flowseeker|skylit/i)).toHaveCount(0);
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

    // Gamma Map/Swing is the landing tab and reads dates[0] only.
    //
    // Parsed, not substring-matched. `includes('limit=1')` is also true of
    // `limit=10` and `limit=1000`, so the assertion that exists to stop the
    // 9,870 ms scan coming back would have accepted a change that brings it
    // most of the way back.
    const limited = datesRequests
      .map((u) => new URL(u, 'http://x'))
      .filter((u) => u.pathname === '/api/options/dates/IWM');
    expect(
      limited.some((u) => u.searchParams.get('limit') === '1'),
      `no dates request with exactly limit=1; saw ${JSON.stringify(datesRequests)}`,
    ).toBe(true);

    await openProfilesTab(page);
    await page.waitForLoadState('networkidle');

    // The picker needs the history, so its request must carry no limit at all.
    const all = datesRequests
      .map((u) => new URL(u, 'http://x'))
      .filter((u) => u.pathname === '/api/options/dates/IWM');
    expect(
      all.some((u) => u.searchParams.get('limit') === null),
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
    //
    // Asserting a 2xx would NOT: `VITE_API_PROXY_TARGET` can point at a
    // reachable backend, and then a request that escaped every fixture route
    // still answers 200 and the spec still passes. What proves interception is
    // a catch-all registered BEFORE `mockOptionsApi` — Playwright tries the
    // most recently registered handler first, so the fixture routes win
    // whatever they match and only an escapee reaches this one. It aborts,
    // so an escaped request cannot reach the proxy even once.
    const escaped: string[] = [];
    await page.route('**/api/options/**', (r) => {
      escaped.push(new URL(r.request().url()).pathname);
      return r.abort('blockedbyclient');
    });

    const served: string[] = [];
    page.on('response', (res) => {
      const url = new URL(res.url());
      if (url.pathname.startsWith('/api/options/')) {
        served.push(`${res.status()} ${url.pathname}`);
      }
    });

    await mockOptionsApi(page);
    await page.goto('/options');
    // HeroUI's single-selection ToggleButtonGroup renders as a radiogroup, so
    // the mode buttons are radios rather than buttons (same as Settings).
    await page.getByRole('radio', { name: /Trinity Mode/i }).click();
    await page.waitForLoadState('networkidle');

    // The toggle still has to actually fire the requests, or the catch-all
    // proves nothing by staying empty.
    const trinity = served.filter((o) => /\/(SPX|SPY|QQQ)\b/.test(o));
    expect(trinity.length, 'Trinity never issued its requests — did the toggle move?')
      .toBeGreaterThan(0);

    // Interception, not success: every options request was answered by a
    // fixture route, so none of them could have reached the Vite proxy.
    expect(escaped, `options requests escaped mockOptionsApi: ${JSON.stringify(escaped)}`)
      .toEqual([]);
  });
});

/**
 * The view switcher (OPTIONS-07), the Profiles date stepper (OPTIONS-08) and the
 * Profiles error honesty that solyra#74 asks for (OPTIONS-11).
 *
 * The first two pin behaviour that already works and that nothing asserted: the
 * specs above click into Flow, Profiles and Trinity to reach their content, but
 * none asserts that a switch REPLACES the view, and nothing steps the date
 * control. The third states a requirement the page does not meet yet; see its
 * comment.
 */
test.describe('Options Flow — view switcher, date stepper and error honesty', () => {
  test.beforeEach(async ({ page }) => {
    await mockOptionsApi(page);
  });

  test('the view switcher mounts one view at a time and each inner toggle swaps its own view', async ({
    page,
  }) => {
    await page.goto('/options');
    await page.waitForLoadState('networkidle');

    // One marker per view. The Swing toolbar has GEX/VEX buttons too, so the
    // markers are headings, plus the spot input only Profiles owns.
    const swing = page.getByRole('heading', { name: /Strike × Expiration heatmap/ });
    const trinity = page.getByRole('heading', { name: /Trinity · synced index gamma/ });
    const feed = page.getByRole('heading', { name: /Live options feed/ });
    const drilldown = page.getByRole('heading', { name: /Time-bucket detail/ });
    const profiles = page.getByPlaceholder('price');
    const only = async (shown: typeof swing) => {
      for (const view of [swing, trinity, feed, drilldown, profiles]) {
        if (view === shown) await expect(view).toBeVisible();
        else await expect(view).toHaveCount(0);
      }
    };

    // Gamma Map opens on Swing, and nothing else is mounted.
    await only(swing);

    // Its inner toggle swaps Swing for Trinity and back.
    await page.getByRole('radio', { name: /Trinity Mode/i }).click();
    await only(trinity);
    await page.getByRole('radio', { name: /Swing Mode/i }).click();
    await only(swing);

    // Flow replaces Gamma Map and opens on the Live Feed.
    await page.getByRole('button', { name: 'Flow', exact: true }).click();
    await only(feed);

    // Its inner toggle swaps the feed for the drilldown and back.
    await page.getByRole('radio', { name: /Contract Drilldown/i }).click();
    await only(drilldown);
    await page.getByRole('radio', { name: /Live Feed/i }).click();
    await only(feed);

    // A feed row drills into the contract it names (the placeholder tape's
    // first row; read from the row rather than hard-coded).
    const row = page.locator('tbody tr').first();
    const [, sym, strike, cp, , exp] = (await row.locator('td').allInnerTexts()).map((c) => c.trim());
    await row.click();
    await only(drilldown);
    await expect(
      page.getByText(`${sym} ${strike} ${cp === 'C' ? 'CALL' : 'PUT'} ${exp}`, { exact: true }),
    ).toBeVisible();

    // Profiles replaces Flow.
    await openProfilesTab(page);
    await only(profiles);

    // Gamma Map comes back on Swing.
    await page.getByRole('button', { name: 'Gamma Map', exact: true }).click();
    await only(swing);
  });

  test('the Profiles date stepper walks the snapshot dates and loads the chain and levels of the date it lands on', async ({
    page,
  }) => {
    const optionsPaths: string[] = [];
    page.on('request', (req) => {
      const { pathname } = new URL(req.url());
      if (pathname.startsWith('/api/options/')) optionsPaths.push(pathname);
    });
    // Three snapshot dates, newest first, as GET /api/options/dates/{ticker} lists them.
    await page.route('**/api/options/dates/IWM*', (r) =>
      r.fulfill(M.ok({ ...MOCK_OPTIONS_DATES, dates: ['2026-04-24', '2026-04-23', '2026-04-22'] })),
    );
    await page.goto('/options');
    await openProfilesTab(page);

    // The control is two icon-only buttons around the date and has no accessible
    // name, so they are found through the label they flank: the first steps back
    // in time, the second forward.
    const label = page.locator('span.font-mono').filter({ hasText: /^\d{4}-\d{2}-\d{2}$/ });
    const buttons = label.locator('xpath=..').getByRole('button');
    const older = buttons.nth(0);
    const newer = buttons.nth(1);

    // It opens on the newest date, and there is nothing newer to step to.
    await expect(label).toHaveText('2026-04-24');
    await expect(older).toBeEnabled();
    await expect(newer).toBeDisabled();

    // One step back: the previous date, and its chain and levels are requested.
    await older.click();
    await expect(label).toHaveText('2026-04-23');
    await expect(older).toBeEnabled();
    await expect(newer).toBeEnabled();
    await expect.poll(() => optionsPaths).toContain('/api/options/IWM/2026-04-23');
    await expect.poll(() => optionsPaths).toContain('/api/options/IWM/2026-04-23/levels');

    // Two steps back: the oldest date, where there is nothing older.
    await older.click();
    await expect(label).toHaveText('2026-04-22');
    await expect(older).toBeDisabled();
    await expect.poll(() => optionsPaths).toContain('/api/options/IWM/2026-04-22');
    await expect.poll(() => optionsPaths).toContain('/api/options/IWM/2026-04-22/levels');

    // Forward again.
    await newer.click();
    await expect(label).toHaveText('2026-04-23');
    await expect(older).toBeEnabled();
  });

  // solyra#74. ProfilesTab falls back to EMPTY_GREEKS whenever it has no Greeks
  // answer (src/components/options/ProfilesTab.tsx:326, src/hooks/useOptionsGreeks.ts:145-158),
  // so with a spot resolved from /levels a FAILED Greeks request reads "Total GEX
  // +0 Positive" and "Put/Call OI 0.00 Bullish skew", with no error anywhere: a
  // flat reading that is indistinguishable from a measured one (CLAUDE.md Rule 4).
  // This test states what the issue asks for, so it fails today; `test.fail`
  // records that. When #74 is fixed it will start passing, Playwright will then
  // report "expected to fail, but passed", and this `test.fail` is the line to remove.
  test.fail('a failed Greeks request is reported as unavailable, not shown as a measured zero (solyra#74)', async ({
    page,
  }) => {
    let greeksPosts = 0;
    await page.route('**/api/options/greeks', (r) => {
      greeksPosts += 1;
      return r.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'greeks exploded' }),
      });
    });
    await page.goto('/options');
    await openProfilesTab(page);

    // Steady state first, or the negative checks below could pass before the
    // page has rendered anything: the chain and the levels are on screen, and
    // the Greeks request has failed for good (one retry, so two attempts).
    await expect(page.getByText(/^Source:/)).toBeVisible();
    await expect(page.getByText(/★ King \$/)).toBeVisible();
    await expect.poll(() => greeksPosts).toBe(2);
    await page.waitForLoadState('networkidle');

    // No zero that reads as a measurement: neither the "+0" Total GEX value nor
    // the "0.00" Put/Call OI value of EMPTY_GREEKS is on the page. Counted on the
    // values, not read off the two cards, so the check holds whether a fix hides
    // the cards or replaces their values.
    await expect(page.getByText('+0', { exact: true })).toHaveCount(0);
    await expect(page.getByText('0.00', { exact: true })).toHaveCount(0);
    // ... and the failure is said out loud, in words, somewhere on the page.
    await expect(page.getByText(/unavailable/i).first()).toBeVisible();
  });
});
