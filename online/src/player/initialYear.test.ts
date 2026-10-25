import { describe, it, expect } from 'vitest';
import type { Project } from '../core/models/types';
import { MODERN_TICK } from '../map/eraScales';
import { initialYear } from './initialYear';

const base: Project = { version: 5, name: 't', center: [25, 121], zoom: 12, spots: [], routes: [] };
const eraSpot = (start: number, end: number) => ({
  id: `s${start}`, title: 't', latlng: [25, 121] as [number, number], num: 1, desc: '', photo: null,
  iconId: 'pin', cardOffset: { x: 0, y: 0 }, era: { start, end },
});

describe('initialYear', () => {
  it('site → earliest era start', () => {
    expect(initialYear({ ...base, layout: 'site', spots: [eraSpot(1932, 1991), eraSpot(1904, 1949)] })).toBe(1904);
  });

  it('site without eras → modern', () => {
    expect(initialYear({ ...base, layout: 'site' })).toBe(MODERN_TICK.year);
  });

  it('route player → overlay tick year', () => {
    expect(initialYear({ ...base, overlay: { id: 'tw_1904', opacity: 0.5 } })).toBe(1904);
  });

  it('route player without overlay → modern', () => {
    expect(initialYear(base)).toBe(MODERN_TICK.year);
  });
});
