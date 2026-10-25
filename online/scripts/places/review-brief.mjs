#!/usr/bin/env node
/**
 * Manual review helper (020 D8 / T7): pick the key facilities of a township
 * from the review queue and print, per facility, every source's year and the
 * zh.wikipedia sentences that carry a year next to a build/move/open keyword.
 * The reviewer decides "opened at this site" from that evidence.
 *
 *   node online/scripts/places/review-brief.mjs <TOWNCODE> [limit=15] [--from-dryrun]
 */
import { join } from 'node:path';
import { CACHE_DIR, readJson } from './lib/cache.mjs';
import { fetchPage } from './lib/zhwiki.mjs';

const [code, limitArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const fromDry = process.argv.includes('--from-dryrun');
const limit = Number(limitArg ?? 15);
const queue = fromDry
  ? readJson(join(CACHE_DIR, 'dryrun', `${code}.json`)).review
  : readJson(join(CACHE_DIR, 'review', `${code}.json`));

/** D8 priority: schools (university > senior > junior > primary), stations, hospitals, libraries, sports, government. */
function priority(r) {
  const name = r.members.map((m) => m.name).join(' ');
  const cat = r.members.map((m) => m.category).find(Boolean);
  if (/大學.+(學院|學系|系|館|中心|研究所)/.test(name)) return 20; // sub-units of a campus
  if (/大學|學院/.test(name) && cat === 'school') return 0;
  if (/高級中學|高中|高工|高商|高職|中學/.test(name)) return 1;
  if (/國民中學|國中/.test(name)) return 2;
  if (/國民小學|國小/.test(name)) return 3;
  const order = { station: 4, hospital: 5, library: 6, sports: 7, government: 8, museum: 9, bridge: 10, tunnel: 10 };
  return order[cat] ?? 20;
}

const KEY = /(遷|現址|啟用|落成|完工|竣工|通車|開館|開幕|開業|設立|成立|創校|改制|拆除|廢止|搬遷|新建|興建)/;
const picked = queue
  .filter((r) => r.reason !== 'category-check')
  .filter((r) => r.members.some((m) => m.source === 'zhwiki'))
  .filter((r) => !/公園|綠地|廣場/.test(r.members[0].name))
  .sort((a, b) => priority(a) - priority(b))
  .slice(0, limit);

for (const [i, r] of picked.entries()) {
  const wiki = r.members.find((m) => m.source === 'zhwiki');
  const page = await fetchPage(wiki.sourceId);
  console.log(`\n## ${i + 1}. ${r.members[0].name}  [${r.reason}]  ${r.members[0].latlng.join(',')}`);
  for (const m of r.members) console.log(`   - ${m.source} ${m.sourceId}: ${m.start ?? '—'} ${m.yearKind ?? ''}`);
  const text = `${page?.extract ?? ''}\n${(page?.wikitext ?? '').replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>|\{\{[^{}]*\}\}|\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')}`;
  const lines = text.split(/(?<=[。\n])/).map((s) => s.trim())
    .filter((s) => /(1[6-9]\d\d|20\d\d|民國\d+|昭和|大正|明治)/.test(s) && KEY.test(s));
  [...new Set(lines)].slice(0, 8).forEach((s) => console.log(`     > ${s.slice(0, 150)}`));
}
console.log(`\n${picked.length} picked of ${queue.length} queued`);
