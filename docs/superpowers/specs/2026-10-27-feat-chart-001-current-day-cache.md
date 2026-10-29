---
feat_id: FEAT-CHART-001
req_ids: [REQ-DATA-001, REQ-DATA-002, REQ-DATA-003, REQ-DATA-004, REQ-REL-001]
issues: []
canvases: []
done_when:
  - "src/hooks/useMarketData.test.ts exercises the actual hook query options with QueryClient: current-day/current-month results can revalidate after a bounded stale interval while historical legacy results remain cached only within a finite interval and can expose a later stored backfill"
  - "src/hooks/useMarketData.test.ts rejects mismatched request identity and malformed/nonfinite OHLC responses, retains genuine error/no-data distinctions, and never infers source time, raw price basis or completeness from a legacy bar timestamp, row count or client fetch clock"
  - "tests/charts/charts-cards.spec.ts proves current data can advance on existing mount/focus/manual revalidation without a new polling loop, historical data is not permanently frozen by date alone, and missing data remains unavailable rather than zero or a certified live/raw source"
  - "Relevant unit/browser tests, TypeScript/build, backend-commit-pinned contract check, actual branch/main docs audits and normal gates pass; own FEAT-CHART-001 record and screenshots preserve mocked versus deployed acceptance"
status: approved
supersedes: null
---

# Current day chart cache and legacy source qualification

## Authorized repair and single owner

The owner requested root-cause repair, and the coordinating parent explicitly admitted
an independently reviewed historical/current-day cache contract in the existing DATA
and frontend delivery path. The existing Solyra owner is the sole hook writer. This
specification must merge through normal review before implementation. It is separate
from the dashboard event-date labels, earnings PR289 and the producer's DATA contract.
No frontend may invent fields from that other author's private interfaces.

Catalog: FEAT-CHART-001, Charting, existing /charts instrument/timeframe analysis.
Source: Solyra MAIN 1dbea0bb4a681f7d6ee272883240dafd9813ca82;
backend field packet Stocks d78201b0846c1fa1cc2f80b0fe1d106661a2eb2b.
These source pins are not deployed-image equivalence or original point-in-time receipts.

## Reproduced root cause and limits

src/hooks/useMarketData.ts assigns Infinity to every bar-query staleTime, with the
comment that historical data does not change. The date parameter also accepts current
days and months. Actual-hook options captured into a real QueryClient reproduced two
failures and two positive controls without external I/O: after a controlled current-day
response changes, a repeated fetch remains old; a synthetic empty-success historical
response also stays empty. Existing past-date caching and explicit invalidation work.
The synthetic empty-success control is defensive, not proof that the production
missing-data path returns 200: the actual source returns 404 when neither SQL nor GCS
has data. Add a nonempty partial-history/backfill control before claiming coverage.

A first-request Oct27 no-data result and the known nightly collector cadence are an
ingestion/coverage issue, not proved to be caused by Infinity. Fixing the cache does
not create missing bars or change the producer schedule. It prevents a second barrier
once stored data becomes available or changes. Successful job exits alone do not prove
IWM coverage, raw price basis or correct query/date selection.

The existing bar response contains ONLY ticker,date,timeframe,count,candlestick,volume.
It supplies no source, adjustment basis, source-as-of, completeness or writer receipt.
count is returned/resampled bars, not expected session coverage. time encodes naive
Eastern wall labels as seconds, not an independently verified UTC instant; end_time
filters bar OPEN labels, not guaranteed completed intervals. Do not relabel max(time)
as source-as-of, infer RAW from a requested symbol, or claim a closed/PIT snapshot.
The loader is a read-only SQL/GCS reader, but source/path is not exposed by the response.

## Bounded cache contract

Reuse the existing key ticker/date/timeframe/end_time. Using the existing ET calendar
helper, classify current/future day and current/future month requests as mutable.
Use a 60-second stale interval; revalidation occurs only on existing mount, focus or
explicit invalidation/refetch paths. Do not add refetchInterval, timer polling,
provider requests, a refresh=true query, retry loops, origin/auth changes or new
endpoint calls. At most one request is in flight per key under existing QueryClient
deduplication; disable automatic query retries for these reads so errors stay bounded.

A past date alone does not establish immutable history. The current legacy response
has no receipt that can admit a permanently immutable result. Use a finite five-minute
stale interval for legacy historical responses, not Infinity. Keep positive caching
within that interval; after expiry a stored partial-history backfill can be observed
on an existing revalidation event. Empty, failed or incomplete/unknown-source results
never become immutable simply because a calendar date passed. A future reviewed DATA
receipt contract may admit qualified immutable history; this change neither invents
that interface nor claims it exists. No source metadata is backdated or inferred.

Apply this temporal policy to the bar query and the same file's reference-level cache;
keep available-dates' existing five-minute policy. Preserve each response's own shape:
a reference date may legitimately be an earlier as-of row, so do not impose the bar
response's exact-date equality on that separate contract. A 404 is a distinct unavailable
result; 401/403/5xx must not be converted silently into a successful immutable null.
Surface each query's refusal independently without discarding another successful query.

For bar responses, validate requested ticker/date/timeframe identity, a nonnegative
integer count matching the candle array, finite positive coherent OHLC and finite
ordered legacy time labels. Reject invalid/duplicated/conflicting bars visibly; do
not interpolate, shift windows, fill missing bars or normalize adjustment basis.
Preserve legitimate flat candles and volume zero. These checks do not certify complete
session coverage or original publication vintage. Keep absent source/as-of/basis
qualification explicit in the existing chart status area; a client fetch clock is not
a source clock. No new server response field is assumed or named as already available.

## Owned paths and contract coordination

Own src/hooks/useMarketData.ts and focused src/hooks/useMarketData.test.ts. Keep the
small policy/validation code in that existing hook file unless a normal reviewed
reason requires one helper; do not create competing caches or duplicate clocks.
Own only the minimal qualification/refusal rendering in src/routes/ChartsPage.tsx,
tests/charts/charts-cards.spec.ts and its existing typed fixture if required. Preserve
Design Lab, chart geometry, strategy computation, shared ticker state and auth gates.
Normal own catalog/plan records are allowed. No backend, collector, schema, API origin,
provider, source-proof gate or workflow file is changed by this frontend contract.

The DATA owner retains adjusted=false producer evidence, timestamp convention,
persistence coverage and real writer receipt. Unknown legacy adjustment basis stays
unknown. End-time completion semantics and any new source/receipt API interface remain
owned by that reviewed backend contract; this cache repair cannot substitute for them.

## Sensitive acceptance and release

Keep original red controls and add positive current-day/current-month, historical
within/after TTL, nonempty backfill, day/month rollover, ET/DST and request-key isolation
controls. Test unknown metadata, wrong ticker/date/timeframe, null/nonfinite/incoherent
prices, duplicate/time-order faults, valid flat candles and zero volume. Use actual
hook query options and mock only the read boundary, not a copied implementation.
Browser controls use the existing mocked GET and existing focus/mount paths, with no
network/provider and no new polling. Do not infer ingestion health from a mocked pass.

Pin contract:check with STOCKS_OPENAPI_REF immutable backend commit or a verified
STOCKS_OPENAPI_FILE, retaining all hashes. CI's moving-main dependency is separate:
local pinned success is not deployed contract proof and does not justify retriggers.
Retain existing review budgets, required checks and normal protected merges. The
seven known untouched-MAIN E2E failures require their already-approved normal repair
path; do not skip them or publish repeated knowingly blocked CI heads.

After normal source merge/publication, parent-owned website QA rechecks actual version,
request identity, stored current-day coverage and real API-to-screen behavior. No
other browser/tab owner is introduced. Full DATA source/raw-basis/PIT completion still
requires the real writer and source-qualified API evidence; this client repair alone
is not that acceptance. Rollback restores the prior reviewed frontend revision only.

Capacity: n/a for new GCP workload. No new background polling, provider acquisition,
SQL write, notification or storage is added. Existing read-only GETs may revalidate on
existing user/focus/mount events after the stated TTL; no production replay is run.
