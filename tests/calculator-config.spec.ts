import { test, expect } from '@playwright/test';
import { demoNodes } from '../dev/fixtures';

for (const variant of ['promo', 'neon', 'retro']) {
  test(`${variant} calculator follows saved site settings after reload`, async ({ page }) => {
    let enabled = false;
    await page.routeWebSocket('**/api/ws*', () => {});
    await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant, show_value_calculator: enabled } }));
    await page.goto('/');
    await expect(page.getByRole('article')).toHaveCount(demoNodes.length);
    const trigger = page.getByRole('button', { name: '剩余价值计算器', exact: true });
    await expect(trigger).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('article')).toHaveCount(demoNodes.length);
    await expect(trigger).toHaveCount(0);
    enabled = true;
    await page.reload();
    await expect(trigger).toBeVisible();
    await trigger.click();
    await expect(page.getByRole('dialog', { name: '剩余价值计算器' })).toBeVisible();
    await expect(page.locator('.monitor-app')).toHaveAttribute('data-variant', variant);
  });
}

test('disabled calculator never flashes while site settings are loading', async ({ page }) => {
  let finish: (() => Promise<void>) | undefined;
  await page.route('**/api/themes/monitor-theme-guangao/config', route => { finish = () => route.fulfill({ json: { show_value_calculator: false } }); });
  await page.goto('/');
  await expect(page.getByRole('button', { name: '外观设置', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '剩余价值计算器', exact: true })).toHaveCount(0);
  await expect.poll(() => !!finish).toBe(true);
  await finish!();
  await expect(page.getByRole('article')).toHaveCount(demoNodes.length);
  await expect(page.getByRole('button', { name: '剩余价值计算器', exact: true })).toHaveCount(0);
});

for (const failure of ['invalid', 'unavailable']) {
  test(`${failure} settings retain the default enabled calculator`, async ({ page }) => {
    await page.route('**/api/themes/monitor-theme-guangao/config', route => failure === 'invalid'
      ? route.fulfill({ json: { show_value_calculator: 'false' } })
      : route.fulfill({ status: 503, json: { error: 'unavailable' } }));
    await page.goto('/');
    await expect(page.getByRole('button', { name: '剩余价值计算器', exact: true })).toBeVisible();
  });
}
