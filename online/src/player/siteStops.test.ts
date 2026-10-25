import { describe, it, expect } from 'vitest';
import type { Spot } from '../core/models/types';
import { nextStop, siteStops, siteVisibleSpots } from './siteStops';

function spot(id: string, title: string, era?: [number, number]): Spot {
  return {
    id, title, latlng: [25.03, 121.535], num: 1, desc: '', photo: null, iconId: 'pin',
    cardOffset: { x: 0, y: -60 }, ...(era && { era: { start: era[0], end: era[1] } }),
  };
}

// design.md D6 — 大安森林公園 phases
const DAAN_PARK = [
  spot('p1', '柴竹圍聚落與稻田', [1904, 1949]),
  spot('p2', '七號公園預定地', [1932, 1991]),
  spot('p3', '空軍眷村「建華新村」', [1949, 1991]),
  spot('p4', '陸軍眷村「岳廬新村」', [1952, 1991]),
  spot('p5', '國際學舍', [1957, 1991]),
  spot('p6', '體育館或森林公園之爭', [1984, 1991]),
  spot('p7', '拆遷與施工', [1992, 1993]),
  spot('p8', '大安森林公園', [1994, 3000]),
];

describe('siteStops', () => {
  it('Da\'an park phases → one stop per change year', () => {
    expect(siteStops(DAAN_PARK, 2026)).toEqual([1904, 1932, 1949, 1950, 1952, 1957, 1984, 1992, 1994]);
  });

  it('end 3000 adds no stop after it', () => {
    expect(siteStops([spot('a', 'a', [1994, 3000])], 2026)).toEqual([1994]);
  });

  it('ignores spots without era', () => {
    expect(siteStops([spot('a', 'a'), spot('b', 'b', [1900, 1950])], 2026)).toEqual([1900, 1951]);
    expect(siteStops([spot('a', 'a')], 2026)).toEqual([]);
  });

  it('skips end+1 later than now', () => {
    expect(siteStops([spot('a', 'a', [1900, 1995])], 1990)).toEqual([1900]);
    expect(siteStops([spot('a', 'a', [1900, 1995])], 1996)).toEqual([1900, 1996]);
  });
});

describe('siteVisibleSpots', () => {
  const titles = (year: number, spots = DAAN_PARK) => siteVisibleSpots(spots, year).map((v) => v.spot.title);

  it('1957 lists the four coexisting phases in start order', () => {
    expect(titles(1957)).toEqual(['七號公園預定地', '空軍眷村「建華新村」', '陸軍眷村「岳廬新村」', '國際學舍']);
  });

  it('1949 shows the fields and the first village together', () => {
    expect(titles(1949)).toEqual(['柴竹圍聚落與稻田', '七號公園預定地', '空軍眷村「建華新村」']);
  });

  it('1990 lists five phases', () => {
    expect(titles(1990)).toHaveLength(5);
  });

  it('keeps the original index and puts era-less spots last', () => {
    const spots = [spot('x', 'no era'), ...DAAN_PARK];
    const visible = siteVisibleSpots(spots, 1995);
    expect(visible.map((v) => v.spot.id)).toEqual(['p8', 'x']);
    expect(visible[0].index).toBe(8);
  });
});

describe('nextStop', () => {
  it('advances to the next stop', () => {
    expect(nextStop([1904, 1932], 1904)).toBe(1932);
    expect(nextStop([1904, 1932], 1910)).toBe(1932);
  });

  it('null at the last stop or with fewer than two stops', () => {
    expect(nextStop([1904, 1932], 1932)).toBeNull();
    expect(nextStop([1904], 1904)).toBeNull();
    expect(nextStop([], 2000)).toBeNull();
  });
});
