import { describe, expect, it } from 'vitest';
import { BIG5, simplifiedLeftovers, toTraditional } from './hanzi.mjs';

describe('hanzi', () => {
  it('keeps Taiwan-standard characters that s2t would rewrite', () => {
    for (const ch of '里布占致岩采台著') expect(BIG5.has(ch)).toBe(true);
    expect(simplifiedLeftovers(['提供鄰里居民布置精致的休憩空間'])).toEqual([[]]);
  });

  it('flags and fixes simplified leftovers', () => {
    expect(simplifiedLeftovers(['沿河綠带'])[0]).toEqual([{ at: 3, ch: '带', to: '帶' }]);
    expect(toTraditional('沿河綠带，鄰里公園')).toBe('沿河綠帶，鄰里公園');
  });

  it('folds CJK compatibility ideographs to their unified form', () => {
    expect(toTraditional('紀說')).toBe('紀說');
  });
});
