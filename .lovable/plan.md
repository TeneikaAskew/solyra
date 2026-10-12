# Fix charts, dropdown, and data loading on /ai-insights-lovable

## What you'll see when done

- **Briefing chart loads candles** — the blank chart on Briefing shows real candlesticks for the selected ticker.
- **Same candlestick chart in Chat** — the old thin line chart in Chat is replaced with the same TradingView-style candlestick chart used on Briefing.
- **Previous questions dropdown shows the last 10** (up from 8).
- **Watchlist investigated** — find out whether "No candidates ranked" is a UI bug or genuinely empty backend data, and fix it if it's a bug. If the backend truly has no ranked candidates, the page will say so clearly instead of looking broken.
- **Signed-in validation** — sign in with the test account, ask a real research question in Chat, and confirm a real answer with citations appears, with screenshots.

## Steps

1. **Diagnose the blank Briefing chart** — check what the chart's data request returns signed in (date format, available sessions, errors) and fix the root cause so candles render.
2. **Replace Chat's line chart** with the shared candlestick chart component (`ResearchCandleChart`), keeping the live quote box.
3. **Bump the Previous questions dropdown from 8 to 10 entries.**
4. **Investigate Watchlist data loading** — trace the ranked-candidates request signed in; if the request fails or is malformed, fix it; if the backend returns empty, make the empty state honest and keep "Ask research" working.
5. **Confirm Chat research answers end-to-end** — signed in, ask a real IWM question in Chat, verify the answer streams back with citations and the same catalyst evidence as Briefing.
6. **Verify** — run the page's browser tests, confirm the build is clean, and capture signed-in screenshots of Briefing (chart visible), Chat (candlestick + real answer), Watchlist, and the 10-item dropdown.

## Technical notes

- Chart work stays in `ResearchCandleChart.tsx` / `InsightsLovablePage.tsx` / `AiInsightsLovablePage.tsx`; no changes to `/insights` or `/insights-lovable` standalone routes beyond the shared Chat component.
- Watchlist fix only touches frontend request/empty-state code unless the backend response proves the data is genuinely absent — in that case I'll report it as a backend data gap rather than fabricate content.
- Signed-in checks use the test account already used for prior validation; no credentials are printed or stored.
