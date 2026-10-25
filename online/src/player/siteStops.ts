/**
 * Site layout (021) — pure helpers for "one place across eras".
 *
 * Design ref: openspec/changes/021-site-mode/design.md D4, D5
 */

import type { Spot } from '../core/models/types';
import { eraVisible } from '../map/eraFade';

/**
 * Years where something changes on the site: every era start, plus the year
 * after every era end (the phase is gone from then on). Sorted, deduplicated.
 * End years whose following year is still in the future are skipped
 * (end 3000 = still exists).
 */
export function siteStops(spots: Spot[], nowYear: number): number[] {
  const years = new Set<number>();
  for (const { era } of spots) {
    if (!era) continue;
    years.add(era.start);
    if (era.end + 1 <= nowYear) years.add(era.end + 1);
  }
  return [...years].sort((a, b) => a - b);
}

/**
 * Phases that exist in `year`, ordered by era start. Spots without an era are
 * always shown and go last in their original order. `index` is the position in
 * the original array (what activeSpotIndex refers to).
 */
export function siteVisibleSpots(spots: Spot[], year: number): { spot: Spot; index: number }[] {
  return spots
    .map((spot, index) => ({ spot, index }))
    .filter(({ spot }) => eraVisible(spot.era, year, 'cumulative'))
    .sort((a, b) => {
      const sa = a.spot.era?.start ?? Infinity;
      const sb = b.spot.era?.start ?? Infinity;
      return sa === sb ? a.index - b.index : sa - sb;
    });
}

/** Next stop after `year`, or null when there is nothing to advance to. */
export function nextStop(stops: number[], year: number): number | null {
  if (stops.length < 2) return null;
  return stops.find((y) => y > year) ?? null;
}
