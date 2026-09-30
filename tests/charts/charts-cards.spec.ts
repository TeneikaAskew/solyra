/**
 * E2E for the Phase D / Phase 4 / Phase 5 additions on the Charts page:
 *   - Strategy Conditions card (always rendered when ≥14 bars are loaded)
 *   - Similar Setups card (placeholder when no setup, populated when fired)
 *   - Sig overlay toggle in the toolbar
 *
 * Payloads live in tests/helpers/fixtures/charts.ts (which reuses the bar,
 * indicator and reference fixtures from ./live — POST /api/live/indicators
 * and /api/market/* are the same endpoints the Live page uses). Task 10
 * moved both cards' math server-side (POST /api/live/indicators,
 * POST /api/live/signal-series — lib/indicators.py + lib/signals.py); those
 * two endpoints are mocked by `mockChartsApi` too, so the spec stays fully
 * hermetic and doesn't depend on a FastAPI backend being reachable.
 */
import { test, expect } from '@playwright/test';
import { M } from '../helpers/mocks';
import {
  MOCK_JOURNAL_TRADES_ONE_CLOSED,
  MOCK_MARKET_DATA,
  MOCK_REFERENCE_LEVELS,
  mockChartsApi,
} from '../helpers/fixtures/charts';
import { MOCK_LEVELS_POPULATED } from '@/mocks/options';

test.describe('Charts page — Phase D/4/5 cards', () => {
  test.beforeEach(async ({ page }) => {
    await mockChartsApi(page);
  });

  test('Strategy Conditions card renders both CALL and PUT columns', async ({ page }) => {
    await page.goto('/charts');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Live Strategy Conditions')).toBeVisible();
    // July-6 labels, verbatim from lib/chart_voter.py / MOCK_LIVE_INDICATORS.chart_voter.
    await expect(page.getByText('3 consecutive up moves').first()).toBeVisible();
    await expect(page.getByText('RSI 25–50 (bullish band)').first()).toBeVisible();
    await expect(page.getByText('3 consecutive down moves').first()).toBeVisible();
    await expect(page.getByText('RSI 50–75 (bearish band)').first()).toBeVisible();
    // Card badge — CALL fires with met_count 3/5.
    await expect(page.getByText(/CALL · 3\/5/).first()).toBeVisible();
    // Column header — CALL's "3/5 ✓ fires" suffix.
    await expect(page.getByText(/3\/5 ✓ fires/).first()).toBeVisible();
  });

  test('Similar Setups card renders heading and either matches or placeholder', async ({ page }) => {
    await page.goto('/charts');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Similar Past Setups')).toBeVisible();
    // Either the populated stats grid OR the "Waits for the voter to fire"
    // placeholder must be present — we don't pin behaviour to the exact
    // RSI/score the voter computes from synthetic bars.
    const populated = page.getByText('Matches').first();
    const placeholder = page.getByText(/waits for the voter to fire/i).first();
    await expect(populated.or(placeholder)).toBeVisible();
  });

  test('Sig overlay toggle is in the toolbar and is clickable', async ({ page }) => {
    await page.goto('/charts');
    await page.waitForLoadState('networkidle');
    const sigButton = page.getByRole('button', { name: /^Sig$/ });
    await expect(sigButton).toBeVisible();
    await sigButton.click();
    // Click again to toggle off (no assertion on visual state — just that
    // the button doesn't throw).
    await sigButton.click();
  });

  // Task 4 of the July-6 restoration: the chart wrapper lost its viewport-
  // based height to a wrapping toolbar + an effective fixed ~400px chart.
  // This pins the fix (viewport-clamped wrapper height + single-row
  // toolbar) without reintroducing the #700 overflow bug.
  test('chart fills the viewport height without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/charts');
    await page.waitForLoadState('networkidle');
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(450); // was ~400 flat before
    // overflow guard: the #700 fix must hold — canvas never wider than its card
    const card = page.locator('[data-testid="chart-card"]');
    const cardBox = await card.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(cardBox!.width + 1);
    // no page-level horizontal scrollbar
    const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientW = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollW).toBeLessThanOrEqual(clientW + 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Task 6: Charts page strip-down — journal activity removed. Trade marking,
// the Trades/Analytics side panel (TradeRailCard list, Backtest-my-trades,
// "My style" tab), trade JSON/CSV export, and the admin seed-trade teaching
// layer (Playbook seed) all moved to the Journal page (/journal) — see
// docs/journal-one-stop-shop-design.md
// §"Charts page (/charts) — journal activity removed". The describes that
// used to exercise those features (Task 2.3 persistence, Task 2.4 seed
// layer, Task 3.3 backtest-my-trades, Task 4.4 My style) are DELETED here,
// not adapted — the underlying UI they drove no longer exists outside an
// active bar-replay-trainer session (see replay-trainer.spec.ts, which
// keeps the trainer's own create/reveal/score path green — the ONE seam
// where Mark Entry survives, gated to `replay.active`, per the design
// spec's "the replay trainer writes source='replay' practice rows via its
// own path — that stays").
//
// This negative-assertion test is the RED->GREEN gate for the strip-down:
// it fails against the pre-strip page (Mark Entry button + "Trades (N)"
// side-panel tab are always rendered) and passes once ChartsPage.tsx no
// longer renders either outside a replay session.
// ─────────────────────────────────────────────────────────────────────────
test.describe('Charts page — no journal activity (Task 6)', () => {
  test.beforeEach(async ({ page }) => {
    // A CLOSED trade is served on purpose, to prove the panel is genuinely
    // gone (not just hidden because there's nothing to show). The journal
    // fetch still happens on /charts — it feeds the replay trainer's
    // leakage-cutoff filtering + Task 5.3 scorecard bookkeeping.
    await mockChartsApi(page, { trades: MOCK_JOURNAL_TRADES_ONE_CLOSED });
  });

  test('no Mark Entry button and no Trades (N) side panel outside an active replay session', async ({ page }) => {
    await page.goto('/charts');
    await page.waitForLoadState('networkidle');

    // Mark Entry flow, the Trades/Analytics side panel, JSON/CSV export, and
    // the seed-trade Playbook panel are all gone from the default (non-replay)
    // page — even with a closed trade present for the ticker/date (proves
    // this isn't just "no trades to show").
    await expect(page.getByRole('button', { name: 'Mark Entry' })).not.toBeVisible();
    await expect(page.getByText(/^Trades \(/)).not.toBeVisible();
    await expect(page.getByText('Playbook seed')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Backtest my trades' })).not.toBeVisible();
    await expect(page.getByText('My style')).not.toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Toolbar controls and the crosshair bar (CHARTS-09, CHARTS-10 and CHARTS-03
// of the site traceability matrix). The chart is a canvas and cannot be read,
// so these tests assert what the controls cause (the requests they send) and
// the DOM the page renders around the canvas (the date input, the active
// styling of a toggle, the crosshair bar that follows the mouse).
// ─────────────────────────────────────────────────────────────────────────
test.describe('Charts page · toolbar controls and crosshair bar', () => {
  test.beforeEach(async ({ page }) => {
    await mockChartsApi(page);
  });

  // CHARTS-09. The default is the newest listed date at 5m. Each timeframe
  // button puts its own `timeframe` on the market-data request, and a typed
  // date puts that day in the path. The input's min and max are the ends of the
  // dates list; nothing stops a typed date outside them from being requested.
  test('the timeframe buttons and the date input ask for bars at that resolution and on that day', async ({ page }) => {
    const dataRequests: string[] = [];
    await page.route('**/api/market/data/IWM/*', (r) => {
      const u = new URL(r.request().url());
      dataRequests.push(u.pathname + u.search);
      return r.fulfill(M.ok(MOCK_MARKET_DATA));
    });
    await page.goto('/charts');
    await page.waitForLoadState('networkidle');

    const date = page.locator('input[type="date"]');
    await expect(date).toHaveValue('2026-04-24');
    await expect(date).toHaveAttribute('min', '2026-04-22');
    await expect(date).toHaveAttribute('max', '2026-04-24');
    expect(dataRequests).toEqual(['/api/market/data/IWM/20260424?timeframe=5']);

    for (const [label, timeframe] of [['15m', '15'], ['1h', '60'], ['1m', '1'], ['30m', '30']]) {
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect
        .poll(() => dataRequests.at(-1))
        .toBe(`/api/market/data/IWM/20260424?timeframe=${timeframe}`);
    }

    await date.fill('2026-04-23');
    await expect.poll(() => dataRequests.at(-1)).toBe('/api/market/data/IWM/20260423?timeframe=30');
    // Typed outside the list's ends, the date is still asked for: min and max
    // only bound the browser's picker.
    await date.fill('2026-04-10');
    await expect.poll(() => dataRequests.at(-1)).toBe('/api/market/data/IWM/20260410?timeframe=30');
  });

  // CHARTS-10. Volume and RTH start on, Ref, Gamma and Sig start off, and each
  // button flips its own state. The gamma levels are asked for only once Gamma is
  // on (and not again when it is switched off and on), and the button is not
  // rendered at all for a ticker without an options chain.
  test('the overlay toggles flip their state, Gamma asks for the levels only once it is on, and it is absent for a non-ETF ticker', async ({ page }) => {
    const levels: string[] = [];
    await page.route('**/api/options/IWM/*/levels*', (r) => {
      levels.push(new URL(r.request().url()).pathname);
      return r.fulfill(M.ok(MOCK_LEVELS_POPULATED));
    });
    await page.goto('/charts');
    await page.waitForLoadState('networkidle');

    const ON = /(^|\s)bg-\[var\(--color-bg-hover\)\]/;
    const toggle = (name: string) => page.getByRole('button', { name, exact: true });
    await expect(toggle('Vol')).toHaveClass(ON);
    await expect(toggle('RTH')).toHaveClass(ON);
    for (const name of ['Ref', 'Gamma', 'Sig']) await expect(toggle(name)).not.toHaveClass(ON);
    expect(levels).toEqual([]);

    await toggle('Vol').click();
    await toggle('RTH').click();
    await toggle('Ref').click();
    await toggle('Sig').click();
    await expect(toggle('Vol')).not.toHaveClass(ON);
    await expect(toggle('RTH')).not.toHaveClass(ON);
    await expect(toggle('Ref')).toHaveClass(ON);
    await expect(toggle('Sig')).toHaveClass(ON);
    expect(levels).toEqual([]);

    await toggle('Gamma').click();
    await expect(toggle('Gamma')).toHaveClass(ON);
    await expect.poll(() => levels).toEqual(['/api/options/IWM/2026-04-24/levels']);
    await toggle('Gamma').click();
    await toggle('Gamma').click();
    await expect(toggle('Gamma')).toHaveClass(ON);
    await page.waitForLoadState('networkidle');
    expect(levels).toHaveLength(1);

    // A ticker outside SPY, IWM, QQQ and SPX has no chain: no Gamma button, the rest stay.
    // Nothing is mocked for AAPL, so every request for it answers 404 here rather than
    // reaching the dev server's proxy.
    await page.route(/\/api\/.*\bAAPL\b/, (r) => r.fulfill(M.notFound()));
    await page.evaluate(() => {
      localStorage.setItem('ticker-store', JSON.stringify({ state: { activeTicker: 'AAPL', recentTickers: [] }, version: 0 }));
    });
    await page.reload();
    await expect(toggle('Ref')).toBeVisible();
    await expect(toggle('Gamma')).toHaveCount(0);
  });

  // CHARTS-03. The bar exists only while the mouse is over a bar of the chart: O, H, L
  // and C of that one bar, plus the prior session's high and low while Ref is on.
  test('the crosshair bar shows the OHLC of the hovered bar, adds Prev H / L while Ref is on, and leaves with the mouse', async ({ page }) => {
    await page.goto('/charts');
    await page.waitForLoadState('networkidle');

    const box = await page.locator('[data-testid="chart-card"] canvas').first().boundingBox();
    expect(box).not.toBeNull();
    const at = (fx: number) => ({ x: box!.x + box!.width * fx, y: box!.y + box!.height * 0.4 });
    const field = (letter: string) => page.getByText(new RegExp(`^${letter} \\d+\\.\\d{2}$`));
    const read = async () => ({
      o: (await field('O').innerText()).slice(2),
      h: (await field('H').innerText()).slice(2),
      l: (await field('L').innerText()).slice(2),
      c: (await field('C').innerText()).slice(2),
    });

    await expect(field('O')).toHaveCount(0);
    await expect(async () => {
      await page.mouse.move(at(0.3).x, at(0.3).y);
      await expect(field('O')).toBeVisible({ timeout: 500 });
    }).toPass();
    const left = await read();
    // All four numbers belong to one bar of the day the chart was given.
    const fixed = (n: number) => n.toFixed(2);
    expect(
      MOCK_MARKET_DATA.candlestick.some(
        (b) => fixed(b.open) === left.o && fixed(b.high) === left.h && fixed(b.low) === left.l && fixed(b.close) === left.c,
      ),
    ).toBe(true);

    // Further right is a later bar, and the fixture's closes rise through the day.
    await page.mouse.move(at(0.8).x, at(0.8).y);
    await expect.poll(async () => Number((await read()).c)).toBeGreaterThan(Number(left.c));

    // Prev H / L come from the reference levels, and only while Ref is on.
    const prev = page.getByText(/^Prev: H \d+\.\d{2} \/ L \d+\.\d{2}$/);
    await expect(prev).toHaveCount(0);
    await page.getByRole('button', { name: 'Ref', exact: true }).click();
    await page.mouse.move(at(0.5).x, at(0.5).y);
    await expect(prev).toHaveText(
      `Prev: H ${fixed(MOCK_REFERENCE_LEVELS.high)} / L ${fixed(MOCK_REFERENCE_LEVELS.low)}`,
    );

    // The bar goes when the mouse leaves the chart.
    await page.mouse.move(2, 2);
    await expect(field('O')).toHaveCount(0);
    await expect(prev).toHaveCount(0);
  });
});
