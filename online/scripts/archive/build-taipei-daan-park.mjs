#!/usr/bin/env node
/**
 * Builder for stories/taipei-daan-park/ (021 大安森林公園 — first site-layout story).
 * One place across eras: each spot = a phase of the Da'an Forest Park block,
 * era = [start, end ?? 3000]; layout 'site' makes the Player keep the map on the
 * block and list the phases existing in the current year. Content comes from the
 * place pool data/places/tw/63000030.json (design D9); only phases with a source
 * quoted in the 2026-10-25 research are in the pool. The block is drawn as a route.
 *
 *   Run: node online/scripts/archive/build-taipei-daan-park.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'taipei-daan-park');
const TMP = join(tmpdir(), 'tp-taipei-daan-park');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** Still standing — never the current year, or it vanishes next January. */
const STANDING = 3000;

const SEGMENT = {
  id: 'daan-park',
  name: '大安森林公園',
  subtitle: '1904—今 一個街廓的百年',
  description: '定點時間軸：地圖停在大安森林公園這個街廓，拉動時間軸或按播放，旁邊列出那一年這裡有什麼。從 1904 年堡圖上的柴竹圍與稻田、1932 年劃定的七號公園預定地、戰後的建華新村與岳廬新村、國際學舍，到 1992 年拆遷與 1994 年開放的森林公園。只收有原文出處的階段，每則附來源；位置為街廓內示意。底圖依年份切換為同時代的中研院歷史地圖。',
  color: '#065f46',
  center: [25.0300, 121.5352],
  zoom: 16,
  overlay: { id: 'tw_1904', opacity: 0.6 },
  music: '../music/voller-hoffnung.mp3',
};

const POOL = JSON.parse(readFileSync(join(ROOT, 'data', 'places', 'tw', '63000030.json'), 'utf8'));
/** Pool items that are phases of this block (design D6/D9), in story order. */
const PHASE_IDS = [
  'chaizhuwei',
  'park-no7-plan',
  'jianhua-village',
  'yuelu-village',
  'intl-house',
  'daan-park-debate',
  'daan-park-construction',
  'daan-forest-park',
];
const missing = PHASE_IDS.filter((id) => !POOL.items.some((it) => it.id === id));
if (missing.length) throw new Error(`PHASE_IDS not in pool: ${missing.join(', ')}`);

const SPOTS = PHASE_IDS
  .map((id) => POOL.items.find((it) => it.id === id))
  .sort((a, b) => a.start - b.start) // stable: list order breaks same-year ties
  .map((it) => {
    const lines = [it.desc];
    if (it.latlngPrecision === 'approx') lines.push('位置為街廓內示意。');
    const tail = [`來源：${it.sources.map((x) => x.title).join('、')}`];
    if (it.related?.length) tail.push(`延伸閱讀：${it.related.map((x) => x.title).join('、')}`);
    return {
      title: it.name,
      latlng: it.latlng,
      era: { start: it.start, end: it.end ?? STANDING },
      desc: `${lines.join('')}\n\n${tail.join('\n')}`,
      refs: [...it.sources, ...(it.related ?? [])].map((x) => x.url),
    };
  });

/** The park block (信義路／新生南路／和平東路／建國南路), drawn as a closed route. */
const BLOCK = [
  [25.0336, 121.5327], [25.0336, 121.5373], [25.0262, 121.5373], [25.0262, 121.5327], [25.0336, 121.5327],
];

const COVER_HTML_SPEC = {
  title: '大安森林公園',
  subtitle: '一個街廓的百年',
  badge: '1904 — 今',
};

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

// ── Guards ──
for (const s of SPOTS) {
  if (s.era.end === new Date().getFullYear()) {
    throw new Error(`${s.title}: era.end must be STANDING (3000), not the current year`);
  }
  if (!s.desc.includes('來源：')) throw new Error(`${s.title}: desc missing 來源 line`);
}

await mkdir(TMP, { recursive: true });
await mkdir(STORY_DIR, { recursive: true });
console.log(`Building stories/taipei-daan-park/ — ${SPOTS.length} phases`);

const project = {
  version: 5,
  name: SEGMENT.name,
  center: SEGMENT.center,
  zoom: SEGMENT.zoom,
  overlay: SEGMENT.overlay,
  // eraMode is implied by layout 'site'; written out so an older Player still hides
  // phases that don't exist yet.
  eraMode: 'cumulative',
  layout: 'site',
  spots: SPOTS.map((s, i) => ({
    id: `p${i + 1}`, num: i + 1, latlng: s.latlng, title: s.title,
    desc: s.desc, photo: null, iconId: 'pin',
    cardOffset: { x: 0, y: -60 },
    historical_refs: s.refs,
    era: s.era,
  })),
  routes: [{
    id: 'block',
    name: '大安森林公園街廓',
    pts: BLOCK,
    color: 'green', // ROUTE_COLORS id — hex values are reset to orange by migrateProject
    elevations: null,
  }],
};
await writeFile(join(STORY_DIR, `${SEGMENT.id}.trailpaint.json`), JSON.stringify(project, null, 2));

console.log(`  cover: generating TrailPaint placeholder...`);
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
  id: 'taipei-daan-park',
  title: '大安森林公園',
  subtitle: SEGMENT.subtitle,
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
    title: '大安森林公園 — TrailPaint Stories',
    description: `定點時間軸：同一個街廓，${SPOTS.length} 個有出處的歷史階段。從柴竹圍稻田、七號公園預定地、眷村與國際學舍，到 1994 年開放的大安森林公園。`,
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

const sourceRows = [];
const seen = new Set();
for (const id of PHASE_IDS) {
  const it = POOL.items.find((x) => x.id === id);
  for (const s of [...it.sources, ...(it.related ?? [])]) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    sourceRows.push(`- [${s.title}](${s.url})`);
  }
}
const lines = [
  '# 大安森林公園 — 來源與授權',
  '',
  '本故事為 **非營利個人展示** 使用。各階段文字為本站依下列來源改寫，未轉載原文；Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '## 階段收錄原則',
  '',
  '- 只收有原文出處的階段；新南營區、信義路三段 56 巷聚落、軍中廣播電台等其他單位，因起始年或位置只有間接來源，未列為階段。',
  '- 階段交接年：舊階段的結束年 = 新階段起始年 − 1；1992 年 4 月開始拆遷，故眷村等階段記至 1991 年。柴竹圍記至 1949 年，因建華新村成立時「附近仍是一片稻田」，兩者並存一年。',
  '- 位置為街廓內示意，不是精確地址。',
  '- 內容來源：資料池 `data/places/tw/63000030.json`。',
  '- 歷史底圖：中央研究院人社中心 GIS 專題中心「臺灣百年歷史地圖」。',
  '',
  '## 文字來源',
  '',
  ...sourceRows,
];
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n') + '\n');

console.log(`\n✅ ${SPOTS.length} phases → ${STORY_DIR}`);
