// Build-emitted screenshot capture manifest.
//
// Scans the generated docs HTML in dist/ with parse5 (never regex) for
// ScreenshotPlaceholder data attributes, validates them, and writes a
// deterministic manifest to dist/docs/screenshot-manifest.json. Runs after the
// Astro static build. Any malformed or duplicate ID, or missing description /
// alt text, fails the build.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteSrc = path.join(__dirname, '..');
const dist = path.join(siteSrc, 'dist');
const outPath = path.join(dist, 'docs', 'screenshot-manifest.json');

const SCHEMA_VERSION = 1;
const ID_PATTERN = /^(VL|SL)-[A-Z0-9]+-\d{3}$/;
const LENS_BY_PREFIX = { VL: 'valuelens', SL: 'studiolens' };

/** Recursively collect all HTML files under a directory. */
function htmlFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** dist-absolute html path -> site-root page URL. */
function pageUrlFor(file) {
  let rel = path.relative(dist, file).split(path.sep).join('/');
  rel = '/' + rel;
  rel = rel.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (!rel.endsWith('/')) rel += '/';
  return rel;
}

function attr(node, name) {
  if (!node.attrs) return undefined;
  const a = node.attrs.find((x) => x.name === name);
  return a ? a.value : undefined;
}

/** Walk a parse5 tree collecting placeholder elements. */
function collect(node, acc) {
  if (node.attrs && attr(node, 'data-screenshot-id') !== undefined) {
    acc.push(node);
  }
  if (node.childNodes) for (const c of node.childNodes) collect(c, acc);
}

const placeholders = [];
const seen = new Set();

// Only scan docs pages.
const docsRoots = [
  path.join(dist, 'lenses'),
];

const scanned = [];
for (const root of docsRoots) {
  for (const file of htmlFiles(root)) {
    const url = pageUrlFor(file);
    if (!/\/lenses\/[^/]+\/docs(\/|$)/.test(url)) continue;
    scanned.push(url);
    const doc = parse(fs.readFileSync(file, 'utf8'));
    const found = [];
    collect(doc, found);
    for (const el of found) {
      const id = attr(el, 'data-screenshot-id');
      const description = attr(el, 'data-capture-description');
      const proposedAlt = attr(el, 'data-proposed-alt');

      if (!id || !ID_PATTERN.test(id)) {
        throw new Error(`Invalid screenshot ID "${id}" on ${url}`);
      }
      if (seen.has(id)) {
        throw new Error(`Duplicate screenshot ID "${id}" (second occurrence on ${url})`);
      }
      if (!description || !description.trim()) {
        throw new Error(`Empty capture description for "${id}" on ${url}`);
      }
      if (!proposedAlt || !proposedAlt.trim()) {
        throw new Error(`Empty proposed alt text for "${id}" on ${url}`);
      }
      const lens = LENS_BY_PREFIX[id.slice(0, 2)];
      seen.add(id);
      placeholders.push({
        id,
        lens,
        pageUrl: url,
        description,
        proposedAlt,
        status: 'needed',
      });
    }
  }
}

// Stable sort by ID; deterministic output, no timestamp, no absolute paths.
placeholders.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const manifest = {
  schemaVersion: SCHEMA_VERSION,
  count: placeholders.length,
  placeholders,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(
  `screenshot-manifest: ${placeholders.length} placeholder(s) from ${scanned.length} docs page(s) -> ${path.relative(siteSrc, outPath).split(path.sep).join('/')}`,
);
