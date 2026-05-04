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
} from './eraScales';

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
  it('HISTORY_SCALE includes MODERN_TICK + 11 overlays = 12 ticks (Tier 3 +three_kingdoms_262 +qing_1820)', () => {
    expect(HISTORY_SCALE).toHaveLength(12);
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
