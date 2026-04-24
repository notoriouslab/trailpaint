import { describe, it, expect } from 'vitest';
import { buildJsonLdWrapper, exportProjectWithJsonLd, JSON_LD_CONTEXT, JSON_LD_TYPE } from './jsonLdExport';
import { migrateProject } from './migrateProject';
import type { Project, Spot } from '../models/types';

function makeSpot(id: string, num: number, lat: number, lng: number, extra: Partial<Spot> = {}): Spot {
  return {
    id,
    latlng: [lat, lng],
    num,
    title: `Spot ${num}`,
    desc: `Description ${num}`,
    photo: null,
    iconId: 'camera',
    cardOffset: { x: 0, y: -60 },
    ...extra,
  };
}

function makeProject(spots: Spot[]): Project {
  return {
    version: 3,
    name: 'Test Story',
    center: [25.03, 121.51],
    zoom: 14,
    spots,
    routes: [],
  };
}

describe('buildJsonLdWrapper', () => {
  it('輸出含 @context、@type: [TouristTrip, tp:TrailStory]、itinerary', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const ld = buildJsonLdWrapper(project);

    expect(ld['@context']).toEqual(JSON_LD_CONTEXT);
    expect(ld['@type']).toEqual([...JSON_LD_TYPE]);
    expect(Array.isArray(ld.itinerary)).toBe(true);
    expect((ld.itinerary as unknown[]).length).toBe(1);
  });

  it('itinerary 按 spot.num 升冪排序（不依陣列輸入順序）', () => {
    const project = makeProject([
      makeSpot('s3', 3, 25.03, 121.51),
      makeSpot('s1', 1, 25.04, 121.52),
      makeSpot('s2', 2, 25.05, 121.53),
    ]);
    const ld = buildJsonLdWrapper(project);
    const itinerary = ld.itinerary as Array<{ name: string }>;
    expect(itinerary.map((e) => e.name)).toEqual(['Spot 1', 'Spot 2', 'Spot 3']);
  });

  it('每個 itinerary entry 有 Place + tp:Spot @type 與 GeoCoordinates', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const ld = buildJsonLdWrapper(project);
    const entry = (ld.itinerary as Array<Record<string, unknown>>)[0];
    expect(entry['@type']).toEqual(['Place', 'tp:Spot']);
    expect(entry.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 25.03,
      longitude: 121.51,
    });
  });

  it('有 photoMeta 的 spot 映射為 ImageObject + license + creator + contentUrl', () => {
    const spotWithPhoto = makeSpot('s1', 1, 25.03, 121.51, {
      photoMeta: {
        source: 'wikimedia-commons',
        license: 'CC BY-SA 4.0',
        author: 'Alice',
        authorUrl: 'https://commons.wikimedia.org/wiki/User:Alice',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Taipei.jpg',
      },
    });
    const project = makeProject([spotWithPhoto]);
    const ld = buildJsonLdWrapper(project);
    const entry = (ld.itinerary as Array<Record<string, unknown>>)[0];
    expect(entry.image).toEqual({
      '@type': 'ImageObject',
      license: 'CC BY-SA 4.0',
      creator: {
        '@type': 'Person',
        name: 'Alice',
        url: 'https://commons.wikimedia.org/wiki/User:Alice',
      },
      contentUrl: 'https://commons.wikimedia.org/wiki/File:Taipei.jpg',
      isAccessibleForFree: true,
    });
  });

  it('photoMeta.authorUrl 為 null 時 creator 無 url', () => {
    const spotNullUrl = makeSpot('s1', 1, 25.03, 121.51, {
      photoMeta: {
        source: 'wikimedia-commons',
        license: 'Public Domain',
        author: 'Bob',
        authorUrl: null,
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bob.jpg',
      },
    });
    const project = makeProject([spotNullUrl]);
    const ld = buildJsonLdWrapper(project);
    const entry = (ld.itinerary as Array<Record<string, unknown>>)[0];
    const creator = (entry.image as Record<string, unknown>).creator as Record<string, unknown>;
    expect(creator.url).toBeUndefined();
    expect(creator.name).toBe('Bob');
  });

  it('沒 photoMeta 的 spot 不產生 image 欄位', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const ld = buildJsonLdWrapper(project);
    const entry = (ld.itinerary as Array<Record<string, unknown>>)[0];
    expect(entry.image).toBeUndefined();
  });
});

describe('exportProjectWithJsonLd — 完整輸出', () => {
  it('@context / @type / itinerary 出現在前，後接原 project 欄位', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const json = exportProjectWithJsonLd(project);
    const parsed = JSON.parse(json);

    expect(parsed['@context']).toBeDefined();
    expect(parsed['@type']).toBeDefined();
    expect(parsed.itinerary).toBeDefined();
    // Native fields still present
    expect(parsed.version).toBe(3);
    expect(parsed.name).toBe('Test Story');
    expect(Array.isArray(parsed.spots)).toBe(true);
    expect(parsed.spots[0].id).toBe('s1');
  });

  it('JSON 輸出為人類可讀格式（indent=2）', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const json = exportProjectWithJsonLd(project);
    expect(json.includes('\n  "@context"')).toBe(true);
  });
});

describe('round-trip: exportProjectWithJsonLd → migrateProject', () => {
  it('migrate 後移除 @context / @type / itinerary（不污染 Project）', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const json = exportProjectWithJsonLd(project);
    const raw = JSON.parse(json);
    const migrated = migrateProject(raw) as unknown as Record<string, unknown>;

    expect(migrated['@context']).toBeUndefined();
    expect(migrated['@type']).toBeUndefined();
    expect(migrated.itinerary).toBeUndefined();
  });

  it('migrate 後 spots / routes / name / center 完整保留', () => {
    const project = makeProject([
      makeSpot('s1', 1, 25.03, 121.51),
      makeSpot('s2', 2, 25.04, 121.52),
    ]);
    const json = exportProjectWithJsonLd(project);
    const raw = JSON.parse(json);
    const migrated = migrateProject(raw);

    expect(migrated.name).toBe('Test Story');
    expect(migrated.center).toEqual([25.03, 121.51]);
    expect(migrated.zoom).toBe(14);
    expect(migrated.spots.length).toBe(2);
    expect(migrated.spots[0].id).toBe('s1');
    expect(migrated.spots[1].id).toBe('s2');
  });

  it('舊格式（無 @context）仍能 migrate（backward compat）', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const legacyJson = JSON.stringify(project);
    const raw = JSON.parse(legacyJson);
    const migrated = migrateProject(raw);

    expect(migrated.spots.length).toBe(1);
    expect(migrated.name).toBe('Test Story');
  });
});
