#!/usr/bin/env node
/**
 * Write manual review decisions into the pool (020 D6 / T7).
 *
 *   node online/scripts/places/apply-manual.mjs <TOWNCODE…>
 *
 * Reads online/.cache/places/decisions/<TOWNCODE>.json:
 *   [{ key, name, start, end, desc, evidence, sources? }]
 *   key      = sourceId of any member of a review-queue group (zh.wikipedia
 *              title, Wikidata Qid, 文資局 caseId)
 *   start    = year the facility came into use at this site
 *   end      = demolition / closing year, or null
 *   evidence = the source sentence the year was read from (kept in the pool)
 *   sources  = extra { title, url } beyond the group's own sources
 * Existing pool items are never modified; a decision that matches one is an error.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE_DIR, POOL_DIR, readJson } from './lib/cache.mjs';
import { matchesExisting } from './lib/match.mjs';
import { newId } from './lib/verify.mjs';
import { SOURCE_TITLE } from './lib/candidate.mjs';

const today = new Date().toISOString().slice(0, 10);
const towns = readJson(join(POOL_DIR, 'towns.json'));

for (const code of process.argv.slice(2)) {
  const decisions = readJson(join(CACHE_DIR, 'decisions', `${code}.json`));
  const queue = readJson(join(CACHE_DIR, 'review', `${code}.json`));
  if (!decisions || !queue || !towns[code]) throw new Error(`${code}: needs a known TOWNCODE, decisions/${code}.json and review/${code}.json (run merge.mjs first)`);
  const file = join(POOL_DIR, `${code}.json`);
  const t = towns[code];
  const pool = existsSync(file)
    ? readJson(file)
    : { towncode: code, county: t.county, town: t.town, slug: `${t.countySlug}-${t.townSlug}`, items: [] };
  const ids = new Set(pool.items.map((it) => it.id));
  const added = [];
  for (const d of decisions) {
    const group = queue.find((g) => g.members.some((m) => String(m.sourceId) === String(d.key)));
    if (!group) throw new Error(`${code}: no queued group for key ${d.key}`);
    if (matchesExisting(group, [...pool.items, ...added])) throw new Error(`${code}: ${d.key} already in pool`);
    if (!Number.isInteger(d.start) || !d.desc || !d.evidence) throw new Error(`${code}: ${d.key} needs start, desc, evidence`);
    const id = newId(group);
    if (ids.has(id)) throw new Error(`${code}: id collision ${id}`);
    ids.add(id);
    const anchor = group.members.find((m) => m.tier === 'official') ?? group.members.find((m) => m.source === 'wikidata') ?? group.members[0];
    const seen = new Set();
    const sources = [
      ...group.members.map((m) => ({ title: SOURCE_TITLE[m.source](m), url: m.url })),
      ...(d.sources ?? []),
    ].filter((s) => s.url && !seen.has(s.url) && seen.add(s.url));
    added.push({
      id,
      name: d.name,
      category: group.members.map((m) => m.category).find(Boolean) ?? 'other',
      latlng: anchor.latlng,
      start: d.start,
      end: d.end ?? null,
      desc: d.desc,
      sources,
      photo: { query: d.name },
      verified: { method: 'manual', date: today, evidence: d.evidence },
    });
  }
  pool.items = [...pool.items, ...added].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  writeFileSync(file, JSON.stringify(pool, null, 2) + '\n');
  console.log(`${code} ${t.town}: +${added.length} manual (pool ${pool.items.length})`);
}
