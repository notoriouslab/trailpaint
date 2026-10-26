#!/usr/bin/env node
/**
 * Story integrity checks (025 D7). Exit 1 on any failure.
 * Item 1 (every story survives migrateProject) lives in
 * src/core/utils/storiesIntegrity.test.ts because it needs the TS source.
 *
 *   2. cumulative Taiwan stories: every spot cites a source
 *   3. Chinese copy: no simplified-only characters, no Chinese em dashes
 *   4. data/stories/*.json ↔ catalog / sitemap / llms.txt / taiwan hub
 *   5. version numbers agree
 *   6. gen-story-index-html.mjs GROUPS all exist
 *   7. bundled story files ≤ 200 KB; photos are files that exist, ≤ 1 MB, on
 *      paths migrateProject accepts (same regex as SAFE_PHOTO_PATH_RE)
 *
 *   Run: cd online && npm run check:stories
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

const failures = [];
const fail = (item, msg) => failures.push(`[${item}] ${msg}`);

const CONFIGS = readdirSync(join(ROOT, 'data', 'stories'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => readJson(`data/stories/${f}`));
const TAIWAN_DIRS = readdirSync(join(ROOT, 'taiwan'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'taiwan', d.name, 'story.json')))
  .map((d) => d.name);

// ── 2. sources on cumulative Taiwan stories ──
for (const id of TAIWAN_DIRS) {
  const story = readJson(`taiwan/${id}/story.json`);
  for (const seg of story.stories) {
    const project = readJson(`taiwan/${id}/${seg.data}`);
    if (project.eraMode !== 'cumulative') continue;
    for (const s of project.spots) {
      if (!s.desc?.includes('來源：')) fail(2, `taiwan/${id} ${s.title}: desc has no 來源：`);
      if (!s.historical_refs?.length) fail(2, `taiwan/${id} ${s.title}: historical_refs empty`);
    }
  }
}

// ── 3. Chinese copy ──
/** Collect every string value of a JSON value. */
const strings = (v) => (typeof v === 'string' ? [v]
  : Array.isArray(v) ? v.flatMap(strings)
  : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
const copy = []; // [where, text]
for (const cfg of CONFIGS) {
  for (const t of strings(cfg)) copy.push([`data/stories/${cfg.id}.json`, t]);
  for (const { file, ids } of cfg.pools ?? []) {
    const pool = readJson(`data/places/tw/${file}`);
    for (const id of ids) {
      const it = pool.items.find((x) => x.id === id);
      if (it) for (const t of [it.name, it.desc]) copy.push([`${file} ${id}`, t]);
    }
  }
}
for (const id of TAIWAN_DIRS) {
  for (const t of strings(readJson(`taiwan/${id}/story.json`))) copy.push([`taiwan/${id}/story.json`, t]);
}
const HAN = /\p{Script=Han}/u;
const allow = new Set(read('online/scripts/check-stories.allow.txt')
  .split('\n').map((l) => l.split('#')[0].trim()).filter(Boolean));
const chars = [...new Set(copy.flatMap(([, t]) => [...t].filter((c) => HAN.test(c))))];
// One character per line, so OpenCC converts characters, not phrases.
const opencc = (cfg) => execFileSync('opencc', ['-c', cfg], { input: chars.join('\n') + '\n', encoding: 'utf8' })
  .split('\n').slice(0, chars.length);
const toTrad = opencc('s2t');
const toSimp = opencc('t2s');
const simplifiedOnly = new Set(chars.filter((c, i) => toTrad[i] !== c && toSimp[i] === c && !allow.has(c)));
for (const [where, t] of copy) {
  const bad = [...t].filter((c) => simplifiedOnly.has(c));
  if (bad.length) fail(3, `${where}: simplified character(s) ${[...new Set(bad)].join('')}`);
  if (t.includes('——')) fail(3, `${where}: contains ——`);
  if (/\p{Script=Han} — \p{Script=Han}/u.test(t)) fail(3, `${where}: Chinese " — " dash`);
}

// ── 4. listings ──
const catalog = readJson('stories/catalog.json');
const sitemap = read('sitemap.xml');
const llms = read('llms.txt');
const hub = read('taiwan/index.html');
const cfgIds = new Set(CONFIGS.map((c) => c.id));
for (const cfg of CONFIGS) {
  const url = `https://trailpaint.org/taiwan/${cfg.id}/`;
  if (!catalog.stories.some((s) => s.id === cfg.id && s.collection === 'taiwan')) fail(4, `${cfg.id}: missing from catalog`);
  if (!sitemap.includes(`<loc>${url}</loc>`)) fail(4, `${cfg.id}: missing from sitemap.xml`);
  if (!llms.includes(`- **${cfg.title}**`)) fail(4, `${cfg.id}: missing from llms.txt`);
  if (!hub.includes(`href="/taiwan/${cfg.id}/"`)) fail(4, `${cfg.id}: missing from taiwan/index.html`);
}
for (const s of catalog.stories.filter((x) => x.collection === 'taiwan')) {
  if (!cfgIds.has(s.id)) fail(4, `catalog ${s.id}: no data/stories config`);
}
for (const id of TAIWAN_DIRS) if (!cfgIds.has(id)) fail(4, `taiwan/${id}: no data/stories config`);

// ── 5. versions ──
const version = readJson('online/package.json').version;
const versionSites = [
  ['.well-known/agent-card.json', /"version":\s*"([^"]+)"/],
  ['README.md', /badge\/version-([0-9.]+)-/],
  ['README.en.md', /badge\/version-([0-9.]+)-/],
  ['README.ja.md', /badge\/version-([0-9.]+)-/],
  ['index.md', /^Version: (\S+)/m],
  ['stories/index.md', /^Version: (\S+)/m],
  ['taiwan/index.md', /^Version: (\S+)/m],
];
for (const [file, re] of versionSites) {
  const m = read(file).match(re);
  if (!m) fail(5, `${file}: version not found`);
  else if (m[1] !== version) fail(5, `${file}: ${m[1]} != package.json ${version}`);
}

// ── 6. story page generator groups ──
const gen = read('online/scripts/gen-story-index-html.mjs');
const groups = [...(gen.match(/const GROUPS = \[([^\]]*)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
if (!groups.length) fail(6, 'GROUPS not found');
for (const g of groups) if (!existsSync(join(ROOT, 'stories', g, 'story.json'))) fail(6, `GROUPS ${g}: stories/${g}/story.json missing`);

// ── 7. bundled story files (026) ──
const MAX_STORY_BYTES = 200 * 1024;
const MAX_PHOTO_BYTES = 1024 * 1024;
const PHOTO_PATH_RE = /^\/(stories|taiwan|examples)\/(?:[A-Za-z0-9_-]+\/){1,4}[A-Za-z0-9_-]{1,64}\.(jpe?g|png|webp)$/;
const storyFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = join(dir, d.name);
  if (d.isDirectory()) return d.name === 'spot-photos' ? [] : storyFiles(p);
  return d.name.endsWith('.trailpaint.json') ? [p] : [];
});
for (const file of ['stories', 'taiwan', join('examples', 'routes')].flatMap((d) => storyFiles(join(ROOT, d)))) {
  const rel = relative(ROOT, file).split(sep).join('/');
  if (statSync(file).size > MAX_STORY_BYTES) fail(7, `${rel}: over 200 KB`);
  for (const s of JSON.parse(readFileSync(file, 'utf8')).spots ?? []) {
    if (typeof s.photo !== 'string' || !s.photo) continue;
    if (s.photo.startsWith('data:')) fail(7, `${rel} ${s.title}: inline photo (run extract-story-photos.mjs)`);
    else if (!PHOTO_PATH_RE.test(s.photo)) fail(7, `${rel} ${s.title}: ${s.photo} not an accepted photo path`);
    else if (!existsSync(join(ROOT, s.photo))) fail(7, `${rel} ${s.title}: ${s.photo} missing`);
    else if (statSync(join(ROOT, s.photo)).size > MAX_PHOTO_BYTES) fail(7, `${rel} ${s.title}: ${s.photo} over 1 MB`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  console.error(`\n✗ ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`✓ stories ok (${TAIWAN_DIRS.length} Taiwan stories, ${chars.length} distinct Han characters checked)`);
