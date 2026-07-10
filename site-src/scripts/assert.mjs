// assert.mjs — Phase 3.2f element assertions on the built Home page.
// Serves ./dist under /CopilotScope with a tiny static server (no astro preview),
// drives Playwright chromium at 1440x900 (2-col at 900, hero gap at 1920), writes
// assertions.txt + a debug log OUTSIDE the site branch.
// Covers: per-lens-tile geometry/tagline/pill/icon; rail-icon render; page chrome
// order/hero; header no-shift; hero mark theme swap; §2.4 pill uniformity
// (font-size + padding identical across all 8, bg matches status token, coming-soon
// gray); §3.1/§3.2/§3.3 hero ring-center vs orbit-center + containment + gap.
// Run from site-src (after `npm run build`):  node scripts/assert.mjs
import http from 'node:http';
import { chromium } from 'playwright';
import { readFile, stat } from 'node:fs/promises';
import { mkdirSync, appendFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = path.join(
  'C:\\Users\\bmiddendorf\\OneDrive - Microsoft\\Documents',
  'Copilot Analytics Team\\Aggregated Copilot Analytics',
  'CopilotScope\\_temp\\phase3.2f',
);
mkdirSync(OUT, { recursive: true });
const DBG = path.join(OUT, 'assert-debug.txt');
writeFileSync(DBG, '');
const dbg = (m) => appendFileSync(DBG, `[${new Date().toISOString()}] ${m}\n`);
dbg('boot');

const DIST = path.resolve('dist');
const BASE = '/CopilotScope';
// Ring-center fraction within the mark PNG (326x309); handle offsets it from bbox center.
const FRAC_CX = 0.4095;
const FRAC_CY = 0.432;
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

function chSpread(rgb) {
  const m = (rgb.match(/\d+/g) || []).map(Number);
  if (m.length < 3) return 999;
  return Math.max(m[0], m[1], m[2]) - Math.min(m[0], m[1], m[2]);
}

async function pillStyles(page) {
  return page.evaluate(() => {
    const mk = (v) => {
      const d = document.createElement('div');
      d.style.background = 'var(' + v + ')';
      d.style.position = 'absolute';
      d.style.left = '-9999px';
      d.style.width = '10px';
      d.style.height = '10px';
      document.body.appendChild(d);
      const c = getComputedStyle(d).backgroundColor;
      d.remove();
      return c;
    };
    const tok = {
      installed: mk('--status-installed'),
      available: mk('--status-available'),
      'coming-soon': mk('--status-comingsoon'),
    };
    const pills = Array.from(document.querySelectorAll('a.lens-tile')).map((t) => {
      const id = (t.getAttribute('href') || '').split('/').filter(Boolean).pop();
      const p = t.querySelector('.pill');
      const cs = getComputedStyle(p);
      return {
        id, fontSize: cs.fontSize,
        padTop: cs.paddingTop, padRight: cs.paddingRight,
        padBottom: cs.paddingBottom, padLeft: cs.paddingLeft,
        bg: cs.backgroundColor,
      };
    });
    return { tok, pills };
  });
}

async function heroGeom(page) {
  return page.evaluate(({ fx, fy }) => {
    const orbit = document.querySelector('.hero-art .orbit');
    const ob = orbit.getBoundingClientRect();
    const orbitC = { x: ob.left + ob.width / 2, y: ob.top + ob.height / 2 };
    let mk = null;
    for (const im of document.querySelectorAll('.hero-mark')) {
      const b = im.getBoundingClientRect();
      if (b.width > 0) { mk = b; break; }
    }
    const ringC = { x: mk.left + fx * mk.width, y: mk.top + fy * mk.height };
    const wrap = document.querySelector('.hero-art-wrap').getBoundingClientRect();
    const cat = document.querySelector('.cat-cards').getBoundingClientRect();
    const contained =
      mk.left >= wrap.left - 0.5 && mk.right <= wrap.right + 0.5 &&
      mk.top >= wrap.top - 0.5 && mk.bottom <= wrap.bottom + 0.5;
    return {
      orbitCx: orbitC.x, orbitCy: orbitC.y, ringCx: ringC.x, ringCy: ringC.y,
      dx: orbitC.x - ringC.x, dy: orbitC.y - ringC.y,
      gap: cat.top - wrap.bottom, contained,
    };
  }, { fx: FRAC_CX, fy: FRAC_CY });
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

async function runPills(page, label, lines, counter) {
  const { tok, pills } = await pillStyles(page);
  lines.push('');
  lines.push(`=== 2.4 PILL UNIFORMITY (${label}) — all 8 Home pills ===`);
  lines.push(`   tokens: installed=${tok.installed} available=${tok.available} coming-soon=${tok['coming-soon']}`);
  const fs = new Set();
  const pads = new Set();
  for (const p of pills) {
    fs.add(p.fontSize);
    pads.add([p.padTop, p.padRight, p.padBottom, p.padLeft].join('/'));
    lines.push(`   [${p.id}] font-size=${p.fontSize} padding=${p.padTop} ${p.padRight} ${p.padBottom} ${p.padLeft} bg=${p.bg}`);
  }
  const fsOK = fs.size === 1; if (!fsOK) counter.fail++;
  lines.push(`   all 8 font-size IDENTICAL: ${fsOK ? 'PASS' : 'FAIL'} set={${[...fs].join(', ')}}`);
  const padOK = pads.size === 1; if (!padOK) counter.fail++;
  lines.push(`   all 8 padding IDENTICAL: ${padOK ? 'PASS' : 'FAIL'} set={${[...pads].join(' | ')}}`);
  let bgOK = true;
  for (const p of pills) {
    const exp = tok[EXP_STATUS[p.id]];
    if (p.bg !== exp) { bgOK = false; counter.fail++; lines.push(`   [${p.id}] bg=${p.bg} != token ${exp} FAIL`); }
  }
  lines.push(`   every pill bg matches its status token: ${bgOK ? 'PASS' : 'FAIL'}`);
  const sp = chSpread(tok['coming-soon']);
  const grayOK = sp <= 25; if (!grayOK) counter.fail++;
  lines.push(`   coming-soon is NEUTRAL GRAY (channel spread=${sp} <=25, not blue): ${grayOK ? 'PASS' : 'FAIL'}`);
}

async function runHero(page, label, lines, counter, checkGap) {
  const h = await heroGeom(page);
  const dist = Math.hypot(h.dx, h.dy);
  lines.push('');
  lines.push(`=== 3.1/3.5 HERO RING-CENTER vs ORBIT-CENTER (${label}) ===`);
  lines.push(`   orbit-center=(${h.orbitCx.toFixed(1)}, ${h.orbitCy.toFixed(1)})  mark-ring-center=(${h.ringCx.toFixed(1)}, ${h.ringCy.toFixed(1)})  delta=(${h.dx.toFixed(2)}, ${h.dy.toFixed(2)}) dist=${dist.toFixed(2)}`);
  const cOK = dist <= 2; if (!cOK) counter.fail++;
  lines.push(`   3.1 ring-center within 2px of orbit-center: ${cOK ? 'PASS' : 'FAIL'}`);
  const contOK = h.contained; if (!contOK) counter.fail++;
  lines.push(`   3.2 mark fully contained in .hero-art-wrap: ${contOK ? 'PASS' : 'FAIL'}`);
  if (checkGap) {
    const gOK = h.gap >= 24; if (!gOK) counter.fail++;
    lines.push(`   3.3 gap hero-art-wrap.bottom -> cat-cards.top = ${h.gap.toFixed(1)}px (>=24): ${gOK ? 'PASS' : 'FAIL'}`);
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
    await page.waitForTimeout(900);
    dbg('measuring 1440');
    await runTiles(page, 'light, 1440x900, 4-col', lines, counter);
    await runRail(page, 'light, 1440x900', lines, counter);
    await runChrome(page, lines, counter);
    await runPills(page, 'light, 1440x900', lines, counter);
    await runHero(page, 'light, 1440x900', lines, counter, true);

    const hLight = await headerBox(page);
    await page.evaluate(() => localStorage.setItem('csTheme', 'dark'));
    await page.reload({ waitUntil: 'load', timeout: 20000 });
    await page.waitForSelector('header.topbar', { timeout: 10000 });
    await page.waitForTimeout(900);
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

    await runPills(page, 'dark, 1440x900', lines, counter);
    await runHero(page, 'dark, 1440x900', lines, counter, false);

    await ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: 900, height: 900 } });
    const page2 = await ctx2.newPage();
    dbg('goto 900');
    await page2.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 20000 });
    await page2.waitForSelector('a.lens-tile', { timeout: 10000 });
    await page2.waitForTimeout(900);
    dbg('measuring 900');
    await runTiles(page2, 'light, 900x900, 2-col', lines, counter);
    await runPills(page2, 'light, 900x900, 2-col', lines, counter);
    await ctx2.close();

    const ctx3 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page3 = await ctx3.newPage();
    dbg('goto 1920');
    await page3.goto(`${baseUrl}/`, { waitUntil: 'load', timeout: 20000 });
    await page3.waitForSelector('a.lens-tile', { timeout: 10000 });
    await page3.waitForTimeout(900);
    dbg('measuring 1920');
    await runHero(page3, 'light, 1920x1080', lines, counter, true);
    await ctx3.close();

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