---
feat_id: FEAT-CATALYST-001
req_ids: [REQ-DATA-001, REQ-DATA-002, REQ-DATA-003, REQ-DATA-004, REQ-REL-001]
issues: []
canvases: []
done_when:
  - "tests/catalysts/earnings-history.spec.ts exercises the actual existing /catalysts page and selected ticker through the earnings history and ticker-lean endpoints, with a qualified positive response and visible historical summary and event rows"
  - "src/components/catalysts/EarningsHistory.test.tsx and tests/catalysts/earnings-history.spec.ts preserve backend percentages, denominators, native five-day sustain, separate closing-step/gap-fill outcomes, maturity, censoring and unavailable states without client financial recomputation"
  - "tests/catalysts/earnings-history.spec.ts verifies signed-out gating, 401/403/404/503 and malformed responses, missing additive fields, ticker/account changes and late responses without stale-other-ticker display or fabricated financial defaults"
  - "The actual stocks API serialization tests are linked; the vendored OpenAPI snapshot, frontend types, contract fixtures and request parameters agree with the merged backend contract, and contract checks, unit tests, build and affected hermetic browser tests pass"
  - "The changed-screen hermetic tests retain screenshots and a deployed earnings-history.cloud.spec.ts is prepared for owner-run post-deployment verification against the same API responses, without describing mocked screenshots as GCP integration proof"
  - "The FEAT-CATALYST-001 catalog row and PR record are updated, branch/main docs audit has no new findings, normal spec gates and required current-head review/checks pass, and implementation versus deployment/UI closeout remains explicit"
status: approved
supersedes: null
---

# Earnings history in the existing app

## Approval and scope

This formalizes the already approved 15:47 end-to-end integration plan and the
bounded-finish authority. The owner explicitly required the repaired earnings
engine to reach an actual screen in the existing app, and the coordinating parent
expressly admitted preparation and publication of this minimal Solyra contract.
Approval concerns this API-to-screen binding, not an assertion that implementation,
backend deployment or browser acceptance has passed. This spec must land on MAIN
before its matching ready implementation plan and CODE branch open.

The existing catalog row is `FEAT-CATALYST-001 | Earnings / catalysts | Events,
reactions, news, filings | /catalysts | /api/catalysts, /api/earnings`. Extend that
existing page with a selected-ticker earnings-history section inside its existing
data gate. Keep the current calendar/news timeline, navigation and API-origin/auth
infrastructure. This is not another app or production pipeline.

## Evidence and dependencies

At Solyra MAIN `30ba20568f2ad46d353043592244a1c225b211de`,
`src/routes/CatalystsPage.tsx` requests `/api/catalysts/events` and
`/api/catalysts/types`; its Earnings labels identify feed event types. This is not
evidence of a reactions API consumer. Its SHA-256 is
`b1acb330cfc401f7450eb2e3fe7e4180e4ce07012d54970b0cc37dfb0733fd29`.
The MAIN spec inventory contains no FEAT-CATALYST-001 frontend contract.

The authoritative financial contract is stocks
`docs/superpowers/specs/2026-10-24-feat-catalyst-001-event-bound-reaction-integration.md`,
merged by stocks PR1593 at `d30c1e4de48236dbfd26dd0b7db48e72ee3936fd`.
Its implementation is stocks PR1608; a proposed or mocked payload is not evidence
that the backend has merged or deployed. Before final CODE acceptance, bind types
and fixtures to the actual merged router/serialization tests and OpenAPI snapshot.
Preserve upstream timing, maturity, provenance and financial-definition findings;
this frontend change does not repair them by relabeling values.

## Selected approach

Consume the existing earnings endpoints in the existing `/catalysts` app. A separate
route/application is unnecessary; a client-side reaction calculator would duplicate
the source of truth. The page may mount a focused `EarningsHistory` component to
keep data access and rendering separate from its existing timeline. Use the existing
selected-ticker store and data/auth gate, not a new symbol source or authentication
mechanism. No new GCP job, endpoint, table, provider request or financial rule is
introduced by this frontend contract.

## API and display contract

For one selected ticker, fetch only these existing operations through the existing
same-origin `fetch`/`authedFetch` path:

- `GET /api/earnings/history/{ticker}?limit=20`: bounded stored event rows.
- `GET /api/earnings/ticker/{ticker}/lean`: current ticker context, including the
  additive `daily_path_summary_v1` when available.

Use TanStack Query deduplication, account/ticker-specific keys, abort signals and a
bounded stale time; no polling, automatic retry loop or new market-data fan-out.
Mount the new hooks within the existing data gate so signed-out users do not make
these earnings requests. Preserve existing global API origin and token handling.

Lead with server-provided historical percentages, named metric and denominator.
`historical_direction_consistency_pct` and
`historical_upward_opening_gap_pct` are descriptive percentages, not forecast
confidence. Use the server's qualified native sample count; show coverage counts
separately. The summary is the server's current latest-at-most-12 mature historical
context, not a forecast made before a selected past event. Do not recompute it from
the displayed 20 stored rows or assert that those rows equal its admitted cohort.
Consume `daily_path_summary_v1.events` as the server's actual cohort identity/list;
do not invent IDs or substitute the visible history rows. Native classification or
lean, if returned, is secondary technical context, not a buy probability.

Each event retains its ticker, fiscal/report identity and the existing native
`reaction_gap_pct`, `sustain_5d_pct` and `is_reversal_5d` meanings. Display the
additive `daily_path_v1` separately: first opposite sampled closing step/date,
closing gap-fill step/date, expected/observed steps, qualification reason,
maturity/observation/computation clocks, basis and retrospective source mode.
Step zero is the reaction day's open-to-completed-close step; later steps compare
completed session closes. A closing gap fill is not an inferred intraday touch;
first opposite step is not the native full reversal definition or elapsed hours.
Preserve BMO/AMC anchor differences and native endpoint definitions on the server.

Percent fields already in percentage-point units must not be multiplied by 100.
Real zero measurements and step zero remain visible. Null/absent financial values
remain unavailable, with a reason when returned; do not coerce them to zero, flat,
false or a neutral recommendation. A missing additive field during rollout renders
unavailable detail, not proof of no reversal or a successful new deployment.
Right-censored complete windows say the event was not observed by that endpoint;
immature/missing windows do not become completed negatives. Unknown versions or
malformed current-version values surface a visible contract error.

Keep release calendar dates as dates. Format timestamp instants with explicit
timezone context; never substitute a call time, browser fetch time or client clock
for publication, observation, maturity or computation time.

## Owned implementation surface

- Extend `src/routes/CatalystsPage.tsx` without replacing its existing feed.
- Reuse existing components/formatters first. A focused
  `src/components/catalysts/EarningsHistory.tsx` and colocated tests may own the
  new panel if no equivalent exists; `src/types/earnings.ts` holds the actual API
  response types, without duplicating financial calculations.
- Extend `tests/helpers/fixtures/catalysts.ts` for the full endpoint fan-out and
  `src/mocks/contract.test.ts` where its operation coverage requires it. Types must
  follow the actual router, not be loosened to fit a fixture.
- Use `tests/catalysts/earnings-history.spec.ts` for hermetic visible acceptance
  and `tests/catalysts/earnings-history.cloud.spec.ts` for deployed closeout.
- Regenerate `tests/fixtures/stocks-openapi.json` and
  `src/types/stocksOpenApi.gen.d.ts` through the existing contract-sync workflow
  after the backend contract lands. Do not hand-edit generated evidence.
- Update only this capability's catalog/traceability record. Do not change gates,
  workflow settings, shared authentication or production permissions.

## Sensitive acceptance and release

The positive browser control must show the actual new section using both earnings
responses. A helper-only implementation, static report link, hidden JSON payload or
all-unavailable screen cannot pass that positive test. Use typed synthetic fixtures
or permitted derived examples; do not publish raw licensed captures.

Use deliberately different gap, native sustain, first-opposite and closing-gap-fill
values so a mislabeled column fails. Assert 75 percent with its actual sample
denominator, null versus zero, step zero, complete censoring, immature and missing
data. The frontend formats server results; it does not calculate those results.
Keep summary context distinct from an individual selected event and its outcome.

Exercise a delayed ticker-A response after switching to ticker B, account change,
signed-out state, server outage, permission errors and an event/history 404. No old
ticker's financial content may appear under the new ticker. A failure is not an
empty successful history. Keep independent endpoint error/availability states so a
missing summary does not silently discard otherwise valid event rows.

Before merge, run `npm run contract:check`, relevant unit/contract tests,
`npm run build`, and the affected hermetic Playwright specs. Retain screenshots via
`testInfo.outputPath` and describe their states on the PR. Run the actual branch/main
docs audits and normal spec gate; preserve review lineage and existing allowances.
Do not trigger reviews on an unfinished CODE candidate.

After normal reviewed merges and staging deployment, the owner runs the cloud spec
with existing interactive sign-in. Compare the actual screen with the same API
responses and verify at least one qualified real event plus legitimate unavailable
behavior. Mocked screenshots, a backend unit test or a successful health check do
not close that gate. Post-deployment proof is recorded separately; it is not a
pre-merge checkbox falsely ticked from a different revision. If no qualified real
event is available, report the exact data/admission gap rather than passing only
unavailable cases or acquiring new data outside authorized scope.

## Capacity, preservation and rollback

Capacity: n/a for GCP workloads; the frontend adds no job or vendor acquisition.
Its selected-ticker fan-out is two existing bounded API operations, with caching
and no polling/retry expansion. All financial computation remains in stocks.

Use isolated branches and normal non-force pushes. Preserve Lovable-connected
history; do not rebase/amend/squash published commits. Rollback restores the prior
reviewed frontend revision; the existing catalyst feed and additive backend fields
remain compatible. No schema or data rollback is performed by this UI change.
