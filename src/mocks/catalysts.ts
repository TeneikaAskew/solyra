/**
 * Typed fixtures + mock-mode routes for the catalyst timeline (`/catalysts`).
 *
 * Payloads are shared verbatim with the E2E suite —
 * tests/helpers/fixtures/catalysts.ts re-exports them for its Playwright
 * wiring — so the app's mock mode and the E2E mocks cannot drift.
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
import type { CatalystsResponse, CatalystTypesResponse } from '@/routes/CatalystsPage';
import type { MockRoute } from './types';

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
    // Real envelope names its providers (catalysts.py joins them).
    source: 'Benzinga + DB (news + sec, 1)',
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
          source: 'Benzinga',
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
          source: 'Benzinga',
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

/** No events in the window — drives the page's empty state. The backend's
 *  empty response is the SAME 'ok' envelope with total 0 — it never emits
 *  a `message` key or a 'no_data' status (catalysts.py), so the page's
 *  no_data banner branch is unreachable and this fixture must not feed it. */
export function buildCatalystEventsEmpty(): CatalystsResponse {
  return {
    status: 'ok',
    source: 'Benzinga',
    date_range: { from: '2026-04-25', to: '2026-05-09' },
    total: 0,
    events_by_date: {},
  };
}

// Colors are hex strings copied verbatim from catalysts.py BENZINGA_TYPES —
// palette names would behave differently anywhere `color` feeds a style.
export const MOCK_CATALYST_TYPES = {
  benzinga_types: {
    EARNINGS: { label: 'Earnings', color: '#e74c3c', icon: 'TrendingUp' },
    CONFERENCE_CALL: { label: 'Conference Call', color: '#3498db', icon: 'Phone' },
    MERGER_ACQUISITION: { label: 'M&A', color: '#e67e22', icon: 'GitMerge' },
    ECONOMIC: { label: 'Economic', color: '#7f8c8d', icon: 'Globe' },
  },
  wsh_only_types: {},
  upgrade_note: 'Upgrade for full coverage',
} satisfies CatalystTypesResponse;

/**
 * Mock-mode route table for `/catalysts` — the happy-path translation of
 * `mockCatalystsApi` (tests/helpers/fixtures/catalysts.ts). The events
 * pattern matches the pathname only, so the page's date-range/type query
 * strings pass through untouched.
 */
export const catalystsRoutes: MockRoute[] = [
  { pattern: /^\/api\/catalysts\/events$/, reply: () => ({ body: buildCatalystEvents() }) },
  { pattern: /^\/api\/catalysts\/types$/, reply: () => ({ body: MOCK_CATALYST_TYPES }) },
];
