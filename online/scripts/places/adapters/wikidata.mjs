#!/usr/bin/env node
/**
 * Wikidata → candidates, nationwide (020 D4). One SPARQL box query per county
 * (bbox from tw-towns.geojson), split into quadrants on timeout. Classes are
 * matched through P31/P279* against TOP_CLASSES. Years: P1619 (official
 * opening) = 'opened'; P571 (inception — often the institution's founding,
 * 019 evidence) = 'founded'. The zh.wikipedia sitelink is kept for the zhwiki
 * lookup in merge.mjs.
 *
 *   Run: node online/scripts/places/adapters/wikidata.mjs [縣市名…]
 */
import { spawnSync } from 'node:child_process';
import { cachePath, fetchJson, readJson, sleep, writeJson } from '../lib/cache.mjs';
import { makeCandidate } from '../lib/candidate.mjs';
import { loadTowns } from '../lib/towns.mjs';
import { parseYear } from '../lib/years.mjs';

const TOP_CLASSES = {
  Q3914: 'school', Q22698: 'park', Q55488: 'station', Q928830: 'station', Q16917: 'hospital',
  Q7075: 'library', Q1076486: 'sports', Q33506: 'museum', Q12280: 'bridge', Q40357: 'prison',
  Q44377: 'tunnel', Q1501476: 'funeral', Q327333: 'government',
};

function query([w, s, e, n]) {
  return `SELECT ?item ?coord ?top ?inception ?opening ?zhwiki ?tw ?hant ?zh WHERE {
  SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(${w} ${s})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${e} ${n})"^^geo:wktLiteral .
  }
  VALUES ?top { ${Object.keys(TOP_CLASSES).map((q) => `wd:${q}`).join(' ')} }
  ?item wdt:P31/wdt:P279* ?top .
  OPTIONAL { ?item wdt:P571 ?inception }
  OPTIONAL { ?item wdt:P1619 ?opening }
  OPTIONAL { ?zhwiki schema:about ?item ; schema:isPartOf <https://zh.wikipedia.org/> }
  OPTIONAL { ?item rdfs:label ?tw FILTER(lang(?tw) = "zh-tw") }
  OPTIONAL { ?item rdfs:label ?hant FILTER(lang(?hant) = "zh-hant") }
  OPTIONAL { ?item rdfs:label ?zh FILTER(lang(?zh) = "zh") }
}`;
}

async function run(bbox, depth = 0) {
  try {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query(bbox))}`;
    const res = await fetchJson(url, { headers: { Accept: 'application/sparql-results+json' } }, 3);
    return res.results.bindings;
  } catch (err) {
    if (depth >= 2) throw err;
    const [w, s, e, n] = bbox;
    const [mx, my] = [(w + e) / 2, (s + n) / 2];
    console.log(`  split (${err.message.slice(0, 40)})`);
    const parts = [[w, s, mx, my], [mx, s, e, my], [w, my, mx, n], [mx, my, e, n]];
    const rows = [];
    for (const p of parts) {
      rows.push(...(await run(p, depth + 1)));
      await sleep(2000);
    }
    return rows;
  }
}

/** Wikidata `zh` labels may be Simplified; convert those (only) in one opencc call. */
function labelsToTraditional(texts) {
  if (!texts.length) return [];
  const r = spawnSync('opencc', ['-c', 's2tw'], { input: texts.join('\n'), encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`opencc failed: ${r.stderr}`);
  return r.stdout.replace(/\n$/, '').split('\n');
}

/** SPARQL bindings (one row per item × class × year × label) → one record per item. */
export function aggregateRows(rows) {
  const items = new Map();
  for (const b of rows) {
    const qid = b.item.value.split('/').pop();
    const it = items.get(qid) ?? { qid, opening: [], inception: [], tops: new Set() };
    const m = b.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    if (m) it.latlng ??= [Number(m[2]), Number(m[1])];
    it.tops.add(b.top.value.split('/').pop());
    if (b.opening) it.opening.push(parseYear(b.opening.value));
    if (b.inception) it.inception.push(parseYear(b.inception.value));
    if (b.zhwiki) it.zhwiki = decodeURIComponent(b.zhwiki.value.split('/wiki/').pop());
    it.tw ??= b.tw?.value;
    it.hant ??= b.hant?.value;
    it.zh ??= b.zh?.value;
    items.set(qid, it);
  }
  return [...items.values()].filter((it) => it.latlng && (it.tw || it.hant || it.zh));
}

/**
 * Aggregated item → candidate. Earliest P1619 wins ('opened'), else earliest
 * P571 ('founded'). `it.name` must be set by the caller when only a `zh` label
 * exists (Simplified → Traditional conversion).
 */
export function itemToCandidate(it) {
  const opened = it.opening.filter(Boolean);
  const founded = it.inception.filter(Boolean);
  return makeCandidate({
    source: 'wikidata',
    sourceId: it.qid,
    tier: 'encyclopedic',
    name: (it.tw ?? it.hant ?? it.name).trim(),
    latlng: it.latlng,
    start: opened.length ? Math.min(...opened) : founded.length ? Math.min(...founded) : undefined,
    yearKind: opened.length ? 'opened' : founded.length ? 'founded' : undefined,
    category: TOP_CLASSES[[...it.tops][0]],
    url: `https://www.wikidata.org/wiki/${it.qid}`,
    ...(it.zhwiki ? { zhwiki: it.zhwiki } : {}),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const counties = new Map();
  for (const t of loadTowns()) {
    const b = counties.get(t.county) ?? [Infinity, Infinity, -Infinity, -Infinity];
    counties.set(t.county, [Math.min(b[0], t.bbox[0]), Math.min(b[1], t.bbox[1]), Math.max(b[2], t.bbox[2]), Math.max(b[3], t.bbox[3])]);
  }
  const only = process.argv.slice(2);
  const outPath = cachePath('candidates', 'wikidata.json');
  const byId = new Map((only.length ? readJson(outPath, []) : []).map((c) => [c.sourceId, c]));

  for (const [county, bbox] of counties) {
    if (only.length && !only.includes(county)) continue;
    const rows = await run(bbox.map((x) => Math.round(x * 1000) / 1000));
    const list = aggregateRows(rows);
    const needConv = list.filter((it) => !it.tw && !it.hant);
    labelsToTraditional(needConv.map((it) => it.zh)).forEach((name, i) => { needConv[i].name = name; });
    let kept = 0;
    for (const it of list) {
      const c = itemToCandidate(it);
      // county bbox overlaps neighbours — keep only points that really fall in this county
      if (c && loadTowns().find((t) => t.towncode === c.towncode).county === county) {
        byId.set(it.qid, c);
        kept++;
      }
    }
    console.log(`${county}: ${list.length} items → ${kept} candidates`);
    writeJson(outPath, [...byId.values()]);
    await sleep(2000);
  }
  console.log(`wikidata: ${byId.size} candidates total`);
}
