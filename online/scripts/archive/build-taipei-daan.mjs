#!/usr/bin/env node
/**
 * Builder for stories/taipei-daan/ (019 大安區百年 — first district time-map story).
 * One segment, cumulative eraMode: each spot = a public facility, era = [opened at
 * this site, demolished ?? 3000]. Content comes from the place pool
 * data/places/tw/63000030.json (verified items only); years were checked per
 * item against zh.wikipedia because Wikidata inception mixes "institution
 * founded" with "opened here". The district outline is drawn as a route.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'taipei-daan');
const TMP = join(tmpdir(), 'tp-taipei-daan');
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Still standing — see design D5: never the current year, or it vanishes next January. */
const STANDING = 3000;

const SEGMENT = {
  id: 'daan',
  name: '大安百年',
  subtitle: '1904—今 從柴竹圍水田到都市之肺',
  description: '拉動時間軸，看臺北大安區一百多年來的公共建設如何一個個出現：日治時期的監獄與學校、戰後的國中國小與高架道路、九〇年代以後的森林公園、捷運與運動中心。底圖依年份切換為同時代的中研院歷史地圖（1904 臺灣堡圖、1945 美軍市街圖、1955 地形圖、1966 衛星影像、1989 與 1993 經建版地形圖）。範圍以今日大安區界為準（1990 年行政區重劃後）；年份為「在現址啟用」之年，每點附來源。',
  color: '#065f46',
  center: [25.027, 121.541],
  zoom: 14,
  overlay: { id: 'tw_1904', opacity: 0.6 },
  music: '../music/voller-hoffnung.mp3',
};

// Content lives in the place pool (data/places/tw/<TOWNCODE>.json) so other
// districts reuse the same pipeline; this script only turns it into a story.
const POOL = JSON.parse(readFileSync(join(ROOT, 'data', 'places', 'tw', '63000030.json'), 'utf8'));
/**
 * Pool items shown in the story (020 T8). The pool keeps growing from the
 * places pipeline; a new item enters the story only when its id is added here.
 */
const STORY_IDS = new Set([
  'taihoku-prison',
  'taihoku-tech-red-house',
  'second-normal-school',
  'taihoku-imperial-university',
  'taihoku-high-school-auditorium',
  'nishiki-elementary',
  'daan-public-school',
  'third-middle-school',
  'jinhua-junior-high',
  'renai-elementary',
  'daan-junior-high',
  'ntust',
  'cathay-general-hospital',
  'second-funeral-parlor',
  'jianguo-elevated-road',
  'taipei-public-library-main',
  'daan-forest-park',
  'mrt-daan',
  'mrt-zhongxiao-dunhua',
  'ntu-sports-center',
  'daan-sports-center',
  'mrt-daan-park',
  'mrt-xinyi-anhe',
  'heping-basketball-gym',
]);
const missing = [...STORY_IDS].filter((id) => !POOL.items.some((it) => it.id === id));
if (missing.length) throw new Error(`STORY_IDS not in pool: ${missing.join(', ')}`);
// List order breaks same-year ties; the pool file's own order changes as it grows.
const SPOTS = [...STORY_IDS]
  .map((id) => POOL.items.find((it) => it.id === id))
  .sort((a, b) => a.start - b.start) // Player plays in order → time moves forward
  .map((it) => ({
    title: it.name,
    latlng: it.latlng,
    era: { start: it.start, end: it.end ?? STANDING },
    desc: `${it.desc}\n\n來源：${it.sources.map((x) => x.title).join('、')}`,
    refs: it.sources.map((x) => x.url),
    photo_file: it.photo?.file,
    photo_query: it.photo?.query ?? null,
  }));


const COVER_HTML_SPEC = {
  title: '大安區百年',
  subtitle: '從柴竹圍水田到都市之肺',
  badge: '1904 — 今',
};

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
console.log(`Building stories/taipei-daan/ — ${SPOTS.length} spots`);

const projSpots = [];
for (let i = 0; i < SPOTS.length; i++) {
  const s = SPOTS[i];
  const num = i + 1;
  process.stdout.write(`    ${num}. ${s.title}... `);
  const baseSpot = {
    id: `s${num}`, num, latlng: s.latlng, title: s.title,
    desc: s.desc, photo: null, iconId: 'pin',
    cardOffset: { x: 0, y: -60 },
    historical_refs: s.refs,
    era: s.era,
  };
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
  name: `大安區百年 — ${SEGMENT.name}`,
  center: SEGMENT.center,
  zoom: SEGMENT.zoom,
  overlay: SEGMENT.overlay,
  eraMode: 'cumulative',
  spots: projSpots,
  // Today's district outline (design 3a) — a plain route, no spots attached.
  routes: [{
    id: 'boundary',
    name: `${POOL.town}界（今日行政區）`,
    pts: [...POOL.boundary.ring, POOL.boundary.ring[0]],
    color: 'green', // ROUTE_COLORS id — hex values are reset to orange by migrateProject
    elevations: null,
  }],
};
await writeFile(join(STORY_DIR, `${SEGMENT.id}.trailpaint.json`), JSON.stringify(project, null, 2));

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], [`${SEGMENT.id}-thumb`, 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
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
  id: 'taipei-daan',
  title: '大安區百年',
  subtitle: '1904—今 臺北大安區公共建設時空地圖',
  description: SEGMENT.description,
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: SEGMENT.music,
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '大安區百年 — TrailPaint Stories',
    description: `互動時空地圖：拉動時間軸，看臺北大安區 ${SPOTS.length} 處公共建設從 1904 年到今天一個個出現，底圖隨年份切換為中研院 1904、1945、1955、1966、1989、1993 歷史地圖。`,
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

const lines = [
  '# 大安區百年 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '## Spot 照片',
  '',
  '| # | Spot | 作者 | 授權 | 來源 |',
  '|---|---|---|---|---|',
  ...credits.map((c) => `| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`),
  '',
  '## 年份與位置考證',
  '',
  '- 年份為設施「在現址啟用」之年，逐筆對驗維基百科條目（各 spot 說明末附來源）；Wikidata 僅作候選池（其 inception 常混用機構創立年，例：金華國中標 1937，實為 1944 遷入現址）。',
  '- 內容來源：資料池 `data/places/tw/63000030.json`（僅收已對驗項目）。',
  '- 範圍以今日大安區界為準（內政部國土測繪中心鄉鎮市區界；1990 年行政區重劃併入原古亭區羅斯福路以東等地）；地圖上的虛線為今日區界。',
  '- 歷史底圖：中央研究院人社中心 GIS 專題中心「臺灣百年歷史地圖」— 1904 臺灣堡圖、1945 美軍繪製臺灣城市地圖、1955 二萬五千分一臺灣省圖、1966 Corona 衛星影像、1989 經建版地形圖、1993 經建二版地形圖。',
];
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n✅ ${SPOTS.length} spots, ${credits.length} photos ok, ${failed.length} failed`);
for (const f of failed) console.log(`   ⚠️ ${f.num} ${f.query} ${f.err || ''}`);
console.log(`\nOutput: ${STORY_DIR}`);
