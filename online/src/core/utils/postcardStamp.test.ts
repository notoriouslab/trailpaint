/**
 * Tests for postcard stamp formatters (T13).
 */

import { describe, it, expect } from 'vitest';
import { formatEra, formatScriptureRef, formatStampLines } from './postcardStamp';

describe('formatEra', () => {
  it('zh-TW: BC + AD format', () => {
    expect(formatEra(-138, 'zh-TW')).toBe('公元前 138 年');
    expect(formatEra(30, 'zh-TW')).toBe('公元 30 年');
    expect(formatEra(2026, 'zh-TW')).toBe('公元 2026 年');
  });

  it('en: BC + AD format', () => {
    expect(formatEra(-138, 'en')).toBe('BC 138');
    expect(formatEra(30, 'en')).toBe('AD 30');
    expect(formatEra(1271, 'en')).toBe('AD 1271');
  });

  it('ja: 紀元前 + 西暦 format', () => {
    expect(formatEra(-1446, 'ja')).toBe('紀元前 1446 年');
    expect(formatEra(50, 'ja')).toBe('西暦 50 年');
  });

  it('year 0 falls into AD branch (technicality — design uses centroids only)', () => {
    expect(formatEra(0, 'zh-TW')).toBe('公元 0 年');
    expect(formatEra(0, 'en')).toBe('AD 0');
  });
});

describe('formatScriptureRef', () => {
  it('passes short refs through unchanged', () => {
    expect(formatScriptureRef('Acts 16:9-12')).toBe('Acts 16:9-12');
    expect(formatScriptureRef('徒 16:9-12')).toBe('徒 16:9-12');
    expect(formatScriptureRef('Matt 16:13-20')).toBe('Matt 16:13-20');
  });

  it('strips control / bidi-override chars (display hijack defence)', () => {
    expect(formatScriptureRef('Matt‮6:9-13')).toBe('Matt6:9-13');
    expect(formatScriptureRef('​Acts 1:8​')).toBe('Acts 1:8');
  });

  it('truncates over-long refs with ellipsis', () => {
    const long = '1 Corinthians 13:1-13 paraphrase';
    const result = formatScriptureRef(long);
    expect(result.length).toBeLessThanOrEqual(24);
    expect(result.endsWith('…')).toBe(true);
  });

  it('returns empty string for whitespace-only input', () => {
    expect(formatScriptureRef('   ')).toBe('');
    expect(formatScriptureRef('')).toBe('');
  });
});

describe('formatStampLines', () => {
  it('era only when location/scripture omitted', () => {
    expect(formatStampLines({ year: 30 }, 'zh-TW')).toEqual(['公元 30 年']);
  });

  it('era + location when scripture omitted', () => {
    expect(formatStampLines({ year: 50, location: '馬其頓' }, 'zh-TW')).toEqual([
      '公元 50 年',
      '馬其頓',
    ]);
  });

  it('full three-line stamp', () => {
    expect(
      formatStampLines(
        { year: 50, location: 'Macedonia', scriptureRef: 'Acts 16:9-12' },
        'en',
      ),
    ).toEqual(['AD 50', 'Macedonia', 'Acts 16:9-12']);
  });

  it('drops scripture line when ref sanitises to empty', () => {
    const lines = formatStampLines(
      { year: 50, location: 'Macedonia', scriptureRef: '   ' },
      'en',
    );
    expect(lines).toEqual(['AD 50', 'Macedonia']);
  });
});
