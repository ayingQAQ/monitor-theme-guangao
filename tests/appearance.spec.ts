import { test, expect } from "@playwright/test";
import { demoNodes } from "../dev/fixtures";
test("header settings open by keyboard and retain all preferences", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "外观设置", exact: true });
  await expect(trigger).toBeVisible();
  await expect(page.locator("footer .visitor-controls")).toHaveCount(0);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "外观设置" })).toBeVisible();
  await page.getByRole("combobox", { name: "广告墙风格" }).click();
  await page.getByRole("option", { name: "紫绿广告墙" }).click();
  await expect(page.locator(".monitor-app")).toHaveAttribute(
    "data-variant",
    "neon",
  );
  await page.getByRole("button", { name: "停止动效" }).click();
  await page.getByRole("button", { name: "关闭边框灯" }).click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.reload();
  await trigger.click();
  await expect(page.getByRole("button", { name: "恢复动效" })).toBeVisible();
  await expect(page.getByRole("button", { name: "开启边框灯" })).toBeVisible();
});
test("free offers show their own price and honest expiry labels on desktop and mobile", async ({
  page,
}) => {
  await page.routeWebSocket("**/api/ws*", () => {});
  await page.route("**/api/nodes", (r) =>
    r.fulfill({
      json: {
        nodes: [
          { ...demoNodes[0], price: 0, expires_in: null },
          { ...demoNodes[1], price: 0, expires_in: 12 },
          { ...demoNodes[2], price: 0, expires_in: -2 },
          { ...demoNodes[3] },
        ],
      },
    }),
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const cards = page.getByRole("article");
    await expect(cards.nth(0).locator(".offer-price > strong")).toHaveText(
      "FREE",
    );
    await expect(cards.nth(0).locator(".expiry-ticket")).toContainText(
      "未设到期",
    );
    await expect(cards.nth(1).locator(".expiry-ticket")).toContainText(
      "免费有效期",
    );
    await expect(cards.nth(1).locator(".expiry-ticket")).toContainText("12 天");
    await expect(cards.nth(2).locator(".expiry-ticket")).toContainText(
      "已过期 2 天",
    );
    await expect(cards.nth(3).locator(".offer-price > strong")).not.toHaveText(
      "FREE",
    );
    await page.getByRole("button", { name: "外观设置", exact: true }).click();
    expect(
      await page.getByRole("dialog", { name: "外观设置" }).evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth;
      }),
    ).toBe(true);
  }
});
