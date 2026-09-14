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
  // ── renamed pairs (frontend name ↔ schema name) ─────────────────────
  Expect<IsAssignable<S['ExpectedMove'], MovementExpectedMove>>,
  Expect<IsAssignable<S['MovementStatementResponse'], MovementStatement>>,
];
