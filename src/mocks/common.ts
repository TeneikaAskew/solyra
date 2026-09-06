/**
 * Cross-cutting fixtures: the endpoints every page hits (shell, status
 * pill, watchlist rail, market hours). Payloads are shared verbatim with
 * the E2E suite — tests/helpers/mocks.ts imports them for its `mockCommon`
 * wiring — so the app's mock mode and the Playwright mocks cannot drift
 * from each other.
 *
 * The one deliberate difference between the two consumers is /api/me: the
 * E2E `mockCommon` pins an ANONYMOUS identity (specs opt into roles), while
 * mock mode answers with MOCK_ME_DEV below — a signed-in dev/admin — so the
 * whole app (admin nav, journal, preferences) is explorable and the Support
 * menu keeps showing the toggle to exit the mode.
 */
import type { MarketHours } from '@/hooks/useConfig';
import type { WatchlistResponse } from '@/types/watchlist';
import type { MockRoute } from './types';

export const MOCK_HEALTH = { status: 'ok', cloud_sql: false };

/** Open auth keeps the gate inert — matching iap/local behaviour. */
export const MOCK_FIREBASE_CONFIG_OPEN = { authMode: 'open', firebase: null };

/** The identity mock mode runs as: a dev-role admin, clearly fake domain. */
export const MOCK_ME_DEV = {
  email: 'dev@mock.solyra',
  is_admin: true,
  is_dev: true,
};

/** 200 with all-null fields = "nothing stored yet" without a console 404. */
export const MOCK_PREFERENCES_EMPTY = {
  theme: null,
  nav_pattern: null,
  density: null,
  accent: null,
};

export const MOCK_LIVE_STATUS = {
  session: 'closed',
  is_open: false,
  ts: '2026-04-25T20:00:00Z',
};

/** Honest empty ranking — the panel renders its empty state for the right
 *  reason; pages wanting rows override with MOCK_WATCHLIST (insights). */
export const MOCK_WATCHLIST_EMPTY = {
  run_id: 'bbbbbbbb-0000-0000-0000-000000000000',
  as_of: '2026-04-25T20:00:00Z',
  candidate_count: 0,
  excluded_count: 0,
  ranked: [],
  weights_used: {},
  duration_ms: 0,
} satisfies WatchlistResponse;

/** Honest empty most-active response: the marquee hides itself. */
export const MOCK_MOST_ACTIVE_EMPTY = {
  snapshot_ts: null,
  snapshot_date: null,
  label: null,
  items: [],
};

export const MOCK_MARKET_HOURS = {
  timezone: 'America/New_York',
  regular: { open: '09:30', close: '16:00' },
  pre_market: { open: '04:00', close: '09:30' },
  after_hours: { open: '16:00', close: '20:00' },
  holidays_2026: ['2026-01-01', '2026-07-03', '2026-12-25'],
} satisfies MarketHours;

export const commonRoutes: MockRoute[] = [
  { pattern: /^\/api\/health$/, reply: () => ({ body: MOCK_HEALTH }) },
  {
    pattern: /^\/api\/config\/firebase$/,
    reply: () => ({ body: MOCK_FIREBASE_CONFIG_OPEN }),
  },
  { pattern: /^\/api\/me$/, reply: () => ({ body: MOCK_ME_DEV }) },
  {
    pattern: /^\/api\/me\/preferences$/,
    reply: () => ({ body: MOCK_PREFERENCES_EMPTY }),
  },
  {
    // Preference writes report success without persisting anywhere — mock
    // mode is stateless by design; the banner says so.
    method: 'PUT',
    pattern: /^\/api\/me\/preferences$/,
    reply: (req) => ({ body: { ...MOCK_PREFERENCES_EMPTY, ...(req.body as object) } }),
  },
  { pattern: /^\/api\/live\/status$/, reply: () => ({ body: MOCK_LIVE_STATUS }) },
  {
    pattern: /^\/api\/insights\/watchlist$/,
    reply: () => ({ body: MOCK_WATCHLIST_EMPTY }),
  },
  {
    pattern: /^\/api\/market\/most-active$/,
    reply: () => ({ body: MOCK_MOST_ACTIVE_EMPTY }),
  },
  {
    pattern: /^\/api\/config\/market-hours$/,
    reply: () => ({ body: MOCK_MARKET_HOURS }),
  },
];
