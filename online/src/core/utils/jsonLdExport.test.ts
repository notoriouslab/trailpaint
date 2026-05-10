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

type ItemList = {
  '@type': string;
  itemListOrder: string;
  numberOfItems: number;
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    item: Record<string, unknown>;
  }>;
};

describe('buildJsonLdWrapper', () => {
  it('輸出含 @context、@type: [TouristTrip, tp:TrailStory]、itinerary (ItemList)', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const ld = buildJsonLdWrapper(project);

    expect(ld['@context']).toEqual(JSON_LD_CONTEXT);
    expect(ld['@type']).toEqual([...JSON_LD_TYPE]);
    const itin = ld.itinerary as ItemList;
    expect(itin['@type']).toBe('ItemList');
    expect(itin.numberOfItems).toBe(1);
    expect(Array.isArray(itin.itemListElement)).toBe(true);
  });

  it('tp: namespace 指向 /ns/v3/（非 schema 檔案 $defs fragment）', () => {
    expect(JSON_LD_CONTEXT.tp).toBe('https://trailpaint.org/ns/v3/');
  });

  it('itinerary 按 spot.num 升冪排序，包 ListItem 並帶 position', () => {
    const project = makeProject([
      makeSpot('s3', 3, 25.03, 121.51),
      makeSpot('s1', 1, 25.04, 121.52),
      makeSpot('s2', 2, 25.05, 121.53),
    ]);
    const itin = buildJsonLdWrapper(project).itinerary as ItemList;
    const items = itin.itemListElement;
    expect(items.map((e) => e.position)).toEqual([1, 2, 3]);
    expect(items.map((e) => (e.item as { name: string }).name)).toEqual(['Spot 1', 'Spot 2', 'Spot 3']);
    expect(items.every((e) => e['@type'] === 'ListItem')).toBe(true);
  });

  it('每個 Place item 有 Place + tp:Spot @type、GeoCoordinates、identifier (iconId)', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51, { iconId: 'church' })]);
    const itin = buildJsonLdWrapper(project).itinerary as ItemList;
    const entry = itin.itemListElement[0].item;
    expect(entry['@type']).toEqual(['Place', 'tp:Spot']);
    expect(entry.geo).toEqual({
      '@type': 'GeoCoordinates',
      latitude: 25.03,
      longitude: 121.51,
    });
    expect(entry.identifier).toBe('church');
  });

  it('scripture_refs 映射到 schema.org citation', () => {
    const spot = makeSpot('s1', 1, 25.03, 121.51, { scripture_refs: ['Acts 13:4-12', 'Matt 16:13'] });
    const itin = buildJsonLdWrapper(makeProject([spot])).itinerary as ItemList;
    const entry = itin.itemListElement[0].item;
    expect(entry.citation).toEqual(['Acts 13:4-12', 'Matt 16:13']);
  });

  it('photoMeta 映射為 ImageObject，license 字串 → CC URL', () => {
    const spot = makeSpot('s1', 1, 25.03, 121.51, {
      photoMeta: {
        source: 'wikimedia-commons',
        license: 'CC BY-SA 4.0',
        author: 'Alice',
        authorUrl: 'https://commons.wikimedia.org/wiki/User:Alice',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Taipei.jpg',
      },
    });
    const itin = buildJsonLdWrapper(makeProject([spot])).itinerary as ItemList;
    const img = (itin.itemListElement[0].item as { image: Record<string, unknown> }).image;
    expect(img['@type']).toBe('ImageObject');
    expect(img.license).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(img.creator).toEqual({
      '@type': 'Person',
      name: 'Alice',
      url: 'https://commons.wikimedia.org/wiki/User:Alice',
    });
    expect(img.contentUrl).toBe('https://commons.wikimedia.org/wiki/File:Taipei.jpg');
  });

  it('未知 license → 包 CreativeWork（schema.org 規範有效）', () => {
    const spot = makeSpot('s1', 1, 25.03, 121.51, {
      photoMeta: {
        source: 'wikimedia-commons',
        license: 'GFDL',
        author: 'Bob',
        authorUrl: null,
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:B.jpg',
      },
    });
    const itin = buildJsonLdWrapper(makeProject([spot])).itinerary as ItemList;
    const img = (itin.itemListElement[0].item as { image: Record<string, unknown> }).image;
    expect(img.license).toEqual({ '@type': 'CreativeWork', name: 'GFDL' });
  });

  it('authorUrl=null 時 creator 無 url', () => {
    const spot = makeSpot('s1', 1, 25.03, 121.51, {
      photoMeta: {
        source: 'wikimedia-commons',
        license: 'Public Domain',
        author: 'Bob',
        authorUrl: null,
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bob.jpg',
      },
    });
    const itin = buildJsonLdWrapper(makeProject([spot])).itinerary as ItemList;
    const creator = ((itin.itemListElement[0].item as { image: Record<string, unknown> }).image.creator) as Record<string, unknown>;
    expect(creator.url).toBeUndefined();
    expect(creator.name).toBe('Bob');
  });

  it('沒 photoMeta 的 spot 不產生 image 欄位', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const itin = buildJsonLdWrapper(project).itinerary as ItemList;
    expect(itin.itemListElement[0].item.image).toBeUndefined();
  });

  it('itinerary 不超過 200 (defensive cap)', () => {
    const manySpots = Array.from({ length: 250 }, (_, i) => makeSpot(`s${i}`, i + 1, 25, 121 + i * 0.01));
    const project = makeProject(manySpots);
    const itin = buildJsonLdWrapper(project).itinerary as ItemList;
    expect(itin.numberOfItems).toBe(200);
    expect(itin.itemListElement.length).toBe(200);
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
    expect(parsed.itinerary['@type']).toBe('ItemList');
    // Native fields still present
    expect(parsed.version).toBe(3);
    expect(parsed.name).toBe('Test Story');
    expect(parsed.spots[0].id).toBe('s1');
  });
});

describe('round-trip: exportProjectWithJsonLd → migrateProject', () => {
  it('migrate 後移除頂層 @context / @type / itinerary', () => {
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
    const migrated = migrateProject(JSON.parse(json));

    expect(migrated.name).toBe('Test Story');
    expect(migrated.center).toEqual([25.03, 121.51]);
    expect(migrated.spots.length).toBe(2);
    expect(migrated.spots[0].id).toBe('s1');
  });

  it('舊格式（無 @context）仍能 migrate（backward compat）', () => {
    const project = makeProject([makeSpot('s1', 1, 25.03, 121.51)]);
    const legacyJson = JSON.stringify(project);
    const migrated = migrateProject(JSON.parse(legacyJson));
    expect(migrated.spots.length).toBe(1);
    expect(migrated.name).toBe('Test Story');
  });
});

describe('migrateProject deep-strip — 防 AI 污染放大器攻擊', () => {
  it('攻擊者塞 spot[i].@type / @id / itinerary 會被 strip', () => {
    const malicious = {
      version: 3,
      name: 'Attack',
      center: [0, 0],
      zoom: 1,
      routes: [],
      spots: [{
        id: 's1',
        latlng: [0, 0],
        num: 1,
        title: 't',
        desc: 'd',
        photo: null,
        iconId: 'pin',
        cardOffset: { x: 0, y: 0 },
        '@type': 'TouristAttraction',
        '@id': 'https://evil.example/spoof',
        '@context': 'https://evil.example/ctx',
        itinerary: [{ '@type': 'Place', geo: { latitude: 99 } }],
      }],
    } as unknown as Record<string, unknown>;
    const migrated = migrateProject(malicious);
    const spot = migrated.spots[0] as unknown as Record<string, unknown>;
    expect(spot['@type']).toBeUndefined();
    expect(spot['@id']).toBeUndefined();
    expect(spot['@context']).toBeUndefined();
    expect(spot.itinerary).toBeUndefined();
  });

  it('攻擊者塞 route[i].@id 會被 strip', () => {
    const malicious = {
      version: 3,
      name: 'Attack',
      center: [0, 0],
      zoom: 1,
      spots: [],
      routes: [{
        id: 'r1',
        name: 'route',
        pts: [[0, 0], [1, 1]],
        color: 'orange',
        '@id': 'https://evil/',
        '@type': 'Journey',
      }],
    } as unknown as Record<string, unknown>;
    const migrated = migrateProject(malicious);
    const route = migrated.routes[0] as unknown as Record<string, unknown>;
    expect(route['@type']).toBeUndefined();
    expect(route['@id']).toBeUndefined();
  });

  it('photoMeta.author 的 RTL override / 零寬字元被移除', () => {
    const data = {
      version: 3,
      name: 'X',
      center: [0, 0],
      zoom: 1,
      routes: [],
      spots: [{
        id: 's1',
        latlng: [0, 0],
        num: 1,
        title: 't',
        desc: 'd',
        photo: null,
        iconId: 'pin',
        cardOffset: { x: 0, y: 0 },
        photoMeta: {
          source: 'wikimedia-commons',
          license: 'CC BY-SA 4.0',
          author: 'Alice‮gpj.live/​',
          authorUrl: null,
          sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
        },
      }],
    } as unknown as Record<string, unknown>;
    const migrated = migrateProject(data);
    const spot = migrated.spots[0];
    expect(spot.photoMeta?.author).toBe('Alicegpj.live/');
  });
});
