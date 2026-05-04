#!/usr/bin/env node
/**
 * Phase 13: stories/columbus/ — 哥倫布四次航海 1492-1506.
 * 6 spots, no overlay.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'columbus');
const TMP = '/tmp/tp-columbus';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEGMENT = {
  id: 'voyages',
  name: '四次航海',
  subtitle: 'AD 1492 — 1506 從 Palos 到 Valladolid',
  description: 'Cristoforo Colombo（西班牙文 Cristóbal Colón）熱那亞商人，1492 西班牙天主教雙王資助下從 Palos 出航尋亞洲新航路；首登巴哈馬 San Salvador 開啟「大西洋世界」。本路線 6 spots 涵蓋四次航海關鍵節點與 1506 Valladolid 葬地。',
  color: '#7c2d12',
  center: [25.0, -50.0],
  zoom: 3,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: 'Palos de la Frontera（1492 第一航出發）',
      latlng: [37.2294, -6.8927],
      historical_refs: ['Christopher Columbus《Diario》(1492-93)，Bartolomé de las Casas 1530s 抄本'],
      desc: `1492 年 8 月 3 日清晨從西班牙南部 Palos de la Frontera 港出航，乘 Santa María（旗艦）+ Pinta + Niña 三艘船共 90 人。先停 Canary Islands 補給後西航 33 日，10 月 12 日凌晨 2 時水手 Rodrigo de Triana 喊「Tierra!」(陸地!) 抵今巴哈馬 San Salvador 島。Palos 廣場立有 La Rábida 修道院（1481 Columbus 在此遊說 Franciscan 會士向西班牙宮廷推薦）。

學者引用：Samuel Eliot Morison《Admiral of the Ocean Sea》(Little Brown, 1942) 普立茲獎經典；Felipe Fernández-Armesto《Columbus》(Oxford, 1991) 章 5。`,
      photo_query: 'La Rabida monastery Palos Spain|Palos 西班牙 La Rabida 修道院',
    },
    {
      title: 'San Salvador（1492 首登新大陸）',
      latlng: [24.0641, -74.4862],
      historical_refs: ['Columbus《Diario》1492-10-12'],
      desc: `1492 年 10 月 12 日 Columbus 抵今巴哈馬 San Salvador 島（Lucayan 原住民稱 Guanahani），插上 castile 王旗宣告「西班牙國王屬地」。Columbus 認為已抵 East Indies — 此誤解使加勒比島民被永久誤稱「Indians」(印第安人)。位置爭議：Watling Island（傳統 1925 確定）vs Samana Cay（1986 National Geographic 提議）vs Plana Cays — 多數學者支持 Watling/今 San Salvador。

學者引用：Joseph Judge《Where Columbus Found the New World》(National Geographic, 1986) 提 Samana 假說；Morison 同上書章 11 主張 Watling，仍是學界主流。`,
      photo_query: 'San Salvador Bahamas Columbus|聖薩爾瓦多巴哈馬',
    },
    {
      title: 'La Isabela / Hispaniola（1493 第二航殖民）',
      latlng: [19.8836, -71.0742],
      historical_refs: ['Las Casas《Historia de las Indias》Book 1 (1561)'],
      desc: `1493 年第二航 17 艘船 1,200 人移民，於今多明尼加北岸建 La Isabela — 美洲第一個正式歐洲市鎮。城內含教堂、總督府、糧倉，但選址不善（缺淡水 + 瘧疾盛行）1498 廢棄。同地後遷 Santo Domingo（1496-98 由 Bartolomé Columbus 建）成為西班牙美洲首府。1493-1500 間 Columbus 對 Taíno 原住民實施奴役、勞役 — 1500 年國王特派 Francisco de Bobadilla 押解 Columbus 鐐銬回西班牙審判其暴政。

學者引用：Las Casas 同上書 Bk 1 整理 La Isabela 衰敗；Kathleen Deagan《Columbus's Outpost among the Taínos》(Yale UP, 2002) 考古發掘報告。`,
      photo_query: 'Santo Domingo colonial Dominican|聖多明哥殖民區',
    },
    {
      title: 'Trinidad（1498 第三航南美）',
      latlng: [10.7400, -61.5000],
      historical_refs: ['Columbus 第三航日誌 (1498-08)'],
      desc: `1498 年 8 月 1 日 Columbus 第三航首見南美洲北岸（今 Venezuela）— 看見奧里諾科河 (Orinoco) 大量淡水入海，意識到「這必是大陸而非島」。但仍稱此「地上樂園」(terrestrial paradise) 並認為是亞洲東岸。Trinidad 島命名為「Holy Trinity」紀念三位一體。同期間 Hispaniola 殖民地內亂（西班牙移民控告 Columbus 暴政），1500 年國王派 Bobadilla 鐐銬押解 Columbus 回西班牙。

學者引用：Morison 同上書章 17；William D. Phillips & Carla Rahn Phillips《The Worlds of Christopher Columbus》(Cambridge UP, 1992) 章 8。`,
      photo_query: 'Trinidad island Caribbean coast|千里達加勒比海',
    },
    {
      title: 'Panama（1502 第四航尋海峽）',
      latlng: [9.3547, -79.9011],
      historical_refs: ['Columbus《Lettera Rarissima》(1503-07-07)'],
      desc: `1502-1504 第四航 Columbus 失寵後最後出航，求尋通向亞洲的「海峽」（實際巴拿馬地峽）。沿中美洲東岸從 Honduras 到 Panama 探索 4 個月，建短暫殖民地 Santa María de Belén（1503，迅遭原住民攻擊撤離）。1503 年颶風損毀船隊，被困牙買加 Saint Ann\'s Bay 一年（1503-04 月圓利用月蝕嚇唬原住民取糧的著名事件）。1504 返西班牙時 Columbus 已重病。

學者引用：Morison 同上書章 18-19；Fernández-Armesto 同上書章 9。`,
      photo_query: 'Panama Caribbean coast colonial|巴拿馬加勒比海岸',
    },
    {
      title: 'Valladolid（1506 卒地）',
      latlng: [41.6523, -4.7245],
      historical_refs: ['Las Casas《Historia》Bk 2 ch 38'],
      desc: `1506 年 5 月 20 日 Columbus 54 歲卒於 Valladolid（西班牙北部，當時宮廷暫居地），死前堅信他已找到「東印度」未知亞洲新通道。葬禮極簡，遺體後遷 Sevilla 大教堂（今墓在 Sevilla Cathedral 內，由四名 castile/aragon/leon/navarra 王國代表抬棺像）。500 年來 Columbus 學術評價兩極：航海技術與毅力公認，但對 Taíno 原住民的奴役、暴政成為當代去殖民史學重點。1992 哥倫布 500 周年起多國重審「Columbus Day」紀念意義。

學者引用：Las Casas 同上書 Bk 2 (1561)；David E. Stannard《American Holocaust》(Oxford UP, 1992) 整理 Columbus 殖民暴政；Carol Delaney《Columbus and the Quest for Jerusalem》(Free Press, 2011) 重審 Columbus 末世神學動機。`,
      photo_query: 'Valladolid Spain old town|巴利亞多利德西班牙古城',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '哥倫布四次航海',
  subtitle: '從 Palos 到 Valladolid',
  badge: 'AD 1492 — 1506',
};

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
function decodeEntities(s) { return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' '); }
function stripHtml(s) { return decodeEntities(s.replace(/<[^>]*>/g, '')).trim(); }
function extractFirstHref(html) {
  const m = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i);
  if (!m) return null;
  let href = m[1];
  if (href.startsWith('//')) return `https:${href}`;
  if (href.startsWith('/')) return `https://commons.wikimedia.org${href}`;
  if (!/^https?:\/\//i.test(href)) return null;
  try { const host = new URL(href).hostname; if (/(^|\.)(wikimedia|wikipedia)\.org$/.test(host)) return href; return null; } catch { return null; }
}
function buildPhotoMeta(hit) {
  return { source: 'wikimedia-commons', license: hit.license, author: stripHtml(hit.artistHtml) || 'Unknown', authorUrl: extractFirstHref(hit.artistHtml), sourceUrl: hit.sourceUrl };
}
function makeCoverHtml(spec, w, h) {
  const titleSize = Math.round(h * 0.11), subtitleSize = Math.round(h * 0.045), badgeSize = Math.round(h * 0.035), leafSize = Math.round(h * 0.18);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}body{width:${w}px;height:${h}px;background:radial-gradient(circle at 30% 35%,#2a1408 0%,#1c0a00 60%,#0e0500 100%);color:#fde68a;font-family:'Cormorant Garamond','Noto Serif TC',serif;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;text-align:center}body::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(212,165,116,0.04) 0 1px,transparent 1px 80px),repeating-linear-gradient(0deg,rgba(212,165,116,0.04) 0 1px,transparent 1px 80px);pointer-events:none}body::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 ${Math.round(h*0.3)}px rgba(0,0,0,0.7);pointer-events:none}.leaf{font-size:${leafSize}px;line-height:1;margin-bottom:${Math.round(h*0.025)}px}.title{font-size:${titleSize}px;font-weight:600;color:#fde68a;letter-spacing:0.03em;margin:0;line-height:1.1}.subtitle{font-size:${subtitleSize}px;color:#d4a574;margin:${Math.round(h*0.02)}px 0 0;font-style:italic}.badge{margin-top:${Math.round(h*0.04)}px;padding:${Math.round(h*0.012)}px ${Math.round(h*0.03)}px;border:1px solid #78350f;border-radius:999px;background:rgba(120,53,15,0.25);color:#fde68a;font-size:${badgeSize}px;letter-spacing:0.15em}.watermark{position:absolute;bottom:${Math.round(h*0.03)}px;right:${Math.round(w*0.025)}px;font-size:${Math.round(h*0.022)}px;color:rgba(212,165,116,0.55);letter-spacing:0.18em;font-family:sans-serif}</style></head><body><div class="leaf">🌿</div><h1 class="title">${esc(spec.title)}</h1><div class="subtitle">${esc(spec.subtitle)}</div><div class="badge">${esc(spec.badge)}</div><div class="watermark">TRAILPAINT 路小繪</div></body></html>`;
}
function runChrome(args) { return new Promise((resolve, reject) => { const p = spawn(CHROME, args, { stdio: 'pipe' }); p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`chrome ${c}`)))); }); }
function runSips(args) { return new Promise((resolve, reject) => { const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] }); p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`sips ${c}`)))); }); }

await mkdir(TMP, { recursive: true });
await mkdir(STORY_DIR, { recursive: true });

const credits = [], failed = [];
console.log(`Building stories/columbus/ — 1 segment / ${SEGMENT.spots.length} spots`);

const projSpots = [];
for (let i = 0; i < SEGMENT.spots.length; i++) {
  const s = SEGMENT.spots[i];
  const num = i + 1;
  process.stdout.write(`  ${num}. ${s.title}... `);
  const hit = await searchCommonsTopHit(s.photo_query);
  const baseSpot = { id: `s${num}`, num, latlng: s.latlng, title: s.title, desc: s.desc, photo: null, iconId: 'pin', cardOffset: { x: 0, y: -60 }, historical_refs: s.historical_refs };
  if (!hit) { process.stdout.write('NO HIT\n'); failed.push({ num, title: s.title, query: s.photo_query }); projSpots.push(baseSpot); continue; }
  let photoBase64 = null;
  try { photoBase64 = await fetchAsBase64(hit.thumbUrl); } catch (e) { process.stdout.write(`FETCH FAIL\n`); failed.push({ num, title: s.title, query: s.photo_query, err: e.message }); projSpots.push(baseSpot); continue; }
  const meta = buildPhotoMeta(hit);
  process.stdout.write(`✓ ${hit.file} (${meta.license})\n`);
  credits.push({ num, title: s.title, file: hit.file, meta });
  projSpots.push({ ...baseSpot, photo: photoBase64, photoMeta: meta });
  await sleep(500);
}

const project = {
  version: 5,
  name: `哥倫布四次航海 — ${SEGMENT.name}`,
  center: SEGMENT.center, zoom: SEGMENT.zoom, basemapId: 'voyager',
  spots: projSpots,
  routes: [{ id: 'r1', name: SEGMENT.name, pts: SEGMENT.spots.map((s) => s.latlng), color: SEGMENT.color, elevations: null }],
};
await writeFile(join(STORY_DIR, `${SEGMENT.id}.trailpaint.json`), JSON.stringify(project, null, 2));

console.log(`\n  cover: generating placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], [`${SEGMENT.id}-thumb`, 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`), pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome(['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, `--screenshot=${pngPath}`, `file://${htmlPath}`]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name.endsWith('thumb') ? '78' : '85', pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg`);
}

const storyJson = {
  id: 'columbus', title: '哥倫布四次航海',
  subtitle: SEGMENT.subtitle, description: SEGMENT.description,
  locale: 'zh-TW', cover: 'cover.jpg',
  music: { src: '../music/voller-hoffnung.mp3', title: 'Voller Hoffnung — Ronny Matthes', credit: 'Ronny Matthes (Jamendo / Internet Archive)', license: 'CC' },
  og: { title: '哥倫布四次航海 — TrailPaint Stories', description: SEGMENT.description, image: 'og.jpg' },
  stories: [{ id: SEGMENT.id, title: SEGMENT.name, subtitle: SEGMENT.subtitle, description: SEGMENT.description, data: `${SEGMENT.id}.trailpaint.json`, thumbnail: `${SEGMENT.id}-thumb.jpg`, color: SEGMENT.color, music: '../music/voller-hoffnung.mp3' }],
  footer: { cta: '在 TrailPaint 中建立你自己的故事地圖', url: 'https://trailpaint.org/app/' },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

const lines = [
  '# 哥倫布四次航海 — 圖片來源與授權', '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。', '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`, '', '---', '',
  '## Spot 照片', '',
  '| # | Spot | 作者 | 授權 | 來源 |', '|---|---|---|---|---|',
];
for (const c of credits) lines.push(`| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
lines.push('', '## 路線爭議參考', '');
lines.push('- **首登地點**：Watling Island / 今 San Salvador（傳統 1925 確定）vs Samana Cay (1986 National Geographic) — 多數學者支持 Watling');
lines.push('- **Columbus 殖民暴政**：1500 年 Bobadilla 押解 Columbus 鐐銬回西班牙審判 — 1992 後當代去殖民史學重審 Columbus Day 紀念意義');
lines.push('- **「發現新大陸」措辭**：當代學者改稱「歐洲與美洲的相遇」(Encounter)，呈現 Taíno 原住民既有文明視角');
lines.push('', '學者引用：Morison《Admiral of the Ocean Sea》/ Fernández-Armesto《Columbus》/ Phillips《Worlds of Columbus》/ Las Casas《Historia》/ Stannard《American Holocaust》/ Delaney《Columbus and the Quest for Jerusalem》/ Deagan 考古');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
console.log(`✅ ${SEGMENT.spots.length} spots, ${credits.length} ok, ${failed.length} failed`);
if (failed.length) for (const f of failed) console.log(`   ${f.num}  ${f.query}  ${f.err || ''}`);
