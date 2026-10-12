---
feat_id: FEAT-INSIGHT-001
req_ids: [REQ-UX-001, REQ-ACCESS-001, REQ-DATA-001, REQ-DATA-002, REQ-DATA-003, REQ-FRESH-001, REQ-AUTH-001, REQ-TENANCY-001, REQ-SECRET-001]
issues: [827, 867, 1215, 1216]
canvases: []
done_when:
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves /ai-insights-lovable exposes functional Briefing, Agents, History, Watchlist, and Chat tabs while rendering exactly one shared ticker selector"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves Briefing retains the decision bar, professional candlestick and volume chart, live and prior-close references, report levels, data health, complete dossier sections, and historical-report return flow"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves Agents renders current-run provenance and recent runs, and preserves an explicit unavailable state when administrator-only routing cannot be read"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves the unified History tab distinguishes report runs from research questions and restores the selected artifact's exact report or research state"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves Watchlist can send a selected ticker to a live Briefing generation or a ticker-specific research question without duplicating ticker state"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves Chat streams a cited structured research answer, shows the question asked and evidence health, supports follow-ups and Stop, and restores a saved Live or Replay session"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves failed research, partial evidence, stale or conflicting sources, missing report sections, signed-out access, and dependency errors remain explicit without deleting the last completed artifact"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts screenshots show every tab without page, chart-toolbar, rail, drawer, sheet, or popup overflow at 390px, 411px, tablet, and desktop widths"
  - "tests/insights/insights.spec.ts and tests/insights-lovable/insights-lovable.spec.ts prove /insights and /insights-lovable retain their existing behavior"
  - "Unit tests prove unified-history ordering and artifact labels, shared Live/Replay context, decision data health, and research-session selection without fabricated financial values"
  - "02-FEATURE-CATALOG FEAT-INSIGHT-001 row shows the reviewed status, /ai-insights-lovable, and this PR"
status: draft
supersedes: docs/superpowers/specs/2026-10-11-feat-insight-001-ai-insights-lovable.md
---

# Complete AI Insights workspace

## Problem

The approved `/ai-insights-lovable` comparison route was meant to redesign the original `/insights` product while adding the cited research strengths of `/insights-lovable`. Its current implementation instead turns the redesigned Briefing into one long page, demotes Agents, History, and Watchlist to secondary sheets, and embeds the original uncited `/api/insights/chat` widget at the bottom. The five working areas visible on `/insights`—Briefing, Agents, History, Watchlist, and Chat—are no longer first-class or easy to discover, and the Chat surface is not the evidence-grounded Insights Lab experience the user requested.

The route must become one coherent AI decision workspace for active traders: preserve all five working areas, lead with actionable market state, keep one shared ticker and replay context, and integrate the cited research-session flow without hiding unavailable or contradictory data.

## Non-goals

- Do not replace, redirect, or behaviorally redesign `/insights` or `/insights-lovable`.
- Do not add broker connectivity, order entry, alerts, journal writes, or claims that a trade was executed.
- Do not duplicate indicators, STRAT classification, catalyst scoring, risk/reward, replay clipping, or other financial math in the frontend or research function.
- Do not add a second ticker selector, a second user-facing authentication flow, or a second research-session data path.
- Do not merge structured report history and research-session history into an ambiguous record type; each artifact keeps its source and open behavior.
- Do not show chain-of-thought. Agents exposes operational provenance, roles, models, latency, cost, and saved run outputs only.
- Do not infer prices, timestamps, market sessions, report fields, source freshness, or evidence completeness when the backend does not supply them.
- Do not move administrator model-routing edits into the trader workspace.

## Approaches considered

1. **Keep the single scrolling dossier and add larger sheet buttons:** lowest effort, but core workflows remain hidden and Chat remains disconnected from saved cited research.
2. **Copy the entire `/insights-lovable` page into a Chat section:** visually complete at first, but duplicates ticker, Live/Replay, session, and evidence state and guarantees future drift.
3. **Compose a five-tab route around shared report components and an extracted research workspace:** chosen because it restores the original product's discoverability, keeps one source of state, preserves both existing routes, and reuses the current report and research contracts instead of creating parallel integrations.

## Design

### Shared workspace shell

`/ai-insights-lovable` presents five persistent tabs in this order: Briefing, Agents, History, Watchlist, and Chat. The tab row remains visible and horizontally scrollable on narrow screens. A single top-right `TickerCombobox` owns ticker changes for new work. Shared Live/Replay context and its cutoff appear once in the command area; individual tabs consume that context instead of rendering competing controls.

The primary action follows the active task: Re-analyze or Run replay in Briefing, Research or Stop in Chat, and candidate-specific Generate briefing or Ask research in Watchlist. Changing tabs preserves ticker and cutoff. Changing ticker clears a selected historical report but never silently rewrites a restored frozen research session.

### Briefing

Briefing keeps the decision-first dossier already introduced: direction, conviction, confidence, report age, entry range, stop, targets, backend-supplied reward-to-risk, invalidation, and data-health status lead the view. The professional `lightweight-charts` candlestick and volume chart follows with live price, prior close, same-run report levels, timeframe, volume, and regular-hours controls.

The remaining dossier is ranked for action: brief-versus-report agreement, key levels, concise thesis, bull and bear scenarios, STRAT/FTFC state, persona plans, catalysts, risk flags, supporting signals, similar historical trades, and report provenance. Missing and failed sections remain in place with their reason. Opening an older report from History returns to Briefing with a prominent historical state and a Back to latest action.

### Agents

Agents is a full tab using the existing report envelope and agent-run data. It shows current-run as-of time, latency, total cost, participating roles, model versions, per-role cost, and recent report runs. Trader-relevant provenance is available to all permitted users. Administrator-only routing is visually separated; a denied or unavailable routing request states that limitation while leaving the rest of the tab intact. A clear action returns to the Briefing decision produced by the run.

### Unified History

History is one timeline with explicit artifact labels and filters for All, Reports, and Research:

- **Report run:** ticker, direction, conviction, thesis preview, Live/Replay context when supplied, change from the prior call, evidence/as-of time, cost when supplied, and completion health. Selecting it loads that exact report and opens Briefing.
- **Research question:** ticker, exact question or saved title, verdict preview when supplied, Live/Replay context, completed/failed/cancelled state, evidence time, and updated time. Selecting it restores the exact saved question, answer, sources, replay cutoff, and failure or partial-data state in Chat.

A failed research item remains selectable and explains why it failed. Retrying starts a fresh run from the same question and boundary; it does not overwrite the failed record or remove the last completed answer.

### Watchlist

Watchlist remains a full ranked-candidate workspace with catalyst filters, ticker search/add, rank score, catalyst labels, and expandable score contribution. A candidate exposes two unambiguous actions:

- **Generate briefing:** update the shared ticker, open Briefing, clear historical report selection, and start a live report run.
- **Ask research:** update the shared ticker, open Chat, and prefill a ticker-specific evidence question without submitting it automatically.

A report replay cutoff never leaks into watchlist-driven live generation. Empty ranking, unavailable catalyst input, rejected add, and ranking request failures remain explicit.

### Chat and cited research

The evidence-grounded flow from `/insights-lovable` becomes Chat through a reusable research-workspace component rather than page duplication. It uses the existing `useInsightsLovable` state and research-function contract for private session listing, session restoration, NDJSON progress, cancellation, structured answers, and evidence snapshots.

For new work, Chat consumes the shared ticker and Live/Replay boundary. It includes suggested questions, question composer, progress, Stop, structured verdict and confidence, concise answer, cited key levels, bull and bear cases, invalidation, key facts, catalyst timeline, replay context, unknowns/data gaps, contextual follow-ups, copy, evidence inspection, and an authoritative quote box in Live mode. Briefing owns the full candlestick chart, so Chat does not render a second chart.

A restored research session is frozen to its saved ticker, mode, cutoff, answer, and sources. The UI labels that frozen context and offers Start new research to return to shared current state. The exact question asked is always visible above its answer. Suggested questions remain available after restoration and may reflect the current report's failed sections or contradictions. Evidence citations open the matching source and source health distinguishes current, stale, no matching data, invalid response, conflicting evidence, unavailable dependency, and request failure.

### Component boundaries

- `AiInsightsLovablePage` owns the five-tab selection, shared ticker, report replay cutoff, selected report, and cross-tab navigation intents.
- A focused reusable research workspace owns research composer, answer, evidence, and saved-session state. `InsightsLovablePage` becomes a thin wrapper around it so its current route behavior remains unchanged.
- Existing report hooks, watchlist hooks, `ResearchCandleChart`, `AgentsPanel`, report cards, research hook, and typed contracts remain authoritative.
- The redesigned route removes its dependency on `ChatView` from `InsightsPage`; `/insights` keeps its current basic chat unchanged.
- The stocks API remains the source of truth for financial evidence and report math. The existing research function remains the persistence and AI-orchestration boundary. No new backend is required unless implementation discovers a contract that cannot represent the approved states; any such contract change stops for a separate approved spec.

### Responsive and accessible behavior

Desktop uses the established dense Obsidian Analyst workspace with a wide task area and a restrained evidence rail where appropriate. Mobile keeps the same five tabs, the one top-right ticker selector, readable decision hierarchy, stable chart height, horizontally scrollable chart controls, and viewport-contained evidence sheets. Core navigation is never hidden in a sheet.

Tabs use standard tab semantics and keyboard navigation. Focus moves predictably after tab, ticker, report, or session changes. Loading and completion states use live announcements. Every control has a visible focus state and accessible name. Motion respects reduced-motion preferences.

### Capacity and delivery paths

This frontend change creates no scheduled workload. A report action keeps the existing stocks run behavior. A research action keeps the existing bounded evidence fan-out, one streamed Gateway call, and fixed session/source writes. The unified History tab reads the existing report-history and research-session lists; it introduces no new polling loop or background job.

Expected paths include `src/routes/AiInsightsLovablePage.tsx`, a reusable research-workspace component extracted from `src/routes/InsightsLovablePage.tsx`, focused redesign helpers, shared tests and fixtures, and `tests/ai-insights-lovable/`. `/insights` and `/insights-lovable` receive regression coverage but no intentional behavior change.

## Risks

- **Competing state:** report replay and research replay could diverge or overwrite restored history. One shared context for new work plus visibly frozen restored sessions is asserted end to end.
- **Artifact ambiguity:** reports and research questions could look interchangeable. Type labels, distinct metadata, filters, and source-specific open behavior are tested.
- **Duplicate controls:** extracting Chat could preserve its old ticker or mode controls. Browser tests count one ticker selector and assert one shared new-work boundary.
- **Silent completeness:** a partial report or research fan-out could look authoritative. Data health, typed source states, failure reasons, and historical failure restoration remain visible.
- **Existing-route regression:** extraction could alter `/insights-lovable`, while removing the imported legacy chat could alter `/insights`. Both existing route suites remain release gates.
- **Future leakage:** report or research replay could display bars, evidence, levels, or catalysts beyond the cutoff. Existing replay contracts remain and restored-session tests assert the saved boundary.
- **Authorization split:** unified history could expose another user's research session. Existing function ownership remains unchanged; the browser receives only authorized session summaries and reads.
- **Mobile density:** five tabs, chart controls, evidence, and dense dossier content could overflow. Multi-width screenshots and explicit overflow assertions gate delivery.
