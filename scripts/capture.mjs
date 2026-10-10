import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("docs/previews", { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  reducedMotion: "reduce",
});
await page.goto("http://127.0.0.1:5173/");
await page.getByRole("article").first().waitFor();
for (const variant of ["promo", "neon", "retro"]) {
  await page.getByRole("button", { name: "外观设置", exact: true }).click();
  await page.getByRole("combobox", { name: "广告墙风格" }).click();
  await page.getByRole("option", { name: { promo: "红黄促销墙", neon: "澳门皇家赌场风", retro: "复古 GIF 广告墙" }[variant] }).click();
  await page.locator(`.monitor-app[data-variant="${variant}"]`).waitFor();
  await page.getByRole("heading", { level: 1 }).click();
  await page.getByText("演示数据 · 非真实节点", { exact: true }).waitFor();
  await page.evaluate(async () => { scrollTo(0, 0); await document.fonts.ready; });
  await page.screenshot({
    path: `docs/previews/${variant}.png`,
    fullPage: false,
  });
  if (variant === "promo") await page.screenshot({ path: "preview.png" });
}
if (process.argv.includes("--desktop-only")) {
  await browser.close();
  console.log("Three 1600 × 1000 desktop previews and package preview captured.");
  process.exit(0);
}
await page.getByRole("button", { name: "外观设置", exact: true }).click();
  await page.getByRole("combobox", { name: "广告墙风格" }).click();
await page.getByRole("option", { name: "红黄促销墙" }).click();
await page.keyboard.press("Escape");
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
  "# Theme previews\n\nAll screenshots use explicitly labeled development fixtures, not real servers.\n\n- promo.png: promotional wall\n- neon.png: Royal Macau black/gold wall\n- retro.png: retro GIF wall\n- mobile.png: mobile promotional wall\n",
);
console.log(
  "Three desktop previews, mobile preview and opaque Apple icon captured.",
);
