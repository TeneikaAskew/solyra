/**
 * E2E: Structured AI Insights page.
 *
 * All backend calls are mocked so this spec doesn't require Cloud SQL or the
 * agent pipeline to be running. Payloads live in
 * tests/helpers/fixtures/insights.ts, typed against InsightReportEnvelope /
 * InsightHistoryResponse / RefreshResponse / RunStatus / WatchlistResponse.
 *
 * The mocks cover three flows:
 *   - existing report loads and renders all the cards
 *   - empty state shows the CTA when /report returns 404
 *   - refresh runs the queued -> running -> done polling loop and
 *     eventually reloads the report
 *
 * Three further flows sit at the end of the file: the partial-report banner
 * of a degraded report, the Watchlist tab's Generate report running live
 * with a cutoff set, and the error surfaces of the report, ranking and chat.
 */
import { test, expect } from '@playwright/test';
import { M } from '../helpers/mocks';
import {
  MOCK_INSIGHT_REPORT,
  MOCK_INSIGHT_REPORT_DEGRADED,
  MOCK_WATCHLIST,
  mockInsightsApi,
  runStatus,
} from '../helpers/fixtures/insights';

test.describe('AI Insights (structured)', () => {
  test('renders a full report with all cards', async ({ page }) => {
    await mockInsightsApi(page);
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    // Header: ticker + direction badge
    await expect(page.locator('h2').filter({ hasText: 'IWM' })).toBeVisible();
    await expect(page.getByText(/long · high/i)).toBeVisible();

    // Thesis
    await expect(page.getByText(/breakout above prior-day high/i)).toBeVisible();

    // Entry zone
    await expect(page.getByText('220.00 – 221.50')).toBeVisible();

    // Bull / bear cards
    await expect(page.getByText('Bull Case')).toBeVisible();
    await expect(page.getByText('Bear Case')).toBeVisible();
    await expect(page.getByText('Volume + FTFC + trigger break aligned.')).toBeVisible();

    // Strat
    await expect(page.getByText('212_bull_reversal')).toBeVisible();

    // Risk flag
    await expect(page.getByText(/CPI release within holding period/)).toBeVisible();

    // Persona plans card with all three personas
    await expect(page.getByText('Persona Plans')).toBeVisible();
    await expect(page.getByText('Aggressive')).toBeVisible();
    await expect(page.getByText('Neutral')).toBeVisible();
    await expect(page.getByText(/^Conservative$/)).toBeVisible();
    // Aggressive plan numbers
    await expect(page.getByText('$220.00 – $222.50')).toBeVisible();
    await expect(page.getByText('1.50× normal')).toBeVisible();
    await expect(page.getByText(/Wider stop, extended targets/)).toBeVisible();

    // Footer model versions line
    await expect(page.getByText(/trader: vertex:gemini-2.0-flash/)).toBeVisible();
  });

  test('shows empty-state CTA when no report exists', async ({ page }) => {
    await mockInsightsApi(page, { report: null });
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/no report yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /generate report/i })).toBeVisible();
  });

  test('refresh runs the queued -> running -> done polling loop', async ({ page }) => {
    await mockInsightsApi(page, { report: null });

    // Sequenced routes, re-registered after the helper so they win
    // (Playwright matches newest-first): the report 404s until the refresh
    // lands, and the run poll reports `running` before `done`.
    let reportFetches = 0;
    await page.route('**/api/insights/report/IWM', (route) => {
      reportFetches += 1;
      if (reportFetches === 1) return route.fulfill(M.notFound());
      return route.fulfill(M.ok(MOCK_INSIGHT_REPORT));
    });
    let pollCount = 0;
    await page.route('**/api/insights/runs/**', (route) => {
      pollCount += 1;
      return route.fulfill(M.ok(runStatus(pollCount >= 2 ? 'done' : 'running')));
    });

    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    // Click Generate Report
    await page.getByRole('button', { name: /generate report/i }).click();

    // Report eventually appears (polling will run to done state)
    await expect(page.locator('h2').filter({ hasText: 'IWM' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/breakout above prior-day high/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Point-in-time replay — datetime picker + ?as_of= query string
// ---------------------------------------------------------------------------

test.describe('AI Insights — point-in-time replay', () => {
  /**
   * Stand up the replay mock surface: a report that always loads, an empty
   * history, a refresh that records the URL it was called with, and a run
   * poll that reports `done` immediately so polling terminates fast.
   *
   * Returns the array of refresh-URLs the page hit, so each test can assert
   * exactly which query strings the UI sent.
   */
  async function installRoutes(page: import('@playwright/test').Page): Promise<string[]> {
    const refreshUrls: string[] = [];
    await mockInsightsApi(page, { onRefresh: (url) => refreshUrls.push(url) });
    return refreshUrls;
  }

  test('picker is rendered with a max-now cap on the input', async ({ page }) => {
    await installRoutes(page);
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    const picker = page.getByLabel('Point-in-time cutoff');
    await expect(picker).toBeVisible();

    // The `max` attribute prevents users from picking a future moment
    // in the date-picker UI. We assert two things, deliberately:
    //   1. A parseable ISO datetime is set (proves the binding works).
    //   2. The value is within ~1 day of now (proves it's tracking the
    //      clock, not a hardcoded fallback). We can't be tighter than
    //      that because <input type="datetime-local"> takes a *local*-
    //      time string but the JS we hand it via toISOString() is UTC,
    //      so re-parsing through `new Date()` re-applies the TZ offset
    //      and the value drifts by up to 12-14 h depending on locale.
    //      The 1-day window covers every real-world TZ.
    const max = await picker.getAttribute('max');
    expect(max).toBeTruthy();
    const maxMs = new Date(max as string).getTime();
    expect(Number.isFinite(maxMs)).toBeTruthy();
    expect(Math.abs(maxMs - Date.now())).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  test('button label flips between Re-analyze and Replay based on picker state', async ({
    page,
  }) => {
    await installRoutes(page);
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    // Default state — no cutoff set → live re-analysis label.
    const button = page.locator('button', { hasText: /^Re-analyze$|^Replay$/ });
    await expect(button).toHaveText(/Re-analyze/);

    // Setting a cutoff flips the label.
    await page.getByLabel('Point-in-time cutoff').fill('2026-04-26T13:15');
    await expect(button).toHaveText(/Replay/);

    // Clearing the cutoff via the × control reverts.
    await page.getByLabel('Clear cutoff').click();
    await expect(button).toHaveText(/Re-analyze/);
  });

  test('clicking Replay sends ?as_of= encoded in the refresh URL', async ({ page }) => {
    const refreshUrls = await installRoutes(page);
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Point-in-time cutoff').fill('2026-04-26T13:15');
    await page.locator('button', { hasText: 'Replay' }).click();

    // Wait for the refresh request to land — polling kicks in after.
    await expect.poll(() => refreshUrls.length).toBeGreaterThanOrEqual(1);

    const url = new URL(refreshUrls[0]);
    expect(url.pathname).toBe('/api/insights/report/IWM/refresh');
    // Browser datetime-local doesn't append a tz; the value goes through
    // the API as-is and the server treats naive input as UTC.
    expect(url.searchParams.get('as_of')).toBe('2026-04-26T13:15');
  });

  test('clicking Re-analyze with no cutoff sends a query-string-free URL', async ({
    page,
  }) => {
    const refreshUrls = await installRoutes(page);
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    await page.locator('button', { hasText: 'Re-analyze' }).click();
    await expect.poll(() => refreshUrls.length).toBeGreaterThanOrEqual(1);

    const url = new URL(refreshUrls[0]);
    expect(url.pathname).toBe('/api/insights/report/IWM/refresh');
    expect(url.search).toBe('');
  });

  test('clearing the cutoff after setting it sends a live (no-as_of) refresh', async ({
    page,
  }) => {
    const refreshUrls = await installRoutes(page);
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    // Set a cutoff so the button reads Replay …
    await page.getByLabel('Point-in-time cutoff').fill('2026-04-26T13:15');
    await expect(page.locator('button', { hasText: 'Replay' })).toBeVisible();
    // … then clear it.
    await page.getByLabel('Clear cutoff').click();
    await expect(page.locator('button', { hasText: 'Re-analyze' })).toBeVisible();

    await page.locator('button', { hasText: 'Re-analyze' }).click();
    await expect.poll(() => refreshUrls.length).toBeGreaterThanOrEqual(1);

    expect(new URL(refreshUrls[0]).search).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Degraded report, the cutoff's watchlist exception, and the error surfaces
// ---------------------------------------------------------------------------

test.describe('AI Insights — degraded and failed states', () => {
  test('a degraded report shows the partial-report banner naming each failed section, a complete one shows none', async ({
    page,
  }) => {
    await mockInsightsApi(page, { report: MOCK_INSIGHT_REPORT_DEGRADED });
    await page.goto('/insights');
    await page.waitForLoadState('networkidle');

    // The fixture lists one failed section, `judge`; the banner names it,
    // and the header card still renders the degraded report below it.
    const banner = page.getByText(/Partial report: the following sections were unavailable/);
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('judge');
    await expect(page.locator('h2').filter({ hasText: 'IWM' })).toBeVisible();

    // Re-registered after the helper so it wins (Playwright matches
    // newest-first): the same page on a report with no failed sections.
    await page.route('**/api/insights/report/IWM', (route) => route.fulfill(M.ok(MOCK_INSIGHT_REPORT)));
    await page.reload();
    await expect(page.locator('h2').filter({ hasText: 'IWM' })).toBeVisible();
    await expect(page.getByText(/Partial report/)).toHaveCount(0);
  });

  test("a watchlist row's Generate report runs live even while a cutoff is set", async ({ page }) => {
    const refreshUrls: string[] = [];
    await mockInsightsApi(page, { watchlist: MOCK_WATCHLIST, onRefresh: (url) => refreshUrls.push(url) });
    // Clicking a row switches the active ticker to AAPL, so every AAPL
    // endpoint the page then calls needs an answer (an unmocked /api call
    // would fall through to the dev proxy).
    await page.route('**/api/insights/report/AAPL', (r) => r.fulfill(M.notFound()));
    await page.route('**/api/insights/report/AAPL/history**', (r) =>
      r.fulfill(M.ok({ ticker: 'AAPL', count: 0, reports: [] }))
    );
    await page.route('**/api/dashboard/brief/AAPL', (r) =>
      r.fulfill(M.ok({ ticker: 'AAPL', source: 'unavailable', reason: 'no brief for today' }))
    );
    const aaplRefreshUrls: string[] = [];
    await page.route('**/api/insights/report/AAPL/refresh**', (r) => {
      aaplRefreshUrls.push(r.request().url());
      return r.fulfill(M.ok({ run_id: '00000000-0000-0000-0000-000000000002', ticker: 'AAPL', status: 'queued' }));
    });

    await page.goto('/insights');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Point-in-time cutoff').fill('2026-04-26T13:15');
    await expect(page.locator('button', { hasText: 'Replay' })).toBeVisible();

    await page.getByRole('button', { name: 'Watchlist' }).click();
    await expect(page.getByText('2 ranked of 42 candidates')).toBeVisible();
    // The AAPL row of the shared ranking fixture.
    const aaplRow = page.locator('div.rounded-lg', { hasText: 'AAPL' }).filter({
      has: page.getByRole('button', { name: 'Generate report' }),
    });
    await aaplRow.getByRole('button', { name: 'Generate report' }).click();
    await expect.poll(() => aaplRefreshUrls.length).toBeGreaterThanOrEqual(1);

    // Live: no cutoff on the URL, and nothing went to the IWM refresh route.
    const url = new URL(aaplRefreshUrls[0]);
    expect(url.pathname).toBe('/api/insights/report/AAPL/refresh');
    expect(url.search).toBe('');
    expect(refreshUrls).toHaveLength(0);
    // The page switched to AAPL's Briefing tab, and the user's cutoff is still set.
    await expect(page.getByText(/no report yet/i)).toBeVisible();
    await expect(page.getByLabel('Point-in-time cutoff')).toHaveValue('2026-04-26T13:15');
    await expect(page.locator('button', { hasText: 'Replay' })).toBeVisible();
  });

  test('a failed report, ranking or chat request says so on the page with its status', async ({ page }) => {
    await mockInsightsApi(page);
    const fail503 = { status: 503, contentType: 'application/json', body: JSON.stringify({ detail: 'down' }) };
    await page.route('**/api/insights/report/IWM', (r) => r.fulfill(fail503));
    await page.route('**/api/insights/watchlist**', (r) => r.fulfill(fail503));
    await page.route('**/api/insights/chat', (r) => r.fulfill(fail503));

    await page.goto('/insights');
    // The report query retries once before it reports the failure.
    await expect(page.getByText('Failed to load report: insights 503')).toBeVisible({ timeout: 15_000 });
    // The page chrome around the failed card is still there.
    await expect(page.getByRole('heading', { name: 'AI Insights' })).toBeVisible();
    await expect(page.getByLabel('Point-in-time cutoff')).toBeVisible();

    await page.getByRole('button', { name: 'Watchlist' }).click();
    await expect(page.getByText('Failed to load watchlist: watchlist 503')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Chat' }).click();
    const input = page.getByPlaceholder('Ask about IWM...');
    await input.fill('what is the gamma regime');
    await input.press('Enter');
    // The user's message stays, followed by an assistant bubble carrying the status.
    await expect(page.getByText('what is the gamma regime')).toBeVisible();
    await expect(page.getByText(/^Error: 503/)).toBeVisible();
  });
});
