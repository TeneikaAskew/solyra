# AI Insights Lovable: action-oriented trader research workspace

## Goal
Create a new parallel experience at **`/ai-inisghts-lovable`** using the slug exactly as requested. Preserve `/insights` and `/insights-lovable` for comparison while the new page combines the strongest parts of both into a decision-focused workspace for active traders.

The page will keep the established hybrid architecture:
- the stocks API remains the source of truth for quotes, OHLCV bars, indicators, catalysts, signals, reports, replay data, and financial calculations;
- Lovable Cloud stores private research sessions, messages, evidence snapshots, and run state;
- Lovable AI Gateway produces streamed, structured, cited synthesis.

## Confirmed foundation
- The professional chart already exists in `CandlestickChart`: it uses TradingView’s `lightweight-charts` package, candlesticks, volume, crosshair interaction, price lines, markers, responsive resizing, and reactive dark/light chart tokens.
- The current Insights Lab instead uses a Recharts line/area chart, which is why it does not read as a trader chart.
- The original AI Insights page already has structured reports, trade plans, key levels, STRAT context, catalysts, bull/bear debate, risk flags, supporting signals, similar trades, agent telemetry, watchlist discovery, report history, replay controls, and chat.
- The current Insights Lab adds cited question answering, frozen evidence, readable source details, saved research sessions, live/replay questions, explicit data gaps, and AI Gateway orchestration.
- This is a **CHANGE** under **FEAT-INSIGHT-001**. The approved earlier spec explicitly excludes redesigning `/insights` and does not cover this new route, so repository-compliant implementation requires a new approved spec and implementation plan before source changes.

## Experience design

### 1. Trader command surface
- Open with a compact ticker command bar: free-form ticker search, ranked/recent suggestions, Live/Replay mode, timeframe, data timestamp, market-session state, and saved-research access.
- Keep the current question visible with every result and when reopening history.
- Present suggested questions as decision intents rather than generic prompts: **Catalyst risk**, **Setup quality**, **Entry/invalidation**, **Replay this moment**, and **What changed?**
- Use one primary action, **Run research**, with explicit gathering, validating, synthesizing, and saving stages plus Stop.

### 2. Professional chart integration
- Reuse the bare `CandlestickChart`, not `TradeMarkingChart`, so the research page receives professional chart behavior without journal mutation or trade-drawing dependencies.
- Feed it validated stocks OHLCV data through a focused adapter; retain null/error states rather than fabricating bars or volume.
- Show candlesticks, volume, crosshair OHLC, live-price and prior-close lines, and cited AI key levels as overlays.
- Add compact controls for timeframe, volume, and regular-hours filtering. Use the existing responsive chart container and theme tokens for native dark and light modes.
- For same-day data, show intraday times on the horizontal scale and the trading date once in the chart header. Multi-day data may show date transitions.
- Keep Replay leakage-safe: the chart and all overlays stop at the selected cutoff; future bars, signals, catalysts, and annotations are neither fetched for the view nor rendered.
- Do not add session shading in the first implementation unless the stocks data contract exposes reliable session boundaries; expose pre/post-market state textually instead of guessing.

### 3. Decision-first information hierarchy
Organize the page around the trader’s next decision rather than equal-weight cards:

1. **Market state** — quote, session, timestamp, freshness, price versus prior close.
2. **Decision header** — directional verdict, confidence, setup state, and a one-sentence answer.
3. **Action map** — entry/trigger, targets, stop/invalidation, key levels, catalyst window, and risk/reward only when supplied by the stocks backend.
4. **Interactive chart** — visual confirmation with cited levels and event markers.
5. **Why now** — three to five ranked facts with source, timestamp, and freshness.
6. **Scenario matrix** — bull, base, and bear paths with trigger, invalidation, and expected evidence to watch.
7. **Catalyst timeline** — dated events with relevance, status, and a direct follow-up action.
8. **Risks and contradictions** — source disagreements, stale inputs, unavailable feeds, and failed report sections shown before optional detail.
9. **Evidence and depth** — expandable report sections, sources, model provenance, and full dossier for users who need it.

### 4. Action system
- Every key level can focus its chart line and be copied.
- Every catalyst can start a focused follow-up or open the dedicated catalyst view for that ticker.
- Every risk or contradiction can launch a prefilled verification question.
- Verdicts offer contextual next steps such as **Stress-test the bear case**, **Compare with last report**, **Replay before catalyst**, and **Save to research queue**—never order placement or fabricated trade advice.
- Add **Research next** from the existing ranked watchlist so discovery leads directly into a ticker question.
- Preserve copy, ask follow-up, generate full brief, start new research, and reopen history actions.
- Keep operational model routing in Admin; show only trader-relevant provenance such as evidence time, data freshness, latency, and partial/failed sources.

### 5. History and continuity
- Use one timeline with two clearly labeled artifact types: structured report runs and question-led research sessions.
- Each row shows ticker, question or report thesis, live/replay state, verdict, completion status, evidence time, and updated time.
- Reopening an item restores the exact question, answer, chart cutoff, sources, and unavailable-data state.
- A failed follow-up never removes the last completed answer. Failed sessions show the question and actionable failure reason.

### 6. Responsive behavior
- Desktop: command bar, wide decision/chart column, and a restrained right rail for evidence, history, and research-next candidates.
- Mobile: quote and decision header first, then a full-width chart with a minimum readable height; controls become a compact horizontal toolbar; evidence/history use sheets without horizontal overflow.
- Validate at 390px, 411px, tablet, and desktop. Preserve keyboard navigation, focus visibility, reduced motion, live-status announcements, and touch targets.

## Data and AI contracts
- Extend the structured AI answer only for presentation-ready fields that the model can cite: base case, action items, structured key levels, scenario triggers, contradictions, and follow-up intents.
- Numeric market facts remain sourced from stocks responses. AI Gateway may rank, explain, and connect them but must not calculate or invent financial values.
- Every rendered claim or overlay retains same-run citation IDs. Unsupported citations fail visibly.
- Continue explicit source states: current, stale, unavailable, invalid response, and dependency failure. Distinguish “no matching data” from “endpoint could not be reached.”
- Include the live quote as authoritative evidence for Live research and exclude it from Replay research.
- Keep frozen evidence for follow-ups; provide an explicit **Refresh with current data** action to start a new evidence snapshot.

## Delivery sequence
1. **Repository contract** — write and approve a new FEAT-INSIGHT-001 spec for `/ai-inisghts-lovable`, then create the gate-compliant implementation plan and feature branch.
2. **Contract tests first** — add fixtures for complete, partial, stale, conflicting, replay, and failed data; add a professional-chart adapter test that rejects invalid OHLCV instead of filling values.
3. **Trader chart** — create a focused research-chart composition around the existing `CandlestickChart`, quote lines, cited level overlays, OHLC readout, timeframe/RTH/volume controls, and explicit loading/error states.
4. **Workspace shell** — add the lazy route and a clearly experimental navigation entry while leaving both existing Insights routes unchanged.
5. **Decision model** — expand the typed answer contract and Gateway schema/prompt for action map, scenario matrix, contradictions, and contextual actions with strict citation validation.
6. **Information architecture** — build the market-state header, decision header, action map, chart, ranked evidence, scenarios, catalyst timeline, risk/contradiction panel, and optional dossier.
7. **Action wiring** — connect chart-level focus/copy, catalyst follow-ups, contradiction checks, ranked research-next tickers, refresh-with-current-data, full brief, and history restoration.
8. **History unification** — present report runs and Cloud research sessions in one timeline without merging or duplicating their source records.
9. **Failure and replay hardening** — prove cutoff enforcement, data-gap classification, stale/conflicting evidence display, retained prior answers, cancellation, credit/policy/rate-limit states, and cross-user denial.
10. **Verification and closeout** — run unit, contract, function, build, and hermetic Playwright suites; capture required chart and workflow screenshots; perform a real signed-in AI Gateway question and persisted reload; update only the FEAT-INSIGHT-001 product record owned by the PR.

## Verification scenarios
- Live IWM research renders real candlesticks and volume, one intraday date label, a live-price line, prior close, OHLC crosshair values, cited key-level overlays, and an actionable answer.
- Changing ticker or timeframe updates quote, chart, evidence, and prompts together without showing stale prior-ticker state.
- Replay hides every bar and source after the cutoff and labels the restored historical state persistently.
- A cited level focuses the matching chart line; a catalyst or contradiction starts the expected prefilled follow-up.
- History restores the exact question, result, evidence, chart boundary, and failure/partial state.
- Missing quote, OHLCV, catalysts, signals, or reports each render a distinct honest state while still using valid remaining evidence.
- The page has no horizontal overflow or overlapping controls at 390px, 411px, tablet, and desktop widths.
- `/insights` and `/insights-lovable` remain behaviorally unchanged.

## Non-goals
- Do not replace the existing Insights pages during evaluation.
- Do not add broker execution or imply that a generated scenario is an order recommendation.
- Do not duplicate indicators, STRAT, risk/reward, catalyst scoring, replay logic, or other financial math in the frontend or Lovable Cloud.
- Do not use `TradeMarkingChart` or introduce journal writes from the research chart.
- Do not conceal unavailable or contradictory backend data with neutral values or generic prose.