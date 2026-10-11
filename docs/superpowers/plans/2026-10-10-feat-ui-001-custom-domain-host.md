---
feat_id: FEAT-UI-001
spec: docs/superpowers/specs/2026-10-10-feat-ui-001-custom-domain-host.md
branch: feature/feat-ui-001-custom-domain-host
pr: null
status: ready
---

# Serve the site from stocks.insightscollective.org: implementation plan

> For agentic workers: use superpowers:executing-plans.
> Every task cites a spec section and the done_when item it advances.

## Task 1: the exact static host
Spec: § Design, `apiTargets.ts` and `authedFetch.ts`. Advances done_when[0], [1] and [2].
- [ ] Write the failing tests: `src/lib/apiTargets.test.ts` (the hosts and the near-misses), and
      in `src/lib/authedFetch.test.ts` give `install()` a hostname parameter and add "where /api
      goes" (custom domain to `STAGING_API`, localhost same-origin)
- [ ] Run: `npx vitest run src/lib/apiTargets.test.ts src/lib/authedFetch.test.ts` (expect FAIL)
- [ ] Add `STATIC_FRONTEND_HOSTS = ['stocks.insightscollective.org']`, matched exactly, and
      correct `resolveApiBase`'s comment
- [ ] Run again (expect PASS), then `npx tsc -b` and `npx vitest run src/lib src/components`
- [ ] `docs/UI-SCREENS.md` SHARED-03: name the exact host beside the two suffixes (done_when[2])

## Task 2: close
Spec: done_when[3] and [4].
- [ ] Run the new tests against `main` and record the failures in the PR body
- [ ] `02-FEATURE-CATALOG.md` FEAT-UI-001 row: Status, Last reviewed, this PR in the PRs column
- [ ] `node scripts/docs-audit.mjs` on the branch and on `origin/main`;
      `python3 scripts/gate/spec_gate.py --pr origin/main`
