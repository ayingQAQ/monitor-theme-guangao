import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce', viewport: { width: 1600, height: 900 } });

const skins = [
  ['红黄促销墙', 'promo'],
  ['澳门皇家赌场风', 'royal'],
  ['复古 GIF 广告墙', 'retro'],
];

test('default logo and tab icon follow each skin and survive reload', async ({ page }) => {
  await page.goto('/');
  for (const [label, file] of skins) {
    await page.getByRole('button', { name: '外观设置', exact: true }).click();
    await page.getByRole('combobox', { name: '广告墙风格' }).click();
    await page.getByRole('option', { name: label, exact: true }).click();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(page.locator('.brand img')).toHaveAttribute('src', new RegExp(`brand-${file}\\.svg`));
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', new RegExp(`brand-${file}\\.svg`));
    await expect.poll(() => page.locator('.brand img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  await page.reload();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /brand-retro\.svg/);
});

test('uploaded site icon takes priority over all skin defaults', async ({ page }) => {
  await page.route('**/favicon.svg*', route => route.fulfill({
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="green"/></svg>',
  }));
  await page.goto('/');
  for (const [label] of skins) {
    await page.getByRole('button', { name: '外观设置', exact: true }).click();
    await page.getByRole('combobox', { name: '广告墙风格' }).click();
    await page.getByRole('option', { name: label, exact: true }).click();
    await page.getByRole('heading', { level: 1 }).click();
    await expect(page.locator('.brand img')).toHaveAttribute('src', '/favicon.svg');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  }
});

test('an unavailable icon check preserves the Hub icon', async ({ page }) => {
  await page.route('**/favicon.svg*', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant: 'neon' } }));
  await page.goto('/');
  await expect(page.locator('.monitor-app')).toHaveAttribute('data-variant', 'neon');
  await expect(page.locator('.brand img')).toHaveAttribute('src', '/favicon.svg');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
});
