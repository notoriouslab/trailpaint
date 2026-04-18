import type { ImportBundle, GeoJsonFeatureCollection, GeoJsonFeature } from './geojsonImport';

// Defence against OOM from malicious huge FeatureCollection
// 500 is generous: one map rarely exceeds 200 spots + 50 routes
export const MAX_IMPORT_FEATURES = 500;
// String-size cap guards against a single feature with a million-point
// LineString slipping under the MAX_IMPORT_FEATURES limit. Aligned with
// migrateProject's MAX_PROJECT_SIZE.
export const MAX_JSON_BYTES = 20 * 1024 * 1024;

export function parseGeoJson(jsonString: string): ImportBundle {
  if (jsonString.length > MAX_JSON_BYTES) {
    throw new Error(`檔案過大（上限 ${Math.round(MAX_JSON_BYTES / 1024 / 1024)}MB）`);
  }

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
