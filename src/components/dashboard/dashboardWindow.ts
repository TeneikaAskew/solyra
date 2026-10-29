/** Select the dashboard's shared window using the API's naive-ET epoch convention. */
export function selectDashboardWindow<C extends { time: number }, V extends { time: number }>(
  candles: readonly C[], volumes: readonly V[], cutoff: number | null,
): { status: 'ready' | 'empty' | 'invalid'; reason: string; sessionCount: number; candlestick: C[]; volume: V[] } {
  const validTime = (time: number) => Number.isInteger(time) && Number.isFinite(new Date(time * 1000).getTime());
  const validSeries = (rows: readonly { time: number }[]) => Array.isArray(rows)
    && rows.every(row => row !== null && typeof row === 'object' && validTime(row.time))
    && new Set(rows.map(row => row.time)).size === rows.length;
  if ((cutoff !== null && !validTime(cutoff)) || !validSeries(candles) || !validSeries(volumes)) {
    return { status: 'invalid', reason: 'Intraday window unavailable: invalid or duplicate source timestamps.', sessionCount: 0, candlestick: [], volume: [] };
  }
  const day = (time: number) => new Date(time * 1000).toISOString().slice(0, 10);
  const eligible = [...candles].sort((a, b) => a.time - b.time).filter(bar => {
    const hour = new Date(bar.time * 1000).getUTCHours();
    return (cutoff === null || bar.time <= cutoff) && hour >= 4 && hour <= 16;
  });
  const days = new Set([...new Set(eligible.map(bar => day(bar.time)))].slice(-2));
  const candlestick = eligible.filter(bar => days.has(day(bar.time)));
  const times = new Set(candlestick.map(bar => bar.time));
  const volume = volumes.filter(bar => times.has(bar.time)).sort((a, b) => a.time - b.time);
  return { status: candlestick.length ? 'ready' : 'empty', reason: candlestick.length ? '' : 'Intraday window unavailable: no bars for the selected session window.', sessionCount: days.size, candlestick, volume };
}
