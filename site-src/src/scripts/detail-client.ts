// Lens detail Mode B (dashboard-first) client. Only acts on installed lenses.
// JS enhancement layered over the no-JS marketing layout: on load it reveals
// the strip + dashboard placeholder and hides the marketing pane; the
// "About this lens" toggle flips between the two. astro:page-load-safe.

function initDetail(): void {
  const article = document.querySelector<HTMLElement>('.lens-detail[data-status="installed"]');
  if (!article) return;
  const strip = article.querySelector<HTMLElement>('[data-ld-strip]');
  const dashboard = article.querySelector<HTMLElement>('[data-ld-dashboard]');
  const marketing = article.querySelector<HTMLElement>('[data-ld-marketing]');
  const toggle = article.querySelector<HTMLButtonElement>('[data-ld-toggle]');
  if (!strip || !dashboard || !marketing || !toggle) return;

  const showDashboard = (): void => {
    strip.hidden = false;
    dashboard.hidden = false;
    marketing.hidden = true;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'About this lens';
  };
  const showAbout = (): void => {
    strip.hidden = false;
    dashboard.hidden = true;
    marketing.hidden = false;
    toggle.setAttribute('aria-pressed', 'true');
    toggle.textContent = 'Back to dashboard';
  };

  // JS enhancement: enter dashboard-first mode on every load of the page.
  showDashboard();

  // Bind once per toggle element. Each navigation swaps in a fresh element,
  // so binding it a single time never accumulates listeners.
  const t = toggle as HTMLButtonElement & { __ldBound?: boolean };
  if (!t.__ldBound) {
    t.__ldBound = true;
    t.addEventListener('click', () => {
      if (toggle.getAttribute('aria-pressed') === 'true') showDashboard();
      else showAbout();
    });
  }

  const aboutLink = article.querySelector<HTMLElement>('[data-ld-about]');
  if (aboutLink) {
    const a = aboutLink as HTMLElement & { __ldBound?: boolean };
    if (!a.__ldBound) {
      a.__ldBound = true;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showAbout();
      });
    }
  }
}

declare global {
  interface Window {
    __csDetailBound?: boolean;
  }
}

if (!window.__csDetailBound) {
  window.__csDetailBound = true;
  document.addEventListener('astro:page-load', initDetail);
}

export {};
