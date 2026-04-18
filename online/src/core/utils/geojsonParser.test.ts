import { describe, it, expect, beforeAll } from 'vitest';
import { parseGeoJson, MAX_IMPORT_FEATURES } from './geojsonParser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('geojsonParser', () => {
  let geojsonFixture: string;

  beforeAll(() => {
    const fixturePath = join(__dirname, '__fixtures__/geojson/takeout-saved-places.geojson');
    geojsonFixture = readFileSync(fixturePath, 'utf-8');
  });

  it('should parse valid FeatureCollection GeoJSON', () => {
    const result = parseGeoJson(geojsonFixture);
    expect(result).toHaveProperty('featureCollection');
    expect(result.featureCollection.type).toBe('FeatureCollection');
    expect(Array.isArray(result.featureCollection.features)).toBe(true);
    expect(result.featureCollection.features.length).toBeGreaterThan(0);
  });

  it('should parse Point features correctly', () => {
    const result = parseGeoJson(geojsonFixture);
    const pointFeature = result.featureCollection.features.find((f) => f.geometry.type === 'Point');
    expect(pointFeature).toBeDefined();
    expect(pointFeature!.geometry.type).toBe('Point');
    expect(pointFeature!.geometry.coordinates).toEqual([121.5, 25.05]);
  });

  it('should parse LineString features correctly', () => {
    const result = parseGeoJson(geojsonFixture);
    const lineFeature = result.featureCollection.features.find(
      (f) => f.geometry.type === 'LineString'
    );
    expect(lineFeature).toBeDefined();
    expect(lineFeature!.geometry.type).toBe('LineString');
    expect(Array.isArray(lineFeature!.geometry.coordinates)).toBe(true);
    expect(lineFeature!.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
  });

  it('should throw on invalid JSON', () => {
    const invalidJson = '{ invalid json }';
    expect(() => parseGeoJson(invalidJson)).toThrow('非有效 JSON');
  });

  it('should throw on JSON that is not a FeatureCollection', () => {
    const featureOnly = JSON.stringify({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {},
    });
    expect(() => parseGeoJson(featureOnly)).toThrow('非 GeoJSON FeatureCollection');
  });

  it('should throw on GeometryCollection instead of FeatureCollection', () => {
    const geometryCollection = JSON.stringify({
      type: 'GeometryCollection',
      geometries: [{ type: 'Point', coordinates: [0, 0] }],
    });
    expect(() => parseGeoJson(geometryCollection)).toThrow('非 GeoJSON FeatureCollection');
  });

  it('should throw when features is missing', () => {
    const noFeatures = JSON.stringify({
      type: 'FeatureCollection',
    });
    expect(() => parseGeoJson(noFeatures)).toThrow('非 GeoJSON FeatureCollection');
  });

  it('should throw when features is not an array', () => {
    const featuresNotArray = JSON.stringify({
      type: 'FeatureCollection',
      features: { type: 'Feature' },
    });
    expect(() => parseGeoJson(featuresNotArray)).toThrow('非 GeoJSON FeatureCollection');
  });

  it('should accept empty features array', () => {
    const emptyFeatures = JSON.stringify({
      type: 'FeatureCollection',
      features: [],
    });
    const result = parseGeoJson(emptyFeatures);
    expect(result.featureCollection.features.length).toBe(0);
  });

  it('should not include photoFiles in bundle', () => {
    const result = parseGeoJson(geojsonFixture);
    expect(result.photoFiles).toBeUndefined();
  });

  it('should return ImportBundle structure', () => {
    const result = parseGeoJson(geojsonFixture);
    expect(result).toHaveProperty('featureCollection');
    expect(Object.keys(result)).toEqual(['featureCollection']);
  });

  it('should preserve feature properties', () => {
    const result = parseGeoJson(geojsonFixture);
    const pointFeature = result.featureCollection.features.find((f) => f.geometry.type === 'Point');
    expect(pointFeature!.properties).toBeDefined();
    expect(pointFeature!.properties).toHaveProperty('title');
  });

  it('throws when features exceed MAX_IMPORT_FEATURES (DoS defence)', () => {
    const oversized = JSON.stringify({
      type: 'FeatureCollection',
      features: Array.from({ length: MAX_IMPORT_FEATURES + 1 }, () => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {},
      })),
    });
    expect(() => parseGeoJson(oversized)).toThrow(/features 數量超過上限/);
  });

  it('accepts features exactly at MAX_IMPORT_FEATURES', () => {
    const atLimit = JSON.stringify({
      type: 'FeatureCollection',
      features: Array.from({ length: MAX_IMPORT_FEATURES }, () => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {},
      })),
    });
    expect(() => parseGeoJson(atLimit)).not.toThrow();
  });

  it('returns a fresh features array (mutations do not leak to caller JSON)', () => {
    const json = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { title: 'a' } },
      ],
    });
    const result = parseGeoJson(json);
    result.featureCollection.features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [1, 1] },
      properties: { title: 'injected' },
    });
    // Re-parsing the original JSON string must still produce the original single feature
    const fresh = parseGeoJson(json);
    expect(fresh.featureCollection.features).toHaveLength(1);
  });

  it('should handle various property names (title, name, desc, description)', () => {
    const geojsonWithVariousProps = JSON.stringify({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { title: 'Title Test' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [1, 1] },
          properties: { name: 'Name Test' },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [2, 2] },
          properties: { description: 'Desc Test' },
        },
      ],
    });
    const result = parseGeoJson(geojsonWithVariousProps);
    expect(result.featureCollection.features.length).toBe(3);
    expect(result.featureCollection.features[0].properties!.title).toBe('Title Test');
    expect(result.featureCollection.features[1].properties!.name).toBe('Name Test');
    expect(result.featureCollection.features[2].properties!.description).toBe('Desc Test');
  });
});
