/**
 * Route wiring for the structured AI insights page (`/insights`).
 *
 * Payloads live in src/mocks/insights.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 */
import type { Page, Route } from '@playwright/test';
import type {
  InsightHistoryResponse,
  InsightReportEnvelope,
  RunStatus,
} from '@/types/insights';
import type {
  MeWatchlistRemoveResponse,
  MeWatchlistResponse,
  MeWatchlistRow,
  WatchlistDefaultResponse,
  WatchlistResponse,
} from '@/types/watchlist';
import {
  MOCK_AGENT_ROUTES,
  MOCK_CHAT_REPLY,
  MOCK_INSIGHT_HISTORY_EMPTY,
  MOCK_INSIGHT_REPORT,
  MOCK_REFRESH_QUEUED,
  MOCK_WATCHLIST_DEFAULT,
  MOCK_WATCHLIST_EMPTY,
  runStatus,
} from '@/mocks/insights';
import { M, mockCommon } from '../mocks';

export {
  MOCK_AGENT_ROUTES,
  MOCK_CHAT_REPLY,
  MOCK_INSIGHT_HISTORY,
  MOCK_INSIGHT_HISTORY_EMPTY,
  MOCK_INSIGHT_REPORT,
  MOCK_INSIGHT_REPORT_DEGRADED,
  MOCK_REFRESH_QUEUED,
  MOCK_ME_WATCHLIST,
  MOCK_WATCHLIST,
  MOCK_WATCHLIST_DEFAULT,
  MOCK_WATCHLIST_EMPTY,
  RUN_ID,
  runStatus,
} from '@/mocks/insights';

export interface InsightsMockOpts {
  /** Envelope for GET /report/{ticker}; `null` fulfils a 404 (no report yet). */
  report?: InsightReportEnvelope | null;
  history?: InsightHistoryResponse;
  watchlist?: WatchlistResponse;
  /** Terminal state the run poll reports. Default 'done'. */
  runStatusValue?: RunStatus['status'];
  /** Called with the full URL of each POST …/refresh, for ?as_of= assertions. */
  onRefresh?: (url: string) => void;
  /** Body the streaming chat endpoint returns. */
  chatReply?: string;
}

/**
 * Intercept every endpoint `/insights` can hit, scoped to IWM.
 * Includes `mockCommon`, so callers don't need it separately.
 *
 * Specs needing a sequence rather than a constant (404-then-200, or
 * running-then-done polling) should re-register just that one route after
 * calling this — Playwright matches newest-first, so the later
 * registration wins.
 */
export async function mockInsightsApi(page: Page, opts: InsightsMockOpts = {}) {
  await mockCommon(page);
  const report = opts.report === undefined ? MOCK_INSIGHT_REPORT : opts.report;
  const history = opts.history ?? MOCK_INSIGHT_HISTORY_EMPTY;
  const watchlist = opts.watchlist ?? MOCK_WATCHLIST_EMPTY;
  const status = opts.runStatusValue ?? 'done';

  await page.route('**/api/insights/report/IWM', (r) =>
    report === null ? r.fulfill(M.notFound()) : r.fulfill(M.ok(report))
  );
  await page.route('**/api/insights/report/IWM/history**', (r) => r.fulfill(M.ok(history)));
  await page.route('**/api/insights/report/IWM/refresh**', (r) => {
    opts.onRefresh?.(r.request().url());
    return r.fulfill(M.ok(MOCK_REFRESH_QUEUED));
  });
  await page.route('**/api/insights/runs/**', (r) => r.fulfill(M.ok(runStatus(status))));
  await page.route('**/api/insights/reports/*', (r) =>
    r.fulfill(report === null ? M.notFound() : M.ok(report))
  );
  await page.route('**/api/insights/watchlist**', (r) => r.fulfill(M.ok(watchlist)));
  // Registered after the broad ranking route, so Playwright's newest-first
  // matching gives these two their own answers: the ranking glob above also
  // matches /api/insights/watchlist/default, whose payload has `rows`, and
  // nothing else here answers /api/me/watchlist, which would leave the
  // browser for the dead E2E proxy. A spec's own mockMeWatchlist or
  // mockDefaultWatchlist, registered later still, wins over both.
  await page.route('**/api/insights/watchlist/default', (r) => r.fulfill(M.ok(MOCK_WATCHLIST_DEFAULT)));
  await page.route('**/api/me/watchlist**', meWatchlistHandler([], {}).handler);

  // AgentsPanel (rendered on this page) reads the model-routing table. It is
  // NOT admin-gated in the UI here, so an unmocked /insights visit leaves the
  // panel erroring.
  await page.route('**/api/admin/routes', (r) => r.fulfill(M.ok(MOCK_AGENT_ROUTES)));

  // Chat is a STREAMING endpoint: the page reads resp.body via a reader and
  // concatenates decoded chunks, so this must be fulfilled as plain text, not
  // JSON. Fulfilling it as JSON would render the raw envelope into the bubble.
  await page.route('**/api/insights/chat', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: opts.chatReply ?? MOCK_CHAT_REPLY,
    })
  );
}

/** The owner email the per-user watchlist mock answers under. */
const ME_WATCHLIST_OWNER = 'trader@example.test';

export interface MeWatchlistMockOpts {
  /**
   * `added_at` for a row a POST adds, read at request time. Default the real
   * clock; a spec under page.clock.setFixedTime passes its fixed instant so
   * the added row's data state is deterministic.
   */
  now?: () => string;
}

/** What the per-user watchlist mock saw, for request assertions. */
export interface MeWatchlistMock {
  /** A copy of the list as the mock holds it now. */
  rows: () => MeWatchlistRow[];
  /** Body of every POST /api/me/watchlist, in order. */
  posts: Array<{ ticker: string; source: string }>;
  /** Ticker of every DELETE /api/me/watchlist/{ticker}, in order. */
  deletes: string[];
}

/**
 * The in-memory per-user watchlist behind both mockInsightsApi (which starts
 * it empty) and mockMeWatchlist (which seeds it): GET answers the list, POST
 * adds `{ticker, source}` (an existing ticker leaves the list as it is) and
 * answers the list, DELETE removes the ticker and answers the list with
 * `removed: true`, or a 404 with a detail when the ticker is not on it.
 */
function meWatchlistHandler(
  initial: MeWatchlistRow[],
  opts: MeWatchlistMockOpts,
): { handler: (r: Route) => Promise<void>; mock: MeWatchlistMock } {
  const now = opts.now ?? (() => new Date().toISOString());
  let rows = initial.map((row) => ({ ...row }));
  const mock: MeWatchlistMock = { rows: () => rows.map((row) => ({ ...row })), posts: [], deletes: [] };
  const list = (): MeWatchlistResponse => ({ as_of: now(), owner_email: ME_WATCHLIST_OWNER, tickers: rows });

  const handler = (r: Route) => {
    const req = r.request();
    const path = new URL(req.url()).pathname;
    if (req.method() === 'GET' && path === '/api/me/watchlist') return r.fulfill(M.ok(list()));
    if (req.method() === 'POST' && path === '/api/me/watchlist') {
      const body = req.postDataJSON() as { ticker: string; source: string };
      mock.posts.push(body);
      const ticker = body.ticker.toUpperCase();
      if (!rows.some((row) => row.ticker === ticker)) {
        rows = [
          ...rows,
          {
            ticker,
            added_at: now(),
            source: body.source,
            name: null,
            exchange: null,
            asset_type: null,
            last_daily_bar: null,
          } satisfies MeWatchlistRow,
        ];
      }
      return r.fulfill(M.ok(list()));
    }
    const removed = /^\/api\/me\/watchlist\/([^/]+)$/.exec(path);
    if (req.method() === 'DELETE' && removed) {
      const ticker = decodeURIComponent(removed[1]).toUpperCase();
      mock.deletes.push(ticker);
      if (!rows.some((row) => row.ticker === ticker)) {
        return r.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: `${ticker} is not on your watchlist` }),
        });
      }
      rows = rows.filter((row) => row.ticker !== ticker);
      return r.fulfill(M.ok({ ...list(), removed: true } satisfies MeWatchlistRemoveResponse));
    }
    return r.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ detail: `mockMeWatchlist: unexpected ${req.method()} ${path}` }),
    });
  };
  return { handler, mock };
}

/**
 * The signed-in user's own watchlist, seeded with `initial`, served by the
 * same in-memory handler mockInsightsApi registers empty (see
 * meWatchlistHandler for what each verb answers).
 *
 * Register AFTER mockInsightsApi: Playwright matches newest-first, so this
 * seeded list wins over that helper's empty one. The glob ends in `**`
 * because DELETE carries the ticker as a path segment.
 */
export async function mockMeWatchlist(
  page: Page,
  initial: MeWatchlistRow[],
  opts: MeWatchlistMockOpts = {},
): Promise<MeWatchlistMock> {
  const { handler, mock } = meWatchlistHandler(initial, opts);
  await page.route('**/api/me/watchlist**', handler);
  return mock;
}

/**
 * GET /api/insights/watchlist/default, the read-only list edited in Discord.
 * mockInsightsApi already answers this route with MOCK_WATCHLIST_DEFAULT;
 * register this AFTER it to serve a different `body`, since Playwright
 * matches newest-first.
 */
export async function mockDefaultWatchlist(
  page: Page,
  body: WatchlistDefaultResponse = MOCK_WATCHLIST_DEFAULT,
) {
  await page.route('**/api/insights/watchlist/default', (r) => r.fulfill(M.ok(body)));
}
