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
