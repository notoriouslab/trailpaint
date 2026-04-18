import { describe, it, expect, beforeAll } from 'vitest';
import { DOMParser as XmlDOMParser } from '@xmldom/xmldom';
import { parseKml, MAX_KML_BYTES } from './kmlParser';
import { readFileSync } from 'fs';
import { join } from 'path';

// Polyfill DOMParser for Node.js environment
if (typeof globalThis.DOMParser === 'undefined') {
  (globalThis as any).DOMParser = XmlDOMParser;
}

describe('kmlParser', () => {
  let kmlFixture: string;

  beforeAll(() => {
    const fixturePath = join(__dirname, '__fixtures__/kml/google-my-maps.kml');
    kmlFixture = readFileSync(fixturePath, 'utf-8');
  });

  it('throws when KML string exceeds MAX_KML_BYTES (DoS defence)', () => {
    const giant = 'x'.repeat(MAX_KML_BYTES + 1);
    expect(() => parseKml(giant)).toThrow(/檔案過大/);
  });

  it('should parse valid KML with points and lines', () => {
    const result = parseKml(kmlFixture);
    expect(result).toHaveProperty('featureCollection');
    expect(result.featureCollection.type).toBe('FeatureCollection');
    expect(Array.isArray(result.featureCollection.features)).toBe(true);
    expect(result.featureCollection.features.length).toBeGreaterThan(0);
  });

  it('should parse Point features correctly', () => {
    const result = parseKml(kmlFixture);
    const pointFeature = result.featureCollection.features.find((f) => f.geometry.type === 'Point');
    expect(pointFeature).toBeDefined();
    expect(pointFeature!.geometry.type).toBe('Point');
    expect(Array.isArray(pointFeature!.geometry.coordinates)).toBe(true);
    // GeoJSON Point coordinates are [lng, lat], KML may include elevation (3rd element)
    expect(pointFeature!.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
  });

  it('should parse LineString features correctly', () => {
    const result = parseKml(kmlFixture);
    const lineFeature = result.featureCollection.features.find((f) => f.geometry.type === 'LineString');
    expect(lineFeature).toBeDefined();
    expect(lineFeature!.geometry.type).toBe('LineString');
    expect(Array.isArray(lineFeature!.geometry.coordinates)).toBe(true);
    expect(lineFeature!.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle MultiGeometry (multiple LineStrings)', () => {
    const result = parseKml(kmlFixture);
    const allFeatures = result.featureCollection.features;
    // The fixture has a Placemark with MultiGeometry containing multiple LineStrings
    // togeojson should flatten these into separate features or a MultiLineString
    expect(allFeatures.length).toBeGreaterThan(0);
  });

  it('should throw on invalid/malformed XML', () => {
    const malformedKml = '<kml><Document><Placemark><Point><coordinates>';
    expect(() => parseKml(malformedKml)).toThrow('非有效 KML');
  });

  it('should handle non-KML valid XML gracefully (empty result)', () => {
    // Non-KML but valid XML will parse successfully but togeojson returns empty FeatureCollection
    const validXmlNotKml = '<?xml version="1.0"?><root><element>text</element></root>';
    const result = parseKml(validXmlNotKml);
    expect(result.featureCollection.type).toBe('FeatureCollection');
    // togeojson returns empty features for non-KML
    expect(result.featureCollection.features.length).toBe(0);
  });

  it('should handle empty KML (no placemarks)', () => {
    const emptyKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Empty Map</name>
  </Document>
</kml>`;
    const result = parseKml(emptyKml);
    expect(result.featureCollection.type).toBe('FeatureCollection');
    expect(result.featureCollection.features.length).toBe(0);
  });

  it('should not include photoFiles in bundle', () => {
    const result = parseKml(kmlFixture);
    expect(result.photoFiles).toBeUndefined();
  });

  it('should return ImportBundle structure', () => {
    const result = parseKml(kmlFixture);
    expect(result).toHaveProperty('featureCollection');
    expect(Object.keys(result)).toEqual(['featureCollection']);
  });

  it('should preserve properties from KML elements', () => {
    const result = parseKml(kmlFixture);
    const pointFeature = result.featureCollection.features.find((f) => f.geometry.type === 'Point');
    expect(pointFeature).toBeDefined();
    // togeojson converts KML name/description to properties
    expect(pointFeature!.properties).toBeDefined();
  });
});
