import { test, expect } from '@playwright/test';

for (const variant of ['promo', 'neon', 'retro']) test(`${variant} card text stays upright before and after hover`, async ({ page }) => {
  await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant } }));
  await page.goto('/');
  const cards = page.locator('.node-card');
  await expect(cards).toHaveCount(6);
  for (const card of await cards.all()) await expect(card).toHaveCSS('transform', 'none');
  const card = cards.first();
  await card.hover();
  await expect(card).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -3)');
  await page.mouse.move(0, 0);
  await expect(card).toHaveCSS('transform', 'none');
  await expect(card.locator('.title-spark')).toBeVisible();
});
