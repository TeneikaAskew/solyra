/**
 * Route wiring for the Live Market page (`/live`).
 *
 * Payloads live in src/mocks/live.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 *
 * Deliberately NOT wired: `/api/playbook/{ticker}` and
 * `/api/market/dates/{ticker}`. The spec this replaced mocked both (playbook
 * twice, with contradictory bodies), but LiveMarketPage calls neither —
 * `useAvailableDates` is used only by Charts and Journal. Dead mocks are
 * worse than no mocks: they imply a dependency that isn't there.
 */
import type { Page } from '@playwright/test';
import type { AvgVolume, LiveHistory } from '@/hooks/useLiveHistory';
import type { LiveQuote } from '@/hooks/useLiveQuote';
import type { IndicatorsResponse } from '@/hooks/useLiveIndicators';
import type { MarketDataResponse } from '@/hooks/useMarketData';
import {
  MOCK_AVG_VOLUME,
  MOCK_LIVE_HISTORY,
  MOCK_LIVE_INDICATORS,
  MOCK_LIVE_QUOTE,
  MOCK_MARKET_DATA,
  MOCK_REFERENCE_LEVELS,
} from '@/mocks/live';
import { M, mockCommon } from '../mocks';

export {
  MOCK_AVG_VOLUME,
  MOCK_CANDLES,
  MOCK_LIVE_HISTORY,
  MOCK_LIVE_HISTORY_EMPTY,
  MOCK_LIVE_INDICATORS,
  MOCK_LIVE_QUOTE,
  MOCK_LIVE_QUOTE_CLOSED,
  MOCK_LIVE_QUOTE_NO_PREV_CLOSE,
  MOCK_MARKET_DATA,
  MOCK_MARKET_DATA_EMPTY,
  MOCK_REFERENCE_LEVELS,
} from '@/mocks/live';

export interface LiveMockOpts {
  quote?: LiveQuote;
  history?: LiveHistory;
  avgVolume?: AvgVolume;
  marketData?: MarketDataResponse;
  indicators?: IndicatorsResponse;
}

/**
 * Intercept every endpoint `/live` can hit, scoped to IWM (the app's default
 * ticker). Includes `mockCommon`, so callers don't need it separately.
 */
export async function mockLiveApi(page: Page, opts: LiveMockOpts = {}) {
  await mockCommon(page);
  const quote = opts.quote ?? MOCK_LIVE_QUOTE;
  const history = opts.history ?? MOCK_LIVE_HISTORY;
  const avgVolume = opts.avgVolume ?? MOCK_AVG_VOLUME;
  const marketData = opts.marketData ?? MOCK_MARKET_DATA;
  const indicators = opts.indicators ?? MOCK_LIVE_INDICATORS;

  await page.route('**/api/live/quote/IWM*', (r) => r.fulfill(M.ok(quote)));
  await page.route('**/api/live/history/IWM*', (r) => r.fulfill(M.ok(history)));
  await page.route('**/api/live/avg-volume/IWM*', (r) => r.fulfill(M.ok(avgVolume)));
  await page.route('**/api/live/indicators', (r) => r.fulfill(M.ok(indicators)));
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok(marketData)));
  await page.route('**/api/market/reference/IWM/*', (r) => r.fulfill(M.ok(MOCK_REFERENCE_LEVELS)));
}
