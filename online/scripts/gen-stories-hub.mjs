#!/usr/bin/env node
/**
 * 028 D9: write the story cards of /stories/ into stories/index.html so the
 * page links to every story without JavaScript. The markup comes from
 * catalogHtml() in stories/stories.js itself (run here in a vm), so the page
 * and the script that refreshes it in the browser cannot drift apart.
 *
 * gen-taiwan-index.mjs calls writeStoriesHub() after it rewrites catalog.json;
 * run this by hand after editing stories/catalog.json.
 *
 *   Run:   node online/scripts/gen-stories-hub.mjs
 *   Check: node online/scripts/gen-stories-hub.mjs --check   (exit 1 when stale)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const START = '<!-- gen:catalog:start -->';
const END = '<!-- gen:catalog:end -->';

/** The catalog container element for a parsed catalog.json, as stories.js would render it. */
export function catalogBlock(catalog, storiesJs = readFileSync(join(ROOT, 'stories', 'stories.js'), 'utf8')) {
  const sandbox = {};
  vm.runInNewContext(storiesJs, sandbox, { filename: 'stories.js' });
  if (typeof sandbox.catalogHtml !== 'function') throw new Error('stories.js: catalogHtml() not found');
  const { className, html } = sandbox.catalogHtml(catalog);
  return `    <div id="catalog" class="${className}">${html}</div>`;
}

/** Rewrite the gen:catalog block of stories/index.html. Returns true when it changed (with `check`, would change). */
export function writeStoriesHub({ check = false } = {}) {
  const path = join(ROOT, 'stories', 'index.html');
  const src = readFileSync(path, 'utf8');
  const i = src.indexOf(START);
  const j = src.indexOf(END);
  if (i === -1 || j === -1 || j < i) throw new Error('stories/index.html: gen:catalog markers missing');
  const catalog = JSON.parse(readFileSync(join(ROOT, 'stories', 'catalog.json'), 'utf8'));
  const out = `${src.slice(0, i + START.length)}\n${catalogBlock(catalog)}\n    ${src.slice(j)}`;
  if (out === src) return false;
  if (!check) writeFileSync(path, out);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const changed = writeStoriesHub({ check });
  console.log(`${changed ? (check ? '✗' : '✓') : '='} stories/index.html`);
  if (check && changed) {
    console.error('\n✗ out of date: run node online/scripts/gen-stories-hub.mjs');
    process.exit(1);
  }
}
