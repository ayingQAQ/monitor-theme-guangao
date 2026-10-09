import{test,expect}from'@playwright/test';
import{demoHistory}from'../dev/fixtures';
for(const variant of ['promo','neon','retro'])test(`${variant} history loading is readable and replaced by actual charts`,async({page})=>{
 let release!:()=>void;
 const held=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/themes/monitor-theme-guangao/config',route=>route.fulfill({json:{variant}}));
 await page.route('**/api/nodes/1/metrics?*',async route=>{await held;await route.fulfill({json:demoHistory()});});
 await page.goto('/node/1');
 try{
 const loading=page.getByRole('status').filter({hasText:'正在加载历史数据'});
 await expect(loading).toBeVisible();
 await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0);
 expect(await loading.evaluate(el=>getComputedStyle(el).backgroundColor===getComputedStyle(document.querySelector('.node-detail')!).backgroundColor)).toBe(true);
 }finally{release();}
 await expect(page.getByRole('region',{name:'网络速率历史图'})).toBeVisible();
 await expect(page.locator('.history-loading')).toHaveCount(0);
});
test('history failures show a retry and successful retries remove the error',async({page})=>{
 let shouldFail=true;
 await page.route('**/api/nodes/1/metrics?*',route=>{
 return shouldFail?route.fulfill({status:503,json:{error:'busy'}}):route.fulfill({json:demoHistory()});
 });
 await page.goto('/node/1');
 await expect(page.getByRole('alert')).toContainText('读取历史数据失败');
 await expect(page.locator('.history-loading')).toHaveCount(0);
 shouldFail=false;
 await page.getByRole('button',{name:'重试',exact:true}).click();
 await expect(page.getByRole('region',{name:'网络速率历史图'})).toBeVisible();
 await expect(page.getByRole('alert')).toHaveCount(0);
});
