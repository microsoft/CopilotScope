// Lens-scoped documentation search backed by Pagefind's direct browser Search
// API (no CDN, no Default/Component UI). The Pagefind bundle is generated after
// the Astro build into dist/pagefind/, so this module imports the same-origin
// /pagefind/pagefind.js at runtime via a BASE_URL-derived path.
//
// Behaviour contract: search every non-empty query (no minimum length), load
// and render every result Pagefind returns (no cap, no truncation), render the
// Pagefind excerpt through innerHTML (documented safe — entity-encoded with
// <mark> highlights) and all other metadata via textContent. Binding is
// re-established on every astro:page-load and is idempotent per element, so
// repeated ClientRouter navigations never duplicate listeners or leak the lens
// filter between pages.

interface PagefindResult {
  data: () => Promise<PagefindData>;
}
interface PagefindData {
  url: string;
  excerpt: string;
  meta?: Record<string, string>;
}
interface PagefindSearch {
  results: PagefindResult[];
}
interface Pagefind {
  options?: (o: Record<string, unknown>) => Promise<void>;
  init?: () => Promise<void>;
  preload?: (q: string, o?: Record<string, unknown>) => void;
  search: (q: string, o?: Record<string, unknown>) => Promise<PagefindSearch>;
  debouncedSearch: (
    q: string,
    o?: Record<string, unknown>,
    d?: number,
  ) => Promise<PagefindSearch | null>;
}

let pagefindPromise: Promise<Pagefind> | null = null;

function bundleBase(): string {
  const raw = import.meta.env.BASE_URL || '/';
  return raw.replace(/\/+$/, '') + '/pagefind/';
}

// Vite rewrites a bare dynamic import() through its module-preload helper, which
// for a runtime-only specifier can emit an unresolved __VITE_PRELOAD__ token that
// throws at load. Building the import through Function keeps it opaque to Vite so
// the same-origin, post-build Pagefind bundle loads verbatim. The specifier is
// derived only from BASE_URL (no user input), so this is not an injection vector.
const importPagefind = new Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<Pagefind>;

function loadPagefind(): Promise<Pagefind> {
  if (!pagefindPromise) {
    pagefindPromise = (async () => {
      const mod = await importPagefind(bundleBase() + 'pagefind.js');
      if (mod.options) await mod.options({ bundlePath: bundleBase() });
      if (mod.init) await mod.init();
      return mod;
    })();
  }
  return pagefindPromise;
}

function renderResults(
  results: PagefindData[],
  statusEl: HTMLElement,
  resultsEl: HTMLElement,
  query: string,
  showLensContext: boolean,
): void {
  resultsEl.replaceChildren();
  if (results.length === 0) {
    statusEl.textContent = `No results for \u201c${query}\u201d.`;
    return;
  }
  statusEl.textContent = `${results.length} result${results.length === 1 ? '' : 's'} for \u201c${query}\u201d.`;
  for (const r of results) {
    const li = document.createElement('li');
    li.className = 'ds-result';

    const a = document.createElement('a');
    a.className = 'ds-result-link';
    a.href = r.url;

    const title = document.createElement('span');
    title.className = 'ds-result-title';
    // Metadata is raw/unprocessed per the Pagefind docs — render with textContent.
    title.textContent = r.meta && r.meta.title ? r.meta.title : r.url;

    const excerpt = document.createElement('p');
    excerpt.className = 'ds-result-excerpt';
    // excerpt is entity-encoded by Pagefind and carries <mark> highlights;
    // it is documented as safe to assign as innerHTML.
    excerpt.innerHTML = r.excerpt;

    a.appendChild(title);
    li.appendChild(a);

    // Global (no-lens) search returns results from both lenses and duplicate
    // titles exist across lenses, so surface the lens name as plain-text
    // context. Metadata is raw/unprocessed per the Pagefind docs — textContent.
    if (showLensContext) {
      const lensName = r.meta && r.meta.lens_name ? r.meta.lens_name : '';
      if (lensName) {
        const context = document.createElement('span');
        context.className = 'ds-result-lens';
        context.textContent = lensName;
        li.appendChild(context);
      }
    }

    li.appendChild(excerpt);
    resultsEl.appendChild(li);
  }
}

function bindSearch(container: HTMLElement): void {
  if (container.dataset.bound === '1') return;
  container.dataset.bound = '1';

  const input = container.querySelector<HTMLInputElement>('[data-ds-input]');
  const statusEl = container.querySelector<HTMLElement>('[data-ds-status]');
  const resultsEl = container.querySelector<HTMLElement>('[data-ds-results]');
  if (!input || !statusEl || !resultsEl) return;

  const lens = container.getAttribute('data-lens') || '';
  const filterOpts: Record<string, unknown> = lens ? { filters: { lens } } : {};
  // No data-lens means the global FAQ & Support search: no filter, and each
  // result carries visible lens context because duplicate titles span lenses.
  const showLensContext = !lens;

  const run = async (): Promise<void> => {
    const query = input.value.trim();
    if (!query) {
      resultsEl.replaceChildren();
      statusEl.textContent = '';
      return;
    }
    statusEl.textContent = 'Searching\u2026';
    let pagefind: Pagefind;
    try {
      pagefind = await loadPagefind();
    } catch {
      statusEl.textContent = 'Search is unavailable right now.';
      return;
    }
    const search = await pagefind.debouncedSearch(query, filterOpts, 300);
    if (search === null) return; // a newer query superseded this one
    const data = await Promise.all(search.results.map((r) => r.data()));
    if (input.value.trim() !== query) return; // input changed while awaiting
    renderResults(data, statusEl, resultsEl, query, showLensContext);
  };

  input.addEventListener('input', () => {
    const query = input.value.trim();
    if (query) {
      loadPagefind()
        .then((pf) => pf.preload && pf.preload(query, filterOpts))
        .catch(() => {});
    }
    void run();
  });
  input.addEventListener('search', () => void run());
  input.addEventListener('focus', () => {
    loadPagefind().catch(() => {});
  });
  // No form wraps the input; guard Enter so it never triggers a navigation.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
  });
}

document.addEventListener('astro:page-load', () => {
  document.querySelectorAll<HTMLElement>('[data-docs-search]').forEach(bindSearch);
});
