import { chromium } from '@playwright/test';
import { mkdir, readFile, stat } from 'node:fs/promises';

await mkdir('public/icons', { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 180, height: 180 } });
  for (const skin of ['promo', 'royal', 'retro']) {
    const svg = await readFile(`src/assets/brand-${skin}.svg`, 'utf8');
    await page.setContent(`<style>body{margin:0}svg{display:block;width:180px;height:180px}</style>${svg}`);
    const file = `public/icons/site-${skin}.png`;
    await page.screenshot({ path: file });
    if ((await stat(file)).size > 20 * 1024) throw new Error(`${file} exceeds the Hub icon limit`);
  }
} finally { await browser.close(); }
console.log('Three 180px site icons rendered within the Hub upload limit.');
