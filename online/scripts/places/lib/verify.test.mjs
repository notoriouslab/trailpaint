import { describe, it, expect } from 'vitest';
import { decide, newId } from './verify.mjs';

const off = (over) => ({ source: 'boch', sourceId: '123', tier: 'official', name: 'A', latlng: [25.03, 121.53], start: 1931, yearKind: 'opened', ...over });
const wd = (over) => ({ source: 'wikidata', sourceId: 'Q1', tier: 'encyclopedic', name: 'A', latlng: [25.03, 121.53], start: 1931, yearKind: 'founded', ...over });
const zh = (over) => ({ ...wd(), source: 'zhwiki', sourceId: 'A', ...over });

describe('decide (020 D5)', () => {
  it('authority source (公園處, opened) alone → auto via authority', () => {
    const park = off({ source: 'taipei-parks' });
    expect(decide({ members: [park] })).toEqual({ method: 'auto', basis: 'authority', year: 1931 });
    expect(decide({ members: [park, wd()] })).toEqual({ method: 'auto', basis: 'authority', year: 1931 });
  });

  it('文資局 is not an authority (T6 gate): alone → single-source', () => {
    expect(decide({ members: [off()] })).toEqual({ reason: 'single-source' });
  });

  it('authority year contradicted by another source → year-mismatch', () => {
    expect(decide({ members: [off({ source: 'taipei-parks' }), wd({ start: 1935 })] })).toEqual({ reason: 'year-mismatch' });
  });

  it('non-authority official (opened) + encyclopedic, same year → auto via cross-source', () => {
    const city = (o) => off({ source: 'city-schools', ...o });
    expect(decide({ members: [city(), wd()] })).toEqual({ method: 'auto', basis: 'cross-source', year: 1931 });
    expect(decide({ members: [city(), city({ source: 'city-other', yearKind: 'founded' })] }).method).toBe('auto');
  });

  it('Wikidata + zh.wikipedia only → encyclopedic-only', () => {
    expect(decide({ members: [wd({ yearKind: 'opened' }), zh({ yearKind: 'opened' })] })).toEqual({ reason: 'encyclopedic-only' });
  });

  it('both years are founding years → founded-only', () => {
    expect(decide({ members: [off({ yearKind: 'founded' }), wd()] })).toEqual({ reason: 'founded-only' });
    expect(decide({ members: [off({ source: 'city-schools', yearKind: 'founded' }), wd()] })).toEqual({ reason: 'founded-only' });
  });

  it('years differ by 1 → year-mismatch', () => {
    expect(decide({ members: [off({ source: 'city-schools' }), wd({ start: 1932 })] })).toEqual({ reason: 'year-mismatch' });
  });

  it('only one source has a year → single-source', () => {
    expect(decide({ members: [off({ source: 'city-schools' }), wd({ start: undefined })] })).toEqual({ reason: 'single-source' });
    expect(decide({ members: [off({ yearKind: 'founded' }), off({ sourceId: '124', yearKind: 'founded' })] })).toEqual({ reason: 'single-source' });
  });

  it('members 1100 m apart → far', () => {
    expect(decide({ members: [off(), wd({ latlng: [25.0399, 121.53] })] })).toEqual({ reason: 'far' });
  });
});

describe('newId (020 D6)', () => {
  it('uses the first official member', () => {
    expect(newId({ members: [wd(), off({ sourceId: '12345' })] })).toBe('boch-12345');
  });

  it('falls back to the first member and sanitises', () => {
    expect(newId({ members: [wd({ sourceId: 'Q7_X' })] })).toBe('wd-q7x');
  });
});
