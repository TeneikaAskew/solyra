# Product Requirements (solyra)

**Last reviewed:** unknown · **Last scanned:** 2026-09-28 · **Owner:** TBD

Which product requirements apply to this repository, what each one asks of the
frontend, and what the code does about it today. The requirement IDs and their
wording belong to the stocks
[01-PRODUCT-REQUIREMENTS.md](https://github.com/TeneikaAskew/stocks/blob/main/docs/product/01-PRODUCT-REQUIREMENTS.md),
which stays canonical: this file never assigns or defines an ID, so the spec
gate checks a solyra spec's `req_ids` by shape only. All 39 IDs appear below,
evaluated or listed as not applicable, so a spec written here can cite any of
them.

Requirements are targets, not claims of implementation. Each status records
what was found on 2026-09-28 in `src/` and `tests/` as they stand on `main` at
`eca7078`; line numbers refer to that tree. No reviewer has confirmed these
findings yet, which is why the marker above reads `unknown`.

## Evidence vocabulary

| Tag | Meaning |
|---|---|
| TEST | a named unit or E2E test asserts the behavior |
| CODE | implemented in source, but no test asserts it |
| DOC | only a document claims it |
| GAP | missing or violated, at the location given |
| NOT CHECKED | needs a live environment, the backend, repository settings, or a measurement not made here |

Statuses: **MET**, **PARTIAL**, **GAP**, **NOT CHECKED**. Unit tests named
below were run for this document; E2E specs are cited for what they assert and
were not run for it.

## Summary

| Requirement | Status | Evidence | In one line |
|---|---|---|---|
| REQ-UX-001 | PARTIAL | TEST, CODE, GAP | 15 routes checked for six states; unknown data and failed calls often render as a conclusion or as empty |
| REQ-MARKET-001 | PARTIAL | CODE, TEST | symbol and session shown; no venue, no quote time, no source |
| REQ-PLAYBOOK-001 | PARTIAL | CODE, TEST | checklist, levels, age and win rates shown; entry is the live price and the sample size is hidden |
| REQ-ACCESS-001 | GAP | CODE | click handlers without keyboard access, unlabeled controls, no focus-visible style, color pairs below 4.5:1 |
| REQ-LLM-001 | GAP | CODE, TEST | generated levels and confidence render exactly like supplied data |
| REQ-MODEL-002 | PARTIAL | CODE, TEST | Insights show as-of and model versions; Movement Read and the dashboard AI take show none |
| REQ-FRESH-001 | PARTIAL | CODE, TEST | playbook, options and sector data carry an age; quotes, signals, catalysts and reports do not |
| REQ-DATA-001 | PARTIAL | TEST, CODE, GAP | the Rule 4 formatters are tested; a $0 GEX fallback, zero-shaped probabilities and "Market Closed" for an unknown session remain |
| REQ-DATA-004 | PARTIAL | CODE | sessions and holidays come from the server; weekends, 09:30 and 16:00 are hardcoded; no half-days |
| REQ-JOURNAL-001 | PARTIAL | CODE, TEST | the client sends no owner and previews imports; corrections after import are not auditable |
| REQ-AUTH-001 | PARTIAL | TEST, GAP | config failures fail closed; the open-path list treats `/api/me/*` as open while the server gates it |
| REQ-AUTH-003 | MET for the frontend | CODE | `/dev` is proxied only by the dev server; the backend side is not checked |
| REQ-AUTHZ-001 | MET for the frontend | TEST | the admin UI follows the server's `is_admin` and fails closed |
| REQ-TENANCY-001 | PARTIAL | CODE | no owner is sent; the journal cache is not scoped by user |
| REQ-SECRET-001 | MET for the frontend | CODE | no key in the bundle; Firebase config is fetched at runtime |
| REQ-PERF-001 | PARTIAL | TEST | options dates are bounded; E2E budgets measure mocked page loads, not API p95 |
| REQ-GOV-001 | PARTIAL | DOC | documented and self-attested in the PR template; enforcement NOT CHECKED |
| REQ-DEPLOY-001 | GAP | CODE | no deploy configuration here; the published frontend is Lovable's and reaches staging only |

## Evaluated requirements

### REQ-UX-001: PARTIAL

> Every served screen SHALL expose loading, empty, stale, permission and
> dependency-error states, and SHALL NOT convert unknown data into a neutral
> trading conclusion.

**Shell baseline, all 13 gated routes.** Signed out in firebase mode, the shell
shows SignInScreen (AuthGate.tsx:17-27; E2E tests/shared/auth-gate.spec.ts:84).
An expired session shows a banner (AppShell.tsx:68 into
AuthStatusIndicator.tsx:156-181; CODE). A 401 marks the session blocked
(src/lib/authGate.ts:22; unit authedFetch.test.ts "a 401 from a gated path
fires onUnauthorized"). A config failure shows an error screen (E2E
auth-gate.spec.ts:110). A 403 is never distinguished: isAuthError matches 401
only (WidgetState.tsx:75-78). Pages gate with DataGate or SignInBanner (Live
:301, Charts :501 and :780, Options :63-64, Signals :200, Playbook :337,
Insights :199, Catalysts :519, Reports :162, Journal :506); the dashboard gates
per widget (WidgetState.tsx:108-110).

| Route | Loading | Empty | Stale | Permission | Dependency error | No neutral conclusion |
|---|---|---|---|---|---|---|
| LandingPage | n/a | n/a | no | n/a | yes | partial |
| AuthActionPage | yes | yes | n/a | yes | yes | n/a |
| DashboardPage | partial | yes | partial | yes | partial | no |
| LiveMarketPage | partial | no | partial | yes | partial | no |
| ChartsPage | yes | yes | partial | yes | partial | no |
| OptionsFlowPage | yes | yes | yes | yes | partial | partial |
| SignalsPage | yes | yes | no | yes | partial | no |
| PlaybookPage | yes | yes | yes | yes | yes | partial |
| InsightsPage | yes | yes | partial | yes | partial | partial |
| CatalystsPage | yes | no | partial | yes | yes | no |
| ReportsPage | partial | yes | no | yes | partial | n/a |
| JournalPage | yes | yes | partial | yes | partial | yes |
| AdminPage | yes | yes | yes | yes | yes | n/a |
| HelpPage | no | yes | no | n/a | no | n/a |
| SettingsPage | yes | yes | n/a | yes (shell) | yes | n/a |

Evidence per route:

- **Landing.** Waitlist errors render (WaitlistSection.tsx:82-86; E2E
  tests/landing/landing.spec.ts:72). The real "50% hit rate" proof tile shows
  no date (fixtures.ts:4-8 and :52; BentoGrid.tsx:116-124), and the fixture
  verdict "LONG" carries no "sample" label (BentoGrid.tsx:72, :83-90).
- **AuthAction.** Loading, invalid link, unavailable and error states
  (AuthActionPage.tsx:53-59, :80-81; E2E auth-gate.spec.ts:259, :461, :473).
- **Dashboard.** Loading at :560, :694, :734, :767 and :832, but none for the
  AI take or Movement Read (MovementRead.tsx:137). Empty at :683 and :776.
  Stale: the playbook age and the 503 refusal (:341-344, :618-623, :681; E2E
  tests/dashboard/dashboard.spec.ts:126, :134) and the sector as-of (:842; E2E
  :68); nothing for the hero price, brief, signals, catalysts or AI take.
  Errors: the catalyst and insight queries read only `data` (:353-358), so a
  failure shows "No catalysts in the next 7 days", "No tagged news" or "No
  insight report" (:812, :920, :910); Movement Read returns null on error
  (MovementRead.tsx:138-142). Neutral conclusions: a null bias shows "Daily
  bias NEUTRAL" (:199); an unknown status shows CLOSED (:292, :533); a null
  direction shows NEUT (primitives/index.tsx:239-245, used at :627 and :792);
  `return_pct` is nullable in the vendored SignalRow schema but typed non-null
  (:87-88) and rendered as `fmtPct(s.return_pct*100)` in the bull color
  (:794-795), so a null shows "+0.00%".
- **LiveMarket.** Loading at :344-348 and :370-374. The no-bars message also
  covers an empty day or a history error; history and indicator errors are
  never read (:163-164, :209-219). "Updated:" is the browser's fetch time
  (:243, :297). Only the quote error is shown, with a guessed cause
  (:302-305). An unknown session reads "Market Closed" (:250;
  marketSession.ts:8), and an indicator failure shows EMPTY_SIGNALS as "0/0
  met, 0%" (:218-219; indicators.ts:62-65).
- **Charts.** Loading, empty and error at :717-774. Stale shows only the date
  and "Snapped to" (:509-526). Date, reference, gamma and indicator errors are
  ignored (:116, :193, :205, :392-393); a failed date list shows "Select a
  date" (:773); an indicator failure shows "No setup" 0/5 (:60-64, :393;
  StrategyConditionsCard.tsx:94).
- **Options.** States at SwingMode.tsx:606-624, ProfilesTab.tsx:432-456, :468
  and :622-625, TrinityTab.tsx:56-57. Stale: a LIVE, EOD, STALE or UNAVAILABLE
  pill with the snapshot time (SwingMode.tsx:213-235) and a source footer
  (ProfilesTab.tsx:632-643; E2E tests/options/options-flow.spec.ts:155).
  Trinity shows request errors as "No gamma levels available"
  (TrinityTab.tsx:105). A hardcoded "Tactical read" (setups, invalidation,
  "Confidence 72%") always renders (SwingMode.tsx:450-495, :950;
  src/data/gammaMapMock.ts:241-253), disclosed only by an "illustrative" banner
  (SwingMode.tsx:926, :930).
- **Signals.** Loading and empty at :303 and :343 (E2E
  tests/signals/signals.spec.ts:46). The typed `source` (:45) is never shown.
  Every failure reads "Signal data not found... run the pipeline" (:297). A P&L
  error hides its card (:160, :209). A null direction is painted bear (:77), a
  null score shows "0.0" (:87-90).
- **Playbook.** States at :302 and :326-355 (E2E
  tests/playbook/playbook.spec.ts:59, :76, :83). The reference fetch returns
  null on error (:77). Unknown conditions stay unknown (:120-156, :363). A
  missing direction gets CALL levels (SetupCardDetails.tsx:52).
- **Insights.** States at :307-341 (E2E tests/insights/insights.spec.ts:64).
  Stale: the as-of and a historical banner (ReportCards.tsx:86; :347), but no
  age. A history failure reads "No history yet." (:414); a refresh failure
  only reaches console.error (:87); a failed run stops the spinner (:66). An
  unrecognized bias maps to flat (ReportCards.tsx:498-501), a null history
  direction to NEUT (AgentsPanel.tsx:138).
- **Catalysts.** Loading and error at :607-616; there is no empty branch
  (:620). The source label defaults to 'Benzinga' (:488); a missing impact
  becomes "Medium" (:70, :76).
- **Reports.** List loading only disables the select (:130); content loading at
  :46-52; empty and list-error states (E2E tests/reports/reports.spec.ts:70,
  :83). A content error reads as a missing report (:54-60). Reports carry no
  date (src/lib/reports.ts:7-11).
- **Journal.** States at :500-503 and :814-826 (E2E
  tests/journal/journal.spec.ts:40, journal-onestop.spec.ts:738). An error
  loading the user's own journal is never read: the view falls back to
  Examples and the header says "Local storage" (:219-231, :358;
  useJournalChartTrades.ts:366). Null stats render as the unavailable dash,
  in a neutral tone (:681-686).
- **Admin.** Role gate (AdminPage.tsx:40-46, :139; E2E
  tests/admin/admin-auth.spec.ts:104, :134); dataset status, last refresh,
  empty and error (DataSourcesPanel.tsx:32-80, :103-113; E2E
  tests/admin/admin-tabs.spec.ts:61, :107, :122).
- **Help.** Fetches `/api/config/indicators` (HelpPage.tsx:198) but silently
  uses hardcoded thresholds while loading or on error (:12-25); has an
  empty-search state (:262).
- **Settings.** Loading, sync and error (SettingsPage.tsx:182-193; E2E
  tests/settings/settings.spec.ts:82, :176); empty values read "Not set"
  (:245-249).

The largest gaps, in order:

1. Unknown data becomes a conclusion: the NEUT direction tag, "Market Closed"
   for an unknown session (asserted by the unit test marketSession.test.ts),
   and the dashboard's CLOSED pill.
2. Failed indicator calls look like "no setup" or 0% (LiveMarketPage.tsx:218-219;
   ChartsPage.tsx:393).
3. Nulls render as 0 or in a directional color (DashboardPage.tsx:794-795;
   SignalsPage.tsx:77, :87-90; CatalystsPage.tsx:70).
4. Errors render as empty or hidden: dashboard catalysts, news, AI take and
   Movement Read; Journal; Help; Insights history.
5. No test asserts a loading state or the in-page 401 state, and Catalysts has
   no empty state.

### REQ-MARKET-001: PARTIAL

> Market context SHALL identify symbol, venue/session, as-of time, source and
> freshness.

Present (CODE, TEST): the symbol (DashboardPage.tsx:542, :581;
LiveMarketPage.tsx:310; TickerCombobox.tsx:321) and the session
(DashboardPage.tsx:525-533; LiveMarketPage.tsx:250-268); the nav chip is hidden
when the session is unknown (MarketSessionBadge.tsx:20). E2E
tests/shared/navigation.spec.ts:88 "market session badge is truthful" and
tests/live-market/live-market.spec.ts:33 "shows session pill".

Gaps: no venue anywhere (TickerCombobox.tsx:476-482, though useTickerSearch.ts:7
and :15 carry region and exchange); an unknown session reads CLOSED;
`LiveQuote.last_updated` (useLiveQuote.ts:17) is never rendered, so the hero
price has no timestamp (DashboardPage.tsx:582); no quote source is shown, and
`brief.live.source` (:59) is unused; Most Active drops `snapshot_ts`
(MostActiveBar.tsx:26, :204-206).

### REQ-PLAYBOOK-001: PARTIAL

> A plan SHALL show entry/trigger, invalidation, targets, data time, evidence,
> and explicitly mark unavailable fields.

Present (CODE, TEST): a condition checklist marking each condition met or
unknown with a reason (PlaybookPage.tsx:120-156, :233); target, entry and stop
rows (SetupCardDetails.tsx:68-91); "as of <date> (Nd old)"
(PlaybookPage.tsx:302, :329-333; E2E playbook.spec.ts:76; unit dates.test.ts),
with the stale-set refusal (E2E :83); win rates overall and per horizon
(PlaybookPage.tsx:241-251; SetupCardDetails.tsx:94-120).

Gaps: "Entry" is the live price with no timestamp, not a trigger
(SetupCardDetails.tsx:71, :80); invalidation is only a stop price; missing
fields are omitted rather than marked (the levels block vanishes, :55, :64,
:68; a null win rate or average return is hidden, PlaybookPage.tsx:241, :246);
`sample_n` is never shown (SetupCardDetails.tsx:18); a missing direction gets
CALL levels (:52).

### REQ-ACCESS-001: GAP

> Core workflows SHALL be keyboard operable with labeled controls, visible
> focus and WCAG 2.1 AA contrast.

Found by reading the source (CODE); nothing here was checked in a browser or
with assistive technology.

- **Keyboard.** A `<div onClick>` with no role, tabIndex or key handler in the
  interactive Card and in KpiTile (primitives/index.tsx:169, :260), used as the
  dashboard's navigation cards (DashboardPage.tsx:770, :806, :896, :915); sort
  headers as `<th onClick>` (SignalsPage.tsx:316; BacktesterSection.tsx:306);
  rows as `<tr onClick>` (FlowTab.tsx:182).
- **Labels.** Icon-only buttons with no accessible name: Modal.tsx:33-38,
  ProfilesTab.tsx:387-402, WatchlistPanel.tsx:272-277, InsightsPage.tsx:595-601,
  ChartsPage.tsx:677-682, JournalPage.tsx:426-431. Named by `title` only:
  TradeRailCard.tsx:116-131, ReplaySessionControls.tsx:65-110. Unlabeled
  inputs: HelpPage.tsx:220-226, InsightsPage.tsx:588-594,
  TickerCombobox.tsx:337-351, ChartsPage.tsx:509, JournalPage.tsx:366,
  SignalsPage.tsx:246, :262, :271. Labels not associated with their control:
  JournalPage.tsx:742-787, MovementRead.tsx:371-386.
- **Focus.** No `:focus-visible` rule anywhere in `src/`; 13 places remove the
  outline; HelpPage.tsx:225 colors a zero-width border; `src/index.css:377`
  sets `outline: 0`.
- **Contrast**, computed from the tokens in `src/index.css:14-99`, all below
  4.5:1:

  | Theme | Foreground | Background | Ratio |
  |---|---|---|---|
  | dark | `--on-surface-muted` #6e7781 | `--surface-2` #282a2e | 3.16:1 |
  | dark | `--on-surface-label` #5a6670 | #282a2e | 2.44:1 |
  | dark | `--bear` #ef4444 | #282a2e | 3.82:1 |
  | light | `--bull` #15803d | #e4e7ee | 4.05:1 |
  | light | `--warn` #b45309 | #e4e7ee | 4.06:1 |
  | light | `--bull`, `--warn` | #f0f2f6 | 4.48:1 |

  The first row is the "unavailable" text itself (DashboardPage.tsx:266-270;
  WidgetState.tsx:48). The light rows contradict the comment "These shades
  clear 4.5:1" (src/index.css:94-99).
- **Tooling.** No axe or `jsx-a11y` in package.json or eslint.config.js.

### REQ-LLM-001: GAP (display)

> LLM nodes SHALL distinguish supplied facts from generated interpretation, use
> structured schemas, and SHALL NOT invent prices, stops, targets or confidence
> values.

The frontend obligation is the display half: show which values a model
generated. Mitigations present (CODE, TEST): the "AI Insights" label
(InsightsPage.tsx:115); separate brief and pipeline columns
(ReportCards.tsx:555, :587), with the comparison withheld when the brief fails
(:524); a partial-report banner (:472); a model-versions footer
(InsightsPage.tsx:383).

Gaps: generated values render as plain numbers styled like supplied data
(:390-460), with no per-field provenance for entry, stop, targets and
invalidation (ReportCards.tsx:109-143), persona plans (:320-360), key levels
(:195-212) or "Confidence N%" (:99). E2E insights.spec.ts:24 asserts a
generated entry range, 220.00 to 221.50, as a plain value. The dashboard's AI
take shows a direction and "conf N%" (DashboardPage.tsx:896-911), and chat
prints model text verbatim (InsightsPage.tsx:571). Whether the models invent
these values is the backend half, in stocks.

### REQ-MODEL-002: PARTIAL (display)

> Runtime outputs SHALL include model/artifact/version, feature contract,
> training cutoff, as-of time and rollback target.

Present (CODE, TEST): the Insights as-of (ReportCards.tsx:86) and per-role model
versions (InsightsPage.tsx:383; E2E insights.spec.ts:24 asserts "trader:
vertex:gemini-2.0-flash"). Admin shows a version and last-train time
(ModelStateSnapshot.tsx:135, :138; PredictForm.tsx:217-218).

Gaps: no training cutoff anywhere. Movement Read shows only ticker, timeframe
and scope (MovementRead.tsx:146-178); its `as_of` and the expected-move
`model_version` and `ts` are typed (src/types/index.ts:230-231, :288) but never
rendered. The dashboard AI take shows no version. The feature contract and
rollback target appear nowhere.

### REQ-FRESH-001: PARTIAL (display)

> Every served dataset SHALL have an owner, expected cadence, measured age,
> alert threshold and recovery instruction.

The frontend's part is showing measured age where data is shown. Present (CODE,
TEST): the playbook age and refusal (src/lib/queryData.ts:9-11; unit
queryData.test.ts); the options STALE pill; the Profiles source footer (E2E
options-flow.spec.ts:155); the sector as-of (E2E dashboard.spec.ts:68); the
admin status table (E2E admin-tabs.spec.ts:122).

Gaps: nothing consumes `/api/health/freshness`, which appears only in the
generated types (src/types/stocksOpenApi.gen.d.ts:877-910); dataset freshness
is admin-only (AdminPage.tsx:53); quotes, signals, catalysts, reports, charts,
the brief and Movement Read show no age.

### REQ-DATA-001: PARTIAL

> Decision-critical reads SHALL fail explicitly on missing or stale upstream
> data and SHALL NOT substitute a silent empty result. Financial fields SHALL
> NOT be defaulted to `0`, `0.5` or a neutral constant; unavailability SHALL
> propagate as `null`/`NaN` to a display layer that renders it as unavailable.

This is CLAUDE.md Rule 4 (cited in code as Rule 3.7).

**Scan of `src/`, excluding mocks, tests and fixtures:** 18 `?? 0`, no `|| 0`,
no `?? 0.5`, no `Number(x) || 0`; 31 `?? ''`, all on strings. Of 41 catch
blocks and 9 `.catch` calls, none returns `[]`, `{}` or `0` in a data path
(apiError.ts:40, mockMode.ts:34 and useAdmin.ts:198 read an error body or
localStorage).

Fallbacks on financial fields:

- LiveMarketPage.tsx:185 defaults volume to 0 in the review bars posted to
  `/api/live/indicators` (:209-211), with no audit marker.
- useReviewQuote.ts:90 does the same in a hook (its comment at :88-89 calls the
  case impossible), with no marker or test.
- ChartsPage.tsx:368 carries a volume fallback marked AUDIT-2026-05-13
  (:364-367).
- ProfilesTab.tsx:296 (and :321) uses a spot sentinel gated by `finalSpot > 0`
  (:338, :479, :504), which mitigates it.
- StructureBrief.tsx:318 and PredictForm.tsx:183 render a missing class
  probability as "0%" (:338, :203).
- SwingMode.tsx:677 renders a missing DTE as "0DTE" (swingGridUtils.ts:44-55).

Not fallbacks, on inspection: accumulators (SwingMode.tsx:757, :858), pixel
math (ProfilesTab.tsx:120, :201), counts (UsersPanel.tsx:83), a cache key
(useOptionsGreeks.ts:111), a length (DashboardPage.tsx:732), values after a
null guard (primitives/index.tsx:116, :139), tone only (JournalPage.tsx:686,
DashboardPage.tsx:925).

Gaps the scan cannot see:

- **A $0 GEX reading on the Profiles tab.** ProfilesTab.tsx:326 falls back to
  EMPTY_GREEKS (useOptionsGreeks.ts:148-155: `total_gex` 0, `put_call_ratio` 0)
  while the greeks request is pending or failed, and the metrics bar is gated
  only on `finalSpot > 0` (:504-527). It shows "Total GEX +0 · Positive" and
  "0.00 · Bullish skew". No test covers a greeks failure: all three E2E routes
  answer 200.
- **Mock nodes beside real data.** SwingMode.tsx:406-418 and :524-534 render the
  mock Hedge (580) and Midpoint (591) nodes from src/data/gammaMapMock.ts:231-234
  next to the real `/levels`; the banner at :913-934 labels only the tactical
  read.
- **An unknown session shown as closed.** A `/api/live/status` failure shows
  CLOSED (DashboardPage.tsx:292, :527-533) or "Market Closed"
  (LiveMarketPage.tsx:161, :250-254, via marketSession.ts:8), and
  marketSession.test.ts:9 asserts that undefined maps to "Market Closed".
  MarketSessionBadge.tsx:13-20 correctly renders nothing.
- **Holidays lost on failure.** ReplayControl.tsx:57 uses an empty holiday set
  when the market-hours request fails.

Tests that hold the line (unit, run): MovementRead.test.tsx (fmtProbPct renders
the unavailable dash, never 0%, :57; fmtReachRate, :70);
primitives/index.test.ts (deltaText, :15, :23); format.test.ts (the Rule 4
formatters, :28-43; never zero-shaped, :45; toneOf neutral, :53). E2E
admin-tabs.spec.ts:46. Enforcement is advisory only: the fallback-guard agent
definition and a PR-template checkbox (.github/pull_request_template.md:24-29);
no lint rule, and lint is not a CI gate (ci.yml:14-23). There is one
AUDIT-2026-05-13 marker in `src/` (ChartsPage.tsx:364) and none in tests.

### REQ-DATA-004: PARTIAL

> Exchange sessions, holidays, half-days and DST SHALL resolve through one
> shared calendar; and a raw-versus-adjusted corporate-action policy SHALL be
> explicit.

Server-owned (CODE): session state from `/api/live/status` (useLiveStatus.ts:12-23;
used by DashboardPage.tsx:290, LiveMarketPage.tsx:161, PlaybookPage.tsx:268,
MarketSessionBadge.tsx:18); trading windows and holidays from
`/api/config/market-hours` (useConfig.ts:44-79; ReplayControl.tsx:46-58;
CandlestickChart.tsx:60, :176). There is no client calendar logic:
marketSession.ts:1-25 only labels, and dates.ts:4-9 and time.ts:24-30 use the
named zone America/New_York.

Gaps: weekends are hardcoded (ReplayControl.tsx:37-44, :115-118), as are the
09:30 open and the 30-minute opening-range window (playbookEvaluator.ts:39-69)
and the 16:00 close default (ReplayControl.tsx:14; useReviewQuote.ts:38;
DashboardPage.tsx:521). Half-days exist neither in the client nor in the
market-hours contract (useConfig.ts:44-50), whose holiday field covers 2026
only. The corporate-action policy is a backend matter and was not checked.

### REQ-JOURNAL-001: PARTIAL

> Journal records SHALL be scoped to an authenticated owner and support
> auditable import corrections.

- **Owner: MET (CODE).** No owner, user or email field in any journal request
  body: create (useJournalChartTrades.ts:398-408), close (:434), delete (:454),
  import commit (:885-898). The server takes the owner from the verified
  identity (in stocks). No E2E asserts that the commit body lacks an owner.
- **Review before commit: MET (TEST).** E2E journal-import.spec.ts:55 walks
  upload, preview (duplicate and active labels), commit, success copy and
  refetch, with duplicates pre-unchecked, the imports-as-active label, four
  skipped-row reasons and "Imported 2 · 1 duplicates skipped" (commit body at
  :98-132); :148 asserts a 422 preview failure surfaces loudly. Code:
  ImportTradesModal.tsx:183, :291-298, :364-367, :376-392, :394-401.
- **Auditable corrections: GAP.** There is no batch id, undo or provenance;
  corrections only PATCH exit fields (useJournalChartTrades.ts:426-443) or
  DELETE (:450-464). The commit sends rows the client holds
  (ImportTradesModal.tsx:199-205); whether the server re-validates them is NOT
  CHECKED.

### REQ-AUTH-001: PARTIAL (frontend)

> A non-local deployment SHALL reject unauthenticated `/api/*` requests unless
> an approved perimeter authenticator has established identity. A deploy SHALL
> fail when `AUTH_MODE` resolves to `open` outside local development.

- **Fails closed on config: MET (TEST).** ConfigGate.tsx:27-50 throws on a
  non-OK answer, non-JSON and an unknown authMode. E2E auth-gate.spec.ts:110
  (config fetch failure shows the config-error screen) and :124 (an HTML answer
  does too). `VITE_NO_BACKEND` is opt-in (`=== '1'`) and dev-server-only
  middleware (vite.config.ts:69-89, :92, :107; CODE).
- **Token attached: MET (TEST).** src/lib/authedFetch.ts:168-224, with
  authedFetch.test.ts covering the open prefix `/api/me` (:65), gated paths
  (:75), a persistent token failure never going anonymous (:108), an account
  switch abort (:138) and the stale-token retry (:211, :230).
- **Open-path list: GAP.** The frontend's list is `/api/health`, `/api/me`,
  `/api/config/firebase` and `/api/waitlist`, all prefix-matched
  (authedFetch.ts:45, :89-92). The backend treats `/api/me` as an exact path and
  the other three as prefixes, and asks for the split to be mirrored. So
  `/api/me/preferences` and `/api/me/profile` (usePreferences.ts:29;
  useProfile.ts:21) are gated on the server but open on the client, and their
  401 skips the stale-token retry (:235) and the signed-out handling
  (:247-250). The token is still attached, and isIdentityPath (:100-102) keeps
  them from going anonymous. No test covers how `/api/me/*` is classified.

The rest of the requirement (rejecting unauthenticated requests, failing a
deploy on `AUTH_MODE=open`) is backend work in stocks.

### REQ-AUTH-003: MET for the frontend

> Non-`/api/` operational endpoints exposing infrastructure detail SHALL be
> gated by the same mechanism as `/api/*`, or SHALL NOT deploy on a public
> service.

The frontend proxies `/dev` only in the dev server (vite.config.ts:129-134;
CODE). By reading the stocks source, its `/dev` routes let requests without an
IAP header through and its auth middleware skips non-`/api` paths; that is a
stocks GAP whose runtime behavior is NOT CHECKED.

### REQ-AUTHZ-001: MET for the frontend

> Admin operations SHALL require a server-enforced role, compared in constant
> time; email presentation alone SHALL NOT grant privilege.

`isAdmin` is `/api/me`'s `is_admin === true` (useUser.ts:78-80) and fails closed
on error (:60-68); AdminPage.tsx:37-53 gates on it; the client never compares
emails. E2E admin-auth.spec.ts:119 (a non-admin sees access denied) and :134 (a
`/api/me` failure denies). By reading the stocks source, the server's admin
check compares an email with plain `==` against a default hardcoded address:
email-based and not constant time, a stocks GAP.

### REQ-TENANCY-001: PARTIAL

> User-owned rows SHALL carry an immutable owner identifier enforced on every
> access path.

The client sends no owner (CODE; see REQ-JOURNAL-001). By reading the stocks
source, the owner key is the email, and email change is supported
(authAction.ts:61-62), so the owner identifier is not immutable: a stocks GAP.
On the client, journal cache keys are not scoped by uid
(useJournalChartTrades.ts:280) and are cleared only on in-app sign-out
(SignOutButton.tsx:22; AuthStatusIndicator.tsx:100). A cross-tab account switch
is NOT CHECKED.

### REQ-SECRET-001: MET for the frontend

> Secrets SHALL be passed via `--set-secrets`, never `--set-env-vars`, and SHALL
> have a named rotation owner.

A key search over `src/`, index.html and `public/` finds only a test
placeholder (authAction.test.ts:25); no `.env` file is tracked; the only
environment value the app bundle reads is `VITE_API_BASE_URL`
(authedFetch.ts:57); the Firebase
config is fetched at runtime (ConfigGate.tsx:27-50); the staging URL is public
by design (apiTargets.ts:24-29). CODE. Rotation ownership is a backend matter.

### REQ-PERF-001: PARTIAL (frontend)

> Interactive API p95 targets and payload bounds SHALL be defined per endpoint
> and monitored before any availability claim.

- **Bounded requests: MET for options dates (TEST).** useLatestOptionsDate asks
  for `?limit=1` under the key 'latest' (useOptionsDates.ts:42-53), while
  useAllOptionsDates asks with no limit under 'all' (:56-66), capped at 1000
  by the server (:9). E2E options-flow.spec.ts:176-215. Explicit `limit=` appears
  only at useOptionsDates.ts:46, DashboardPage.tsx:347, useInsights.ts:110 and
  useTickerSearch.ts:60.
- **Budgets: PARTIAL.** Nine specs use `perfBudgetMs`
  (tests/helpers/perfBudget.ts:18-24): a strict 3 s for help; 5 s for options,
  journal, catalysts, reports and live market; 7 s for signals, playbook and
  dashboard, all relaxed to 8 s without `PERF=1`, which CI does not set
  (ci.yml:116-117). A warmup project precedes them
  (playwright.config.ts:125-134). These measure mocked page loads, not API p95,
  and there is no client performance telemetry.

### REQ-GOV-001: PARTIAL

> A pull request SHALL NOT merge while any review thread is unresolved. Review
> comments SHALL be read before CI is checked, and a finding SHALL be
> reproduced against pre-fix code before a fix is written.

This is CLAUDE.md Rule 2.5 (CLAUDE.md:100-123), and the PR template's merge-gate
checklist (.github/pull_request_template.md:46-56) asks the author to attest to
it. That is DOC evidence only: no CI job checks threads (ci.yml:44-128), and
whether the repository requires conversation resolution is NOT CHECKED.
Commits that bypass pull requests bypass the rule entirely: 44 of the 89
first-parent commits on `main` came without a PR (41 by `gpt-engineer-app[bot]`,
2 by Lovable, 1 human merge); see the
[traceability record](12-PR-ISSUE-TRACEABILITY.md#commits-without-a-pr).

### REQ-DEPLOY-001: GAP (frontend)

> Infrastructure SHALL be reproducible from reviewed configuration; create and
> update paths SHALL converge; every scheduler target SHALL resolve to a job the
> same configuration creates.

The repository holds no hosting or deploy configuration: no firebase.json,
Dockerfile, Cloud Build, Netlify or Vercel file. Its workflows are ci.yml,
gh-api.yml and update-superpowers.yml; CI builds the app (ci.yml:87-88), and
that build is not deployed. The deployed frontend is a Lovable publish made
outside the repository, at https://solyra-stocks.lovable.app
(playwright.config.ts:15-16). Its bundle sends `/api/*` to the staging API
(apiTargets.ts:29, :37; authedFetch.ts:56-63). The production API leaves
Lovable origins out of its CORS list in iap mode, and playwright.config.ts:23-28
notes that a cloud run against production is not possible. So the published
site is not reproducible from reviewed configuration and reaches staging only.

## Repository rules and requirement IDs

| Rule (CLAUDE.md) | Requirement | Status here |
|---|---|---|
| 2.5, review feedback before merging | REQ-GOV-001 | see above |
| 4, no silent fallbacks (cited in code as 3.7) | REQ-DATA-001 | see above |
| 0, Lovable history constraint | none; candidate | DOC only |
| 5, one source of truth for math | none; candidate | PARTIAL |
| 6, cross-repo API contract drift | none; candidate | MET, mechanically |

The last three have no requirement ID in stocks. They are recorded here as
candidates; adding them is a change to the stocks file.

- **Rule 0 (DOC only).** Stated in AGENTS.md:1-10 and README.md:117-119. There
  are no hooks, CODEOWNERS or deny rules on `main`, and CI on pushes to `main`
  (ci.yml:33-34) reports only after the fact. Whether force-pushes are blocked
  is NOT CHECKED.
- **Rule 5 (PARTIAL).** `src/lib/indicators.ts` is types only (:9-65; CODE).
  Outside the allowed list: playbookEvaluator.ts:39-56 computes an opening
  range and posts it to `/api/playbook/evaluate` (:96-97), duplicating a
  stocks indicator, while its comment at :72 says "no math is done here" and
  playbookEvaluator.test.ts:11-36 pins the math; expectedMove.ts:45-67 sizes a
  stop and a share count from hardcoded magnitude thresholds the server also
  holds; swingGridUtils.ts:86-112 derives spot from deltas, and the greeks
  request prefers that estimate (ProfilesTab.tsx:317-321) while the display
  prefers the server's spot (:333-335); SwingMode.tsx:856-868 (King strike) and
  :752-762 (GEX per strike) re-derive the stocks gamma module. Lower risk:
  reviewQuote.ts:21-41 and DashboardPage.tsx:410-417 (change %),
  useJournalChartTrades.ts:243 (P&L) and :627-643 (aggregates outside
  journalStats.ts). Enforcement is an advisory reviewer agent whose trigger
  list omits playbookEvaluator.ts.
- **Rule 6 (MET, mechanically).** ci.yml runs `tsc -b` (:81-82), `npm test`
  including contract.test.ts (:84-85) and `contract:check` (:90-91).
  contract.test.ts passed 14 of 14, reporting 74 typed operations validated, 7
  typed with no mock, 0 skipped and 17 untyped of 98; 115 `/api` requests under
  `src/` against 95 declared paths; 109 requests checked; request bodies for 19
  operations.

## Not applicable to this repository

These requirements govern the backend, the jobs, the models, or the stocks
remediation process, and put no obligation on the frontend. They are listed so
every ID in the stocks file resolves here.

| Requirement | Why it does not apply to solyra |
|---|---|
| REQ-CAP-001, REQ-CAP-002, REQ-CAP-003 | Cloud Run job capacity, batching and scheduling; solyra ships no jobs |
| REQ-REPLAY-001, REQ-REPLAY-002 | the production replay paths (the signal-monitor replay script and the `*_AS_OF` job flags) live in stocks |
| REQ-GOV-002 | candidate and recoverability inventory for stocks remediation streams (stocks 12) |
| REQ-REVIEW-001 | issue-level review verdicts are recorded on stocks remediation issues; solyra has no issue-level review gate |
| REQ-VALID-001 | validation and calibration baselines are produced in stocks |
| REQ-FRESH-002 | the shared read-side freshness primitive is a backend component |
| REQ-RISK-001 | risk-control calibration runs on the backend replay path |
| REQ-SIGNAL-001 | signal persistence before delivery happens in the stocks signal monitor |
| REQ-DATA-002, REQ-DATA-003 | as-of enforcement and derived-record provenance are properties of backend reads and writes |
| REQ-REL-001 | live and replay parity fixtures are backend fixtures |
| REQ-PERF-002, REQ-OBS-001 | scheduled-job performance and job telemetry |
| REQ-DR-001 | Cloud SQL and artifact recovery |
| REQ-MODEL-001, REQ-MODEL-003 | model promotion, shadow validation and rollback happen in stocks |
| REQ-LLM-002 | the LLM roster test belongs to the stocks agent orchestrator |
| REQ-AUTH-002 | `iap` mode's header verification happens in the backend |

## Documentation drift found

Statements in this repository's documents that the code contradicts:

- **CLAUDE.md, Rule 4:** the AUDIT marker it cites at TradeMarkingChart.tsx:202
  is not there; the only marker is at ChartsPage.tsx:364.
- **CLAUDE.md, Rule 4:** "amber-labeled partial success" (CLAUDE.md:177-178):
  amber marks active rows, and the import result shows counts only
  (ImportTradesModal.tsx:423-427).
- **CLAUDE.md, Rule 6:** "66 of 98" operations untyped (CLAUDE.md:280); the
  contract test now reports 17 of 98. It also says the widening direction is
  not covered (:284-289), but src/types/assignability.ts:1-19 checks it through
  `tsc -b`. The PR template (:10-13) still says "Nothing mechanical ties them".
- **CLAUDE.md, Auth:** `OPEN_PREFIXES` is listed as three prefixes
  (CLAUDE.md:439-440); the code has four, including `/api/waitlist`, and the
  backend splits them into exact and prefix matches (see REQ-AUTH-001).
- **src/lib/authedFetch.ts:13-15 and :52-54:** the comments say one Cloud Run
  container serves the SPA and the API same-origin. The stocks API image
  serves `/api` only (its platform/Dockerfile says so in its header), and the
  frontend is published by Lovable (see REQ-DEPLOY-001).
- **CLAUDE.md:** "~73 bare `fetch('/api/...')` call sites across ~30 files"; the
  docs audit counts 87 across 34.

## Stale statements in docs/UI-SCREENS.md

Line numbers refer to docs/UI-SCREENS.md at `eca7078`.

- L13-14: there are 16 route entries (src/App.tsx:51-99), including the public
  `/auth/action` (:62-69).
- L73-74: the dev proxy probes `:8000`, then falls back to staging or
  `VITE_API_PROXY_TARGET` (vite.config.ts:19-45).
- L83 and L167 ("absent: load"): the live page has loading text
  (LiveMarketPage.tsx:344-348, :370-374).
- L86 and L204 (Playbook "Broken", stocks#861): stocks#861 is closed as
  completed, and the fix and its tests are here (PlaybookPage.tsx:57-67,
  :338-343; E2E playbook.spec.ts:76, :83).
- L87, L88 and L91 ("stale ✓") overstate it: Reports carry no date
  (src/lib/reports.ts:7-11), Signals never render their source, and Catalysts
  show only a defaulted source label (:488).
- L92, L105 and L290 (Admin "absent: empty, stale"): UsersPanel and
  DataSourcesPanel provide both (AdminPage.tsx:76-96; E2E admin-tabs.spec.ts:61,
  :122).
- L93 and L301 (Help "API calls: none"): Help calls `/api/config/indicators`
  (HelpPage.tsx:198; tests/helpers/fixtures/help.ts:29).
- L94, L98-102 and L308-316 (Settings device-local, 0 APIs, no E2E, 131 lines):
  the page is 492 lines, syncs `/api/me/preferences` and `/api/me/profile`
  (usePreferences.ts:29; useProfile.ts:21), has loading and error states
  (SettingsPage.tsx:182-193), and has 7 tests in tests/settings/settings.spec.ts.
- L111-112: the api-smoke, data-pipeline-status and dev specs no longer exist.
- L115-116: there are 50 unit test files, and ci.yml:84-85 and :117 run
  `npm test` and `npm run e2e`.
- L127 (Landing "absent: err"): the waitlist renders errors
  (WaitlistSection.tsx:82-86).

## How this was checked

- `npx vitest run`: 51 files, 1098 tests passed. Targeted runs of the files
  cited above (marketSession, WidgetState, dates, queryData, authedFetch,
  MovementRead, expectedMove, primitives, dataSourceFormat, format,
  StructureBrief, waitlist, authGate, DashboardPage.avgReturn,
  DashboardPage.relativeDayLabel, MostActiveBar, risk, usePlaybookEvaluation,
  playbookEvaluator) passed; contract.test.ts passed 14 of 14.
- Source reading for every other citation, at the lines given.
- **NOT CHECKED:** browser and assistive-technology behavior (HeroUI focus
  rings, tab order, focus traps, screen readers, contrast over translucent
  layers); whether the API actually emits the nulls flagged above; the backend
  halves of REQ-LLM-001 and REQ-MODEL-002; branch protection and repository
  settings; `tsc -b`, the build and lint; E2E runs; runtime behavior of the
  deployed services.

## Maintenance

- **A spec cites a requirement:** use the ID from the stocks file. If this
  file lists it as not applicable and the change proves otherwise, move it into
  the evaluated section in the same PR.
- **A PR changes what a status rests on:** update that requirement's status
  and evidence in the same PR, with the new file and line.
- **The stocks file adds, renames or retires an ID:** mirror it here, evaluated
  or not applicable, so every stocks ID still resolves.
- **A candidate rule gains an ID in stocks:** replace "none; candidate" in the
  rules table with it.
- **Re-review:** when a reviewer confirms the statuses against the code, set
  the marker's `Last reviewed` and record the evidence in that PR.
