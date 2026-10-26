#!/usr/bin/env node
/**
 * Shared builder for taiwan/<id>/ district and theme time-map stories (025 D3).
 * One segment, cumulative eraMode: each spot = a place-pool item, era = [start at
 * this site, end ?? 3000]. Everything story-specific lives in
 * data/stories/<id>.json; content comes from the place pools
 * data/places/tw/<TOWNCODE>.json (verified items only).
 *
 *   Run: node online/scripts/build-taiwan-story.mjs <id>
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Still standing — see 019 design D5: never the current year, or it vanishes next January. */
const STANDING = 3000;

const STORY_ID = process.argv[2];
if (!STORY_ID || !/^[a-z0-9-]+$/.test(STORY_ID)) {
  console.error('usage: node online/scripts/build-taiwan-story.mjs <id>');
  process.exit(1);
}
const CFG = JSON.parse(readFileSync(join(ROOT, 'data', 'stories', `${STORY_ID}.json`), 'utf8'));
if (CFG.id !== STORY_ID) throw new Error(`config id ${CFG.id} != ${STORY_ID}`);
if (CFG.builder === 'legacy') throw new Error(`${STORY_ID} is built by its own legacy script`);
const SEGMENT = CFG.segment;
const STORY_DIR = join(ROOT, 'taiwan', STORY_ID);
const TMP = join(tmpdir(), `tp-${STORY_ID}`);

const readPool = (file) => JSON.parse(readFileSync(join(ROOT, 'data', 'places', 'tw', file), 'utf8'));
/** Pool items shown in the story: listed per pool file in the config; list order breaks same-year ties. */
const ITEMS = CFG.pools.flatMap(({ file, ids }) => {
  const pool = readPool(file);
  const missing = ids.filter((id) => !pool.items.some((it) => it.id === id));
  if (missing.length) throw new Error(`${file}: ids not in pool: ${missing.join(', ')}`);
  return ids.map((id) => pool.items.find((it) => it.id === id));
});
const dup = ITEMS.map((it) => it.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dup.length) throw new Error(`duplicate ids: ${dup.join(', ')}`);
const SPOTS = ITEMS
  .sort((a, b) => a.start - b.start) // Player plays in order → time moves forward
  .map((it) => ({
    placeId: it.id,
    title: it.name,
    latlng: it.latlng,
    era: { start: it.start, end: it.end ?? STANDING },
    desc: `${it.desc}\n\n來源：${it.sources.map((x) => x.title).join('、')}`,
    refs: it.sources.map((x) => x.url),
    photo_local: it.photo?.local ? it.photo : null,
    photo_file: it.photo?.file,
    photo_query: it.photo?.query ?? null,
  }));

/** Exact Commons file — used when search returns the wrong subject. */
async function fetchCommonsFile(file) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', origin: '*',
    titles: `File:${file}`,
    prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '600',
  }).toString();
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) return null;
  const page = Object.values((await r.json()).query?.pages ?? {})[0];
  const ii = page?.imageinfo?.[0];
  if (!ii?.thumburl) return null;
  const meta = ii.extmetadata || {};
  return {
    query: file, file,
    thumbUrl: ii.thumburl,
    sourceUrl: ii.descriptionurl,
    license: meta.LicenseShortName?.value || 'Unknown',
    artistHtml: meta.Artist?.value || '',
  };
}

async function searchCommonsTopHit(query) {
  const [zh, en] = query.split('|');
  for (const q of [zh, en].filter(Boolean)) {
    const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
      action: 'query', format: 'json', origin: '*',
      generator: 'search',
      gsrsearch: `${q} filetype:bitmap`,
      gsrnamespace: '6', gsrlimit: '1',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '600',
    }).toString();
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) continue;
    const j = await r.json();
    const pages = j.query?.pages;
    if (!pages) continue;
    const page = Object.values(pages)[0];
    const ii = page?.imageinfo?.[0];
    if (!ii?.thumburl) continue;
    const meta = ii.extmetadata || {};
    return {
      query: q,
      file: page.title.replace(/^File:/, ''),
      thumbUrl: ii.thumburl,
      sourceUrl: ii.descriptionurl,
      license: meta.LicenseShortName?.value || 'Unknown',
      artistHtml: meta.Artist?.value || '',
    };
  }
  return null;
}

async function fetchAsBase64(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}
function stripHtml(s) {
  return decodeEntities(s.replace(/<[^>]*>/g, '')).trim();
}
function extractFirstHref(html) {
  const m = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  if (!m) return null;
  let href = m[1];
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `https://commons.wikimedia.org${href}`;
  if (!/^https?:\/\//i.test(href)) return null;
  try {
    const host = new URL(href).hostname;
    if (/(^|\.)(wikimedia|wikipedia)\.org$/.test(host)) return href;
    return null;
  } catch { return null; }
}

function buildPhotoMeta(hit) {
  return {
    source: 'wikimedia-commons',
    license: hit.license,
    author: stripHtml(hit.artistHtml) || 'Unknown',
    authorUrl: extractFirstHref(hit.artistHtml),
    sourceUrl: hit.sourceUrl,
  };
}

// 024 D3: photos kept in the repo (data/places/photos/), already resized and
// EXIF-stripped. kind 'maintainer' = the maintainer's own photo;
// 'public-domain-archive' = economic rights expired (著作權法 §34, published
// 1975 or earlier), with author / sourceUrl / origin / published in the pool.
const PHOTOS_DIR = join(ROOT, 'data', 'places', 'photos') + sep;
const MAX_PHOTO_DATAURL = 1024 * 1024; // migrateProject SINGLE_PHOTO_LIMIT

function loadLocalPhoto(p) {
  const file = resolve(ROOT, p.local);
  if (!file.startsWith(PHOTOS_DIR)) throw new Error(`photo.local outside data/places/photos: ${p.local}`);
  const buf = readFileSync(file);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error(`not a JPEG: ${p.local}`);
  const photo = `data:image/jpeg;base64,${buf.toString('base64')}`;
  if (photo.length >= MAX_PHOTO_DATAURL) throw new Error(`photo over 1 MB as data URL: ${p.local}`);
  let meta;
  if (p.kind === 'maintainer') {
    meta = { source: 'maintainer', license: 'CC BY 4.0', author: 'Jacob Mei', authorUrl: null, sourceUrl: null };
  } else if (p.kind === 'public-domain-archive') {
    if (!p.sourceUrl || !Number.isInteger(p.published) || p.published > 1975) {
      throw new Error(`archive photo needs sourceUrl and published <= 1975: ${p.local}`);
    }
    meta = {
      source: 'public-domain-archive',
      license: '著作財產權已消滅（著作權法 §34）',
      author: p.author || '佚名',
      authorUrl: null,
      sourceUrl: p.sourceUrl,
      ...(p.origin ? { origin: p.origin } : {}),
      published: p.published,
    };
  } else {
    throw new Error(`unknown photo.kind ${p.kind}: ${p.local}`);
  }
  return { photo, meta };
}

function creditLink(meta) {
  if (meta.source === 'maintainer') return '自行拍攝';
  if (meta.source === 'public-domain-archive') return `[典藏頁](${meta.sourceUrl})`;
  return `[Commons File](${meta.sourceUrl})`;
}

function creditOrigin(meta) {
  return [meta.origin, meta.published].filter(Boolean).join('，');
}

function makeCoverHtml(spec, w, h) {
  const titleSize = Math.round(h * 0.11);
  const subtitleSize = Math.round(h * 0.045);
  const badgeSize = Math.round(h * 0.035);
  const leafSize = Math.round(h * 0.18);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0}
body{width:${w}px;height:${h}px;background:radial-gradient(circle at 30% 35%,#0f2a1d 0%,#06170f 60%,#020a06 100%);color:#d1fae5;font-family:'Cormorant Garamond','EB Garamond','Noto Serif TC',serif;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;text-align:center}
body::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(110,231,183,0.05) 0 1px,transparent 1px 80px),repeating-linear-gradient(0deg,rgba(110,231,183,0.05) 0 1px,transparent 1px 80px);pointer-events:none}
body::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 ${Math.round(h*0.3)}px rgba(0,0,0,0.7);pointer-events:none}
.leaf{font-size:${leafSize}px;line-height:1;margin-bottom:${Math.round(h*0.025)}px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5))}
.title{font-size:${titleSize}px;font-weight:600;color:#d1fae5;letter-spacing:0.03em;margin:0;line-height:1.1;text-shadow:0 2px 12px rgba(0,0,0,0.6)}
.subtitle{font-size:${subtitleSize}px;color:#6ee7b7;margin:${Math.round(h*0.02)}px 0 0;font-style:italic;letter-spacing:0.05em}
.badge{margin-top:${Math.round(h*0.04)}px;padding:${Math.round(h*0.012)}px ${Math.round(h*0.03)}px;border:1px solid #065f46;border-radius:999px;background:rgba(6,95,70,0.3);color:#d1fae5;font-size:${badgeSize}px;letter-spacing:0.15em}
.watermark{position:absolute;bottom:${Math.round(h*0.03)}px;right:${Math.round(w*0.025)}px;font-size:${Math.round(h*0.022)}px;color:rgba(110,231,183,0.55);letter-spacing:0.18em;font-family:'Helvetica Neue',sans-serif}
</style></head><body>
<div class="leaf">🌳</div>
<h1 class="title">${esc(spec.title)}</h1>
<div class="subtitle">${esc(spec.subtitle)}</div>
<div class="badge">${esc(spec.badge)}</div>
<div class="watermark">TRAILPAINT 路小繪</div>
</body></html>`;
}

function runChrome(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(CHROME, args, { stdio: 'pipe' });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`chrome ${c}`))));
  });
}
function runSips(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`sips ${c}`))));
  });
}

// ── Guards before any network work ──
for (let i = 1; i < SPOTS.length; i++) {
  if (SPOTS[i].era.start < SPOTS[i - 1].era.start) {
    throw new Error(`SPOTS not sorted by era.start at #${i + 1} ${SPOTS[i].title}`);
  }
}
for (const s of SPOTS) {
  if (s.era.end === new Date().getFullYear()) {
    throw new Error(`${s.title}: era.end must be STANDING (3000), not the current year`);
  }
  if (!s.desc.includes('來源：')) throw new Error(`${s.title}: desc missing 來源 line`);
}

await mkdir(TMP, { recursive: true });
await mkdir(STORY_DIR, { recursive: true });

const credits = [];
const failed = [];
console.log(`Building taiwan/${STORY_ID}/ — ${SPOTS.length} spots`);

const projSpots = [];
for (let i = 0; i < SPOTS.length; i++) {
  const s = SPOTS[i];
  const num = i + 1;
  process.stdout.write(`    ${num}. ${s.title}... `);
  const baseSpot = {
    id: `s${num}`, placeId: s.placeId, num, latlng: s.latlng, title: s.title,
    desc: s.desc, photo: null, iconId: 'pin',
    cardOffset: { x: 0, y: -60 },
    historical_refs: s.refs,
    era: s.era,
  };
  if (s.photo_local) {
    const { photo, meta } = loadLocalPhoto(s.photo_local);
    process.stdout.write(`✓ local ${s.photo_local.local} (${meta.license})\n`);
    credits.push({ num, title: s.title, file: s.photo_local.local, meta });
    projSpots.push({ ...baseSpot, photo, photoMeta: meta });
    continue;
  }
  if (!s.photo_file && !s.photo_query) {
    process.stdout.write('no photo (by design)\n');
    projSpots.push(baseSpot);
    continue;
  }
  const hit = s.photo_file ? await fetchCommonsFile(s.photo_file) : await searchCommonsTopHit(s.photo_query);
  if (!hit) {
    process.stdout.write('NO HIT\n');
    failed.push({ num, title: s.title, query: s.photo_query });
    projSpots.push(baseSpot);
    continue;
  }
  try {
    const photo = await fetchAsBase64(hit.thumbUrl);
    const meta = buildPhotoMeta(hit);
    process.stdout.write(`✓ ${hit.file} (${meta.license})\n`);
    credits.push({ num, title: s.title, file: hit.file, meta });
    projSpots.push({ ...baseSpot, photo, photoMeta: meta });
  } catch (e) {
    process.stdout.write('FETCH FAIL\n');
    failed.push({ num, title: s.title, query: s.photo_query, err: e.message });
    projSpots.push(baseSpot);
  }
  await sleep(500);
}

const project = {
  version: 5,
  name: CFG.projectName,
  center: SEGMENT.center,
  zoom: SEGMENT.zoom,
  overlay: SEGMENT.overlay,
  eraMode: 'cumulative',
  spots: projSpots,
  // Today's district outlines (019 design 3a) — plain routes, no spots attached.
  routes: CFG.boundaries.map((file, i, all) => {
    const pool = readPool(file);
    return {
      id: all.length === 1 ? 'boundary' : `boundary-${pool.towncode}`,
      name: `${pool.town}界（今日行政區）`,
      pts: [...pool.boundary.ring, pool.boundary.ring[0]],
      color: 'green', // ROUTE_COLORS id — hex values are reset to orange by migrateProject
      elevations: null,
    };
  }),
};
await writeFile(join(STORY_DIR, `${SEGMENT.id}.trailpaint.json`), JSON.stringify(project, null, 2));

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], [`${SEGMENT.id}-thumb`, 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(CFG.cover, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name.endsWith('-thumb') ? '78' : '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

const storyJson = {
  id: STORY_ID,
  title: CFG.title,
  subtitle: CFG.subtitle,
  description: SEGMENT.description,
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: SEGMENT.music,
    ...CFG.music,
  },
  og: {
    title: CFG.og.title,
    description: CFG.og.description.replace('{count}', String(SPOTS.length)),
    image: 'og.jpg',
  },
  stories: [{
    id: SEGMENT.id,
    title: SEGMENT.name,
    subtitle: SEGMENT.subtitle,
    description: SEGMENT.description,
    data: `${SEGMENT.id}.trailpaint.json`,
    thumbnail: `${SEGMENT.id}-thumb.jpg`,
    color: SEGMENT.color,
    music: SEGMENT.music,
  }],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

// 025 D4: the story page is generated too (static HTML so search engines see the text).
const REPO_ISSUES = 'https://github.com/notoriouslab/trailpaint/issues/new';
function storyPageHtml() {
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // `<` escaped so config text can never close the <script> it is embedded in.
  const json = (v) => JSON.stringify(v, null, 2).replace(/</g, '\\u003c');
  const url = `https://trailpaint.org/taiwan/${STORY_ID}/`;
  const desc = SEGMENT.description;
  const pageTitle = CFG.og.title;
  const report = `${REPO_ISSUES}?${new URLSearchParams({
    title: `[${STORY_ID}] `,
    body: '哪一點（名稱）：\n哪裡有誤：\n正確內容與出處（網址或書名）：\n',
  }).toString()}`;
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${CFG.title} — ${CFG.subtitle}`,
    description: desc,
    image: `${url}og.jpg`,
    datePublished: CFG.published,
    dateModified: CFG.updated,
    author: { '@type': 'Organization', name: 'NotoriousLab', url: 'https://github.com/notoriouslab' },
    publisher: {
      '@type': 'Organization',
      name: 'TrailPaint 路小繪',
      url: 'https://trailpaint.org/',
      logo: { '@type': 'ImageObject', url: 'https://trailpaint.org/app/favicon.svg' },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'zh-TW',
    hasPart: [{ '@type': 'CreativeWork', name: `${SEGMENT.name} — ${SEGMENT.subtitle}`, description: desc }],
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'TrailPaint 路小繪', item: 'https://trailpaint.org/' },
      { '@type': 'ListItem', position: 2, name: '台灣百年', item: 'https://trailpaint.org/taiwan/' },
      { '@type': 'ListItem', position: 3, name: CFG.title, item: url },
    ],
  };
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:title" content="${esc(pageTitle)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image" content="${url}og.jpg" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="zh_TW" />
  <meta property="og:site_name" content="TrailPaint 路小繪" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(pageTitle)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image" content="${url}og.jpg" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="NotoriousLab" />
  <link rel="icon" type="image/svg+xml" href="/app/favicon.svg" />
  <link rel="canonical" href="${url}" />
  <link rel="stylesheet" href="/stories/stories.css" />

  <script type="application/ld+json">
${json(article)}
  </script>
  <script type="application/ld+json">
${json(crumbs)}
  </script>
</head>
<body>
  <div class="stories-page stories-page--fixed">
    <header class="stories-header stories-header--compact">
      <a class="stories-header__back" href="/taiwan/">← 台灣百年</a>
      <h1 class="stories-header__title">${esc(CFG.title)}</h1>
      <p class="stories-header__subtitle">${esc(CFG.subtitle)}</p>
      <a class="stories-header__report" href="${esc(report)}" target="_blank" rel="noopener">發現錯誤？</a>
    </header>

    <div id="tabs" class="story-tabs"></div>
    <div id="desc" class="story-desc"></div>
    <div class="story-content">
      <iframe id="player" class="story-iframe" title="TrailPaint Story Player"></iframe>
    </div>
  </div>

  <section class="story-seo-content" hidden>
    <h2>${esc(CFG.title)} 互動地圖介紹</h2>
    <p>${esc(desc)}</p>

    <h3>${esc(SEGMENT.name)}</h3>
    <p>${esc(SEGMENT.subtitle)} ${esc(desc)}</p>

    <p>在 <a href="https://trailpaint.org/app/">TrailPaint 路小繪</a> 中建立你自己的故事地圖。</p>
  </section>

  <script src="/stories/stories.js"></script>
  <script>
    renderStoryPage({
      tabsId: 'tabs',
      iframeId: 'player',
      descId: 'desc',
      playerBase: '/app/player/',
      storyBase: '/taiwan/${STORY_ID}/',
      autoplay: true
    });
  </script>
</body>
</html>
`;
}
await writeFile(join(STORY_DIR, 'index.html'), storyPageHtml());


const lines = [
  CFG.credits.heading,
  '',
  '本故事為 **非營利個人展示** 使用。spot 圖片有三種來源：Wikimedia Commons（按各檔案 PD 或 CC BY/CC BY-SA 授權使用）、維護者自行拍攝（CC BY 4.0），以及著作財產權已消滅（著作權法 §34，1975 年（含）以前公開）的老照片。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '## Spot 照片',
  '',
  '| # | Spot | 作者 | 授權 | 來源 | 出處／發表年 |',
  '|---|---|---|---|---|---|',
  ...credits.map((c) => `| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | ${creditLink(c.meta)} | ${creditOrigin(c.meta)} |`),
  '',
  '## 年份與位置考證',
  '',
  ...CFG.credits.notes,
];
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n✅ ${SPOTS.length} spots, ${credits.length} photos ok, ${failed.length} failed`);
for (const f of failed) console.log(`   ⚠️ ${f.num} ${f.query} ${f.err || ''}`);
console.log(`\nOutput: ${STORY_DIR}`);
