// Types that mirror the deterministic ranker API at
// GET /api/insights/watchlist  →  lib.agents.ranker.rank_tickers(...)

import type { components, paths } from './stocksOpenApi.gen';

export type CatalystType =
  | 'earnings'
  | 'sec_8k'
  | 'insider'
  | 'top_mover'
  | 'economic_event'
  | 'watchlist'
  | 'manual';

export interface SignalContribution {
  name: string;
  available: boolean;
  score_0_to_1: number;
  weight: number;
  points: number;
  reason: string;
  raw: Record<string, unknown>;
}

export interface RankedTicker {
  ticker: string;
  score: number;
  pct_of_max: number;
  catalyst_types: CatalystType[];
  catalyst_metadata: Partial<Record<CatalystType, Record<string, unknown>[]>>;
  score_breakdown: SignalContribution[];
}

export interface WatchlistResponse {
  run_id: string;
  as_of: string;          // ISO timestamp
  candidate_count: number;
  excluded_count: number;
  ranked: RankedTicker[];
  weights_used: Record<string, number>;
  duration_ms: number;
}

// FEAT-INSIGHT-001 per-user watchlist. Derived from the vendored OpenAPI
// document so a drifted response shape fails the build, not the page.

/** GET /api/insights/watchlist/default (read-only default list). */
export type WatchlistDefaultResponse =
  paths['/api/insights/watchlist/default']['get']['responses']['200']['content']['application/json'];

/** GET and POST /api/me/watchlist answer the caller's list. */
export type MeWatchlistResponse =
  paths['/api/me/watchlist']['get']['responses']['200']['content']['application/json'];

/** One row of the caller's watchlist. */
export type MeWatchlistRow = MeWatchlistResponse['tickers'][number];

/** DELETE /api/me/watchlist/{ticker} answers the list without the ticker. */
export type MeWatchlistRemoveResponse = components['schemas']['MeWatchlistRemoveResponse'];
