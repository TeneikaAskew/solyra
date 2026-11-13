---
feat_id: FEAT-INSIGHT-001
spec: docs/superpowers/specs/2026-11-13-feat-insight-001-user-watchlist-v2.md
branch: feature/feat-insight-001-user-watchlist
pr: null
status: ready
---

# Per-user watchlist (solyra) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Every task cites a spec section and the done_when item it advances (done_when[0] is the first item).

**Goal:** Solyra keeps each signed-in user's watchlist in its own Supabase project, shows the stocks default list read-only, ranks both together, and exposes the owner-free set of watched tickers to the stocks ingest job.

**Architecture:** Two tables (`watched_tickers`, one row per ticker with a small snapshot; `user_watchlists`, membership only) reached solely through two edge functions: `user-watchlist` (Firebase bearer verified against stocks `GET /api/me`, GET/POST/DELETE, snapshot refresh behind an atomic fenced claim) and `watched-tickers` (GET, shared read secret, distinct active tickers). The React side gains `useUserWatchlist` hooks, an `extras` option on the ranked `useWatchlist`, and two sections above the ranked panel in `WatchlistPanel`; the old stocks write hooks are deleted.

**Tech Stack:** Deno edge functions with `npm:@supabase/supabase-js@2` (service role), deno tests with injected `fetch` and store; React 19, TanStack Query, Vitest, Playwright (hermetic); the vendored stocks OpenAPI through `npm run contract:sync`.

**Spec:** `docs/superpowers/specs/2026-11-13-feat-insight-001-user-watchlist-v2.md` (approved; supersedes the 2026-11-13 user watchlist spec). Correction recorded in solyra#333: the no-bars staleness cutoff is the most recent *elapsed* 00:30 ET boundary, never a future instant; Task 4 implements it that way.

**Cross-repo order:** Tasks 1 to 11 need nothing from stocks. Task 12 (`npm run contract:sync`) needs the stocks lock stage A PR (spec `2026-11-13-feat-insight-001-watchlist-default-lock-a.md`, adds `GET /api/insights/watchlist/default`) on stocks main; until then `src/mocks/contract.test.ts` fails on the new `/api/insights/watchlist/default` literal, so the branch is not green and is not marked ready. The stocks 410 switch (stage B) ships only after this PR is deployed and the live site makes no call to the two write routes.

## Global Constraints

- No write to the stocks `watchlists` table from solyra, ever (§ Non-goals). After this PR nothing in `src/` requests `POST /api/insights/watchlist/add` or `DELETE /api/insights/watchlist/{ticker}` (done_when[5]).
- Identity is the Firebase ID token verified by stocks `GET /api/me`; `owner_uid` is the token's `sub`, `owner_email` the `/api/me` email, never a request-body value (§ Edge function, done_when[1]).
- The browser never holds a Supabase key with table access: both tables have row level security enabled and no policy; only the service role, inside the functions, reads or writes (§ Tables and migration).
- Rule 4: no fabricated empty list. Signed out is its own state; a stocks `/api/me` failure is 503 with a detail; a failed snapshot fetch stores nothing.
- Snapshot refresh constants, verbatim from the spec: refresh age 24 hours; claim lease 2 minutes; retry gap 10 minutes; at most 5 refreshes per GET; one 90-second deadline for the two stocks requests; ticker cap 200 on `watched-tickers`.
- Copy, verbatim: section title `Managed in Discord`; `data arrives after tonight's fetch`; `no data for this symbol`; `Nothing yet; add a ticker`; `Sign in to keep a watchlist`; combobox notice `Added to your watchlist`.
- No em or en dashes in code, copy or docs.
- `supabase/functions/_shared/cron-auth.ts` is a generated file ("Do not edit it directly"); it is read as the pattern, never modified.

## Review Focus

1. A POST ticker that is lower-case, padded, or not `^[A-Z0-9.]{1,10}$` after upper-casing: the function answers 400 with a detail, never a 500 from the table's check constraint. Pinned in Task 5.
2. A `/api/me` reply with an email but a token whose payload has no `sub`: 401, not a crash. Pinned in Task 5.
3. A coverage reply that has no entry for the ticker (a symbol stocks does not know): treated as no bars, so the row says "no data for this symbol" after a session rather than pretending data exists. Pinned in Task 4.
4. DELETE of a ticker not on the caller's active list: 200 with `removed: false` and the unchanged list, idempotent. Pinned in Task 5.
5. Clock edges in `lastIngestWindowStart`: 00:10 ET (yesterday's window), 00:31 ET (today's), and the DST change days 2026-03-08 and 2026-11-01, computed with the `America/New_York` zone, never a fixed offset. Pinned in Task 4.

---

### Task 1: Migration file and its structural test

Spec: § Tables and migration. Advances done_when[0].

**Files:**
- Create: `supabase/migrations/20261113000000_user_watchlists.sql`
- Create: `supabase/migrations/user_watchlists.sql.test.ts` (Vitest, `@vitest-environment node`)

**Interfaces:**
- Produces: tables `public.watched_tickers` and `public.user_watchlists` exactly as the spec's SQL block, plus the two partial indexes and the two `enable row level security` statements; no `create policy`. Column names later tasks rely on: `ticker, name, exchange, asset_type, coverage, snapshot_as_of, snapshot_claimed_at, snapshot_attempted_at, created_at` and `owner_uid, owner_email, ticker, added_at, removed_at, source`.

- [ ] **Step 1: Write the failing test** `user_watchlists.sql.test.ts`: reads the file with `readFileSync`, asserts it contains `create table public.watched_tickers`, `create table public.user_watchlists`, every column name above, `references public.watched_tickers(ticker)`, `primary key (owner_uid, ticker)`, two `enable row level security` lines, and does not contain `create policy`.
- [ ] **Step 2: Run** `npx vitest run supabase/migrations` and see it fail (file missing).
- [ ] **Step 3: Write the SQL** from the spec block verbatim (the `check (ticker = upper(ticker) and ticker ~ '^[A-Z0-9.]{1,10}$')` constraint, the two indexes, both `alter table ... enable row level security`, the "no policies" comment). Add `vitest.config` include for `supabase/migrations/**/*.test.ts` only if the current include pattern (`src/**/*.test.ts{,x}`) does not pick it up; otherwise place the test under `src/supabase/userWatchlistsMigration.test.ts` and read the file by relative path.
- [ ] **Step 4: Run** the test and see it pass.
- [ ] **Step 5: Record the owner's step in the PR body** as the unticked line of done_when[0]: the owner applies the file to project `hajmcfkqmtgidstpggrh` (SQL editor or `supabase db push`) and pastes the output and the dashboard's row level security status for both tables before the PR is marked ready. Note for the owner: the repo's existing tables were created through Drizzle (`drizzle/migrations/0000_create_insight_research_workspace.sql`, `drizzle.config.ts`); this file follows the spec's `supabase/migrations/` decision and is not added to the Drizzle journal.
- [ ] **Step 6: Commit** `feat(watchlist): add user_watchlists and watched_tickers migration`

### Task 2: Deno test runner and the store interface

Spec: § Edge function `user-watchlist`, § Risks (deno tests in CI). Advances done_when[1].

**Files:**
- Create: `supabase/functions/deno.json` (`{"tasks": {"test": "deno test --allow-env --no-check=remote ."}}`)
- Create: `supabase/functions/user-watchlist/store.ts`
- Create: `supabase/functions/user-watchlist/store_memory.ts`
- Create: `supabase/functions/user-watchlist/store_memory_test.ts`
- Modify: `.github/workflows/ci.yml` (after the `npm run contract:check` step, lines 81-91 today): `uses: denoland/setup-deno@v2` with `deno-version: v2.x`, then `run: cd supabase/functions && deno task test`. The runner's egress is unrestricted, so `npm:` imports resolve; tests themselves open no socket.

**Interfaces:**
- Produces (store.ts):
  ```ts
  export interface CoverageFlags { intraday: boolean; daily: boolean }
  export interface CoverageResponse { coverage: Record<string, CoverageFlags> }
  export interface TickerRow { ticker: string; name: string | null; exchange: string | null; asset_type: string | null;
    coverage: CoverageResponse | null; snapshot_as_of: string | null; snapshot_claimed_at: string | null;
    snapshot_attempted_at: string | null; created_at: string }
  export interface MembershipRow { ticker: string; added_at: string; source: string | null }
  export type ActiveRow = MembershipRow & TickerRow
  export interface Snapshot { name: string | null; exchange: string | null; asset_type: string | null; coverage: CoverageResponse }
  export interface Store {
    ensureTicker(ticker: string): Promise<void>                                   // insert ... on conflict do nothing
    getTicker(ticker: string): Promise<TickerRow | null>
    listActive(uid: string): Promise<ActiveRow[]>                                 // the GET join, added_at ascending
    claimSnapshot(ticker: string, staleBefore: Date, now: Date): Promise<string | null>   // the spec's update ... returning; ISO claimed_at or null
    completeSnapshot(ticker: string, claimedAt: string, snap: Snapshot, now: Date): Promise<boolean>  // fenced on claimedAt; false = no row matched
    releaseClaim(ticker: string, claimedAt: string): Promise<boolean>             // fenced; clears snapshot_claimed_at only
    upsertMembership(uid: string, email: string, ticker: string, source: string | null, now: Date): Promise<void>  // clears removed_at on re-add
    removeMembership(uid: string, ticker: string, now: Date): Promise<boolean>    // false when no active row
  }
  ```
- Produces (store_memory.ts): `export function memoryStore(): Store & { rows: Map<string, TickerRow>; memberships: Map<string, MembershipRow & { owner_uid: string; owner_email: string; removed_at: string | null }> }` implementing the predicates exactly (claim: `snapshot_as_of` null or `< staleBefore`, and `snapshot_claimed_at` null or older than 2 minutes before `now`; stamps `snapshot_attempted_at = now` on every successful claim).

- [ ] **Step 1: Write failing tests** in `store_memory_test.ts` (`Deno.test`): a claim on a fresh row returns an ISO string and stamps `snapshot_attempted_at`; a second claim within 2 minutes returns null; a claim after 2 minutes returns a new value; `completeSnapshot` with a stale `claimedAt` returns false and changes nothing; `removeMembership` twice returns true then false.
- [ ] **Step 2: Run** `cd supabase/functions && deno task test` and see it fail (modules missing).
- [ ] **Step 3: Implement** `store.ts` (types only) and `store_memory.ts`.
- [ ] **Step 4: Run** the tests and see them pass.
- [ ] **Step 5: Add the CI step** and run `act` or confirm by reading the workflow that the step runs after `contract:check`.
- [ ] **Step 6: Commit** `feat(watchlist): store interface, in-memory store and deno test runner`

### Task 3: Production store on PostgREST

Spec: § Edge function `user-watchlist` (the SQL statements). Advances done_when[1].

**Files:**
- Create: `supabase/functions/user-watchlist/store_postgrest.ts`
- Create: `supabase/functions/user-watchlist/store_postgrest_test.ts`

**Interfaces:**
- Consumes: `Store` from Task 2.
- Produces: `export function postgrestStore(db: SupabaseClient): Store`, built with `createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')` by the caller, as `insights-research/index.ts:332` does.

- [ ] **Step 1: Write failing tests** with a recording fake `SupabaseClient` (an object whose `from()` returns a chainable recorder): `claimSnapshot('AAPL', staleBefore, now)` issues `update({snapshot_claimed_at: now, snapshot_attempted_at: now}).eq('ticker','AAPL').or('snapshot_as_of.is.null,snapshot_as_of.lt.<staleBefore ISO>').or('snapshot_claimed_at.is.null,snapshot_claimed_at.lt.<now minus 2 min ISO>').select('snapshot_claimed_at')` and returns the row's value or null on an empty array; `completeSnapshot` and `releaseClaim` issue `.eq('ticker', t).eq('snapshot_claimed_at', claimedAt)` and return `rows.length === 1`; `listActive(uid)` selects `ticker, added_at, source, watched_tickers(name, exchange, asset_type, coverage, snapshot_as_of, snapshot_claimed_at, snapshot_attempted_at, created_at)` from `user_watchlists` with `.eq('owner_uid', uid).is('removed_at', null).order('added_at')` and flattens the embed; a PostgREST error object makes every method throw (never an empty result).
- [ ] **Step 2: Run** the tests and see them fail.
- [ ] **Step 3: Implement** `store_postgrest.ts`. `upsertMembership` uses `.upsert({owner_uid, owner_email, ticker, source, added_at: now, removed_at: null}, {onConflict: 'owner_uid,ticker'})`; `ensureTicker` uses `.upsert({ticker}, {onConflict: 'ticker', ignoreDuplicates: true})`.
- [ ] **Step 4: Run** the tests and see them pass.
- [ ] **Step 5: Commit** `feat(watchlist): PostgREST store for the user-watchlist function`

### Task 4: Staleness, candidates and the fenced refresh

Spec: § Edge function `user-watchlist` (GET refresh, POST claim, deadline, fence), solyra#333. Advances done_when[1].

**Files:**
- Create: `supabase/functions/user-watchlist/snapshot.ts`
- Create: `supabase/functions/user-watchlist/snapshot_test.ts`

**Interfaces:**
- Consumes: `Store`, `TickerRow`, `ActiveRow`, `Snapshot`, `CoverageResponse` from Task 2.
- Produces:
  ```ts
  export const REFRESH_AGE_MS = 24 * 60 * 60 * 1000, LEASE_MS = 2 * 60 * 1000, RETRY_GAP_MS = 10 * 60 * 1000,
               DEADLINE_MS = 90 * 1000, MAX_REFRESH_PER_LIST = 5
  export function lastIngestWindowStart(now: Date): Date      // most recent elapsed 00:30 America/New_York (solyra#333)
  export function reportsNoBars(coverage: CoverageResponse | null, ticker: string): boolean   // daily === false, or no entry for the ticker
  export function staleBefore(row: TickerRow, now: Date): Date  // null snapshot: now; no bars: lastIngestWindowStart(now); else now minus REFRESH_AGE_MS
  export function isStale(row: TickerRow, now: Date): boolean
  export function pickRefreshCandidates(rows: ActiveRow[], now: Date): ActiveRow[]  // stale, not attempted within RETRY_GAP_MS, ordered snapshot_attempted_at nulls first then added_at, first MAX_REFRESH_PER_LIST
  export interface RefreshDeps { store: Store; fetch: typeof fetch; stocksApi: string; now: () => Date; log: (event: string, fields: Record<string, unknown>) => void }
  export async function refreshIfStale(deps: RefreshDeps, ticker: string, authorization: string): Promise<'stored' | 'failed' | 'claim_lost' | 'not_claimed'>
  ```
  `refreshIfStale` reads the row, computes `staleBefore`, calls `store.claimSnapshot`; on a claim it fetches `${stocksApi}/api/insights/ticker/${ticker}/info` and `${stocksApi}/api/market/coverage?symbols=${ticker}` with the caller's `Authorization` header under one `AbortSignal.timeout(DEADLINE_MS)`; both 200 → `completeSnapshot` (`'stored'`, or `'claim_lost'` when it returns false, logged as `claim_lost`); any non-200, thrown fetch or abort → `releaseClaim` (`'failed'`).

- [ ] **Step 1: Write failing tests**: `lastIngestWindowStart` at 2026-11-13T05:10:00Z (00:10 ET) is 2026-11-12T05:30:00Z, at 2026-11-13T05:31:00Z is 2026-11-13T05:30:00Z, and on 2026-03-08 and 2026-11-01 (DST changes) uses the named zone offsets; `reportsNoBars` true for `daily: false` and for a missing key, false for `daily: true`; `staleBefore` on a no-bars snapshot younger than 24 hours taken before the window returns the window start (so the row is stale); `pickRefreshCandidates` with eight stale rows returns five, skips a row attempted 3 minutes ago, orders nulls first then `added_at`; `refreshIfStale` with the memory store and a fake `fetch`: two 200s store the snapshot and clear the claim; a non-200 stores nothing and releases; a fetch that resolves after the lease, with a second claim taken in between, returns `'claim_lost'` and leaves the second claim and the newer snapshot untouched; a 200 at 00:10 ET on a snapshot stamped 00:09:30 ET returns `'not_claimed'` (no fetch).
- [ ] **Step 2: Run** `deno task test` and see them fail.
- [ ] **Step 3: Implement** `snapshot.ts`. `lastIngestWindowStart`: format `now` in `America/New_York` with `Intl.DateTimeFormat` to get the local date, build 00:30 of that date in the zone (search the UTC instant whose zoned time is 00:30, or use the zone's offset from `formatToParts` with `timeZoneName: 'longOffset'`), and subtract one day when `now` is before it.
- [ ] **Step 4: Run** the tests and see them pass.
- [ ] **Step 5: Commit** `feat(watchlist): staleness rule, fair candidate pick and fenced snapshot refresh`

### Task 5: The `user-watchlist` handler

Spec: § Edge function `user-watchlist`. Advances done_when[1].

**Files:**
- Create: `supabase/functions/user-watchlist/index.ts`
- Create: `supabase/functions/user-watchlist/index_test.ts`
- Modify: `supabase/config.toml` (append `[functions.user-watchlist]` with `verify_jwt = false`)

**Interfaces:**
- Consumes: Tasks 2 to 4.
- Produces:
  ```ts
  export interface HandlerDeps extends RefreshDeps {}
  export type Identity = { uid: string; email: string; authorization: string }
  export async function identity(req: Request, deps: Pick<HandlerDeps, 'fetch' | 'stocksApi'>): Promise<Identity | 'unauthorized' | 'unavailable'>
  export async function handleRequest(req: Request, deps: HandlerDeps): Promise<Response>
  export interface UserWatchlistRow { ticker: string; added_at: string; source: string | null; name: string | null; exchange: string | null; asset_type: string | null; coverage: CoverageResponse | null; snapshot_as_of: string | null; created_at: string }
  export interface UserWatchlistResponse { owner_email: string; as_of: string; tickers: UserWatchlistRow[]; removed?: boolean }
  ```
  Routing: `OPTIONS` → `ok` with `corsHeaders` (from `npm:@supabase/supabase-js@2/cors`, as `insights-research` does); `GET` → list after `refreshIfStale` over `pickRefreshCandidates`; `POST` with JSON `{ticker, source?}` → validate, `ensureTicker`, `refreshIfStale`, `upsertMembership`, list; `DELETE` with JSON `{ticker}` → `removeMembership`, list plus `removed`; other methods 405. Errors are `{error: string}`: 401 `Sign in to keep a watchlist.`, 503 `The stocks API is unavailable; try again shortly.` when `/api/me` throws or answers 5xx, 400 `Ticker must be 1 to 10 letters, digits or dots.` The module ends with `Deno.serve((req) => handleRequest(req, productionDeps()))` where `productionDeps()` builds `postgrestStore(createClient(...))`, `globalThis.fetch`, `STOCKS_API = 'https://solyra-api-staging-5sjtb3yl7a-ue.a.run.app'` (the constant `insights-research/index.ts:7` uses) and `console.log` JSON lines.

- [ ] **Step 1: Write failing tests** (fake `fetch` keyed by URL; memory store): no token → 401; `/api/me` 401 → 401; `/api/me` 500 or thrown → 503 with `{error}`; token without `sub` → 401; add then list then remove round trip for uid A; uid B lists nothing of A; duplicate add idempotent (one membership row); same ticker for A and B → one `watched_tickers` row, two memberships, one info fetch and one coverage fetch; two adds of a new ticker started before either finishes → one snapshot fetch pair; non-200 coverage → `coverage` and `snapshot_as_of` null, claim cleared; add, coverage mock flips from `{daily:false}` to `{daily:true}`, list without another add → refreshed coverage, including the case of a non-null no-bars snapshot younger than 24 hours taken before the window; eight stale rows → five refreshed on one list; second list after five non-200 refreshes → the next five; `removed: false` for a ticker not on the list; lower-case `aapl` is stored as `AAPL`; `aa pl` → 400; response has `owner_email`, `as_of` and `tickers` with the `UserWatchlistRow` fields.
- [ ] **Step 2: Run** `deno task test` and see them fail.
- [ ] **Step 3: Implement** `index.ts`; `identity` mirrors `insights-research/index.ts:63-81` (`decodeSubject` copied, the `Authorization` header forwarded to `${stocksApi}/api/me`), extended with the `'unavailable'` branch for a thrown fetch or a 5xx.
- [ ] **Step 4: Run** the tests and see them pass; run `deno check supabase/functions/user-watchlist/index.ts`.
- [ ] **Step 5: Commit** `feat(watchlist): user-watchlist edge function`

### Task 6: The `watched-tickers` function

Spec: § Function `watched-tickers`. Advances done_when[2].

**Files:**
- Create: `supabase/functions/watched-tickers/auth.ts`
- Create: `supabase/functions/watched-tickers/index.ts`
- Create: `supabase/functions/watched-tickers/index_test.ts`
- Modify: `supabase/config.toml` (append `[functions.watched-tickers]` with `verify_jwt = false`)

**Interfaces:**
- Produces:
  ```ts
  // auth.ts, the cron-auth.ts pattern re-typed for two env names (that file is generated and stays untouched)
  export function authenticateReadSecret(req: Request, env: { get(name: string): string | undefined }): Response | null
  // index.ts
  export interface WatchedTickersDeps { distinctActiveTickers(limit: number): Promise<string[]>; env: { get(name: string): string | undefined }; now: () => Date }
  export interface WatchedTickersResponse { as_of: string; count: number; truncated: boolean; tickers: string[] }
  export const WATCHED_TICKERS_CAP = 200
  export async function handleRequest(req: Request, deps: WatchedTickersDeps): Promise<Response>
  ```
  `authenticateReadSecret`: reads `WATCHED_TICKERS_READ_SECRET` (unset → 500 `Server configuration error`) and `WATCHED_TICKERS_READ_SECRET_PREVIOUS`; parses `/^Bearer ([^\s,]+)$/`; SHA-256 digests compared with `timingSafeEqual` from `node:crypto` against both; 401 `Unauthorized` otherwise; `null` means accepted. Production `distinctActiveTickers(limit)` queries `watched_tickers` with `select('ticker, created_at, user_watchlists!inner(ticker)').is('user_watchlists.removed_at', null).order('created_at').limit(limit)`; `handleRequest` asks for `WATCHED_TICKERS_CAP + 1`, sets `truncated` when more came back, and slices to the cap.

- [ ] **Step 1: Write failing tests**: GET without token → 401 and no store call; wrong token → 401; unset secret → 500 and no store call; previous secret accepted; POST → 405; happy path returns `{as_of, count, truncated: false, tickers}` in `created_at` order with no owner, email or membership key (assert `Object.keys` exactly); 201 tickers → `count: 200`, `truncated: true`.
- [ ] **Step 2: Run** `deno task test` and see them fail.
- [ ] **Step 3: Implement** `auth.ts` and `index.ts`; `Deno.serve` with the service-role client as in Task 5.
- [ ] **Step 4: Run** the tests and see them pass.
- [ ] **Step 5: Commit** `feat(watchlist): watched-tickers function with shared read secret`

### Task 7: Function URL helper and the `useUserWatchlist` hooks

Spec: § Hooks. Advances done_when[3].

**Files:**
- Modify: `src/lib/researchServiceConfig.ts` (lines 11-37: keep `researchServiceConfig`; add the helper below)
- Modify: `src/types/watchlist.ts` (add `UserWatchlistRow`, `UserWatchlistResponse`, `UserWatchlistRemoveResponse`)
- Create: `src/hooks/useUserWatchlist.ts`
- Create: `src/hooks/useUserWatchlist.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // researchServiceConfig.ts
  export type EdgeFunctionName = 'insights-research' | 'user-watchlist' | 'watched-tickers'
  export function edgeFunctionUrl(env: ResearchConfigEnv, name: EdgeFunctionName): string   // same base and validation as researchServiceConfig
  // useUserWatchlist.ts
  export const USER_WATCHLIST_KEY = ['me', 'watchlist'] as const
  export function useUserWatchlist(): { query: UseQueryResult<UserWatchlistResponse, Error>; signedOut: boolean; activeTickers: string[] }
  export function useAddUserTicker(): UseMutationResult<UserWatchlistResponse, Error, { ticker: string; source: 'ui' | 'combobox-auto-add' }>
  export function useRemoveUserTicker(): UseMutationResult<UserWatchlistRemoveResponse, Error, string>
  ```
  Each call: `getIdToken()` from `@/lib/firebase` (the `useInsightsLovable.ts:7-27` pattern), `Authorization: Bearer <token>`, `apikey: publishableKey`, JSON body for POST and DELETE; a non-OK response throws `Error(payload.error ?? 'Watchlist service <status>')`. `signedOut` is `!isSignedIn` from `useUser()` and disables the query (no empty-list placeholder). Mutations `invalidateQueries({queryKey: USER_WATCHLIST_KEY})` and `invalidateQueries({queryKey: ['watchlist']})`.

- [ ] **Step 1: Write failing tests** (Vitest, `QueryClientProvider`, mocked `fetch` and `getIdToken`): list success renders the rows; a 503 surfaces as `query.isError` with the function's detail and `query.data` undefined; signed out → `signedOut === true` and no fetch; add posts `{ticker, source}` with the bearer and invalidates both keys (spy on `QueryClient.invalidateQueries`).
- [ ] **Step 2: Run** `npx vitest run src/hooks/useUserWatchlist.test.tsx` and see it fail.
- [ ] **Step 3: Implement** the helper, the types and the hooks.
- [ ] **Step 4: Run** the tests and see them pass; `npx tsc -b`.
- [ ] **Step 5: Commit** `feat(watchlist): useUserWatchlist hooks against the user-watchlist function`

### Task 8: `extras` on the ranked `useWatchlist`

Spec: § Hooks (`useWatchlist` gains `extras`). Advances done_when[4].

**Files:**
- Modify: `src/hooks/useWatchlist.ts` (opts at line 14, key at line 25)
- Create: `src/hooks/useWatchlist.extras.test.tsx`

**Interfaces:**
- Produces: `UseWatchlistOpts.extras?: string[]`; `export function normalizeExtras(extras: string[] | undefined): string` (upper-case, trim, drop empties, dedupe, sort, join with `,`); query key `['watchlist', filterStr, limit, extrasKey]`; `extras` query parameter sent only when non-empty.

- [ ] **Step 1: Write failing tests**: `normalizeExtras(['nvda', ' AAPL', 'NVDA'])` is `'AAPL,NVDA'`; a component rendering `useWatchlist({extras})` with `extras` changing from `[]` to `['NVDA']` after a delayed membership makes two requests, the second with `extras=NVDA` (count `fetch` calls on `/api/insights/watchlist`).
- [ ] **Step 2: Run** the test and see it fail.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the test and the existing `useWatchlist` consumers' tests (`npx vitest run src/hooks src/components/insights`) and see them pass.
- [ ] **Step 5: Commit** `feat(watchlist): rank the user's tickers through extras with the list in the query key`

### Task 9: Default-list section and My watchlist section

Spec: § UI. Advances done_when[4].

**Files:**
- Create: `src/components/insights/DefaultWatchlistSection.tsx`
- Create: `src/components/insights/MyWatchlistSection.tsx`
- Create: `src/components/insights/watchlistCopy.ts` (`export function dataStateCopy(row: UserWatchlistRow, now: Date): 'data arrives after tonight\'s fetch' | 'no data for this symbol' | null`)
- Create: `src/components/insights/watchlistCopy.test.ts`
- Modify: `src/components/insights/WatchlistPanel.tsx` (render the two sections above the filter bar, lines 64-219; pass `extras: activeTickers` to `useWatchlist` at line 79)
- Modify: `src/hooks/useUserWatchlist.ts` (add `useDefaultWatchlist(): UseQueryResult<WatchlistDefaultResponse, Error>`, key `['watchlist', 'default']`, `fetch('/api/insights/watchlist/default')` through the ordinary relative fetch)
- Modify: `src/types/watchlist.ts` (add `WatchlistDefaultResponse`; until Task 12 regenerates the types it is a hand-written interface `{ as_of: string; owner: 'default'; rows: Array<{ ticker: string; in_brief: boolean; in_insight: boolean; signals: boolean; source: string | null; added_at: string }> }`; Task 12 replaces it with the generated type)

**Interfaces:**
- Consumes: Tasks 7 and 8.
- Produces: `DefaultWatchlistSection()` renders the heading `Managed in Discord`, one chip per row with badges `brief`, `insight`, `signals` for the true flags, the `as_of` time, the copy `Changed in Discord with /watchlist add and /watchlist remove`, and no button; `MyWatchlistSection({ onSelectTicker })` renders each active row with its `dataStateCopy` and a remove button (`aria-label` `Remove {ticker} from my watchlist`, `data-testid="my-watchlist-remove-{ticker}"`), the existing `TickerSearchPanel` for adds (its `useAddToWatchlist()` at line 252 becomes `useAddUserTicker()` with `source: 'ui'`), and the states `Nothing yet; add a ticker`, `Sign in to keep a watchlist`, and the function's error detail verbatim.
  `dataStateCopy`: `null` when `coverage` reports `daily: true`; `data arrives after tonight's fetch` while `created_at` is less than one trading session old (use `lastIngestWindowStart`'s rule: created after the most recent elapsed 00:30 ET boundary); `no data for this symbol` otherwise when the coverage snapshot reports no bars.

- [ ] **Step 1: Write failing tests**: `watchlistCopy.test.ts` for the three outcomes at fixed instants; a Vitest render of `WatchlistPanel` with mocked hooks asserting the heading, no button inside the default section, the remove button per row, the signed-out copy, and the error copy.
- [ ] **Step 2: Run** them and see them fail.
- [ ] **Step 3: Implement** the three components and the panel changes.
- [ ] **Step 4: Run** them and `npx tsc -b`; see them pass.
- [ ] **Step 5: Commit** `feat(watchlist): default list read-only and my watchlist with remove`

### Task 10: TickerCombobox auto-add and deletion of the stocks write hooks

Spec: § UI (TickerCombobox), § Non-goals. Advances done_when[5].

**Files:**
- Modify: `src/components/shared/TickerCombobox.tsx` (line 161 `useAddToWatchlist()` → `useAddUserTicker()`; `choose()` at 258-290 posts `{ticker: upper, source: 'combobox-auto-add'}`; notice text `Added to your watchlist` followed by the row's `dataStateCopy`; error notice `couldn't add ${upper} to your watchlist, ${err.message}` unchanged in shape)
- Modify: `src/hooks/useTickerSearch.ts` (delete `useAddToWatchlist` 101-125, `useRemoveFromWatchlist` 137-147, `WatchlistAddResult` 36-44, `WatchlistRemoveResult` 131-135)
- Modify: `tests/dashboard/ticker-combobox.spec.ts` (route the function URL, assert the new notice)
- Modify: `src/mocks/contract.test.ts` (remove the `'POST /api/insights/watchlist/add': { ticker: 'AAPL' }` sample, lines ~680-700)

- [ ] **Step 1: Run** `grep -rn "insights/watchlist/add\|useAddToWatchlist\|useRemoveFromWatchlist" src tests` and list every site; the only remaining mention after this task is the spec.
- [ ] **Step 2: Update** the combobox and delete the hooks; fix the Playwright spec's expectations.
- [ ] **Step 3: Run** `npx tsc -b && npx vitest run && npm run e2e -- tests/dashboard/ticker-combobox.spec.ts --trace off`; see them pass.
- [ ] **Step 4: Commit** `feat(watchlist): combobox adds to the user's list; delete the stocks write hooks`

### Task 11: Hermetic Playwright coverage

Spec: § UI, done_when[4] (`tests/insights/watchlist.spec.ts`). Advances done_when[4].

**Files:**
- Modify: `tests/helpers/fixtures/insights.ts` (add `mockUserWatchlistFunction(page, initial: UserWatchlistRow[])` routing `**/functions/v1/user-watchlist*` with an in-memory list that answers GET, POST and DELETE; add `mockDefaultWatchlist(page, body = MOCK_WATCHLIST_DEFAULT)` routing `**/api/insights/watchlist/default`, registered after `mockCommon` so it wins over the `**/api/insights/watchlist*` glob)
- Create: `tests/insights/watchlist.spec.ts`
- Modify: `src/mocks/insights.ts` (add `MOCK_WATCHLIST_DEFAULT` with SPY, QQQ, IWM, all three flags true, source `seed`; `satisfies WatchlistDefaultResponse`)

- [ ] **Step 1: Write the spec** with the signed-in pattern of `tests/ai-insights-lovable/workspace-integration.spec.ts:31-47`: the read-only section shows three chips and no button; add `NVDA` through the search and see the row (screenshot before and after, `testInfo.outputPath('my-watchlist-before-add.png')` and `...-after-add.png`); remove it (screenshots before and after); signed-out state shows `Sign in to keep a watchlist`; a 503 from the function shows its detail.
- [ ] **Step 2: Run** `npm run e2e -- tests/insights/watchlist.spec.ts --trace off`; see it pass.
- [ ] **Step 3: Commit** `test(watchlist): hermetic coverage of the default list, add and remove`

### Task 12: Contract sync (after stocks lock stage A is on main)

Spec: § Contract sync. Advances done_when[5].

**Files:**
- Modify: `tests/fixtures/stocks-openapi.json`, `src/types/stocksOpenApi.gen.d.ts` (regenerated)
- Modify: `src/types/watchlist.ts` (`WatchlistDefaultResponse` becomes `paths['/api/insights/watchlist/default']['get']['responses']['200']['content']['application/json']`)
- Modify: `src/mocks/index.ts` (resolve `/api/insights/watchlist/default` to `MOCK_WATCHLIST_DEFAULT` so the contract test validates it)

- [ ] **Step 1: Confirm** the stocks lock stage A PR is merged (its body lists the one operation added).
- [ ] **Step 2: Run** `npm run contract:sync`; see the default operation appear in the fixture.
- [ ] **Step 3: Run** `npx vitest run src/mocks/contract.test.ts`; expected PASS (the two write operations are no longer requested, the default operation is declared and its mock validates).
- [ ] **Step 4: Commit** `chore(contract): sync the stocks OpenAPI for the default watchlist endpoint`

### Task 13: Close

Spec: § Done when. Closes done_when[6].

- [ ] Update the FEAT-INSIGHT-001 row of `docs/product/02-FEATURE-CATALOG.md` (line 39): Status, Last reviewed, and append this PR to PRs.
- [ ] `node scripts/docs-audit.mjs --check` on the branch and on `origin/main`: no new finding.
- [ ] `npx tsc -b && npx vitest run && npm run build && npm run e2e -- --trace off`: all green.
- [ ] `python3 scripts/gate/spec_gate.py --pr origin/main`: ok.
- [ ] Tick every done_when line in the PR body with its evidence; done_when[0]'s owner step (migration applied, row level security status) is pasted by the owner before the PR is marked ready.
