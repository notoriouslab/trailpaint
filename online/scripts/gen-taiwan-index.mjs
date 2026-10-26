#!/usr/bin/env node
/**
 * Regenerate every listing of the Taiwan Century stories from data/stories/*.json
 * (025 D4): the /taiwan/ hub cards, taiwan/index.md, llms.txt, sitemap.xml and
 * the collection === 'taiwan' entries of stories/catalog.json.
 *
 * Only the block between the gen markers is rewritten; everything outside stays
 * hand-written. Spot counts come from each story's own .trailpaint.json.
 *
 *   Run: node online/scripts/gen-taiwan-index.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const START = '<!-- gen:taiwan-stories:start -->';
const END = '<!-- gen:taiwan-stories:end -->';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STORIES = readdirSync(join(ROOT, 'data', 'stories'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(ROOT, 'data', 'stories', f), 'utf8')))
  .map((cfg) => {
    const dataFile = cfg.data ?? `${cfg.segment.id}.trailpaint.json`;
    const project = JSON.parse(readFileSync(join(ROOT, 'taiwan', cfg.id, dataFile), 'utf8'));
    const count = project.spots.length;
    const fill = (s) => s.replaceAll('{count}', String(count));
    return { cfg, L: cfg.listing, count, fill, url: `https://trailpaint.org/taiwan/${cfg.id}/` };
  })
  .sort((a, b) => a.L.rank - b.L.rank);

/** Replace the marked block in `file`; `inner` is the generated text between the markers. */
function rewrite(file, inner) {
  const path = join(ROOT, file);
  const src = readFileSync(path, 'utf8');
  const i = src.indexOf(START);
  const j = src.indexOf(END);
  if (i === -1 || j === -1 || j < i) throw new Error(`${file}: gen markers missing`);
  const out = src.slice(0, i + START.length) + '\n' + inner + src.slice(j);
  if (out !== src) writeFileSync(path, out);
  console.log(`${out === src ? '=' : '✓'} ${file}`);
}

// /taiwan/ hub cards
rewrite('taiwan/index.html', [
  '    <div class="works works--2">',
  ...STORIES.map(({ cfg, L, fill }) => [
    '      <div class="work">',
    `        <a class="work-pic" href="/taiwan/${cfg.id}/"><img src="${esc(L.card.img)}" alt="${esc(L.card.alt)}" loading="lazy" width="${L.card.width}" height="${L.card.height}"></a>`,
    `        <div class="work-kicker">${esc(L.kind)} · ${esc(L.periodLabel)}</div>`,
    `        <h3>${esc(cfg.title)}</h3>`,
    `        <div class="work-meta">${esc(fill(L.card.meta))}</div>`,
    `        <div class="work-actions"><a href="/taiwan/${cfg.id}/">▶ 看故事</a></div>`,
    '      </div>',
  ].join('\n')),
  '    </div>',
  '    ',
].join('\n'));

// taiwan/index.md
rewrite('taiwan/index.md', [
  `## 故事 / Stories (${STORIES.length})`,
  '',
  ...STORIES.map(({ cfg, L, count, fill, url }) =>
    `- **${cfg.title} ${L.titleEn}** (${L.periodEn}, ${count} ${L.unit}) — ${fill(L.md)}${url}`),
  '',
].join('\n'));

// llms.txt
rewrite('llms.txt', [
  '### 台灣百年 (taiwan，策展專區 https://trailpaint.org/taiwan/)',
  ...STORIES.map(({ cfg, L, fill }) => `- **${cfg.title}** (${L.periodLabel})：${fill(L.llms)}`),
  '',
].join('\n'));

// sitemap.xml
rewrite('sitemap.xml', [
  ...STORIES.map(({ cfg, url }) => [
    '  <url>',
    `    <loc>${url}</loc>`,
    `    <lastmod>${cfg.updated}</lastmod>`,
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.7</priority>',
    '  </url>',
  ].join('\n')),
  '  ',
].join('\n'));

// stories/catalog.json — JSON has no comments: replace the taiwan entries in place.
{
  const path = join(ROOT, 'stories', 'catalog.json');
  const src = readFileSync(path, 'utf8');
  const catalog = JSON.parse(src);
  const entries = STORIES.map(({ cfg, L, fill }) => ({
    id: cfg.id,
    collection: 'taiwan',
    title: cfg.title,
    subtitle: L.catalog.subtitle,
    description: fill(L.catalog.description),
    thumbnail: L.catalog.thumbnail,
    path: `/taiwan/${cfg.id}/`,
    count: 1,
  }));
  const first = catalog.stories.findIndex((s) => s.collection === 'taiwan');
  const rest = catalog.stories.filter((s) => s.collection !== 'taiwan');
  const at = first === -1 ? rest.length : first;
  catalog.stories = [...rest.slice(0, at), ...entries, ...rest.slice(at)];
  const out = JSON.stringify(catalog, null, 2) + '\n';
  if (out !== src) writeFileSync(path, out);
  console.log(`${out === src ? '=' : '✓'} stories/catalog.json`);
}
