import { describe, it, expect } from 'vitest';
import { loadTowns, townOf } from './towns.mjs';

describe('townOf (020 D2)', () => {
  it('loads all 368 townships', () => {
    expect(loadTowns()).toHaveLength(368);
  });

  it('Taipei: 大安森林公園 → 大安區, 臺北車站 → 中正區', () => {
    expect(townOf(25.03, 121.5357)).toBe('63000030');
    expect(townOf(25.0478, 121.517)).toBe('63000050');
  });

  it('Tainan 孔廟 → 中西區', () => {
    expect(townOf(22.9905, 120.2042)).toBe('67000370');
  });

  it('outlying islands: 金門金城鎮, 基隆中正區 (MultiPolygon incl. 和平島)', () => {
    expect(townOf(24.434, 118.318)).toBe('09020010');
    expect(townOf(25.147, 121.763)).toBe('10017010');
  });

  it('sea → null', () => {
    expect(townOf(24.0, 119.0)).toBeNull();
  });
});
