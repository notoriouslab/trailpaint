#!/usr/bin/env node
/**
 * Basemap gap report (020 D9): verified facilities per county × decade, the
 * basemap cumulative mode shows for that decade, and how many years older
 * the map is than the decade.
 *
 *   node online/scripts/places/era-gap-report.mjs <out.md>
 *
 * Bundles era-entry.ts with rolldown first so the report uses the exact
 * front-end overlayForYear / getRelevantOverlayIds.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CACHE_DIR, ONLINE_DIR, POOL_DIR, readJson } from './lib/cache.mjs';

const out = process.argv[2];
if (!out) {
  console.error('usage: era-gap-report.mjs <out.md>');
  process.exit(1);
}

const bundle = join(CACHE_DIR, 'era.mjs');
const r = spawnSync('npx', ['rolldown', 'scripts/places/era-entry.ts', '--format', 'esm', '--platform', 'node', '-o', bundle], {
  cwd: ONLINE_DIR, encoding: 'utf8',
});
if (r.status !== 0) throw new Error(`rolldown failed: ${r.stderr}`);
const { overlayForYear, getRelevantOverlayIds } = await import(pathToFileURL(bundle).href);

const byCounty = new Map();
for (const f of readdirSync(POOL_DIR).filter((f) => /^\d{8}\.json$/.test(f))) {
  const pool = readJson(join(POOL_DIR, f));
  const list = byCounty.get(pool.county) ?? [];
  list.push(...pool.items);
  byCounty.set(pool.county, list);
}

const lines = ['# 底圖缺口報告（020 D9）', '', `產生日期：${new Date().toISOString().slice(0, 10)}。底圖 = cumulative 模式在該十年最後一年（例如 1970 年代取 1979）顯示的歷史圖；落差 = 該年減去底圖年份。`, ''];
let total = 0;
for (const [county, items] of byCounty) {
  const relevant = getRelevantOverlayIds(items.map((it) => it.latlng));
  const decades = new Map();
  for (const it of items) {
    const decade = Math.floor(it.start / 10) * 10;
    decades.set(decade, (decades.get(decade) ?? 0) + 1);
  }
  total += items.length;
  lines.push(`## ${county}（${items.length} 筆）`, '', '| 十年 | 設施數 | 底圖 | 落差（年） |', '|---|---|---|---|');
  for (const decade of [...decades.keys()].sort((a, b) => a - b)) {
    const year = decade + 9;
    const id = overlayForYear(year, relevant);
    const mapYear = id ? Number(id.match(/(\d{4})$/)?.[1]) : null;
    const gap = id ? (Number.isFinite(mapYear) ? year - mapYear : '?') : '—';
    lines.push(`| ${decade}s | ${decades.get(decade)} | ${id ?? '現代底圖'} | ${gap} |`);
  }
  lines.push('');
}
lines.push(`總計 ${total} 筆。`, '');
writeFileSync(out, lines.join('\n'));
console.log(`${out}: ${total} items`);
