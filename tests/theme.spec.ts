import { test, expect } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { demoNodes } from "../dev/fixtures";

test("advertisement cards show real values and distinguish offline and pending metrics", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("演示数据 · 非真实节点")).toBeVisible();
  const hk = page.getByRole("article", { name: "香港 · 直连专线" });
  await expect(hk.getByText("12.8%", { exact: true })).toBeVisible();
  await expect(hk.getByText("59 天", { exact: true })).toBeVisible();
  const offline = page.getByRole("article", { name: "法兰克福 · 欧洲站" });
  await expect(offline.getByText("暂时离线", { exact: true })).toBeVisible();
  await expect(offline.getByText("已过期 2 天")).toBeVisible();
  await expect(offline.getByText("CPU 不可用")).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "首尔 · 新店开张" })
      .getByText("等待首次上报"),
  ).toBeVisible();
});

test("group filtering updates both cards and summary", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "美洲线路" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(page.getByTestId("online-count")).toHaveText("1");
  await expect(page.getByTestId("node-count")).toHaveText("1");
});

test("groups with no live reports do not invent zero throughput", async ({
  page,
}) => {
  await page.route("**/api/themes/guangao-theme/config", (route) =>
    route.fulfill({ json: { show_float: true } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "欧洲线路" }).click();
  await expect(page.locator(".ticker-track b").first()).toHaveText("—");
  await expect(page.locator(".speed-float > strong")).toHaveText("↓ —");
  await expect(page.locator(".speed-float small")).toContainText(
    "没有实时指标",
  );
  await page.getByRole("button", { name: "未分组" }).click();
  await expect(page.locator(".ticker-track b").first()).toHaveText("—");
  await expect(page.locator(".speed-float > strong")).toHaveText("↓ —");
});

test("a reported zero speed stays zero and a recent disconnection is not never reported", async ({
  page,
}) => {
  await page.routeWebSocket("**/api/ws*", () => {});
  await page.route("**/api/nodes", (route) =>
    route.fulfill({
      json: {
        admin: false,
        nodes: [
          {
            ...demoNodes[0],
            metrics: { ...demoNodes[0].metrics, net_rx: 0, net_tx: 0 },
          },
          { ...demoNodes[4], last_seen_ago: 0 },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(page.locator(".ticker-track b").first()).toHaveText("0 B/s");
  await expect(
    page
      .getByRole("article", { name: "法兰克福 · 欧洲站" })
      .getByText("刚刚离线", { exact: true }),
  ).toBeVisible();
});

test("visitor variant preference survives reload and invalid saved values fall back", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("广告墙风格").selectOption("neon");
  await expect(page.locator(".ad-app")).toHaveAttribute("data-variant", "neon");
  await page.reload();
  await expect(page.locator(".ad-app")).toHaveAttribute("data-variant", "neon");
  await page.evaluate(() => localStorage.setItem("guangao.variant", "invalid"));
  await page.reload();
  await expect(page.locator(".ad-app")).toHaveAttribute(
    "data-variant",
    "promo",
  );
});

test("detail links support reload, browser back and retained history range", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("article", { name: "香港 · 直连专线" })
    .getByRole("link", { name: "立即查看" })
    .click();
  await expect(page).toHaveURL(/\/node\/1$/);
  await expect(
    page.getByRole("heading", { name: "香港 · 直连专线" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "7 天", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "香港 · 直连专线" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("article")).toHaveCount(6);
  await page.goForward();
  await expect(
    page.getByRole("heading", { name: "香港 · 直连专线" }),
  ).toBeVisible();
  await page
    .locator(".detail-strip")
    .getByRole("button", { name: "返回广告墙" })
    .click();
  await expect(page.getByRole("article")).toHaveCount(6);
});

test("compressed and text WebSocket snapshots drive actual card updates", async ({
  page,
}) => {
  await page.route("**/api/nodes", (route) =>
    route.fulfill({ json: { admin: false, nodes: [] } }),
  );
  let socket:
    Parameters<Parameters<typeof page.routeWebSocket>[1]>[0] | undefined;
  await page.routeWebSocket("**/api/ws*", (stream) => {
    socket = stream;
    stream.send(
      gzipSync(JSON.stringify({ admin: false, nodes: [demoNodes[0]] })),
    );
  });
  await page.goto("/");
  const card = page.getByRole("article", { name: "香港 · 直连专线" });
  await expect(card.getByText("12.8%", { exact: true })).toBeVisible();
  socket!.send(
    JSON.stringify({
      admin: false,
      nodes: [
        { ...demoNodes[0], metrics: { ...demoNodes[0].metrics, cpu: 72.5 } },
      ],
    }),
  );
  await expect(card.getByText("72.5%", { exact: true })).toBeVisible();
});

test("malformed reports are isolated and arbitrary group names do not collide", async ({
  page,
}) => {
  await page.routeWebSocket("**/api/ws*", () => {});
  await page.route("**/api/nodes", (route) =>
    route.fulfill({
      json: {
        admin: false,
        nodes: [
          {
            ...demoNodes[0],
            group: "全部",
            metrics: { ...demoNodes[0].metrics, cpu: "bad" },
          },
          { ...demoNodes[1], group: "未分组" },
          { ...demoNodes[2], group: "" },
        ],
      },
    }),
  );
  await page.goto("/");
  await expect(
    page
      .getByRole("article", { name: "香港 · 直连专线" })
      .getByText("CPU 不可用"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "全部", exact: false })
    .filter({ hasText: /^全部1$/ })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("article", { name: "香港 · 直连专线" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "全部线路" }).click();
  await expect(page.getByRole("article")).toHaveCount(3);
});

test("empty installations show no fabricated nodes and proxy HTML stays out of the page", async ({
  page,
}) => {
  await page.routeWebSocket("**/api/ws*", () => {});
  await page.route("**/api/nodes", (route) =>
    route.fulfill({ json: { admin: false, nodes: [] } }),
  );
  await page.goto("/");
  await expect(page.getByText("广告位招租，节点待接入。")).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.route("**/api/nodes", (route) =>
    route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<h1>PRIVATE PROXY DEBUG PAGE</h1>",
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("HTTP 502");
  await expect(page.getByText("PRIVATE PROXY DEBUG PAGE")).toHaveCount(0);
});

test("mobile stays within viewport and reduced motion disables animated decorations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".ticker-track")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("station text is escaped and a config failure uses manifest defaults", async ({
  page,
}) => {
  await page.route("**/api/themes/guangao-theme/config", (route) =>
    route.fulfill({
      json: {
        notice: "<img src=x onerror=alert(1)>",
        headline: "真实文本",
        variant: "invalid",
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("<img src=x onerror=alert(1)>", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".notice img")).toHaveCount(0);
  await expect(page.locator(".ad-app")).toHaveAttribute(
    "data-variant",
    "promo",
  );
  await page.unrouteAll();
  await page.route("**/api/themes/guangao-theme/config", (route) =>
    route.fulfill({ status: 404, body: "missing" }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "好节点，不用找！" }),
  ).toBeVisible();
});
