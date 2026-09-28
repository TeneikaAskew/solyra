# Options Flow — backend data contract (Skylit-aligned UI)

**Last reviewed:** 2026-09-28 · **Depth:** verified · **Against:** `956dd9092f33` · **Last scanned:** 2026-09-28 · **Owner:** TBD

The redesigned Options Flow page (`src/routes/OptionsFlowPage.tsx`) follows
Skylit's product model. Three views are **real-data backed today**; two are
built against **labeled demo mocks** because no backend endpoint exists yet.
This doc specifies the endpoints needed to make the mocked views real.

**Corrected 2026-09-28 — Swing was misclassified as mock.** `SwingMode.tsx`'s
heatmap grid and pivot rail are real (`useGammaGrid` → `/api/options/{ticker}/grid`
or `/api/options/{ticker}/{date}/grid`, combined with `useGammaLevels` for the
King/Gate/Flip node taxonomy) — the component's own comment calls the grid
"the centerpiece (real /grid)". Real is not "entirely real", though: the
`TacticalCard` overlay stays illustrative (the on-screen banner says so —
"Tactical read is illustrative"), and separately, the Legend and node list
also mix in mock Midpoint and Hedge chips from `gammaMapMock.ts`'s `HS.nodes`
whenever real `/levels` data is present — `SwingMode.tsx`'s own comment says
why: "Midpoint / Hedge nodes have no backend source — show them only
alongside the real /levels taxonomy, never as mock next to a grid-derived
overlay." That is a deliberate, permanent design choice (no backend for
these two node types is proposed anywhere in this doc), not a gap to close.
§A below, which
proposed a `/surface` endpoint to make Swing real, is superseded by the grid
endpoint that already ships this — combining `/grid`'s per-cell GEX/VEX with
`/levels`'s node taxonomy covers everything §A asked for. Left below for
the record rather than deleted; do not build it.

| View | Tab · Mode | Data today | Real source needed |
|------|-----------|-----------|--------------------|
| GEX/VEX profile | Profiles | **Real** — `/api/options/dates/{t}` (date list), `/api/options/{t}/{date}` + `/api/options/live/{t}/{date}` fallback (chain, via `ProfilesTab.tsx`'s local `useOptionsData`), `/api/options/{t}/{date}/levels` (taxonomy) + `POST /api/options/greeks` | — |
| Trinity 3-panel | Gamma Map · Trinity | **Real** — `/api/options/dates/{t}?limit=1` (via `useLatestOptionsDate`, gates the query) + `useGammaLevels` for SPX/SPY/QQQ | — |
| Swing 2D heatmap | Gamma Map · Swing | **Real** — same `/api/options/dates/{t}?limit=1` gate, then heatmap/grid (`useGammaGrid` + `useGammaLevels`); tactical-read overlay only is illustrative, from `src/data/gammaMapMock.ts` | — |
| Live flow tape | Flow · Live Feed | Mock `src/data/optionsFlowMock.ts` | **(B)** options-flow feed |
| Contract drilldown | Flow · Drilldown | Mock `src/data/contractDrilldownMock.ts` | **(C)** per-contract tape |

## (A) Per-expiration dealer-exposure surface — Swing Mode — SUPERSEDED, do not build

**Do not build this.** Written when Swing's grid was still mocked; the real
`/grid` endpoint (`useGammaGrid.ts`) now returns per-cell (strike ×
expiration) GEX/VEX/OI directly, and `/levels` (`useGammaLevels.ts`) already
supplies the node (King/Gate/Flip) taxonomy this proposal's `nodes` field
duplicates. Kept for the record, not as a spec to implement:

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
TanStack Query hook and remove that view's demo banner. Swing's own banner
stays — it correctly labels only the tactical-read overlay as illustrative,
and that overlay has no proposed real source in this doc.
