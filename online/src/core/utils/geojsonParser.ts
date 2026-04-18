import type { ImportBundle, GeoJsonFeatureCollection, GeoJsonFeature } from './geojsonImport';

// Defence against OOM from malicious huge FeatureCollection
// 500 is generous: one map rarely exceeds 200 spots + 50 routes
export const MAX_IMPORT_FEATURES = 500;

export function parseGeoJson(jsonString: string): ImportBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('非有效 JSON');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('type' in parsed) ||
    parsed.type !== 'FeatureCollection'
  ) {
    throw new Error('非 GeoJSON FeatureCollection');
  }

  if (!('features' in parsed) || !Array.isArray(parsed.features)) {
    throw new Error('非 GeoJSON FeatureCollection');
  }

  if (parsed.features.length > MAX_IMPORT_FEATURES) {
    throw new Error(`features 數量超過上限（${MAX_IMPORT_FEATURES}）`);
  }

  // Shallow-copy the features array so downstream mutation cannot leak back
  // into the caller's original JSON object.
  const featureCollection: GeoJsonFeatureCollection = {
    type: 'FeatureCollection',
    features: [...(parsed.features as GeoJsonFeature[])],
  };

  return { featureCollection };
}
