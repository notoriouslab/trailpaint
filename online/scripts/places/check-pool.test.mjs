import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPool } from './check-pool.mjs';

// One valid Da'an item; each case overrides the 021 optional fields.
const base = {
  id: 't1', name: '測試', category: 'event', latlng: [25.0300, 121.5357], start: 1992, end: 1993,
  desc: '測試說明。', sources: [{ title: 'a', url: 'https://example.org' }],
  verified: { method: 'manual', date: '2026-10-25' },
};

function errorsFor(extra) {
  const dir = mkdtempSync(join(tmpdir(), 'pool-'));
  const path = join(dir, '63000030.json');
  writeFileSync(path, JSON.stringify({ towncode: '63000030', items: [{ ...base, ...extra }] }));
  return checkPool(path, 2026);
}

describe('checkPool — 021 optional fields', () => {
  it('accepts the item without them', () => {
    expect(errorsFor({})).toEqual([]);
  });

  it('kind: place | event only', () => {
    expect(errorsFor({ kind: 'event' })).toEqual([]);
    expect(errorsFor({ kind: 'x' })).toEqual(['t1: kind x']);
  });

  it("latlngPrecision: 'approx' only", () => {
    expect(errorsFor({ latlngPrecision: 'approx' })).toEqual([]);
    expect(errorsFor({ latlngPrecision: 'rough' })).toEqual(['t1: latlngPrecision rough']);
  });

  it('related: array of titled https links', () => {
    expect(errorsFor({ related: [{ title: 'a', url: 'https://x' }] })).toEqual([]);
    expect(errorsFor({ related: [{ title: 'a', url: 'http://x' }] })).toEqual(['t1: non-https related http://x']);
    expect(errorsFor({ related: 'x' })).toEqual(['t1: related must be an array']);
  });
});
