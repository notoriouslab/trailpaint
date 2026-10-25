import { describe, it, expect } from 'vitest';
import { isValidSrc } from './isValidSrc';

describe('isValidSrc', () => {
  it('accepts curated story, Taiwan Century and example routes', () => {
    expect(isValidSrc('/stories/paul/first-journey.trailpaint.json')).toBe(true);
    expect(isValidSrc('/taiwan/taipei-daan-park/daan-park.trailpaint.json')).toBe(true);
    expect(isValidSrc('/examples/routes/阿朗壹古道.trailpaint.json')).toBe(true);
  });

  it('rejects traversal, other roots, nesting and non-JSON', () => {
    expect(isValidSrc('/taiwan/../secret.json')).toBe(false);
    expect(isValidSrc('/stories/a/../../x.json')).toBe(false);
    expect(isValidSrc('/app/data.json')).toBe(false);
    expect(isValidSrc('https://evil.example/taiwan/a/b.json')).toBe(false);
    expect(isValidSrc('//evil.example/taiwan/a/b.json')).toBe(false);
    expect(isValidSrc('/taiwan/a/b/c.json')).toBe(false);
    expect(isValidSrc('/taiwan/taipei-daan/index.html')).toBe(false);
    expect(isValidSrc('/taiwan/index.json')).toBe(false);
  });
});
