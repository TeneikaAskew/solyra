/**
 * Fixture ↔ runtime binding for the journal pipeline.
 *
 * The typed fixtures in tests/helpers/fixtures/journal.ts are pinned to the
 * JournalRow CONTRACT by `satisfies`, but tsc cannot check semantic
 * invariants — that an active row maps to undefined (never 0) financials,
 * that replay rows keep the keys the analytics-hygiene filter needs, or that
 * the export guard drops exactly the rows the server would 422 on. These
 * tests run the shared fixtures through the real mappers, so a fixture edit
 * that silently breaks an invariant fails here instead of deep inside an E2E
 * assertion.
 *
 * Vitest's include only matches test files under src/ (vite.config.ts
 * `test.include`), which is why this file lives beside the hook rather than
 * under tests/.
 */
import { describe, expect, it } from 'vitest';
import { journalRowToTradeEntry, isoNaiveToEpoch } from './useJournalChartTrades';
import { exportableTrades } from '@/routes/JournalPage';
import {
  ACTIVE_TRADE,
  CLOSED_TRADE,
  MANUAL_TRADE,
  MOCK_JOURNAL_TRADES_WITH_ACTIVE,
  MOCK_MIXED_TRADES,
  REPLAY_TRADE,
} from '../../tests/helpers/fixtures/journal';

describe('journalRowToTradeEntry on the shared fixtures', () => {
  it('maps the closed winner with sign-preserved pnl and naive-UTC times', () => {
    const t = journalRowToTradeEntry(CLOSED_TRADE);
    expect(t.id).toBe(CLOSED_TRADE.id);
    expect(t.optionType).toBe('CALL');
    expect(t.status).toBe('win');
    // Naive wall-clock → Date.UTC, never a host-local `new Date()` parse.
    expect(t.entryTime).toBe(Math.floor(Date.UTC(2026, 3, 23, 14, 0, 0) / 1000));
    expect(t.exitTime).toBe(Math.floor(Date.UTC(2026, 3, 23, 15, 30, 0) / 1000));
    // pnl derives from the server's sign-corrected return_pct — no client
    // re-derivation of direction math.
    expect(t.pnlPercent).toBe(1.14);
    expect(t.pnl).toBeCloseTo(220.0 * 0.0114, 10);
  });

  it('keeps an active trade honest: financials undefined, never zero (Rule 3.7)', () => {
    const t = journalRowToTradeEntry(ACTIVE_TRADE);
    expect(t.status).toBe('active');
    expect(t.exitTime).toBeUndefined();
    expect(t.exitPrice).toBeUndefined();
    // The whole point of the nullable contract: an open position has NO
    // return yet. 0 here would be indistinguishable from breakeven.
    expect(t.pnl).toBeUndefined();
    expect(t.pnlPercent).toBeUndefined();
    // Risk levels survive the mapping for the chart's price lines.
    expect(t.stopLoss).toEqual({ price: 220 });
    expect(t.takeProfits).toEqual([
      { price: 216, size: 0 },
      { price: 214, size: 0 },
    ]);
  });

  it('passes through the keys the practice-trade analytics hygiene filters on', () => {
    const replay = journalRowToTradeEntry(REPLAY_TRADE);
    expect(replay.source).toBe('replay');
    expect(replay.sessionId).toBe(REPLAY_TRADE.session_id);
    expect(replay.status).toBe('loss');

    const manual = journalRowToTradeEntry(MANUAL_TRADE);
    expect(manual.source).toBe('manual');
    expect(manual.sessionId).toBeUndefined();
  });

  it('MOCK_MIXED_TRADES carries the exact aggregate the Task 5.3 spec asserts', () => {
    // journal.spec.ts pins +10.00% default / -20.00% avg with the toggle on.
    // If someone retunes the fixture rows those assertions break obscurely in
    // E2E; this states the arithmetic contract next to the fixture instead.
    const returns = MOCK_MIXED_TRADES.trades.map((r) => r.return_pct);
    expect(returns).toEqual([10.0, -50.0]);
    expect((10.0 + -50.0) / 2).toBe(-20.0);
  });
});

describe('exportableTrades on the shared fixtures', () => {
  it('drops the active row the export endpoint would 422 on, keeps the closed one', () => {
    const out = exportableTrades(MOCK_JOURNAL_TRADES_WITH_ACTIVE.trades);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(CLOSED_TRADE.id);
  });
});

describe('isoNaiveToEpoch on fixture timestamp formats', () => {
  it('parses both the T-separated and space-separated shapes the fixtures use', () => {
    // Server rows come back "YYYY-MM-DD HH:MM:SS" (naive); some fixtures use
    // the T-separated ISO shape. Both must land on the same wall-clock epoch.
    expect(isoNaiveToEpoch('2026-04-24T14:00:00')).toBe(
      isoNaiveToEpoch('2026-04-24 14:00:00')
    );
  });
});
