// Right-rail "On this page" scroll-spy. Highlights the nav link whose section
// currently occupies the top of the viewport. Uses a rAF-throttled scroll
// listener (reliable for tall sections where IntersectionObserver would not
// re-fire). astro:page-load-safe; the single scroll handler is tracked on
// window and removed before re-adding, so repeated in-site navigations never
// accumulate listeners.

function initRail(): void {
  const rail = document.querySelector<HTMLElement>('[data-ld-rail-nav]');
  if (!rail) return;
  const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>('a[data-spy]'));
  if (!links.length) return;

  const map = new Map<Element, HTMLAnchorElement>();
  const sections: HTMLElement[] = [];
  for (const a of links) {
    const id = (a.getAttribute('href') || '').replace('#', '');
    const el = id ? document.getElementById(id) : null;
    if (el) { map.set(el, a); sections.push(el); }
  }
  if (!sections.length) return;

  const setActive = (a: HTMLAnchorElement | undefined): void => {
    for (const l of links) {
      const on = l === a;
      l.classList.toggle('is-active', on);
      if (on) l.setAttribute('aria-current', 'true');
      else l.removeAttribute('aria-current');
    }
  };

  const THRESHOLD = 130;
  const compute = (): void => {
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      const last = map.get(sections[sections.length - 1]);
      if (last) { setActive(last); return; }
    }
    let active: HTMLElement = sections[0];
    for (const el of sections) {
      if (el.getBoundingClientRect().top - 1 <= THRESHOLD) active = el;
      else break;
    }
    const a = map.get(active);
    if (a) setActive(a);
  };

  const w = window as unknown as { __csRailScroll?: () => void };
  if (w.__csRailScroll) window.removeEventListener('scroll', w.__csRailScroll);
  let ticking = false;
  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      compute();
      ticking = false;
    });
  };
  w.__csRailScroll = onScroll;
  window.addEventListener('scroll', onScroll, { passive: true });
  compute();
}

declare global {
  interface Window {
    __csRailBound?: boolean;
  }
}
if (!window.__csRailBound) {
  window.__csRailBound = true;
  document.addEventListener('astro:page-load', initRail);
}

export {};
