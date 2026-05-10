import { describe, it, expect } from 'vitest';
import { compactProject, expandProject } from './shareLink';
import type { Project, PhotoMeta } from '../models/types';

function mkProject(spots: Project['spots']): Project {
  return { version: 4, name: 'test', center: [0, 0], zoom: 8, spots, routes: [] };
}

const validMeta: PhotoMeta = {
  source: 'wikimedia-commons',
  license: 'CC BY-SA 3.0',
  author: 'AngMoKio',
  authorUrl: 'https://commons.wikimedia.org/wiki/User:AngMoKio',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
};

const baseSpot = {
  id: 's1',
  latlng: [23.5, 121] as [number, number],
  num: 1,
  title: 'x',
  desc: 'y',
  photo: null,
  iconId: 'pin',
  cardOffset: { x: 0, y: 0 },
};

describe('compactProject / expandProject — photoMeta round-trip (013)', () => {
  it('omits pm key when spot has no photoMeta', () => {
    const compact = compactProject(mkProject([{ ...baseSpot }]));
    const spot = (compact.s as Record<string, unknown>[])[0];
    expect(spot).not.toHaveProperty('pm');
  });

  it('compacts photoMeta into pm:{sc,lc,au,uu,su}', () => {
    const compact = compactProject(mkProject([{ ...baseSpot, photoMeta: validMeta }]));
    const spot = (compact.s as Record<string, unknown>[])[0];
    expect(spot.pm).toEqual({
      sc: 'wikimedia-commons',
      lc: 'CC BY-SA 3.0',
      au: 'AngMoKio',
      uu: 'https://commons.wikimedia.org/wiki/User:AngMoKio',
      su: 'https://commons.wikimedia.org/wiki/File:X.jpg',
    });
  });

  it('round-trips photoMeta through compact → expand', () => {
    const original = mkProject([{ ...baseSpot, photoMeta: validMeta }]);
    const compact = compactProject(original);
    const expanded = expandProject(compact);
    expect(expanded.spots[0].photoMeta).toEqual(validMeta);
  });

  it('round-trips photoMeta with null authorUrl', () => {
    const meta = { ...validMeta, authorUrl: null };
    const original = mkProject([{ ...baseSpot, photoMeta: meta }]);
    const compact = compactProject(original);
    const expanded = expandProject(compact);
    expect(expanded.spots[0].photoMeta?.authorUrl).toBeNull();
  });

  it('expanded spot has no photoMeta when compact has no pm', () => {
    const compact = {
      v: 4, n: 't', c: [0, 0], z: 8, r: [],
      s: [{ i: 's1', l: [23.5, 121], u: 1, t: 'x', k: 'pin' }],
    };
    const expanded = expandProject(compact);
    expect(expanded.spots[0].photoMeta).toBeUndefined();
  });
});

describe('compactProject / expandProject — era round-trip (016 v1.4)', () => {
  it('omits er key when spot has no era', () => {
    const compact = compactProject(mkProject([{ ...baseSpot }]));
    const spot = (compact.s as Record<string, unknown>[])[0];
    expect(spot).not.toHaveProperty('er');
  });

  it('compacts era into er:[start,end] tuple', () => {
    const compact = compactProject(mkProject([{ ...baseSpot, era: { start: 46, end: 48 } }]));
    const spot = (compact.s as Record<string, unknown>[])[0];
    expect(spot.er).toEqual([46, 48]);
  });

  it('round-trips AD era through compact → expand', () => {
    const original = mkProject([{ ...baseSpot, era: { start: 46, end: 48 } }]);
    const expanded = expandProject(compactProject(original));
    expect(expanded.spots[0].era).toEqual({ start: 46, end: 48 });
  });

  it('round-trips BC era (negative numbers) correctly', () => {
    const original = mkProject([{ ...baseSpot, era: { start: -138, end: -126 } }]);
    const expanded = expandProject(compactProject(original));
    expect(expanded.spots[0].era).toEqual({ start: -138, end: -126 });
  });

  it('expand drops era when tuple is malformed (length != 2 / non-number)', () => {
    const compact = {
      v: 5, n: 't', c: [0, 0], z: 8, r: [],
      s: [{ i: 's1', l: [23.5, 121], u: 1, t: 'x', k: 'pin', er: ['46', '48'] }],
    };
    expect(expandProject(compact).spots[0].era).toBeUndefined();
  });
});

describe('compactProject / expandProject — scripture_refs round-trip', () => {
  it('omits sr key when spot has no scripture_refs', () => {
    const compact = compactProject(mkProject([{ ...baseSpot }]));
    const spot = (compact.s as Record<string, unknown>[])[0];
    expect(spot).not.toHaveProperty('sr');
  });

  it('round-trips scripture_refs array', () => {
    const original = mkProject([{ ...baseSpot, scripture_refs: ['Acts 16:9-12', 'Acts 17:1-9'] }]);
    const expanded = expandProject(compactProject(original));
    expect(expanded.spots[0].scripture_refs).toEqual(['Acts 16:9-12', 'Acts 17:1-9']);
  });

  it('expand filters non-string entries from sr array', () => {
    const compact = {
      v: 5, n: 't', c: [0, 0], z: 8, r: [],
      s: [{ i: 's1', l: [23.5, 121], u: 1, t: 'x', k: 'pin', sr: ['Acts 16:9', 42, null, 'Matt 1:1'] }],
    };
    expect(expandProject(compact).spots[0].scripture_refs).toEqual(['Acts 16:9', 'Matt 1:1']);
  });
});
