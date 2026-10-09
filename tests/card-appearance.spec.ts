import { test, expect } from "@playwright/test";
import { demoNodes } from "../dev/fixtures";
test("random card styling stays with the node across live updates and filtering", async ({
  page,
}) => {
  let socket: Parameters<Parameters<typeof page.routeWebSocket>[1]>[0];
  await page.routeWebSocket("**/api/ws*", (s) => {
    socket = s;
  });
  await page.goto("/");
  await expect(page.getByRole("article")).toHaveCount(6);
  const card = page.getByRole("article", { name: demoNodes[2].name });
  const appearance = () =>
    card.evaluate((el) =>
      [...el.classList]
        .filter((name) => /^(tone|pattern|sticker|tilt)-/.test(name))
        .join(" "),
    );
  const original = await appearance();
  expect(original.split(" ")).toHaveLength(4);
  socket!.send(
    JSON.stringify({
      nodes: demoNodes.map((node) =>
        node.id === 3
          ? { ...node, metrics: { ...node.metrics, cpu: 22.5 } }
          : node,
      ),
    }),
  );
  await expect(card.getByText("22.5%", { exact: true })).toBeVisible();
  expect(await appearance()).toBe(original);
  await page.getByRole("button", { name: "欧洲线路" }).click();
  await expect(card).toHaveCount(0);
  await page.getByRole("button", { name: "美洲线路" }).click();
  await expect(card).toBeVisible();
  expect(await appearance()).toBe(original);
});
