#!/usr/bin/env node
/**
 * Refresh <lastmod> in sitemap.xml from git: the date of the last commit that
 * touched the page (for story pages, anything in the story folder), or today
 * when the page has uncommitted changes. The Taiwan block between the gen
 * markers is owned by gen-taiwan-index.mjs and left alone.
 *
 *   Run: node online/scripts/gen-sitemap-lastmod.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ORIGIN = 'https://trailpaint.org/';
const START = '<!-- gen:taiwan-stories:start -->';
const END = '<!-- gen:taiwan-stories:end -->';
const TODAY = new Date().toISOString().slice(0, 10);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

function lastmod(loc) {
  const path = loc.slice(ORIGIN.length);
  const dir = path.endsWith('/') || path === '' ? path : null;
  const page = dir === null ? path : `${dir}index.html`;
  if (!existsSync(join(ROOT, page))) throw new Error(`${loc}: ${page} does not exist`);
  // A story folder changes as a whole (data, photos, page); hubs only by their own page.
  const target = dir && existsSync(join(ROOT, dir, 'story.json')) ? dir : page;
  if (git('status', '--porcelain', '--', target)) return TODAY;
  return git('log', '-1', '--format=%cs', '--', target) || TODAY;
}

const file = join(ROOT, 'sitemap.xml');
const src = readFileSync(file, 'utf8');
const i = src.indexOf(START);
const j = src.indexOf(END);
if (i === -1 || j === -1 || j < i) throw new Error('sitemap.xml: gen markers missing');
const refresh = (xml) => xml.replace(
  /(<loc>([^<]+)<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/g,
  (_, head, loc, tail) => `${head}${lastmod(loc)}${tail}`,
);
const out = refresh(src.slice(0, i)) + src.slice(i, j) + refresh(src.slice(j));
if (out !== src) writeFileSync(file, out);
console.log(`${out === src ? '=' : '✓'} sitemap.xml`);
