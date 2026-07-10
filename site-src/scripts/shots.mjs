// shots.mjs — capture Home screenshots (light full-page, light viewport, dark
// full-page) at 1440x900 for Phase 3.2b review.
//
// Assumes the site is already built (`npm run build` produces ./dist). Uses
// Astro's programmatic preview server (honors base '/CopilotScope') + Playwright
// chromium. PNGs are written OUTSIDE the site branch, into the main workspace
// _temp so screenshots never land on the CopilotScope-Site branch.
//
// Run from site-src:  node scripts/shots.mjs

import { chromium } from 'playwright';
import { preview } from 'astro';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(
  'C:\\Users\\bmiddendorf\\OneDrive - Microsoft\\Documents',
  'Copilot Analytics Team\\Aggregated Copilot Analytics',
  'CopilotScope\\_temp\\phase3.2g\\screenshots',
);

async function main() {
  await mkdir(OUT, { recursive: true });

  const server = await preview({ logLevel: 'error' });
  const origin = `http://localhost:${server.port}`;
  const baseUrl = `${origin}/CopilotScope`;
  console.log('preview server:', baseUrl);

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();

    // Home — light, full page (1440x900 overall review)
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250); // settle transitions / fonts
    await page.screenshot({ path: path.join(OUT, 'home-light.png'), fullPage: true });
    console.log('  wrote home-light.png');

    // pill zoom — crop one Coming Soon lens tile (light, deviceScaleFactor 2)
    const csTile = page.locator('a.lens-tile', { has: page.locator('.pill--coming-soon') }).first();
    await csTile.screenshot({ path: path.join(OUT, 'pill-zoom.png') });
    console.log('  wrote pill-zoom.png');

    // Home — dark, full page (persist theme, reload so pre-paint script applies)
    await page.evaluate(() => localStorage.setItem('csTheme', 'dark'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, 'home-dark.png'), fullPage: true });
    console.log('  wrote home-dark.png');
    await ctx.close();

    // Home — light, 390px responsive spot-check (fresh context = default light)
    const ctxNarrow = await browser.newContext({
      viewport: { width: 390, height: 900 },
      deviceScaleFactor: 2,
    });
    const pageNarrow = await ctxNarrow.newPage();
    await pageNarrow.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await pageNarrow.waitForTimeout(250);
    await pageNarrow.screenshot({ path: path.join(OUT, 'home-light-390.png'), fullPage: true });
    console.log('  wrote home-light-390.png');
    await ctxNarrow.close();

    // Home — light, 1920x1080 full page (overflow / scroll-safety visual)
    const ctxWide = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const pageWide = await ctxWide.newPage();
    await pageWide.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await pageWide.waitForTimeout(250);
    await pageWide.screenshot({ path: path.join(OUT, 'home-light-1920.png'), fullPage: true });
    console.log('  wrote home-light-1920.png');
    await ctxWide.close();

    console.log('DONE. screenshots ->', OUT);
  } finally {
    await browser.close();
    await server.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});