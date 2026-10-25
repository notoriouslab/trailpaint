import { describe, it, expect } from 'vitest';
import { parseYear, yearsFromHistory } from './years.mjs';

describe('parseYear (020)', () => {
  it('民國 years', () => {
    expect(parseYear(83)).toBe(1994);
    expect(parseYear('83')).toBe(1994);
    expect(parseYear('民國83年')).toBe(1994);
  });

  it('western years and Wikidata time strings', () => {
    expect(parseYear(1994)).toBe(1994);
    expect(parseYear('1994-05-01')).toBe(1994);
    expect(parseYear('+1994-01-01T00:00:00Z')).toBe(1994);
  });

  it('rejects empty / implausible values', () => {
    expect(parseYear(null)).toBeNull();
    expect(parseYear('')).toBeNull();
    expect(parseYear('unknown')).toBeNull();
    expect(parseYear(3000)).toBeNull();
  });
});

describe('yearsFromHistory (020 D5)', () => {
  it('興建 is a construction start, ignores a renovation year in another clause', () => {
    expect(yearsFromHistory('昭和12年（1937）興建，1985年整修')).toEqual([{ year: 1937, kind: 'started' }]);
  });

  it('動工 vs 竣工 in neighbouring clauses (熱帶醫學研究所士林支所)', () => {
    expect(yearsFromHistory('於1936年11月27日動工興建，至1939年4月15日竣工啟用')).toEqual([
      { year: 1936, kind: 'started' },
      { year: 1939, kind: 'opened' },
    ]);
  });

  it('decades and keywords inside place names are ignored (四方醫院)', () => {
    expect(yearsFromHistory('1930年代為天水街（建成町1丁目229番地）大街廓南側店屋')).toEqual([]);
  });

  it('separates founding from opening', () => {
    expect(yearsFromHistory('1925年創立，1931年落成')).toEqual([
      { year: 1925, kind: 'founded' },
      { year: 1931, kind: 'opened' },
    ]);
  });

  it('民國 and Japanese era years', () => {
    expect(yearsFromHistory('民國六十年代')).toEqual([]);
    expect(yearsFromHistory('民國53年完工啟用')).toEqual([{ year: 1964, kind: 'opened' }]);
    expect(yearsFromHistory('大正元年設立')).toEqual([{ year: 1912, kind: 'founded' }]);
  });

  it('no keyword → nothing', () => {
    expect(yearsFromHistory('1950年代為軍方使用')).toEqual([]);
  });
});
