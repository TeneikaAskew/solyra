---
feat_id: FEAT-OPTION-001
req_ids: [REQ-UX-001, REQ-MARKET-001, REQ-DATA-001, REQ-DATA-003, REQ-FRESH-001, REQ-FRESH-002]
issues: []
canvases: []
done_when:
  - "src/components/options/gammaPresentation.test.ts and src/lib/time.test.ts prove the recorded snapshot time renders as a full Eastern date and time with its zone (EST and EDT, midnight Eastern and both 2026 DST changes), as unavailable for a missing, naive or invalid timestamp, and with no age for a timestamp_future provenance"
  - "tests/options/snapshot-labels.spec.ts drives the actual options screen with intercepted fixture responses and proves that present grid and levels data with snapshot_provenance, a prior-session REALTIME origin, and an old payload without the object each show the label Stored options snapshot — freshness and completeness unverified with the recorded snapshot time, and never LIVE wording, a live pulse, 5-min snapshot or live dealer exposure in the source pill or exposure banner"
  - "tests/options/snapshot-labels.spec.ts proves null and invalid provenance timestamps render the recorded time as unavailable, a future timestamp shows no age, the unavailable envelope, loading and error states never show the stored snapshot label, and a warm client cache keeps the recorded snapshot time; a screenshot of each state is attached to the PR"
  - "npm run contract:check passes after npm run contract:sync from stocks main, src/mocks/contract.test.ts validates mocks that carry snapshot_provenance, and tsc -b, the full vitest run, lint and npm run build pass; the FEAT-OPTION-001 catalog row lists the PR"
status: approved
supersedes: null
---

# Stored options snapshot labels on the Gamma Map screen

## Contract and authority

Dependency: stocks spec `docs/superpowers/specs/2026-11-05-feat-option-001-snapshot-labels-acceptance.md`
(status approved, on stocks main), which supersedes the 2026-10-24 legacy snapshot labels
spec that the owner approved on October 24, 2026. Its implementation, stocks PR 1724, is
merged to stocks main at `bd88fa457cf73404419ef7d87dab5b2187f71a7e`. That spec moves the
Solyra screen evidence to this repository: "That Solyra PR carries the Playwright tests and
screenshots as its acceptance evidence. Until it merges and its screenshots are recorded,
Solyra's options screen is not called fixed." This spec is that Solyra consumer slice. It
carries the stocks spec's "Design: visible consumer" section and its Solyra Playwright
bullet forward unchanged in substance and adds no decision of its own.

The wire contract is `SnapshotProvenance`, nullable as `snapshot_provenance` on
`GammaGridResponse` and `GammaLevelsResponse` (both live and dated routes):
`provider`, `market_session`, `snapshot_ts` (aware UTC or null), `observed_at`,
`snapshot_age_seconds` (integer or null), `freshness_status` and `completeness_status`
(always `unknown`), and `reason` (`legacy_snapshot_unqualified`, `timestamp_invalid` or
`timestamp_future`). The unavailable envelope carries `snapshot_provenance: null`.

## Design: visible consumer

`useGammaGrid.ts` and `useGammaLevels.ts` declare the additive nullable object; their
fetch, cache and retry behaviour is unchanged. Unavailable, loading and error states take
precedence: an empty or failed result is never described as a stored snapshot, and the
label applies only to present snapshot data.

`SwingMode.tsx`'s SourcePill and its source-derived exposure banner render
"Stored options snapshot — freshness and completeness unverified" with the recorded
snapshot time as a full Eastern date and time including the zone (EST or EDT), described
as the recorded snapshot time. The origin (`market_session`, or the route's
`data_source` on an older payload) is shown as plain neutral text. A REALTIME origin does
not trigger LIVE wording, a pulse, a green live colour, "5-min snapshot" or live dealer
exposure wording. The pill uses one neutral style for every present snapshot.

Clock rules:

- Provenance present: the recorded time is `snapshot_ts`; null or not an aware instant
  renders "unavailable". The age shown is the server's `snapshot_age_seconds`, labelled
  with the `observed_at` it was measured at, and only when `reason` is
  `legacy_snapshot_unqualified`. A `timestamp_future` snapshot keeps its recorded time,
  says it is later than the response time, and shows no age. The client never computes
  an age from its own clock and never shows a zero age it was not given.
- Provenance absent or null on present data (an older server or an old cached body):
  the same neutral label, with the existing `snapshot_ts` (grid) or `snapshot_timestamp`
  (levels) shown only when it is an aware instant, otherwise "unavailable". No age.
- The levels note under the toolbar uses the same rules for the levels response.

The client cache keeps the response body as served, so a warm cache shows the recorded
time and the age as of that response's `observed_at`, never a newer one.

## Scope and limits

Files: `src/hooks/useGammaGrid.ts`, `src/hooks/useGammaLevels.ts`,
`src/components/options/SwingMode.tsx`, `src/components/options/gammaPresentation.ts`
and its test, `src/lib/time.ts` and its test, `src/index.css` (one neutral pill style),
the options mocks and E2E fixtures, existing options specs whose expected text changes,
the new `tests/options/snapshot-labels.spec.ts`, the vendored contract and generated types
from `npm run contract:sync`, the FEAT-OPTION-001 catalog row and the plan.

Non-goals: no Gamma, Greeks or exposure math; no new request, polling, retry or cache
policy; no freshness or completeness classification; no ProfilesTab or TrinityTab change;
no deployment, and no claim about the deployed site. Playwright runs are hermetic with
intercepted fixtures and no provider or production network access.

## Risks

Older servers and old cached bodies lack the object: covered by the old-payload state.
Microsecond ISO strings from the API: covered by the time helper tests. A long pill on
narrow screens: the existing options mobile-fit spec must stay green.
