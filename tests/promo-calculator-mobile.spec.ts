import { test, expect } from '@playwright/test';

for (const width of [320, 360, 390, 430]) {
  test(`promo calculator at ${width}px contains long selected node names`, async ({ page }) => {
    const names = ['香港 · 演示测试节点 · 三网优化线路 · 长名称显示检查', 'A'.repeat(64)];
    await page.setViewportSize({ width, height: 844 });
    await page.routeWebSocket('**/api/ws*', () => {});
    await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant: 'promo' } }));
    await page.route('**/api/nodes', async route => {
      const data = await (await route.fetch()).json();
      names.forEach((name, index) => { data.nodes[index].name = name; });
      await route.fulfill({ json: data });
    });
    await page.goto('/');
    await page.getByRole('button', { name: '剩余价值计算器', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    const dialog = page.getByRole('dialog');
    const node = dialog.getByRole('combobox', { name: '选择节点', exact: true });
    for (const name of names) {
      await node.click();
      await page.getByRole('option', { name, exact: true }).click();
      await expect(node).toContainText(name);
      expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await node.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const text = element.querySelector('span')!.getBoundingClientRect();
        const icon = element.querySelector('svg')!.getBoundingClientRect();
        return text.left >= bounds.left && text.right <= icon.left && icon.right <= bounds.right;
      })).toBe(true);
      await node.click();
      await expect(page.getByRole('option', { name, exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test(`promo calculator at ${width}px keeps the title and billing options readable`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant: 'promo' } }));
    await page.goto('/');
    await page.getByRole('button', { name: '剩余价值计算器', exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    const dialog = page.getByRole('dialog');
    const headline = dialog.locator('.calc-headline');
    expect(await headline.evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    })).toBe(1);
    const cycle = dialog.getByRole('combobox', { name: '付款周期', exact: true });
    for (const name of ['年付 · 365 天', '三年付 · 1095 天', '自定义周期']) {
      await cycle.click();
      await page.getByRole('option', { name, exact: true }).click();
      expect(await cycle.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(element.querySelector('span')!);
        const rects = [...range.getClientRects()];
        const icon = element.querySelector('svg')!.getBoundingClientRect();
        return rects.length === 1 && rects.every(rect =>
          rect.left >= bounds.left && rect.right <= icon.left &&
          rect.top >= bounds.top && rect.bottom <= bounds.bottom);
      })).toBe(true);
    }
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
}
