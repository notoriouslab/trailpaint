import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrateProject } from './migrateProject';

const validBase = {
  name: 'Test',
  center: [23.5, 121],
  zoom: 8,
  spots: [],
  routes: [],
};

describe('migrateProject — baseline (Task 2)', () => {
  it('returns a valid Project with version 5 for minimal valid input', () => {
    const p = migrateProject({ ...validBase });
    expect(p.version).toBe(5);
    expect(p.name).toBe('Test');
    expect(p.center).toEqual([23.5, 121]);
    expect(p.zoom).toBe(8);
    expect(p.spots).toEqual([]);
    expect(p.routes).toEqual([]);
  });

  it('clamps center coordinates out of lat/lng range', () => {
    const p = migrateProject({
      ...validBase,
      center: [200, -999],
    });
    expect(p.center[0]).toBe(90);
    expect(p.center[1]).toBe(-180);
  });

  it('throws when spots exceed the 200 cap', () => {
    const spots = Array.from({ length: 201 }, (_, i) => ({
      id: `s${i}`,
      latlng: [23.5, 121],
    }));
    expect(() => migrateProject({ ...validBase, spots })).toThrow(/Too many spots/);
  });

  it('strips non-data-URL spot photos (blocks tracking pixels)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [
        {
          id: 'malicious',
          latlng: [23.5, 121],
          photo: 'https://evil.example.com/tracker.gif',
        },
      ],
    });
    expect(p.spots).toHaveLength(1);
    expect(p.spots[0].photo).toBeNull();
  });

  it('skips spots with invalid latlng instead of rejecting entire import', () => {
    const p = migrateProject({
      ...validBase,
      spots: [
        { id: 'bad', latlng: ['not', 'numbers'] },
        { id: 'good', latlng: [24.0, 121.5] },
      ],
    });
    expect(p.spots).toHaveLength(1);
    expect(p.spots[0].id).toBe('good');
  });

  it('clamps oversize title/desc strings', () => {
    const p = migrateProject({
      ...validBase,
      spots: [
        {
          id: 's1',
          latlng: [23.5, 121],
          title: 'A'.repeat(500),
          desc: 'B'.repeat(5000),
        },
      ],
    });
    expect(p.spots[0].title).toHaveLength(80);
    expect(p.spots[0].desc).toHaveLength(500);
  });

  it('rejects data:image/svg+xml (SVG can contain <script> in certain contexts)', () => {
    const svg = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxzY3JpcHQ+YWxlcnQoMSk8L3NjcmlwdD48L3N2Zz4=';
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], photo: svg }],
    });
    expect(p.spots[0].photo).toBeNull();
  });

  it('accepts whitelisted raster MIME types (jpeg/png/webp/gif)', () => {
    const mimes = ['jpeg', 'jpg', 'png', 'webp', 'gif'];
    for (const mime of mimes) {
      const p = migrateProject({
        ...validBase,
        spots: [{ id: 's1', latlng: [23.5, 121], photo: `data:image/${mime};base64,AAAA` }],
      });
      expect(p.spots[0].photo).toBe(`data:image/${mime};base64,AAAA`);
    }
  });

  it('rejects per-photo size over 1 MB', () => {
    const bigPhoto = 'data:image/jpeg;base64,' + 'A'.repeat(1024 * 1024 + 100);
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], photo: bigPhoto }],
    });
    expect(p.spots[0].photo).toBeNull();
  });

  describe('music URL scheme whitelist (S3 privacy fix)', () => {
    const allowed = [
      'https://cdn.example.com/song.mp3',
      '/stories/music/song.mp3',
      './song.mp3',
      '../music/song.mp3',
    ];
    const blocked = [
      'http://tracker.example.com/ping.mp3',   // mixed content + tracking
      'javascript:alert(1)',
      'data:audio/mp3;base64,AAAA',
      'ftp://example.com/song.mp3',
      '//evil.com/song.mp3',                    // protocol-relative could become http:
    ];
    for (const url of allowed) {
      it(`accepts ${url}`, () => {
        const p = migrateProject({ ...validBase, music: { url, autoplay: false } });
        expect(p.music?.url).toBe(url);
      });
    }
    for (const url of blocked) {
      it(`rejects ${url}`, () => {
        const p = migrateProject({ ...validBase, music: { url, autoplay: false } });
        expect(p.music).toBeUndefined();
      });
    }
  });

  it('enforces 50 MB aggregate photo cap (later spots lose photos, data preserved)', () => {
    // 60 spots × 900 KB ≈ 54 MB — should drop photos after ~56th spot
    const photo = 'data:image/jpeg;base64,' + 'A'.repeat(900 * 1024);
    const spots = Array.from({ length: 60 }, (_, i) => ({
      id: `s${i}`,
      latlng: [23.5 + i * 0.001, 121],
      photo,
    }));
    const p = migrateProject({ ...validBase, spots });
    const withPhoto = p.spots.filter((s) => s.photo !== null).length;
    expect(withPhoto).toBeGreaterThanOrEqual(50); // at least 50 should fit under 50MB
    expect(withPhoto).toBeLessThan(60); // some must be dropped
    // All 60 spots preserved (just photos stripped)
    expect(p.spots).toHaveLength(60);
  });
});

describe('migrateProject — v3 scripture_refs (Task 3)', () => {
  it('upgrades version from v2 input to v5', () => {
    const p = migrateProject({ ...validBase, version: 2 });
    expect(p.version).toBe(5);
  });

  it('preserves valid scripture_refs array', () => {
    const p = migrateProject({
      ...validBase,
      spots: [
        { id: 's1', latlng: [23.5, 121], scripture_refs: ['Matt 26:36-46', 'Mark 14:32'] },
      ],
    });
    expect(p.spots[0].scripture_refs).toEqual(['Matt 26:36-46', 'Mark 14:32']);
  });

  it('drops scripture_refs when not an array (string/number/object)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], scripture_refs: 'Matt 26' }],
    });
    expect(p.spots[0].scripture_refs).toBeUndefined();
  });

  it('filters non-string elements, keeps string elements', () => {
    const p = migrateProject({
      ...validBase,
      spots: [
        {
          id: 's1',
          latlng: [23.5, 121],
          scripture_refs: [null, 123, { book: 'Matt' }, 'Matt 26:36', ['nested'], 'John 3:16'],
        },
      ],
    });
    expect(p.spots[0].scripture_refs).toEqual(['Matt 26:36', 'John 3:16']);
  });

  it('truncates scripture_refs array at 10 elements', () => {
    const refs = Array.from({ length: 15 }, (_, i) => `Matt ${i + 1}:1`);
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], scripture_refs: refs }],
    });
    expect(p.spots[0].scripture_refs).toHaveLength(10);
    expect(p.spots[0].scripture_refs![0]).toBe('Matt 1:1');
    expect(p.spots[0].scripture_refs![9]).toBe('Matt 10:1');
  });

  it('truncates individual strings longer than 50 chars', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], scripture_refs: ['A'.repeat(200)] }],
    });
    expect(p.spots[0].scripture_refs![0]).toHaveLength(50);
  });

  it('preserves javascript: prefix strings (bibleUrl whitelists at render time)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [
        {
          id: 's1',
          latlng: [23.5, 121],
          scripture_refs: ['javascript:alert(1)', 'Matt 26:36'],
        },
      ],
    });
    expect(p.spots[0].scripture_refs).toEqual(['javascript:alert(1)', 'Matt 26:36']);
  });

  it('handles attack payload (long array + mixed types + oversize strings)', () => {
    const evil: unknown[] = [
      'A'.repeat(1000),
      null,
      { book: 'Matt' },
      ...Array.from({ length: 20 }, (_, i) => `ref-${i}`),
      [1, 2],
      42,
    ];
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], scripture_refs: evil }],
    });
    const refs = p.spots[0].scripture_refs!;
    expect(refs).toHaveLength(10);
    refs.forEach((r) => expect(r.length).toBeLessThanOrEqual(50));
    refs.forEach((r) => expect(typeof r).toBe('string'));
  });

  it('drops empty scripture_refs arrays (undefined rather than empty)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], scripture_refs: [] }],
    });
    expect(p.spots[0].scripture_refs).toBeUndefined();
  });

  it('omits scripture_refs for spots without the field (backward-compat)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121] }],
    });
    expect(p.spots[0].scripture_refs).toBeUndefined();
  });
});

describe('migrateProject — real fixture (mackay v2 → v5)', () => {
  it('upgrades mackay.trailpaint.json (v2) to v5 without losing spots', () => {
    const path = resolve(__dirname, '../../../../stories/taiwan-missionaries/mackay.trailpaint.json');
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    expect(raw.version).toBe(2);
    const spotsBefore = raw.spots.length;
    const p = migrateProject(raw);
    expect(p.version).toBe(5);
    expect(p.spots.length).toBe(spotsBefore);
    expect(p.name).toBe(raw.name);
    expect(p.center).toEqual([
      Math.max(-90, Math.min(90, raw.center[0])),
      Math.max(-180, Math.min(180, raw.center[1])),
    ]);
    // None of the existing spots should have scripture_refs (pre-v3 data)
    p.spots.forEach((s) => expect(s.scripture_refs).toBeUndefined());
  });
});

describe('migrateProject — passion-week v3 fixtures', () => {
  const segments = [
    { file: 'entry.trailpaint.json', minSpots: 4 },
    { file: 'passion.trailpaint.json', minSpots: 4 },
    { file: 'resurrection.trailpaint.json', minSpots: 4 },
  ];

  for (const seg of segments) {
    it(`loads ${seg.file} (v3) upgrading to v5 with scripture_refs preserved`, () => {
      const path = resolve(__dirname, `../../../../stories/passion-week/${seg.file}`);
      const raw = JSON.parse(readFileSync(path, 'utf8'));
      expect(raw.version).toBe(3);
      const p = migrateProject(raw);
      expect(p.version).toBe(5);
      expect(p.spots.length).toBe(raw.spots.length);
      expect(p.spots.length).toBeGreaterThanOrEqual(seg.minSpots);
      // Every spot should keep its scripture_refs
      const withRefs = p.spots.filter((s) => s.scripture_refs && s.scripture_refs.length > 0);
      expect(withRefs.length).toBe(raw.spots.length);
      // Every spot should keep its photo (base64 data URL)
      p.spots.forEach((s) => expect(s.photo).toMatch(/^data:image\/jpeg;base64,/));
    });
  }

  it('covers ≥ 12 total spots across 3 segments (design.md driverow #4)', () => {
    let total = 0;
    let withScripture = 0;
    for (const seg of segments) {
      const path = resolve(__dirname, `../../../../stories/passion-week/${seg.file}`);
      const p = migrateProject(JSON.parse(readFileSync(path, 'utf8')));
      total += p.spots.length;
      withScripture += p.spots.filter((s) => s.scripture_refs && s.scripture_refs.length > 0).length;
    }
    expect(total).toBeGreaterThanOrEqual(12);
    expect(withScripture).toBeGreaterThanOrEqual(10);
  });
});

describe('migrateProject — v4 pendingLocation (010 D5)', () => {
  it('upgrades v3 input to v5 without data loss', () => {
    const p = migrateProject({
      ...validBase,
      version: 3,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x' }],
    });
    expect(p.version).toBe(5);
    expect(p.spots).toHaveLength(1);
    expect(p.spots[0].pendingLocation).toBeUndefined();
  });

  it('preserves pendingLocation=true on v4 re-import', () => {
    const p = migrateProject({
      ...validBase,
      version: 4,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', pendingLocation: true }],
    });
    expect(p.spots[0].pendingLocation).toBe(true);
  });

  it('strips non-boolean pendingLocation (spread bug defense)', () => {
    const p = migrateProject({
      ...validBase,
      version: 4,
      spots: [
        { id: 's1', latlng: [23.5, 121], title: 'x', pendingLocation: 'yes' },
        { id: 's2', latlng: [23.5, 121], title: 'y', pendingLocation: 1 },
        { id: 's3', latlng: [23.5, 121], title: 'z', pendingLocation: false },
      ],
    });
    expect(p.spots[0].pendingLocation).toBeUndefined();
    expect(p.spots[1].pendingLocation).toBeUndefined();
    expect(p.spots[2].pendingLocation).toBeUndefined();
  });
});

describe('migrateProject — v3.1 photoMeta / photo_query (013)', () => {
  const validMeta = {
    source: 'wikimedia-commons',
    license: 'CC BY-SA 3.0',
    author: 'AngMoKio',
    authorUrl: 'https://commons.wikimedia.org/wiki/User:AngMoKio',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
  };

  it('leaves photoMeta undefined for v3 input without the field', () => {
    const p = migrateProject({
      ...validBase,
      version: 3,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x' }],
    });
    expect(p.spots[0].photoMeta).toBeUndefined();
  });

  it('preserves all 5 photoMeta fields when valid', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', photoMeta: { ...validMeta } }],
    });
    expect(p.spots[0].photoMeta).toEqual(validMeta);
  });

  it('drops entire photoMeta when source is not wikimedia-commons (all-or-nothing)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', photoMeta: { ...validMeta, source: 'unsplash' } }],
    });
    expect(p.spots[0].photoMeta).toBeUndefined();
  });

  it('downgrades non-Wikimedia authorUrl to null but keeps photoMeta (attribution still shows)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{
        id: 's1', latlng: [23.5, 121], title: 'x',
        photoMeta: { ...validMeta, authorUrl: 'https://flickr.com/people/xxx' },
      }],
    });
    // photoMeta 保留，authorUrl 降級 null（避免 CC BY 合規漏洞）
    expect(p.spots[0].photoMeta).toBeDefined();
    expect(p.spots[0].photoMeta?.author).toBe('AngMoKio');
    expect(p.spots[0].photoMeta?.authorUrl).toBeNull();
  });

  it('keeps authorUrl when pointing to zh.wikipedia.org (common Commons Artist pattern)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{
        id: 's1', latlng: [23.5, 121], title: 'x',
        photoMeta: { ...validMeta, authorUrl: 'https://zh.wikipedia.org/wiki/User:Xxx' },
      }],
    });
    expect(p.spots[0].photoMeta?.authorUrl).toBe('https://zh.wikipedia.org/wiki/User:Xxx');
  });

  it('downgrades javascript: authorUrl to null (XSS defense)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{
        id: 's1', latlng: [23.5, 121], title: 'x',
        photoMeta: { ...validMeta, authorUrl: 'javascript:alert(1)' },
      }],
    });
    expect(p.spots[0].photoMeta).toBeDefined();
    expect(p.spots[0].photoMeta?.authorUrl).toBeNull();
  });

  it('keeps photoMeta when authorUrl is null (anonymous artist)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{
        id: 's1', latlng: [23.5, 121], title: 'x',
        photoMeta: { ...validMeta, authorUrl: null },
      }],
    });
    expect(p.spots[0].photoMeta?.authorUrl).toBeNull();
  });

  it('drops photoMeta when sourceUrl is non-Commons', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{
        id: 's1', latlng: [23.5, 121], title: 'x',
        photoMeta: { ...validMeta, sourceUrl: 'https://evil.com/steal' },
      }],
    });
    expect(p.spots[0].photoMeta).toBeUndefined();
  });

  it('preserves photo_query when string', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', photo_query: '台北101|Taipei 101' }],
    });
    expect(p.spots[0].photo_query).toBe('台北101|Taipei 101');
  });

  it('drops photo_query when not string (number / object)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [
        { id: 's1', latlng: [23.5, 121], title: 'x', photo_query: 123 },
        { id: 's2', latlng: [23.5, 121], title: 'y', photo_query: { q: 'x' } },
      ],
    });
    expect(p.spots[0].photo_query).toBeUndefined();
    expect(p.spots[1].photo_query).toBeUndefined();
  });

  it('clamps photo_query to 200 chars (data bomb defense)', () => {
    const long = 'x'.repeat(500);
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', photo_query: long }],
    });
    expect(p.spots[0].photo_query?.length).toBe(200);
  });
});

describe('migrateProject — spot.num clamp (賈詡 audit E2)', () => {
  const validBase = {
    version: 5,
    name: 'Test',
    center: [23.5, 121],
    zoom: 8,
    spots: [],
    routes: [],
  };

  it('clamps spot.num to <= 9999 (1e308 → 9999, prevents UI badge break)', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', num: 1e308 }],
    });
    expect(p.spots[0].num).toBe(9999);
  });

  it('falls back to spots.length+1 when spot.num is NaN', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', num: NaN }],
    });
    expect(p.spots[0].num).toBe(1);
  });

  it('falls back to spots.length+1 when spot.num is Infinity', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', num: Infinity }],
    });
    expect(p.spots[0].num).toBe(1);
  });

  it('preserves valid spot.num within [1, 9999]', () => {
    const p = migrateProject({
      ...validBase,
      spots: [{ id: 's1', latlng: [23.5, 121], title: 'x', num: 42 }],
    });
    expect(p.spots[0].num).toBe(42);
  });
});
