import{test,expect}from'@playwright/test';
// Model classic desktop scrollbar geometry: headless Chromium reports the
// reserved gutter in clientWidth unlike a classic Windows scrollbar.
for(const width of [1440,1535,390])test(`skin menu preserves page geometry at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>Object.defineProperty(document.documentElement,'clientWidth',{configurable:true,get(){return Math.round(document.documentElement.getBoundingClientRect().width);}})));
 await page.route('**/api/themes/monitor-theme-guangao/config',r=>r.fulfill({json:{headline:'好节点，不用找！鸡鸡好！'}}));
 await page.goto('/');await expect(page.getByRole('article')).toHaveCount(6);
 const geometry=()=>page.evaluate(()=>['.monitor-app','.overview-panel','.hero-copy h1','.ticker','.node-grid'].map(selector=>{const {x,y,width,height}=document.querySelector(selector)!.getBoundingClientRect();return{x,y,width,height};}));
 await page.getByRole('button',{name:'外观设置',exact:true}).click();
 const baseline=await geometry();
 for(let iteration=0;iteration<2;iteration++){
 await page.getByRole('combobox',{name:'广告墙风格'}).click();
 await expect(page.locator('body')).toHaveAttribute('data-scroll-locked',/\d+/);
 expect(await geometry()).toEqual(baseline);
 await page.keyboard.press('Escape');
 await expect(page.getByRole('option',{name:'跟随站点'})).toHaveCount(0);
 expect(await geometry()).toEqual(baseline);
 }
 await page.keyboard.press('Escape');expect(await geometry()).toEqual(baseline);
});
