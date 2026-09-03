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
import {
  MOCK_JOURNAL_TRADES_ONE_CLOSED,
  mockChartsApi,
} from '../helpers/fixtures/charts';

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
