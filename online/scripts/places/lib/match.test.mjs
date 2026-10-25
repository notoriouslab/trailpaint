import { describe, it, expect } from 'vitest';
import { normalizeName, haversine, groupCandidates, matchesExisting } from './match.mjs';

const c = (over) => ({ source: 'wikidata', tier: 'encyclopedic', name: 'X', latlng: [25.03, 121.53], towncode: '63000030', ...over });

describe('normalizeName (020 D5)', () => {
  it('strips one administrative prefix, brackets and spaces', () => {
    expect(normalizeName('臺北市立大安森林公園')).toBe('大安森林公園');
    expect(normalizeName('國立臺灣大學')).toBe('臺灣大學');
    expect(normalizeName('大安森林公園 (七號公園)')).toBe('大安森林公園');
    expect(normalizeName('ＡＢＣ公園')).toBe('ABC公園');
  });

  it('keeps category words, so different facilities stay apart', () => {
    expect(normalizeName('捷運大安站')).not.toBe(normalizeName('捷運大安森林公園站'));
    expect(normalizeName('大安國小')).not.toBe(normalizeName('大安國中'));
  });
});

describe('haversine', () => {
  it('~111 m per 0.001° latitude', () => {
    expect(haversine([25, 121], [25.001, 121])).toBeGreaterThan(110);
    expect(haversine([25, 121], [25.001, 121])).toBeLessThan(112);
  });
});

describe('groupCandidates (020 D5)', () => {
  it('same name within 1000 m → one group, township from the official member', () => {
    const groups = groupCandidates([
      c({ name: '大安森林公園', towncode: '63000050' }),
      c({ name: '臺北市立大安森林公園', source: 'taipei-parks', tier: 'official', latlng: [25.0305, 121.5305], towncode: '63000030' }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].towncode).toBe('63000030');
  });

  it('large facilities: park centroids 347 m apart still group (大安森林公園)', () => {
    expect(groupCandidates([c({ name: '大安森林公園', latlng: [25.030178, 121.535692] }), c({ name: '大安森林公園', latlng: [25.0333, 121.535843] })])).toHaveLength(1);
  });

  it('crosses township borders (150 m apart, different towncode)', () => {
    const groups = groupCandidates([
      c({ name: 'A館', towncode: '63000030' }),
      c({ name: 'A館', latlng: [25.0313, 121.53], towncode: '63000050' }),
    ]);
    expect(groups).toHaveLength(1);
  });

  it('different names or > 1000 m → separate groups', () => {
    expect(groupCandidates([c({ name: '大安國小' }), c({ name: '大安國中' })])).toHaveLength(2);
    expect(groupCandidates([c({ name: 'A館' }), c({ name: 'A館', latlng: [25.04, 121.53] })])).toHaveLength(2);
  });
});

describe('matchesExisting (020 D6)', () => {
  const pool = [{ id: 'daan-park', name: '大安森林公園', latlng: [25.03, 121.53] }];

  it('same normalized name within 1000 m is already in the pool', () => {
    expect(matchesExisting({ members: [c({ name: '臺北市立大安森林公園', latlng: [25.031, 121.53] })] }, pool)).toBe(true);
  });

  it('historical pool name still matches through a shared zh.wikipedia URL', () => {
    const old = [{ id: 'third-middle', name: '臺北第三中學校（今師大附中）', latlng: [25.035, 121.54],
      sources: [{ url: 'https://zh.wikipedia.org/wiki/%E5%9C%8B%E7%AB%8B%E8%87%BA%E7%81%A3%E5%B8%AB%E7%AF%84%E5%A4%A7%E5%AD%B8%E9%99%84%E5%B1%AC%E9%AB%98%E7%B4%9A%E4%B8%AD%E5%AD%B8' }] }];
    const g = { members: [c({ name: '國立台灣師範大學附屬高級中學', url: 'https://zh.wikipedia.org/wiki/國立臺灣師範大學附屬高級中學' })] };
    expect(matchesExisting(g, old)).toBe(true);
  });

  it('far away or different name is new', () => {
    expect(matchesExisting({ members: [c({ name: '大安森林公園', latlng: [25.05, 121.53] })] }, pool)).toBe(false);
    expect(matchesExisting({ members: [c({ name: '大安國小' })] }, pool)).toBe(false);
  });
});
