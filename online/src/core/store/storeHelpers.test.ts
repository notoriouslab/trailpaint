import { describe, it, expect } from 'vitest';
import { computeBoundingBoxCenter, renumberSpots } from './storeHelpers';
import type { Spot } from '../models/types';
import { DEFAULT_CARD_OFFSET } from '../models/types';

function mkSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    id: crypto.randomUUID(),
    latlng: [0, 0],
    num: 0,
    title: 'x',
    desc: '',
    photo: null,
    iconId: 'pin',
    cardOffset: { ...DEFAULT_CARD_OFFSET },
    ...overrides,
  };
}

describe('computeBoundingBoxCenter', () => {
  it('returns null for empty input', () => {
    expect(computeBoundingBoxCenter([])).toBeNull();
  });

  it('returns the single point unchanged for 1-point input', () => {
    expect(computeBoundingBoxCenter([[23.5, 121]])).toEqual({ center: [23.5, 121], zoom: 12 });
  });

  it('returns midpoint of min/max lat/lng (no outlier weighting)', () => {
    const pts: [number, number][] = [[10, 100], [30, 140], [20, 120]];
    const result = computeBoundingBoxCenter(pts);
    expect(result).toEqual({ center: [20, 120], zoom: 12 });
  });

  it('handles crossing equator/meridian', () => {
    const result = computeBoundingBoxCenter([[-10, -50], [10, 50]]);
    expect(result).toEqual({ center: [0, 0], zoom: 12 });
  });

  it('filters NaN/Infinity points so they cannot poison the center (A5)', () => {
    const pts: [number, number][] = [[NaN, 100], [23.5, 121], [Infinity, -Infinity]];
    const result = computeBoundingBoxCenter(pts);
    expect(result).toEqual({ center: [23.5, 121], zoom: 12 });
  });

  it('returns null when every point is non-finite', () => {
    expect(computeBoundingBoxCenter([[NaN, NaN], [Infinity, 0]])).toBeNull();
  });
});

describe('renumberSpots', () => {
  it('returns empty array for empty input', () => {
    expect(renumberSpots([])).toEqual([]);
  });

  it('renumbers from 1 sequentially, preserving order', () => {
    const spots = [
      mkSpot({ num: 5, title: 'a' }),
      mkSpot({ num: 99, title: 'b' }),
      mkSpot({ num: 0, title: 'c' }),
    ];
    const result = renumberSpots(spots);
    expect(result.map((s) => s.num)).toEqual([1, 2, 3]);
    expect(result.map((s) => s.title)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate input array', () => {
    const spots = [mkSpot({ num: 7 })];
    renumberSpots(spots);
    expect(spots[0].num).toBe(7);
  });
});
