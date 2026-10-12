---
feat_id: FEAT-INSIGHT-001
req_ids: [REQ-UX-001, REQ-ACCESS-001, REQ-DATA-001, REQ-DATA-002, REQ-DATA-003, REQ-FRESH-001, REQ-AUTH-001, REQ-TENANCY-001, REQ-SECRET-001]
issues: [827, 867, 1215, 1216]
canvases: []
done_when:
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves /ai-insights-lovable renders the existing lightweight-charts candlestick and volume experience with quote, prior-close, cited-level, timeframe, volume, RTH, and OHLC interactions"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves a trader can ask a live question, receive a structured cited decision brief, use a contextual follow-up action, reload the saved session, and leave /insights and /insights-lovable unchanged"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves replay renders no bar, source, level, signal, or catalyst after the selected cutoff and restores the same persistent cutoff from history"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts proves missing, stale, conflicting, invalid, signed-out, stopped, credit-blocked, policy-blocked, rate-limited, and dependency-failed states remain explicit without deleting the last completed answer"
  - "tests/ai-insights-lovable/ai-insights-lovable.spec.ts screenshots show no page, chart-toolbar, drawer, sheet, or popup overflow at 390px, 411px, tablet, and desktop widths"
  - "Unit tests prove the research-chart adapter rejects invalid or missing OHLCV values without manufacturing bars, prices, or volume"
  - "Cloud authorization tests prove one Firebase user cannot read or mutate another user's sessions, messages, sources, or runs"
  - "Cloud function tests prove every generated claim, action, scenario, contradiction, and chart level cites evidence fetched for the same run and unsupported citations fail explicitly"
  - "Cloud function tests prove unavailable, empty, invalid-response, stale, conflicting, and dependency-failed source states remain distinct through persistence and rendering"
  - "The real Lovable AI Gateway stream completes with safe server-held credentials and its final structured decision brief passes same-run citation validation"
  - "02-FEATURE-CATALOG FEAT-INSIGHT-001 row shows Status, Last reviewed, /ai-insights-lovable, and this PR"
status: superseded
supersedes: null
---

# AI Insights Lovable action-oriented trader workspace

## Problem

The existing `/insights` page has a broad structured dossier, report replay, history, watchlist discovery, model telemetry, and chat, but separates them into system-oriented tabs and makes the trader assemble the decision across many equal-weight cards. The parallel `/insights-lovable` page improves question-led research, citations, evidence freshness, and session continuity, but its chart is a Recharts area line rather than the professional candlestick and volume chart already used by `/charts`. It also omits several high-value decision surfaces from the original page.

Create a third comparison route at `/ai-insights-lovable`, preserving the user-requested spelling exactly. It must combine the original page's structured market intelligence with the Lab's cited AI research in a quant-workflow hierarchy where every prominent item explains what the trader can inspect, verify, compare, or research next. It must expose unavailable and contradictory data rather than smoothing it into a complete-looking answer.

## Non-goals

- Do not replace, redirect, or redesign `/insights` or `/insights-lovable` in this change.
- Do not add broker connectivity, order entry, or generated trade execution recommendations.
- Do not duplicate indicators, STRAT classification, catalyst scoring, risk/reward, replay, or any other financial math outside the stocks backend.
- Do not use `TradeMarkingChart` or write journal trades from the research chart.
- Do not introduce a second user-facing authentication flow or expose Cloud or AI credentials to the browser.
- Do not infer session shading, market hours, timestamps, levels, or financial values when the backend did not supply them.
- Do not move model-routing administration into the trader workflow.

## Approaches considered

1. **Restyle the current Insights Lab and keep its line chart:** lowest effort, but it preserves the central mismatch reported by the user and does not recover the original Insights capabilities.
2. **Embed the full Charts page or `TradeMarkingChart`:** visually rich, but couples research to journal mutations, replay training, and unrelated chart-page controls.
3. **Compose a new route around bare `CandlestickChart` plus both Insights contracts:** chosen because it reuses the existing TradingView lightweight-charts foundation without trade-writing side effects, while preserving stocks as the financial source of truth and Lovable Cloud as research persistence/orchestration.

## Design

### Route and information hierarchy

Add a lazy route and experimental Intelligence navigation entry for `/ai-insights-lovable`. The page shares the global ticker store and retains both existing Insights routes without behavior changes.

The first viewport contains:

1. a compact ticker command bar with free-form search, ranked/recent suggestions, Live/Replay mode, timeframe, evidence timestamp, market-session state, history, and one primary `Run research` action;
2. an authoritative market-state row with quote, prior close, change, session, source timestamp, and explicit freshness;
3. a decision header with cited verdict, confidence, setup state, one-sentence answer, and context-specific next actions;
4. a structured action map for entry or trigger, targets, stop or invalidation, backend-supplied risk/reward, key levels, and catalyst window; absent values remain unavailable;
5. the professional candlestick chart.

Below the chart, rank information as `Why now`, scenario matrix, catalyst timeline, risks and contradictions, then expandable evidence and full dossier. Operational model routing remains in Admin. Trader-relevant provenance may show evidence time, partial sources, latency, and freshness.

### Professional chart

Reuse `src/components/charts/CandlestickChart.tsx` directly. Do not route through the journal-specific `TradeMarkingChart` wrapper. A focused adapter validates stocks OHLCV responses and produces `CandlestickBar[]` and `VolumeBar[]`; an invalid or missing required value makes that source unavailable rather than manufacturing a bar, zero volume, or a line.

The research chart includes:

- candlesticks and volume histogram;
- responsive pan, zoom, crosshair, and OHLC readout;
- theme-reactive dark and light colors from the existing chart token system;
- live-price and prior-close lines in Live mode;
- citation-linked AI key-level overlays only when the exact numeric value exists in same-run evidence;
- compact timeframe, volume, and regular-hours controls;
- intraday times on same-day data with the date shown once in the chart header;
- honest loading, empty, invalid, and dependency-error states.

Replay passes the selected cutoff to the stocks data request and clips rendered bars and overlays at that boundary. No future bar, signal, catalyst, source, level, or annotation may be fetched for the replay view or rendered from stale client cache. Session shading is excluded until a reliable backend session-boundary contract exists.

### Trader actions

Actions are contextual and non-executing:

- selecting a key level focuses its chart line and offers Copy;
- selecting a catalyst starts a focused follow-up or opens the ticker's dedicated catalyst view;
- selecting a contradiction or unavailable source starts a prefilled verification question;
- verdict actions include stress-testing the opposite case, comparing the last report, replaying before the next catalyst, saving to the research queue, refreshing with current evidence, generating the full brief, and starting new research;
- `Research next` reuses ranked watchlist candidates to move directly from discovery to a ticker question.

Every action has a visible result, remains keyboard accessible, and never claims an order was placed.

### Structured AI contract

Extend the existing research answer with presentation-ready, citation-bearing fields for setup state, base case, action items, structured numeric key levels, scenario triggers, contradictions, and follow-up intents. The Gateway may rank and explain backend evidence but may not calculate or invent financial values.

Every claim, action, scenario, contradiction, catalyst, and chart overlay lists citation IDs restricted to available evidence fetched for that run. Post-generation validation rejects an unsupported source ID. Live quote is authoritative price evidence in Live mode and is excluded from Replay mode. Follow-ups reuse frozen evidence; `Refresh with current data` deliberately starts a new snapshot.

Source status is a typed contract, not prose. Preserve distinct states for current, stale, no matching data, invalid response, conflicting evidence, unavailable dependency, and request failure. Partial valid evidence may still produce an explicitly partial answer. Required evidence failure never falls back to uncited prose.

### History and persistence

Lovable Cloud continues to store Firebase-UID-owned sessions, messages, evidence snapshots, and run state. The UI presents one timeline with two labeled artifact types without duplicating source records:

- structured report runs from the stocks API;
- question-led research sessions from Lovable Cloud.

Rows show ticker, question or thesis, live/replay, verdict, completion status, evidence time, and updated time. Reopening research restores the exact question, answer, chart cutoff, sources, overlays, and failure or partial-data state. Failed follow-ups never remove the last completed answer.

### Identity, authorization, and secrets

Keep Firebase as the user-facing identity. Cloud functions validate the bearer token through the trusted stocks identity endpoint and use the verified Firebase UID as the immutable owner key. Browser clients cannot directly write research tables. Cross-user reads and writes are denied and tested.

Keep `LOVABLE_API_KEY`, prompts, AI calls, and Gateway run IDs server-side. Continue documented error semantics: terminal 400/401/402/403/404 failures surface safe actionable messages; only 429 and transient 5xx receive bounded delayed retry; cancellation records a cancelled state without a fabricated answer.

### Responsive and accessible behavior

Desktop uses a wide decision/chart column and a restrained evidence/history/research-next rail. Mobile shows market state and decision first, then a full-width chart with a stable readable height and compact horizontally scrollable chart toolbar. Evidence and history use sheets that stay within the viewport. All controls support keyboard navigation, visible focus, reduced motion, labelled states, touch targets, and live announcements.

### Capacity and delivery paths

This Solyra change creates no scheduled workload. A user research action performs a bounded stocks evidence fan-out, one streamed Gateway call, and a fixed set of session writes. Chart queries follow existing React Query caching and polling contracts; history remains paginated.

Expected frontend paths include a focused new route, research chart and decision components, existing chart composition, typed contracts/hooks, navigation/router entries, mocks, fixtures, and `tests/ai-insights-lovable/`. Expected Cloud changes remain within the existing research function and tables unless a tested schema extension is required. Any stocks contract addition is delivered and proven in the stocks repository first, then synchronized through the vendored OpenAPI contract here.

## Risks

- **Future leakage:** cached bars or evidence could appear after a replay cutoff. Tests assert every rendered and requested timestamp is at or before the boundary.
- **Chart contract drift:** live-history data may not contain complete OHLCV. Adapter tests reject incomplete data, and implementation uses only a stocks endpoint that supplies the required contract.
- **Invented actionability:** an AI answer could turn prose into unsupported levels or risk metrics. Same-run citations and numeric-evidence validation reject those fields.
- **Silent completeness:** a partial fan-out may look authoritative. Typed source states and prominent contradictions/data-health UI expose the exact missing inputs.
- **History ambiguity:** report runs and research sessions could be mistaken for one artifact. Distinct labels and source-specific open behavior preserve provenance.
- **Identity split:** direct Cloud access could bypass Firebase ownership. Function-level authorization tests prove cross-user denial.
- **Canvas and mobile overflow:** a professional chart can become unusable on a phone. Stable chart dimensions and multi-width Playwright screenshots gate delivery.
- **Existing-route regression:** shared ticker, chart, and navigation work could alter current pages. Hermetic tests revisit `/insights` and `/insights-lovable` unchanged.