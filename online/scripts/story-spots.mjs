/**
 * 028: the visible spot list of a story page, plus its JSON-LD and Markdown
 * forms. Pure functions; gen-story-spots.mjs reads and writes the files.
 *
 * `segments` is [{ meta, project }]: meta is one entry of story.json `stories`,
 * project the parsed .trailpaint.json it points at.
 *
 * Story text comes from this repo but is still treated as untrusted: all text is
 * HTML-escaped, links must start with https://, photo paths must match
 * PHOTO_PATH_RE.
 */
import { metaDescription } from './meta-description.mjs';

/** Photo paths migrateProject accepts (same regex as SAFE_PHOTO_PATH_RE). */
export const PHOTO_PATH_RE = /^\/(stories|taiwan|examples)\/(?:[A-Za-z0-9_-]+\/){1,4}[A-Za-z0-9_-]{1,64}\.(jpe?g|png|webp)$/;
const SEGMENT_RE = /^[a-z0-9-]{1,80}$/;
const SPOT_KEY_RE = /^[A-Za-z0-9_-]{1,80}$/;
const ORIGIN = 'https://trailpaint.org';
/** CREDITS.md is served as raw text on the site; GitHub renders its tables. */
const REPO_BLOB = 'https://github.com/notoriouslab/trailpaint/blob/main';
const creditsUrl = (pageUrl) => `${REPO_BLOB}${new URL(pageUrl).pathname}CREDITS.md`;
/** era.end of something still standing (019 D5). */
const STANDING = 3000;

export const HEAD_START = '<!-- gen:spots-head:start -->';
export const HEAD_END = '<!-- gen:spots-head:end -->';
export const BODY_START = '<!-- gen:spots:start -->';
export const BODY_END = '<!-- gen:spots:end -->';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isHttps = (v) => typeof v === 'string' && v.startsWith('https://');
const isYear = (v) => Number.isInteger(v) && Math.abs(v) <= STANDING;

/** The key a link uses for a spot: same rule as spotKey() in src/player/deepLink.ts. */
export function spotKey(spot) {
  return spot.placeId ?? spot.id;
}

/** "1697", "1904–1949", "1762 至今", "AD 30", "AD 629–645", "BC 139", "BC 605–432", "BC 6–AD 12"; '' without a usable era. */
export function eraLabel(era) {
  // There is no year 0, and an end before the start is bad data: show the start only.
  if (!era || !isYear(era.start) || era.start === 0) return '';
  const { start } = era;
  const end = isYear(era.end) && era.end > start ? era.end : start;
  // A bare "30" does not read as a year: years before 1000 carry AD.
  const one = (y) => (y < 0 ? `BC ${-y}` : y < 1000 ? `AD ${y}` : `${y}`);
  if (end === start) return one(start);
  if (end >= STANDING) return `${one(start)} 至今`;
  if (start < 0 && end < 0) return `BC ${-start}–${-end}`;
  if (start < 0) return `BC ${-start}–AD ${end}`;
  return `${one(start)}–${end}`;
}

/** Segment id usable in links and anchors, or a positional fallback for anchors only. */
function segmentIds(meta, index) {
  const linkable = typeof meta.id === 'string' && SEGMENT_RE.test(meta.id);
  return { anchor: linkable ? meta.id : `${index + 1}`, link: linkable ? meta.id : null };
}

function spotAnchor(segAnchor, spot) {
  const key = String(spotKey(spot) ?? '');
  return `spot-${segAnchor}-${SPOT_KEY_RE.test(key) ? key : `n${spot.num}`}`;
}

const photoOf = (spot) => (typeof spot.photo === 'string' && PHOTO_PATH_RE.test(spot.photo) ? spot.photo : null);
const refsOf = (spot) => (Array.isArray(spot.historical_refs) ? spot.historical_refs : []).filter((r) => typeof r === 'string' && r.trim());
const scriptureOf = (spot) => (Array.isArray(spot.scripture_refs) ? spot.scripture_refs : []).filter((r) => typeof r === 'string' && r.trim());
const paragraphs = (desc) => String(desc ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** "作者，授權" from photoMeta, or '' when it has neither. */
function creditText(meta) {
  return [meta?.author, meta?.license].filter((v) => typeof v === 'string' && v.trim()).join('，');
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function spotHtml(spot, seg, pageUrl) {
  const year = eraLabel(spot.era);
  const photo = photoOf(spot);
  const key = String(spotKey(spot) ?? '');
  const lines = [
    `        <li class="story-spot" id="${esc(spotAnchor(seg.anchor, spot))}">`,
    `          <h3>${esc(spot.num)}. ${esc(spot.title)}${year ? ` <span class="story-spot__year">${esc(year)}</span>` : ''}</h3>`,
  ];
  if (photo) {
    const credit = creditText(spot.photoMeta);
    const caption = credit
      ? (isHttps(spot.photoMeta.sourceUrl)
        ? `照片：<a href="${esc(spot.photoMeta.sourceUrl)}" rel="noopener">${esc(credit)}</a>`
        : `照片：${esc(credit)}`)
      : `<a href="${esc(creditsUrl(pageUrl))}" rel="noopener">照片出處與授權</a>`;
    lines.push(
      '          <figure>',
      `            <img src="${esc(photo)}" alt="${esc(spot.title)}" loading="lazy">`,
      `            <figcaption>${caption}</figcaption>`,
      '          </figure>',
    );
  }
  for (const p of paragraphs(spot.desc)) lines.push(`          <p>${esc(p).replace(/\n/g, '<br>')}</p>`);
  const scripture = scriptureOf(spot);
  if (scripture.length) lines.push(`          <p class="story-spot__refs">經文：${esc(scripture.join('、'))}</p>`);
  const refs = refsOf(spot);
  if (refs.length) {
    const items = refs.map((r) => (isHttps(r) ? `<a href="${esc(r)}" rel="noopener">${esc(hostOf(r))}</a>` : esc(r)));
    lines.push(`          <p class="story-spot__refs">出處：${items.join('；')}</p>`);
  }
  if (seg.link && SPOT_KEY_RE.test(key)) {
    const year0 = spot.era && isYear(spot.era.start) ? `&amp;year=${spot.era.start}` : '';
    lines.push(`          <a class="story-spot__map" href="?seg=${seg.link}&amp;spot=${esc(key)}${year0}">在地圖上看 →</a>`);
  }
  lines.push('        </li>');
  return lines.join('\n');
}

/** The visible list: goes between BODY_START and BODY_END. */
export function renderSpotsHtml(story, segments, pageUrl) {
  const out = [
    '  <main class="story-spots" id="spots">',
    `    <h2>${esc(story.title)}：景點列表</h2>`,
    `    <p>${esc(story.description)}</p>`,
  ];
  segments.forEach(({ meta, project }, i) => {
    const seg = segmentIds(meta, i);
    out.push(
      `    <section class="story-spots__segment" id="seg-${esc(seg.anchor)}">`,
      `      <h2>${esc(meta.title)}</h2>`,
    );
    if (meta.subtitle) out.push(`      <p class="story-spots__period">${esc(meta.subtitle)}</p>`);
    if (meta.description && meta.description !== story.description) out.push(`      <p>${esc(meta.description)}</p>`);
    out.push('      <ol>');
    for (const spot of project.spots) out.push(spotHtml(spot, seg, pageUrl));
    out.push('      </ol>', '    </section>');
  });
  out.push(
    '    <p class="story-spots__cta"><a href="https://trailpaint.org/app/">在 TrailPaint 路小繪中建立你自己的故事地圖</a></p>',
    '  </main>',
  );
  return out.join('\n');
}

/** ItemList JSON-LD object: one Place per spot, positions running across segments. */
export function renderSpotsLd(story, segments, pageUrl) {
  const items = [];
  segments.forEach(({ meta, project }, i) => {
    const seg = segmentIds(meta, i);
    for (const spot of project.spots) {
      const photo = photoOf(spot);
      const [lat, lng] = Array.isArray(spot.latlng) ? spot.latlng : [];
      const place = { '@type': 'Place', name: String(spot.title ?? ''), url: `${pageUrl}#${spotAnchor(seg.anchor, spot)}` };
      const description = metaDescription(String(spot.desc ?? '').replace(/\s+/g, ' '));
      if (description) place.description = description;
      if (Number.isFinite(lat) && Number.isFinite(lng)) place.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
      if (photo) place.image = `${ORIGIN}${photo}`;
      items.push({ '@type': 'ListItem', position: items.length + 1, item: place });
    }
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${story.title}：景點列表`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items,
  };
}

/** Head block: goes between HEAD_START and HEAD_END. `<` is escaped so no text can close the script. */
export function renderHead(pageUrl, ld, hasMdLink) {
  const out = [];
  if (!hasMdLink) out.push(`  <link rel="alternate" type="text/markdown" href="${esc(pageUrl)}index.md" title="Markdown version" />`);
  out.push(
    '  <script type="application/ld+json">',
    JSON.stringify(ld, null, 2).replace(/</g, '\\u003c'),
    '  </script>',
  );
  return out.join('\n');
}

/** Markdown block: goes between BODY_START and BODY_END of index.md. Text is not escaped. */
export function renderSpotsMd(story, segments, pageUrl) {
  const out = ['## 景點列表 / Spots', ''];
  for (const { meta, project } of segments) {
    out.push(`### ${meta.title}${meta.subtitle ? `（${meta.subtitle}）` : ''}`, '');
    if (meta.description && meta.description !== story.description) out.push(meta.description, '');
    for (const spot of project.spots) {
      const year = eraLabel(spot.era);
      out.push(`#### ${spot.num}. ${spot.title}${year ? `（${year}）` : ''}`, '');
      const [lat, lng] = Array.isArray(spot.latlng) ? spot.latlng : [];
      if (Number.isFinite(lat) && Number.isFinite(lng)) out.push(`位置：${lat}, ${lng}`, '');
      for (const p of paragraphs(spot.desc)) out.push(p, '');
      const scripture = scriptureOf(spot);
      if (scripture.length) out.push(`經文：${scripture.join('、')}`, '');
      const refs = refsOf(spot);
      if (refs.length) out.push('出處：', ...refs.map((r) => `- ${r}`), '');
      const photo = photoOf(spot);
      if (photo) {
        const credit = creditText(spot.photoMeta);
        const source = isHttps(spot.photoMeta?.sourceUrl) ? ` ${spot.photoMeta.sourceUrl}` : '';
        out.push(`照片：${ORIGIN}${photo}${credit ? `（${credit}${source}）` : `（出處與授權見 ${creditsUrl(pageUrl)}）`}`, '');
      }
    }
  }
  return out.join('\n').trimEnd();
}

function between(text, start, end, inner) {
  const i = text.indexOf(start);
  const j = text.indexOf(end);
  if (i === -1 || j === -1 || j < i) return null;
  // Keep the end marker's own indentation.
  const lineStart = text.lastIndexOf('\n', j) + 1;
  const tail = /^[ \t]*$/.test(text.slice(lineStart, j)) && lineStart > i ? lineStart : j;
  return `${text.slice(0, i + start.length)}\n${inner}\n${text.slice(tail)}`;
}

/**
 * Put the head and body blocks into a story page. Pages that already carry the
 * markers only get the text between them replaced. A page without them gets
 * the head block before </head> and the body block in place of its hidden
 * `story-seo-content` section (and the "SEO-only" comment above it); a page
 * with neither is an error rather than a guess.
 */
export function applyHtmlBlocks(html, head, body) {
  let out = between(html, HEAD_START, HEAD_END, head);
  if (out === null) {
    if (html.split('</head>').length !== 2) throw new Error('expected exactly one </head>');
    out = html.replace('</head>', `${HEAD_START}\n${head}\n${HEAD_END}\n</head>`);
  }
  const replaced = between(out, BODY_START, BODY_END, body);
  if (replaced !== null) return replaced;
  const legacy = /(?:[ \t]*<!-- SEO-only[^\n]*-->\n)?[ \t]*<section class="story-seo-content" hidden>[\s\S]*?<\/section>/;
  if (!legacy.test(out)) throw new Error('no gen:spots markers and no story-seo-content section');
  return out.replace(legacy, () => `  ${BODY_START}\n${body}\n  ${BODY_END}`);
}

/**
 * Put the block into index.md. `md` null means the file doesn't exist yet: it
 * is created from `header`. An existing file without markers gets them
 * appended; everything outside the markers is left as written.
 */
export function applyMdBlock(md, block, header) {
  if (md === null) return `${header.trimEnd()}\n\n${BODY_START}\n${block}\n${BODY_END}\n`;
  const replaced = between(md, BODY_START, BODY_END, block);
  if (replaced !== null) return replaced;
  return `${md.trimEnd()}\n\n${BODY_START}\n${block}\n${BODY_END}\n`;
}
