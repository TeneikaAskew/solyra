/**
 * Typed fixtures + route wiring for the Options Flow page (`/options`).
 *
 * Moved out of helpers/mocks.ts so every page's test data lives under
 * fixtures/ and mocks.ts stays what its name promises: the cross-cutting
 * `mockCommon` and the `M` fulfil helpers.
 *
 * The /options page (OptionsFlowPage.tsx) fans out to FIVE endpoints, all of
 * which must be intercepted for hermetic runs (an unmocked /api request hits
 * the Vite proxy and fails when the backend isn't reachable):
 *   Heatseeker/Swing (default tab, SwingMode.tsx):
 *     GET  /api/options/dates/{ticker}          latest snapshot date
 *     GET  /api/options/{ticker}/grid?…         useGammaGrid   → GammaGridSummary
 *     GET  /api/options/{ticker}/{date}/levels  useGammaLevels → GammaLevelsResponse
 *   Profiles tab (ProfilesTab.tsx):
 *     GET  /api/options/{ticker}/{date}         chain; 404 → /live fallback
 *     POST /api/options/greeks                  useOptionsGreeks → GreeksResponse
 *
 * Server-side module paths named in these comments (options.py, grid.py,
 * lib/gamma.py) now live in the stocks repo — this repo is frontend-only and
 * proxies /api to the deployed backend.
 */
import type { Page } from '@playwright/test';
import type { GammaLevel, GammaLevelsResponse } from '@/hooks/useGammaLevels';
import type { GammaGridCell, GammaGridSummary } from '@/hooks/useGammaGrid';
import type {
  AggregatedStrike,
  GreeksResponse,
  OptionRecord,
} from '@/hooks/useOptionsGreeks';
import { M, mockCommon } from '../mocks';

// ── Empty variants (navigation.spec.ts, demo-banners.spec.ts) ──────────────

export const MOCK_LEVELS = {
  ticker: 'IWM',
  snapshot_date: '2026-04-25',
  spot: { price: 220, method: 'parity', note: '' },
  gamma_balance: 220,
  gamma_flip: 220,
  regime: 'positive_gamma',
  total_gex: 1_000_000,
  levels: [],
  kings: [],
  gates: [],
  gamma_balance_levels: [],
  window_pct: 6,
  warnings: [],
  chain_size: 0,
} satisfies GammaLevelsResponse;

export const MOCK_GRID = {
  ticker: 'IWM',
  snapshot_date: '2026-04-25',
  snapshot_ts: null,
  data_source: 'realtime',
  spot: { price: 220, method: 'parity', note: '' },
  gamma_balance: 220,
  gamma_flip: 220,
  regime: 'positive_gamma',
  total_gex: 1_000_000,
  total_vex: 0,
  cells: [],
  expirations: [],
  strikes: [],
  window_pct: 6,
  warnings: [],
} satisfies GammaGridSummary;

// ── Chain + dates ──────────────────────────────────────────────────────────

interface OptionsDatesResponse {
  ticker: string;
  dates: string[];
}

export const MOCK_OPTIONS_DATES = {
  ticker: 'IWM',
  dates: ['2026-04-25', '2026-04-24'],
} satisfies OptionsDatesResponse;

interface OptionsChainResponse {
  ticker: string;
  date: string;
  options: OptionRecord[];
  metadata: { source: string; data_source: string; row_count: number };
}

export const MOCK_OPTIONS_CHAIN = {
  ticker: 'IWM',
  date: '2026-04-25',
  options: [
    { type: 'call', strike: 218, open_interest: 4000, gamma: 0.03, vega: 0.04, delta: 0.7, volume: 800 },
    { type: 'call', strike: 219, open_interest: 5000, gamma: 0.04, vega: 0.05, delta: 0.6, volume: 900 },
    { type: 'call', strike: 220, open_interest: 6000, gamma: 0.04, vega: 0.05, delta: 0.5, volume: 1200 },
    { type: 'call', strike: 221, open_interest: 5000, gamma: 0.04, vega: 0.05, delta: 0.4, volume: 950 },
    { type: 'call', strike: 222, open_interest: 4000, gamma: 0.03, vega: 0.04, delta: 0.3, volume: 700 },
    { type: 'put',  strike: 218, open_interest: 4500, gamma: 0.03, vega: 0.04, delta: -0.3, volume: 850 },
    { type: 'put',  strike: 219, open_interest: 5200, gamma: 0.04, vega: 0.05, delta: -0.4, volume: 1000 },
    { type: 'put',  strike: 220, open_interest: 6200, gamma: 0.04, vega: 0.05, delta: -0.5, volume: 1300 },
    { type: 'put',  strike: 221, open_interest: 5100, gamma: 0.04, vega: 0.05, delta: -0.6, volume: 1100 },
    { type: 'put',  strike: 222, open_interest: 4400, gamma: 0.03, vega: 0.04, delta: -0.7, volume: 900 },
  ],
  metadata: { source: 'mock', data_source: 'mock', row_count: 10 },
} satisfies OptionsChainResponse;

// ── Greeks ─────────────────────────────────────────────────────────────────

/**
 * The greeks router returns per-strike vega alongside gamma, but the
 * frontend's `AggregatedStrike` doesn't model those three fields. Rather
 * than drop them from a fixture captured byte-for-byte off the live router,
 * the wire shape is declared here so the rest of the payload still
 * type-checks. If `AggregatedStrike` ever grows the vega fields, delete this
 * and satisfy `GreeksResponse` directly.
 */
type AggregatedStrikeWire = AggregatedStrike & {
  net_vega: number;
  call_vega: number;
  put_vega: number;
};

type GreeksResponseWire = Omit<GreeksResponse, 'aggregated'> & {
  aggregated: AggregatedStrikeWire[];
};

export const MOCK_GREEKS = {
  aggregated: [
    { strike: 218, net_gamma: -15, call_gamma: 120, put_gamma: 135, net_vega: -20, call_vega: 160, put_vega: 180, call_oi: 4000, put_oi: 4500, call_volume: 800, put_volume: 850 },
    { strike: 219, net_gamma: -8, call_gamma: 200, put_gamma: 208, net_vega: -10, call_vega: 250, put_vega: 260, call_oi: 5000, put_oi: 5200, call_volume: 900, put_volume: 1000 },
    { strike: 220, net_gamma: -8, call_gamma: 240, put_gamma: 248, net_vega: -10, call_vega: 300, put_vega: 310, call_oi: 6000, put_oi: 6200, call_volume: 1200, put_volume: 1300 },
    { strike: 221, net_gamma: -4, call_gamma: 200, put_gamma: 204, net_vega: -5, call_vega: 250, put_vega: 255, call_oi: 5000, put_oi: 5100, call_volume: 950, put_volume: 1100 },
    { strike: 222, net_gamma: -12, call_gamma: 120, put_gamma: 132, net_vega: -16, call_vega: 160, put_vega: 176, call_oi: 4000, put_oi: 4400, call_volume: 700, put_volume: 900 },
  ],
  gex_by_strike: [
    { strike: 218, gex: -7260, call_gex: 58080, put_gex: -65340 },
    { strike: 219, gex: -3872, call_gex: 96800, put_gex: -100672 },
    { strike: 220, gex: -3872, call_gex: 116160, put_gex: -120032 },
    { strike: 221, gex: -1936, call_gex: 96800, put_gex: -98736 },
    { strike: 222, gex: -5808, call_gex: 58080, put_gex: -63888 },
  ],
  metrics: {
    total_gex: -22748,
    total_vex: -506220,
    zero_gamma: null,
    max_pain: 220,
    implied_move: 1.6065001960784193,
    put_call_ratio: 1.0583333333333333,
  },
  nodes: { kingNode: null, gatekeepers: [], midpoints: [], allNodes: [] },
  config: { strike_range_pct: 0.15, atm_tolerance: 0.02, node_min_gamma: 500 },
} satisfies GreeksResponseWire;

// ── Populated levels / grid ────────────────────────────────────────────────

const level = (
  strike: number,
  gex: number,
  kind: GammaLevel['kind'],
  tags: string[],
): GammaLevel => ({
  strike,
  gex,
  net_gamma: gex / 48_400, // spot² × 100 multiplier inverted — plausible, unused by UI
  call_oi: 5000,
  put_oi: 5200,
  distance_pct: ((strike - 220) / 220) * 100,
  score: Math.abs(gex) / 2_000_000,
  kind,
  tags,
});

/** Populated taxonomy so the King/Gate/regime UI actually renders. */
export const MOCK_LEVELS_POPULATED = {
  ticker: 'IWM',
  snapshot_date: '2026-04-25',
  spot: { price: 220, method: 'parity', note: 'K=220.0 C=1.20 P=1.15 exp=2026-04-25' },
  gamma_balance: 219.5,
  gamma_flip: 219.75,
  regime: 'positive_gamma',
  total_gex: 1_250_000,
  levels: [
    level(218, 620_000, 'gate', ['gate']),
    level(219, -180_000, 'gamma_balance', ['gamma_balance']),
    level(220, 1_950_000, 'king', ['king', 'spot']),
    level(221, 710_000, 'gate', ['gate']),
    level(222, 240_000, 'none', []),
  ],
  kings: [level(220, 1_950_000, 'king', ['king', 'spot'])],
  gates: [level(218, 620_000, 'gate', ['gate']), level(221, 710_000, 'gate', ['gate'])],
  gamma_balance_levels: [level(219, -180_000, 'gamma_balance', ['gamma_balance'])],
  window_pct: 6,
  warnings: [],
  snapshot_timestamp: '2026-04-25T20:00:00+00:00',
  chain_size: 10,
} satisfies GammaLevelsResponse;

const gridCell = (
  strike: number,
  expiration: string,
  dte: number,
  gex: number,
  vex: number,
): GammaGridCell => ({
  strike,
  expiration,
  dte,
  net_gamma: gex / 48_400,
  call_gamma: Math.abs(gex) / 96_800,
  put_gamma: Math.abs(gex) / 96_800,
  net_vega: vex / 48_400,
  call_vega: Math.abs(vex) / 96_800,
  put_vega: Math.abs(vex) / 96_800,
  gex,
  call_gex: gex > 0 ? gex * 1.5 : gex * -0.5,
  put_gex: gex > 0 ? gex * -0.5 : gex * 1.5,
  vex,
  call_vex: vex > 0 ? vex * 1.5 : vex * -0.5,
  put_vex: vex > 0 ? vex * -0.5 : vex * 1.5,
  call_oi: 5000,
  put_oi: 5200,
  call_volume: 900,
  put_volume: 1000,
  distance_pct: ((strike - 220) / 220) * 100,
  pct_change: null,
  abs_change: null,
});

export const MOCK_GRID_POPULATED = {
  ticker: 'IWM',
  snapshot_date: '2026-04-25',
  snapshot_ts: '2026-04-25T20:00:00+00:00',
  data_source: 'eod_fallback',
  spot: { price: 220, method: 'parity', note: 'K=220.0 C=1.20 P=1.15 exp=2026-04-25' },
  gamma_balance: 219.5,
  gamma_flip: 219.75,
  regime: 'positive_gamma',
  total_gex: 1_250_000,
  total_vex: -350_000,
  cells: [
    gridCell(218, '2026-04-25', 0, 420_000, -60_000),
    gridCell(219, '2026-04-25', 0, -120_000, -40_000),
    gridCell(220, '2026-04-25', 0, 1_310_000, -90_000), // King cell (largest |net GEX|)
    gridCell(221, '2026-04-25', 0, 480_000, -55_000),
    gridCell(222, '2026-04-25', 0, 160_000, -30_000),
    gridCell(218, '2026-05-16', 21, 200_000, -25_000),
    gridCell(219, '2026-05-16', 21, -60_000, -15_000),
    gridCell(220, '2026-05-16', 21, 640_000, -45_000),
    gridCell(221, '2026-05-16', 21, 230_000, -20_000),
    gridCell(222, '2026-05-16', 21, 80_000, -10_000),
  ],
  expirations: ['2026-04-25', '2026-05-16'],
  strikes: [218, 219, 220, 221, 222],
  window_pct: 6,
  warnings: [],
} satisfies GammaGridSummary;

/** The `unavailable` envelope — no snapshot for the ticker/date at all. */
export const MOCK_GRID_UNAVAILABLE = {
  ticker: 'IWM',
  snapshot_date: null,
  snapshot_ts: null,
  data_source: 'unavailable',
  spot: { price: 0, method: 'none', note: 'no chain' },
  gamma_balance: null,
  gamma_flip: null,
  regime: 'unknown',
  total_gex: 0,
  total_vex: 0,
  cells: [],
  expirations: [],
  strikes: [],
  window_pct: 6,
  warnings: ['no options snapshot for IWM'],
  reason: 'no snapshot available',
} satisfies GammaGridSummary;

/**
 * Intercept every options endpoint the /options page can hit (both the
 * default Heatseeker/Swing view and the Profiles tab), scoped to IWM.
 * Registration order matters: Playwright matches routes newest-first, so the
 * single-segment chain glob goes FIRST and the more specific /grid and
 * /levels patterns after it take precedence.
 * Includes `mockCommon`, so callers don't need to call it separately.
 */
export async function mockOptionsApi(page: Page) {
  await mockCommon(page);
  await page.route('**/api/options/dates/IWM', (r) => r.fulfill(M.ok(MOCK_OPTIONS_DATES)));
  // Chain (single-segment glob: does NOT match /grid?…, /…/levels or
  // /api/options/live/IWM/… — those are handled below / by the caller).
  await page.route('**/api/options/IWM/*', (r) => r.fulfill(M.ok(MOCK_OPTIONS_CHAIN)));
  await page.route('**/api/options/IWM/grid*', (r) => r.fulfill(M.ok(MOCK_GRID_POPULATED)));
  await page.route('**/api/options/IWM/*/levels*', (r) => r.fulfill(M.ok(MOCK_LEVELS_POPULATED)));
  await page.route('**/api/options/greeks', (r) => r.fulfill(M.ok(MOCK_GREEKS)));
}
