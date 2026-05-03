/**
 * Spot era fade — compute marker opacity from a spot's era window vs the
 * currently active year on the TimeSlider.
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md D6
 *
 * Sweet spot decay = 200 years (chosen in design):
 *   - 100 years: too sharp (Tang dynasty 618-907 spans 300 years; visible window
 *     would shrink to a sliver)
 *   - 500 years: too lazy (Roman + Han + Tang + Song would all fade together)
 *   - 200 years: matches typical dynasty / mission-era horizons
 */

import type { SpotEra } from '../core/models/types';

/** Minimum opacity for an out-of-era spot. Never fully invisible — keeps the route shape readable. */
const MIN_OPACITY = 0.15;

/**
 * Returns marker opacity in [MIN_OPACITY, 1].
 *   - era undefined → 1.0 (era-agnostic spots always visible)
 *   - currentYear inside [start, end] → 1.0
 *   - outside → quadratic decay: max(MIN, 1 - (dist/decay)²)
 */
export function eraOpacity(
  era: SpotEra | undefined,
  currentYear: number,
  decay = 200,
): number {
  if (!era) return 1;
  const { start, end } = era;
  if (currentYear >= start && currentYear <= end) return 1;
  const dist = currentYear < start ? start - currentYear : currentYear - end;
  return Math.max(MIN_OPACITY, 1 - (dist / decay) ** 2);
}

/**
 * Validate raw era input from imported JSON. Reject NaN / non-finite / inverted
 * ranges / out-of-bounds. Returns sanitized SpotEra or undefined if rejected.
 */
export function sanitizeEra(raw: unknown): SpotEra | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const start = r.start;
  const end = r.end;
  if (typeof start !== 'number' || typeof end !== 'number') return undefined;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return undefined;
  if (start < -3000 || end > 3000) return undefined;
  if (start > end) return undefined;
  return { start, end };
}
