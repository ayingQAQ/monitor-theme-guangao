import{test,expect}from'@playwright/test';
test('uptime tickets distinguish live, offline and pending nodes without animation',async({page})=>{
 await page.goto('/');
 const live=page.getByRole('article',{name:'香港 · 直连专线'}).locator('.uptime-stamp');
 await expect(live).toHaveClass(/is-online/);await expect(live).toHaveText('持续在线 42 天 0 小时');
 await expect(live.locator('svg')).toBeVisible();await expect(live).toHaveCSS('animation-name','none');
 await expect(page.getByRole('article',{name:'法兰克福 · 欧洲站'}).locator('.uptime-stamp')).toHaveClass(/is-offline/);
 const pending=page.getByRole('article',{name:'首尔 · 新店开张'}).locator('.uptime-stamp');
 await expect(pending).toHaveClass(/is-pending/);await expect(pending).toHaveText('连接已建立');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
