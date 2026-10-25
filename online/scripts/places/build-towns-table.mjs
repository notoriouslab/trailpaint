#!/usr/bin/env node
/**
 * Build data/places/tw/towns.json — TOWNCODE → { county, town, countySlug, townSlug } (020 D3).
 * Township list and Chinese names come from data/geo/tw-towns.geojson (NLSC);
 * Wikidata only supplies the English label (P5020 8-digit code = TOWNCODE).
 *
 *   Run: node online/scripts/places/build-towns-table.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTowns } from './lib/towns.mjs';
import { townSlug } from './lib/slug.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', '..', '..', 'data', 'places', 'tw', 'towns.json');
const UA = 'TrailPaint-places/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint)';

const COUNTY_SLUGS = {
  臺北市: 'taipei', 新北市: 'new-taipei', 桃園市: 'taoyuan', 臺中市: 'taichung',
  臺南市: 'tainan', 高雄市: 'kaohsiung', 基隆市: 'keelung', 新竹市: 'hsinchu-city',
  嘉義市: 'chiayi-city', 新竹縣: 'hsinchu-county', 苗栗縣: 'miaoli', 彰化縣: 'changhua',
  南投縣: 'nantou', 雲林縣: 'yunlin', 嘉義縣: 'chiayi-county', 屏東縣: 'pingtung',
  宜蘭縣: 'yilan', 花蓮縣: 'hualien', 臺東縣: 'taitung', 澎湖縣: 'penghu',
  金門縣: 'kinmen', 連江縣: 'lienchiang',
};

// Manual fixes where the Wikidata label breaks the common pattern
// (臺南市東區 is labelled "Eastern District"; every other 東區 is "East").
const SLUG_OVERRIDES = {
  67000320: 'east',
};

const query = `SELECT ?code ?en WHERE {
  ?item wdt:P5020 ?code . FILTER(STRLEN(?code) = 8)
  ?item rdfs:label ?en FILTER(lang(?en) = "en")
}`;
const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
  headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA },
});
if (!res.ok) throw new Error(`SPARQL ${res.status}`);
const enByCode = new Map((await res.json()).results.bindings.map((b) => [b.code.value, b.en.value]));

const table = {};
const problems = [];
for (const t of loadTowns().sort((a, b) => a.towncode.localeCompare(b.towncode))) {
  const countySlug = COUNTY_SLUGS[t.county];
  const en = enByCode.get(t.towncode);
  if (!countySlug) problems.push(`${t.towncode} ${t.county}: no county slug`);
  if (!en) problems.push(`${t.towncode} ${t.county}${t.town}: no Wikidata English label`);
  table[t.towncode] = { county: t.county, town: t.town, countySlug, townSlug: SLUG_OVERRIDES[t.towncode] ?? (en ? townSlug(en) : null) };
}

// Slugs must be unique within a county (they become /taiwan/<county>/<town>/ paths)
const seen = new Map();
for (const [code, v] of Object.entries(table)) {
  const key = `${v.countySlug}/${v.townSlug}`;
  if (seen.has(key)) problems.push(`slug clash ${key}: ${seen.get(key)} vs ${code}`);
  seen.set(key, code);
}

writeFileSync(OUT, JSON.stringify(table, null, 2) + '\n');
console.log(`wrote ${Object.keys(table).length} towns → ${OUT}`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
