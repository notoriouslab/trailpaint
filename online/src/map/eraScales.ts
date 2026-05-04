/**
 * Time Slider scales — defines two scale groups:
 *   1. HISTORY_SCALE — corresponds to existing 9 historical map overlays
 *   2. BIBLE_SCALE — biblical narrative timeline (CP3, mostly without overlay)
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md D7
 */

import { OVERLAYS } from './overlays';

export type ScaleGroupId = 'history' | 'bible';

export interface Scale {
  /** Year that this tick represents (negative = BC). */
  year: number;
  /** i18n key for the tick label (e.g. 'overlay.tang741', 'era.exodus'). */
  labelKey: string;
  /**
   * Overlay id mapped to this tick, if any.
   * - undefined = no overlay (slider drives spot era fade only, no basemap switch)
   * - string = overlay shown when slider snaps here
   */
  overlayId?: string;
}

/** Tick representing "modern day / no historical overlay". Always at top of slider. */
export const MODERN_TICK: Scale = {
  year: new Date().getFullYear(),
  labelKey: 'era.modern',
  overlayId: undefined,
};

/**
 * History scale derived from OVERLAYS. Sorted newest → oldest so slider top = modern.
 * `year` array form (e.g. rome_200 = [-100, 400]) collapsed to centroid for slider snap.
 */
export const HISTORY_SCALE: Scale[] = [
  MODERN_TICK,
  ...OVERLAYS.map<Scale>((ov) => ({
    year: Array.isArray(ov.year) ? Math.round((ov.year[0] + ov.year[1]) / 2) : ov.year,
    labelKey: ov.labelKey,
    overlayId: ov.id,
  })).sort((a, b) => b.year - a.year),
];

/**
 * Biblical narrative scale (CP3). All overlay-bearing ticks point to rome_200
 * because DARE's geographic coverage [[20°S,-10°W],[55°N,55°E]] happens to
 * envelop every Old Testament locale (Egyptian Delta, Sinai, Levant, Babylon).
 * The era stamp on the postcard advertises the actual story year (e.g. "BC 1446
 * 出埃及"), so users see "古典風底圖 + 故事真實年代" — a景點地圖, not a forensic
 * archaeological reconstruction. Spots whose era is anchored to OT periods carry
 * scripture_refs + scholar-cited desc lines for users wanting深入考據.
 */
export const BIBLE_SCALE: Scale[] = [
  { year: MODERN_TICK.year, labelKey: 'era.modern' },
  { year: 95, labelKey: 'era.revelation', overlayId: 'rome_200' },
  { year: 50, labelKey: 'era.paul', overlayId: 'rome_200' },
  { year: 30, labelKey: 'era.jesus', overlayId: 'rome_200' },
  { year: -586, labelKey: 'era.babylon', overlayId: 'rome_200' },
  { year: -1000, labelKey: 'era.david', overlayId: 'rome_200' },
  { year: -1446, labelKey: 'era.exodus', overlayId: 'rome_200' },
];

/** Look up a scale group by id. */
export function getScale(groupId: ScaleGroupId): Scale[] {
  return groupId === 'history' ? HISTORY_SCALE : BIBLE_SCALE;
}

/**
 * Snap a year value to the nearest tick in the given scale.
 * Returns the matched Scale (year + labelKey + optional overlayId).
 *
 * Tie-breaking: when equidistant between two ticks, the older tick wins
 * (favours showing historical overlay over modern when ambiguous).
 */
export function snapToNearestTick(year: number, scale: Scale[]): Scale {
  if (scale.length === 0) {
    throw new Error('snapToNearestTick: scale array is empty');
  }
  let nearest = scale[0];
  let minDist = Math.abs(year - nearest.year);
  for (let i = 1; i < scale.length; i++) {
    const tick = scale[i];
    const dist = Math.abs(year - tick.year);
    // Strict less — equidistant case keeps the earlier-iterated tick.
    // HISTORY_SCALE is sorted newest→oldest so older wins on tie.
    if (dist < minDist) {
      nearest = tick;
      minDist = dist;
    }
  }
  return nearest;
}
