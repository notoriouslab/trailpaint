#!/usr/bin/env node
/**
 * 臺北市公園 (parks.gov.taipei, data.gov.tw #128366) → candidates (020 D4).
 * pm_const_year = 開闢年 (opened); some rows use 民國 years.
 *
 *   Run: node online/scripts/places/adapters/taipei-parks.mjs
 */
import { cachePath, fetchJson, writeJson } from '../lib/cache.mjs';
import { makeCandidate } from '../lib/candidate.mjs';
import { parseYear } from '../lib/years.mjs';

const API = 'https://parks.gov.taipei/parks/api/';

export function parkToCandidate(r) {
  return makeCandidate({
    source: 'taipei-parks',
    sourceId: r.SeqNo,
    tier: 'official',
    name: r.pm_name.trim(),
    latlng: [Number(r.pm_Latitude), Number(r.pm_Longitude)],
    start: parseYear(r.pm_const_year) ?? undefined,
    yearKind: 'opened',
    category: 'park',
    url: 'https://data.gov.tw/dataset/128366',
    region: r.pm_regions, // kept only for the townOf sanity check (D2 risk row)
    about: r.pm_overview, // official description → desc material (D6)
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await fetchJson(API);
  const out = rows.map(parkToCandidate).filter(Boolean);
  writeJson(cachePath('candidates', 'taipei-parks.json'), out);
  console.log(`taipei-parks: ${rows.length} rows → ${out.length} candidates (${out.filter((c) => c.start).length} with year)`);
}
