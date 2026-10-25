import { describe, it, expect } from 'vitest';
import { infoboxYear, valueYear, introSentence } from './zhwiki.mjs';

describe('zhwiki infobox years (020 D4)', () => {
  it('start date templates and 年 dates', () => {
    expect(valueYear('{{start date and age|1994|3|29}}')).toBe(1994);
    expect(valueYear('1937年3月15日')).toBe(1937);
    expect(valueYear('民國41年')).toBe(1952);
    expect(valueYear('1952年<ref>{{cite web|date=2019}}</ref>')).toBe(1952);
  });

  it('opened keys beat founded keys', () => {
    const wt = '{{Infobox park\n| established = 1932年\n| created = {{start date|1994|3|29}}\n}}';
    expect(infoboxYear(wt)).toEqual({ year: 1994, kind: 'opened' });
  });

  it('only established → founded', () => {
    expect(infoboxYear('| established = 1937年3月15日\n| postcode = 106306')).toEqual({ year: 1937, kind: 'founded' });
  });

  it('no year field → null', () => {
    expect(infoboxYear('| tel = +886-2-3393-1799')).toBeNull();
  });
});

describe('introSentence', () => {
  it('keeps whole sentences within the limit', () => {
    expect(introSentence('甲是公園。乙在大安區。', 6)).toBe('甲是公園。');
    expect(introSentence('甲是公園。乙在大安區。')).toBe('甲是公園。乙在大安區。');
  });
});
