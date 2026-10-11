# FEAT-INSIGHT-001 implementation contract

The approved product plan has been translated into the repository's required implementation contract at:

`docs/superpowers/specs/2026-10-11-feat-insight-001-insights-lovable.md`

## Contract summary

- Build `/insights-lovable` as a parallel question-first research workspace; preserve `/insights`.
- Keep stocks as the source of truth for market data and financial calculations.
- Use Lovable Cloud for Firebase-UID-owned sessions, messages, source snapshots, and run state.
- Use Lovable AI Gateway for streamed, strictly structured answers with validated same-run citations.
- Make Live/Replay explicit, enforce replay cutoffs, and persist the exact evidence used.
- Show missing, stale, partial, auth, credit, policy, rate-limit, cancellation, and upstream failures honestly.
- Require explicit `authenticated` and `service_role` grants before RLS policies for every new public table.
- Prove ownership, citations, null handling, persistence, cancellation, and multi-width responsiveness with unit, function, contract, and Playwright tests.

## Delivery requirement

Approving this contract authorizes the spec-first delivery sequence. Implementation will then enable Cloud, add the working backend, build the parallel page, and verify the real streamed AI flow.
