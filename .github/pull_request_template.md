<!-- Keep the sections; replace the comments. Delete a section only when it
     genuinely doesn't apply (say why in Summary if it's not obvious). -->

## Summary

<!-- What changed and why. Link the issue if one exists. -->

## Cross-repo contract impact (CLAUDE.md Rule 6)

<!-- src/types/ and tests/helpers/fixtures/ are hand-maintained here while the
     API that produces those shapes lives in TeneikaAskew/stocks. Nothing
     mechanical ties them to the real FastAPI response, so the PR description
     is where the pairing is recorded. Check every line that applies. -->

- [ ] No API contract touched — nothing under `src/types/` or
      `tests/helpers/fixtures/` changed
- [ ] `src/types/` changed — I confirmed the stocks router actually returns
      this shape (name the router file here), not just reshaped a type to
      make a fixture compile
- [ ] Shape changed on the stocks side — paired stocks PR: <!-- #NNN -->
- [ ] New endpoint consumer — fixture added to
      `tests/helpers/fixtures/<page>.ts` so E2E covers the fan-out

## No Silent Fallbacks (Rule 4 / §3.7)

- [ ] No new `?? 0` / `|| 0` / `?? ''` on a financial field, no
      `catch { return [] }` in a data-access path, no fabricated success.
      Missing values stay `null` end-to-end; only the presentation boundary
      renders `—`

## Testing

<!-- Paste real command output — "never claim done without evidence"
     (CLAUDE.md Testing discipline). CI re-runs all of these, but the point
     of pasting is that YOU ran them before pushing. -->

- [ ] `npx tsc -b` — clean (this is the check that catches fixture drift)
- [ ] `npm test` — all green
- [ ] `npm run build` — succeeds
- [ ] `npm run e2e` — green, or a stated reason it wasn't run locally

## Screenshots

<!-- UI changes: before/after. Delete for non-UI changes. -->

## Merge gate (Rule 2.5) — check at merge time, not at open time

<!-- Automated review lands a few minutes after the PR opens. An empty
     review list 60 seconds in means "wait and re-check", not "clean". -->

- [ ] Review comments read — before CI, not after
- [ ] Zero unresolved review threads: each one fixed-and-resolved (naming
      what changed and the covering test/commit) or replied to with why it
      isn't being actioned
- [ ] CI green on the current head
- [ ] No merge conflict
