# Options Flow — backend data contract (Skylit-aligned UI)

**Last reviewed:** unknown · **Last scanned:** 2026-09-16 · **Owner:** TBD

The redesigned Options Flow page (`src/routes/OptionsFlowPage.tsx`) follows
Skylit's product model. Three views are **real-data backed today**; two are
built against **labeled demo mocks** because no backend endpoint exists yet.
This doc specifies the endpoints needed to make the mocked views real.

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

**The Flip on Profiles and Swing is the balance price, not the zero-gamma
level** (TeneikaAskew/solyra#89). `/levels` returns two levels:
`gamma_balance`, the cumulative-net-gamma balance price (formerly mislabeled
`flip`), and `gamma_flip`, the Black-Scholes zero-gamma level that divides the
regimes (`src/hooks/useGammaLevels.ts:45-49`). Swing sets its Flip to
`levels.gamma_balance ?? grid?.gamma_flip` (`SwingMode.tsx:843`), so whenever
`/levels` returns a balance price, the Legend's Flip chip, the node list's Flip
row (marked zero-gamma, `SwingMode.tsx:522-523`) and the dashed flip row on the
heatmap show it. They show the grid's `gamma_flip` only when `/levels` has no
balance price or no data (`SwingMode.tsx:843`, `:880`). Profiles' Gamma Flip card shows
`gamma_balance`, falling back to the Greeks endpoint's `metrics.zero_gamma`
(`ProfilesTab.tsx:307`, `:512-515`), and its ⇅ Flip chips list
`gamma_balance_levels` (`ProfilesTab.tsx:568-575`). Until solyra's mapping
reads `gamma_flip`, read the Flip on Profiles and Swing as the balance price.

Section (A) below proposed a `/surface` endpoint to make Swing real. The grid
endpoint already ships that (per-cell GEX, VEX and open interest by strike and
expiration; `/surface` is not in the vendored OpenAPI snapshot,
`tests/fixtures/stocks-openapi.json`), so (A) is superseded. It stays below for
the record; do not build it.

| View | Tab · Mode | Data today | Real source needed |
|------|-----------|-----------|--------------------|
| GEX/VEX profile | Profiles | **Real** — `/api/options/dates/{t}` (date list, `useAllOptionsDates`), `/api/options/{t}/{date}` with `/api/options/live/{t}/{date}` as the 404 fallback (chain, via `ProfilesTab.tsx`'s local `useOptionsData`), `/api/options/{t}/{date}/levels` (`useGammaLevels`) + `POST /api/options/greeks`. The Gamma Flip card and the ⇅ Flip chips show the balance price (see the note above) | Read `gamma_flip` for the Flip, a solyra fix (TeneikaAskew/solyra#89) |
| Trinity 3-panel | Gamma Map · Trinity | **Real** — `/api/options/dates/{t}?limit=1` (`useLatestOptionsDate`, which gates the query) + `useGammaLevels` for SPX/SPY/QQQ | — |
| Swing 2D heatmap | Gamma Map · Swing | **Real** — live mode (the default) reads the date-less `/api/options/{t}/grid` and does not wait on a date (`useGammaGrid`, `SwingMode.tsx:804-807`); historical mode reads `/api/options/{t}/{date}/grid` once the `?limit=1` date resolves; `useGammaLevels` waits on that date in both modes. Illustrative only, from `src/data/gammaMapMock.ts`: the tactical-read card, the Legend's Hedge chip and the node list's Midpoint/Hedge rows (see the note above). The Flip chip, the node list's Flip row and the dashed flip row show the balance price whenever `/levels` returns one (see the note above) | Hedge and Midpoint nodes for Swing, and a source for the tactical read (see the note above); read `gamma_flip` for the Flip, a solyra fix (TeneikaAskew/solyra#89) |
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
banner stays: it still has to disclose the tactical read, and ought to cover
the Hedge and Midpoint nodes too (see the note at the top).
