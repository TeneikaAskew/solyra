/**
 * E2E: Dashboard ("/dashboard") — the app's home view anchored on activeTicker.
 *
 * Covers brief tile, latest signals, KPI grid, best/worst trades.
 * All API calls mocked; perf budget policy lives in helpers/perfBudget.ts.
 *
 * Card/chart payloads (sectors, news, bars, backtest trio) come from the
 * typed fixture layer in helpers/fixtures/dashboard.ts — the spec carries no
 * inline copies, so the shapes stay pinned by `satisfies` in one place (#18).
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { M } from '../helpers/mocks';
import { MOCK_INSIGHT_REPORT } from '@/mocks/insights';
import { SCORE_SCENARIOS, INVALID_SCORE_CLOCK_SCENARIOS, scoreScenarioResponse } from '../helpers/fixtures/signals';
import {
  mockDashboard,
  mockDashboardCards,
  MOCK_DASHBOARD_BRIEF,
  MOCK_PLAYBOOK,
  MOCK_PLAYBOOK_FRESH,
  MOCK_PLAYBOOK_STALE_DETAIL,
  MOCK_SECTORS,
  buildDashboardNews,
} from '../helpers/fixtures/dashboard';

for (const scenario of INVALID_SCORE_CLOCK_SCENARIOS) {
  test('dashboard malformed score clock: ' + scenario.name, async ({ page }, testInfo) => {
    await mockDashboard(page); await mockDashboardCards(page);
    await page.route('**/api/signals/IWM*', r => r.fulfill(M.ok({ ticker: 'IWM', count: 1, returned: 1, source: 'cloud_sql', signals: [scenario.row] })));
    const ready = page.waitForResponse(r => new URL(r.url()).pathname === '/api/signals/IWM' && r.status() === 200);
    await page.goto('/dashboard');
    await ready;
    const score = page.getByTestId('score-explanation');
    await expect(score.getByTestId('signal-strength')).toHaveText('6');
    await expect(score).toContainText('Breakdown unavailable');
    await expect(score).not.toContainText('Base conditions:');
    await score.locator('summary').click();
    await expect(score).toContainText(`${scenario.label}: Unavailable`);
    await expect(score).toContainText(`Event time: ${scenario.row.time}`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await score.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('dashboard-clock-' + scenario.name + '.png'), fullPage: true });
  });
}

for (const scenario of SCORE_SCENARIOS) {
  test(`dashboard recorded score explanation: ${scenario.name}`, async ({ page }, testInfo) => {
    await mockDashboard(page); await mockDashboardCards(page);
    await page.route('**/api/signals/IWM*', r => r.fulfill(M.ok(scoreScenarioResponse(scenario))));
    await page.goto('/dashboard');
    await expect(page.getByText('Historical analytical signals', { exact: true })).toBeVisible();
    const score = page.getByTestId('score-explanation');
    await expect(score.getByTestId('signal-strength')).toHaveText(scenario.strength);
    await expect(score).toContainText(scenario.strategy);
    if (scenario.base) await expect(score).toContainText(`Base conditions: ${scenario.base}`);
    else await expect(score).toContainText('Breakdown unavailable');
    await score.locator('summary').click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(score).toContainText('historical_signals');
    await expect(score).toContainText('Event time');
    await expect(score).toContainText('Generated at');
    await expect(score).toContainText('Inserted at');
    if (scenario.base) {
      await expect(score).toContainText('cloud_sql');
      await expect(score).toContainText('backfill');
      await expect(score).toContainText('historical-default');
      await expect(score).toContainText(`Composite strength: ${scenario.base}`);
      await expect(score).toContainText('Bonus total: 0');
    }
    if (scenario.name === 'legacy') {
      await expect(score).toContainText('Raw conditions (unvalidated): 6/5');
      await expect(score).not.toContainText('Base conditions: 6/5');
      await expect(score).toContainText('legacy_score_contract_missing');
      await expect(score).toContainText('Input identity: Unavailable');
    }
    await score.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`dashboard-score-${scenario.name}.png`), fullPage: true });
  });
}

test('dashboard signal loading, empty and failure never fabricate score explanations', async ({ page }, testInfo) => {
  await mockDashboard(page); await mockDashboardCards(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/signals/IWM*', async r => {
    await pending;
    await r.fulfill(M.ok({ ticker: 'IWM', count: 0, returned: 0, source: 'cloud_sql', signals: [] }));
  });
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status', { name: 'Loading' }).first()).toBeVisible();
  await expect(page.getByTestId('score-explanation')).toHaveCount(0);
  release();
  await expect(page.getByText('No signals yet for this ticker.')).toBeVisible();
  await page.route('**/api/signals/IWM*', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{"detail":"signals unavailable"}' }));
  await page.reload();
  await expect(page.getByText("Couldn't load this data").first()).toBeVisible();
  await expect(page.getByTestId('score-explanation')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('dashboard-score-unavailable.png') });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockDashboard(page);
    await mockDashboardCards(page);
  });

  test('renders Overview heading + market brief for the active ticker', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Redesigned Overview: "Overview" H1, the active ticker in the header
    // micro-label + hero, and the market brief panel.
    await expect(page.locator('h1', { hasText: 'Overview' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/market brief/i).first()).toBeVisible();
    await expect(page.getByText('IWM').first()).toBeVisible();
  });

  test('shows daily bias card', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/daily bias/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows the daily KPI tiles (prev close / latest close / 2-day change / RSI)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Redesigned KPI row, computed from brief.daily_indicators + reference.
    await expect(page.getByText(/prev close/i)).toBeVisible();
    await expect(page.getByText(/latest close/i)).toBeVisible();
    await expect(page.getByText(/2-day change/i)).toBeVisible();
    await expect(page.getByText(/RSI \(14\)/i)).toBeVisible();
  });

  test('intraday chart exposes the Candles / Area toggle and switches', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('IWM · intraday')).toBeVisible({ timeout: 10_000 });
    const candles = page.getByRole('button', { name: 'Candles' });
    const area = page.getByRole('button', { name: 'Area' });
    await expect(candles).toBeVisible();
    await expect(area).toBeVisible();
    // Switching to Area renders the Recharts area surface without crashing.
    await area.click();
    await expect(page.locator('svg.recharts-surface').first()).toBeVisible({ timeout: 5_000 });
  });

  test('sector rotation card ranks sectors, shows an em-dash row, and 1D/5D toggle switches values', async ({ page }) => {
    await page.route('**/api/market/sectors', (r) => r.fulfill(M.ok(MOCK_SECTORS)));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const card = page.getByTestId('sector-rotation-card');
    await expect(card).toBeVisible({ timeout: 10_000 });

    // as-of caption in the header meta.
    await expect(card).toContainText(`as of ${MOCK_SECTORS.as_of}`);

    // 1D (default): ranked desc by chg_1d_pct — XLF (2.5) > XLK (1.25) > XLE (-0.75),
    // unavailable XLY sinks to the bottom.
    let rows = await card.getByTestId('sector-row').allTextContents();
    expect(rows).toHaveLength(4);
    expect(rows[0]).toContain('Financials');
    expect(rows[1]).toContain('Technology');
    expect(rows[2]).toContain('Energy');
    expect(rows[3]).toContain('Consumer Discretionary');
    expect(rows[3]).toContain('—');

    // Toggle to 5D — ranked desc by chg_5d_pct — XLE (4.2) > XLK (3.4) > XLF (-1.1).
    await card.getByRole('button', { name: '5D' }).click();
    rows = await card.getByTestId('sector-row').allTextContents();
    expect(rows[0]).toContain('Energy');
    expect(rows[1]).toContain('Technology');
    expect(rows[2]).toContain('Financials');
    expect(rows[3]).toContain('Consumer Discretionary');
  });

  test('News card counts AV-news rows dated in the past and shows both headlines', async ({ page }) => {
    // Explicit re-registration (fixture default): this test's assertions pin
    // the news-card match condition (`source === 'AV news'` over the FULL
    // events array — see the fixture's docstring), so its dependency on the
    // payload stays visible here even though mockDashboardCards already
    // serves the same rows.
    await page.route('**/api/catalysts/events**', (r) => r.fulfill(M.ok(buildDashboardNews())));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const newsCard = page.getByTestId('news-card');
    await expect(page.getByText('2 articles')).toBeVisible({ timeout: 10_000 });
    await expect(newsCard.getByText('Russell 2000 constituents rally on rate-cut optimism')).toBeVisible();
    await expect(newsCard.getByText('Small-cap earnings season kicks off with mixed guidance')).toBeVisible();
  });

  test('renders within perf budget (strict 7s)', async ({ page }) => {
    // Dashboard has heavy API fan-out (brief + backtest + equity + signals +
    // playbook + live quote/history/avg-vol + reference). 7s allows for the
    // first-paint waterfall before mocks fully resolve.
    const start = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(7000));
  });
  // #861 — playbook_cards went 85 days stale and the top setup rendered the
  // June card set as today's. The server now sends the set's date and
  // refuses a stale one; the tile must show the date and surface the refusal.
  test('top setup shows the card set date and age', async ({ page }) => {
    await page.route('**/api/playbook/IWM', (r) => r.fulfill(M.ok(MOCK_PLAYBOOK_FRESH)));
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(MOCK_PLAYBOOK_FRESH.cards[0].name)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('playbook-age')).toHaveText(/as of Sep 5, 2026 \(1d old\)/);
  });

  test('top setup surfaces the stale-cards refusal instead of a generic empty state', async ({ page }) => {
    await page.route('**/api/playbook/IWM', (r) =>
      r.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAYBOOK_STALE_DETAIL),
      })
    );
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/playbook unavailable/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/2026-06-13 is 85 days old/)).toBeVisible();
    await expect(page.getByText(/run the pipeline to populate/i)).toHaveCount(0);
  });

  // DASHBOARD-11. The Refresh button is `window.location.reload()`, not a
  // refetch: the document is loaded again and the whole fan-out is asked for
  // again. Both halves are asserted: a second `load` event fires, and the brief
  // endpoint is requested a second time.
  test('Refresh reloads the document and asks for the data again', async ({ page }) => {
    let briefRequests = 0;
    let documentLoads = 0;
    page.on('load', () => {
      documentLoads += 1;
    });
    await page.route('**/api/dashboard/brief/IWM*', (r) => {
      briefRequests += 1;
      return r.fulfill(M.ok(MOCK_DASHBOARD_BRIEF));
    });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1', { hasText: 'Overview' }).first()).toBeVisible({ timeout: 10_000 });
    const requestsBefore = briefRequests;
    const loadsBefore = documentLoads;
    expect(requestsBefore).toBeGreaterThanOrEqual(1);
    expect(loadsBefore).toBe(1);

    await page.getByRole('button', { name: 'Refresh' }).click();

    await expect.poll(() => documentLoads).toBe(loadsBefore + 1);
    await expect.poll(() => briefRequests).toBeGreaterThan(requestsBefore);
    await expect(page.locator('h1', { hasText: 'Overview' }).first()).toBeVisible({ timeout: 10_000 });
  });

  // DASHBOARD-12. The style choice is written to localStorage `overview-chart`
  // and read back on the next mount, so Area survives a reload while Candles
  // (the fixed-height candle slot) is the default. The existing toggle test
  // asserts the Recharts surface appears; this one asserts the memory.
  test('the Candles or Area choice is stored and survives a reload', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const area = page.getByRole('button', { name: 'Area', exact: true });
    const candles = page.getByRole('button', { name: 'Candles', exact: true });
    const candleSlot = page.getByTestId('intraday-chart-slot');
    const stored = () => page.evaluate(() => localStorage.getItem('overview-chart'));

    // Default: Candles, nothing stored yet.
    await expect(candleSlot).toBeVisible({ timeout: 10_000 });
    await expect(candles).toHaveClass(/active/);
    expect(await stored()).toBeNull();

    await area.click();
    await expect(candleSlot).toHaveCount(0);
    await expect(page.locator('svg.recharts-surface').first()).toBeVisible();
    await expect(area).toHaveClass(/active/);
    expect(await stored()).toBe('area');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('IWM · intraday')).toBeVisible({ timeout: 10_000 });
    await expect(area).toHaveClass(/active/);
    await expect(candleSlot).toHaveCount(0);

    await candles.click();
    await expect(candleSlot).toBeVisible();
    await expect(candles).toHaveClass(/active/);
    expect(await stored()).toBe('candle');
  });
});


test('dashboard separates forward calendar rows from dated historical news', async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date('2026-10-27T15:00:00Z') });
  await mockDashboard(page); await mockDashboardCards(page);
  await page.route('**/api/catalysts/events**', r => r.fulfill(M.ok({ events_by_date: {
    '2026-10-25': [{ date: '2026-10-25', ticker: 'IWM', source: 'AV news', title: 'Older article' }],
    '2026-10-26': [{ date: '2026-10-26', ticker: 'IWM', source: 'AV news', title: 'Newer article' }],
    '2026-10-27': [{ date: '2026-10-27', ticker: 'IWM', source: 'calendar', title: 'Current event' }],
    '2026-10-28': [{ date: '2026-10-28', ticker: 'IWM', source: 'calendar', title: 'Future event' }],
    'unknown': [{ date: '', ticker: 'IWM', source: 'AV news', title: 'Unknown article date' }],
  } })));
  await page.goto('/dashboard');
  await expect(page.getByTestId('catalyst-date-evidence')).toContainText('2026-10-27 to 2026-11-03');
  await expect(page.getByTestId('catalyst-date-evidence')).toContainText('1 date unavailable');
  const forwardCard = page.getByTestId('catalyst-date-evidence').locator('..');
  await expect(forwardCard.getByText('Current event', { exact: true })).toBeVisible();
  await expect(forwardCard.getByText('Future event', { exact: true })).toBeVisible();
  await expect(forwardCard.getByText('Older article', { exact: true })).toHaveCount(0);
  const news = page.getByTestId('news-card');
  await expect(news).toContainText('Newest supplied news date: 2026-10-26');
  await expect(news).toContainText('2026-10-25 (date only)');
  await expect(news).toContainText('date unavailable');
  const content = await news.innerText(); expect(content.indexOf('Newer article')).toBeLessThan(content.indexOf('Older article'));
  await page.getByTestId('news-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('date-qualified-dashboard.png') });
});

test('event endpoint failure is visible without hiding successful dashboard cards', async ({ page }, testInfo) => {
  await mockDashboard(page); await mockDashboardCards(page);
  await page.route('**/api/catalysts/events**', r => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'event source unavailable' }) }));
  await page.goto('/dashboard');
  await expect(page.getByTestId('news-card')).toContainText('event source unavailable');
  await expect(page.getByTestId('news-card')).not.toContainText('No matching news');
  await expect(page.getByTestId('sector-rotation-card')).toBeVisible();
  await page.getByTestId('news-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('event-refusal-independent-cards.png') });
});


test('event error Retry stays on the dashboard and recovers the same query', async ({ page }, testInfo) => {
  await mockDashboard(page); await mockDashboardCards(page);
  let reads = 0;
  let recover = false;
  await page.route('**/api/catalysts/events**', r => {
    reads += 1;
    return recover ? r.fulfill(M.ok(buildDashboardNews())) : r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'event source unavailable' }) });
  });
  await page.goto('/dashboard');
  const news = page.getByTestId('news-card');
  await expect(news.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  const before = reads; recover = true;
  await news.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(news).toContainText('Russell 2000 constituents rally');
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(reads).toBe(before + 1);
  await page.getByTestId('news-card').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('event-retry-stays-dashboard.png') });
});

// Local hermetic browser only: inspect the actual React chart inputs, not a
// second selector or a canvas-presence proxy. No live-site/network inspection.
async function dashboardChartTimes(page: import('@playwright/test').Page, component: 'CandlestickChart' | 'PriceAreaChart') {
  return page.evaluate((name) => {
    for (const node of document.querySelectorAll('div, svg')) {
      const key = Object.keys(node).find(k => k.startsWith('__reactFiber$'));
      if (!key) continue;
      let fiber = (node as unknown as Record<string, unknown>)[key] as {
        type?: { name?: string }; memoizedProps?: Record<string, unknown>; return?: unknown;
      } | undefined;
      while (fiber) {
        if (fiber.type?.name === name) {
          const rows = fiber.memoizedProps?.[name === 'CandlestickChart' ? 'candlestick' : 'data'] as { time: number }[] | undefined;
          if (rows) return rows.map(row => row.time);
        }
        fiber = fiber.return as typeof fiber;
      }
    }
    return null;
  }, component);
}

for (const review of [false, true]) {
  test(`dashboard chart inputs share two-session window and cutoff (${review ? 'review' : 'live'})`, async ({ page }, testInfo) => {
    await page.clock.install({ time: new Date('2026-10-28T22:00:00Z') });
    await mockDashboard(page); await mockDashboardCards(page);
    await page.route('**/api/dashboard/brief/IWM*', r => r.fulfill(M.ok({ ...MOCK_DASHBOARD_BRIEF,
      daily_indicators: { ...MOCK_DASHBOARD_BRIEF.daily_indicators, date: '2026-10-28' } })));
    await page.route('**/api/playbook/IWM?*', r => r.fulfill(M.ok(MOCK_PLAYBOOK)));
    await page.route('**/api/insights/report/IWM?*', r => r.fulfill(M.ok(MOCK_INSIGHT_REPORT)));
    const times = ['2026-10-06T04:00Z', '2026-10-26T10:00Z', '2026-10-27T04:00Z',
      '2026-10-27T15:00Z', '2026-10-28T04:00Z', '2026-10-28T14:00Z', '2026-10-28T15:00Z']
      .map(s => Date.parse(s) / 1000);
    const candles = times.map((time, i) => ({ time, open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i }));
    await page.route('**/api/market/data/IWM/**', r => r.fulfill(M.ok({ ticker: 'IWM', date: '202610', timeframe: 60,
      count: candles.length, candlestick: candles, volume: times.map(time => ({ time, value: 10 })) })));
    await page.goto('/dashboard');
    await expect(page.getByTestId('intraday-chart-slot')).toBeVisible();
    if (review) {
      await page.getByTestId('replay-toggle').click();
      await page.getByRole('button', { name: 'Latest session close' }).click();
      await page.getByRole('spinbutton', { name: /hour/i }).fill('2');
      await page.getByTestId('replay-apply').click();
      await expect(page.getByTestId('replay-toggle')).toContainText('Replay ·');
    }
    const expected = times.slice(2, review ? -1 : undefined);
    await expect(page.getByText('60-min bars · 2 available sessions', { exact: true })).toBeVisible();
    await expect.poll(() => dashboardChartTimes(page, 'CandlestickChart')).toEqual(expected);
    await page.getByTestId('intraday-chart-slot').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`window-${review ? 'review' : 'live'}-candles.png`) });
    await page.getByRole('button', { name: 'Area', exact: true }).click();
    await expect.poll(() => dashboardChartTimes(page, 'PriceAreaChart')).toEqual(expected);
    await expect(page.getByText('Market brief', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`window-${review ? 'review' : 'live'}-area.png`) });
  });
}

for (const session of ['closed', 'pre-market']) {
  test(`dashboard brief title preserves ${session} session evidence`, async ({ page }, testInfo) => {
    await mockDashboard(page); await mockDashboardCards(page);
    await page.route('**/api/live/status', r => r.fulfill(M.ok({ is_open: false, session, current_time_et: '2026-10-28T08:00:00-04:00' })));
    await page.goto('/dashboard');
    await expect(page.getByText('Market brief', { exact: true })).toBeVisible();
    await expect(page.getByText('Pre-market brief', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`brief-${session}.png`) });
  });
}

for (const state of ['one', 'empty', 'invalid', 'null-volume'] as const) {
  test(`dashboard chart handles ${state} available session data explicitly`, async ({ page }, testInfo) => {
    await mockDashboard(page); await mockDashboardCards(page);
    const time = Date.parse('2026-10-28T10:00Z') / 1000;
    const candles = state === 'empty' ? [] : [{ ...(state === 'invalid' ? {} : { time }), open: 100, high: 102, low: 99, close: 101 }];
    await page.route('**/api/market/data/IWM/**', r => r.fulfill(M.ok({ ticker: 'IWM', date: '202610', timeframe: 60, count: candles.length, candlestick: candles, volume: state === 'null-volume' ? [null] : [] })));
    await page.goto('/dashboard');
    if (state === 'one') {
      await expect(page.getByText('60-min bars · 1 available session', { exact: true })).toBeVisible();
      await expect.poll(() => dashboardChartTimes(page, 'CandlestickChart')).toEqual([time]);
    } else {
      await expect(page.getByText(/Intraday window unavailable:/)).toBeVisible();
      await expect(page.getByTestId('intraday-chart-slot')).toHaveCount(0);
    }
    await page.getByText('IWM · intraday', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`window-${state}.png`) });
  });
}
