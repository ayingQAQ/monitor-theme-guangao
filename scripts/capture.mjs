import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("docs/previews", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1120 },
  reducedMotion: "reduce",
});
await page.goto("http://127.0.0.1:5173/");
await page.getByRole("article").first().waitFor();
for (const variant of ["promo", "neon", "retro"]) {
  await page.getByRole("combobox", { name: "广告墙风格" }).click();
  await page.getByRole("option", { name: { promo: "红黄促销墙", neon: "紫绿广告墙", retro: "复古 GIF 广告墙" }[variant] }).click();
  await page.locator(`.monitor-app[data-variant="${variant}"]`).waitFor();
  await page.getByText("演示数据 · 非真实节点", { exact: true }).waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `docs/previews/${variant}.png`,
    fullPage: true,
  });
  if (variant === "promo") await page.screenshot({ path: "preview.png" });
}
await page.getByRole("combobox", { name: "广告墙风格" }).click();
await page.getByRole("option", { name: "红黄促销墙" }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => scrollTo(0, 0));
await page.screenshot({ path: "docs/previews/mobile.png", fullPage: true });
await page.setViewportSize({ width: 180, height: 180 });
await page.setContent(
  '<body style="margin:0;background:#ffdd35"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" style="display:block;width:180px;height:180px"><rect x="3" y="3" width="58" height="58" fill="#ffdd35" stroke="#201809" stroke-width="5"/><path d="M34 10 17 35h14l-3 19 19-28H33z" fill="#ef3328" stroke="#201809" stroke-width="2"/></svg></body>',
);
await page.screenshot({
  path: "public/apple-touch-icon.png",
  omitBackground: false,
});
await browser.close();
await writeFile(
  "docs/previews/README.md",
  "# Theme previews\n\nAll screenshots use explicitly labeled development fixtures, not real servers.\n\n- promo.png: promotional wall\n- neon.png: violet/lime wall\n- retro.png: retro GIF wall\n- mobile.png: mobile promotional wall\n",
);
console.log(
  "Three desktop previews, mobile preview and opaque Apple icon captured.",
);
