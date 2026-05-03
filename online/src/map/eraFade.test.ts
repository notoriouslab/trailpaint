/**
 * Tests for spot era fade math + sanitizeEra (T3).
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md D6
 */

import { describe, it, expect } from 'vitest';
import { eraOpacity, sanitizeEra } from './eraFade';

describe('eraOpacity', () => {
  it('era undefined → opacity 1 (era-agnostic spots always visible)', () => {
    expect(eraOpacity(undefined, 2026)).toBe(1);
    expect(eraOpacity(undefined, -500)).toBe(1);
  });

  it('currentYear inside [start, end] → opacity 1', () => {
    const era = { start: 30, end: 95 };
    expect(eraOpacity(era, 30)).toBe(1);
    expect(eraOpacity(era, 50)).toBe(1);
    expect(eraOpacity(era, 95)).toBe(1);
  });

  it('100 years outside era → ~0.75 with default decay 200', () => {
    // 1 - (100/200)^2 = 1 - 0.25 = 0.75
    const era = { start: 100, end: 200 };
    expect(eraOpacity(era, 0)).toBeCloseTo(0.75, 5);
    expect(eraOpacity(era, 300)).toBeCloseTo(0.75, 5);
  });

  it('200 years outside era → 0 (clamped to MIN_OPACITY 0.15)', () => {
    // 1 - (200/200)^2 = 0 → clamped to 0.15
    const era = { start: 100, end: 200 };
    expect(eraOpacity(era, -100)).toBe(0.15);
    expect(eraOpacity(era, 400)).toBe(0.15);
  });

  it('500 years outside era → still floored at MIN_OPACITY (never invisible)', () => {
    const era = { start: 100, end: 200 };
    expect(eraOpacity(era, -400)).toBe(0.15);
    expect(eraOpacity(era, 700)).toBe(0.15);
  });

  it('handles BC negative years correctly', () => {
    const exodus = { start: -1446, end: -1446 };
    expect(eraOpacity(exodus, -1446)).toBe(1);
    // 100 years off → 1 - (100/200)^2 = 0.75
    expect(eraOpacity(exodus, -1346)).toBeCloseTo(0.75, 5);
  });

  it('respects custom decay parameter', () => {
    const era = { start: 100, end: 100 };
    // decay 100 → 50 years off = 1 - (50/100)^2 = 0.75
    expect(eraOpacity(era, 50, 100)).toBeCloseTo(0.75, 5);
    // decay 400 → 100 years off = 1 - (100/400)^2 = 0.9375
    expect(eraOpacity(era, 200, 400)).toBeCloseTo(0.9375, 5);
  });
});

describe('sanitizeEra', () => {
  it('valid range passes through', () => {
    expect(sanitizeEra({ start: 30, end: 95 })).toEqual({ start: 30, end: 95 });
    expect(sanitizeEra({ start: -1000, end: -500 })).toEqual({ start: -1000, end: -500 });
  });

  it('start === end is valid (point-in-time spots)', () => {
    expect(sanitizeEra({ start: 30, end: 30 })).toEqual({ start: 30, end: 30 });
  });

  it('rejects null / undefined / non-object', () => {
    expect(sanitizeEra(null)).toBeUndefined();
    expect(sanitizeEra(undefined)).toBeUndefined();
    expect(sanitizeEra('not an object')).toBeUndefined();
    expect(sanitizeEra(42)).toBeUndefined();
  });

  it('rejects missing start or end', () => {
    expect(sanitizeEra({ start: 30 })).toBeUndefined();
    expect(sanitizeEra({ end: 95 })).toBeUndefined();
    expect(sanitizeEra({})).toBeUndefined();
  });

  it('rejects non-number start / end', () => {
    expect(sanitizeEra({ start: '30', end: 95 })).toBeUndefined();
    expect(sanitizeEra({ start: 30, end: '95' })).toBeUndefined();
  });

  it('rejects NaN / Infinity', () => {
    expect(sanitizeEra({ start: NaN, end: 95 })).toBeUndefined();
    expect(sanitizeEra({ start: 30, end: Infinity })).toBeUndefined();
    expect(sanitizeEra({ start: -Infinity, end: 95 })).toBeUndefined();
  });

  it('rejects start > end (inverted range)', () => {
    expect(sanitizeEra({ start: 100, end: 50 })).toBeUndefined();
  });

  it('rejects out-of-bounds [-3000, 3000]', () => {
    expect(sanitizeEra({ start: -3001, end: 0 })).toBeUndefined();
    expect(sanitizeEra({ start: 0, end: 3001 })).toBeUndefined();
  });
});
