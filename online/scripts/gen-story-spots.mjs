#!/usr/bin/env node
/**
 * 028: write the visible spot list, its JSON-LD and the Markdown mirror of every
 * story page (stories/<id>/ and taiwan/<id>/) from story.json and the
 * .trailpaint.json files it points at. Only the text between the gen:spots
 * markers is rewritten; see story-spots.mjs.
 *
 * The page generators (gen-story-index-html.mjs, build-taiwan-story.mjs) call
 * writeStorySpots() after writing a page, so this only needs running by hand
 * after editing story data or a hand-written page.
 *
 *   Run:   node online/scripts/gen-story-spots.mjs
 *   Check: node online/scripts/gen-story-spots.mjs --check   (exit 1 when stale)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderSpotsHtml, renderSpotsLd, renderSpotsMd, renderHead, applyHtmlBlocks, applyMdBlock,
  HEAD_START, HEAD_END,
} from './story-spots.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ORIGIN = 'https://trailpaint.org';

/** Every story folder: stories/<id>/ and taiwan/<id>/ that have a story.json. */
export function storyDirs() {
  return ['stories', 'taiwan'].flatMap((top) => readdirSync(join(ROOT, top), { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(ROOT, top, d.name, 'story.json')))
    .map((d) => join(ROOT, top, d.name))
    .sort());
}

/**
 * Regenerate index.html and index.md of one story folder.
 * Returns the repo-relative files that changed (with `check`, would change).
 */
export function writeStorySpots(dir, { check = false } = {}) {
  const rel = relative(ROOT, dir).split(sep).join('/');
  const pageUrl = `${ORIGIN}/${rel}/`;
  const story = JSON.parse(readFileSync(join(dir, 'story.json'), 'utf8'));
  const segments = story.stories.map((meta) => ({
    meta,
    project: JSON.parse(readFileSync(join(dir, meta.data), 'utf8')),
  }));

  // Story text containing a marker would break the next rewrite of the block.
  if (JSON.stringify([story, segments]).includes('gen:spots')) throw new Error(`${rel}: story text contains a gen:spots marker`);

  const changed = [];
  const put = (file, next, prev) => {
    if (next === prev) return;
    changed.push(`${rel}/${file}`);
    if (!check) writeFileSync(join(dir, file), next);
  };

  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  // A markdown alternate written by hand (outside our head block) is not repeated.
  const i = html.indexOf(HEAD_START);
  const j = html.indexOf(HEAD_END);
  const outside = i !== -1 && j > i ? html.slice(0, i) + html.slice(j) : html;
  const head = renderHead(pageUrl, renderSpotsLd(story, segments, pageUrl), outside.includes('type="text/markdown"'));
  put('index.html', applyHtmlBlocks(html, head, renderSpotsHtml(story, segments, pageUrl)), html);

  const mdPath = join(dir, 'index.md');
  const md = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : null;
  const header = [
    `# ${story.title}`,
    '',
    `> ${story.description}`,
    '',
    `URL: ${pageUrl}`,
    `Parent: ${ORIGIN}/${rel.split('/')[0]}/`,
    'Language: zh-TW',
  ].join('\n');
  put('index.md', applyMdBlock(md, renderSpotsMd(story, segments, pageUrl), header), md);

  return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const dir of storyDirs()) {
    const changed = writeStorySpots(dir, { check });
    stale += changed.length;
    const rel = relative(ROOT, dir).split(sep).join('/');
    console.log(`${changed.length ? (check ? '✗' : '✓') : '='} ${rel}${changed.length ? ` (${changed.map((f) => f.slice(rel.length + 1)).join(', ')})` : ''}`);
  }
  if (check && stale) {
    console.error(`\n✗ ${stale} file(s) out of date: run node online/scripts/gen-story-spots.mjs`);
    process.exit(1);
  }
}
