/**
 * Route wiring for the Signal Explorer page (`/signals`).
 *
 * Payloads live in src/mocks/signals.ts — shared verbatim with the app's
 * mock-data mode — and are re-exported here so specs keep importing from
 * the fixture layer. See that module for the endpoint fan-out and the
 * per-payload contract notes.
 *
 * The page also mounts <TickerCombobox>, whose two endpoints are gated on
 * the user typing (`enabled: keywords.length >= 1`) so they never fire on
 * first paint — but they DO fire the moment a test drives the combobox, and
 * an unmocked /api request falls through to the Vite proxy and 500s with
 * ECONNREFUSED when no backend is up. They're wired here with empty results
 * so interaction tests stay hermetic without re-declaring them.
 */
import type { Page } from '@playwright/test';
import type { SignalsResponse } from '@/routes/SignalsPage';
import type { TradeStats } from '@/hooks/useTradeAnalytics';
import { MOCK_SIGNALS, MOCK_TRADE_SUMMARY } from '@/mocks/signals';
import { M, mockCommon } from '../mocks';
import nativeScores from '../../fixtures/signal-score-native.json' with { type: 'json' };
import type { components } from '@/types/stocksOpenApi.gen';

export {
  MOCK_SIGNALS,
  MOCK_SIGNALS_EMPTY,
  MOCK_TRADE_SUMMARY,
  MOCK_TRADE_SUMMARY_EMPTY,
} from '@/mocks/signals';

export interface SignalsMockOpts {
  signals?: SignalsResponse;
  summary?: TradeStats;
}

/**
 * Intercept every endpoint `/signals` can hit, scoped to IWM (the app's
 * default ticker). Includes `mockCommon`, so callers don't need it too.
 *
 * Pass `signals`/`summary` to swap in a variant; a spec that needs a
 * one-off error shape can still re-register the route after calling this —
 * Playwright matches newest-first, so the later registration wins.
 */
export async function mockSignalsApi(page: Page, opts: SignalsMockOpts = {}) {
  await mockCommon(page);
  const signals = opts.signals ?? MOCK_SIGNALS;
  const summary = opts.summary ?? MOCK_TRADE_SUMMARY;

  await page.route('**/api/signals/IWM*', (r) => r.fulfill(M.ok(signals)));
  await page.route('**/api/analytics/summary/IWM*', (r) => r.fulfill(M.ok(summary)));

  // TickerCombobox — search + per-symbol data coverage. Empty by default;
  // ticker-combobox.spec.ts drives these with real payloads of its own.
  await page.route('**/api/insights/ticker/search*', (r) => r.fulfill(M.ok({ results: [] })));
  await page.route('**/api/market/coverage*', (r) => r.fulfill(M.ok({ coverage: [] })));
}

/** Actual pinned Stocks producer outputs, plus deliberate unavailable/invalid
 * transport variants. This is consumer evidence, never live-market evidence. */
// Matches read_score_explanation(None, score=6, strategy='momentum', ...)
// at the fixture's pinned Stocks revision. No legacy denominator is inferred.
const legacyExplanation = {
  version: 'historical-score-v1', status: 'legacy_unavailable', kind: 'unknown',
  base_count: null, base_max: null, matched_conditions: null, bonuses: null,
  bonus_total: null, composite_strength: null, composite_max: null,
  unavailable_reasons: ['legacy_score_contract_missing'],
  provenance: {
    corpus: 'historical_signals', strategy: 'momentum', run_kind: 'backfill',
    storage_source: 'cloud_sql', producer_definition: null, profile: null, direction: null,
    code_sha256: null, config_sha256: null, input_sha256: null, generated_at: null,
    inserted_at: '2026-10-30T05:00:00+00:00',
  },
} satisfies components['schemas']['HistoricalScoreExplanation'];

export const SCORE_SCENARIOS = [
  { name: 'momentum-six', row: nativeScores.cases[0], base: '6/7', strength: '6', strategy: 'momentum' },
  { name: 'momentum-seven', row: nativeScores.cases[1], base: '7/7', strength: '7', strategy: 'momentum' },
  { name: 'mean-reversion', row: nativeScores.cases[2], base: '5/5', strength: '5', strategy: 'mean_reversion' },
  { name: 'legacy', row: { ...nativeScores.cases[0], score_explanation: legacyExplanation, conditions_met: '6/5' }, base: null, strength: '6', strategy: 'momentum' },
  { name: 'null', row: { ...nativeScores.cases[0], score: null, score_explanation: null, conditions_met: null }, base: null, strength: 'Unavailable', strategy: 'momentum' },
  { name: 'zero', row: { ...nativeScores.cases[0], score: 0, score_explanation: null, conditions_met: null }, base: null, strength: '0', strategy: 'momentum' },
  { name: 'malformed', row: { ...nativeScores.cases[0], score_explanation: { ...nativeScores.cases[0].score_explanation, provenance: null } }, base: null, strength: '6', strategy: 'momentum' },
];

export function scoreScenarioResponse(scenario: typeof SCORE_SCENARIOS[number]) {
  return { ticker: 'IWM', count: 1, returned: 1, source: 'cloud_sql', signals: [scenario.row] };
}
