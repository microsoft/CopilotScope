import { getCollection } from 'astro:content';

export type LensStatus = 'installed' | 'available' | 'coming-soon';

// Status-first ordering rank shared by the home grid, the rail sub-list,
// and the Lenses Overview page.
export const STATUS_RANK: Record<string, number> = {
  installed: 0,
  available: 1,
  'coming-soon': 2,
};

export const STATUS_LABEL: Record<string, string> = {
  installed: 'Installed',
  available: 'Available',
  'coming-soon': 'Coming Soon',
};

// Canonical tie-break order for lenses that share a status.
export const LENS_CANON = [
  'valuelens',
  'adoptionlens',
  'readinesslens',
  'maturitylens',
  'leaderlens',
  'studiolens',
  'behaviorlens',
  'governancelens',
];

// Per-lens silhouette glyph (the JSON `icon` field is null).
export const LENS_ICON: Record<string, string> = {
  valuelens: 'trending-up',
  adoptionlens: 'people',
  readinesslens: 'clipboard-check',
  maturitylens: 'bar-chart',
  leaderlens: 'trophy',
  studiolens: 'bot',
  behaviorlens: 'brain',
  governancelens: 'shield',
};

// The single status-first sort used everywhere: stable status-rank order
// with LENS_CANON as the tie-break for lenses sharing a status.
export function sortLenses<T extends { id: string; status: string }>(list: T[]): T[] {
  return [...list].sort(
    (a, b) =>
      STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
      LENS_CANON.indexOf(a.id) - LENS_CANON.indexOf(b.id),
  );
}

// Load all lenses from the content collection, sorted by the shared order.
export async function getOrderedLenses() {
  const entries = await getCollection('lenses');
  return sortLenses(entries.map((e) => e.data));
}