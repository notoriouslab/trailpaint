import { kml } from '@tmcw/togeojson';
import type { ImportBundle, GeoJsonFeatureCollection } from './geojsonImport';

// String-size cap aligned with geojsonParser.MAX_JSON_BYTES to keep memory
// pressure from malicious KML payloads symmetric with GeoJSON.
export const MAX_KML_BYTES = 20 * 1024 * 1024;

export function parseKml(xmlString: string): ImportBundle {
  if (xmlString.length > MAX_KML_BYTES) {
    throw new Error(`檔案過大（上限 ${Math.round(MAX_KML_BYTES / 1024 / 1024)}MB）`);
  }

  let doc: Document;

  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlString, 'text/xml');
  } catch {
    throw new Error('非有效 KML');
  }

  // Check for parse error (XML malformed)
  // Use getElementsByTagName for compatibility with both browser DOM and @xmldom/xmldom
  const parseErrorElements = doc.getElementsByTagName('parsererror');
  if (parseErrorElements && parseErrorElements.length > 0) {
    throw new Error('非有效 KML');
  }

  let featureCollection: GeoJsonFeatureCollection;
  try {
    const result = kml(doc);
    if (!result || result.type !== 'FeatureCollection') {
      throw new Error('非有效 KML');
    }
    featureCollection = result as GeoJsonFeatureCollection;
  } catch {
    throw new Error('非有效 KML');
  }

  return {
    featureCollection,
  };
}
