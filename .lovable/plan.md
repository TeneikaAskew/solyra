# Insights Lovable: question-first research workspace

## Goal
Create a parallel, production-capable experience at **`/insights-lovable`** that lets a trader select a ticker, ask a catalyst or replay question, and receive a concise, cited answer grounded in Solyra’s existing market data. Keep `/insights` unchanged for side-by-side evaluation.

The page will use a **hybrid backend**:
- the existing stocks API remains the source of truth for prices, indicators, catalysts, signals, replay data, journal context, and financial calculations;
- Lovable Cloud stores research sessions and runs server-side orchestration;
- Lovable AI Gateway streams the cited synthesis and concise research brief.

## Confirmed current state
- `/insights` currently separates Briefing, Agents, History, Watchlist, and Chat into five tabs.
- It already has typed contracts and mocked coverage for report loading, refresh/polling, historical replay, report history, watchlist ranking, degraded reports, and streaming chat.
- The current report is a long grid of cards, while the question composer is isolated in Chat. The new version will make the trader’s question and answer the primary flow.
- This work belongs to **FEAT-INSIGHT-001**. The repository’s delivery gate requires an approved feature spec before implementation.

## Experience design

### 1. Entry and orientation
- Add the lazy-loaded `/insights-lovable` route and an **Insights Lab** navigation entry so the parallel version is easy to compare.
- Preserve the selected ticker across the existing and new Insights pages.
- Lead with a single research composer containing:
  - ticker search;
  - **Live / Replay** segmented mode;
  - replay date and time when Replay is selected;
  - a large question field;
  - suggested prompts for catalysts, setup quality, risk, and historical replay;
  - a clear **Research** action.
- Show what data timestamp will be used before submission, especially in replay mode.

### 2. Research flow
- Replace the disconnected tab-first flow with a visible sequence:
  1. gather approved market evidence;
  2. validate timestamps and missing inputs;
  3. synthesize the answer;
  4. save the completed research session.
- Stream the response and provide a Stop control.
- Keep the ticker, question, chosen mode, and replay cutoff visible while the answer is generated.
- Never erase an existing answer when a follow-up fails.

### 3. Outcome-focused answer
Render the result as a readable research memo rather than a wall of equal-weight cards:
- **Direct answer**: concise response to the exact question;
- **What matters now**: the few facts that most affect the decision;
- **Catalyst timeline**: dated events and their expected relevance;
- **Replay context**: what was knowable at the selected historical cutoff, with later data excluded;
- **Bull case / bear case / invalidation**;
- **Unknowns and unavailable data**: explicit gaps, never neutral or zero-filled substitutes;
- **Evidence**: source labels, source timestamps, freshness, and expandable supporting excerpts;
- **Generated brief**: an optional structured dossier using the existing report sections when the trader wants more depth.

Follow-up questions remain in the same session and reuse its evidence snapshot. Actions include **Ask follow-up**, **Generate full brief**, **Copy**, and **Start new research**.

### 4. Supporting workspace
- Desktop: main answer column plus a restrained side rail for session history, current evidence status, and recent ticker research.
- Mobile: one-column flow; the side rail becomes a drawer or lower section. Composer, replay picker, citations, and action menus must stay inside the viewport.
- Move operational model-routing details out of the trader’s primary workflow; Admin remains the place for provider/model configuration.
- Fold useful watchlist candidates into a compact “research next” surface rather than a top-level tab.
- Preserve the existing app design tokens, density/accent settings, auth indicator, and no-silent-fallback behavior.

## Hybrid backend

### Identity and authorization
Keep the app’s existing Firebase sign-in. Do not introduce a second login.
- Every Lovable Cloud function receives the Firebase bearer token.
- The function validates the identity through the existing trusted auth path before doing work.
- Cloud tables are not directly writable from the browser. Server functions enforce ownership using the verified Firebase UID.
- Cross-user session reads and writes return a denial and are covered by tests.

### Cloud data model
Create migrations for:
- **`insight_research_sessions`**: owner UID, ticker, live/replay mode, replay cutoff, title, status, created/updated timestamps;
- **`insight_research_messages`**: session, role, question/answer content, run state, safe error details, timestamps;
- **`insight_research_sources`**: answer/message link, approved source type, label, source timestamp, freshness, excerpt/metadata, payload hash;
- **`insight_research_runs`**: session/message link, gateway run ID, state, model metadata, started/finished timestamps, explicit failure classification.

Use indexes for owner + recency and session ordering. Deny direct anonymous access; all access goes through ownership-checking functions.

### Server functions
Implement focused Lovable Cloud functions:
- **session list/create/read** for persisted research history;
- **research stream** to validate input, assemble evidence, call AI Gateway, stream the answer, and persist the terminal state;
- **brief generation** to request or reuse the structured stocks report and present it in the new workspace;
- **stop/cancel** to propagate the user’s abort signal and record a cancelled state without fabricating a failure answer.

The evidence assembler calls only a fixed allow-list of existing stocks endpoints. It forwards the verified user token, validates ticker and cutoff inputs, applies response-size limits, records timestamps, and keeps all financial math in the stocks backend.

### AI Gateway behavior
- Use a server-held `LOVABLE_API_KEY`; no prompt, key, or model call is exposed to the browser.
- Use the workspace’s default supported text model for this new call and stream every response.
- Require a structured response contract separating answer, facts, interpretations, risks, unknowns, and source references.
- Source references must resolve to evidence fetched for that run; unsupported citation IDs fail validation rather than rendering.
- Preserve the gateway run ID across tool/follow-up steps.
- Handle 400/401/402/403/404/429/5xx according to Gateway semantics: show safe actionable errors, retry only bounded transient 429/5xx responses, and pause on credit or policy blocks.

## Contracts and states
Define typed request/response contracts for sessions, evidence, stream events, structured answers, and failures. Add fixtures for:
- complete live answer;
- replay answer with a fixed cutoff;
- catalysts present / no catalysts available;
- partial evidence and stale evidence;
- no report yet;
- signed out or expired session;
- AI credits/policy block;
- rate limit and transient upstream failure;
- stopped generation;
- persisted conversation reload.

Every unavailable field remains null through the data layer and renders as an explicit unavailable state at the presentation boundary.

## Delivery sequence
1. **Repository gate**: draft the FEAT-INSIGHT-001 spec with the canonical requirement IDs and touched issues, present it for approval, merge the spec-only change, then create `feature/feat-insight-001-insights-lovable`.
2. **Foundation**: enable Lovable Cloud, provision the server-held AI key, add migrations, contracts, ownership helpers, and failing authorization/contract tests.
3. **Evidence layer**: build and test the allow-listed stocks adapters, replay cutoff enforcement, freshness metadata, partial-data behavior, and source snapshot persistence.
4. **AI orchestration**: implement the streamed Gateway call, strict structured output/citation validation, follow-up context, cancellation, and terminal error handling.
5. **Frontend shell**: add the route/nav entry, question-first composer, live/replay controls, progress states, and session history.
6. **Answer experience**: add the research memo, source drawer, explicit unknowns, follow-ups, and optional full brief using existing report data.
7. **Responsive refinement**: verify desktop and 390px/411px mobile layouts, keyboard flow, focus management, scroll containment, reduced motion, and accessible live-status announcements.
8. **Closeout**: update only the FEAT-INSIGHT-001 catalog row, record the PR, run docs/gate checks, and leave `/insights` untouched.

## Verification
- Unit tests for validation, identity ownership, source allow-listing, replay cutoffs, citation resolution, null handling, and Gateway error classification.
- Function-level tests for session persistence, cross-user denial, evidence assembly, streaming completion, cancellation, and failed-run persistence.
- Contract tests tying new stocks consumers to the vendored OpenAPI schema and typed fixtures.
- Hermetic Playwright flows covering:
  - ask a live catalyst question and receive a cited answer;
  - ask a replay question and prove all evidence is at or before the cutoff;
  - generate the optional full brief;
  - ask a follow-up and reload the saved session;
  - display partial/no-data states honestly;
  - preserve the prior answer after a failed follow-up;
  - stop a stream;
  - show sign-in, credit, policy, rate-limit, and network states;
  - prevent cross-user access;
  - no page or popup overflow at 390px, 411px, tablet, and desktop widths.
- Run the real AI Gateway request after configuration and inspect the streamed response before calling the backend complete.

## Non-goals
- Do not replace `/insights` during this evaluation.
- Do not duplicate indicators, catalyst scoring, risk math, or replay calculations in the frontend or Lovable Cloud.
- Do not move model-routing administration into the trader workspace.
- Do not claim a source or answer when required evidence is unavailable.
- Do not rebuild every stocks API or market-data ingestion job in Lovable Cloud.
