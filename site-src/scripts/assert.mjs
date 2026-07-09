// assert.mjs — Phase 3.2d §1.4 element assertions on the built Home page.
// Serves ./dist under /CopilotScope with a tiny static server (no astro preview),
// drives Playwright chromium at 1440x900 (and 900 for the 2-col check), writes
// assertions.txt + a debug log OUTSIDE the site branch.
// Per lens tile: (a) height<=150, (b) icon centerX < name leftX (row layout),
// (c) tagline textContent === exact contract string, (d) pill within 16px of
// card top AND right (coming-soon only), (e) the inline <svg> inside .tile-icon
// has a non-zero bbox (icon RENDERS). Plus (f) name/pill no-overlap via
// Range.getClientRects(). Also: each .rail-icon svg non-zero bbox, and the
// header brand bbox in light AND dark (no-shift check).
// Run from site-src (after `npm run build`):  node scripts/assert.mjs
import http from 'node:http';
import { chromium } from 'playwright';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join(
  'C:\\Users\\bmiddendorf\\OneDrive - Microsoft\\Documents',
  'Copilot Analytics Team\\Aggregated Copilot Analytics',
  'CopilotScope\\_temp\\phase3.2e',
);
mkdirSync(OUT, { recursive: true });
const DBG = path.join(OUT, 'assert-debug.txt');
writeFileSync(DBG, '');
const dbg = (m) => appendFileSync(DBG, `[${new Date().toISOString()}] ${m}\n`);
dbg('boot');

const DIST = path.resolve('dist');
const BASE = '/CopilotScope';
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

const EXPECTED = {
  valuelens: 'Cost vs. value, ROI, time & tasks saved',
  adoptionlens: 'Usage, reach and activation',
  readinesslens: 'Licensed / enabled / ready; provisioning',
  maturitylens: 'Adoption proficiency curve',
  leaderlens: 'Team roll-ups, leagues & leaderboards',
  studiolens: 'Deep Copilot Studio agent evaluation',
  behaviorlens: 'M365 work-behaviour baseline',
  governancelens: 'Agent health, governance, feedback',
};

// Demo tri-state (Decision AA): valuelens installed, studiolens available, rest coming-soon.
const EXP_STATUS = {
  valuelens: 'installed',
  studiolens: 'available',
  adoptionlens: 'coming-soon',
  readinesslens: 'coming-soon',
  maturitylens: 'coming-soon',
  leaderlens: 'coming-soon',
  behaviorlens: 'coming-soon',
  governancelens: 'coming-soon',
};
const STATUS_LABEL = {
  installed: 'Installed',
  available: 'Available',
  'coming-soon': 'Coming Soon',
};
const EXP_ORDER = [
  'valuelens',
  'studiolens',
  'adoptionlens',
  'readinesslens',
  'maturitylens',
  'leaderlens',
  'behaviorlens',
  'governancelens',
];

function makeServer() {
  return http.createServer(async (req, res) => {
    try {
      let url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (url.startsWith(BASE)) url = url.slice(BASE.length);
      if (url === '' || url === '/') url = '/index.html';
      let fp = path.join(DIST, url);
      try { const s = await stat(fp); if (s.isDirectory()) fp = path.join(fp, 'index.html'); }
      catch { fp = path.join(fp, 'index.html'); }
      const data = await readFile(fp);
      res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
      res.end(data);
    } catch (e) { res.statusCode = 404; res.end('404'); }
  });
}

async function measure(page) {
  return page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('a.lens-tile'));
    return tiles.map((t) => {
      const card = t.getBoundingClientRect();
      const iconEl = t.querySelector('.tile-icon');
      const icon = iconEl.getBoundingClientRect();
      const iconSvgEl = t.querySelector('.tile-icon svg');
      const iconSvg = iconSvgEl ? iconSvgEl.getBoundingClientRect() : null;
      const nameEl = t.querySelector('.tile-name');
      const name = nameEl.getBoundingClientRect();
      const tagEl = t.querySelector('.tile-tag');
      const pillEls = Array.from(t.querySelectorAll('.pill'));
      const pillEl = pillEls[0] || null;
      const pill = pillEl ? pillEl.getBoundingClientRect() : null;
      const href = t.getAttribute('href') || '';
      const id = href.split('/').filter(Boolean).pop();

      const range = document.createRange();
      range.selectNodeContents(nameEl);
      const rects = Array.from(range.getClientRects());
      let nameLines = rects.length;
      let textRightNearPill = null;
      if (pill) {
        for (const lr of rects) {
          if (lr.top < pill.bottom && lr.bottom > pill.top) {
            textRightNearPill = textRightNearPill === null ? lr.right : Math.max(textRightNearPill, lr.right);
          }
        }
      }
      return {
        id,
        cardTop: card.top, cardRight: card.right, cardH: card.height,
        iconCenterX: icon.left + icon.width / 2, nameX: name.left,
        iconSvgW: iconSvg ? iconSvg.width : 0, iconSvgH: iconSvg ? iconSvg.height : 0,
        tag: (tagEl.textContent || '').trim(),
        nameLines,
        pillCount: pillEls.length,
        pillText: pillEl ? (pillEl.textContent || '').trim() : null,
        pillClass: pillEl ? pillEl.className : null,
        pillTop: pill ? pill.top : null,
        pillRight: pill ? pill.right : null,
        pillLeft: pill ? pill.left : null,
        pillW: pill ? pill.width : null,
        textRightNearPill,
      };
    });
  });
}

async function railIcons(page) {
  return page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.rail-icon svg'));
    return rows.map((s) => {
      const b = s.getBoundingClientRect();
      const link = s.closest('.rail-link');
      const label = link ? (link.querySelector('.rail-label')?.textContent || '').trim() : '';
      return { label, w: b.width, h: b.height };
    });
  });
}

async function headerBox(page) {
  return page.evaluate(() => {
    const t = document.querySelector('header.topbar').getBoundingClientRect();
    const b = document.querySelector('.brand').getBoundingClientRect();
    return { tbW: t.width, tbH: t.height, brW: b.width, brH: b.height };
  });
}

async function runTiles(page, label, lines, counter) {
  const rows = await measure(page);
  lines.push('');
  lines.push(`=== 1.6 LENS-TILE ASSERTIONS (${label}) ===`);
  lines.push('tiles found: ' + rows.length);
  for (const r of rows) {
    const expStatus = EXP_STATUS[r.id];
    const expLabel = STATUS_LABEL[expStatus];
    lines.push('');
    lines.push(`[${r.id}] expected status=${expStatus} (name lines=${r.nameLines})`);
    const cA = r.cardH <= 150; if (!cA) counter.fail++;
    lines.push(`   (a) height=${r.cardH.toFixed(1)} <=150 ${cA ? 'PASS' : 'FAIL'}`);
    const cB = r.iconCenterX < r.nameX; if (!cB) counter.fail++;
    lines.push(`   (b) iconCenterX=${r.iconCenterX.toFixed(1)} < nameX=${r.nameX.toFixed(1)} ${cB ? 'PASS' : 'FAIL'}`);
    const exp = EXPECTED[r.id];
    const cC = r.tag === exp; if (!cC) counter.fail++;
    lines.push(`   (c) tagline ${cC ? 'PASS' : 'FAIL got="' + r.tag + '" exp="' + exp + '"'}`);
    const cD = r.pillCount === 1; if (!cD) counter.fail++;
    lines.push(`   (d) exactly ONE pill: count=${r.pillCount} ${cD ? 'PASS' : 'FAIL'}`);
    const dTop = r.pillTop == null ? NaN : r.pillTop - r.cardTop;
    const dRight = r.pillRight == null ? NaN : r.cardRight - r.pillRight;
    const cE1 = dTop <= 14; if (!cE1) counter.fail++;
    const cE2 = dRight <= 14; if (!cE2) counter.fail++;
    lines.push(`   (e) pill within 14px of top+right: pillTop-cardTop=${Number.isFinite(dTop) ? dTop.toFixed(1) : 'n/a'} <=14 ${cE1 ? 'PASS' : 'FAIL'}; cardRight-pillRight=${Number.isFinite(dRight) ? dRight.toFixed(1) : 'n/a'} <=14 ${cE2 ? 'PASS' : 'FAIL'}`);
    const cF1 = r.pillText === expLabel; if (!cF1) counter.fail++;
    const cF2 = (r.pillClass || '').includes('pill--' + expStatus); if (!cF2) counter.fail++;
    lines.push(`   (f) pill label="${r.pillText}" === "${expLabel}" ${cF1 ? 'PASS' : 'FAIL'}; class has pill--${expStatus} ("${r.pillClass}") ${cF2 ? 'PASS' : 'FAIL'}`);
    const cG = r.iconSvgW > 0 && r.iconSvgH > 0; if (!cG) counter.fail++;
    lines.push(`   (g) tile-icon <svg> RENDERS bbox=${r.iconSvgW.toFixed(1)}x${r.iconSvgH.toFixed(1)} (>0) ${cG ? 'PASS' : 'FAIL'}`);
    if (r.textRightNearPill === null) {
      lines.push(`   (h) name/pill no-overlap: no name line beside pill (wraps below) PASS`);
    } else {
      const gap = r.pillLeft - r.textRightNearPill;
      const cH = gap >= -0.5; if (!cH) counter.fail++;
      lines.push(`   (h) name/pill no-overlap: pillLeft=${r.pillLeft.toFixed(1)} - textRight=${r.textRightNearPill.toFixed(1)} = gap ${gap.toFixed(1)} (pillW=${r.pillW.toFixed(1)}) ${cH ? 'PASS' : 'FAIL(OVERLAP)'}`);
    }
  }
}

async function runRail(page, label, lines, counter) {
  const rows = await railIcons(page);
  lines.push('');
  lines.push(`=== RAIL-ICON RENDER (${label}) — each .rail-icon svg non-zero bbox ===`);
  lines.push('rail icons found: ' + rows.length);
  for (const r of rows) {
    const ok = r.w > 0 && r.h > 0; if (!ok) counter.fail++;
    lines.push(`   [${r.label}] svg bbox=${r.w.toFixed(1)}x${r.h.toFixed(1)} ${ok ? 'PASS' : 'FAIL'}`);
  }
}

async function pageChrome(page) {
  return page.evaluate(() => {
    const gridIds = Array.from(document.querySelectorAll('a.lens-tile')).map((t) =>
      (t.getAttribute('href') || '').split('/').filter(Boolean).pop(),
    );
    const railIds = Array.from(document.querySelectorAll('.rail-link.indent')).map((a) =>
      (a.getAttribute('data-path') || '').split('/').filter(Boolean).pop(),
    );
    const h1 = document.querySelector('#hero-title');
    const range = document.createRange();
    range.selectNodeContents(h1);
    const h1Lines = range.getClientRects().length;
    const topbarGithub = Array.from(document.querySelectorAll('header.topbar a')).filter((a) =>
      /github\.com/i.test(a.getAttribute('href') || ''),
    ).length;
    const ctas = Array.from(document.querySelectorAll('.hero-actions a')).map((a) =>
      (a.textContent || '').trim(),
    );
    const wrap = document.querySelector('.hero-art-wrap');
    const wrapH = wrap ? wrap.getBoundingClientRect().height : 0;
    let markInfo = null;
    for (const im of Array.from(document.querySelectorAll('.hero-mark'))) {
      const b = im.getBoundingClientRect();
      if (b.width > 0) {
        markInfo = {
          natW: im.naturalWidth, natH: im.naturalHeight,
          renderW: b.width, renderH: b.height, cls: im.className,
        };
        break;
      }
    }
    return { gridIds, railIds, h1Lines, topbarGithub, ctas, wrapH, markInfo };
  });
}

async function runChrome(page, lines, counter) {
  const c = await pageChrome(page);
  lines.push('');
  lines.push('=== PAGE CHROME / ORDER / HERO ASSERTIONS (light, 1440x900) ===');
  const gOK = JSON.stringify(c.gridIds) === JSON.stringify(EXP_ORDER); if (!gOK) counter.fail++;
  lines.push(`   grid order status-first ${gOK ? 'PASS' : 'FAIL'}: [${c.gridIds.join(', ')}]`);
  const rOK = JSON.stringify(c.railIds) === JSON.stringify(EXP_ORDER); if (!rOK) counter.fail++;
  lines.push(`   rail order status-first ${rOK ? 'PASS' : 'FAIL'}: [${c.railIds.join(', ')}]`);
  const hOK = c.h1Lines === 1; if (!hOK) counter.fail++;
  lines.push(`   headline single line @1440: lines=${c.h1Lines} ${hOK ? 'PASS' : 'FAIL'}`);
  const ghOK = c.topbarGithub === 0; if (!ghOK) counter.fail++;
  lines.push(`   no top-bar GitHub link: matches=${c.topbarGithub} ${ghOK ? 'PASS' : 'FAIL'}`);
  const ctaOK = c.ctas.length === 1 && c.ctas[0] === 'Get started'; if (!ctaOK) counter.fail++;
  lines.push(`   single hero CTA "Get started": [${c.ctas.join(' | ')}] ${ctaOK ? 'PASS' : 'FAIL'}`);
  if (c.markInfo) {
    const upOK = c.markInfo.renderW <= c.markInfo.natW + 0.5 && c.markInfo.renderW <= 325; if (!upOK) counter.fail++;
    lines.push(`   logo mark NOT upscaled: render=${c.markInfo.renderW.toFixed(1)}x${c.markInfo.renderH.toFixed(1)} native=${c.markInfo.natW}x${c.markInfo.natH} (<=native & <=325px) ${upOK ? 'PASS' : 'FAIL'} [${c.markInfo.cls}]`);
  } else {
    counter.fail++;
    lines.push('   logo mark visible: FAIL (no visible .hero-mark found)');
  }
  const before = c.wrapH * 288 / 258;
  lines.push(`   hero-art-wrap box: AFTER height=${c.wrapH.toFixed(1)}px; BEFORE (computed, viewBox 288->258)=${before.toFixed(1)}px; delta=${(before - c.wrapH).toFixed(1)}px (~24 target)`);
}

async function markTheme(page) {
  return page.evaluate(() => {
    const l = document.querySelector('.hero-mark-light');
    const d = document.querySelector('.hero-mark-dark');
    return {
      lightW: l ? l.getBoundingClientRect().width : -1,
      darkW: d ? d.getBoundingClientRect().width : -1,
    };
  });
}

async function main() {
  dbg('server starting');
  const server = makeServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  dbg('server port ' + port);
  const baseUrl = `http://127.0.0.1:${port}${BASE}`;
  const browser = await chromium.launch();
  dbg('browser launched');
  const lines = [];
  const counter = { fail: 0 };
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    dbg('goto 1440');
    await page.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForSelector('a.lens-tile', { timeout: 10000 });
    await page.waitForTimeout(400);
    dbg('measuring 1440');
    await runTiles(page, 'light, 1440x900, 4-col', lines, counter);
    await runRail(page, 'light, 1440x900', lines, counter);
    await runChrome(page, lines, counter);

    const hLight = await headerBox(page);
    await page.evaluate(() => localStorage.setItem('csTheme', 'dark'));
    await page.reload({ waitUntil: 'load', timeout: 20000 });
    await page.waitForSelector('header.topbar', { timeout: 10000 });
    await page.waitForTimeout(400);
    const hDark = await headerBox(page);
    lines.push('');
    lines.push('=== HEADER BBOX (no-layout-shift check) ===');
    lines.push(`light: topbar ${hLight.tbW.toFixed(1)}x${hLight.tbH.toFixed(1)}  brand ${hLight.brW.toFixed(1)}x${hLight.brH.toFixed(1)}`);
    lines.push(`dark:  topbar ${hDark.tbW.toFixed(1)}x${hDark.tbH.toFixed(1)}  brand ${hDark.brW.toFixed(1)}x${hDark.brH.toFixed(1)}`);
    const shift = Math.abs(hLight.tbH - hDark.tbH) < 0.5 && Math.abs(hLight.brW - hDark.brW) < 0.5 && Math.abs(hLight.brH - hDark.brH) < 0.5;
    if (!shift) counter.fail++;
    lines.push('no-layout-shift (topbarH, brandW, brandH within 0.5px): ' + (shift ? 'PASS' : 'FAIL'));

    const mt = await markTheme(page);
    const mtOK = mt.darkW > 0 && mt.lightW === 0; if (!mtOK) counter.fail++;
    lines.push('');
    lines.push('=== HERO MARK THEME SWAP (dark) ===');
    lines.push(`   dark theme: dark mark visible (w=${mt.darkW.toFixed(1)}>0) + light mark hidden (w=${mt.lightW.toFixed(1)}=0) ${mtOK ? 'PASS' : 'FAIL'}`);

    await ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: 900, height: 900 } });
    const page2 = await ctx2.newPage();
    dbg('goto 900');
    await page2.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 20000 });
    await page2.waitForSelector('a.lens-tile', { timeout: 10000 });
    await page2.waitForTimeout(400);
    dbg('measuring 900');
    await runTiles(page2, 'light, 900x900, 2-col', lines, counter);

    lines.push('');
    lines.push(`=== SUMMARY: ${counter.fail === 0 ? 'ALL PASS' : counter.fail + ' FAIL(S)'} ===`);
    const text = lines.join('\n') + '\n';
    dbg('writing assertions.txt');
    writeFileSync(path.join(OUT, 'assertions.txt'), text, 'utf8');
    dbg('done ok');
  } catch (e) {
    dbg('ERROR ' + (e && e.stack ? e.stack : String(e)));
    writeFileSync(path.join(OUT, 'assertions.txt'), 'ASSERT ERROR: ' + (e && e.stack ? e.stack : String(e)) + '\n', 'utf8');
  } finally {
    try { await browser.close(); } catch (e) {}
    try { server.close(); } catch (e) {}
    dbg('cleanup done');
    process.exit(0);
  }
}

main();