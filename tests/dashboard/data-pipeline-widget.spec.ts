/**
 * E2E: the retired data-pipeline widget must stay off the dashboard.
 *
 * Ported 2026-09-03 from stocks `platform/tests/data-pipeline-status.spec.ts`
 * (deleted in the stocks#957 frontend split without landing here). Only the
 * frontend half moves: the original file also asserted the live
 * `/api/health/freshness` envelope against `localhost:8000`, and those API
 * tests belong to the stocks repo (tracked there by stocks#971), not to this
 * one.
 *
 * The contract this pins: the old `DataPipelineStatus` dashboard widget was
 * orphaned by the dashboard redesign and does not exist in this repo at all
 * (no component under src/ renders a "Data pipeline" section). The freshness
 * route is mocked with a healthy payload so the absence is proven structural
 * rather than a failed fetch. If a pipeline-status widget is ever
 * (re)introduced on the dashboard, this test fails and a real
 * render/expand/timestamp suite should be written alongside it — the original
 * one is recoverable from stocks git history at
 * `9f28a60^:platform/tests/data-pipeline-status.spec.ts`.
 */
import { test, expect } from '@playwright/test';
import { M } from '../helpers/mocks';
import { mockAllPages } from '../helpers/fixtures/all';

// Mirrors the real /api/health/freshness envelope (stocks
// platform/api/routers/health.py get_freshness → audit_data_freshness
// FreshnessRow). market_data_daily tracks IWM/SPY/QQQ only; SPX freshness is
// watched via etf_options_snapshots — see the stocks-side API tests.
const freshnessRow = (table: string, ticker: string | null) => ({
  table,
  ticker,
  last_row_at: '2026-04-24',
  expected_latest: '2026-04-24',
  lag_hours: 2.5,
  expected_max_hours: 30,
  status: 'ok',
  row_count_recent: 1,
  writer_job: null,
});

const MOCK_FRESHNESS = {
  checked_at: '2026-04-25T12:00:00Z',
  expected_market_close: '2026-04-24',
  overall_status: 'ok',
  tables: [
    freshnessRow('market_data_daily', 'IWM'),
    freshnessRow('market_data_daily', 'SPY'),
    freshnessRow('market_data_daily', 'QQQ'),
    freshnessRow('etf_options_snapshots', 'IWM'),
    freshnessRow('etf_options_snapshots', 'SPY'),
    freshnessRow('etf_options_snapshots', 'QQQ'),
    freshnessRow('etf_options_snapshots', 'SPX'),
    freshnessRow('signal_alerts', null),
  ],
};

test.describe('Data pipeline status widget', () => {
  test('dashboard renders without the data-pipeline widget', async ({ page }) => {
    await mockAllPages(page);
    await page.route('**/api/health/freshness', (r) => r.fulfill(M.ok(MOCK_FRESHNESS)));

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Dashboard landmark (DashboardPage.tsx renders the Overview h1)
    await expect(page.locator('h1', { hasText: 'Overview' }).first()).toBeVisible({
      timeout: 15_000,
    });

    // The retired widget's unmistakable label must not appear anywhere.
    await expect(page.getByText(/data pipeline/i)).toHaveCount(0);
  });
});
