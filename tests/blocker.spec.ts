import { test, expect } from "@playwright/test";

// Cosmetic selectors are applied as a user stylesheet, including after navigation.
// The ad-main prefix appears in 280blocker; the broader selectors model custom
// rules used by cosmetic-filtering browsers/extensions, not their whole engines.
const cosmeticRules = `[class^="ad-main"], [class^="ad-"], [class*=" node-ad"],
  .node-ad, .node-ad-border-animate, .hero-ad, .detail-ad,
  [id^="ad-"], [id^="ads-"], [class$="-ad"] { display: none !important; }`;

for (const variant of ["promo", "neon", "retro"]) {
  test(`cosmetic filters preserve ${variant} monitor pages and controls`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((rules) => {
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = rules;
        document.head.appendChild(style);
      });
    }, cosmeticRules);
    await page.route("**/api/themes/monitor-theme-guangao/config", (route) =>
      route.fulfill({ json: { variant, show_float: true } }));
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(6);
    for (const card of await page.getByRole("article").all()) {
      await expect(card).toBeVisible();
      expect(await card.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(250);
    }
    await expect(page.getByRole("article").first().getByText("12.8%", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "外观设置", exact: true }).click();
  await page.getByRole("button", { name: "关闭边框灯" }).click();
    await expect(page.getByRole("button", { name: "开启边框灯" })).toBeVisible();
    await page.getByRole("button", { name: "停止动效" }).click();
    await expect(page.getByRole("button", { name: "恢复动效" })).toBeVisible();
    await page.getByRole("article").first().getByRole("link", { name: "立即查看" }).click();
    await expect(page.getByRole("heading", { name: "香港 · 直连专线" })).toBeVisible();
    await expect(page.getByRole("region", { name: "网络速率历史图" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "香港 · 直连专线" })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator(".detail-strip").getByRole("button", { name: "返回广告墙" }).click();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "节点汇总" })).toBeVisible();
  });
}
