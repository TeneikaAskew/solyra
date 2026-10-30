import {test,expect} from '@playwright/test';
import {mockInsightsApi,MOCK_INSIGHT_HISTORY} from '../helpers/fixtures/insights';
import {M} from '../helpers/mocks';
import {MOCK_SIMILAR_SETUPS} from '@/mocks/charts';
import {MOCK_LIVE_QUOTE} from '@/mocks/live';
const sid='11111111-1111-4111-8111-111111111111';
const saved={id:sid,ticker:'IWM',mode:'live',replay_cutoff:null,title:'Saved IWM question',status:'active',created_at:'2026-10-01T10:00:00Z',updated_at:'2026-10-01T10:00:00Z'};
const answer={answer:'Saved IWM answer',facts:[],bullCase:'bull',bearCase:'bear',invalidation:'invalid',unknowns:[],catalystTimeline:[],replayContext:null};
test.beforeEach(async({page})=>{
 await page.route('**/*',r=>{const u=new URL(r.request().url()); return u.hostname==='localhost'?r.fallback():r.abort();});
 await page.route('**/api/**',r=>r.fulfill(M.notFound()));
 await mockInsightsApi(page,{history:MOCK_INSIGHT_HISTORY});
 await page.route('**/api/live/quote/*',r=>r.fulfill(M.ok(MOCK_LIVE_QUOTE)));
 await page.route('**/api/market/dates/*',r=>r.fulfill(M.ok({ticker:'IWM',dates:['20261007'],months:['202610'],source:'fixture'})));
 await page.route('**/api/market/data/*/*',r=>{const u=new URL(r.request().url()); const day=u.pathname.split('/').at(-1)!;const time=Date.parse(day.slice(0,4)+'-'+day.slice(4,6)+'-'+day.slice(6,8)+'T14:00:00Z')/1000;return r.fulfill(M.ok({ticker:u.pathname.split('/').at(-2),date:day,timeframe:Number(u.searchParams.get('timeframe')),count:1,candlestick:[{time,open:100,high:102,low:99,close:101}],volume:[{time,value:100,color:'#fff'}]}));});
 await page.route('**/api/signals/*?*',r=>r.fulfill(M.ok({signals:[{time:'2026-10-01 14:00:00',direction:'CALL',rsi:35,score:4}]})));
 await page.route('**/api/signals/*/similar?*',r=>r.fulfill(M.ok({...MOCK_SIMILAR_SETUPS,stats:{...MOCK_SIMILAR_SETUPS.stats,latest:'2026-10-20 14:00:00'},matches:[{...MOCK_SIMILAR_SETUPS.matches[0],time:'2026-10-20 14:00:00'}]})));
 await page.route('**/functions/v1/insights-research',r=>{const b=r.request().postDataJSON();return r.fulfill(M.ok(b.action==='list'?{sessions:[saved]}:{session:saved,messages:[{id:'m',question:saved.title,answer,run_state:'completed'}],sources:[]}));});
 await page.goto('/ai-insights-lovable'); await expect(page.getByRole('region',{name:'Decision'})).toBeVisible();
});
test('INS-FINAL-001/002 withholds future charts and unbounded Replay similarities',async({page},info)=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('/api/market/data')||r.url().includes('/similar?'))requests.push(r.url());});
 await page.getByLabel('Point-in-time cutoff').fill('2026-10-01T15:30');
 await expect(page.getByRole('region',{name:'Price chart'})).toContainText('no trading session exists on or before this cutoff');
 await expect(page.getByRole('region',{name:'Price chart'}).locator('canvas')).toHaveCount(0);
 await expect(page.getByText('2026-10-20 14:00',{exact:true})).toHaveCount(0);
 expect(requests.some(u=>u.includes('/20261007?')&&u.includes('end_time=15'))).toBe(false);
 await info.attach('requests.json',{body:JSON.stringify(requests),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('future-replay.png')});
});
test('INS-FINAL-007/008 supports keyboard tabs and preserves draft',async({page})=>{
 const briefing=page.getByRole('tab',{name:'Briefing',exact:true});await briefing.focus();await page.keyboard.press('ArrowRight');
 await expect(page.getByRole('tab',{name:'Agents',exact:true})).toBeFocused();await expect(briefing).toHaveAttribute('tabindex','-1');await page.keyboard.press('End');await expect(page.getByRole('tab',{name:'Chat',exact:true})).toBeFocused();await page.keyboard.press('Home');await expect(briefing).toBeFocused();await expect(briefing).toHaveAttribute('aria-controls','insights-panel-briefing');
 await page.getByRole('tab',{name:'Chat',exact:true}).click();const q=page.getByRole('textbox',{name:'Question',exact:true});await q.fill('Draft question that must survive navigation');
 await page.getByRole('tab',{name:'Briefing',exact:true}).click();await page.getByRole('tab',{name:'Chat',exact:true}).click();await expect(q).toHaveValue('Draft question that must survive navigation');
});
test('INS-FINAL-005 pressure-test starts the report ticker as new research',async({page},info)=>{
 await page.getByRole('tab',{name:/^History/}).click();await page.getByRole('button').filter({hasText:'Saved IWM question'}).click();await expect(page.getByText(answer.answer,{exact:true})).toBeVisible();
 await page.route('**/api/insights/report/QQQ',async r=>{const {MOCK_INSIGHT_REPORT}=await import('@/mocks/insights');return r.fulfill(M.ok({...MOCK_INSIGHT_REPORT,ticker:'QQQ'}));});
 await page.getByRole('button',{name:'Active ticker',exact:true}).click();await page.getByTestId('ticker-option-QQQ').click();
 await page.getByRole('tab',{name:'Briefing',exact:true}).click();
 // Force the QQQ report query to retry with the newly installed fixture.
 await page.evaluate(async()=>{window.dispatchEvent(new Event('focus'));});
 await page.getByRole('button',{name:'Pressure-test this call with cited research'}).click();
 await expect(page.getByRole('textbox',{name:'Question',exact:true})).toContainText('');
 await expect(page.getByRole('textbox',{name:'Question',exact:true})).toHaveValue('What would invalidate the long call on QQQ?');
 const req=page.waitForRequest(r=>r.url().includes('/insights-research')&&r.postDataJSON()?.action==='research');await page.getByRole('button',{name:'Research',exact:true}).click();
 const b=(await req).postDataJSON();expect(b.ticker).toBe('QQQ');expect(b.sessionId).toBeNull();expect(b.question).toContain('QQQ');
 await info.attach('mismatched-request.json',{body:JSON.stringify(b),contentType:'application/json'});
});
test('INS-FINAL-006 late saved read cannot overwrite new context',async({page},info)=>{
 const {MOCK_WATCHLIST}=await import('@/mocks/insights');
 await page.route('**/api/insights/watchlist**',r=>r.fulfill(M.ok(MOCK_WATCHLIST)));
 let release!:()=>void;const held=new Promise<void>(r=>release=r);let readStarted=false;
 await page.route('**/functions/v1/insights-research',async r=>{if(r.request().postDataJSON()?.action!=='read')return r.fallback();readStarted=true;await held;return r.fulfill(M.ok({session:saved,messages:[{id:'m',question:saved.title,answer,run_state:'completed'}],sources:[]}));});
 await page.getByRole('tab',{name:/^History/}).click();await page.getByRole('button').filter({hasText:'Saved IWM question'}).click();await expect.poll(()=>readStarted).toBe(true);
 await page.getByRole('tab',{name:'Watchlist',exact:true}).click();await page.getByRole('button',{name:'Ask research',exact:true}).last().click();
 await expect(page.getByRole('textbox',{name:'Question',exact:true})).toHaveAttribute('placeholder',/Ask about AAPL/);
 release();await expect(page.getByText(answer.answer,{exact:true})).toHaveCount(0);await expect(page.getByRole('textbox',{name:'Question',exact:true})).toHaveAttribute('placeholder',/Ask about AAPL/);
 await expect(page.getByRole('button',{name:'Active ticker',exact:true})).toContainText('AAPL');
 await page.screenshot({path:info.outputPath('late-read.png')});
});
test('ACC-FAILED-HISTORY refreshes terminal failure into unified history',async({page},info)=>{
 let failed=false;const seen:string[]=[];
 await page.route('**/functions/v1/insights-research',r=>{const b=r.request().postDataJSON();seen.push(b.action);if(b.action==='list')return r.fulfill(M.ok({sessions:failed?[{...saved,status:'failed',title:'New failed question'}]:[]}));if(b.action==='research'){failed=true;return r.fulfill({status:200,contentType:'application/x-ndjson',body:[{type:'session',sessionId:sid},{type:'error',code:'dependency',message:'Provider failed',status:503}].map(x=>JSON.stringify(x)).join('\n')+'\n'});}return r.fallback();});
 await page.getByRole('tab',{name:'Chat',exact:true}).click();await page.getByRole('textbox',{name:'Question',exact:true}).fill('New failed question');await page.getByRole('button',{name:'Research',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Provider failed');
 await page.getByRole('tab',{name:/^History/}).click();await page.getByRole('group',{name:'Filter history'}).getByRole('button',{name:'research',exact:true}).click();await expect(page.getByRole('tabpanel',{name:'History'}).getByRole('button').filter({hasText:'New failed question'})).toBeVisible();expect(seen.filter(action=>action==='list').length).toBeGreaterThan(1);
 await info.attach('request-sequence.json',{body:JSON.stringify(seen),contentType:'application/json'});
});
test('INS-FINAL-004/010 preserves saved signals, prior direction and cost',async({page},info)=>{
 const {MOCK_WATCHLIST,MOCK_INSIGHT_REPORT}=await import('@/mocks/insights');
 await page.route('**/api/insights/watchlist**',r=>r.fulfill(M.ok(MOCK_WATCHLIST)));
 await page.setViewportSize({width:390,height:900});await page.getByRole('tab',{name:'Watchlist',exact:true}).click();
 await expect(page.getByRole('button',{name:'Ask research',exact:true}).first()).toBeVisible();
 const geometry=await page.evaluate(()=>({pageOverflow:document.documentElement.scrollWidth-innerWidth,buttons:[...document.querySelectorAll('button')].filter(x=>x.textContent?.includes('Generate report')).map(x=>({text:x.textContent,right:x.getBoundingClientRect().right}))}));
 await info.attach('watchlist-geometry.json',{body:JSON.stringify(geometry),contentType:'application/json'});console.log('POPULATED WATCHLIST',JSON.stringify(geometry));await page.screenshot({path:info.outputPath('populated-watchlist-390.png')});
 await page.route('**/api/insights/reports/*',r=>r.fulfill(M.ok({...MOCK_INSIGHT_REPORT,as_of:'2026-04-14T14:30:00Z',report:{...MOCK_INSIGHT_REPORT.report,supporting_signals:[{alert_ts:'2026-04-14T13:00:00Z',direction:'PUT',score:3,strength:'old saved signal'}]}})));
 await page.getByRole('tab',{name:/^History/}).click();const history=page.getByRole('tabpanel',{name:'History'});expect(await history.getByText(/changed from/).count()).toBeGreaterThan(0);expect(await history.getByText('$0.0134',{exact:true}).count()).toBe(1);
 await history.getByRole('button').filter({hasText:'Report run'}).last().click();await expect(page.getByText('Viewing a past report, not the latest.')).toBeVisible();const signals=page.getByRole('list',{name:'Recent signals'});await expect(signals).not.toContainText('2026-10-01');await expect(signals).toContainText('2026-04-14');
});
