---
feat_id: FEAT-OPTION-001
req_ids: [REQ-DATA-001, REQ-UX-001, REQ-MARKET-001, REQ-REL-001]
issues: []
canvases: []
done_when:
  - "src/hooks/optionsAvailability.test.ts and src/hooks/optionsChainAvailability.test.ts prove retained query data is withheld after HTTP401/403/429/500/503 or an unavailable envelope, while successful and recovered source values, zero exposure and normal in-flight refresh behavior are preserved."
  - "src/components/options/gammaPresentation.test.ts and tests/options/profiles-balance-flip.spec.ts prove gamma_flip and gamma_balance remain distinct backend prices, absent flip is unavailable even when balance or another response has a price, and numeric zero is preserved without financial recomputation."
  - "tests/options/cached-error-availability.spec.ts and tests/options/profiles-balance-flip.spec.ts exercise both actual views with producer-derived distinct-price, cached-refusal, empty/unavailable and recovery fixtures; retained or failed analytics cannot become displayed zero exposure."
  - "tests/options/profiles-balance-flip.spec.ts and tests/options/demo-banners.spec.ts verify dated batch-source evidence and explicit unknown quote freshness while preserving existing Flow Demo and illustrative Tactical disclosures, data endpoints, query identity and financial functions."
  - "Required unit/browser, types/build, source-contract and no-new branch/MAIN audit checks pass, with screenshots of the changed states and the FEAT-OPTION-001 record distinguishing source merge from verified website publication."
status: approved
supersedes: null
---

# Truthful existing-field binding for Gamma Map and Profiles

## Problem and authorized scope

The user's finish/fix instruction and parent delegation authorize correcting the
existing options data displays while preserving design, financial functions and
explicit demonstrations. This contract admits the smallest recovered options slice;
it does not admit the mixed news/nullable Dashboard/Catalysts edits in its source
handoff. No approved options-view binding spec was found on MAINf5da7b1d.

Current SwingMode maps realtime origin to LIVE, drops the snapshot date, retains
cached levels/grid after errors, and uses gamma_balance as a flip price. Profiles
also binds balance to flip, exposes retained chain/analytics after refusals and
labels batch timestamps as stronger freshness evidence than the wire establishes.
The backend already provides distinct nullable gamma_flip and gamma_balance;
no backend calculation or new endpoint is needed for this correction.

FEAT-OPTION-001 owns /options, /api/options and /api/grid in the existing catalog.
No matching report canvas is registered. The catalog's existing related backend
issues are context; this narrow change does not claim to close them.

## Preserved source and admission state

The original uncommitted spike is based on962cc1a390600094ee869677e140c1fe9d79478d.
Three ordered patches are preserved byte-for-byte:
- initial binding cce3410c2f4e836014f8a7866dd4ac73f8a46b1d9fcadc541b1460895eff8355;
- Profiles/flip-balance d84d8fa399950be704327e6669a63bc65f42a92967274e5c1324f9e53a607296;
- nullable-news compatibility1e1012b85a0ef5e370529ac348b405cfea5f447b38fe62d326cad405103214ed.

The third patch and all news/Dashboard/Catalysts paths are excluded here. Every
selected existing options file's original before-image matches current MAIN;
14 selected final files were copied exactly into a private validation spike.
All113 transferred payloads (three patches,90 text records,20 screenshots) verified.
The source is recovered, not reimplemented or rewritten through another agent.

The producer confirms zero independent LOCAL, hosted CODE or SEC runs on this
spike. Legacy publication history remains incomplete and is preserved in the
writer's reconciliation receipt; it is not reclassified as zero or reset.

On 2026-10-29 at 03:37:41 UTC, the owner replied "Yee" directly to the request
for three additional aggregate passes and two hosted CODE rounds, with security
review, for this narrow options-display contract and implementation. The parent
confirmed this affirmative grant (Sentinel_5dd000b384e48191bec03fce32d28292;
request Sentinel_26635d770210819180a79b69c61f9c42). This forward allowance covers
this existing-field stale/error, freshness-label and flip-price correction only.
It does not reset prior history or transfer another feature's allowance.

Planned use is one spec CODE/SEC cohort, one final independent runtime LOCAL
cohort and one runtime CODE/SEC cohort: three aggregate passes, two hosted CODE
rounds. None is reserved or triggered yet. Mandatory current-head security and
normal protected merge remain required. The specification must merge before
runtime publication; the recovered implementation stays a private spike until
then. Shell GitHub authentication returned HTTP401 and remains stopped, so this
local approval record is not a remote admission or publication receipt.

## Alternatives and selected design

Renaming LIVE alone leaves stale cached prices visible after failure. A new
frontend financial engine would duplicate backend calculations. Reuse the exact
preserved hooks and small presentation helper to qualify existing response data,
render its native price fields and expose the actual batch-source evidence.

## Design and owned paths

1. Preserve useGammaGrid/useGammaLevels query keys, URLs, existing cadence and retry
   policy. Withhold cached data when the query errors; keep the actual error for
   existing UI handling. An explicit unavailable grid envelope retains its reason
   separately and cannot become zero exposure. Normal successful refresh and
   healthy observed numeric zero remain visible.
2. Extract Profiles' existing query unchanged into useOptionsChain, retaining its
   existing stored-read/404-live-fallback behavior and request identity. This
   repair introduces no provider request, new polling or endpoint. Tests intercept
   both paths; validation never invokes a real provider. Failed chain reads hide
   retained chain-derived analytics/footer until recovery. Failed Greek analytics
   remain explicitly unavailable rather than presenting EMPTY_GREEKS totals as
   successful financial data.
3. gammaPresentation binds gamma_flip to Flip and gamma_balance to Balance, each
   independently finite/null. Never substitute a median/balance, legacy Greek
   zero_gamma, or another response's flip for a present levels response whose
   actual flip is absent. Keep backend balance-neighbor labels truthful. No
   denominator, pricing model, GEX/VEX formula, regime or trading rule is added.
4. Aware snapshot timestamps render the date and ET clock as a batch snapshot.
   Date-only evidence stays date-only; absent/invalid clocks remain unavailable.
   Realtime describes origin, not verified quote freshness. Do not infer provider
   quote time, lag, completeness or a freshness threshold. Show available symbol,
   source and requested/stored date identity without inventing missing fields.
5. Apply this binding to existing SwingMode and ProfilesTab, using existing UI
   style and controls. Keep Flow Demo and illustrative Tactical disclosures. No
   redesign or promotion of mock Hedge/Midpoint controls to real financial data.

Runtime ownership is limited to these exact recovered files:

- `src/components/options/SwingMode.tsx`
- `src/hooks/optionsAvailability.test.ts`
- `src/hooks/useGammaGrid.ts`
- `src/hooks/useGammaLevels.ts`
- `tests/fixtures/current-gamma-producer-contract.json`
- `tests/fixtures/owner-options-contract.json`
- `tests/options/cached-error-availability.spec.ts`
- `src/components/options/ProfilesTab.tsx`
- `src/components/options/gammaPresentation.ts`
- `src/components/options/gammaPresentation.test.ts`
- `src/hooks/useOptionsChain.ts`
- `src/hooks/optionsChainAvailability.test.ts`
- `tests/fixtures/distinct-gamma-producer-contract.json`
- `tests/options/profiles-balance-flip.spec.ts`

Preserve existing demo tests and normal own catalog/plan closeout. No Dashboard,
Catalysts, news-sentiment, score or earnings code is included.

## Verification and risks

Preserved author controls and fresh current-MAIN validation prove consumer behavior
against synthetic inputs passed through pinned actual producer/handler contracts.
They do not prove original production payloads, provider delivery or live freshness.
The fresh isolated slice passes60 focused unit controls, the full1,247-test unit
suite,12 browser tests (including existing demo disclosures), types/build and
current moving-MAIN contract verification before admission. Owned lint is clean. Independent required
review remains separate and cannot be replaced by these author checks.

Final admission must confirm source contract identity, unchanged data functions,
query/error/auth boundaries, actual screenshot contents, no new docs-audit findings
and all normal gates. Test controls must discriminate the prior failure, not merely
assert a label or helper unused by the actual view. Normal current-head CODE/SEC
and protected merge remain mandatory within the adjudicated allowance.

Live acceptance requires an authorized rendered-site check of the actual published
source; the parent owns the restored same-project Lovable access and source/branch verification.
The browser DevTools restriction remains binding.
No alternate route is authorized. Backend #1602 collector admission does not block
truthful display of these already-existing fields, and this frontend repair does
not claim to fix upstream empty responses or restore missing snapshots.

Capacity: n/a for new production workload. Same existing bounded chain/grid reads,
query cadence and backend calculations; no added provider/API request or storage.
