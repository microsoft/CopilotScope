// Shared stars client — consumed by the Lenses Overview page and the lens
// detail pages. Single GET on load, optimistic POST/DELETE toggle,
// localStorage starred-state, same-origin /config/stars.json fallback,
// hide-on-both-fail, astro:page-load-safe (bind once, run every navigation).

const ENDPOINT = 'https://stars.copilotscope.ai';
const TIMEOUT = 5000;
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

type Counts = Record<string, number>;

function initStars(): void {
  const rows = Array.from(document.querySelectorAll<HTMLElement>('.star-row'));
  if (rows.length === 0) return;

  const key = (id: string) => 'copilotscope.starred.' + id;
  const isStarred = (id: string): boolean => {
    try {
      return localStorage.getItem(key(id)) === 'true';
    } catch (e) {
      return false;
    }
  };

  const setState = (row: HTMLElement, starred: boolean): void => {
    const btn = row.querySelector('.star-btn');
    const glyph = row.querySelector('.star-glyph');
    const name = btn ? btn.getAttribute('data-name') || 'this lens' : 'this lens';
    if (btn) {
      btn.classList.toggle('is-starred', starred);
      btn.setAttribute('aria-pressed', starred ? 'true' : 'false');
      btn.setAttribute('aria-label', starred ? 'Remove your star from ' + name : 'Star ' + name);
    }
    if (glyph) glyph.textContent = starred ? '\u2605' : '\u2606';
  };

  rows.forEach((row) => {
    setState(row, isStarred(row.getAttribute('data-lens') || ''));
  });

  const fetchJSON = async (url: string, opts: RequestInit) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(url, Object.assign({ signal: ctrl.signal }, opts));
      if (!res.ok) throw new Error('http ' + res.status);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  const loadCounts = async (): Promise<Counts | null> => {
    try {
      const j = await fetchJSON(ENDPOINT + '/stars', { method: 'GET' });
      if (j && j.counts) return j.counts as Counts;
    } catch (e) {}
    try {
      const j = await fetchJSON(BASE + '/config/stars.json', { method: 'GET' });
      if (j && j.counts) return j.counts as Counts;
    } catch (e) {}
    return null;
  };

  (async () => {
    const counts = await loadCounts();
    if (!counts) {
      rows.forEach((row) => {
        row.style.display = 'none';
      });
      return;
    }
    rows.forEach((row) => {
      const id = row.getAttribute('data-lens') || '';
      const el = row.querySelector('.star-count');
      const v = counts[id];
      if (el) el.textContent = typeof v === 'number' ? String(v) : '';
    });
  })();

  rows.forEach((row) => {
    const id = row.getAttribute('data-lens') || '';
    const btn = row.querySelector('.star-btn');
    const el = row.querySelector('.star-count');
    if (!btn || !id) return;
    btn.addEventListener('click', async () => {
      const starred = isStarred(id);
      const cur = parseInt((el && el.textContent) || '', 10);
      const base0 = Number.isFinite(cur) ? cur : 0;
      if (!starred) {
        if (el) el.textContent = String(base0 + 1);
        try {
          localStorage.setItem(key(id), 'true');
        } catch (e) {}
        setState(row, true);
        try {
          const j = await fetchJSON(ENDPOINT + '/stars/' + id, { method: 'POST' });
          if (j && typeof j.count === 'number' && el) el.textContent = String(Math.max(0, j.count));
        } catch (e) {
          /* keep optimistic increment */
        }
      } else {
        if (el) el.textContent = String(Math.max(0, base0 - 1));
        try {
          localStorage.removeItem(key(id));
        } catch (e) {}
        setState(row, false);
        try {
          const j = await fetchJSON(ENDPOINT + '/stars/' + id, { method: 'DELETE' });
          if (j && typeof j.count === 'number' && el) el.textContent = String(Math.max(0, j.count));
        } catch (e) {
          /* keep optimistic decrement */
        }
      }
    });
  });
}

declare global {
  interface Window {
    __csStarsBound?: boolean;
  }
}

if (!window.__csStarsBound) {
  window.__csStarsBound = true;
  document.addEventListener('astro:page-load', initStars);
}

export {};
