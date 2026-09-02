import { useQuery } from '@tanstack/react-query';

// Server-computed trade analytics (platform/api/routers/analytics.py in the
// stocks repo). One consumer surface: SignalsPage pulls DB-backed backtest
// aggregates from GET /api/analytics/summary/{ticker}.
//
// There used to be a second export here, useTradeAnalytics(), posting ad-hoc
// trade arrays to POST /api/analytics/trade-stats for ChartsPage. The Task 6
// strip-down (52acbe1) removed its only consumer, and issue #13 ratified the
// split that emerged: journal-scope aggregates (return-% based, equity curve,
// practice-trade exclusion, session scoping, R:R / TP1) are computed
// client-side in src/lib/journalStats.ts over rows the client already holds
// in full — see the decision note there. The POST endpoint stays available
// server-side for future ad-hoc consumers.

export interface TradeStats {
  totalTrades: number;
  closedTrades: number;
  activeTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalPnL: number;
  avgPnL: number;
  maxWin: number;
  maxLoss: number;
  profitFactor: number | null;
  callCount: number;
  putCount: number;
}

/**
 * Server-computed stats for a ticker's backtested trades (from the DB).
 * Default lookback is 90 days.
 */
export function useTradeSummary(ticker: string, days = 90) {
  return useQuery<TradeStats>({
    queryKey: ['trade-summary', ticker, days],
    queryFn: async () => {
      const r = await fetch(`/api/analytics/summary/${ticker}?days=${days}`);
      if (!r.ok) throw new Error(`trade-summary ${r.status}`);
      return r.json();
    },
    enabled: !!ticker,
    staleTime: 5 * 60_000,
  });
}
