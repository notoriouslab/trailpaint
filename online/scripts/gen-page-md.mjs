#!/usr/bin/env node
/**
 * Markdown mirrors of the hand-written static pages, for AI crawlers and the
 * `Accept: text/markdown` negotiation worker (cloudflare/markdown-negotiation.worker.js).
 * Reads <main> of each page and writes index.md next to it; the page's
 * <link rel="alternate" type="text/markdown"> points at that file.
 *
 * The home page, /stories/ and /taiwan/ keep their own hand-written or
 * generated index.md and are not touched here.
 *
 *   Run: node online/scripts/gen-page-md.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const ORIGIN = 'https://trailpaint.org';
export const PAGES = [
  'faq/',
  'features/',
  'features/import/',
  'features/export/',
  'features/story-mode/',
  'features/ai-prompt/',
  'features/ai-prompt/en/',
  'features/ai-prompt/ja/',
  'features/install/',
  'examples/',
  'church/',
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', rarr: '→', larr: '←', times: '×', mdash: '—', ndash: '–', hellip: '…', copy: '©' };
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/g, (m, n) => ENTITIES[n] ?? m);
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const abs = (href, base) => (/^(https?:|mailto:)/.test(href) ? href : new URL(href, base).href);

/** Convert the inner HTML of <main> to markdown. Covers only the tags these pages use. */
export function htmlToMarkdown(html, base) {
  const blocks = []; // fenced code, kept out of the inline passes
  let s = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe)\b[\s\S]*?<\/\1>/g, '')
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g, (_, body) => {
      blocks.push('```\n' + decode(body.replace(/<[^>]+>/g, '')).replace(/^\n+|\s+$/g, '') + '\n```');
      return `\n\n\u0000${blocks.length - 1}\u0000\n\n`;
    });
  // Inline: collapse whitespace first so list items and paragraphs stay on one line.
  s = s.replace(/\s+/g, ' ')
    .replace(/<code\b[^>]*>(.*?)<\/code>/g, (_, t) => '`' + t.replace(/<[^>]+>/g, '') + '`')
    .replace(/<(strong|b)\b[^>]*>(.*?)<\/\1>/g, '**$2**')
    .replace(/<img\b[^>]*>/g, (tag) => (attr(tag, 'alt') ? `![${attr(tag, 'alt')}](${abs(attr(tag, 'src'), base)})` : ''))
    .replace(/<a\b[^>]*>(.*?)<\/a>/g, (tag, text) => {
      const href = attr(tag, 'href');
      const label = text.replace(/<(?!\/?(?:img)\b)[^>]+>/g, '').trim();
      if (!label) return '';
      return href && !href.startsWith('#') ? `[${label}](${abs(href, base)})` : label;
    })
    .replace(/<br\s*\/?>/g, '\n');
  // Blocks.
  let ordered = [];
  s = s
    .replace(/<h([1-6])\b[^>]*>(.*?)<\/h\1>/g, (_, n, t) => `\n\n${'#'.repeat(Number(n))} ${t.replace(/<[^>]+>/g, '').trim()}\n\n`)
    .replace(/<summary\b[^>]*>(.*?)<\/summary>/g, (_, t) => `\n\n### ${t.replace(/<[^>]+>/g, '').trim()}\n\n`)
    .replace(/<(ol|ul)\b[^>]*>|<\/(ol|ul)>|<li\b[^>]*>/g, (tag, open, close) => {
      if (open) { ordered.push(open === 'ol' ? 1 : 0); return '\n\n'; }
      if (close) { ordered.pop(); return '\n\n'; }
      const depth = Math.max(ordered.length - 1, 0);
      const n = ordered[ordered.length - 1];
      if (n) ordered[ordered.length - 1] = n + 1;
      return `\n${'  '.repeat(depth)}${n ? `${n}.` : '-'} `;
    })
    .replace(/<\/li>/g, '')
    .replace(/<\/?(p|div|section|details|figure|figcaption|table|tr|header|footer|nav|blockquote)\b[^>]*>/g, '\n\n')
    .replace(/<[^>]+>/g, '');
  return decode(s)
    .split('\n').map((l) => (/^\s*(-|\d+\.) /.test(l) ? l.trimEnd() : l.trim())).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)])
    .trim();
}

function build(page) {
  const html = readFileSync(join(ROOT, page, 'index.html'), 'utf8');
  const url = `${ORIGIN}/${page}`;
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
  if (!main) throw new Error(`${page}: no <main>`);
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  const lang = html.match(/<html[^>]*lang="([^"]+)"/)?.[1] ?? 'zh-TW';
  const body = htmlToMarkdown(main, url);
  const i = body.indexOf('\n');
  const [title, rest] = i === -1 ? [body, ''] : [body.slice(0, i), body.slice(i + 1).trim()];
  if (!title.startsWith('# ')) throw new Error(`${page}: <main> does not start with <h1>`);
  const parent = new URL('..', url).href;
  return [
    title,
    '',
    ...(description ? [`> ${description}`, ''] : []),
    `URL: ${url}`,
    `Parent: ${parent}`,
    `Language: ${lang}`,
    '',
    rest,
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const page of PAGES) {
    const path = join(ROOT, page, 'index.md');
    const out = build(page);
    let old = '';
    try { old = readFileSync(path, 'utf8'); } catch { /* new file */ }
    if (out !== old) writeFileSync(path, out);
    console.log(`${out === old ? '=' : '✓'} ${page}index.md`);
  }
}
