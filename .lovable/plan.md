# Restore the complete AI Insights workspace on `/ai-insights-lovable`

## Goal
Redesign the original `/insights` experience without removing its working areas. The new page will keep five visible, first-class tabs—**Briefing, Agents, History, Watchlist, and Chat**—while preserving the decision-first quant workflow already started.

The **Chat** tab will use the evidence-grounded Insights Lab experience from `/insights-lovable`, including saved research, Live/Replay questions, citations, source health, follow-ups, and structured answers. It will not use the basic legacy chat currently embedded in the redesigned page.

## Confirmed current state
- `/insights` has all five tabs and working report, agent, report-history, watchlist, and basic-chat flows.
- `/insights-lovable` has the richer cited research flow, saved sessions, evidence inspection, question restoration, Live/Replay modes, and explicit missing-data states.
- `/ai-insights-lovable` currently shows the redesigned Briefing, but moves Agents, History, and Watchlist into secondary panels and uses the old basic chat at the bottom.
- The top-right ticker selector already controls the shared ticker; no second ticker input is needed.

## Experience structure

```text
AI Insights Lab                                      [Ticker selector]
[Briefing] [Agents] [History] [Watchlist] [Chat]
Live / Replay as of …                    contextual primary action
-------------------------------------------------------------------
Active tab content
```

### 1. Shared command area
- Keep exactly one ticker control: the existing top-right searchable selector.
- Keep the five tabs persistently visible and horizontally scrollable on small screens.
- Show shared Live/Replay context and cutoff once. Each tab uses it where relevant rather than repeating controls.
- Make the primary action contextual: **Re-analyze** in Briefing, **Research** in Chat, and **Generate report** from Watchlist.
- Preserve the selected ticker while switching tabs.

### 2. Briefing tab
- Keep the decision-first layout: direction, conviction, confidence, report age, entry, stop, targets, reward-to-risk, invalidation, and data health.
- Keep the professional candlestick/volume chart with report levels, live quote, prior close, timeframe, volume, and regular-hours controls.
- Follow with concise thesis, bull/bear scenarios, persona plans, catalysts, risks, signals, similar trades, and brief-versus-report agreement.
- Keep unavailable, stale, contradictory, and failed sections visible in context; never substitute zero or hide them.
- Opening a report from History returns here with a clear historical banner and a direct route back to the latest report.

### 3. Agents tab
- Promote the existing agent view to a full tab rather than a drawer.
- Show current-run cost, latency, participating roles, model versions, per-role contribution/cost, and recent runs.
- Separate trader-relevant provenance from administrator-only routing. If routing access is unavailable, show that explicitly without weakening the rest of the tab.
- Add a direct action back to the Briefing decision the agents produced.

### 4. History tab
Create one scannable timeline with two clearly labeled artifact types:
- **Report runs** from the stocks API: direction, conviction, thesis preview, change from the previous call, Live/Replay context, evidence time, and completion health.
- **Research questions** from Insights Lab: the question asked, ticker, verdict preview, Live/Replay context, completion/failed status, evidence time, and update time.

Interactions:
- Opening a report selects that exact report and moves to Briefing.
- Opening a research session restores its exact question, answer, evidence, cutoff, and failure/partial-data state in Chat.
- Filters allow **All / Reports / Research** without splitting history into competing drawers.
- Failed research remains visible with its failure reason and retry action; it never opens as an unexplained blank state.

### 5. Watchlist tab
- Keep the ranked catalyst watchlist, filters, score breakdown, and add-ticker search.
- Selecting a candidate updates the one shared ticker and offers two explicit next steps: **Generate briefing** or **Ask a research question**.
- Generate briefing opens Briefing and runs live analysis; research opens Chat with a ticker-specific suggested question.
- Ranking errors, empty data, and unavailable catalyst inputs remain explicit.

### 6. Chat tab: integrate Insights Lab
- Reuse the `/insights-lovable` research workflow as a reusable workspace instead of copying its state or API calls.
- Include question composer, suggested questions, Live/Replay cutoff, progress, Stop, structured answer, verdict/confidence, key levels, bull/bear case, invalidation, catalysts, unknowns, follow-ups, citations, evidence drawer/rail, live quote, and saved-session restoration.
- Remove the duplicate chart from Chat because Briefing owns the full trading chart; retain the compact authoritative quote box in each answer.
- Chat uses the shared ticker for new research. A restored historical session stays visibly frozen to its original ticker and evidence boundary until the user chooses **Start new research**.
- Suggested questions stay visible after opening history and adapt to the current report/data gaps when available.
- Keep the question asked visible above every restored answer.

## Component and data approach
- Introduce a route-level tab controller in `AiInsightsLovablePage` for `briefing | agents | history | watchlist | chat`.
- Extract the reusable Insights Lab body from `InsightsLovablePage` into a focused research workspace that accepts shared ticker/context and callbacks; keep `/insights-lovable` behavior unchanged through a thin page wrapper.
- Continue using the existing report hooks, watchlist hooks, candlestick chart, agent panel, and research hook rather than adding parallel data paths.
- Remove the redesigned route’s dependency on the legacy `ChatView`; do not alter `/insights` to support this route.
- Keep stocks as the source of truth for market evidence and report math. Keep the existing research service for private Q&A session persistence and AI orchestration.
- No new financial calculations or fabricated fallback values are introduced.

## States and responsive behavior
- Every tab has purposeful loading, empty, partial, failed, signed-out, and restored-history states.
- Desktop keeps the tab content wide and dense; evidence may use a right rail.
- Mobile preserves the same five tabs, one ticker selector, stable chart height, no horizontal page overflow, and bottom sheets for evidence—not hidden core navigation.
- Switching tabs, reports, research sessions, or tickers keeps keyboard focus predictable and announces loading/completion states.

## Verification
- Unit tests for tab/context state, unified-history ordering/type labels, and session/report selection behavior.
- Existing decision/data-health and chart-adapter tests remain.
- Hermetic browser tests verify:
  1. all five tabs are visible and functional;
  2. only one ticker picker exists;
  3. a historical report opens in Briefing and returns to latest;
  4. a saved research question opens in Chat with its question, answer, evidence, and cutoff restored;
  5. a new Chat question streams a cited structured answer and supports a follow-up;
  6. Watchlist can route a ticker to Briefing or Chat;
  7. failed/partial sources and failed sessions stay explicit;
  8. mobile and desktop screenshots cover every tab without overflow;
  9. `/insights` and `/insights-lovable` retain their current behavior.
- Run focused unit tests, the three Insights browser suites, lint, and the repository build/gate commands required by the delivery process.

## Delivery requirement
This changes the approved interaction model, so implementation starts with a **superseding FEAT-INSIGHT-001 feature spec** that names the five-tab contract and integrated Chat behavior. That spec must complete the repository’s required approval and spec-only review step before source or backend changes continue.
