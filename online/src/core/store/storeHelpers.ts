import type { Spot } from '../models/types';

/**
 * Compute the center + zoom to fit a bounding box of latlng points.
 * Returns null when the input is empty (caller keeps current viewport).
 */
export function computeBoundingBoxCenter(
  pts: [number, number][],
): { center: [number, number]; zoom: number } | null {
  // Filter out non-finite pairs so a single malformed point (e.g. NaN from
  // a broken import) cannot poison the bounding box with NaN center.
  const valid = pts.filter(
    (p) => Array.isArray(p) && p.length >= 2 && isFinite(p[0]) && isFinite(p[1]),
  );
  if (valid.length === 0) return null;
  const lats = valid.map((p) => p[0]);
  const lngs = valid.map((p) => p[1]);
  const center: [number, number] = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ];
  return { center, zoom: 12 };
}

/**
 * Renumber spots sequentially starting from 1. Used after import/reorder/remove.
 */
export function renumberSpots(spots: Spot[]): Spot[] {
  return spots.map((s, i) => ({ ...s, num: i + 1 }));
}
