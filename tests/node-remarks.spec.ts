import { test, expect } from '@playwright/test';
import { demoNodes } from '../dev/fixtures';
import { nodeRemark } from '../src/lib/node-remarks';

test('server remarks remain fixed across reloads and independent browsers, with public remarks taking priority', async ({ page, browser }) => {
  const nodes = demoNodes.map((node, index) => ({ ...node, public_remark: index === 0 ? '管理员自定义公开备注' : '' }));
  async function check(target: typeof page) {
    await target.route('**/api/nodes', route => route.fulfill({ json: { nodes } }));
    await target.routeWebSocket('**/api/ws*', () => {});
    await target.goto('/');
    for (const [index, node] of nodes.entries()) {
      const expected = index === 0 ? '管理员自定义公开备注' : nodeRemark(node.id, !node.online ? 'offline' : node.metrics ? 'live' : 'pending');
      await expect(target.getByRole('article', { name: node.name }).locator('.card-remark')).toHaveText(expected);
    }
    return target.locator('.card-remark').allTextContents();
  }
  const original = await check(page);
  await page.reload();
  await expect(page.locator('.card-remark')).toHaveCount(nodes.length);
  expect(await page.locator('.card-remark').allTextContents()).toEqual(original);
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174' });
  try {
    expect(await check(await context.newPage())).toEqual(original);
  } finally { await context.close(); }
});
