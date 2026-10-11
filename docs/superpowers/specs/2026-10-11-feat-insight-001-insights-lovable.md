---
feat_id: FEAT-INSIGHT-001
req_ids: [REQ-UX-001, REQ-ACCESS-001, REQ-DATA-001, REQ-DATA-002, REQ-DATA-003, REQ-FRESH-001, REQ-AUTH-001, REQ-TENANCY-001, REQ-SECRET-001]
issues: [827, 867, 1215, 1216]
canvases: []
done_when:
  - "tests/insights-lovable/insights-lovable.spec.ts proves a trader can ask a live catalyst question, receive a cited answer, ask a follow-up, reload the persisted session, and leave the existing /insights route unchanged"
  - "tests/insights-lovable/insights-lovable.spec.ts proves replay evidence is dated at or before the selected cutoff and renders a persistent replay state"
  - "tests/insights-lovable/insights-lovable.spec.ts proves stopped, failed, partial-data, signed-out, credit-blocked, rate-limited, and stale-data states remain visible without deleting the last completed answer"
  - "tests/insights-lovable/insights-lovable.spec.ts screenshots show no page or popup overflow at 390px, 411px, tablet, and desktop widths"
  - "Cloud authorization tests prove one Firebase user cannot read or mutate another user's sessions, messages, sources, or runs"
  - "Cloud function tests prove generated citation IDs resolve only to evidence fetched for that run and unsupported citations fail explicitly"
  - "Cloud function tests prove every unavailable financial field remains null through orchestration and every stocks or AI dependency failure has a distinct terminal state"
  - "Every new public Cloud table has explicit authenticated and service_role GRANT statements before RLS and ownership policies in the same migration"
  - "The real Lovable AI Gateway stream completes with safe server-held credentials and its final structured answer passes citation validation"
  - "02-FEATURE-CATALOG FEAT-INSIGHT-001 row shows Status, Last reviewed, and this PR"
status: draft
supersedes: null
---

# Insights Lovable question-first research workspace

## Problem

The existing `/insights` page exposes a capable report pipeline, replay control, history, watchlist, agent telemetry, and chat, but organizes them as separate system-oriented tabs. The question composer is disconnected from the report, evidence is scattered across cards, replay is a small secondary control, and operational model details compete with decision-critical information. A trader cannot begin with a concrete catalyst or replay question and move through a single, persisted, evidence-backed research flow.

The parallel `/insights-lovable` experience must answer the trader's question first, show what evidence and timestamp support the answer, expose missing or stale data honestly, and preserve the current `/insights` experience for comparison.

## Non-goals

- Do not replace or redesign `/insights` in this change.
- Do not reproduce indicators, catalyst ranking, risk math, STRAT classification, replay calculations, or other financial logic outside the stocks backend.
- Do not rebuild stocks market-data ingestion in Lovable Cloud.
- Do not introduce a second user-facing sign-in flow.
- Do not move model-routing administration from Admin into the trader workspace.
- Do not render uncited generated claims when required evidence is unavailable.

## Approaches considered

1. **Frontend-only redesign over existing endpoints:** fastest visual comparison, but cannot provide persisted sessions, grounded follow-ups, or server-held AI credentials.
2. **Lovable-only replacement backend:** self-contained, but duplicates market data and financial logic and creates contract drift.
3. **Hybrid Lovable orchestration over stocks data:** chosen because stocks remains the financial source of truth while Lovable Cloud provides persistence and Lovable AI Gateway provides grounded streaming synthesis.

## Design

### Route and workflow

Add a lazy `/insights-lovable` route and an `Insights Lab` navigation item while leaving `/insights` unchanged. Reuse the global ticker store so switching between versions preserves context.

The first screen is a research composer with ticker search, Live/Replay mode, replay cutoff when applicable, suggested outcome-oriented prompts, a multiline question, the evidence timestamp that will be used, and a primary Research action. Submission shows four explicit stages: gathering approved evidence, validating timestamps and gaps, synthesizing, and saving.

The result is a research memo with a direct answer, decision-critical facts, catalyst timeline, replay context when selected, bull case, bear case, invalidation, unknowns, and an expandable evidence list with source labels, timestamps, and freshness. Follow-up questions reuse the session's frozen evidence snapshot. The trader can stop generation, copy the result, generate the existing structured report as a full brief, or start new research. A failed follow-up never removes the prior completed answer.

Desktop uses a wide answer column and a restrained history/evidence rail. Mobile uses one column with history in a drawer or lower section. Composer controls, date/time UI, citations, and actions remain within the viewport at all required widths. Controls are labeled, keyboard operable, focus-visible, and announced during streaming.

### Identity and authorization

Firebase remains the user-facing identity. Cloud functions accept the Firebase bearer token and verify it through the trusted identity path before all session or AI work. The verified Firebase UID is the immutable owner key.

Cloud tables are not directly writable from the browser. Functions use server authority only after ownership checks. Cross-user access returns a denial. Assistant messages, citations, and run metadata cannot be forged by clients.

### Cloud schema

Create these public tables:

- `insight_research_sessions`: id, owner UID, ticker, live/replay mode, optional replay cutoff, title, status, created/updated timestamps.
- `insight_research_messages`: session id, owner UID, role, content or structured answer, run state, safe error details, created timestamp.
- `insight_research_sources`: message/run linkage, owner UID, approved source type, source label, source/as-of timestamp, freshness, excerpt/metadata, payload hash.
- `insight_research_runs`: session/message linkage, owner UID, Gateway run ID, status, model metadata, failure class, started/finished timestamps.

Every `CREATE TABLE public.*` is immediately followed by table grants for `authenticated` and `service_role`, then RLS enablement and owner policies. There is no anonymous grant. Index owner + recency and session ordering.

### Server functions and evidence boundary

Provide functions for session list/create/read, streamed research, optional full-brief generation, and cancellation. Inputs validate ticker, question length, mode, replay cutoff, session ownership, and request size.

The evidence assembler calls a fixed allow-list of existing stocks endpoints for reports, report history, house brief, catalysts, signals, and replay-capable data. It forwards the verified user identity, enforces response-size limits, stores source timestamps and hashes, and excludes observations after a replay cutoff. Missing evidence is recorded as unavailable, not converted to empty success or neutral financial values.

A completed run stores the exact evidence snapshot used so a later page reload cannot silently reinterpret an old answer using new data.

### AI Gateway

Keep `LOVABLE_API_KEY`, prompts, model calls, and Gateway run IDs server-side. Use the current workspace default supported text model for this new call and stream through the documented Responses path. Preserve the Gateway-issued run ID for continuation steps and follow-ups.

Require a strict structured response that separates direct answer, sourced facts, interpretations, risks, unknowns, and citation IDs. Every citation ID must resolve to evidence fetched for the same run. Validation failure is terminal and visible; it does not degrade to uncited prose.

Support explicit Stop and record cancellation without a fabricated answer. Apply documented Gateway error semantics: 400/401/402/403/404 are terminal with safe actionable UI; only 429 and transient 5xx receive bounded delayed retry; credit or policy blocks pause new automated work until explicit recovery.

### Frontend contracts and states

Add typed contracts for sessions, messages, evidence, structured answers, stream events, and failures. Mock fixtures cover complete live research, fixed-cutoff replay, catalysts present/absent, partial and stale evidence, no report, signed-out and expired identity, credit/policy block, rate limit, transient upstream failure, cancellation, and persisted reload.

The current structured report components may be reused behind Generate full brief, but operational model-routing details remain out of the primary trader flow.

### Capacity and performance

This Solyra change creates no scheduled workload. Each user action performs one bounded evidence fan-out, one streamed AI call, and a small fixed number of session writes. Evidence payloads are allow-listed and size-limited; session history is paginated. Interactive latency and payload size are exposed in run metadata before any availability claim.

### Delivery paths

Frontend work is expected in `src/App.tsx`, `src/components/layout/navConfig.ts`, a focused `src/routes/InsightsLovablePage.tsx`, focused components/hooks/types, shared mock fixtures, and `tests/insights-lovable/`.

Cloud work is expected in migrations and focused server functions for identity verification, sessions, evidence assembly, research streaming, and cancellation. AI Gateway helper code follows the documented Classic server boundary and remains server-only.

## Risks

- **Identity split:** a second login would break the app's session model. The authorization tests require Firebase UID ownership at every Cloud access path.
- **Future leakage in replay:** evidence may accidentally include observations after the cutoff. Shared replay fixtures and explicit source-time assertions catch this.
- **Hallucinated citations:** a model may emit source IDs it never received. Same-run citation validation fails those answers explicitly.
- **Silent fallback:** partial evidence may be converted into an apparently complete answer. Null/partial fixtures and terminal failure tests require visible gaps.
- **Interrupted streams:** cancellation or dependency failure may leave a run stuck or erase content. Terminal-state and retained-answer tests cover both.
- **Mobile overflow:** composer controls, citations, and history surfaces may exceed the viewport. Multi-width Playwright screenshots and overflow assertions gate delivery.
- **Current-page regression:** shared ticker/navigation changes could alter `/insights`. The hermetic comparison flow pins the existing route.
