/**
 * Typed fixtures + route wiring for the catalyst timeline (`/catalysts`).
 *
 * Endpoint fan-out, read off CatalystsPage.tsx:
 *   GET /api/catalysts/events?…  useCatalystEvents → CatalystsResponse
 *   GET /api/catalysts/types     useCatalystTypes  → CatalystTypesResponse
 *
 * The "Hot Now" panel selects on `date === today || date === tomorrow`, so
 * those two rows must be built against the CLOCK, not against a frozen ISO
 * string — a hardcoded date silently stops being "hot" the next day and the
 * panel's tests rot into false greens. `buildCatalystEvents()` is therefore
 * a function, evaluated per call.
 */
import type { Page } from '@playwright/test';
import type { CatalystsResponse, CatalystTypesResponse } from '@/routes/CatalystsPage';
import { M, mockCommon } from '../mocks';

/** Today / tomorrow in ISO (YYYY-MM-DD), matching the page's own date keys. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Four events covering every renderer branch the page has:
 *   - today, High impact, news-shaped (`title`/`impact`/sentiment) → Hot Now
 *   - a fixed-date Earnings row, Benzinga-shaped (`event`/`expected_impact`,
 *     lowercase 'high') → proves the dual-vocabulary normalizer works
 *   - a fixed-date Medium row → the one the min-impact filter must remove
 *   - tomorrow, High impact, macro → the second Hot Now branch
 */
export function buildCatalystEvents(): CatalystsResponse {
  const today = todayIso();
  const tomorrow = tomorrowIso();
  return {
    status: 'ok',
    source: 'mock',
    date_range: { from: '2026-04-25', to: '2026-05-09' },
    total: 4,
    events_by_date: {
      [today]: [
        {
          date: today,
          ticker: 'AVGO',
          catalyst_type: 'MERGER_ACQUISITION',
          title: 'Broadcom rises on AI deals; BofA says visibility improves',
          impact: 'High',
          source: 'AV news',
          sentiment_score: 0.73,
          sentiment_label: 'Bullish',
          relevance_score: 1.0,
        },
      ],
      '2026-04-28': [
        {
          date: '2026-04-28',
          ticker: 'AAPL',
          company_name: 'Apple Inc.',
          catalyst_type: 'EARNINGS',
          event: 'Q2 2026 Earnings',
          expected_impact: 'high',
          confirmed: true,
          source: 'mock',
        },
      ],
      '2026-04-30': [
        {
          date: '2026-04-30',
          ticker: 'MSFT',
          company_name: 'Microsoft Corp.',
          catalyst_type: 'CONFERENCE_CALL',
          event: 'Investor Day',
          expected_impact: 'medium',
          confirmed: true,
          source: 'mock',
        },
      ],
      [tomorrow]: [
        {
          date: tomorrow,
          ticker: 'MACRO',
          catalyst_type: 'ECONOMIC',
          title: 'CPI release',
          impact: 'High',
          source: 'FRED/Calendar',
        },
      ],
    },
  };
}

/** No events in the window — drives the page's empty state. */
export function buildCatalystEventsEmpty(): CatalystsResponse {
  return {
    status: 'ok',
    source: 'mock',
    date_range: { from: '2026-04-25', to: '2026-05-09' },
    total: 0,
    events_by_date: {},
    message: 'No catalysts in the selected window.',
  };
}

export const MOCK_CATALYST_TYPES = {
  benzinga_types: {
    EARNINGS: { label: 'Earnings', color: 'red', icon: 'TrendingUp' },
    CONFERENCE_CALL: { label: 'Conference Call', color: 'blue', icon: 'Phone' },
    MERGER_ACQUISITION: { label: 'M&A', color: 'purple', icon: 'GitMerge' },
    ECONOMIC: { label: 'Economic', color: 'amber', icon: 'Globe' },
  },
  wsh_only_types: {},
  upgrade_note: 'Upgrade for full coverage',
} satisfies CatalystTypesResponse;

export interface CatalystsMockOpts {
  events?: CatalystsResponse;
  types?: CatalystTypesResponse;
}

/**
 * Intercept every endpoint `/catalysts` can hit.
 * Includes `mockCommon`, so callers don't need it separately.
 */
export async function mockCatalystsApi(page: Page, opts: CatalystsMockOpts = {}) {
  await mockCommon(page);
  const events = opts.events ?? buildCatalystEvents();
  const types = opts.types ?? MOCK_CATALYST_TYPES;

  await page.route('**/api/catalysts/events**', (r) => r.fulfill(M.ok(events)));
  await page.route('**/api/catalysts/types', (r) => r.fulfill(M.ok(types)));
}
