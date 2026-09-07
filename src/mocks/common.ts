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
import type { MostActiveResponse } from '@/components/shared/MostActiveBar';
import type { MarketHours } from '@/hooks/useConfig';
import type { MeResponse } from '@/hooks/useUser';
import type { RuntimeConfig } from '@/lib/runtimeConfig';
import type { UserPreferences } from '@/types/preferences';
import type { UserProfile } from '@/types/profile';
import type { LiveStatus } from '@/hooks/useLiveStatus';
import type { WatchlistResponse } from '@/types/watchlist';
import type { MockRoute } from './types';

/** Nothing in the SPA reads this body (authedFetch only names the path as
 *  an open prefix), so there is no frontend contract for it to satisfy. */
export const MOCK_HEALTH = { status: 'ok', cloud_sql: false };

/** Open auth keeps the gate inert — matching iap/local behaviour. */
export const MOCK_FIREBASE_CONFIG_OPEN = { authMode: 'open', firebase: null } satisfies RuntimeConfig;

/** The identity mock mode runs as: a dev-role admin, clearly fake domain. */
export const MOCK_ME_DEV = {
  email: 'dev@mock.solyra',
  is_admin: true,
  is_dev: true,
} satisfies MeResponse;

/**
 * GET /api/me/profile — the Settings profile form (useProfile). A populated
 * profile (rather than the backend's 404-when-unset) so the form renders
 * real-looking data in mock mode; values satisfy UserProfile so drift from
 * the contract fails tsc.
 */
export const MOCK_PROFILE = {
  display_name: 'Solyra Dev',
  timezone: 'America/New_York',
  default_ticker: 'IWM',
  default_timeframe: '1D',
  account_size: 25_000,
  risk_per_trade_pct: 1.0,
  notify_daily_digest: true,
  notify_catalyst_alerts: true,
  notify_signal_alerts: false,
  number_format: 'abbreviated',
  date_format: 'iso',
  show_extended_hours: false,
} satisfies UserProfile;

/** 200 with all-null fields = "nothing stored yet" without a console 404. */
export const MOCK_PREFERENCES_EMPTY = {
  theme: null,
  nav_pattern: null,
  density: null,
  accent: null,
} satisfies UserPreferences;

/**
 * Wire shape per routers/live.py:169-174 — no `ts` field exists there; the
 * old mock invented one and omitted the required next_open/current_time_et
 * (fixture audit 2026-09-06, B1).
 */
export const MOCK_LIVE_STATUS = {
  is_open: false,
  session: 'closed',
  next_open: '2026-04-27 09:30:00',
  current_time_et: '20:00:00',
} satisfies LiveStatus;

/** Honest empty ranking — the panel renders its empty state for the right
 *  reason; pages wanting rows override with MOCK_WATCHLIST (insights). */
export const MOCK_WATCHLIST_EMPTY = {
  run_id: 'bbbbbbbb-0000-0000-0000-000000000000',
  as_of: '2026-04-24T20:00:00Z',
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
} satisfies MostActiveResponse;

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
  { pattern: /^\/api\/me\/profile$/, reply: () => ({ body: MOCK_PROFILE }) },
  {
    // Same stateless-write convention as preferences above.
    method: 'PUT',
    pattern: /^\/api\/me\/profile$/,
    reply: (req) => ({ body: { ...MOCK_PROFILE, ...(req.body as object) } }),
  },
  { pattern: /^\/api\/live\/status$/, reply: () => ({ body: MOCK_LIVE_STATUS }) },
  // /api/insights/watchlist is owned by ./insights (populated ranking);
  // MOCK_WATCHLIST_EMPTY stays exported for the Playwright mockCommon.
  {
    pattern: /^\/api\/market\/most-active$/,
    reply: () => ({ body: MOCK_MOST_ACTIVE_EMPTY }),
  },
  {
    pattern: /^\/api\/config\/market-hours$/,
    reply: () => ({ body: MOCK_MARKET_HOURS }),
  },
];
