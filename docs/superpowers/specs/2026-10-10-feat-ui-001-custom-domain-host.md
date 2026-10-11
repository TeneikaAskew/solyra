---
feat_id: FEAT-UI-001
req_ids: [REQ-UX-001]
issues: []
canvases:
  - https://claude.ai/artifact/Wdf4yL4hqQYK6bNU8BtMuK
done_when:
  - "src/lib/apiTargets.test.ts asserts isStaticFrontendHost is true for stocks.insightscollective.org, solyra-stocks.lovable.app and a lovableproject.com host, and false for insightscollective.org, evil-stocks.insightscollective.org, stocks.insightscollective.org.evil.com and localhost"
  - "src/lib/authedFetch.test.ts asserts that, loaded on stocks.insightscollective.org, a request for /api/config/firebase is sent to STAGING_API + '/api/config/firebase', and that on localhost it stays '/api/config/firebase'"
  - "docs/UI-SCREENS.md SHARED-03 names stocks.insightscollective.org as an exact static host beside the .lovable.app and .lovableproject.com suffixes"
  - "Each new test is shown failing against main when the PR opens, and the solyra CI checks and e2e jobs are green on the PR head"
  - "02-FEATURE-CATALOG FEAT-UI-001 row shows a Status, this PR's date and number"
status: approved
supersedes: null
---

# Serve the site from stocks.insightscollective.org

## Problem

On 2026-10-10 the owner connected `stocks.insightscollective.org` to this Lovable project. DNS
at Squarespace resolves, Lovable reports the domain live, and Firebase Auth lists it as an
authorized domain. The site still cannot start there. Opened on a phone the same day, it shows
"Could not load application configuration" with "/api/config/firebase did not return a valid
config payload".

The cause is `src/lib/apiTargets.ts`. Lovable serves the bundle with history fallback and no
`/api` route, so the site must send `/api/*` to the API's own origin (`STAGING_API`). It does
that only for hosts that `isStaticFrontendHost` recognises, and that function knows only
`*.lovable.app` and `*.lovableproject.com`. On the new host the request stays same-origin and
Lovable answers it with `index.html`. Checked on 2026-10-10:
`curl https://stocks.insightscollective.org/api/config/firebase` returns `200 text/html`.

## Non-goals

- The API side. `https://stocks.insightscollective.org` has to be an allowed CORS origin on the
  stocks API before the calls succeed; that is stocks' FEAT-DEPLOY-001 implementation (stocks#1366).
  The two can merge in either order: until both are live the new host fails as it does today, and
  `solyra-stocks.lovable.app` is unaffected.
- The sign-in domain (`auth.stocks.insightscollective.org`) and the email action links. Both are
  project configuration, changed outside this repo once the site works on the new host.
- The verify-email state (FEAT-AUTH-001), which is specified separately.

## Approaches considered

1. Add `.insightscollective.org` to the suffix list. Rejected: the apex serves a different site,
   and a suffix also matches `evil-stocks.insightscollective.org`.
2. Set `VITE_API_BASE_URL` in Lovable's build. Rejected: it applies to every host the bundle runs
   on, local preview included, and lives outside the repo where nothing tests it.
3. An exact-match list beside the suffix list. Chosen: one entry, no new matching rules, and the
   same function the request rewrite already calls.

## Design

`src/lib/apiTargets.ts`: a second list, `STATIC_FRONTEND_HOSTS = ['stocks.insightscollective.org']`,
matched with `includes` (exact), beside `STATIC_FRONTEND_HOST_SUFFIXES`; `isStaticFrontendHost`
returns true for either. The header comment's "two places need the new origin" note names the
exact list and its stocks counterpart, the CORS origin in `platform/api/main.py`.

`docs/UI-SCREENS.md` SHARED-03, which describes `isStaticFrontendHost` as matching the two
Lovable suffixes, names the exact host beside them. It is the source of the registered "Solyra
website structure diagram" canvas (report-only), which is checked after merge.

`src/lib/authedFetch.ts` is unchanged in behaviour: `resolveApiBase()` already returns
`STAGING_API` for any static host, and its comment is corrected to say "static hosts" rather than
naming only `*.lovable.app`. The test helper in `authedFetch.test.ts` takes the hostname as a
parameter so a test can load the module as if on the new host.

Capacity: n/a. The site runs no workload; the change is one string comparison at module load.

## Risks

- A host is added that does not actually serve this bundle. The list is exact, so only the one
  host the owner connected is affected, and the test pins the near-misses.
- The site ships before the API admits the origin. Calls from the new host then fail CORS instead
  of returning HTML, which is no worse than today, and the other host keeps working.
