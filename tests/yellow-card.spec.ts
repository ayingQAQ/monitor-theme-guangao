import { test, expect } from '@playwright/test';

test('yellow promo card metrics have readable ink while yellow decorations remain', async ({ page }) => {
  await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant: 'promo' } }));
  await page.goto('/');
  const card = page.locator('.node-card.tone-3');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const text = card.locator('.resource-tile:not(.is-high):not(.is-critical) strong, .resource-tile:not(.is-high):not(.is-critical) .resource-mega-number, .traffic-copy > strong, .speed-row strong');
    await expect(text.first()).toBeVisible();
    const colors = await text.evaluateAll(els => els.map(el => getComputedStyle(el).color));
    expect(colors.length).toBeGreaterThanOrEqual(5);
    for (const color of colors) expect(color).toBe('rgb(146, 80, 10)');
    await expect(card.locator('.card-topline')).toHaveCSS('background-color', 'rgb(252, 218, 51)');
    await expect(card).toHaveCSS('background-color', 'rgb(255, 241, 176)');
  }
});
