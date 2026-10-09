import { test, expect } from '@playwright/test';
import { demoNodes } from '../dev/fixtures';

test('offscreen decorations pause and resume without changing card layout', async ({page}) => {
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const card=page.getByRole('article').last();
 await expect(card).toHaveCount(1);
 const size=await card.boundingBox();
 await expect(card.locator('.node-border-light')).toHaveCSS('animation-play-state','paused');
 await card.scrollIntoViewIfNeeded();
 await expect(card.locator('.node-border-light')).toHaveCSS('animation-play-state','running');
 expect((await card.boundingBox())!.height).toBeCloseTo(size!.height,0);
 await page.getByRole('button',{name:'关闭边框灯'}).click();
 await expect(card.locator('.node-border-light')).toHaveCSS('animation-name','none');
});

test('live reports update detail facts without rebuilding historical charts', async ({page}) => {
 let socket: Parameters<Parameters<typeof page.routeWebSocket>[1]>[0];
 await page.routeWebSocket('**/api/ws*',stream=>{socket=stream;});
 await page.goto('/node/1');
 await expect(page.locator('.recharts-line')).toHaveCount(2);
 await page.locator('.recharts-wrapper').first().evaluate(()=>{
  const state=window as unknown as {chartMutations:number};state.chartMutations=0;
  for(const chart of document.querySelectorAll('.recharts-wrapper')) new MutationObserver(records=>{state.chartMutations+=records.length;}).observe(chart,{attributes:true,childList:true,subtree:true});
 });
 socket!.send(JSON.stringify({nodes:[{...demoNodes[0],day_rx:123456789,metrics:{...demoNodes[0].metrics,procs:432}}]}));
 await expect(page.getByText(/432 进程/)).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {chartMutations:number}).chartMutations)).toBe(0);
});
