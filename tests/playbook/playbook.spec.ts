/**
 * E2E: Playbook ("/playbook") — top setup, conditions checklist, FTFC strat.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { mockCommon, M } from '../helpers/mocks';
import {
  MOCK_AVG_VOLUME,
  MOCK_LIVE_HISTORY,
  MOCK_LIVE_INDICATORS,
  MOCK_LIVE_QUOTE,
  MOCK_REFERENCE_LEVELS,
} from '@/mocks/live';
import { MOCK_PLAYBOOK_FRESH } from '@/mocks/dashboard';

const SPEC_LOCAL_PLAYBOOK = {
  ticker: 'IWM',
  source: 'cloud_sql',
  // Card-set date + server-judged age (#861) — rendered next to the count.
  analysis_date: '2026-09-05',
  generated_at: '2026-09-05T08:41:12+00:00',
  age_days: 1,
  max_age_days: 7,
  cards: [
    {
      id: 'long_breakout_pd',
      name: 'Long breakout above PD high',
      direction: 'long',
      win_rate: 0.62,
      avg_return: 0.85,
      conditions: ['price > prior_high', 'volume > avg', 'EMA9 > EMA20'],
      description: 'Triggers when IWM breaks the prior-day high with above-average volume.',
    },
  ],
};

const MOCK_REFERENCE = {
  ticker: 'IWM',
  date: '2026-04-25',
  reference_levels: { prior_high: 222.0, prior_low: 218.0, vwap: 220.5 },
};

test.describe('Playbook', () => {
  test.beforeEach(async ({ page }) => {
    await mockCommon(page);
    await page.route('**/api/playbook/IWM', (r) => r.fulfill(M.ok(SPEC_LOCAL_PLAYBOOK)));
    await page.route('**/api/market/reference/IWM/*', (r) => r.fulfill(M.ok(MOCK_REFERENCE)));
    await page.route('**/api/signals/IWM*', (r) =>
      r.fulfill(M.ok({ ticker: 'IWM', count: 0, signals: [] }))
    );    // PlaybookPage reads the 20-day average volume (useLiveHistory).
    await page.route('**/api/live/avg-volume/IWM*', (r) => r.fulfill(M.ok(MOCK_AVG_VOLUME)));
  });

  test('renders ticker playbook heading', async ({ page }) => {
    await page.goto('/playbook');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').filter({ hasText: /IWM.*Playbook|Playbook/i }).first()).toBeVisible();
  });

  test('shows setup with conditions', async ({ page }) => {
    await page.goto('/playbook');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/long breakout/i)).toBeVisible();
  });

  test('shows empty-state when no cards', async ({ page }) => {
    await page.route('**/api/playbook/IWM', (r) =>
      r.fulfill(M.ok({ ticker: 'IWM', cards: [] }))
    );
    await page.goto('/playbook');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/no playbook|no.*card|run.*pipeline|empty/i).first()).toBeVisible();
  });

  test('renders within perf budget (strict 7s)', async ({ page }) => {
    // Slightly looser than 5s — playbook page does signals + reference + brief
    // fanout, so it sits at the cold-warm transition boundary.
    const start = Date.now();
    await page.goto('/playbook');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(7000));
  });
  test('shows the card set date and age next to the setup count', async ({ page }) => {
    await page.goto('/playbook');
    await expect(page.getByTestId('playbook-age')).toHaveText(/1 setups · as of Sep 5, 2026 \(1d old\)/, {
      timeout: 10_000,
    });
  });

  test('a stale card set (503) is reported with the server reason, not rendered', async ({ page }) => {
    const detail =
      'playbook_cards for IWM is stale: latest analysis_date 2026-06-13 is 85 days old ' +
      '(today; max 7). Refusing to render stale setups as current — run the phase6-playbook Cloud Run job.';
    await page.route('**/api/playbook/IWM', (r) =>
      r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail }) })
    );
    await page.goto('/playbook');
    await expect(page.getByText(/playbook unavailable for IWM/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/2026-06-13 is 85 days old/)).toBeVisible();
    await expect(page.getByText('Long breakout above PD high')).toHaveCount(0);
  });

  test('the page follows the active ticker in the store and asks for that ticker only', async ({ page }) => {
    // The page has no picker: it reads activeTicker from the persisted ticker store (key
    // `ticker-store`), which another page's TickerCombobox sets. Seed it as such a switch leaves it.
    await page.addInitScript(() => {
      localStorage.setItem(
        'ticker-store',
        JSON.stringify({ state: { activeTicker: 'SPY', recentTickers: ['SPY'] }, version: 0 }),
      );
    });
    const asked: string[] = [];
    page.on('request', (req) => {
      const { pathname } = new URL(req.url());
      if (/^\/api\/(playbook|live\/avg-volume|market\/reference)\//.test(pathname)) asked.push(pathname);
    });
    // Registered after beforeEach, so these win for SPY; the IWM routes stay and must stay unused.
    await page.route('**/api/playbook/SPY', (r) =>
      r.fulfill(
        M.ok({
          ...MOCK_PLAYBOOK_FRESH,
          ticker: 'SPY',
          cards: [{ ...MOCK_PLAYBOOK_FRESH.cards[0], name: 'SPY CARD 1: Bullish continuation' }],
        }),
      ),
    );
    await page.route('**/api/live/avg-volume/SPY*', (r) => r.fulfill(M.ok({ ...MOCK_AVG_VOLUME, ticker: 'SPY' })));
    await page.route('**/api/market/reference/SPY/*', (r) => r.fulfill(M.ok({ ...MOCK_REFERENCE_LEVELS, ticker: 'SPY' })));

    await page.goto('/playbook');
    await expect(page.getByRole('heading', { name: 'SPY Playbook' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('SPY CARD 1: Bullish continuation')).toBeVisible();
    await expect(page.getByTestId('playbook-age')).toHaveText(/1 setups · as of Sep 5, 2026 \(1d old\)/);
    await page.waitForLoadState('networkidle');

    expect(asked.filter((p) => p.startsWith('/api/playbook/'))).toEqual(['/api/playbook/SPY']);
    expect(asked.filter((p) => p.includes('IWM'))).toEqual([]);
    expect(asked.some((p) => p === '/api/live/avg-volume/SPY')).toBe(true);
    expect(asked.some((p) => p.startsWith('/api/market/reference/SPY/'))).toBe(true);
  });

  test('during the session the cards fill from the posted snapshot, and a card is fully lit once every judgeable condition is met', async ({
    page,
  }) => {
    const cardOne = { ...MOCK_PLAYBOOK_FRESH.cards[0] };
    const cardTwo = {
      ...MOCK_PLAYBOOK_FRESH.cards[0],
      id: 'card_2',
      name: 'IWM CARD 2: Bearish continuation',
      direction: 'PUT',
      conditions: ['RSI 35-60', 'Below VWAP', 'Higher timeframe supports the direction'],
    };
    // Canned answers per condition text. The texts are this spec's own, so the real evaluator
    // (platform/api/routers/playbook.py) would answer some of them differently.
    const ANSWER: Record<string, { status: string; detail?: string; reason?: string }> = {
      'RSI 40-65': { status: 'met', detail: 'RSI 55.0 in [40.0, 65.0]' },
      'Above VWAP': { status: 'met', detail: '221.50 > VWAP 220.20' },
      'EMA9 > EMA20': { status: 'unmet', detail: 'EMA9 220.50 < EMA20 221.00' },
      'RSI 35-60': { status: 'met', detail: 'RSI 55.0 in [35.0, 60.0]' },
      'Below VWAP': { status: 'met', detail: '218.90 < VWAP 220.20' },
      'Higher timeframe supports the direction': { status: 'unknown', reason: 'subjective' },
    };
    type PostedSnapshot = {
      price: number | null;
      lastBar: { close: number };
      indicators: Record<string, number | null>;
    };
    const posted: { snapshot: PostedSnapshot; batches?: Record<string, string[]> }[] = [];

    await page.route('**/api/playbook/IWM', (r) =>
      r.fulfill(M.ok({ ...MOCK_PLAYBOOK_FRESH, cards: [cardOne, cardTwo] })),
    );
    await page.route('**/api/live/status', (r) =>
      r.fulfill(M.ok({ is_open: true, session: 'regular', next_open: null, current_time_et: '13:29:00' })),
    );
    await page.route('**/api/live/history/IWM', (r) => r.fulfill(M.ok(MOCK_LIVE_HISTORY)));
    await page.route('**/api/live/quote/IWM', (r) => r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
    await page.route('**/api/market/reference/IWM/*', (r) => r.fulfill(M.ok(MOCK_REFERENCE_LEVELS)));
    await page.route('**/api/live/indicators', (r) => r.fulfill(M.ok(MOCK_LIVE_INDICATORS)));
    await page.route('**/api/playbook/evaluate', (r) => {
      const body = r.request().postDataJSON();
      posted.push(body);
      const results_by_key = Object.fromEntries(
        Object.entries<string[]>(body.batches ?? {}).map(([id, conds]) => [id, conds.map((c) => ANSWER[c])]),
      );
      return r.fulfill(M.ok({ results_by_key }));
    });

    await page.goto('/playbook');
    await expect(page.getByText('Cards light up as live market conditions are met')).toBeVisible({ timeout: 10_000 });
    // A card is the bordered, padded box; the trade levels and hold-window cells inside it are not.
    const one = page.locator('div.rounded-lg.border.p-4', { hasText: cardOne.name });
    const two = page.locator('div.rounded-lg.border.p-4', { hasText: cardTwo.name });
    await expect(one).toBeVisible();
    await expect(two).toBeVisible();

    // One batched request, keyed by card id, built from the five reads the page makes.
    await expect.poll(() => posted.at(-1)?.snapshot.price).toBe(MOCK_LIVE_QUOTE.price);
    const last = posted.at(-1)!;
    expect(last.batches).toEqual({ card_1: cardOne.conditions, card_2: cardTwo.conditions });
    expect(last.snapshot).toMatchObject({
      price: MOCK_LIVE_QUOTE.price,
      volumeToday: MOCK_LIVE_QUOTE.volume,
      avgVolume20d: MOCK_AVG_VOLUME.avg_volume_20d,
      prevClose: MOCK_REFERENCE_LEVELS.close,
      prevHigh: MOCK_REFERENCE_LEVELS.high,
      prevLow: MOCK_REFERENCE_LEVELS.low,
      orbHigh: null,
      minutesSinceOpen: 239,
    });
    expect(last.snapshot.lastBar.close).toBe(MOCK_LIVE_HISTORY.bars.at(-1)!.close);
    expect(last.snapshot.indicators).toMatchObject({ rsi: MOCK_LIVE_INDICATORS.indicators.rsi, vwap: MOCK_LIVE_INDICATORS.indicators.vwap });

    // The answers fill the cards: counts, percent, each condition's detail or reason.
    await expect(one).toContainText('2/3 conditions met');
    await expect(one).toContainText('67%');
    await expect(one).toContainText('RSI 55.0 in [40.0, 65.0]');
    await expect(one).toContainText('EMA9 220.50 < EMA20 221.00');
    await expect(two).toContainText('2/3 conditions met · 1 subjective');
    // The percent divides by every condition, the subjective one included: 2 of 3 is 67%, not 100%.
    await expect(two).toContainText('67%');
    await expect(two).toContainText('subjective');

    // Tint: a card with a judgeable condition unmet stays at the idle border; the card whose every
    // judgeable condition is met (the third is subjective, so it does not count) is fully lit.
    await expect(one).toHaveClass(/border-green-500\/10/);
    await expect(one).not.toHaveClass(/border-green-500\/40/);
    await expect(two).toHaveClass(/border-red-500\/40/);
    await page.waitForLoadState('networkidle');
  });
});
