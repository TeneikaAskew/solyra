---
feat_id: FEAT-OPTION-001
req_ids: [REQ-DATA-001, REQ-UX-001]
issues: []
canvases: []
done_when:
  - "src/components/options/gammaPresentation.test.ts passes the tests 'renders an unavailable exposure total as the em-dash, never +0', 'keeps a reported zero exposure total as +0', 'renders an unavailable put/call ratio as the em-dash with no skew label', 'renders an unavailable strike price as the em-dash, never a dollar zero', 'reads the one-sided reason from the stocks PR 1916 chain, greeks, levels and grid', 'reads no one-sided reason from a payload without the stocks PR 1916 fields', 'names the missing side in words' and 'the empty greeks placeholder carries null, not zero, metrics', using typed fixtures and tests/fixtures/one-sided-gamma-producer-contract.json; each fails on main, where the helpers do not exist and ProfilesTab renders a null total as +0"
  - "tests/options/one-sided-chain.spec.ts passes: /options with the chain, greeks, levels and grid answered by page.route with the stocks PR 1916 one-sided payloads raises no page error; on the Profiles tab Total GEX, Total VEX, Max Pain, Put/Call OI, Gamma Flip and Gamma Balance each show the em-dash with an unavailable badge and no Positive, Negative or skew label, and a notice names the missing side; on the Gamma Map the heatmap names the missing side and a one-sided grid's Total VEX beside complete levels shows the em-dash with an unavailable badge; the spec saves profiles-calls-only-gex.png, profiles-calls-only-vex.png, profiles-puts-only.png, gamma-map-calls-only.png and gamma-map-one-sided-grid-total.png, and the same spec run against main fails on the TypeError from put_call_ratio.toFixed"
  - "npm run e2e -- tests/options --trace off passes, with tests/options/profiles-balance-flip.spec.ts expecting the em-dash where it expected -- for an absent Gamma Flip or Gamma Balance; tests/fixtures/stocks-openapi.json and every mock-mode payload are unchanged, so src/mocks/contract.test.ts still validates each mock against the vendored schema"
  - "The hand-written types accept both the current and the stocks PR 1916 payloads: OptionsMetrics total_gex, total_vex and put_call_ratio, GammaLevelsResponse total_gex and GammaGridSummary total_gex and total_vex are number | null; GreeksResponse and GammaLevelsResponse carry an optional reason; OptionsResponse carries optional chain_state, reason and metadata.sides_present; src/types/assignability.ts compiles against the vendored types"
  - "npm run build, npm test and npm run contract:check pass on the branch, and npm run lint reports no problem on the branch that origin/main does not (CI does not gate lint, which exits 1 on main)"
  - "node scripts/docs-audit.mjs reports no finding on the branch that origin/main does not, and python3 scripts/gate/spec_gate.py --pr origin/main is clean"
  - "The FEAT-OPTION-001 catalog row shows a current Status and Last reviewed and lists the PR"
status: approved
supersedes: null
---

# Null-safe Profiles tab for one-sided options chains (stocks PR 1916 consumer)

## Approval and scope

The owner wrote "Overcome all blockers" on 2026-11-17 in reply to the proposal to write this fix. The owner's existing
merge hold on stocks PR 1916 (comment 6941055870, 2026-11-17) requires it: "Before this backend merge: verify null-safe
Profiles rendering, explicit unavailable states rather than zero, candidate-matched contract/types, browser coverage and
compatible deployed consumer evidence." This spec is the solyra consumer half of that hold. It covers the null-safe
rendering, the explicit unavailable states, types that accept the candidate payloads, and hermetic browser coverage.
Deployed consumer evidence and the authorization of the stocks production migration stay with the owner, as the hold
says; nothing here deploys or claims the deployed site.

## Problem

Stocks PR 1916 (FEAT-OPTION-001, "partial options chains are unavailable through lib and every options route", head
`383eda8d13bc2b38a98014e64a3264af27b8f6cc`, stocks spec `docs/superpowers/specs/2026-11-05-feat-option-001-partial-chain-unavailable-api.md`)
stops fabricating zeros for a calls-only or puts-only chain. Its OpenAPI component hunks, from the PR body:

- `OptionsChainMetadata`: adds `sides_present` (`both` | `calls_only` | `puts_only`, required).
- `OptionsChainResponse`: adds `chain_state` (`available` | `unavailable`, required) and an optional `reason`.
- `OptionsMetrics`: `put_call_ratio`, `total_gex`, `total_vex` go from number to number or null (still required).
- `GreeksResponse`: adds an optional `reason` (`puts_missing`, `calls_missing`, `empty_chain` or `spot_unavailable`).
- `GammaLevelsResponse`: `total_gex` number or null, adds an optional `reason`.
- `GammaGridResponse`: `total_gex`, `total_vex` number or null.
- `GammaNodesResponse`: `total_gex`, `total_vex` number or null, adds an optional `reason`.

A one-sided levels, grid or nodes response reads `regime: "unknown"`, `total_gex: null` and `reason` `puts_missing` or
`calls_missing`, with empty levels or cells, the spot when it can still be estimated, and a warning naming the missing
side. The chain route keeps the rows and adds `chain_state: "unavailable"`.

Solyra main `30a46ab` does not handle that:

- `src/components/options/ProfilesTab.tsx:490-492` calls `metrics.put_call_ratio.toFixed(2)`. `useOptionsGreeks`
  (`src/hooks/useOptionsGreeks.ts:109`) is enabled whenever the chain is non-empty and a spot is known, so a one-sided
  chain reaches this line with `null` and the Profiles tab throws a TypeError.
- `ProfilesTab.tsx:309-312` and `480-482` pass a null total to the local `formatGEX`, which renders `+0` with a
  "Positive" label: an unavailable exposure shown as a measured flat one (Rule 4, REQ-DATA-001), and a neutral trading
  conclusion drawn from unknown data (REQ-UX-001).
- The types still declare the fields numeric: `src/hooks/useOptionsGreeks.ts:64-69`, `src/hooks/useGammaGrid.ts:69-70`,
  `src/hooks/useGammaLevels.ts:73`; `src/hooks/useOptionsChain.ts:6-13` has no `chain_state`, `reason` or
  `sides_present`. `EMPTY_GREEKS` (`useOptionsGreeks.ts:145-158`) holds zero totals and a zero ratio as a placeholder.
- `src/components/options/SwingMode.tsx:543` shows a one-sided grid's machine reason (`puts_missing`) as the heatmap's
  unavailable text, and its legend (`SwingMode.tsx:382-421`) shows a null Flip, Balance, Total GEX or Total VEX as a
  bare em-dash with no unavailable badge.

If stocks deploys PR 1916 before solyra handles this, the deployed Profiles tab crashes on any one-sided chain.

Every other reader of `put_call_ratio`, `total_gex`, `total_vex`, `gamma_balance`, `gamma_flip`, `regime`,
`sides_present` and `chain_state` under `src/` was checked on main `30a46ab`: `src/routes/ChartsPage.tsx:474-487` draws
the flip and balance lines only when non-null; `src/components/options/TrinityTab.tsx` reads only the level ladder,
which is empty for a one-sided chain, and shows its existing empty state; `ProfilesTab.tsx:274` and `504` hide an
`unknown` regime; `SwingMode.tsx` reads the regime and totals only from a levels response with levels or a grid with
cells, which a one-sided response never has, except the grid's `total_vex` beside complete levels (`SwingMode.tsx:771`).
`GammaNodesResponse` has no consumer. None of these needs a change beyond the ones in Design.

## Non-goals

- No change to `tests/fixtures/stocks-openapi.json`, `src/types/stocksOpenApi.gen.d.ts` or any mock-mode payload.
  `npm run contract:check` compares the vendored copy with stocks main, which does not hold PR 1916 yet, so vendoring
  its schema here would turn that check red. The contract sync (vendoring the PR 1916 schema, making `sides_present`
  and `chain_state` required in the hand types, nulling the totals of `MOCK_GRID_UNAVAILABLE` and
  `MOCK_NODES_UNAVAILABLE`, and pairing any newly typed schema in `src/types/assignability.ts`) is a separate change
  under its own spec after PR 1916 merges.
- No financial math: every value shown comes from the backend (Rule 5).
- No change to any hook's request, cache, retry or enable condition.
- No change to TrinityTab, ChartsPage or the dashboard's movement read beyond the shared badge moving module.
- No deployment and no claim about the deployed site.

## Approaches considered

1. Widen the hand types, render each null through pure presentation helpers as the em-dash with an unavailable badge,
   and name the missing side from the backend's own fields. Chosen: it accepts the payloads of stocks main and of
   PR 1916 alike, so solyra can ship first and the backend can merge after, which the hold asks for.
2. Vendor the PR 1916 schema now. Rejected: `contract:check` and CI fail against stocks main until PR 1916 merges.
3. Turn a one-sided response into a query error in the hooks. Rejected: the backend answers 200 with an explicit state
   and keeps the rows and spot; an error hides what the backend did return, and the error copy would be wrong.

## Design

Types (additive; accepted by both payloads):

- `useOptionsGreeks.ts`: `OptionsMetrics.total_gex`, `total_vex`, `put_call_ratio` become `number | null`;
  `GreeksResponse.reason?: string | null`; `EMPTY_GREEKS.metrics` holds `null` for the three, not `0`.
- `useGammaLevels.ts`: `GammaLevelsResponse.total_gex: number | null`, `reason?: string | null`.
- `useGammaGrid.ts`: `GammaGridSummary.total_gex` and `total_vex` become `number | null`.
- `useOptionsChain.ts`: `OptionsResponse` gains optional `chain_state` (`'available' | 'unavailable'`), `reason` and
  `metadata.sides_present` (`'both' | 'calls_only' | 'puts_only'`). Optional until the contract sync makes them
  required.

Presentation helpers, pure and unit-tested, in `src/components/options/gammaPresentation.ts` (the options
presentation module):

- `exposureTotalText(v)`: the backend number in the existing GEX notation (`src/lib/formatGex.ts`, which ProfilesTab's
  local copy duplicates), so a reported zero stays `+0`; the em-dash for null, undefined or a non-finite value.
- `exposureDirection(v)` and `putCallSkew(v)`: the existing Positive or Negative and Bearish or Bullish skew labels for
  a reported number, `undefined` (no label) for a missing one.
- `putCallRatioText(v)` and `strikePriceText(v, digits)`: two-decimal ratio or a dollar price, the em-dash otherwise;
  `reportedNumber(v)`: the backend number, or null when it reported none.
- `asPartialChainReason(reason)`, `summaryPartialChain(summary)` (regime `unknown`, `total_gex` null and reason
  `puts_missing` or `calls_missing`, the PR 1916 detection rule for levels, grid and nodes) and
  `chainUnavailableReason(chain)` (`chain_state` `unavailable` with its `reason`, or `sides_present` `calls_only` or
  `puts_only`). Each returns null for an older payload without the fields.
- `unavailableReasonText(reason)`: `puts_missing` reads "the stored chain has no put contracts", `calls_missing` "the
  stored chain has no call contracts", `empty_chain` and `spot_unavailable` likewise in words; any other reason is shown
  as sent; none reads "not reported by the backend".

Shared badge: `UnavailableBadge` moves unchanged from `src/components/dashboard/MovementRead.tsx` into
`src/components/primitives/index.tsx`, and MovementRead imports it from there (same markup, same
`data-testid="unavailable-badge"`). `MetricCard` (`src/components/shared/MetricCard.tsx`) gains an optional
`unavailableReason` (declared on `MetricCardData` in `src/types/index.ts`): when set, the card shows the badge under
its value, with the reason as its hover text. Other callers are unaffected.

ProfilesTab:

- Metrics bar (shown as today when greeks are available and a spot is known): Total GEX or VEX, Max Pain and
  Put/Call OI render through the helpers; a missing value shows the em-dash with the badge and no direction or skew
  label. The badge reason is the greeks `reason`, else the chain's.
- Gamma Flip and Gamma Balance show the em-dash in place of `--`, with the badge once the levels response has
  answered or failed (not while it loads).
- A notice (`role="status"`, labelled "Chain completeness") reads "Incomplete options chain: <reason in words>.
  Exposure totals, put/call ratio, max pain, gamma flip and gamma balance are unavailable for this snapshot, not
  zero." when the chain, the greeks or the levels report a one-sided chain. The levels warnings box keeps showing the
  backend's own warning.
- The VEX-mode note no longer claims a VEX total exists when `total_vex` is null.

SwingMode (Gamma Map):

- The heatmap's unavailable text passes its reason through `unavailableReasonText`, so `puts_missing` reads "Data
  unavailable: the stored chain has no put contracts"; other reasons show as today.
- The legend's Flip, Gamma Balance, Total GEX and Total VEX chips keep the em-dash in `.val` and add the badge beside
  it when null, with the reason of the response the value came from.

Tests:

- `tests/fixtures/one-sided-gamma-producer-contract.json`: the chain, levels, grid and greeks responses that the stocks
  PR 1916 head's own routers return for a calls-only and a puts-only synthetic chain (generated in-process with Cloud
  SQL replaced by the six-contract frame stocks' route tests use, as `distinct-gamma-producer-contract.json` was), with
  the backend pin and source hashes. Not market data.
- Vitest: the tests named in `done_when`, in `src/components/options/gammaPresentation.test.ts`.
- Playwright: `tests/options/one-sided-chain.spec.ts`, every `/api` call intercepted, the one-sided payloads registered
  with `page.route` inside the spec; it fails the run on any page error and saves the screenshots named in
  `done_when` with `page.screenshot` into `testInfo.outputPath`. The before state is the same spec run against main.
- `tests/options/profiles-balance-flip.spec.ts`: its two `--` expectations become the em-dash.

Capacity: n/a, solyra runs no workload; no request is added or changed.

## Risks

- A legitimately absent flip on a complete chain now shows the badge as well as the em-dash: the existing flip specs
  keep asserting the em-dash in `.val` and stay green (`done_when` item 3).
- The badge widens a legend chip: the options mobile-fit spec runs in item 3.
- Types stay optional for the new chain fields until the contract sync: the helpers read them as `unknown`, so an
  older payload without them takes the existing path (`done_when` item 1, "reads no one-sided reason ...").
- The fixture could drift from the merged backend: it records the PR 1916 head and source hashes; the contract sync
  after the merge re-checks the shapes against the vendored schema.
