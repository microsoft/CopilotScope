// shots.mjs — capture full-page shell screenshots in light + dark themes.
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
  'CopilotScope\\_temp\\phase3.1b\\screenshots',
);

async function shoot(page, url, file) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(250); // settle transitions / fonts
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  console.log('  wrote', file);
}

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

    // Home — light (default theme)
    await shoot(page, `${baseUrl}/`, 'home-light.png');

    // Home — dark (persist theme, reload so the pre-paint script applies it)
    await page.evaluate(() => localStorage.setItem('csTheme', 'dark'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, 'home-dark.png'), fullPage: true });
    console.log('  wrote home-dark.png');

    // ValueLens — light (reset theme first)
    await page.evaluate(() => localStorage.setItem('csTheme', 'light'));
    await shoot(page, `${baseUrl}/lenses/valuelens`, 'valuelens-light.png');

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
