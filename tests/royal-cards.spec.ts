import { test, expect } from '@playwright/test';

test('royal playing cards are visible without covering live counts or actions on desktop and mobile', async ({ page }) => {
  await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant: 'neon' } }));
  await page.goto('/');
  for (const width of [1600, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('.royal-playing-card')).toHaveCount(3);
    await expect(page.locator('.royal-card-fan')).toBeVisible();
    const fan = await page.locator('.royal-card-fan').boundingBox();
    const count = await page.getByTestId('online-count').boundingBox();
    expect(fan!.x >= count!.x + count!.width || fan!.x + fan!.width <= count!.x ||
      fan!.y >= count!.y + count!.height || fan!.y + fan!.height <= count!.y).toBe(true);
    const heroButton = page.getByRole('link', { name: '马上围观' });
    await heroButton.click();
    await expect(page).toHaveURL(/#nodes$/);
    await expect(page.locator('.node-card .title-spark').first()).toHaveCSS('background-color', 'rgb(255, 245, 220)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
  }
});
