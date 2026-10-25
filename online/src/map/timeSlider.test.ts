/**
 * TimeSlider snap-to-nearest tests (T1 verification).
 *
 * Covers eraScales.snapToNearestTick + scale group definitions.
 * Hook behaviour (cross-fade cancellation, opacity sync) is verified via
 * manual testing on dev server (per tasks.md T1 手測).
 */

import { describe, it, expect } from 'vitest';
import {
  HISTORY_SCALE,
  BIBLE_SCALE,
  snapToNearestTick,
  getScale,
  MODERN_TICK,
  scaleForProject,
  overlayForYear,
  tickStepFor,
  MAX_CONTENT_TICKS,
} from './eraScales';
import { getRelevantOverlayIds } from './overlays';

describe('snapToNearestTick — boundary cases', () => {
  it('snaps year 2026 to MODERN_TICK on history scale', () => {
    const result = snapToNearestTick(2026, HISTORY_SCALE);
    expect(result.year).toBe(MODERN_TICK.year);
    expect(result.overlayId).toBeUndefined();
  });

  it('snaps BC year to corresponding china overlay', () => {
    // han_bc7 has year=-7, nearest BC tick on history scale
    const result = snapToNearestTick(-50, HISTORY_SCALE);
    expect(result.overlayId).toBe('han_bc7');
    expect(result.year).toBe(-7);
  });

  it('snaps Tang dynasty era to tang_741', () => {
    const result = snapToNearestTick(800, HISTORY_SCALE);
    expect(result.overlayId).toBe('tang_741');
    expect(result.year).toBe(741);
  });

  it('snaps biblical era ticks correctly (jesus AD30 → rome_200)', () => {
    const result = snapToNearestTick(30, BIBLE_SCALE);
    expect(result.labelKey).toBe('era.jesus');
    expect(result.overlayId).toBe('rome_200');
  });

  it('snaps biblical pre-Roman era to rome_200 (B-plan: DARE bounds envelop OT locales)', () => {
    const result = snapToNearestTick(-1500, BIBLE_SCALE);
    expect(result.labelKey).toBe('era.exodus');
    expect(result.overlayId).toBe('rome_200');
  });
});

describe('Scale definitions', () => {
  it('HISTORY_SCALE includes MODERN_TICK + 15 overlays = 16 ticks (019 +4 island-wide)', () => {
    expect(HISTORY_SCALE).toHaveLength(16);
  });

  it('HISTORY_SCALE is sorted newest → oldest', () => {
    for (let i = 1; i < HISTORY_SCALE.length; i++) {
      expect(HISTORY_SCALE[i - 1].year).toBeGreaterThan(HISTORY_SCALE[i].year);
    }
  });

  it('BIBLE_SCALE includes 7 ticks (modern + 6 biblical)', () => {
    expect(BIBLE_SCALE).toHaveLength(7);
  });

  it('getScale returns correct group', () => {
    expect(getScale('history')).toBe(HISTORY_SCALE);
    expect(getScale('bible')).toBe(BIBLE_SCALE);
  });

  it('every history tick except MODERN has a valid overlayId', () => {
    for (const tick of HISTORY_SCALE) {
      if (tick.labelKey === 'era.modern') {
        expect(tick.overlayId).toBeUndefined();
      } else {
        expect(tick.overlayId).toBeDefined();
      }
    }
  });
});

describe('snapToNearestTick — edge cases', () => {
  it('throws on empty scale array', () => {
    expect(() => snapToNearestTick(0, [])).toThrow();
  });

  it('clamps to oldest tick when year far in past', () => {
    const result = snapToNearestTick(-9999, HISTORY_SCALE);
    expect(result.year).toBe(-7); // han_bc7 is the oldest history tick
  });

  it('clamps to newest tick when year far in future', () => {
    const result = snapToNearestTick(99999, HISTORY_SCALE);
    expect(result.year).toBe(MODERN_TICK.year);
  });
});

describe('overlayForYear (019 D7)', () => {
  const taipei = getRelevantOverlayIds([[25.03, 121.54]]);
  const tainan = getRelevantOverlayIds([[22.99, 120.2]]);

  it('exact map year picks that map', () => {
    expect(overlayForYear(1904, taipei)).toBe('tw_1904');
  });

  it('picks the latest map not later than the year (never the future)', () => {
    expect(overlayForYear(1975, taipei)).toBe('corona_1966');
    expect(overlayForYear(1899, taipei)).toBe('jm200k_1897');
  });

  it('years from MODERN_BASEMAP_FROM on use the modern basemap', () => {
    expect(overlayForYear(2005, taipei)).toBeUndefined();
  });

  it('skips a map with no scanned content at the story location (coverage table)', () => {
    // Corona 1966 has no imagery over Kaohsiung (probed): 1970 falls back to 1955
    const kaohsiung = getRelevantOverlayIds([[22.63, 120.3]]);
    expect(kaohsiung.has('corona_1966')).toBe(false);
    expect(overlayForYear(1970, kaohsiung)).toBe('tw_1955');
  });

  it('island-wide 019 maps apply outside Taipei too', () => {
    expect(overlayForYear(1950, tainan)).toBe('tw_1945');
  });
});

describe('scaleForProject (019 D7)', () => {
  const daan: [number, number][] = [[25.03, 121.54]];

  it('cumulative: one tick per decade from the earliest era, then modern', () => {
    const scale = scaleForProject(daan, 'cumulative', 1904);
    const decades = scale.slice(1).map((t) => t.year).reverse();
    expect(scale[0]).toBe(MODERN_TICK);
    expect(decades[0]).toBe(1900);
    expect(decades[decades.length - 1]).toBe(Math.floor((MODERN_TICK.year - 1) / 10) * 10);
    expect(decades.every((y, i) => i === 0 || y - decades[i - 1] === 10)).toBe(true);
    expect(scale.some((t) => t.overlayId === 'han_bc7' || t.overlayId === 'qing_1820')).toBe(false);
    expect(scale.find((t) => t.year === 1970)?.overlayId).toBe('corona_1966');
    expect(scale.find((t) => t.year === 1970)?.label).toBe('1970');
    // First tick borrows the map of the earliest event year (1904 堡圖, not 1897)
    expect(scale.find((t) => t.year === 1900)?.overlayId).toBe('tw_1904');
  });

  it('fade mode keeps the overlay ticks (016 behaviour)', () => {
    const scale = scaleForProject(daan, 'fade', 1904);
    expect(scale.some((t) => t.overlayId === 'han_bc7')).toBe(true);
    expect(scale.some((t) => t.year === 1970)).toBe(false);
  });

  it('cumulative without any spot era falls back to fade ticks', () => {
    expect(scaleForProject(daan, 'cumulative', undefined)).toEqual(scaleForProject(daan, 'fade'));
  });
});

describe('tickStepFor (019 D7, nationwide spans)', () => {
  it('a century-ish story keeps decade ticks', () => {
    expect(tickStepFor(1904, 2026)).toBe(10);
  });

  it('a Qing-era story widens the step to stay within MAX_CONTENT_TICKS', () => {
    const step = tickStepFor(1624, 2026);
    expect(step).toBe(50);
    expect(Math.ceil((2026 - 1600) / step)).toBeLessThanOrEqual(MAX_CONTENT_TICKS);
  });

  it('cumulative scale for a 1624 story has <= MAX_CONTENT_TICKS content ticks', () => {
    const scale = scaleForProject([[22.99, 120.2]], 'cumulative', 1624);
    expect(scale.length - 1).toBeLessThanOrEqual(MAX_CONTENT_TICKS);
    expect(scale[scale.length - 1].year).toBe(1600);
  });
});
