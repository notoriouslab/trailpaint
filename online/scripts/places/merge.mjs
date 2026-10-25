#!/usr/bin/env node
/**
 * Merge candidates into the verified pool (020 D5/D6).
 *
 *   node online/scripts/places/merge.mjs [--dry-run | --calibrate] <TOWNCODE…>
 *
 * Steps: all cached candidates → groupCandidates (nationwide, ignores borders)
 * → keep groups anchored in the requested townships → add a zh.wikipedia
 * member for groups with a sitelink → drop groups already in the pool
 * (merge-log) → decide(): auto → pool, else → review queue.
 *   --dry-run    print/save the outcome, write nothing to the pool
 *   --calibrate  like --dry-run, but compare auto years against existing pool
 *                items instead of skipping them (D5 calibration gate)
 * Existing pool items are never modified.
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE_DIR, POOL_DIR, cachePath, readJson, writeJson } from './lib/cache.mjs';
import { groupCandidates, matchesExisting, normalizeName, haversine, MAX_DISTANCE_M } from './lib/match.mjs';
import { decide, newId } from './lib/verify.mjs';
import { SOURCE_TITLE } from './lib/candidate.mjs';
import { fetchPage, infoboxYear, introSentence } from './lib/zhwiki.mjs';
import { toTraditional } from './lib/hanzi.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const calibrate = args.includes('--calibrate');
const codes = args.filter((a) => /^\d{8}$/.test(a));
if (!codes.length) {
  console.error('usage: merge.mjs [--dry-run | --calibrate] <TOWNCODE…>');
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);
const towns = readJson(join(POOL_DIR, 'towns.json'));

const candDir = join(CACHE_DIR, 'candidates');
const cands = readdirSync(candDir).flatMap((f) => readJson(join(candDir, f)));
const wanted = new Set(codes);
const groups = groupCandidates(cands).filter((g) => wanted.has(g.towncode));

/** Add a zhwiki member (second encyclopedic year + intro) when a member has a sitelink. */
async function withZhwiki(group) {
  const link = group.members.find((m) => m.zhwiki);
  if (!link) return { group, intro: '' };
  const page = await fetchPage(link.zhwiki);
  if (!page) return { group, intro: '' };
  const y = infoboxYear(page.wikitext);
  const member = {
    source: 'zhwiki', sourceId: page.title, tier: 'encyclopedic', name: link.name,
    latlng: link.latlng, start: y?.year, yearKind: y?.kind, category: link.category,
    url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(page.title)}`, towncode: link.towncode,
  };
  return { group: { ...group, members: [...group.members, member] }, intro: introSentence(page.extract) };
}

function poolFile(code) {
  return join(POOL_DIR, `${code}.json`);
}

function loadPool(code) {
  if (existsSync(poolFile(code))) return readJson(poolFile(code));
  const t = towns[code];
  return { towncode: code, county: t.county, town: t.town, slug: `${t.countySlug}-${t.townSlug}`, items: [] };
}

/** desc material (D6): official description first sentence, else zhwiki intro. */
function descFor(anchor, intro, year) {
  const official = introSentence(anchor.about);
  return toTraditional(official || intro || `${anchor.name}，${year} 年於現址啟用。`);
}

function toPoolItem(group, d, intro) {
  const year = d.year;
  const anchor = group.members.find((m) => m.tier === 'official') ?? group.members[0];
  const seen = new Set();
  const sources = group.members
    .filter((m) => !seen.has(m.url) && seen.add(m.url))
    .map((m) => ({ title: SOURCE_TITLE[m.source](m), url: m.url }));
  return {
    id: newId(group),
    name: anchor.name,
    category: anchor.category,
    latlng: anchor.latlng,
    start: year,
    end: null,
    desc: descFor(anchor, intro, year),
    sources,
    photo: { query: anchor.name },
    verified: { method: 'auto', basis: d.basis, date: today },
  };
}

const summary = {};
for (const code of codes) {
  const pool = loadPool(code);
  const auto = [];
  const review = [];
  const log = [];
  const calib = [];
  for (const raw of groups.filter((g) => g.towncode === code)) {
    const { group, intro } = await withZhwiki(raw);
    const existing = matchesExisting(group, pool.items);
    if (existing && !calibrate) {
      log.push(`skip (in pool): ${group.members.map((m) => `${m.source}:${m.name}`).join(' | ')}`);
      continue;
    }
    const flagged = group.members.find((m) => m.needsReview);
    const d = flagged ? { reason: flagged.needsReview } : decide(group);
    if (d.method === 'auto') {
      const item = toPoolItem(group, d, intro);
      if (calibrate && existing) {
        // compare with manual answers only; auto items already in the pool would match themselves
        const hit = pool.items.find((it) => it.verified?.method === 'manual' && group.members.some(
          (m) => normalizeName(m.name) === normalizeName(it.name) && haversine(m.latlng, it.latlng) <= MAX_DISTANCE_M));
        if (hit) calib.push({ name: hit.name, manual: hit.start, auto: d.year, ok: hit.start === d.year });
      }
      auto.push(item);
    } else {
      review.push({
        reason: d.reason,
        members: group.members.map(({ source, sourceId, tier, name, start, yearKind, latlng, url, category }) =>
          ({ source, sourceId, tier, name, start, yearKind, latlng, url, category })),
      });
    }
  }

  // in --calibrate, auto may repeat items already in the pool; nothing is written then
  const ids = new Set(calibrate ? [] : pool.items.map((it) => it.id));
  for (const it of auto) {
    if (ids.has(it.id)) throw new Error(`${code}: id collision ${it.id}`);
    ids.add(it.id);
  }

  const reasons = review.reduce((acc, r) => ({ ...acc, [r.reason]: (acc[r.reason] ?? 0) + 1 }), {});
  summary[code] = { town: towns[code].town, existing: pool.items.length, auto: auto.length, review: review.length, reasons, skipped: log.length };
  if (calibrate) summary[code].calibration = calib;

  if (dryRun || calibrate) {
    writeJson(cachePath('dryrun', `${code}.json`), { auto, review, calib });
    continue;
  }
  pool.items = [...pool.items, ...auto].sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
  writeFileSync(poolFile(code), JSON.stringify(pool, null, 2) + '\n');
  writeJson(cachePath('review', `${code}.json`), review);
  writeFileSync(cachePath('merge-log', `${code}.txt`), log.join('\n') + '\n');
}
console.log(JSON.stringify(summary, null, 1));
