/**
 * Time Slider scales — defines two scale groups:
 *   1. HISTORY_SCALE — one tick per historical map overlay (OVERLAYS)
 *   2. BIBLE_SCALE — biblical narrative timeline (CP3, mostly without overlay)
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md D7
 */

import { OVERLAYS, getRelevantOverlayIds } from './overlays';
import type { EraMode } from '../core/models/types';

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
  /**
   * Literal label (019 decade ticks, e.g. "1970"); when set the slider shows it
   * instead of t(labelKey). A plain year, not "1970s": the tick means "in 1970",
   * so a 1975 building correctly appears only from the 1980 tick on.
   */
  label?: string;
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

/** From this year on, cumulative mode shows the modern basemap instead of an old map (019 D7). */
export const MODERN_BASEMAP_FROM = 2000;

/**
 * Basemap for a given year in cumulative mode (019 D7): the latest geographically
 * relevant overlay not later than `year` — never show a map from the future.
 * Returns undefined (modern basemap) for years >= MODERN_BASEMAP_FROM or when no
 * relevant overlay is old enough.
 */
export function overlayForYear(year: number, relevantIds: ReadonlySet<string>): string | undefined {
  if (year >= MODERN_BASEMAP_FROM) return undefined;
  // HISTORY_SCALE is newest → oldest, so the first match is the latest map <= year.
  const tick = HISTORY_SCALE.find(
    (t) => t.overlayId !== undefined && relevantIds.has(t.overlayId) && t.year <= year,
  );
  return tick?.overlayId;
}

/** Most content ticks a cumulative slider shows (plus modern) — fits a 390px phone. */
export const MAX_CONTENT_TICKS = 15;
const TICK_STEPS = [10, 20, 25, 50, 100];

/**
 * Tick spacing for a cumulative story spanning [startYear, nowYear] (019 D7):
 * the smallest round step keeping the slider within MAX_CONTENT_TICKS.
 * Taipei 大安 from 1904 → 10 years; a Tainan story from 1624 → 50 years.
 */
export function tickStepFor(startYear: number, nowYear: number): number {
  for (const step of TICK_STEPS) {
    const count = Math.ceil((nowYear - Math.floor(startYear / step) * step) / step);
    if (count <= MAX_CONTENT_TICKS) return step;
  }
  return TICK_STEPS[TICK_STEPS.length - 1];
}

/**
 * Time scale for a given project, newest → oldest (019 D7).
 *   - fade (016 default): one tick per geographically relevant overlay.
 *   - cumulative: content-first — evenly spaced ticks (tickStepFor: 10 years
 *     for a century, wider for older stories) from the earliest spot era start
 *     up to now, then modern. Each tick carries the
 *     basemap from overlayForYear. Maps follow content, not the other way round.
 *   - 024 lead tick: when the earliest year alone would coarsen the step (大安
 *     瑠公圳 1762 turns decades into 20 years), it gets its own tick and the
 *     even ticks start from the next distinct year. At most one lead tick.
 * TimeSlider and PlayerMap must both use this so they agree on the ticks.
 */
export function scaleForProject(
  spotsLatLngs: ReadonlyArray<readonly [number, number]>,
  eraMode: EraMode = 'fade',
  eraStarts: readonly number[] = [],
): Scale[] {
  const relevantIds = getRelevantOverlayIds(spotsLatLngs);
  const years = [...new Set(eraStarts)].sort((a, b) => a - b);
  if (eraMode !== 'cumulative' || years.length === 0) {
    return HISTORY_SCALE.filter((tick) => !tick.overlayId || relevantIds.has(tick.overlayId));
  }
  const lead = years.length > 1
    && tickStepFor(years[0], MODERN_TICK.year) > tickStepFor(years[1], MODERN_TICK.year)
    ? years[0]
    : undefined;
  const gridStart = lead === undefined ? years[0] : years[1];
  const step = tickStepFor(gridStart, MODERN_TICK.year);
  const first = Math.floor(gridStart / step) * step;
  // 024: the first tick shows the latest map within its span (1900 tick →
  // 1904 堡圖 even when a 1903 spot exists) — the only place a map may be a few
  // years "ahead". A lead tick reuses it: no street-scale map predates 1897, and
  // overlayForYear(1762) would pick the Ming empire map.
  const firstOverlay = overlayForYear(first + step - 1, relevantIds);
  const ticks: Scale[] = [];
  const tickAt = (year: number, overlayId: string | undefined): Scale => ({
    year,
    labelKey: 'era.modern', // unused for display (label wins); keeps Scale.labelKey a valid key
    label: String(year),
    overlayId,
  });
  if (lead !== undefined) ticks.push(tickAt(lead, firstOverlay));
  for (let year = first; year < MODERN_TICK.year; year += step) {
    ticks.push(tickAt(year, year === first ? firstOverlay : overlayForYear(year, relevantIds)));
  }
  return [MODERN_TICK, ...ticks.reverse()];
}

/**
 * Basemap when playback jumps the clock to `year` (024 D2b): the overlay of the
 * latest tick <= year, so a jump shows the same map as tapping that tick.
 * `scale` is newest → oldest, as returned by scaleForProject.
 */
export function overlayForJump(scale: readonly Scale[], year: number): string | undefined {
  return scale.find((tick) => tick.year <= year)?.overlayId;
}
