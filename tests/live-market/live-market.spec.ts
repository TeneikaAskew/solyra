/**
 * E2E: Live Market ("/live") — live quote, intraday bars, indicators.
 *
 * Payloads live in tests/helpers/fixtures/live.ts, typed against LiveQuote /
 * LiveHistory / AvgVolume / IndicatorsResponse / MarketDataResponse.
 *
 * The `/api/playbook/IWM` and `/api/market/dates/IWM` mocks this spec used
 * to carry are gone: LiveMarketPage calls neither (`useAvailableDates` is
 * only used by Charts and Journal), so they described a dependency that
 * doesn't exist.
 */
import { test, expect } from '@playwright/test';
import { perfBudgetMs } from '../helpers/perfBudget';
import { M } from '../helpers/mocks';
import {
  mockLiveApi,
  MOCK_LIVE_HISTORY,
  MOCK_LIVE_INDICATORS,
  MOCK_LIVE_QUOTE,
  MOCK_MARKET_DATA,
  MOCK_REFERENCE_LEVELS,
} from '../helpers/fixtures/live';
import { MOCK_LIVE_STATUS } from '@/mocks/common';
import type { IndicatorsResponse } from '@/hooks/useLiveIndicators';

test.describe('Live Market', () => {
  test.beforeEach(async ({ page }) => {
    await mockLiveApi(page);
  });

  test('navigates to /live and renders ticker context', async ({ page }) => {
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText(/IWM/);
  });

  test('renders live price quote', async ({ page }) => {
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/220\.45/).first()).toBeVisible();
  });

  test('shows session pill', async ({ page }) => {
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/market open|market closed|pre-market|after hours/i).first()).toBeVisible();
  });

  test('renders within perf budget (strict 5s)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    expect(Date.now() - start).toBeLessThan(perfBudgetMs(5000));
  });

  // LIVE-05. The toggle gates only the quote and the history (`livePolling` in
  // LiveMarketPage). While Paused neither is asked for again, the session status
  // keeps its own 60 s refetch, and resuming asks again at once because the
  // cached answers are stale by then. A fake clock runs the 15 s and 60 s
  // intervals without waiting for them; the status refetch after the long
  // advance is the proof that the intervals did run.
  test('the Live (15s) toggle pauses the quote and history polling and resumes it', async ({ page }) => {
    const seen = { quote: 0, history: 0, status: 0 };
    await page.route('**/api/live/quote/IWM*', (r) => {
      seen.quote += 1;
      return r.fulfill(M.ok(MOCK_LIVE_QUOTE));
    });
    await page.route('**/api/live/history/IWM*', (r) => {
      seen.history += 1;
      return r.fulfill(M.ok(MOCK_LIVE_HISTORY));
    });
    await page.route('**/api/live/status', (r) => {
      seen.status += 1;
      return r.fulfill(M.ok(MOCK_LIVE_STATUS));
    });
    await page.clock.install();
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    const toggle = page.getByRole('button', { name: /^(Live \(15s\)|Paused)$/ });
    await expect(toggle).toHaveText('Live (15s)');
    await expect(toggle.locator('svg')).toHaveClass(/animate-spin/);

    // Live: the quote is asked for again within 15 s and the history within 60 s.
    const live = { ...seen };
    await page.clock.runFor(60_000);
    await expect.poll(() => seen.quote).toBeGreaterThan(live.quote);
    await expect.poll(() => seen.history).toBeGreaterThan(live.history);

    // Paused: the label flips, the spinner stops and neither request is repeated.
    await toggle.click();
    await expect(toggle).toHaveText('Paused');
    await expect(toggle.locator('svg')).not.toHaveClass(/animate-spin/);
    const paused = { ...seen };
    await page.clock.runFor(120_000);
    await expect.poll(() => seen.status).toBeGreaterThan(paused.status);
    expect(seen.quote).toBe(paused.quote);
    expect(seen.history).toBe(paused.history);
    await expect(page.getByText('$220.45', { exact: true })).toBeVisible();

    // Resumed: the stale quote and history are asked for again at once.
    await toggle.click();
    await expect(toggle).toHaveText('Live (15s)');
    await expect.poll(() => seen.quote).toBeGreaterThan(paused.quote);
    await expect.poll(() => seen.history).toBeGreaterThan(paused.history);
  });

  // LIVE-06. Sound is off until the button is pressed. Once on, the page plays
  // 880 Hz when the CALL setup fires and 440 Hz when the PUT setup fires, and
  // prints the "Last signal" line. The AudioContext is replaced by a recorder so
  // the tones can be read back. The indicators answer follows the price the page
  // sends (the query key includes it), so a new quote price brings the PUT setup.
  test('Sound is silent until enabled, then a firing CALL sounds 880 Hz and a firing PUT 440 Hz', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __tones: number[]; AudioContext: unknown };
      w.__tones = [];
      class RecordingAudioContext {
        currentTime = 0;
        destination = {};
        createOscillator() {
          const osc = {
            frequency: { value: 0 },
            type: 'sine',
            connect() {},
            start() {
              w.__tones.push(osc.frequency.value);
            },
            stop() {},
          };
          return osc;
        }
        createGain() {
          return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
        }
      }
      w.AudioContext = RecordingAudioContext;
    });
    const firing = (call: boolean, put: boolean): IndicatorsResponse => ({
      ...MOCK_LIVE_INDICATORS,
      signals: {
        call: { ...MOCK_LIVE_INDICATORS.signals.call, fired: call },
        put: { ...MOCK_LIVE_INDICATORS.signals.put, fired: put },
      },
    });
    let price: number = MOCK_LIVE_QUOTE.price;
    await page.route('**/api/live/quote/IWM*', (r) => r.fulfill(M.ok({ ...MOCK_LIVE_QUOTE, price })));
    await page.route('**/api/live/indicators', (r) => {
      const sent = (r.request().postDataJSON() as { current_price: number }).current_price;
      return r.fulfill(M.ok(sent === MOCK_LIVE_QUOTE.price ? firing(true, false) : firing(false, true)));
    });
    await page.clock.install();
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    const tones = () => page.evaluate(() => (window as unknown as { __tones: number[] }).__tones.slice());

    // The CALL setup is already firing and Sound is off: nothing sounds, no note.
    await expect(page.getByText('SIGNAL', { exact: true })).toBeVisible();
    expect(await tones()).toEqual([]);
    await expect(page.getByText(/Last signal:/)).toHaveCount(0);

    await page.getByRole('button', { name: 'Sound', exact: true }).click();
    await expect.poll(tones).toEqual([880]);
    await expect(page.getByText(/Last signal: CALL at /)).toBeVisible();

    // The next quote has a new price, the indicators answer with the PUT setup firing.
    price = 220.5;
    await page.clock.runFor(15_000);
    await expect.poll(tones).toEqual([880, 440]);
    await expect(page.getByText(/Last signal: PUT at /)).toBeVisible();
  });

  // LIVE-08. Review mode is entered from the Replay control in the header. The page
  // asks for that day's 1-minute bars and the prior session close, cuts the bars
  // at the chosen time in the browser, rebuilds the quote from them with the change
  // taken against the prior close, recomputes the indicators on the cut bars and
  // stops asking for the live quote and history. The clock is pinned to the Friday
  // the mocked day belongs to, so the control's Latest session close is that day.
  test("review mode rebuilds the quote from that day's bars up to the chosen time and stops the live polling", async ({ page }) => {
    const seen = { quote: 0, history: 0, status: 0 };
    const requested: string[] = [];
    const indicatorBars: number[] = [];
    await page.route('**/api/live/quote/IWM*', (r) => {
      seen.quote += 1;
      return r.fulfill(M.ok(MOCK_LIVE_QUOTE));
    });
    await page.route('**/api/live/history/IWM*', (r) => {
      seen.history += 1;
      return r.fulfill(M.ok(MOCK_LIVE_HISTORY));
    });
    await page.route('**/api/live/status', (r) => {
      seen.status += 1;
      return r.fulfill(M.ok(MOCK_LIVE_STATUS));
    });
    await page.route('**/api/market/data/IWM/*', (r) => {
      const url = new URL(r.request().url());
      requested.push(url.pathname + url.search);
      return r.fulfill(M.ok(MOCK_MARKET_DATA));
    });
    await page.route('**/api/market/reference/IWM/*', (r) => {
      requested.push(new URL(r.request().url()).pathname);
      return r.fulfill(M.ok(MOCK_REFERENCE_LEVELS));
    });
    await page.route('**/api/live/indicators', (r) => {
      indicatorBars.push((r.request().postDataJSON() as { bars: unknown[] }).bars.length);
      return r.fulfill(M.ok(MOCK_LIVE_INDICATORS));
    });
    await page.clock.install({ time: new Date('2026-04-24T16:30:00-04:00') });
    await page.goto('/live');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Live (15s)' })).toBeVisible();
    await expect(page.getByText('$220.45', { exact: true })).toBeVisible();

    // Pick the latest session, then 9:45 AM, in the Replay control and apply.
    await page.getByTestId('replay-toggle').click();
    await page.getByRole('button', { name: 'Latest session close' }).click();
    await page.getByRole('spinbutton', { name: /hour/i }).click();
    await page.keyboard.type('9');
    await page.keyboard.type('45');
    await page.keyboard.type('A');
    await page.getByTestId('replay-apply').click();

    // The bar says Historical and the toggle is locked.
    await expect(page.getByText('Historical: 2026-04-24 @ 09:45 ET')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Historical', exact: true })).toBeDisabled();

    // 16 of the day's 30 bars are at or before 9:45 (the 09:30 to 09:45 bars): the
    // quote is rebuilt from them and the change is taken against the prior close 220.00.
    await expect(page.getByText('$220.75', { exact: true })).toBeVisible();
    await expect(page.getByText('+0.75 (+0.34%)')).toBeVisible();
    await expect(page.getByText('Prev: $220.00')).toBeVisible();
    await expect(page.getByText('Open: $219.95')).toBeVisible();
    await expect(page.getByText('Vol: 1.60M')).toBeVisible();
    expect(requested).toHaveLength(2);
    expect(requested).toContain('/api/market/data/IWM/20260424?timeframe=1');
    expect(requested).toContain('/api/market/reference/IWM/20260424');
    await expect.poll(() => indicatorBars.at(-1)).toBe(16);

    // However long the page sits, the live quote and history are not asked for again.
    const before = { ...seen };
    await page.clock.runFor(120_000);
    await expect.poll(() => seen.status).toBeGreaterThan(before.status);
    expect(seen.quote).toBe(before.quote);
    expect(seen.history).toBe(before.history);

    // Back to live restores the toggle and the live quote.
    await page.getByTestId('replay-clear').click();
    await expect(page.getByRole('button', { name: 'Live (15s)' })).toBeEnabled();
    await expect(page.getByText('Market Closed')).toBeVisible();
    await expect(page.getByText('$220.45', { exact: true })).toBeVisible();
  });
});
