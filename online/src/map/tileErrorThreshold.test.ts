/**
 * Tests for tile-error threshold logic (T2).
 *
 * The hook itself is verified manually on dev server (per tasks.md T2 手測).
 * This file covers the pure helper that decides when to declare overlay-wide failure.
 */

import { describe, it, expect } from 'vitest';
import { isOverlayThresholdReached, TILE_ERROR_THRESHOLD } from './tileErrorThreshold';

describe('isOverlayThresholdReached', () => {
  it('default threshold is 3 (matches design.md tasks T2 spec)', () => {
    expect(TILE_ERROR_THRESHOLD).toBe(3);
  });

  it('returns false until threshold of distinct urls is hit', () => {
    const set = new Set<string>();
    expect(isOverlayThresholdReached(set, 'a')).toBe(false);
    expect(isOverlayThresholdReached(set, 'b')).toBe(false);
    expect(isOverlayThresholdReached(set, 'c')).toBe(true);
  });

  it('does NOT trip when the same url errors out repeatedly (deduped)', () => {
    const set = new Set<string>();
    for (let i = 0; i < 10; i++) {
      expect(isOverlayThresholdReached(set, 'same-url')).toBe(false);
    }
    expect(set.size).toBe(1);
  });

  it('mixed distinct + repeats: only 2 distinct → still false', () => {
    const set = new Set<string>();
    isOverlayThresholdReached(set, 'a');
    isOverlayThresholdReached(set, 'a');
    expect(isOverlayThresholdReached(set, 'b')).toBe(false);
    expect(isOverlayThresholdReached(set, 'a')).toBe(false);
    expect(set.size).toBe(2);
  });

  it('ignores empty / undefined urls (cannot define widespread failure)', () => {
    const set = new Set<string>();
    expect(isOverlayThresholdReached(set, undefined)).toBe(false);
    expect(isOverlayThresholdReached(set, '')).toBe(false);
    expect(set.size).toBe(0);
  });

  it('respects explicit threshold override', () => {
    const set = new Set<string>();
    expect(isOverlayThresholdReached(set, 'a', 1)).toBe(true);
  });

  it('returns true on every subsequent call once threshold is reached (caller debounces)', () => {
    const set = new Set<string>();
    isOverlayThresholdReached(set, 'a');
    isOverlayThresholdReached(set, 'b');
    isOverlayThresholdReached(set, 'c');
    expect(isOverlayThresholdReached(set, 'd')).toBe(true);
    expect(isOverlayThresholdReached(set, 'e')).toBe(true);
  });
});
