import { test, expect } from '@playwright/test';

for (const variant of ['promo', 'neon', 'retro']) test(`${variant} notes load a local Chinese handwriting font without changing titles or metrics`, async ({ page }) => {
  await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant } }));
  await page.goto('/');
  const note = page.locator('.card-remark').first();
  await expect(note).toBeVisible();
  await expect(note).toHaveCSS('font-size', '15px');
  await expect(note).toHaveCSS('font-family', '"Guangao Note", KaiTi, STKaiti, cursive');
  expect(await page.evaluate(async () => {
    const loaded = await document.fonts.load('12px "Guangao Note"', 'CPU 有多忙，一眼就知道');
    return loaded.length === 1 && loaded[0].status === 'loaded';
  })).toBe(true);
  expect(await page.locator('.card-title h3').first().evaluate(el => getComputedStyle(el).fontFamily)).not.toContain('Guangao Note');
  expect(await page.locator('.resource-mega-number').first().evaluate(el => getComputedStyle(el).fontFamily)).not.toContain('Guangao Note');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(note).toHaveCSS('font-size', '15px');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
