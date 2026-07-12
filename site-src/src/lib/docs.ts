// Single source of truth for the in-app documentation platform: the canonical
// docs route model, the persisted-rail docs-descendant active contract, and the
// navigation / previous-next / breadcrumb helpers built on top of it.
//
// This module is intentionally PURE — it imports nothing from `astro:content`,
// so it can be imported by the server layout, the build-time catch-all route,
// AND the client-side rail script without pulling the content runtime into the
// browser bundle. The build-time exact-set comparison against the `docs`
// collection lives in the catch-all route, which is allowed to import
// `getCollection`.

export type DocsLensSlug = 'valuelens' | 'studiolens';

export interface DocsRoute {
  /** Lens slug that owns this doc. */
  lens: DocsLensSlug;
  /** Human-facing lens name, e.g. "ValueLens". */
  lensName: string;
  /** Collection entry id (path under src/content/docs without extension). */
  entryId: string;
  /**
   * Rest-parameter value for the [...doc] catch-all. `undefined` is the docs
   * landing route (no trailing document segment).
   */
  doc: string | undefined;
  /** Site-root-relative URL path (no BASE_URL prefix), e.g. "/lenses/valuelens/docs". */
  path: string;
  /** <title> / <h1> page title. */
  title: string;
  /** Left-navigation label. */
  navLabel: string;
  /** Navigation group label; null renders as a top-level link. */
  navGroup: string | null;
  /** Canonical per-lens order (0-based). */
  order: number;
}

export const DOCS_LENS_NAME: Record<DocsLensSlug, string> = {
  valuelens: 'ValueLens',
  studiolens: 'StudioLens',
};

// Canonical, ordered route model. The set of entryId values here must match the
// `docs` collection exactly at build time (validated in the catch-all route).
export const DOCS_ROUTES: DocsRoute[] = [
  // ValueLens
  { lens: 'valuelens', lensName: 'ValueLens', entryId: 'valuelens/overview', doc: undefined, path: '/lenses/valuelens/docs', title: 'Overview & concepts', navLabel: 'Overview & concepts', navGroup: null, order: 0 },
  { lens: 'valuelens', lensName: 'ValueLens', entryId: 'valuelens/choose-deployment-path', doc: 'choose-deployment-path', path: '/lenses/valuelens/docs/choose-deployment-path', title: 'Choose your deployment path', navLabel: 'Choose your deployment path', navGroup: null, order: 1 },
  { lens: 'valuelens', lensName: 'ValueLens', entryId: 'valuelens/setup/sharepoint', doc: 'setup/sharepoint', path: '/lenses/valuelens/docs/setup/sharepoint', title: 'SharePoint setup guide', navLabel: 'SharePoint', navGroup: 'Setup guides', order: 2 },
  { lens: 'valuelens', lensName: 'ValueLens', entryId: 'valuelens/setup/fabric', doc: 'setup/fabric', path: '/lenses/valuelens/docs/setup/fabric', title: 'Fabric setup guide', navLabel: 'Fabric', navGroup: 'Setup guides', order: 3 },
  { lens: 'valuelens', lensName: 'ValueLens', entryId: 'valuelens/setup/fabric-extended', doc: 'setup/fabric-extended', path: '/lenses/valuelens/docs/setup/fabric-extended', title: 'Fabric Extended setup guide', navLabel: 'Fabric Extended', navGroup: 'Setup guides', order: 4 },
  { lens: 'valuelens', lensName: 'ValueLens', entryId: 'valuelens/data-sources-requirements', doc: 'data-sources-requirements', path: '/lenses/valuelens/docs/data-sources-requirements', title: 'Data sources & requirements', navLabel: 'Data sources & requirements', navGroup: null, order: 5 },
  { lens: 'valuelens', lensName: 'ValueLens', entryId: 'valuelens/page-reference', doc: 'page-reference', path: '/lenses/valuelens/docs/page-reference', title: 'Page reference', navLabel: 'Page reference', navGroup: null, order: 6 },
  { lens: 'valuelens', lensName: 'ValueLens', entryId: 'valuelens/troubleshooting-faq', doc: 'troubleshooting-faq', path: '/lenses/valuelens/docs/troubleshooting-faq', title: 'Troubleshooting & FAQ', navLabel: 'Troubleshooting & FAQ', navGroup: null, order: 7 },
  // StudioLens
  { lens: 'studiolens', lensName: 'StudioLens', entryId: 'studiolens/overview', doc: undefined, path: '/lenses/studiolens/docs', title: 'Overview & concepts', navLabel: 'Overview & concepts', navGroup: null, order: 0 },
  { lens: 'studiolens', lensName: 'StudioLens', entryId: 'studiolens/choose-deployment-path', doc: 'choose-deployment-path', path: '/lenses/studiolens/docs/choose-deployment-path', title: 'Choose your deployment path', navLabel: 'Choose your deployment path', navGroup: null, order: 1 },
  { lens: 'studiolens', lensName: 'StudioLens', entryId: 'studiolens/setup/dataverse-direct', doc: 'setup/dataverse-direct', path: '/lenses/studiolens/docs/setup/dataverse-direct', title: 'Dataverse (Direct) setup guide', navLabel: 'Dataverse (Direct)', navGroup: 'Setup guides', order: 2 },
  { lens: 'studiolens', lensName: 'StudioLens', entryId: 'studiolens/setup/fabric', doc: 'setup/fabric', path: '/lenses/studiolens/docs/setup/fabric', title: 'Fabric setup guide', navLabel: 'Fabric', navGroup: 'Setup guides', order: 3 },
  { lens: 'studiolens', lensName: 'StudioLens', entryId: 'studiolens/data-sources-requirements', doc: 'data-sources-requirements', path: '/lenses/studiolens/docs/data-sources-requirements', title: 'Data sources & requirements', navLabel: 'Data sources & requirements', navGroup: null, order: 5 },
  { lens: 'studiolens', lensName: 'StudioLens', entryId: 'studiolens/page-reference', doc: 'page-reference', path: '/lenses/studiolens/docs/page-reference', title: 'Page reference', navLabel: 'Page reference', navGroup: null, order: 6 },
  { lens: 'studiolens', lensName: 'StudioLens', entryId: 'studiolens/troubleshooting-faq', doc: 'troubleshooting-faq', path: '/lenses/studiolens/docs/troubleshooting-faq', title: 'Troubleshooting & FAQ', navLabel: 'Troubleshooting & FAQ', navGroup: null, order: 7 },
];

const stripTrailing = (p: string): string => p.replace(/\/+$/, '') || '/';

/**
 * The one docs-descendant active-state contract, shared verbatim by
 * BaseLayout's server render, BaseLayout's client updateActive(), and the docs
 * layout. A rail link is active when the current path equals it, OR when the
 * link is a lens landing (/…/lenses/<slug>) and the current path is that lens's
 * docs subtree (/…/lenses/<slug>/docs…). Only the owning lens lights up — the
 * "Overview" link (/…/lenses) never matches a lens docs page.
 */
export function railActive(linkPath: string, currentPath: string): boolean {
  const link = stripTrailing(linkPath);
  const cur = stripTrailing(currentPath);
  if (link === cur) return true;
  const lens = link.match(/^(.*\/lenses\/[^/]+)$/);
  if (lens) {
    const root = lens[1];
    if (cur === root || cur.startsWith(root + '/docs')) return true;
  }
  return false;
}

export function getLensDocs(lens: DocsLensSlug): DocsRoute[] {
  return DOCS_ROUTES.filter((r) => r.lens === lens).sort((a, b) => a.order - b.order);
}

export function findRoute(lens: string, doc: string | undefined): DocsRoute | undefined {
  const d = doc === undefined || doc === '' ? undefined : stripTrailing(doc).replace(/^\/+/, '');
  return DOCS_ROUTES.find((r) => r.lens === lens && r.doc === d);
}

export function getPrevNext(route: DocsRoute): { prev: DocsRoute | null; next: DocsRoute | null } {
  const list = getLensDocs(route.lens);
  const i = list.findIndex((r) => r.entryId === route.entryId);
  return {
    prev: i > 0 ? list[i - 1] : null,
    next: i >= 0 && i < list.length - 1 ? list[i + 1] : null,
  };
}

export type DocsNavNode =
  | { type: 'link'; label: string; path: string; entryId: string }
  | { type: 'group'; label: string; children: { label: string; path: string; entryId: string }[] };

/** Ordered navigation tree for a lens: top-level links plus one "Setup guides" group. */
export function getDocsNav(lens: DocsLensSlug): DocsNavNode[] {
  const list = getLensDocs(lens);
  const nodes: DocsNavNode[] = [];
  let setupGroup: Extract<DocsNavNode, { type: 'group' }> | null = null;
  for (const r of list) {
    if (r.navGroup) {
      if (!setupGroup) {
        setupGroup = { type: 'group', label: r.navGroup, children: [] };
        nodes.push(setupGroup);
      }
      setupGroup.children.push({ label: r.navLabel, path: r.path, entryId: r.entryId });
    } else {
      nodes.push({ type: 'link', label: r.navLabel, path: r.path, entryId: r.entryId });
    }
  }
  return nodes;
}
