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

describe('compactProject / expandProject — hidden and spotIds on routes (pr-6-fixes)', () => {
  const baseRoute = {
    id: 'r1',
    name: 'R1',
    color: 'blue',
    pts: [[23.5, 121]] as [number, number][],
    elevations: null,
  };

  it('compacts hidden to h:1 and spotIds to s', () => {
    const p = mkProject([]);
    p.routes = [{ ...baseRoute, hidden: true, spotIds: ['s1', 's2'] }];
    const compact = compactProject(p);
    const r = (compact.r as Record<string, unknown>[])[0];
    expect(r.h).toBe(1);
    expect(r.s).toEqual(['s1', 's2']);
  });

  it('omits h and s when missing or false/empty', () => {
    const p = mkProject([]);
    p.routes = [{ ...baseRoute, hidden: false, spotIds: [] }];
    const compact = compactProject(p);
    const r = (compact.r as Record<string, unknown>[])[0];
    expect(r).not.toHaveProperty('h');
    expect(r).not.toHaveProperty('s');
  });

  it('round-trips hidden and spotIds through compact -> expand', () => {
    const p = mkProject([]);
    p.routes = [{ ...baseRoute, hidden: true, spotIds: ['s1', 's2'] }];
    const expanded = expandProject(compactProject(p));
    const r = expanded.routes![0];
    expect(r.hidden).toBe(true);
    expect(r.spotIds).toEqual(['s1', 's2']);
  });
});

describe('compactProject / expandProject — eraMode (019)', () => {
  it('round-trips cumulative via em key', () => {
    const original: Project = { ...mkProject([{ ...baseSpot }]), eraMode: 'cumulative' };
    const compact = compactProject(original);
    expect(compact.em).toBe('c');
    expect(expandProject(compact).eraMode).toBe('cumulative');
  });

  it('fade (or absent) writes no em key', () => {
    expect(compactProject({ ...mkProject([{ ...baseSpot }]), eraMode: 'fade' })).not.toHaveProperty('em');
    expect(compactProject(mkProject([{ ...baseSpot }]))).not.toHaveProperty('em');
  });

  it('ignores unknown em values', () => {
    const compact = { ...compactProject(mkProject([{ ...baseSpot }])), em: 'x' };
    expect(expandProject(compact)).not.toHaveProperty('eraMode');
  });
});

describe('compactProject / expandProject — layout (021)', () => {
  it('round-trips site via ly key', () => {
    const original: Project = { ...mkProject([{ ...baseSpot }]), layout: 'site' };
    const compact = compactProject(original);
    expect(compact.ly).toBe('s');
    expect(expandProject(compact).layout).toBe('site');
  });

  it('route player writes no ly key', () => {
    expect(compactProject(mkProject([{ ...baseSpot }]))).not.toHaveProperty('ly');
  });

  it('ignores unknown ly values', () => {
    const compact = { ...compactProject(mkProject([{ ...baseSpot }])), ly: 'x' };
    expect(expandProject(compact)).not.toHaveProperty('layout');
  });
});

describe('compactProject / expandProject — photoMeta sources (024)', () => {
  const maintainer: PhotoMeta = {
    source: 'maintainer', license: 'CC BY 4.0', author: 'Jacob Mei', authorUrl: null, sourceUrl: null,
  };
  const archive: PhotoMeta = {
    source: 'public-domain-archive',
    license: '著作財產權已消滅（著作權法 §34）',
    author: '佚名',
    authorUrl: null,
    sourceUrl: 'https://openmuseum.tw/muse/digi_object/abc',
    origin: '臺北寫真帖 第 12 頁',
    published: 1960,
  };

  it.each([['commons', validMeta], ['maintainer', maintainer], ['archive', archive]])(
    'round-trips a %s photoMeta',
    (_name, meta) => {
      const expanded = expandProject(compactProject(mkProject([{ ...baseSpot, photoMeta: meta }])));
      expect(expanded.spots[0].photoMeta).toEqual(meta);
    },
  );

  it('does not add og / pb keys for a Commons photo', () => {
    const compact = compactProject(mkProject([{ ...baseSpot, photoMeta: validMeta }]));
    const pm = (compact.s as Record<string, unknown>[])[0].pm as Record<string, unknown>;
    expect(pm).not.toHaveProperty('og');
    expect(pm).not.toHaveProperty('pb');
  });
});
