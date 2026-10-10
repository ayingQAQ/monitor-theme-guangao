import { test, expect } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { demoNodes } from "../dev/fixtures";

test("network history starts with two clear mean lines and optional peak bands", async ({ page }) => {
  await page.goto("/node/1");
  const chart = page.getByRole("region", { name: "网络速率历史图" });
  await expect(chart).toBeVisible();
  await expect(chart.locator(".recharts-area")).toHaveCount(0);
  await expect(chart.locator(".recharts-line")).toHaveCount(2);
  await expect(chart.getByText("下行均值", { exact: true })).toBeVisible();
  await expect(chart.getByText("上行均值", { exact: true })).toBeVisible();
  const peaks = chart.getByRole("button", { name: "峰值区间", exact: true });
  await expect(peaks).toHaveAttribute("aria-pressed", "false");
  await peaks.click();
  await expect(chart.locator(".recharts-area")).toHaveCount(2);
  await expect(peaks).toHaveAttribute("aria-pressed", "true");
  await peaks.click();
  await expect(chart.locator(".recharts-area")).toHaveCount(0);
});

test("Canadian dollar cards display the complete CAD code on desktop and mobile", async ({ page }) => {
  await page.routeWebSocket("**/api/ws*", () => {});
  await page.route("**/api/nodes", (route) => route.fulfill({ json: {
    nodes: [{ ...demoNodes[0], currency: "CAD", price: 4.5 }],
  } }));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const price = page.locator(".offer-price > strong");
    await expect(price).toHaveText(/^CAD\s+4\.50$/);
    expect(await price.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
});

test("ticker moves continuously to the right on desktop and mobile", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("article")).toHaveCount(6);
    const motion = await page.locator(".ticker-track").evaluate((track) => {
      const animation = track.getAnimations()[0];
      const timing = animation.effect!.getTiming();
      animation.pause();
      animation.currentTime = 0;
      const start = track.getBoundingClientRect().left;
      animation.currentTime = Number(timing.duration) / 4;
      return { delta: track.getBoundingClientRect().left - start, direction: timing.direction };
    });
    expect(motion.direction).toBe("normal");
    expect(motion.delta).toBeGreaterThan(100);
    await expect(page.locator(".ticker-group[aria-hidden='true']")).toHaveCount(1);
  }
});

test("border light switch controls every light layer and survives reload", async ({ page }) => {
  await page.goto("/");
  const light = page.locator(".node-border-light").first();
  await expect(light).toHaveCSS("animation-name", "border-run");
  await expect(light).toHaveCSS("animation-duration", "20s");
  await page.getByRole("button", { name: "外观设置", exact: true }).click();
  await page.getByRole("button", { name: "关闭边框灯" }).click();
  await expect(light).toHaveCSS("opacity", "0");
  await expect(light).toHaveCSS("animation-name", "none");
  expect(await page.getByRole("article").first().evaluate((card) => getComputedStyle(card, "::before").content)).toBe("none");
  await page.reload();
  await expect(light).toHaveCSS("opacity", "0");
  await page.getByRole("button", { name: "外观设置", exact: true }).click();
  await page.getByRole("button", { name: "开启边框灯" }).click();
  await expect(light).toHaveCSS("animation-name", "border-run");
  await expect(light).toHaveCSS("animation-duration", "20s");
  await expect(light).toHaveCSS("opacity", "0.6");
});

test("history requests follow hub retention and request only the selected series", async ({ page }) => {
  await page.route("**/api/me", (route) => route.fulfill({ json: {
    authed: false, site_name: "协议检查", public_page: true, history_days: 30,
  } }));
  await page.goto("/node/1");
  const resources = page.waitForRequest((request) => request.url().includes("/metrics?") && new URL(request.url()).searchParams.get("hours") === "720");
  await page.getByRole("button", { name: "30 天", exact: true }).click();
  expect(new URL((await resources).url()).searchParams.get("series")).toBe("metrics");
  await expect(page.getByRole("button", { name: "90 天", exact: true })).toHaveCount(0);
  const ping = page.waitForRequest((request) => new URL(request.url()).searchParams.get("series") === "ping");
  await page.getByRole("button", { name: "网络延迟", exact: true }).click();
  expect(new URL((await ping).url()).searchParams.get("hours")).toBe("6");
});

test("hidden pages stop live work and visible pages fetch and reconnect immediately", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-10T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-10T00:00:01Z"));
  let requests = 0, connections = 0;
  await page.route("**/api/nodes", (route) => {
    requests++;
    return route.fulfill({ json: { nodes: demoNodes } });
  });
  await page.routeWebSocket("**/api/ws*", () => { connections++; });
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(6);
  const initial = { requests, connections };
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(20000);
  expect({ requests, connections }).toEqual(initial);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => requests).toBeGreaterThan(initial.requests);
  await expect.poll(() => connections).toBeGreaterThan(initial.connections);
});

test("a delayed REST snapshot cannot replace newer WebSocket data", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/nodes", async (route) => {
    await held;
    await route.fulfill({ json: { nodes: [demoNodes[0]] } });
  });
  await page.routeWebSocket("**/api/ws*", (stream) => {
    stream.send(JSON.stringify({ nodes: [{ ...demoNodes[0], metrics: { ...demoNodes[0].metrics, cpu: 72.5 } }] }));
  });
  await page.goto("/");
  const cpu = page.getByRole("article", { name: demoNodes[0].name }).getByText("72.5%", { exact: true });
  await expect(cpu).toBeVisible();
  const response = page.waitForResponse("**/api/nodes");
  release();
  await response;
  await page.waitForTimeout(200);
  await expect(cpu).toBeVisible();
});

test("invalid snapshot envelopes do not keep a broken stream alive", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-10T00:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-10T00:00:01Z"));
  let connections = 0;
  let stream: Parameters<Parameters<typeof page.routeWebSocket>[1]>[0];
  await page.routeWebSocket("**/api/ws*", (socket) => { connections++; stream = socket; });
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(6);
  const initialConnections = connections;
  await page.clock.fastForward(9000);
  const dropped = page.waitForEvent("console", (message) => message.text().includes("live frame dropped:"));
  stream!.send(JSON.stringify({ nodes: null }));
  await dropped;
  await page.clock.fastForward(2000);
  await expect.poll(() => connections).toBeGreaterThan(initialConnections);
});

test("allowance coupons distinguish remaining, exhausted and unlimited traffic", async ({
  page,
}) => {
  await page.routeWebSocket("**/api/ws*", () => {});
  await page.route("**/api/nodes", (route) =>
    route.fulfill({
      json: {
        admin: false,
        nodes: [
          demoNodes[0],
          { ...demoNodes[1], month_used: demoNodes[1].traffic_limit + 1 },
          { ...demoNodes[2], traffic_limit: 0 },
        ],
      },
    }),
  );
  await page.goto("/");
  const remaining = page
    .getByRole("article", { name: demoNodes[0].name })
    .locator(".traffic-row");
  await expect(remaining).toContainText("820 GB");
  await expect(remaining).toContainText("82%");
  const exhausted = page
    .getByRole("article", { name: demoNodes[1].name })
    .locator(".traffic-row");
  await expect(exhausted.locator(".traffic-copy > strong")).toHaveText("0 B");
  await expect(exhausted).toContainText("额度用尽");
  await expect(
    page
      .getByRole("article", { name: demoNodes[2].name })
      .locator(".traffic-row"),
  ).toContainText("不限量");
});

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
  await page.route("**/api/themes/monitor-theme-guangao/config", (route) =>
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
  await page.getByRole("button", { name: "外观设置", exact: true }).click();
  await page.getByRole("combobox", { name: "广告墙风格" }).click();
  await page.getByRole("option", { name: "澳门皇家赌场风" }).click();
  await expect(page.locator(".monitor-app")).toHaveAttribute("data-variant", "neon");
  await page.reload();
  await expect(page.locator(".monitor-app")).toHaveAttribute("data-variant", "neon");
  await page.evaluate(() => localStorage.setItem("guangao.variant", "invalid"));
  await page.reload();
  await expect(page.locator(".monitor-app")).toHaveAttribute(
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
  await page.route("**/api/themes/monitor-theme-guangao/config", (route) =>
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
  await expect(page.locator(".monitor-app")).toHaveAttribute(
    "data-variant",
    "promo",
  );
  await page.unrouteAll();
  await page.route("**/api/themes/monitor-theme-guangao/config", (route) =>
    route.fulfill({ status: 404, body: "missing" }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "好节点，不用找！" }),
  ).toBeVisible();
});
