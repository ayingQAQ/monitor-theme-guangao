import { test, expect } from '@playwright/test';
import { demoNodes } from '../dev/fixtures';

for (const variant of ['promo', 'neon', 'retro']) {
  for (const width of [1440, 390]) {
    test(`${variant} offline notice at ${width}px keeps data and archive access`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.routeWebSocket('**/api/ws*', () => {});
      await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant } }));
      await page.goto('/');
      const card = page.getByRole('article', { name: demoNodes[4].name });
      const notice = card.getByRole('group', { name: '离线告示' });
      await expect(notice.getByText('暂停营业', { exact: true })).toBeVisible();
      await expect(notice).toContainText('离线 1 小时 0 分');
      await expect(card.getByText('已过期 2 天')).toBeVisible();
      await expect(card.locator('.traffic-copy > strong')).toBeVisible();
      await expect(notice).toHaveCSS('animation-name', 'none');
      const bounds = await notice.boundingBox();
      const area = await card.locator('.card-resources').boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(area!.y);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(area!.y + area!.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole('article', { name: demoNodes[5].name }).locator('.offline-notice')).toHaveCount(0);
      await expect(page.getByRole('article', { name: demoNodes[0].name }).locator('.offline-notice')).toHaveCount(0);
      await card.getByRole('link', { name: '查看档案' }).click();
      await expect(page).toHaveURL('/node/5');
      await expect(page.getByRole('heading', { name: demoNodes[4].name })).toBeVisible();
    });
  }
}

test('offline signage is removed when the same node reconnects', async ({ page }) => {
  let stream: Parameters<Parameters<typeof page.routeWebSocket>[1]>[0];
  await page.routeWebSocket('**/api/ws*', socket => { stream = socket; });
  await page.goto('/');
  const card = page.getByRole('article', { name: demoNodes[4].name });
  await expect(card.locator('.offline-notice')).toBeVisible();
  await expect.poll(() => Boolean(stream!)).toBe(true);
  stream!.send(JSON.stringify({ nodes: [{ ...demoNodes[4], online: true, metrics: demoNodes[0].metrics }] }));
  await expect(card.locator('.offline-notice')).toHaveCount(0);
  await expect(card.getByText('12.8%', { exact: true })).toBeVisible();
  await expect(card.getByRole('link', { name: '立即查看' })).toBeVisible();
});
