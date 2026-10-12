# Redesign /ai-insights-lovable as a new version of /insights

## What went wrong
`/ai-insights-lovable` was built as a copy of the Q&A page (`/insights-lovable`). It should have been a redesign of the original **AI Insights** page (`/insights`): the multi-agent dossier with Briefing, Agents, History, Watchlist and Chat. This plan replaces the current page contents. `/insights` and `/insights-lovable` stay unchanged.

## Design read
Trading tool UI for active swing and intraday traders. Calm, dense, dark "quant desk" style. Every screen answers three things: **what is the call, what do I do, what would make me wrong**. Same data as `/insights`, same stocks API, no new backend.

## New page structure (top to bottom)

```text
[Ticker picker (top right)]  [Live | Replay as of ...]  [Re-analyze]   run status
-----------------------------------------------------------------------------
DECISION BAR (sticky)
  LONG / SHORT / NEUTRAL  .  conviction  .  confidence  .  horizon  .  report age
  Entry zone | Stop | T1 T2 | R:R      [Copy plan] [Add to journal] [Set alert]
  Data health: 9/11 sections ok  (failed ones named, tap for reason)
-----------------------------------------------------------------------------
LEFT (wide)                                 | RIGHT (narrow rail)
 Candlestick chart (TradingView style)      |  Brief vs AI agreement
  with entry / stop / targets / key levels  |  Catalysts timeline (next first,
  drawn as price lines                      |   countdown, tap to see on chart)
 Thesis (3 lines, "Read full thesis")       |  Risk flags, highest severity first
 Bull vs Bear side by side + invalidation   |  Supporting signals (top 5)
 Persona plans as tabs (scalper/swing/...)  |  Similar past trades + outcomes
-----------------------------------------------------------------------------
Bottom dock: Ask about this report (chat, prefilled prompts tied to the report)
```

Secondary views move out of the main tab row:
- **History**: a slide-over listing past runs with direction change badges (e.g. "Neutral to Long"), so a trader sees how the call evolved; tap opens it with a clear "Viewing past report, back to latest" banner.
- **Agents**: a "How the AI decided" drawer opened from the decision bar (agent votes and cost per role).
- **Watchlist**: a compact ranked strip above the page ("Next up: 3 tickers ready to analyze") that switches ticker and runs analysis.

## UX rules applied
- Decision first, explanation after; progressive disclosure for long text.
- Every number has an action next to it (copy, chart it, alert, journal).
- Missing or failed data is shown in place with the reason, never hidden or shown as 0.
- Clear states for loading (skeleton matching layout), no report yet (one "Generate report" action), running (step progress), and errors.
- Mobile: single column; decision bar and actions stay pinned; rail sections become collapsible below the chart.
- One accent, existing theme tokens, consistent radius, no decorative clutter.

## Technical section
- Rewrite `src/routes/AiInsightsLovablePage.tsx` using the `/insights` hooks (`useInsightReport`, `useInsightHistory`, `useInsightReportById`, `useBriefDirection`, `useRefreshInsight`, `useRunStatus`) and the existing `TickerCombobox`.
- New presentational pieces under `src/components/insights/redesign/`: `DecisionBar`, `PlanActions`, `DataHealthChip`, `ThesisBlock`, `CatalystRail`, `HistorySheet`, `AgentsSheet`, `WatchlistStrip`. Reuse `ReportCards` pieces where they fit (`RiskFlagsCard`, `SignalsCard`, `SimilarTradesCard`, `PersonaPlansCard`) and reuse `AgentsPanel`, `WatchlistPanel`, and the existing chat logic.
- Chart: reuse `ResearchCandleChart` / `CandlestickChart`, passing entry/stop/targets/key levels as price lines and catalyst dates as markers.
- R:R comes from the existing `src/lib/risk.ts`; no new financial math. Null values render as an em-dash with an "unavailable" note.
- "Add to journal" and "Set alert" only link to existing features if they exist; otherwise they are left out rather than faked.
- Tests: unit tests for the decision bar and data health (null stays null, failed sections listed); update the hermetic Playwright spec for `/ai-insights-lovable` with screenshots (desktop + mobile) for report, no report, failed sections and historical states.
- Remove the Lovable Cloud research code from this page only; `/insights-lovable` keeps it.
