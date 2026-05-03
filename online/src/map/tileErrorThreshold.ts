/**
 * Pure helper extracted from useOverlayLayer hook so the threshold semantics
 * are testable without importing Leaflet (vitest runs in node env).
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/tasks.md T2
 */

/**
 * Threshold for declaring an overlay-wide failure: this many DISTINCT tile URLs
 * must error out before the overlay is considered down. Distinct (not raw)
 * count prevents one unlucky tile retried 3× from triggering false alarm.
 */
export const TILE_ERROR_THRESHOLD = 3;

/**
 * Track a tile error URL and report whether the threshold has been reached.
 * Mutates `trackedUrls` (adds the new url if defined). Empty/undefined urls
 * are ignored — they can't be deduped, and a single bad url can't define
 * overlay-wide failure on its own anyway.
 *
 * Caller is responsible for "fire once" debouncing — this helper returns true
 * on every call once the threshold is reached.
 */
export function isOverlayThresholdReached(
  trackedUrls: Set<string>,
  newUrl: string | undefined,
  threshold: number = TILE_ERROR_THRESHOLD,
): boolean {
  if (!newUrl) return false;
  trackedUrls.add(newUrl);
  return trackedUrls.size >= threshold;
}
