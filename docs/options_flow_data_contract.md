# Options Flow — backend data contract (Skylit-aligned UI)

**Last reviewed:** unknown · **Last scanned:** 2026-10-12 · **Owner:** TBD

The redesigned Options Flow page (`src/routes/OptionsFlowPage.tsx`) follows
Skylit's product model. Three views are **real-data backed today**; two are
built against **labeled demo mocks** because no backend endpoint exists yet.
This doc specifies the endpoints needed to make the mocked views real.

## Current Gamma and Profiles binding (2026-10-30 source)

Gamma renders actual independently dated grid and levels responses. Static SPY Hedge/Midpoint values and Tactical scenarios are removed; Tactical is explicitly unavailable for the selected symbol because no backend narrative is supplied. No guessed replacement node or price is inserted. Flow's separately labelled Demo feed/drilldown remains unchanged.

Both views bind Flip to the nullable backend `gamma_flip`, independently of `gamma_balance`; actual zero, source dates and request/error recovery remain distinct. Profiles renders a GEX strike chart only in GEX mode. VEX uses the supplied `total_vex` (including zero), but explicitly says per-strike VEX is unavailable because the response provides no VEX strike profile. It does not relabel `gex_by_strike` or compute replacement financial values. These source changes require separate deployment verification.

## Historical findings — preserved 2026-10-11 observation

The following findings describe the earlier observed source, not the current binding. #301 corrected flip/error/freshness binding; the production-field-truth successor addresses #87/#93 without rewriting this provenance.

**Corrected 2026-10-11: Swing was misclassified as mock.** `SwingMode.tsx`'s
heatmap grid and pivot rail are real. `useGammaGrid` reads
`/api/options/{ticker}/grid` (or `/api/options/{ticker}/{date}/grid`) and
`useGammaLevels` supplies the King and Gate nodes and the node labelled Flip,
which is the balance price (see below); the component's header
comment says "The 2D heatmap grid is REAL". It is not entirely real, though.
The tactical-read card is illustrative (the banner says "Tactical read is
illustrative"), and the Legend's Hedge chip and the node list's Midpoint and
Hedge rows come from `HS.nodes` in `src/data/gammaMapMock.ts` whenever real
`/levels` data is present. The schema already has room for both:
`GET /api/options/{ticker}/nodes` and `/api/options/{ticker}/{date}/nodes`
declare `midpoints` and `hedge_nodes` in `GammaNodesResponse`
(`tests/fixtures/stocks-openapi.json`). But stocks `main` returns both as empty
arrays: `_build_nodes_payload` in
[`platform/api/routers/grid.py`](https://github.com/TeneikaAskew/stocks/blob/main/platform/api/routers/grid.py)
defers midpoints and leaves hedge nodes waiting on an `economic_events` join.
Nothing in the app reads `/nodes` either (`src/mocks/options.ts:66` says so).
Midpoints are computed today only by `POST /api/options/greeks`
(`nodes.midpoints`, from `detect_nodes` in
[`lib/gamma.py`](https://github.com/TeneikaAskew/stocks/blob/main/lib/gamma.py)),
which Profiles already reads. Hedge nodes have no source anywhere, so replacing
`HS.nodes` needs work in stocks first. Until then the banner labels only the
tactical read, and those chips and rows render unlabeled.

**The Flip on Profiles and Swing is the balance price or the strikes beside
it, not the zero-gamma level** (TeneikaAskew/solyra#89). `/levels` returns two
levels (`src/hooks/useGammaLevels.ts:45-49`): `gamma_balance`, the gamma-median
balance price, with half the chain's absolute gamma below it and half above
(formerly mislabeled `flip`; `compute_gamma_balance` in stocks `lib/gamma.py`),
and `gamma_flip`, the Black-Scholes zero-gamma level that divides the regimes. Swing sets its Flip to
`levels.gamma_balance ?? grid?.gamma_flip` (`SwingMode.tsx:843`), so whenever
`/levels` returns a balance price, the Legend's Flip chip, the node list's Flip
row (marked zero-gamma, `SwingMode.tsx:522-523`) and the dashed flip row on the
heatmap show it. They show the grid's `gamma_flip` only when `/levels` has no
balance price or no data (`SwingMode.tsx:843`, `:880`). Profiles' Gamma Flip
card shows `gamma_balance`, falling back to the Greeks endpoint's
`metrics.zero_gamma` (`ProfilesTab.tsx:307`, `:512-515`). Its ⇅ Flip chips
show the strikes on either side of the balance price instead: one chip per
entry in `gamma_balance_levels`, which stocks fills with the nearest strike at
or below the balance price and the nearest at or above it (`classify_levels` in
[`lib/gamma.py`](https://github.com/TeneikaAskew/stocks/blob/main/lib/gamma.py)).
The typed mock has a 219.5 balance and a 219 chip (`src/mocks/options.ts:204`,
`:217`). Each chip is titled "Adjacent to flip @" with the balance price
(`ProfilesTab.tsx:568-575`). Until solyra's mapping reads `gamma_flip`, read
the Flip on Swing and Profiles' Gamma Flip card as the balance price, and
Profiles' Flip chips as the strikes beside it.

Section (A) below proposed a `/surface` endpoint to make Swing real. The grid
endpoint already ships that (per-cell GEX, VEX and open interest by strike and
expiration; `/surface` is not in the vendored OpenAPI snapshot,
`tests/fixtures/stocks-openapi.json`), so (A) is superseded. It stays below for
the record; do not build it.

## Current view sources

| View | Tab · Mode | Data today | Real source needed |
|------|-----------|-----------|--------------------|
| GEX/VEX profile | Profiles | **Real** chain via `useOptionsChain`, existing `/levels` and `POST /api/options/greeks`; distinct nullable flip/balance. GEX strike chart; actual VEX total with explicit unavailable per-strike profile. | No per-strike VEX contract exists; do not derive or relabel one. |
| Trinity 3-panel | Gamma Map · Trinity | **Real** — `/api/options/dates/{t}?limit=1` (`useLatestOptionsDate`, which gates the query) + `useGammaLevels` for SPX/SPY/QQQ | — |
| Swing 2D heatmap | Gamma Map · Swing | **Real** existing live/historical grid and independently dated levels. No mock Hedge/Midpoint values or Tactical scenarios. | Tactical remains explicitly unavailable; no backend narrative is supplied. |
| Live flow tape | Flow · Live Feed | Mock `src/data/optionsFlowMock.ts` | **(B)** options-flow feed |
| Contract drilldown | Flow · Drilldown | Mock `src/data/contractDrilldownMock.ts` | **(C)** per-contract tape |

## (A) Per-expiration dealer-exposure surface — Swing Mode — SUPERSEDED, do not build

**Do not build this.** It was written when Swing's grid was still mocked. The
real grid endpoint (`useGammaGrid.ts`) now returns per-cell (strike ×
expiration) GEX, VEX and open interest, and `/levels` (`useGammaLevels.ts`)
already supplies the King and Gate nodes; both it and the grid response
return the spot price that the proposal's `spot_row` marks. So this
proposal's `nodes` field, `{ king, gates, spot_row }`, duplicates what
ships. Kept for the record, not as a spec to implement:

The current chain endpoints return a single snapshot collapsed across
expirations, so per-cell (strike × expiration) GEX/VEX can't be computed
client-side. Proposed:

```
GET /api/options/{ticker}/{date}/surface?metric=gex|vex
→ {
    ticker, date, spot, spot_method,
    expirations: [{ label, date, dte }],         # columns
    strikes: [number],                            # rows (desc)
    cells: [{ strike, expiration, gex, vex,       # $ exposure per 1% move
              call_oi, put_oi, dominant: "call"|"put" }],
    nodes: { king: number, gates: number[], spot_row: number }
  }
```
Compute server-side in `lib/gamma.py` (one source of truth for the math),
grouping the chain by `expiration` before the existing per-strike GEX/VEX
reduction. Color semantics per Skylit docs: **yellow = vol-suppressing (Pika,
positive/pinning)**, **purple = vol-amplifying (Barney, negative gamma)**.

## (B) Options-flow feed — Live Feed
No order-flow source exists in the pipeline today. Needs a trade-tape provider
(sweeps/blocks/splits) persisted to a `options_flow` table, then:

```
GET /api/flow/feed?tickers=&min_premium=&dte_max=&side=&sentiment=&limit=
→ [{ ts, sym, strike, cp, otm_pct, expiry, dte, price,
     bid, mid, ask, side, sentiment, size, chain_side, chain_pct,
     premium, is_sweep }]
```

## (C) Per-contract tape — Contract Drilldown
Drill-in from a Live Feed row. Needs the same flow source bucketed per contract:

```
GET /api/flow/contract/{occ_symbol}?window=
→ { contract: { sym, strike, cp, expiry, dte },
    stats: { volume, oi, avg_fill, total_premium, otm_pct, multi_pct },
    chain_ratio: { bid_pct, ask_pct, bid_premium, ask_premium },
    buckets: [{ ts, bid, mid, ask, no_side, avg_fill, iv, rvol,
                volume, bid_premium, mid_premium, ask_premium }] }
```

When (B) or (C) lands, swap the matching `src/data/*Mock.ts` import for a
TanStack Query hook and remove the "Demo data" banner in that view. Swing's
banner reports actual source availability; Tactical is unavailable and mock Hedge/Midpoint values are removed. The historical disclosure gap above remains a dated receipt.
