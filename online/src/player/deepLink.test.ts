import { describe, it, expect } from 'vitest';
import {
  spotKey, parseSpotKey, parseYear, resolveSpotIndex, parseDeepLink, shareBase, buildShareLink, resolveFocus,
} from './deepLink';
import { isValidSrc } from './isValidSrc';
import type { Project } from '../core/models/types';

const spots = [
  { id: 's1', placeId: 'liugong-ntu-canal' },
  { id: 's2' },
] as Parameters<typeof resolveSpotIndex>[0]['spots'];

describe('deepLink (027)', () => {
  it('spotKey prefers placeId', () => {
    expect(spotKey({ id: 's1', placeId: 'liugong-ntu-canal' })).toBe('liugong-ntu-canal');
    expect(spotKey({ id: 's2' })).toBe('s2');
  });

  it('parseSpotKey accepts ids and rejects anything else', () => {
    expect(parseSpotKey('liugong-ntu-canal')).toBe('liugong-ntu-canal');
    expect(parseSpotKey('s_12')).toBe('s_12');
    for (const bad of [null, '', 'a b', '<script>', '../x', 'x'.repeat(81), '瑠公圳']) {
      expect(parseSpotKey(bad)).toBeNull();
    }
  });

  it('parseYear accepts integers within -3000..3000 only', () => {
    expect(parseYear('1950')).toBe(1950);
    expect(parseYear('-586')).toBe(-586);
    expect(parseYear('0')).toBe(0);
    for (const bad of [null, '', '1950.5', '1e3', '3001', '-3001', '12345', ' 1950', '0x10']) {
      expect(parseYear(bad)).toBeNull();
    }
  });

  it('resolveSpotIndex matches placeId or id, else null', () => {
    expect(resolveSpotIndex({ spots }, 'liugong-ntu-canal')).toBe(0);
    expect(resolveSpotIndex({ spots }, 's1')).toBe(0);
    expect(resolveSpotIndex({ spots }, 's2')).toBe(1);
    expect(resolveSpotIndex({ spots }, 'nope')).toBeNull();
    expect(resolveSpotIndex({ spots }, null)).toBeNull();
  });

  it('parseDeepLink validates both values', () => {
    expect(parseDeepLink(new URLSearchParams('spot=s2&year=1904'))).toEqual({ spot: 's2', year: 1904 });
    expect(parseDeepLink(new URLSearchParams('spot=a%20b&year=x'))).toEqual({ spot: null, year: null });
  });

  it('shareBase: story page first, then the Player with the same src', () => {
    const o = 'https://trailpaint.org';
    expect(shareBase(o, new URLSearchParams('embed=1&src=/taiwan/taipei-daan/daan.trailpaint.json&page=/taiwan/taipei-daan/&seg=daan'), isValidSrc))
      .toBe('https://trailpaint.org/taiwan/taipei-daan/?seg=daan');
    expect(shareBase(o, new URLSearchParams('src=/stories/paul/to-rome.trailpaint.json'), isValidSrc))
      .toBe('https://trailpaint.org/app/player/?src=%2Fstories%2Fpaul%2Fto-rome.trailpaint.json');
  });

  it('shareBase rejects foreign pages and falls back or gives null', () => {
    const o = 'https://trailpaint.org';
    for (const page of ['//evil.example/', 'https://evil.example/', '/app/', '/taiwan/x', '/taiwan/../app/']) {
      const p = new URLSearchParams({ page, seg: 'daan', src: '/taiwan/taipei-daan/daan.trailpaint.json' });
      expect(shareBase(o, p, isValidSrc)).toBe('https://trailpaint.org/app/player/?src=%2Ftaiwan%2Ftaipei-daan%2Fdaan.trailpaint.json');
    }
    expect(shareBase(o, new URLSearchParams('page=/taiwan/taipei-daan/&seg=Bad%20Seg'), isValidSrc)).toBeNull();
    expect(shareBase(o, new URLSearchParams('src=https://evil.example/x.json'), isValidSrc)).toBeNull();
    expect(shareBase(o, new URLSearchParams(''), isValidSrc)).toBeNull();
  });

  it('buildShareLink appends spot and year, round-tripping through parseDeepLink', () => {
    const url = buildShareLink('https://trailpaint.org/taiwan/taipei-daan/?seg=daan', 'liugong-ntu-canal', -586);
    expect(url).toBe('https://trailpaint.org/taiwan/taipei-daan/?seg=daan&spot=liugong-ntu-canal&year=-586');
    expect(parseDeepLink(new URL(url).searchParams)).toEqual({ spot: 'liugong-ntu-canal', year: -586 });
    expect(buildShareLink('https://trailpaint.org/app/player/?src=%2Fx.json', null, null))
      .toBe('https://trailpaint.org/app/player/?src=%2Fx.json');
  });
});

describe('resolveFocus (027)', () => {
  const spot = (id: string, era?: { start: number; end: number }) =>
    ({ id, latlng: [25, 121], num: 1, title: id, desc: '', photo: null, iconId: 'pin', cardOffset: { x: 0, y: 0 }, ...(era ? { era } : {}) });
  const mk = (p: Partial<Project>): Project =>
    ({ version: 5, name: 't', center: [25, 121], zoom: 12, spots: [], routes: [], ...p });

  it('drops the year on a story without a time axis', () => {
    expect(resolveFocus(mk({ spots: [spot('a')] }), { spot: 'a', year: 1950 })).toEqual({ index: 0, year: null });
  });
  it('keeps the year on a timed story', () => {
    expect(resolveFocus(mk({ spots: [spot('a', { start: 1900, end: 3000 })] }), { spot: 'a', year: 1950 }))
      .toEqual({ index: 0, year: 1950 });
  });
  it('drops a spot on a hidden route', () => {
    const p = mk({ spots: [spot('a')], routes: [{ id: 'r', name: 'r', color: '#000', pts: [], hidden: true, spotIds: ['a'] } as unknown as Project['routes'][number]] });
    expect(resolveFocus(p, { spot: 'a', year: null }).index).toBeNull();
  });
  it('site layout: drops a phase that does not exist at the linked year', () => {
    const p = mk({ layout: 'site', spots: [spot('old', { start: 1900, end: 1940 }), spot('new', { start: 1950, end: 3000 })] });
    expect(resolveFocus(p, { spot: 'old', year: 1960 }).index).toBeNull();
    expect(resolveFocus(p, { spot: 'new', year: 1960 }).index).toBe(1);
  });
});
