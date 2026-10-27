---
feat_id: FEAT-MARKET-001
req_ids: [REQ-DATA-001, REQ-DATA-002, REQ-DATA-003, REQ-DATA-004, REQ-REL-001]
issues: []
canvases: []
done_when:
  - "src/components/dashboard/evidenceLabels.test.ts proves ET/review-date selection excludes past items from the today-and-next-seven-days list, keeps dated news separate and newest-first, and never treats missing or invalid dates as current"
  - "tests/dashboard/dashboard.spec.ts renders past news with truthful article/date labels and excludes those past rows from the forward catalyst card while preserving current and future events"
  - "tests/dashboard/dashboard.spec.ts exposes the newest supplied source date, unknown dates and endpoint errors without declaring retained older news fresh, globally absent, complete or point-in-time verified"
  - "Relevant unit and hermetic browser tests, TypeScript, build, backend-commit-pinned contract check, actual branch/main docs audits and normal commit/PR gates pass, with screenshots and the FEAT-MARKET-001 catalog record identifying the implementation"
status: approved
supersedes: null
---

# Truthful dashboard event dates and source availability

## Authorized functional repair

The owner requested valid existing-app delivery and the coordinating parent explicitly
confirmed on October 27 that freshness and invalid-score correctness belong to the
existing functional scope. This specification records that narrow repair and must
merge before its implementation. It does not authorize a redesign, new signal,
provider request, API-origin change or broader research. The existing frontend owner
remains the writer. Preserve Design Lab, layout/theme, shared ticker and auth work.

The catalog row is FEAT-MARKET-001, Market dashboard, /dashboard,
/api/dashboard and /api/movement-statement. The actual changed consumer also reads
existing /api/catalysts/events and /api/signals/{ticker}; no endpoint is added.

## Observed source and delivery separation

Solyra MAIN 1dbea0bb4a681f7d6ee272883240dafd9813ca82 has DashboardPage.tsx:
allEvents sorts dates ascending; catalystFeed takes the first five without filtering
against the forward window; newsFeed takes the first four AV news rows and the
header calls their count fresh. The per-row relativeDayLabel already uses ET and
truthfully handles date-only publication fields. A request beginning today does not
prove every returned row is future-dated: the existing backend includes backward
news, so the consumer must qualify its own forward card.

Native QA observed an Oct27 brief plus Oct25 rows under fresh/upcoming labels.
These are rendered observations, not original payload/lineage certification. Current
Catalysts/Gamma Map data, the not-yet-deployed earnings panel and nightly intraday
coverage are separate issues. This change must not label every feed stale or make a
same-day brief dependent on the presence of current-day minute bars.

The source-pinned field handoff is Stocks d78201b0846c1fa1cc2f80b0fe1d106661a2eb2b,
not proof of deployed-image equivalence. The events route exposes status, source,
date_range, total and events_by_date, without publication timestamp, fetched/stored
clock, source-as-of or per-section completeness receipt. For news, date is PostgreSQL
published_ts::date with no timezone contract in the response; for earnings it is the
scheduled earnings_date. The echoed date_range does not bound the news section, which
uses a separate rolling48-hour query. The origin/category label AV news is not an
original-publisher or immutable-response identity. Do not derive missing clocks from
HTTP Date, browser cache age or the time of rendering. A status-ok response and zero
rows are not certification that every source succeeded or that no market news exists.

Score semantics are deliberately separate: the historical_signals corpus mixes
strategies, including a seven-factor momentum producer whose existing string still
uses /5 and a different mean-reversion producer. Merely deleting or replacing a
denominator is not the full acceptance path. The existing STRAT child coordinates
that versioned backend/API contract and producer-derived fixtures; this date-label
change does not implement or claim to close it. The source hook's all-date Infinity
cache defect belongs to the separate DATA/Chart contract, not this specification.

## Minimal display and selection contract

Use the existing live/review reference date: ET today in live mode, selected as-of
calendar date in review mode. Keep the existing seven-day forward request. Select
valid date-only events within that inclusive window for the forward card, ordered
soonest first with a deterministic stable tie order, then take the existing five-row
limit. Call that card today and next seven days, rather than implying a known future
intraday instant for date-only events. A past item must not count as forward. Missing
or malformed dates remain unknown and must not acquire an invented day; retain an
explicit unknown-date count/state rather than silently describing them as current.

News remains a separate AV-news selection across the full returned collection,
newest valid source date first, with the existing four-row limit. Preserve the
existing ET day-granularity source labels; do not manufacture minute freshness from
DATE values. Label the count articles, not fresh. Undated/invalid-date news remains
explicitly date unavailable, after valid dated rows; never coerce it to today. Retain
headline, publisher/source and ticker values exactly as supplied. The frontend does
not infer absence of news from an API error or perform provider backfill/refresh.

Expose the newest supplied source date and retain date-unavailable counts. For example,
Oct25 news shown against an Oct27 reference must visibly remain Oct25; changing fresh
to articles without retaining source-age evidence is insufficient. Date-only values
support calendar-day context, not elapsed-hour freshness or availability at an
intraday review cutoff. Source dates later than a reference and same-day unknown
publication clocks must not become certified historical-as-of evidence. Preserve
unknowns explicitly; the backend source owner owns publication-clock qualification.

Retain each independent card's actual query error/refusal state. A failed refetch
must not silently present retained cache data as a fresh, successful response. Keep
other successful dashboard data visible. An empty section says no matching rows in
the supplied response, not proof of global absence or source completeness. Existing
provider-capable events endpoint calls remain unchanged; no extra polling, diagnostic
fetch, refresh action or provider fallback is added by this display correction.

## Owned paths and single writer

Implementation owns only src/routes/DashboardPage.tsx, a small pure display/selection
helper src/components/dashboard/evidenceLabels.ts and its colocated tests,
tests/dashboard/dashboard.spec.ts and the corresponding existing typed dashboard
fixture if necessary. It may update the existing relative-day tests if an affected
edge requires it, and normal own catalog/plan/traceability records. Reuse existing
ET/calendar/format helpers; this is not a second clock or financial engine.

This is separate from existing earnings PR289, its spec288 and its reserved review
budget. Those records retain their full history; this dashboard repair is not a
replacement or recut of that work. No score producer/API/schema, useMarketData hook, earnings source, shared auth/origin/config,
collector, backend news/catalyst file, Gamma Map or Options Flow implementation is
owned here. The options/news owner owns backend news/catalyst source correction;
this frontend repair does not sanitize backend est-nan titles cosmetically.

## Sensitive tests and release

Use fixed synthetic API fixtures and an explicit ET clock. Include Oct25 past news,
Oct27 current events and Oct28 future events; assertions must fail on unchanged MAIN.
Exercise midnight ET, DST and a selected review date, malformed/missing dates, stable
same-date order, empty responses and retained error/unavailable behavior. Source date, unknown-clock and refusal assertions must remain independent of any
separately owned score or cache fix.
Prove actual rendered Dashboard cards and signal cells through the existing mocked
API routes; screenshots are local fixture evidence, not deployed API proof.

Pin the upstream contract using the existing STOCKS_OPENAPI_REF immutable commit or
STOCKS_OPENAPI_FILE verified snapshot option; record exact commit/snapshot/generated
hashes and actual commands. CI currently checks moving stocks-main: local pinned
success is not a promise of CI or live compatibility. Diagnose any actual drift
without repeated blind triggers and without workflow/protection changes. After
release, compare actual deployed API source/image and payload identity with the
same parent-owned signed-in screen; mocked E2E is not that proof.

Run the affected suites once per materially changed candidate. Preserve ordinary
Solyra review lineage, max-four aggregate passes/max-two external CODE rounds and
all current-head security/CI requirements. No history rewriting. After normal merges
and frontend publication, coordinate a recheck with the parent's existing website QA
owner, including today's and past rows and the selected ticker. That live closeout is
separate from pre-merge tests. Rollback restores the previous reviewed frontend
revision; no database mutation or data replay is required.

Capacity: n/a for new GCP workload. This reuses existing bounded responses and row
limits; no polling, new requests, LLM, provider, storage or production setting change.
