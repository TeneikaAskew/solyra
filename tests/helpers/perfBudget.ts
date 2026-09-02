/**
 * Perf-budget policy (issue #9).
 *
 * The strict per-page budgets (3s/5s/7s) measure the DEV SERVER, not the
 * app: they were tuned on a warm, quiet machine, and they flake the moment
 * the box is contended (a second runner, file-sync I/O, CI noise) even when
 * nothing regressed in the product. Policy, from the 2026-09-01 evidence in
 * docs/TEST_COVERAGE_AUDIT.md §6:
 *
 *  - DEFAULT runs assert a relaxed ceiling (max(strict, 8s)). That still
 *    catches the regression class these tests exist for — a route
 *    accidentally waiting on live infrastructure (staging fallback,
 *    cold-starting Cloud Run), which blows straight past 8s — without
 *    failing the suite over scheduler noise.
 *  - PERF=1 runs assert the strict budgets. Use on a quiet box when
 *    dev-server latency itself is the question.
 */
const PERF_STRICT = process.env.PERF === '1';
const RELAXED_MS = 8_000;

/** The millisecond budget to assert for a page whose strict target is `strictMs`. */
export function perfBudgetMs(strictMs: number): number {
  return PERF_STRICT ? strictMs : Math.max(strictMs, RELAXED_MS);
}
