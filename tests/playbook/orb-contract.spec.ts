import { test, expect } from '@playwright/test';
import { mockCommon, M } from '../helpers/mocks';
import { MOCK_LIVE_HISTORY, MOCK_LIVE_QUOTE, MOCK_LIVE_INDICATORS, MOCK_AVG_VOLUME, MOCK_REFERENCE_LEVELS } from '@/mocks/live';
import { MOCK_PLAYBOOK_FRESH } from '@/mocks/dashboard';
const opening={status:'available',ticker:'IWM',session:'2026-10-29',window_minutes:30,window_start:'2026-10-29T13:30:00Z',window_end:'2026-10-29T14:00:00Z',high:131,low:99,comparison_price:140,comparison_as_of:'2026-10-29T15:00:00Z',price_basis:'as_traded_requested',source:'alphavantage',fetched_at:'2026-10-29T15:00:00Z'};
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='localhost'?r.fallback():r.abort());
 await page.route('**/api/**',r=>r.fulfill(M.ok({})));
 await mockCommon(page);
 await page.clock.install({time:new Date('2026-10-29T15:00:00Z')});
 await page.route('**/api/playbook/IWM',r=>r.fulfill(M.ok(MOCK_PLAYBOOK_FRESH)));
 await page.route('**/api/live/status',r=>r.fulfill(M.ok({is_open:true,session:'regular',timezone:'America/New_York'})));
 await page.route('**/api/live/history/IWM',r=>r.fulfill(M.ok(MOCK_LIVE_HISTORY)));
 await page.route('**/api/live/quote/IWM',r=>r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
 await page.route('**/api/live/avg-volume/IWM*',r=>r.fulfill(M.ok(MOCK_AVG_VOLUME)));
 await page.route('**/api/market/reference/IWM/*',r=>r.fulfill(M.ok(MOCK_REFERENCE_LEVELS)));
 await page.route('**/api/live/indicators',r=>r.fulfill(M.ok(MOCK_LIVE_INDICATORS)));
 await page.route('**/api/playbook/evaluate',r=>r.fulfill(M.ok({results_by_key:{},results:[]})));
});
test('server opening projection reaches evaluation without client extrema',async({page},testInfo)=>{
 let snapshot:any;
 await page.route('**/api/live/history/IWM?include_opening=true',r=>r.fulfill(M.ok({...MOCK_LIVE_HISTORY,bars:[{...MOCK_LIVE_HISTORY.bars.at(-1)!,close:999}],opening})));
 await page.route('**/api/playbook/evaluate',r=>{snapshot=r.request().postDataJSON().snapshot;return r.fulfill(M.ok({results_by_key:{},results:[]}));});
 await page.goto('/playbook');
 await expect(page.getByTestId('orb-status')).toContainText('30-minute opening range');
 await expect.poll(()=>snapshot?.orbOpening?.comparison_price).toBe(140);
 expect(snapshot.orbHigh).toBe(131);expect(snapshot.price).toBe(MOCK_LIVE_QUOTE.price);
 expect(snapshot.lastBar).toEqual(MOCK_LIVE_HISTORY.bars.at(-1));
 await page.screenshot({path:testInfo.outputPath('orb-qualified.png'),fullPage:true});
});
for(const state of ['missing','wrong-symbol','partial','stale','error'])test(`${state} remains explicitly unqualified`,async({page})=>{
 await page.route('**/api/live/history/IWM?include_opening=true',r=>{
  if(state==='error')return r.fulfill({status:503,body:'unavailable'});
  const o=state==='missing'?undefined:state==='wrong-symbol'?{...opening,ticker:'SPY'}:state==='partial'?{status:'unavailable',ticker:'IWM',reason:'missing_opening_minutes',fetched_at:opening.fetched_at}:{...opening,comparison_as_of:'2026-10-29T14:57:00Z'};
  return r.fulfill(M.ok({...MOCK_LIVE_HISTORY,opening:o}));
 });
 await page.goto('/playbook');
 await expect(page.getByTestId('orb-status')).toContainText('Opening range unavailable');
 await expect(page.getByTestId('orb-status')).not.toContainText('30-minute opening range');
});
test('failed refresh removes retained successful projection',async({page},testInfo)=>{
 let fail=false;
 let snapshot:any, indicatorBars:unknown;
 await page.route('**/api/live/indicators',r=>{indicatorBars=r.request().postDataJSON().bars;return r.fulfill(M.ok(MOCK_LIVE_INDICATORS));});
 await page.route('**/api/playbook/evaluate',r=>{snapshot=r.request().postDataJSON().snapshot;return r.fulfill(M.ok({results_by_key:{},results:[]}));});
 await page.route('**/api/live/history/IWM?include_opening=true',r=>fail?r.fulfill({status:503,body:'unavailable'}):r.fulfill(M.ok({...MOCK_LIVE_HISTORY,opening})));
 await page.goto('/playbook');await expect(page.getByTestId('orb-status')).toContainText('30-minute opening range');
 await expect.poll(()=>snapshot?.orbOpening?.comparison_price).toBe(140);
 const priorLastBar=snapshot.lastBar;
 fail=true;await page.clock.fastForward(65_000);
 await expect(page.getByTestId('orb-status')).toContainText('request failed');
 await expect(page.getByText('Cards light up as live market conditions are met')).toBeVisible();
 await expect.poll(()=>snapshot?.orbOpening).toBeNull();
 expect(snapshot.orbHigh).toBeNull();expect(snapshot.orbLow).toBeNull();
 expect(snapshot.lastBar).toEqual(priorLastBar);expect(snapshot.price).toBe(MOCK_LIVE_QUOTE.price);
 expect(indicatorBars).toEqual(MOCK_LIVE_HISTORY.bars);
 await page.screenshot({path:testInfo.outputPath('orb-refresh-error.png'),fullPage:true});
});

for (const reason of ['opening_in_progress', 'no_session', 'stale_comparison']) test(`${reason} preserves ordinary history indicators and unrelated evaluation`, async ({page}) => {
 let indicatorBars: unknown, snapshot: any;
 await page.route('**/api/live/history/IWM?include_opening=true', r=>r.fulfill(M.ok({ticker:'IWM',interval:'1min',count:0,bars:[],market_session:'unavailable',market_open:false,opening:{status:'unavailable',ticker:'IWM',reason,fetched_at:opening.fetched_at}})));
 await page.route('**/api/live/indicators', r=>{indicatorBars=r.request().postDataJSON().bars;return r.fulfill(M.ok(MOCK_LIVE_INDICATORS));});
 await page.route('**/api/playbook/evaluate', r=>{snapshot=r.request().postDataJSON().snapshot;return r.fulfill(M.ok({results_by_key:{},results:[]}));});
 await page.goto('/playbook');
 await expect(page.getByTestId('orb-status')).toContainText(reason);
 await expect(page.getByText('Cards light up as live market conditions are met')).toBeVisible();
 await expect.poll(()=>indicatorBars).toEqual(MOCK_LIVE_HISTORY.bars);
 await expect.poll(()=>snapshot?.price).toBe(MOCK_LIVE_QUOTE.price);
 expect(snapshot.lastBar).toEqual(MOCK_LIVE_HISTORY.bars.at(-1));
 expect(snapshot.orbOpening).toBeNull();expect(snapshot.orbHigh).toBeNull();expect(snapshot.orbLow).toBeNull();
});

test('pending refresh cannot retain an expired opening projection or evaluation key', async ({page}) => {
 let calls=0, snapshot:any;
 await page.route('**/api/live/history/IWM?include_opening=true',async r=>{
  calls++;
  if(calls>1) return new Promise<void>(()=>{}); // intentionally no new response/object
  await r.fulfill(M.ok({...MOCK_LIVE_HISTORY,opening}));
 });
 await page.route('**/api/playbook/evaluate',r=>{snapshot=r.request().postDataJSON().snapshot;return r.fulfill(M.ok({results_by_key:{},results:[]}));});
 await page.goto('/playbook');
 await expect.poll(()=>snapshot?.orbOpening?.comparison_price).toBe(140);
 // Let initial React Query notifications complete before pausing the clock.
 await page.clock.pauseAt(new Date('2026-10-29T15:00:10Z'));
 await page.clock.fastForward(110000);
 await expect.poll(()=>calls).toBeGreaterThan(1);
 await expect(page.getByTestId('orb-status')).toContainText('30-minute opening range');
 await page.clock.fastForward(1);
 await expect(page.getByTestId('orb-status')).toContainText('Opening range unavailable');
 await expect.poll(()=>snapshot?.orbOpening).toBeNull();
 expect(snapshot.orbHigh).toBeNull();expect(snapshot.orbLow).toBeNull();
 expect(snapshot.lastBar).toEqual(MOCK_LIVE_HISTORY.bars.at(-1));
});
