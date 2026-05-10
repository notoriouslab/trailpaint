#!/usr/bin/env node
/**
 * One-shot builder for stories/revelation-churches/ (Tier 1, Phase 1, 2026-05-04).
 *
 * 8 spots: Patmos + 7 churches in Rev 1:11 order, all anchored to era AD 90-95
 * (rome_200 overlay via B-plan in eraScales.ts).
 *
 * Pipeline:
 *   For each SPOT (and the cover):
 *     1. Commons API search (Chinese|English bilingual fallback, identical to client-side
 *        commonsApi.ts behaviour from change 013 — kept in sync intentionally)
 *     2. Top hit's imageinfo → license + author + URLs
 *     3. fetchAsBase64(thumbUrl 600px) → embed into spot.photo
 *     4. Build photoMeta (D4 authorUrl whitelist applied)
 *   Then assemble seven-churches.trailpaint.json + story.json + CREDITS.md.
 *   Cover/og/thumb produced from the cover candidate's raw via sips.
 *
 * Run: `node online/scripts/archive/build-revelation-churches.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'revelation-churches');
const TMP = '/tmp/tp-revelation-churches';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SPOTS = [
  {
    id: 's1', num: 1, latlng: [37.310, 26.547],
    title: '拔摩島 Patmos',
    scripture_refs: ['Rev 1:9-11'],
    desc: `約翰流放之地。AD 95 前後羅馬皇帝 Domitian 迫害基督徒，將約翰流放到愛琴海多德卡尼斯群島中這座 13×8 公里的小石島。傳統認定的「啟示洞穴」位於今日 11 世紀建成的 St. John 修道院（UNESCO 1999 列名）內。從這裡，七封書信沿小亞細亞西部的羅馬郵路送往 7 座城。

學者引用：Steven Friesen《Imperial Cults and the Apocalypse of John》(Oxford, 2001)。`,
    photo_query: 'Patmos monastery|Patmos Saint John monastery exterior',
  },
  {
    id: 's2', num: 2, latlng: [37.949, 27.343],
    title: '以弗所 Ephesus',
    scripture_refs: ['Rev 2:1-7', 'Acts 19:1-41'],
    desc: `小亞細亞最大羅馬港都，亞細亞行省首府，AD 1 世紀人口逾 25 萬。保羅曾在此宣教三年（徒 19），約翰晚年牧養此教會。書信責備「離棄起初的愛」，呼應曾經的火熱已冷卻。賽爾蘇圖書館（Library of Celsus, AD 117 落成）廢墟是今日以弗所最知名地標。

學者引用：Colin Hemer《The Letters to the Seven Churches of Asia in their Local Setting》(Eerdmans, 1986)，逐封書信對照當地史地。`,
    photo_query: 'Library of Celsus Ephesus|以弗所圖書館',
  },
  {
    id: 's3', num: 3, latlng: [38.418, 27.139],
    title: '士每拿 Smyrna',
    scripture_refs: ['Rev 2:8-11'],
    desc: `小亞細亞第二大都市（今土耳其 Izmir）。BC 600 年左右士每拿曾被里底亞王國毀城兩次重建，書信「受患難十日」呼應其多災歷史。AD 156 教會領袖坡旅甲（Polycarp）在此殉道。Pagos 山下的 Agora 廣場是今存最完整的羅馬遺跡，AD 178 大地震後馬可奧理略皇帝資助重建。

學者引用：Colin Hemer 同上；Eusebius《Ecclesiastical History》IV.15 記坡旅甲殉道。`,
    photo_query: 'Agora of Smyrna ruins|士每拿廣場 Izmir',
  },
  {
    id: 's4', num: 4, latlng: [39.132, 27.184],
    title: '別迦摩 Pergamon',
    scripture_refs: ['Rev 2:12-17'],
    desc: `亞細亞行省最早的羅馬殖民地（BC 133）。「撒但座位之所在」一語的傳統解釋有三：山頂的 Zeus 大祭壇（今藏柏林 Pergamon Museum）、Asclepius 蛇神醫療中心、或羅馬皇帝崇拜的中心地（亞細亞最早的 imperial cult 神廟在此）。Acropolis 衛城上的圖書館曾收藏 20 萬卷僅次於亞歷山大圖書館。

學者引用：Hemer 同上；W. M. Ramsay《The Letters to the Seven Churches of Asia》(1904) 為傳統參考著作。`,
    photo_query: 'Pergamon Acropolis|Pergamum acropolis ruins',
  },
  {
    id: 's5', num: 5, latlng: [38.917, 27.838],
    title: '推雅推喇 Thyatira',
    scripture_refs: ['Rev 2:18-29', 'Acts 16:14'],
    desc: `小城但工會發達（紫染、銅器、皮革、麵包）。徒 16:14 那位「賣紫色布的呂底亞」（保羅在腓立比的第一位歐洲信徒）就出身於此。七封書信中篇幅最長，警告偽先知耶洗別與工會的偶像祭物糾葛。今日 Akhisar 市中心的 Tepe Mezarı 考古層 1969-71 挖掘，可見 6 世紀拜占庭教堂柱基。

學者引用：Hemer 同上。`,
    photo_query: 'Thyatira ruins Akhisar|推雅推喇遺址',
  },
  {
    id: 's6', num: 6, latlng: [38.488, 28.040],
    title: '撒狄 Sardis',
    scripture_refs: ['Rev 3:1-6'],
    desc: `古呂底亞王國首都，BC 6 世紀克羅伊索斯（Croesus）以富裕聞名（「rich as Croesus」由此而來）。雙重設防的衛城曾兩度被夜襲攻陷（BC 547 波斯居魯士、BC 218 塞琉古安條克三世），「按名是活的，其實是死的」疑暗指此城掉以輕心的歷史。Artemis 神殿廢墟保留兩根完整 Ionic 柱（BC 300 興建）。

學者引用：George M. A. Hanfmann《Sardis from Prehistoric to Roman Times》(Harvard, 1983)。`,
    photo_query: 'Temple of Artemis Sardis|撒狄阿耳忒彌斯神殿',
  },
  {
    id: 's7', num: 7, latlng: [38.345, 28.518],
    title: '非拉鐵非 Philadelphia',
    scripture_refs: ['Rev 3:7-13'],
    desc: `亞細亞通往內陸 Lycus 河谷的門戶城市（今 Alaşehir）。「永遠開的門」呼應其地理與宣教戰略位置。AD 17 大地震幾乎全城摧毀，提庇留皇帝免稅五年協助重建。書信中與士每拿並列，是七教會中得主稱讚未被責備的兩座。今日 Aşağı 區可見 6 世紀 Basilica of St. John 拱柱遺跡。

學者引用：Hemer 同上；Tacitus《Annals》2.47 記 AD 17 地震。`,
    photo_query: 'Alasehir|Filadelfya antik kenti',
  },
  {
    id: 's8', num: 8, latlng: [37.836, 29.107],
    title: '老底嘉 Laodicea',
    scripture_refs: ['Rev 3:14-22'],
    desc: `Lycus 河谷三城之一（與 Hierapolis、Colossae 三城同片)。「不冷不熱」的譴責呼應特殊水文：北邊 Hierapolis 熱泉（35°C，今帕慕卡萊白色梯田）、南邊 Colossae 冷泉，水經高架水道輸入老底嘉時已變溫水。書信譏其「自稱富足」呼應 AD 60 大地震後此城拒絕羅馬援助自費重建的紀錄。今 Pamukkale 大學 2002- 持續挖掘，2013 列 UNESCO Tentative List。

學者引用：Hemer 同上；Tacitus《Annals》14.27 記 AD 60 地震；Strabo《Geography》12.8.16。`,
    photo_query: 'Laodicea on the Lycus|老底嘉遺址 Anatolia',
  },
];

// Cover — generated as TrailPaint-styled placeholder (matches compilation
// covers from gen-compilation-placeholders.mjs). Avoids Commons search
// fragility on niche topics like "antique map of seven churches".
const COVER_HTML_SPEC = {
  title: '啟示錄七教會',
  subtitle: '約翰書信巡迴小亞細亞',
  badge: 'AD 95',
};

/* ── Commons API ── */

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
      year: meta.DateTimeOriginal?.value || meta.DateTime?.value || '',
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

async function fetchToFile(url, dest) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(dest, buf);
}

/* ── HTML/entity parsing (mirror commonsApi.ts) ── */

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
  // D4 whitelist: wikimedia / wikipedia retained, others null
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

function buildCreditLine(meta, file) {
  const parts = [meta.author];
  if (meta.license) parts.push(meta.license);
  parts.push(`Wikimedia Commons (${file})`);
  return parts.join(' — ');
}

/* ── sips wrappers ── */

function runSips(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`sips ${c}`))));
  });
}

/* ── Main ── */

await mkdir(TMP, { recursive: true });
await mkdir(STORY_DIR, { recursive: true });

const credits = [];
const failed = [];

console.log(`Building stories/revelation-churches/ — ${SPOTS.length} spots\n`);

const projSpots = [];
for (const s of SPOTS) {
  process.stdout.write(`  ${s.num}. ${s.title}... `);
  const hit = await searchCommonsTopHit(s.photo_query);
  if (!hit) {
    process.stdout.write('NO HIT\n');
    failed.push({ id: s.id, query: s.photo_query });
    projSpots.push({
      id: s.id, num: s.num, latlng: s.latlng, title: s.title,
      desc: s.desc, photo: null, iconId: 'pin',
      cardOffset: { x: 0, y: -60 },
      scripture_refs: s.scripture_refs,
      era: { start: 90, end: 95 },
    });
    continue;
  }
  let photoBase64 = null;
  try {
    photoBase64 = await fetchAsBase64(hit.thumbUrl);
  } catch (e) {
    process.stdout.write(`FETCH FAIL (${e.message})\n`);
    failed.push({ id: s.id, query: s.photo_query, err: e.message });
    projSpots.push({
      id: s.id, num: s.num, latlng: s.latlng, title: s.title,
      desc: s.desc, photo: null, iconId: 'pin',
      cardOffset: { x: 0, y: -60 },
      scripture_refs: s.scripture_refs,
      era: { start: 90, end: 95 },
    });
    continue;
  }
  const meta = buildPhotoMeta(hit);
  process.stdout.write(`✓ ${hit.file} (${meta.license})\n`);
  credits.push({ section: 'spot', num: s.num, title: s.title, file: hit.file, meta });
  projSpots.push({
    id: s.id, num: s.num, latlng: s.latlng, title: s.title,
    desc: s.desc, photo: photoBase64, iconId: 'pin',
    cardOffset: { x: 0, y: -60 },
    scripture_refs: s.scripture_refs,
    era: { start: 90, end: 95 },
    photoMeta: meta,
  });
  await sleep(500); // politeness; same as autoFetchPhotos.ts
}

/* ── Cover / OG / Thumb (TrailPaint-styled placeholder) ── */
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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
body{width:${w}px;height:${h}px;background:radial-gradient(circle at 30% 35%,#2a1408 0%,#1c0a00 60%,#0e0500 100%);color:#fde68a;font-family:'Cormorant Garamond','EB Garamond','Noto Serif TC',serif;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;text-align:center}
body::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(212,165,116,0.04) 0 1px,transparent 1px 80px),repeating-linear-gradient(0deg,rgba(212,165,116,0.04) 0 1px,transparent 1px 80px);pointer-events:none}
body::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 ${Math.round(h*0.3)}px rgba(0,0,0,0.7);pointer-events:none}
.leaf{font-size:${leafSize}px;line-height:1;margin-bottom:${Math.round(h*0.025)}px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.5))}
.title{font-size:${titleSize}px;font-weight:600;color:#fde68a;letter-spacing:0.03em;margin:0;line-height:1.1;text-shadow:0 2px 12px rgba(0,0,0,0.6)}
.subtitle{font-size:${subtitleSize}px;color:#d4a574;margin:${Math.round(h*0.02)}px 0 0;font-style:italic;letter-spacing:0.05em}
.badge{margin-top:${Math.round(h*0.04)}px;padding:${Math.round(h*0.012)}px ${Math.round(h*0.03)}px;border:1px solid #78350f;border-radius:999px;background:rgba(120,53,15,0.25);color:#fde68a;font-size:${badgeSize}px;letter-spacing:0.15em}
.watermark{position:absolute;bottom:${Math.round(h*0.03)}px;right:${Math.round(w*0.025)}px;font-size:${Math.round(h*0.022)}px;color:rgba(212,165,116,0.55);letter-spacing:0.18em;font-family:'Helvetica Neue',sans-serif}
</style></head><body>
<div class="leaf">🌿</div>
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

async function generatePlaceholder(htmlPath, pngPath, w, h) {
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
}

process.stdout.write(`\n  cover: generating TrailPaint placeholder...\n`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], ['seven-churches-thumb', 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await generatePlaceholder(htmlPath, pngPath, w, h);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  process.stdout.write(`    ✓ ${name}.jpg (${w}×${h})\n`);
}

/* ── Write segment trailpaint.json ── */
const segment = {
  version: 5,
  name: '啟示錄七教會 — 書信巡迴',
  center: [38.4, 27.7],
  zoom: 7,
  basemapId: 'voyager',
  overlay: { id: 'rome_200', opacity: 0.5 },
  spots: projSpots,
  routes: [
    {
      id: 'r1',
      name: '羅馬郵差路線',
      pts: SPOTS.map((s) => s.latlng),
      color: '#7f1d1d',
      elevations: null,
    },
  ],
};
await writeFile(join(STORY_DIR, 'seven-churches.trailpaint.json'),
  JSON.stringify(segment, null, 2));

/* ── Write story.json ── */
const storyJson = {
  id: 'revelation-churches',
  title: '啟示錄七教會',
  subtitle: 'AD 95 約翰書信巡迴小亞細亞',
  description: '使徒約翰在拔摩島受啟示，書信沿羅馬郵路送往小亞細亞 7 座城——以弗所、士每拿、別迦摩、推雅推喇、撒狄、非拉鐵非、老底嘉。每封書信責備或稱讚呼應該城的歷史與地理特性，是啟示錄 1-3 章的地理底本。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/sorrow-and-love.mp3',
    title: 'Sorrow and Love — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '啟示錄七教會 — TrailPaint Stories',
    description: '使徒約翰書信巡迴小亞細亞 7 座城互動地圖（AD 95，DARE 羅馬古典時期底圖）',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'seven-churches',
      title: '書信巡迴',
      subtitle: '拔摩島 → 7 城（啟 1:11 順序）',
      description: '從拔摩島啟程，沿羅馬郵差路線走訪 7 城，書信文本與當地考古層層對照。',
      data: 'seven-churches.trailpaint.json',
      thumbnail: 'seven-churches-thumb.jpg',
      color: '#7f1d1d',
      music: '../music/sorrow-and-love.mp3',
    },
  ],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

/* ── CREDITS.md ── */
const creditsLines = [
  '# 啟示錄七教會 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / 縮圖',
  '',
];
const coverCredit = credits.find((c) => c.section === 'cover');
if (coverCredit) {
  creditsLines.push(`| 檔案 | 作者 | 授權 | 來源 |`);
  creditsLines.push(`|---|---|---|---|`);
  creditsLines.push(`| cover.jpg / og.jpg / thumb.jpg | ${coverCredit.meta.author} | ${coverCredit.meta.license} | [Commons File](${coverCredit.meta.sourceUrl}) |`);
  creditsLines.push('');
}
creditsLines.push('## Spot 照片');
creditsLines.push('');
creditsLines.push(`| # | Spot | 作者 | 授權 | 來源 |`);
creditsLines.push(`|---|---|---|---|---|`);
for (const c of credits.filter((c) => c.section === 'spot')) {
  creditsLines.push(`| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
}
await writeFile(join(STORY_DIR, 'CREDITS.md'), creditsLines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
console.log(`✅ ${SPOTS.length} spots, ${credits.filter((c) => c.section === 'spot').length} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.id}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
