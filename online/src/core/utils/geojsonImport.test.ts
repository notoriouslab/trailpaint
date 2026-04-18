import { describe, it, expect } from 'vitest';
import { geojsonToImport, type GeoJsonFeatureCollection } from './geojsonImport';

const opts = {
  startingSpotNum: 0,
  startingRouteColorIdx: 0,
  mapCenter: [23.5, 121] as [number, number],
};

describe('geojsonToImport — Point → Spot', () => {
  it('converts single Point, swapping [lng,lat] → [lat,lng]', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [121.5654, 25.0330] },
          properties: { title: '台北 101', desc: 'landmark' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.spots).toHaveLength(1);
    const spot = result.spots[0];
    expect(spot.latlng).toEqual([25.0330, 121.5654]);
    expect(spot.num).toBe(1);
    expect(spot.title).toBe('台北 101');
    expect(spot.desc).toBe('landmark');
    expect(spot.iconId).toBe('pin');
    expect(spot.photo).toBeNull();
    expect(result.routes).toHaveLength(0);
  });

  it('sets pendingLocation when properties.pendingLocation is true', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [121, 23.5] },
          properties: { title: 'photo-1', pendingLocation: true },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.spots[0].pendingLocation).toBe(true);
  });

  it('maps photoRef → spotPhotoMap using spot.id as key', () => {
    const file = new File(['fake'], 'IMG_1.jpg', { type: 'image/jpeg' });
    const photoFiles = new Map<string, File>([['IMG_1.jpg::0', file]]);
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [121, 23.5] },
          properties: { title: '2026-04-17 14:30', photoRef: 'IMG_1.jpg::0' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc, photoFiles }, opts);
    const spot = result.spots[0];
    expect(result.spotPhotoMap).toBeDefined();
    expect(result.spotPhotoMap!.get(spot.id)).toBe(file);
  });

  it('honors startingSpotNum when numbering spots', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { title: 'a' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: { title: 'b' } },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, { ...opts, startingSpotNum: 5 });
    expect(result.spots.map((s) => s.num)).toEqual([6, 7]);
  });
});

describe('geojsonToImport — LineString → Route', () => {
  it('converts single LineString, swaps coords, uses default color', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[121, 23], [122, 24], [123, 25]] },
          properties: { name: 'Trail A' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.routes).toHaveLength(1);
    const route = result.routes[0];
    expect(route.pts).toEqual([[23, 121], [24, 122], [25, 123]]);
    expect(route.name).toBe('Trail A');
    expect(route.color).toBe('orange');
    expect(route.elevations).toBeNull();
  });

  it('skips LineString with fewer than 2 points', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[121, 23]] },
          properties: { name: 'too short' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.routes).toHaveLength(0);
  });

  it('cycles through ROUTE_COLORS based on startingRouteColorIdx', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: Array.from({ length: 3 }, (_, i) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [[i, 0], [i + 1, 0]] as [number, number][],
        },
        properties: { name: `route ${i}` },
      })),
    };
    const result = geojsonToImport({ featureCollection: fc }, { ...opts, startingRouteColorIdx: 4 });
    // ROUTE_COLORS order: orange(0), blue(1), green(2), red(3), purple(4)
    expect(result.routes.map((r) => r.color)).toEqual(['purple', 'orange', 'blue']);
  });
});

describe('geojsonToImport — MultiLineString → N Routes (D8)', () => {
  it('splits MultiLineString into independent routes sharing the parent name', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[121, 23], [122, 24]],
              [[125, 30], [126, 31], [127, 32]],
            ],
          },
          properties: { name: 'Trail Combined' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.routes).toHaveLength(2);
    expect(result.routes[0].pts).toEqual([[23, 121], [24, 122]]);
    expect(result.routes[1].pts).toEqual([[30, 125], [31, 126], [32, 127]]);
    expect(result.routes[0].name).toBe('Trail Combined');
    expect(result.routes[1].name).toBe('Trail Combined');
    // Each segment uses next color in cycle
    expect(result.routes[0].color).toBe('orange');
    expect(result.routes[1].color).toBe('blue');
  });

  it('skips empty/degenerate segments inside MultiLineString', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[121, 23], [122, 24]],
              [[125, 30]], // only 1 point — skip
            ],
          },
          properties: { name: 'mixed' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.routes).toHaveLength(1);
  });
});

describe('geojsonToImport — unsupported geometries (D8)', () => {
  it('counts Polygon as unsupported and skips it', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
          },
          properties: {},
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { title: 'kept' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.spots).toHaveLength(1);
    expect(result.routes).toHaveLength(0);
    expect(result.unsupportedCount).toBe(1);
  });

  it('counts GeometryCollection and MultiPolygon as unsupported', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'GeometryCollection',
            geometries: [],
          },
          properties: {},
        },
        {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [],
          },
          properties: {},
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.unsupportedCount).toBe(2);
  });
});

describe('geojsonToImport — coordinate validation (A1/A2/L1)', () => {
  it('skips Point with less-than-2 coordinates, counts unsupported', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [121] as unknown as [number, number] }, properties: { title: 'broken' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [121, 25] }, properties: { title: 'ok' } },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.spots).toHaveLength(1);
    expect(result.spots[0].title).toBe('ok');
    expect(result.unsupportedCount).toBe(1);
  });

  it('skips Point with out-of-range lat/lng', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [999, -999] }, properties: { title: 'outside' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 91] }, properties: { title: 'lat>90' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [181, 0] }, properties: { title: 'lng>180' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [121, 25] }, properties: { title: 'ok' } },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.spots).toHaveLength(1);
    expect(result.spots[0].title).toBe('ok');
    expect(result.unsupportedCount).toBe(3);
  });

  it('filters out invalid points inside a LineString, keeps remaining', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[121, 25], [999, 999], [122, 26], [NaN, 0]] as [number, number][],
          },
          properties: { name: 'trail' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].pts).toEqual([[25, 121], [26, 122]]);
  });

  it('skips LineString with non-array coordinates', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: null as unknown as [number, number][] },
          properties: { name: 'broken' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.routes).toHaveLength(0);
  });
});

describe('geojsonToImport — defaults & edge cases', () => {
  it('falls back to "Spot N" title when properties has no title/name', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, { ...opts, defaultSpotTitle: 'Spot' });
    expect(result.spots[0].title).toBe('Spot 1');
  });

  it('ignores photoRef when bundle has no photoFiles map', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { photoRef: 'missing.jpg::0' },
        },
      ],
    };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.spotPhotoMap).toBeUndefined();
  });

  it('returns empty result for empty FeatureCollection', () => {
    const fc: GeoJsonFeatureCollection = { type: 'FeatureCollection', features: [] };
    const result = geojsonToImport({ featureCollection: fc }, opts);
    expect(result.spots).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.spotPhotoMap).toBeUndefined();
    expect(result.unsupportedCount).toBeUndefined();
  });
});
