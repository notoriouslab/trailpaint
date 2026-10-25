#!/usr/bin/env node
/**
 * 文化部文資局 古蹟 (data.boch.gov.tw assetsCase 1.1) → candidates (020 D4).
 * The build year only exists in the pastHistory text; yearsFromHistory keeps
 * years tied to a build/found keyword. First 'opened' year wins, else first
 * 'founded'. Only public-facility types; mixed types (其他設施/產業) are kept
 * but flagged for manual review (they include waterworks but also shrines).
 *
 *   Run: node online/scripts/places/adapters/boch.mjs
 */
import { cachePath, fetchJson, writeJson } from '../lib/cache.mjs';
import { makeCandidate } from '../lib/candidate.mjs';
import { yearsFromHistory } from '../lib/years.mjs';

const API = 'https://data.boch.gov.tw/opendata/v2/assetsCase/1.1.json';
const PUBLIC = {
  學校: 'school', 書院: 'school', 衙署: 'government', 機關: 'government', 辦公廳舍: 'government',
  官邸: 'government', 車站: 'station', 橋樑: 'bridge', 燈塔: 'lighthouse', 醫院: 'hospital',
  堤閘: 'waterworks', 城郭: 'fortification', 關塞: 'fortification', 集會堂: 'hall', 市場: 'market',
};
const MIXED = { 其他設施: 'other', 產業: 'industry' };

/** One 古蹟 row → candidate, or null when not a public facility / outside Taiwan. */
export function bochToCandidate(r) {
  const types = (r.assetsTypes ?? []).map((t) => t.name);
  const pub = types.find((t) => PUBLIC[t]);
  const mixed = !pub && types.find((t) => MIXED[t]);
  if (!pub && !mixed) return null;
  const years = yearsFromHistory(r.pastHistory);
  const y = years.find((x) => x.kind === 'opened') ?? years[0];
  return makeCandidate({
    source: 'boch',
    sourceId: r.caseId,
    tier: 'official',
    name: r.caseName.trim(),
    latlng: [Number(r.latitude), Number(r.longitude)],
    start: y?.year,
    yearKind: y?.kind,
    category: pub ? PUBLIC[pub] : MIXED[mixed],
    url: `https://nchdb.boch.gov.tw/assets/overview/monument/${r.caseId}`,
    about: r.pastHistory, // official history → desc material (D6)
    ...(mixed ? { needsReview: 'category-check' } : {}),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await fetchJson(API);
  const out = rows.map(bochToCandidate).filter(Boolean);
  writeJson(cachePath('candidates', 'boch.json'), out);
  console.log(`boch: ${rows.length} rows → ${out.length} public candidates (${out.filter((c) => c.start).length} with year, ${out.filter((c) => c.needsReview).length} flagged)`);
}
