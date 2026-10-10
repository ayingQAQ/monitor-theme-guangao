import { test, expect } from '@playwright/test';
import { demoNodes } from '../dev/fixtures';
test.use({ reducedMotion: 'reduce' });

for (const variant of ['promo', 'neon', 'retro']) {
  for (const width of [1440, 390]) {
    test(`${variant} themed calculator at ${width}px computes and closes without shifting the page`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant } }));
      await page.routeWebSocket('**/api/ws*', () => {});
      await page.route('**/api/nodes', route => route.fulfill({ json: { nodes: demoNodes.map(node => node.id === 5 ? { ...node, expires_at: '2026-10-08' } : node) } }));
      await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ json: { rate: 7.8, date: '2026-10-09' } }));
      await page.goto('/');
      await expect(page.getByText('实时营业中', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('article')).toHaveCount(demoNodes.length);
      await page.evaluate(() => document.fonts.ready);
      const trigger = page.getByRole('button', { name: '剩余价值计算器', exact: true });
      const original = await page.locator('.overview-panel').boundingBox();
      await trigger.click();
      const dialog = page.getByRole('dialog', { name: '剩余价值计算器' });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel('续费金额', { exact: true }).fill('200');
      await dialog.getByLabel('周期天数', { exact: true }).fill('365');
      await dialog.getByLabel('交易日期', { exact: true }).fill('2026-01-01');
      await dialog.getByLabel('到期时间', { exact: true }).fill('2026-06-30');
      await expect(dialog.locator('output')).toContainText('¥98.63');
      await dialog.getByLabel('周期天数', { exact: true }).fill('0');
      await expect(dialog.locator('output')).toContainText('—');
      await dialog.getByRole('combobox', { name: '选择节点' }).click();
      await page.getByRole('option', { name: '法兰克福 · 欧洲站', exact: true }).click();
      await dialog.getByLabel('交易日期', { exact: true }).fill('2026-10-10');
      await expect(dialog.locator('output')).toContainText('¥0.00');
      const box = await dialog.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      expect(await page.locator('.overview-panel').boundingBox()).toEqual(original);
    });
  }
}

test('foreign node changes preserve manual rates, premium and local exports work, reset clears the form', async ({ page }) => {
  await page.routeWebSocket('**/api/ws*', () => {});
  await page.route('https://api.frankfurter.dev/**', route => route.fulfill({ json: { rate: 7.8, date: '2026-10-09' } }));
  await page.goto('/');
  await expect(page.getByRole('article')).toHaveCount(demoNodes.length);
  await page.getByRole('button', { name: '剩余价值计算器', exact: true }).click();
  const dialog = page.getByRole('dialog');
  for (const name of ['洛杉矶 · 西海岸', '新加坡 · 狮城加速']) {
    await dialog.getByRole('combobox', { name: '选择节点' }).click();
    await page.getByRole('option', { name, exact: true }).click();
    if (name.startsWith('洛杉矶')) {
      await expect(dialog.getByLabel('外币汇率', { exact: true })).toHaveValue('7.8');
      await dialog.getByLabel('外币汇率', { exact: true }).fill('7');
    }
  }
  await expect(dialog.getByLabel('外币汇率', { exact: true })).toHaveValue('7');
  await dialog.getByLabel('续费金额', { exact: true }).fill('100');
  await dialog.getByLabel('周期天数', { exact: true }).fill('30');
  await dialog.getByLabel('交易日期', { exact: true }).fill('2026-10-10');
  await dialog.getByLabel('到期时间', { exact: true }).fill('2026-10-25');
  await dialog.getByLabel('售价', { exact: true }).fill('400');
  await expect(dialog.locator('output')).toContainText('¥350.00');
  await expect(dialog.locator('.calc-premium')).toContainText('溢价 ¥50.00');
  await dialog.locator('summary').click();
  await dialog.getByLabel('产品名称', { exact: true }).fill('测试|产品');
  await dialog.getByRole('button', { name: '复制 Markdown' }).click();
  await expect(dialog.getByLabel('Markdown 结果')).toContainText('测试\\|产品');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: '下载图片' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('vps-remaining-value.png');
  expect(await download.failure()).toBeNull();
  await dialog.getByRole('button', { name: '重置表单' }).click();
  await expect(dialog.getByLabel('续费金额', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('产品名称', { exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('Markdown 结果')).toHaveCount(0);
});

test('unavailable reference rates allow manual calculation without sending form data', async ({ page }) => {
  const requested: string[] = [];
  await page.route('https://api.frankfurter.dev/**', route => { requested.push(route.request().url()); return route.abort(); });
  await page.goto('/');
  expect(requested).toEqual([]);
  await page.getByRole('button', { name: '剩余价值计算器', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('combobox', { name: '货币', exact: true }).click();
  await page.getByRole('option', { name: 'CAD', exact: true }).click();
  await expect(dialog.locator('.calc-rate-note')).toContainText('请手动填写');
  await dialog.getByLabel('外币汇率', { exact: true }).fill('5');
  await dialog.getByLabel('续费金额', { exact: true }).fill('0');
  await dialog.getByLabel('交易日期', { exact: true }).fill('2026-10-10');
  await dialog.getByLabel('到期时间', { exact: true }).fill('2027-10-10');
  await dialog.getByLabel('售价', { exact: true }).fill('20');
  await expect(dialog.locator('output')).toContainText('¥0.00');
  await expect(dialog.locator('.calc-premium')).toContainText('不计算溢价率');
  expect(requested).toEqual(['https://api.frankfurter.dev/v2/rate/cad/cny']);
});
