/**
 * Route wiring for the Trade Journal (`/journal`).
 *
 * Payloads live in src/mocks/journal.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 */
import type { Page } from '@playwright/test';
import type { JournalTradesResponse } from '@/mocks/journal';
import {
  MOCK_JOURNAL_DATES_EMPTY,
  MOCK_JOURNAL_EMPTY,
  MOCK_JOURNAL_EXPORT,
  MOCK_JOURNAL_MARKET_DATA,
} from '@/mocks/journal';
import { MOCK_MARKET_HOURS } from '@/mocks/common';
import { M, mockCommon } from '../mocks';

export {
  ACTIVE_TRADE,
  CLOSED_TRADE,
  MANUAL_TRADE,
  MOCK_EXAMPLES_UNION,
  MOCK_IMPORT_COMMIT,
  MOCK_IMPORT_PREVIEW,
  MOCK_JOURNAL_DATES,
  MOCK_JOURNAL_DATES_EMPTY,
  MOCK_JOURNAL_EMPTY,
  MOCK_JOURNAL_EXPORT,
  MOCK_JOURNAL_MARKET_DATA,
  MOCK_JOURNAL_TRADES,
  MOCK_JOURNAL_TRADES_WITH_ACTIVE,
  MOCK_MINE_STYLE_SUCCESS,
  MOCK_MINE_STYLE_UNAVAILABLE,
  MOCK_MIXED_TRADES,
  REPLAY_TRADE,
} from '@/mocks/journal';
export type {
  ImportPreviewResponse,
  ImportPreviewTrade,
  JournalTradesResponse,
} from '@/mocks/journal';

export interface JournalMockOpts {
  /** Called with the parsed POST body of an export, to assert that only
   *  closed trades were sent. */
  onExport?: (body: unknown) => void;
  exportResponse?: unknown;
  /** The user's own journal. Default: empty. */
  own?: JournalTradesResponse;
  /** The Examples union. Default: empty. */
  examples?: JournalTradesResponse;
  /** Trading-date list for the chart card. Default: empty (no-data state). */
  dates?: { ticker: string; dates: string[]; months: string[] };
  /** Invoked on each GET of the own-journal route — for refetch assertions. */
  onOwnTradesFetch?: () => void;
}

/**
 * Intercept every endpoint `/journal` hits on first paint, scoped to IWM.
 * Includes `mockCommon`, so callers don't need it separately.
 *
 * Mutation endpoints (POST /api/journal/trades, /import/preview, /import/commit)
 * are NOT wired: the specs that drive them assert on the request body, so they
 * register their own handlers.
 */
export async function mockJournalApi(page: Page, opts: JournalMockOpts = {}) {
  await mockCommon(page);
  const own = opts.own ?? MOCK_JOURNAL_EMPTY;
  const examples = opts.examples ?? MOCK_JOURNAL_EMPTY;
  const dates = opts.dates ?? MOCK_JOURNAL_DATES_EMPTY;

  await page.route('**/api/market/dates/IWM', (r) => r.fulfill(M.ok(dates)));
  await page.route('**/api/market/data/IWM/*', (r) => r.fulfill(M.ok(MOCK_JOURNAL_MARKET_DATA)));
  await page.route('**/api/config/market-hours', (r) => r.fulfill(M.ok(MOCK_MARKET_HOURS)));
  await page.route('**/api/journal/examples/IWM', (r) => r.fulfill(M.ok(examples)));
  await page.route('**/api/journal/trades/IWM*', (r) => {
    opts.onOwnTradesFetch?.();
    return r.fulfill(M.ok(own));
  });

  // CSV export. The page filters to CLOSED trades before posting (an active
  // row has no exit and the server 422s on a partial item), so a spec can use
  // `onExport` to assert that filtering actually happened.
  await page.route('**/api/journal/export/*', (r) => {
    try {
      opts.onExport?.(JSON.parse(r.request().postData() || '{}'));
    } catch {
      opts.onExport?.(null);
    }
    return r.fulfill(M.ok(opts.exportResponse ?? MOCK_JOURNAL_EXPORT));
  });
}
