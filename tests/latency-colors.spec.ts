import { test, expect } from '@playwright/test';
import { demoHistory } from '../dev/fixtures';

for (const variant of ['promo', 'neon', 'retro']) test(`${variant} latency colors match legends and survive probe toggling`, async ({ page }) => {
  await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant } }));
  await page.route('**/api/nodes/1/metrics?*', route => route.fulfill({ json: demoHistory() }));
  await page.goto('/node/1');
  await page.getByRole('button', { name: '网络延迟', exact: true }).click();
  const lines = page.locator('.recharts-line-curve');
  await expect(lines).toHaveCount(2);
  const colors = await lines.evaluateAll(els => els.map(el => getComputedStyle(el).stroke));
  expect(new Set(colors).size).toBe(2);
  for (const color of colors) {
    const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    expect(Math.max(...channels) - Math.min(...channels)).toBeGreaterThan(30);
  }
  const legends = page.getByRole('button').filter({ hasText: /香港线路|东京线路/ });
  await expect(legends).toHaveCount(2);
  expect(await legends.locator('line').evaluateAll(els => els.map(el => getComputedStyle(el).stroke))).toEqual(colors);
  await legends.first().click();
  await expect(lines).toHaveCount(1);
  expect(await lines.first().evaluate(el => getComputedStyle(el).stroke)).toBe(colors[1]);
  await legends.first().click();
  await expect(lines).toHaveCount(2);
  expect((await lines.evaluateAll(els => els.map(el => getComputedStyle(el).stroke))).sort()).toEqual([...colors].sort());
});
