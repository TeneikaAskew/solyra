/**
 * The schema-to-type WIDENING check (issue #56).
 *
 * src/mocks/contract.test.ts validates samples against the OpenAPI schema,
 * which only catches the NARROWING direction (a field we read that the API
 * no longer declares). If the API widens a field — required `string` to
 * nullable, say — the old mock and the old TS type both stay valid, the
 * suite passes, and production returns a `null` the app does not handle.
 * That exact gap shipped two real UI bugs from the #54 nullable typing (a
 * bare `·` badge on insight history, `—%` on the dashboard win rate), both
 * found by review rather than by a check.
 *
 * This file closes it mechanically: every hand-written response type in
 * src/types/ with a generated counterpart must be assignable FROM the
 * generated one (stocksOpenApi.gen.d.ts, emitted from the vendored
 * snapshot by scripts/sync-api-contract.mjs). A newly-nullable or
 * newly-optional field then fails `tsc -b` — CI's first step — until the
 * hand-written type admits it and the display layer renders the missing
 * case.
 *
 * Compile-time only: nothing here emits code, and nothing imports it —
 * tsc type-checks it because it is in the app project's include set.
 *
 * Scope, deliberately: RESPONSE types only. Request types (e.g.
 * PreferencesUpdate) point the opposite way — the app must send what the
 * schema ACCEPTS — and that direction is already covered by the request
 * body samples contract.test.ts validates. Types with no schema
 * counterpart (frontend-local view/state types, and every operation stocks
 * has not given a response_model) are invisible to both checks; growing
 * response-model coverage on the stocks side is what shrinks that set.
 */
import type { components } from './stocksOpenApi.gen';
import type {
  ChartVoter,
  MovementContinuation,
  MovementExpectedMove,
  MovementHeadline,
  MovementLevels,
  MovementStatement,
  ReachRate,
} from './index';
import type {
  InsightHistoryResponse,
  InsightHistoryRow,
  RefreshResponse,
  RunStatus,
} from './insights';
import type { RankedTicker, SignalContribution, WatchlistResponse } from './watchlist';
// Wire types declared where they are consumed (hooks, routes, shared
// components, lib) rather than in src/types — the check covers them all the
// same; a type-only import pulls no runtime code into any chunk.
import type {
  AdminDataSourcesResponse,
  AdminUserRow,
  AdminUsersResponse,
  AvailableModelsResponse,
  DataSourceRefreshResult,
  RouteListResponse,
  RouteRow,
  StratEngineStateResponse,
  StratPredictResponse,
  StructureBriefResponse,
} from '@/hooks/useAdmin';
import type { IndicatorConfig, MarketHours } from '@/hooks/useConfig';
import type { GammaGridCell, GammaGridSummary } from '@/hooks/useGammaGrid';
import type { GammaLevelsResponse } from '@/hooks/useGammaLevels';
import type { BriefDirection } from '@/hooks/useInsights';
import type { InsightReportEnvelope } from './insights';
import type {
  ImportCommitResponse,
  ImportPreviewResponse,
  JournalDeleteResponse,
  JournalExportResponse,
  JournalMutationResponse,
  JournalTradesResponse,
  MineStyleSuccess,
  MineStyleUnavailable,
  ReplayTradesResponse,
  SeedTradesOk,
  SeedTradesUnavailable,
} from '@/hooks/useJournalChartTrades';
import type { AvgVolume, LiveHistory } from '@/hooks/useLiveHistory';
import type { IndicatorsResponse, SignalSeriesResponse } from '@/hooks/useLiveIndicators';
import type { LiveQuote } from '@/hooks/useLiveQuote';
import type { LiveStatus } from '@/hooks/useLiveStatus';
import type { DatesResponse, MarketDataResponse } from '@/hooks/useMarketData';
import type { OptionsDatesResponse } from '@/hooks/useOptionsDates';
import type { GreeksResponse } from '@/hooks/useOptionsGreeks';
import type { PlaybookEvaluateResponse } from '@/hooks/usePlaybookEvaluation';
import type { SimilarResponse } from '@/hooks/useSimilarSetups';
import type {
  CoverageResult,
  TickerSearchResult,
  WatchlistAddResult,
  WatchlistRemoveResult,
} from '@/hooks/useTickerSearch';
import type { TradeStats } from '@/hooks/useTradeAnalytics';
import type { MeResponse } from '@/hooks/useUser';
import type { ReportListResponse } from '@/lib/reports';
import type { RuntimeConfig } from '@/lib/runtimeConfig';
import type {
  BacktestAllResponse,
  BacktestResultsResponse,
  EquityResponse,
} from '@/components/backtest/BacktesterSection';
import type { OptionsResponse } from '@/components/options/ProfilesTab';
import type { MostActiveResponse } from '@/components/shared/MostActiveBar';
import type { SectorsResponse } from '@/mocks/dashboard';
import type { CatalystTypesResponse, CatalystsResponse } from '@/routes/CatalystsPage';
import type { BriefResponse, PlaybookResponse, ReferenceResponse } from '@/routes/DashboardPage';
import type { SignalsResponse } from '@/routes/SignalsPage';

type S = components['schemas'];

/** Resolves to true only when every value the API may emit fits our type. */
type IsAssignable<From, To> = [From] extends [To] ? true : false;
/** A non-true argument is a compile error — the whole point. */
type Expect<T extends true> = T;

/**
 * One entry per covered type. The tuple is exported so noUnusedLocals sees
 * every check consumed. Add a line whenever a hand-written type gains a
 * schema counterpart; the renamed pairs are mapped explicitly.
 *
 * NOT paired, deliberately:
 *  - `PlaybookCard` (src/types) vs S['PlaybookCard'] — a NAME collision,
 *    not a counterpart. The frontend type is the camelCase VIEW model a
 *    mapper builds; the schema one is the snake_case API row. Pairing
 *    them just asserts the mapper's input differs from its output.
 *  - `UserPreferences` / `UserProfile` — POST-SANITIZATION types, not
 *    wire claims: usePreferences/useProfile take the wire as `unknown`
 *    and validate every field (`sanitizePreferences`/`sanitizeProfile`,
 *    unknown values degrade to null). That boundary already absorbs any
 *    widening, which is stronger than an assignability assertion — and
 *    the schema's plain `str` fields are themselves deliberate
 *    (PreferencesResponse: "the columns are bare TEXT").
 *  - `HealthResponse` / `WaitlistResponse` — the app never READS these
 *    bodies (authedFetch's probe and submitWaitlist check `r.ok` only),
 *    so there is no hand-written type to check; the mock payloads are
 *    still schema-validated by contract.test.ts.
 *  - Schemas with no app consumer at all (2026-09-15 sweep):
 *    FreshnessResponse, GammaNodesResponse, GridTimeseriesResponse,
 *    MagnitudePrediction, StructureContinuationResponse. Pair them in
 *    the same change that adds their first consumer.
 */
export type AssignabilityChecks = [
  // ── direct name matches ─────────────────────────────────────────────
  Expect<IsAssignable<S['ChartVoter'], ChartVoter>>,
  Expect<IsAssignable<S['InsightHistoryResponse'], InsightHistoryResponse>>,
  Expect<IsAssignable<S['InsightHistoryRow'], InsightHistoryRow>>,
  Expect<IsAssignable<S['MovementContinuation'], MovementContinuation>>,
  Expect<IsAssignable<S['MovementHeadline'], MovementHeadline>>,
  Expect<IsAssignable<S['MovementLevels'], MovementLevels>>,
  Expect<IsAssignable<S['ReachRate'], ReachRate>>,
  Expect<IsAssignable<S['RefreshResponse'], RefreshResponse>>,
  Expect<IsAssignable<S['RunStatus'], RunStatus>>,
  Expect<IsAssignable<S['RankedTicker'], RankedTicker>>,
  Expect<IsAssignable<S['SignalContribution'], SignalContribution>>,
  Expect<IsAssignable<S['WatchlistResponse'], WatchlistResponse>>,
  // ── direct name matches — hook/route/component-local wire types ────
  Expect<IsAssignable<S['AdminDataSourcesResponse'], AdminDataSourcesResponse>>,
  Expect<IsAssignable<S['AdminUserRow'], AdminUserRow>>,
  Expect<IsAssignable<S['AdminUsersResponse'], AdminUsersResponse>>,
  Expect<IsAssignable<S['AvailableModelsResponse'], AvailableModelsResponse>>,
  Expect<IsAssignable<S['BacktestAllResponse'], BacktestAllResponse>>,
  Expect<IsAssignable<S['BacktestResultsResponse'], BacktestResultsResponse>>,
  Expect<IsAssignable<S['CatalystTypesResponse'], CatalystTypesResponse>>,
  Expect<IsAssignable<S['CatalystsResponse'], CatalystsResponse>>,
  Expect<IsAssignable<S['GammaGridCell'], GammaGridCell>>,
  Expect<IsAssignable<S['GammaLevelsResponse'], GammaLevelsResponse>>,
  Expect<IsAssignable<S['GreeksResponse'], GreeksResponse>>,
  Expect<IsAssignable<S['ImportCommitResponse'], ImportCommitResponse>>,
  Expect<IsAssignable<S['ImportPreviewResponse'], ImportPreviewResponse>>,
  Expect<IsAssignable<S['IndicatorsResponse'], IndicatorsResponse>>,
  Expect<IsAssignable<S['JournalDeleteResponse'], JournalDeleteResponse>>,
  Expect<IsAssignable<S['JournalExportResponse'], JournalExportResponse>>,
  Expect<IsAssignable<S['JournalMutationResponse'], JournalMutationResponse>>,
  Expect<IsAssignable<S['JournalTradesResponse'], JournalTradesResponse>>,
  Expect<IsAssignable<S['MeResponse'], MeResponse>>,
  Expect<IsAssignable<S['MineStyleSuccess'], MineStyleSuccess>>,
  Expect<IsAssignable<S['MineStyleUnavailable'], MineStyleUnavailable>>,
  Expect<IsAssignable<S['MostActiveResponse'], MostActiveResponse>>,
  Expect<IsAssignable<S['OptionsDatesResponse'], OptionsDatesResponse>>,
  Expect<IsAssignable<S['PlaybookEvaluateResponse'], PlaybookEvaluateResponse>>,
  Expect<IsAssignable<S['PlaybookResponse'], PlaybookResponse>>,
  Expect<IsAssignable<S['ReferenceResponse'], ReferenceResponse>>,
  Expect<IsAssignable<S['RouteListResponse'], RouteListResponse>>,
  Expect<IsAssignable<S['RouteRow'], RouteRow>>,
  Expect<IsAssignable<S['ReplayTradesResponse'], ReplayTradesResponse>>,
  Expect<IsAssignable<S['ReportListResponse'], ReportListResponse>>,
  Expect<IsAssignable<S['SectorsResponse'], SectorsResponse>>,
  Expect<IsAssignable<S['SeedTradesOk'], SeedTradesOk>>,
  Expect<IsAssignable<S['SeedTradesUnavailable'], SeedTradesUnavailable>>,
  Expect<IsAssignable<S['SignalSeriesResponse'], SignalSeriesResponse>>,
  Expect<IsAssignable<S['SignalsResponse'], SignalsResponse>>,
  Expect<IsAssignable<S['SimilarResponse'], SimilarResponse>>,
  Expect<IsAssignable<S['StratEngineStateResponse'], StratEngineStateResponse>>,
  Expect<IsAssignable<S['StructureBriefResponse'], StructureBriefResponse>>,
  // ── renamed pairs (frontend name ↔ schema name) ─────────────────────
  Expect<IsAssignable<S['AvgVolumeResponse'], AvgVolume>>,
  Expect<IsAssignable<S['BacktestEquityResponse'], EquityResponse>>,
  Expect<IsAssignable<S['CoverageResponse'], CoverageResult>>,
  // Two consumers hand-type this endpoint (useInsights' direction slice,
  // DashboardPage's full brief) — both are wire claims, so both pair.
  Expect<IsAssignable<S['DashboardBriefResponse'], BriefDirection>>,
  Expect<IsAssignable<S['DashboardBriefResponse'], BriefResponse>>,
  Expect<IsAssignable<S['DataSourceRefreshResponse'], DataSourceRefreshResult>>,
  Expect<IsAssignable<S['ExpectedMove'], MovementExpectedMove>>,
  Expect<IsAssignable<S['GammaGridResponse'], GammaGridSummary>>,
  Expect<IsAssignable<S['IndicatorConfigResponse'], IndicatorConfig>>,
  Expect<IsAssignable<S['LiveHistoryResponse'], LiveHistory>>,
  Expect<IsAssignable<S['LiveQuoteResponse'], LiveQuote>>,
  Expect<IsAssignable<S['LiveStatusResponse'], LiveStatus>>,
  Expect<IsAssignable<S['MarketDataResponse'], MarketDataResponse>>,
  Expect<IsAssignable<S['MarketDatesResponse'], DatesResponse>>,
  Expect<IsAssignable<S['MarketHoursResponse'], MarketHours>>,
  Expect<IsAssignable<S['MovementStatementResponse'], MovementStatement>>,
  Expect<IsAssignable<S['OptionsChainResponse'], OptionsResponse>>,
  // `report` excluded: the schema declares it an open JSONB object, so the
  // hand-written `InsightReport` is a structural claim the schema cannot
  // check in either direction; the envelope's scalar half is what a
  // widening can silently break, and that half is fully paired.
  Expect<IsAssignable<Omit<S['ReportEnvelope'], 'report'>, Omit<InsightReportEnvelope, 'report'>>>,
  Expect<IsAssignable<S['RuntimeConfigResponse'], RuntimeConfig>>,
  Expect<IsAssignable<S['StratEnginePredictResponse'], StratPredictResponse>>,
  Expect<IsAssignable<S['TickerSearchResponse'], TickerSearchResult>>,
  Expect<IsAssignable<S['WatchlistAddResponse'], WatchlistAddResult>>,
  Expect<IsAssignable<S['WatchlistRemoveResponse'], WatchlistRemoveResult>>,
  Expect<IsAssignable<S['_TradeStats'], TradeStats>>,
];
