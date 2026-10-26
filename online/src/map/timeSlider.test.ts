/**
 * TimeSlider snap-to-nearest tests (T1 verification).
 *
 * Covers eraScales.snapToNearestTick + scale group definitions.
 * Hook behaviour (cross-fade cancellation, opacity sync) is verified via
 * manual testing on dev server (per tasks.md T1 手測).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  HISTORY_SCALE,
  BIBLE_SCALE,
  snapToNearestTick,
  getScale,
  MODERN_TICK,
  scaleForProject,
  overlayForYear,
  tickStepFor,
  MAX_CONTENT_TICKS,
  overlayForJump,
} from './eraScales';
import { getRelevantOverlayIds } from './overlays';

describe('snapToNearestTick — boundary cases', () => {
  it('snaps year 2026 to MODERN_TICK on history scale', () => {
    const result = snapToNearestTick(2026, HISTORY_SCALE);
    expect(result.year).toBe(MODERN_TICK.year);
    expect(result.overlayId).toBeUndefined();
  });

  it('snaps BC year to corresponding china overlay', () => {
    // han_bc7 has year=-7, nearest BC tick on history scale
    const result = snapToNearestTick(-50, HISTORY_SCALE);
    expect(result.overlayId).toBe('han_bc7');
    expect(result.year).toBe(-7);
  });

  it('snaps Tang dynasty era to tang_741', () => {
    const result = snapToNearestTick(800, HISTORY_SCALE);
    expect(result.overlayId).toBe('tang_741');
    expect(result.year).toBe(741);
  });

  it('snaps biblical era ticks correctly (jesus AD30 → rome_200)', () => {
    const result = snapToNearestTick(30, BIBLE_SCALE);
    expect(result.labelKey).toBe('era.jesus');
    expect(result.overlayId).toBe('rome_200');
  });

  it('snaps biblical pre-Roman era to rome_200 (B-plan: DARE bounds envelop OT locales)', () => {
    const result = snapToNearestTick(-1500, BIBLE_SCALE);
    expect(result.labelKey).toBe('era.exodus');
    expect(result.overlayId).toBe('rome_200');
  });
});

describe('Scale definitions', () => {
  it('HISTORY_SCALE includes MODERN_TICK + 16 overlays = 17 ticks (019 +4 island-wide, +1989)', () => {
    expect(HISTORY_SCALE).toHaveLength(17);
  });

  it('HISTORY_SCALE is sorted newest → oldest', () => {
    for (let i = 1; i < HISTORY_SCALE.length; i++) {
      expect(HISTORY_SCALE[i - 1].year).toBeGreaterThan(HISTORY_SCALE[i].year);
    }
  });

  it('BIBLE_SCALE includes 7 ticks (modern + 6 biblical)', () => {
    expect(BIBLE_SCALE).toHaveLength(7);
  });

  it('getScale returns correct group', () => {
    expect(getScale('history')).toBe(HISTORY_SCALE);
    expect(getScale('bible')).toBe(BIBLE_SCALE);
  });

  it('every history tick except MODERN has a valid overlayId', () => {
    for (const tick of HISTORY_SCALE) {
      if (tick.labelKey === 'era.modern') {
        expect(tick.overlayId).toBeUndefined();
      } else {
        expect(tick.overlayId).toBeDefined();
      }
    }
  });
});

describe('snapToNearestTick — edge cases', () => {
  it('throws on empty scale array', () => {
    expect(() => snapToNearestTick(0, [])).toThrow();
  });

  it('clamps to oldest tick when year far in past', () => {
    const result = snapToNearestTick(-9999, HISTORY_SCALE);
    expect(result.year).toBe(-7); // han_bc7 is the oldest history tick
  });

  it('clamps to newest tick when year far in future', () => {
    const result = snapToNearestTick(99999, HISTORY_SCALE);
    expect(result.year).toBe(MODERN_TICK.year);
  });
});

describe('overlayForYear (019 D7)', () => {
  const taipei = getRelevantOverlayIds([[25.03, 121.54]]);
  const tainan = getRelevantOverlayIds([[22.99, 120.2]]);

  it('exact map year picks that map', () => {
    expect(overlayForYear(1904, taipei)).toBe('tw_1904');
  });

  it('picks the latest map not later than the year (never the future)', () => {
    expect(overlayForYear(1975, taipei)).toBe('corona_1966');
    expect(overlayForYear(1990, taipei)).toBe('tw_1989');
    expect(overlayForYear(1988, taipei)).toBe('corona_1966');
    expect(overlayForYear(1899, taipei)).toBe('jm200k_1897');
  });

  it('years from MODERN_BASEMAP_FROM on use the modern basemap', () => {
    expect(overlayForYear(2005, taipei)).toBeUndefined();
  });

  it('skips a map with no scanned content at the story location (coverage table)', () => {
    // Corona 1966 has no imagery over Kaohsiung (probed): 1970 falls back to 1955
    const kaohsiung = getRelevantOverlayIds([[22.63, 120.3]]);
    expect(kaohsiung.has('corona_1966')).toBe(false);
    expect(overlayForYear(1970, kaohsiung)).toBe('tw_1955');
  });

  it('island-wide 019 maps apply outside Taipei too', () => {
    expect(overlayForYear(1950, tainan)).toBe('tw_1945');
  });
});

describe('scaleForProject (019 D7)', () => {
  const daan: [number, number][] = [[25.03, 121.54]];

  it('cumulative: one tick per decade from the earliest era, then modern', () => {
    const scale = scaleForProject(daan, 'cumulative', [1904]);
    const decades = scale.slice(1).map((t) => t.year).reverse();
    expect(scale[0]).toBe(MODERN_TICK);
    expect(decades[0]).toBe(1900);
    expect(decades[decades.length - 1]).toBe(Math.floor((MODERN_TICK.year - 1) / 10) * 10);
    expect(decades.every((y, i) => i === 0 || y - decades[i - 1] === 10)).toBe(true);
    expect(scale.some((t) => t.overlayId === 'han_bc7' || t.overlayId === 'qing_1820')).toBe(false);
    expect(scale.find((t) => t.year === 1970)?.overlayId).toBe('corona_1966');
    expect(scale.find((t) => t.year === 1970)?.label).toBe('1970');
    // First tick shows the latest map within its decade (1904 堡圖, not 1897)
    expect(scale.find((t) => t.year === 1900)?.overlayId).toBe('tw_1904');
  });

  it('fade mode keeps the overlay ticks (016 behaviour)', () => {
    const scale = scaleForProject(daan, 'fade', [1904]);
    expect(scale.some((t) => t.overlayId === 'han_bc7')).toBe(true);
    expect(scale.some((t) => t.year === 1970)).toBe(false);
  });

  it('cumulative without any spot era falls back to fade ticks', () => {
    expect(scaleForProject(daan, 'cumulative', [])).toEqual(scaleForProject(daan, 'fade'));
  });
});

describe('tickStepFor (019 D7, nationwide spans)', () => {
  it('a century-ish story keeps decade ticks', () => {
    expect(tickStepFor(1904, 2026)).toBe(10);
  });

  it('a Qing-era story widens the step to stay within MAX_CONTENT_TICKS', () => {
    const step = tickStepFor(1624, 2026);
    expect(step).toBe(50);
    expect(Math.ceil((2026 - 1600) / step)).toBeLessThanOrEqual(MAX_CONTENT_TICKS);
  });

  it('cumulative scale for a 1624 story has <= MAX_CONTENT_TICKS content ticks', () => {
    const scale = scaleForProject([[22.99, 120.2]], 'cumulative', [1624]);
    expect(scale.length - 1).toBeLessThanOrEqual(MAX_CONTENT_TICKS);
    expect(scale[scale.length - 1].year).toBe(1600);
  });
});

describe('scaleForProject lead tick + first-tick map (024 D2)', () => {
  const daan: [number, number][] = [[25.03, 121.54]];
  const tainan: [number, number][] = [[22.99, 120.2]];
  const before = JSON.parse(readFileSync(new URL('./__fixtures__/scale-before-024.json', import.meta.url), 'utf8'));
  // Ticks up to 2020 only: the modern tick (and any 2030+ decade) follows the
  // current year, so comparing them would break when the calendar moves on.
  const stable = (scale: { year: number }[]) => scale.filter((t) => t.year <= 2020);
  const enriched = [1762, 1903, 1904, 1926, 1931, 1942, 1950, 1953, 1956, 1987, 1994, 2017];

  it('大安 with 瑠公圳 1762: one lead tick, then decades from 1900', () => {
    const scale = scaleForProject(daan, 'cumulative', enriched);
    const years = scale.slice(1).map((t) => t.year).reverse();
    expect(years[0]).toBe(1762);
    expect(years.slice(1)).toEqual([1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]);
    expect(stable(scale)).toHaveLength(14);
    expect(scale.find((t) => t.year === 1762)?.label).toBe('1762');
    expect(scale.find((t) => t.year === 1762)?.overlayId).toBe('tw_1904');
    expect(scale.find((t) => t.year === 1900)?.overlayId).toBe('tw_1904');
  });

  it('original 24-spot 大安 scale keeps its tick years (fixture from before 024)', () => {
    const scale = stable(scaleForProject(daan, 'cumulative', [1904, 1926, 1959, 1994, 2017]));
    expect(scale.map((t) => t.year)).toEqual(stable(before.daan1904).map((t: { year: number }) => t.year));
  });

  it('025 D2b: each tick shows the latest map drawn within its decade', () => {
    const scale = scaleForProject(daan, 'cumulative', [1904, 1926, 1959, 1994, 2017]);
    const mapAt = (year: number) => scale.find((t) => t.year === year)?.overlayId;
    expect(mapAt(1900)).toBe('tw_1904');
    expect(mapAt(1910)).toBe('tw_1904');
    expect(mapAt(1920)).toBe('jm20k_1921');
    expect(mapAt(1940)).toBe('tw_1945');
    expect(mapAt(1950)).toBe('tw_1955');
    expect(mapAt(1960)).toBe('corona_1966');
    expect(mapAt(1980)).toBe('tw_1989');
    expect(mapAt(1990)).toBe('tw_1993');
    expect(mapAt(2000)).toBeUndefined();
  });

  it('Tainan from 1624: no lead tick, same tick years as before 024', () => {
    const scale = scaleForProject(tainan, 'cumulative', [1624, 1661, 1700]);
    expect(stable(scale).map((t) => t.year)).toEqual(stable(before.tainan1624).map((t: { year: number }) => t.year));
    // 025 D2b: street maps only — ticks older than the 1904 堡圖 borrow it
    // instead of the Ming / Qing empire maps.
    expect(scale[scale.length - 1].overlayId).toBe('tw_1904');
    expect(scale.some((t) => t.overlayId === 'ming_1582' || t.overlayId === 'qing_1820')).toBe(false);
  });

  it('duplicate earliest years still give a single lead tick', () => {
    const scale = scaleForProject(daan, 'cumulative', [1762, 1762, 1904]);
    expect(scale.filter((t) => t.year === 1762)).toHaveLength(1);
    expect(scale[scale.length - 2].year).toBe(1900);
  });

  it('a single era start never makes a lead tick', () => {
    const scale = scaleForProject(daan, 'cumulative', [1762]);
    expect(scale[scale.length - 1].year).toBe(1760);
    expect(scale[scale.length - 2].year).toBe(1780);
  });
});

describe('overlayForJump (024 D2b)', () => {
  const daan: [number, number][] = [[25.03, 121.54]];
  const scale = scaleForProject(daan, 'cumulative', [1762, 1903, 1904, 1959, 2017]);

  it('jumping to the 1762 spot shows the 1904 堡圖, not the Ming empire map', () => {
    expect(overlayForJump(scale, 1762)).toBe('tw_1904');
  });

  it('jumping to 1903 shows the 1904 堡圖, not the 1897 map', () => {
    expect(overlayForJump(scale, 1903)).toBe('tw_1904');
  });

  it('jumping to 1959 uses the 1950 tick map', () => {
    expect(overlayForJump(scale, 1959)).toBe(scale.find((t) => t.year === 1950)?.overlayId);
  });

  it('jumping to 2017 is the modern basemap', () => {
    expect(overlayForJump(scale, 2017)).toBeUndefined();
  });
});

describe('scaleForProject: several early years fold into one lead tick (025 D2)', () => {
  const daan: [number, number][] = [[25.03, 121.54]];
  const NOW = 2026;
  // 025 公館到景美: 29 era starts (design D1)
  const gongguan = [1724, 1761, 1762, 1791, 1806, 1838, 1859, 1867, 1876, 1897, 1903, 1904, 1908, 1921,
    1925, 1927, 1928, 1929, 1929, 1936, 1946, 1949, 1953, 1955, 1964, 1967, 1972, 1975, 2017];

  it('nine Qing years become one "1724–1876" lead tick, then decades from 1890', () => {
    const scale = scaleForProject(daan, 'cumulative', gongguan, NOW);
    const content = scale.slice(1).reverse();
    expect(content[0]).toMatchObject({ year: 1876, label: '1724–1876', overlayId: 'tw_1904' });
    expect(content.slice(1).map((t) => t.year)).toEqual(
      [1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]);
    expect(content).toHaveLength(MAX_CONTENT_TICKS);
    expect(scale.find((t) => t.year === 1890)?.overlayId).toBe('tw_1904');
  });

  it('大安 33 spots: identical to the 024 result', () => {
    // distinct era starts of taiwan/taipei-daan/daan.trailpaint.json (v1.8.1)
    const daan33 = [1762, 1903, 1904, 1926, 1927, 1928, 1929, 1931, 1937, 1942, 1944, 1950, 1953, 1956,
      1959, 1961, 1974, 1977, 1978, 1982, 1987, 1990, 1994, 1996, 1999, 2002, 2010, 2013, 2017];
    const scale = scaleForProject(daan, 'cumulative', daan33, NOW);
    const content = scale.slice(1).reverse();
    expect(content[0]).toMatchObject({ year: 1762, label: '1762', overlayId: 'tw_1904' });
    expect(content.slice(1).map((t) => t.year)).toEqual(
      [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]);
  });

  it('no year fits a grid with room for a lead tick → whole span sets the step (019 rule)', () => {
    const scale = scaleForProject(daan, 'cumulative', [1700, 1885, 1886, 1887], NOW);
    const years = scale.slice(1).reverse().map((t) => t.year);
    expect(years[0]).toBe(1700);
    expect(years[1] - years[0]).toBe(tickStepFor(1700, NOW));
    expect(scale.some((t) => t.label?.includes('–'))).toBe(false);
  });

  it('[1885, 1900, 1950]: earliest year already fits the decade grid, no lead tick', () => {
    const years = scaleForProject(daan, 'cumulative', [1885, 1900, 1950], NOW).slice(1).reverse().map((t) => t.year);
    expect(years[0]).toBe(1880);
    expect(years).toHaveLength(15);
  });

  it('nowYear keeps the result stable as the calendar moves on', () => {
    const a = scaleForProject(daan, 'cumulative', gongguan, NOW);
    expect(a[0].year).toBe(NOW);
    expect(scaleForProject(daan, 'cumulative', gongguan, NOW)).toEqual(a);
  });

  it('jumping to a Qing place under the lead tick keeps the 1904 堡圖', () => {
    const scale = scaleForProject(daan, 'cumulative', gongguan, NOW);
    expect(overlayForJump(scale, 1724)).toBe('tw_1904');
    expect(overlayForJump(scale, 1806)).toBe('tw_1904');
    expect(overlayForJump(scale, 1876)).toBe('tw_1904');
  });
});

describe('025 D2b: 1945 city plans only where the story sits inside them', () => {
  const root = new URL('../../../', import.meta.url);
  const load = (file: string) => {
    const project = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
    const latlngs = project.spots.map((s: { latlng: [number, number] }) => s.latlng);
    const years = project.spots.map((s: { era: { start: number } }) => s.era.start);
    return scaleForProject(latlngs, 'cumulative', years, 2026);
  };
  const mapAt = (scale: { year: number; overlayId?: string }[], year: number) =>
    scale.find((t) => t.year === year)?.overlayId;

  it('公館到景美 (mostly 文山): skips tw_1945, 1940 → 1921 map, 1950 → 1955 map', () => {
    const scale = load('taiwan/taipei-gongguan-jingmei/gongguan-jingmei.trailpaint.json');
    expect(scale.some((t) => t.overlayId === 'tw_1945')).toBe(false);
    expect(mapAt(scale, 1940)).toBe('jm20k_1921');
    expect(mapAt(scale, 1950)).toBe('tw_1955');
  });

  it('大安 (inside the plans): 1940 → tw_1945, 1950 → 1955 map', () => {
    const scale = load('taiwan/taipei-daan/daan.trailpaint.json');
    expect(mapAt(scale, 1940)).toBe('tw_1945');
    expect(mapAt(scale, 1950)).toBe('tw_1955');
  });
});

describe('fade scales unchanged by 025 (street maps / majority rule are cumulative-only)', () => {
  const before: Record<string, { year: number; overlayId: string }[]> = JSON.parse(
    readFileSync(new URL('./__fixtures__/fade-scales-before-025.json', import.meta.url), 'utf8'));
  const root = new URL('../../../', import.meta.url);
  it.each(Object.keys(before))('%s', (file) => {
    const project = JSON.parse(readFileSync(new URL(file, root), 'utf8'));
    const latlngs = project.spots.map((s: { latlng: [number, number] }) => s.latlng);
    const now = scaleForProject(latlngs, 'fade').filter((t) => t.overlayId)
      .map((t) => ({ year: t.year, overlayId: t.overlayId }));
    expect(now).toEqual(before[file]);
    expect(now.some((t) => t.overlayId === 'tw_1945')).toBe(true);
  });
});
