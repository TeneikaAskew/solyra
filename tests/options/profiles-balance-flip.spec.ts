import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockOptionsApi } from '../helpers/fixtures/options';
const base=JSON.parse(readFileSync(new URL('../fixtures/current-gamma-producer-contract.json',import.meta.url),'utf8'));
const distinct=JSON.parse(readFileSync(new URL('../fixtures/distinct-gamma-producer-contract.json',import.meta.url),'utf8'));
async function setup(page: import('@playwright/test').Page, sample=distinct) {
 await page.route('**/*',r=>{const u=new URL(r.request().url());return !['localhost','127.0.0.1'].includes(u.hostname)||u.pathname.startsWith('/api/')?r.abort('blockedbyclient'):r.continue();});
 await mockOptionsApi(page);
 await page.route('**/api/options/dates/IWM*',r=>r.fulfill({json:{ticker:'IWM',dates:['2026-10-27']}}));
 await page.route('**/api/options/IWM/*/levels*',r=>r.fulfill({json:sample.levels}));
 await page.route('**/api/options/IWM/grid*',r=>r.fulfill({json:sample.grid}));
 await page.route('**/api/options/IWM/2026-10-27',r=>r.fulfill({json:distinct.chain_response}));
 await page.route('**/api/options/greeks',r=>r.fulfill({json:distinct.greeks}));
 await page.goto('/options');
}
test('Gamma Map binds true flip, not unequal balance',async({page},info)=>{
 await setup(page);
 const legend=page.locator('.hs-legend');
 await expect(legend.locator('.chip.flip .val')).toHaveText(distinct.levels.gamma_flip.toFixed(2),{timeout:3000});
 await expect(legend).toContainText('Gamma Balance');
 await expect(legend.locator('.chip.balance .val')).toHaveText(distinct.levels.gamma_balance.toFixed(2));
 await page.screenshot({path:info.outputPath('gamma-distinct-balance-flip.png'),fullPage:true});
});
test('Profiles does not substitute balance or legacy greek zero_gamma for absent true flip',async({page},info)=>{
 await setup(page,base);await page.getByRole('button',{name:'Profiles',exact:true}).click();
 const flip=page.locator('div.rounded-xl').filter({has:page.getByText('Gamma Flip',{exact:true})});
 await expect(flip.locator('.metric-value')).toHaveText('--',{timeout:3000});
 await expect(page.getByText('Gamma Balance',{exact:true})).toBeVisible();
 await expect(page.getByText(/Balance level \$/)).toHaveCount(base.levels.gamma_balance_levels.length);
 await expect(page.getByText(/Source: cloud_sql/)).toContainText('2026-10-27 15:55 ET');
 await page.screenshot({path:info.outputPath('profiles-missing-true-flip.png'),fullPage:true});
});

test('Gamma Map keeps absent flip unknown even when another grid supplies a flip',async({page},info)=>{
 await setup(page,{...distinct,levels:base.levels});
 await expect(page.locator('.hs-legend .chip.flip .val')).toHaveText('—');
 await expect(page.locator('.hs-legend .chip.balance .val')).toHaveText('100.00');
 await page.screenshot({path:info.outputPath('gamma-missing-true-flip.png'),fullPage:true});
});
test('Profiles binds unequal backend prices, batch clock and balance-neighbor labels',async({page},info)=>{
 await setup(page);await page.getByRole('button',{name:'Profiles',exact:true}).click();
 const card=(name:string)=>page.locator('div.rounded-xl').filter({has:page.getByText(name,{exact:true})}).locator('.metric-value');
 await expect(card('Gamma Flip')).toHaveText('$99.52');await expect(card('Gamma Balance')).toHaveText('$100.00');
 await expect(page.getByText(/Balance level \$/)).toHaveCount(distinct.levels.gamma_balance_levels.length);
 await expect(page.getByText(/Source: cloud_sql/)).toContainText('IWM · 2026-10-27 · 12 contracts · Batch snapshot 2026-10-27 15:55 ET');
 await expect(page.getByText(/Source: cloud_sql/)).toContainText('quote freshness unverified');
 await page.screenshot({path:info.outputPath('profiles-distinct-balance-flip.png'),fullPage:true});
 await page.getByText(/Source: cloud_sql/).screenshot({path:info.outputPath('profiles-batch-source-footer.png')});
});
test('Profiles hides cached chain analytics/footer on failed refetch and recovers independently of levels',async({page},info)=>{
 await page.clock.install({time:new Date('2026-10-27T20:00:00Z')});await setup(page);
 let failed=false,requests=0;
 await page.route('**/api/options/IWM/2026-10-27',r=>{requests++;return r.fulfill(failed?{status:503,json:{detail:'SYNTHETIC stored chain refused'}}:{json:distinct.chain_response});});
 await page.getByRole('button',{name:'Profiles',exact:true}).click();
 await expect(page.getByText(/Source: cloud_sql/)).toBeVisible();await expect(page.getByText('Total GEX',{exact:true})).toBeVisible();
 failed=true;await page.clock.setSystemTime(new Date('2026-10-27T21:01:00Z'));
 await page.evaluate(()=>window.dispatchEvent(new Event('visibilitychange')));
 await expect(page.getByText('Options chain unavailable',{exact:true})).toBeVisible();
 await expect(page.getByText(/Source: cloud_sql/)).toHaveCount(0);await expect(page.getByText('Total GEX',{exact:true})).toHaveCount(0);
 await expect(page.getByText(/GEX by Strike/)).toHaveCount(0);
 // Independently successful levels remain available with their own source identity.
 await expect(page.getByText('Gamma Balance',{exact:true})).toBeVisible();await expect(page.getByRole('note',{name:'Levels source'})).toContainText('IWM · 2026-10-27');
 await page.screenshot({path:info.outputPath('profiles-failed-refetch.png'),fullPage:true});
 failed=false;await page.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(page.getByText(/Source: cloud_sql/)).toBeVisible();expect(requests).toBe(3);
});
test('Profiles empty chain plus unavailable levels does not invent zero exposure or a flip',async({page},info)=>{
 await setup(page);
 await page.route('**/api/options/IWM/2026-10-27',r=>r.fulfill({json:{...distinct.chain_response,options:[],metadata:{...distinct.chain_response.metadata,row_count:0}}}));
 await page.route('**/api/options/IWM/*/levels*',r=>r.fulfill({status:404,json:{detail:'SYNTHETIC no levels'}}));
 await page.getByRole('button',{name:'Profiles',exact:true}).click();
 await expect(page.getByText('No options data returned for IWM on 2026-10-27')).toBeVisible();
 await expect(page.getByText('Total GEX',{exact:true})).toHaveCount(0);
 await expect(page.getByRole('alert')).toContainText('Gamma levels unavailable');
 const prices=page.getByLabel('Backend gamma prices');await expect(prices.locator('.metric-value')).toHaveText(['--','--']);
 await page.screenshot({path:info.outputPath('profiles-empty-unavailable.png'),fullPage:true});
});
test('Profiles failed analytics cannot display cached or placeholder zero totals',async({page},info)=>{
 await setup(page);
 await page.route('**/api/options/greeks',r=>r.fulfill({status:503,json:{detail:'SYNTHETIC analytics refused'}}));
 await page.getByRole('button',{name:'Profiles',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Chain analytics unavailable');
 await expect(page.getByText('Total GEX',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Gamma Balance',{exact:true})).toBeVisible();
 await page.screenshot({path:info.outputPath('profiles-analytics-unavailable.png'),fullPage:true});
});


test('Gamma Map empty producer levels never borrow another response flip or balance',async({page},info)=>{
 await setup(page,{...distinct,levels:base.missing_gamma_levels});
 await expect(page.locator('.hs-legend .chip.flip .val')).toHaveText('—');
 await expect(page.locator('.hs-legend .chip.balance .val')).toHaveText('—');
 await expect(page.locator('.hs-nodes .node.flip')).toHaveCount(0);
 await expect(page.locator('.hs-grid-card .flip-row')).toHaveCount(0);
 // Keep the genuinely populated grid overlay, not empty-level placeholder totals/taxonomy.
 await expect(page.locator('.hs-legend .chip.hedge')).toHaveCount(0);
 expect(await page.locator('.hs-grid-card .hs-cell').count()).toBeGreaterThan(0);
 await page.screenshot({path:info.outputPath('gamma-empty-levels-no-borrow.png'),fullPage:true});
});
for(const [clock,label] of [
 ['2026-10-26T19:55:00Z','2026-10-26 15:55 ET'],
 ['2026-10-26','2026-10-26 (time unavailable)'],
 ['', 'time unavailable'],
] as const){
 test(`Gamma Map qualifies independent grid batch clock ${clock||'missing'}`,async({page},info)=>{
  await setup(page,{...distinct,grid:{...distinct.grid,date:'2026-10-26',snapshot_ts:clock}});
  await expect(page.locator('.hs-pill.realtime')).toContainText(`Batch snapshot ${label}`);
  await expect(page.getByText(/Levels: IWM/)).toContainText('2026-10-27');
  await page.screenshot({path:info.outputPath(`grid-clock-${clock ? clock.length : 'missing'}.png`),fullPage:true});
 });
}
