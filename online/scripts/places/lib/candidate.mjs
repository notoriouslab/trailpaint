/**
 * Unified candidate (020 D4). Adapters produce these; merge.mjs groups them.
 *   { source, sourceId, tier, name, latlng, start, yearKind, category, url,
 *     towncode, needsReview?, zhwiki? }
 */
import { townOf } from './towns.mjs';

export function makeCandidate(c) {
  const [lat, lng] = c.latlng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const towncode = townOf(lat, lng);
  if (!towncode) return null; // sea / outside Taiwan
  return { ...c, latlng: [round6(lat), round6(lng)], towncode };
}

const round6 = (x) => Math.round(x * 1e6) / 1e6;

/** Pool `sources[].title` for a candidate, by source. */
export const SOURCE_TITLE = {
  boch: (m) => `文化部文化資產局〈${m.name}〉`,
  'taipei-parks': () => '臺北市公園基本資料（政府資料開放平臺）',
  wikidata: (m) => `Wikidata ${m.sourceId}`,
  zhwiki: (m) => `維基百科〈${m.sourceId}〉`,
};
