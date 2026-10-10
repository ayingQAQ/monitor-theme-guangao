import { test, expect } from '@playwright/test';
import { demoHistory } from '../dev/fixtures';

for (const variant of ['promo', 'neon', 'retro']) {
  test(`${variant} resource curves contrast with the detail background`, async ({ page }) => {
    await page.route('**/api/themes/monitor-theme-guangao/config', route => route.fulfill({ json: { variant } }));
    await page.route('**/api/nodes/1/metrics?*', route => route.fulfill({ json: demoHistory() }));
    await page.goto('/node/1');
    const curves = page.locator('.recharts-area-curve');
    await expect(curves).toHaveCount(3);
    const contrasts = await curves.evaluateAll(elements => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d')!;
      const luminance = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const channels = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(channel => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const background = luminance(getComputedStyle(document.querySelector('.node-detail')!).backgroundColor);
      return elements.map(element => {
        const stroke = luminance(getComputedStyle(element).stroke);
        return (Math.max(stroke, background) + 0.05) / (Math.min(stroke, background) + 0.05);
      });
    });
    for (const contrast of contrasts) expect(contrast).toBeGreaterThanOrEqual(3);
  });
}
