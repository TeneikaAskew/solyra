/** Owner-run only, after backend/frontend deployment and during a regular
 * session after the opening window completes. Uses the cloud project's
 * existing saved Firebase session; no mocks, auth setup or deployment here.
 * Local chromium runs skip before navigation. Do not treat absence of a live
 * qualified response as successful API/UI parity. Independent source observation remains owner work.
 */
import { test, expect } from '@playwright/test';
import { qualifiedOpening } from '../../src/lib/playbookEvaluator';
import type { LiveHistory } from '../../src/hooks/useLiveHistory';

test('deployed Playbook carries the qualified same-session ORB projection unchanged', async ({page}, info) => {
 test.skip(info.project.name !== 'cloud', 'Owner-run cloud project only; no local deployment acceptance.');
 const historyResponse=page.waitForResponse(response=>{
  const url=new URL(response.url());
  return /^\/api\/live\/history\/[^/]+$/.test(url.pathname) && url.searchParams.get('include_opening')==='true';
 });
 const evaluation=page.waitForRequest(request=>new URL(request.url()).pathname==='/api/playbook/evaluate' && request.method()==='POST' && request.postDataJSON()?.snapshot?.orbOpening?.status==='available');
 await page.goto('/playbook');
 await expect(page.getByTestId('nav-menu-support')).toBeVisible();
 const response=await historyResponse;expect(response.ok()).toBe(true);
 const history=await response.json() as LiveHistory;
 const projection=qualifiedOpening(history.opening,history.ticker);
 expect(projection,'Run after the current opening window with qualified source data; unavailable is not parity proof.').not.toBeNull();
 expect(projection!.body_sha256).toMatch(/^[0-9a-f]{64}$/);
 expect(projection!.calendar_version).toEqual(expect.any(String));
 expect(projection!.source_last_refreshed).toEqual(expect.any(String));
 const posted=(await evaluation).postDataJSON().snapshot;
 expect(posted.ticker).toBe(history.ticker);
 expect(posted.orbOpening).toEqual(projection);
 expect(posted.orbHigh).toBe(projection!.high);expect(posted.orbLow).toBe(projection!.low);
 await expect(page.getByTestId('orb-status')).toContainText(`comparison as of ${projection!.comparison_as_of}`);
 await info.attach('orb-live-receipt',{body:JSON.stringify({ticker:history.ticker,projection,received_at:new Date().toISOString()}),contentType:'application/json'});
 await page.screenshot({path:info.outputPath('orb-live-qualified.png'),fullPage:true});
});
