/**
 * Route wiring for the structured AI insights page (`/insights`).
 *
 * Payloads live in src/mocks/insights.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 */
import type { Page } from '@playwright/test';
import type {
  InsightHistoryResponse,
  InsightReportEnvelope,
  RunStatus,
} from '@/types/insights';
import type { WatchlistResponse } from '@/types/watchlist';
import {
  MOCK_AGENT_ROUTES,
  MOCK_CHAT_REPLY,
  MOCK_INSIGHT_HISTORY_EMPTY,
  MOCK_INSIGHT_REPORT,
  MOCK_REFRESH_QUEUED,
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
  MOCK_WATCHLIST,
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
