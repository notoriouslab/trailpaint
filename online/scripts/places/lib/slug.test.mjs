import { describe, it, expect } from 'vitest';
import { townSlug } from './slug.mjs';

describe('townSlug (020 D3)', () => {
  it('drops the District suffix and apostrophes', () => {
    expect(townSlug("Da'an District")).toBe('daan');
    expect(townSlug("Ren'ai District")).toBe('renai');
    expect(townSlug('Banqiao District')).toBe('banqiao');
    expect(townSlug('Zhongzheng District')).toBe('zhongzheng');
  });

  it('other township types and multi-word names', () => {
    expect(townSlug('Jincheng Township')).toBe('jincheng');
    expect(townSlug('Taitung City')).toBe('taitung');
    expect(townSlug('West Central District')).toBe('west-central');
  });

  it('drops Wikidata disambiguation and syllable hyphens', () => {
    expect(townSlug('North District, Taichung')).toBe('north');
    expect(townSlug('Tai-an Township')).toBe('taian');
    expect(townSlug('Ren-ai District')).toBe('renai');
  });
});
