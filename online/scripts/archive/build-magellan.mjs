#!/usr/bin/env node
/** Phase 14: stories/magellan/ 麥哲倫環球航行 1519-1522, 7 spots, no overlay. */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'magellan');
const TMP = '/tmp/tp-magellan';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEGMENT = {
  id: 'circumnavigation', name: '環球航行',
  subtitle: 'AD 1519 — 1522 從 Sevilla 到 Sanlúcar 三年',
  description: 'Fernão de Magalhães 葡萄牙人轉投西班牙王室，1519 年率 5 艘船 270 人從 Sevilla 出航尋香料群島西航路 — 史上首次環球航行。3 年後僅 Victoria 號 + 18 人由 Elcano 領回 Sanlúcar，葡西兩國以此確立西半球海權版圖（Treaty of Zaragoza 1529）。Magellan 1521 死於菲律賓 Mactan 島。',
  color: '#7c2d12', center: [0, -30], zoom: 2,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: 'Sevilla（1519 出航）', latlng: [37.3891, -5.9845],
      historical_refs: ['Antonio Pigafetta《Magellan\'s Voyage》(1525)'],
      desc: `1519 年 8 月 10 日 Magellan 率船隊離 Sevilla 沿瓜達基維河出海，再從 Sanlúcar 9 月 20 日正式出大西洋。船隊 5 艘船：Trinidad（旗艦）、San Antonio、Concepción、Victoria、Santiago，270 人含義大利貴族 Antonio Pigafetta — 後來唯一完整航程倖存的觀察記錄者，著《Primo viaggio attorno al mondo》成為一手史料。

學者引用：Pigafetta 同上書 Yale UP 2007 英譯本；Laurence Bergreen《Over the Edge of the World》(William Morrow, 2003) 章 2。`,
      photo_query: 'Sevilla Cathedral Spain|塞維亞主教座堂',
    },
    {
      title: 'Río de la Plata（1520 尋海峽）', latlng: [-34.9011, -56.1645],
      historical_refs: ['Pigafetta 1520 entries'],
      desc: `1520 年 1 月探索 Río de la Plata（今阿根廷/烏拉圭交界河口），曾誤以為是通向太平洋海峽，深入後發現淡水非鹹水。3 月在 Patagonia 過冬遭遇 4 個月暴風雪，第一次接觸 Tehuelche 原住民（巨人傳說由此而起 — Pigafetta 描述「身高為一般西班牙人兩倍」）。Patagonia 名稱即源自此次航行（patagones = 「大腳人」）。

學者引用：Bergreen 同上書章 5；Pigafetta 1520-04 entries 記 Patagonia 巨人傳說。`,
      photo_query: 'Rio de la Plata Buenos Aires Montevideo|拉普拉塔河',
    },
    {
      title: 'Strait of Magellan（1520 通過）', latlng: [-53.4500, -70.9500],
      historical_refs: ['Pigafetta 1520-10 entries'],
      desc: `1520 年 10 月 21 日進入今稱「Strait of Magellan」海峽 — 連接大西洋與太平洋的關鍵水道。航程 38 天通過迷宮般水道 + 火山島群（Tierra del Fuego「火地島」即因夜間原住民篝火得名）。期間 San Antonio 號叛變脫隊回西班牙，Santiago 號擱淺沉沒。1520 年 11 月 28 日 3 艘船首見太平洋，Magellan 命名為「Mar Pacifico」(平靜之海) — 因水域比繞 Cape Horn 平靜。

學者引用：Bergreen 同上書章 7；Felipe Fernández-Armesto《Pathfinders》(2006) 章 5 整理海峽通過細節。`,
      photo_query: 'Strait of Magellan Patagonia|麥哲倫海峽',
    },
    {
      title: 'Pacific crossing（1521 太平洋）', latlng: [10, -150],
      historical_refs: ['Pigafetta 1520-12 to 1521-03 entries'],
      desc: `1520 年 12 月至 1521 年 3 月，3 艘船橫跨太平洋 99 天無補給，只見 2 個無人島。船員飢餓嚴重病壞血病：Pigafetta 記「我們吃船板上的牛皮、用斧頭砸碎泡 4 日後嚥下；老鼠賣半個 ducat 一隻；水滲沙子發黃發臭」。19 人死於壞血病。1521 年 3 月 6 日抵 Guam（馬里亞納群島），原住民「拿走船上所有可移動物」— Magellan 命名為「Las Islas de los Ladrones」(賊群島)。

學者引用：Pigafetta 同上書 1521-01 至 03；Bergreen 同上書章 8 論太平洋穿越。`,
      photo_query: 'Pacific Ocean horizon ship sailing|太平洋帆船',
    },
    {
      title: 'Mactan（1521 Magellan 戰死）', latlng: [10.2949, 123.9986],
      historical_refs: ['Pigafetta 1521-04-27 entry'],
      desc: `1521 年 3 月 16 日船隊抵菲律賓 Cebu，部落首領 Humabon 受洗成為基督徒。但鄰近 Mactan 島部落首領 Lapu-Lapu 拒絕。Magellan 4 月 27 日率 60 名西班牙士兵 + Cebu 盟友 1000 人攻 Mactan，因海邊礁石阻擋大船登陸不便、被 Lapu-Lapu 1500 戰士伏擊，Magellan 中毒箭與長矛戰死沙灘。Pigafetta 記「他們殺了我們的鏡子、光、慰藉、忠實的嚮導」。今 Mactan 島立 Lapu-Lapu 紀念碑（Lapu-Lapu 在菲律賓被尊為民族英雄抗西始祖）。

學者引用：Pigafetta 同上書 1521-04-27 完整記載；Bergreen 同上書章 9；現代菲律賓史學者 Resil B. Mojares 整理 Lapu-Lapu 立場。`,
      photo_query: 'Mactan Lapu-Lapu monument|麥克坦拉普拉普',
    },
    {
      title: 'Tidore（1521 香料群島）', latlng: [0.6889, 127.4081],
      historical_refs: ['Pigafetta 1521-11 entries'],
      desc: `1521 年 11 月 8 日抵 Tidore（今印尼 Maluku 群島），Magellan 3 年航行的目標終於達成 — 香料群島，丁香 (clove) 的世界唯一產地。船隊裝 26 噸丁香 + 肉豆蔻、薑、檀香木。Tidore 蘇丹 Mansur 與葡西關係靈活（葡萄牙先抵 Ternate 1512，西班牙抵 Tidore 1521 平衡兩國勢力）。Trinidad 號超載觸礁無法回航，Victoria 號獨自決定西航繞好望角回西班牙。

學者引用：Bergreen 同上書章 10；Roderich Ptak《Die maritime Seidenstrasse》(C.H. Beck, 2007) 整理香料群島中世紀至 16 世紀貿易史。`,
      photo_query: 'Tidore island Maluku Indonesia|蒂多雷馬魯古',
    },
    {
      title: 'Sanlúcar（1522 Victoria 號回航）', latlng: [36.7766, -6.3527],
      historical_refs: ['Maximilianus Transylvanus《De Moluccis Insulis》(1523)'],
      desc: `1522 年 9 月 6 日 Victoria 號由 Juan Sebastián Elcano 領 18 名生還者抵 Sanlúcar de Barrameda — 完成史上首次環球航行 1080 天。3 年前出航 5 船 270 人，回航 1 船 18 人。Elcano 受神聖羅馬帝國查理五世封爵賜紋章 globus 圍 motto「Primus circumdedisti me」(你第一個環繞了我)。Pigafetta 證明赤道以南有大量陸地（澳洲不是傳說）+ 地球確為球體 + 西航繞地球比東繞好望角短一日（時差概念誕生）。

爭議：誰是「環球航行第一人」— Magellan 1521 死於 Mactan 未完整環球；Elcano 完成最後段，部分學者認 Magellan 應算 (1511 隨葡萄牙東行至 Maluku，加上 1519-21 西行回 Maluku 即 等於環球) — 但兩段不連貫。

學者引用：Bergreen 同上書終章；Felipe Fernández-Armesto《Amerigo: The Man Who Gave His Name to America》(Random House, 2007) 補論 Magellan 與 Vespucci 的歷史地位比較。`,
      photo_query: 'Sanlucar de Barrameda port Spain|聖盧卡爾港',
    },
  ],
};

const COVER_HTML_SPEC = { title: '麥哲倫環球航行', subtitle: '從 Sevilla 到 Sanlúcar 三年', badge: 'AD 1519 — 1522' };

async function searchCommonsTopHit(query) {
  const [zh, en] = query.split('|');
  for (const q of [zh, en].filter(Boolean)) {
    const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '1', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '600' }).toString();
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) continue;
    const j = await r.json();
    const pages = j.query?.pages;
    if (!pages) continue;
    const page = Object.values(pages)[0];
    const ii = page?.imageinfo?.[0];
    if (!ii?.thumburl) continue;
    const meta = ii.extmetadata || {};
    return { query: q, file: page.title.replace(/^File:/, ''), thumbUrl: ii.thumburl, sourceUrl: ii.descriptionurl, license: meta.LicenseShortName?.value || 'Unknown', artistHtml: meta.Artist?.value || '' };
  }
  return null;
}
async function fetchAsBase64(url) { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(`fetch ${r.status}`); return `data:image/jpeg;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`; }
function decodeEntities(s) { return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' '); }
function stripHtml(s) { return decodeEntities(s.replace(/<[^>]*>/g, '')).trim(); }
function extractFirstHref(html) { const m = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i); if (!m) return null; let href = m[1]; if (href.startsWith('//')) return `https:${href}`; if (href.startsWith('/')) return `https://commons.wikimedia.org${href}`; if (!/^https?:\/\//i.test(href)) return null; try { const host = new URL(href).hostname; if (/(^|\.)(wikimedia|wikipedia)\.org$/.test(host)) return href; return null; } catch { return null; } }
function buildPhotoMeta(hit) { return { source: 'wikimedia-commons', license: hit.license, author: stripHtml(hit.artistHtml) || 'Unknown', authorUrl: extractFirstHref(hit.artistHtml), sourceUrl: hit.sourceUrl }; }
function makeCoverHtml(spec, w, h) { const ts = Math.round(h * 0.11), ss = Math.round(h * 0.045), bs = Math.round(h * 0.035), ls = Math.round(h * 0.18); const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}body{width:${w}px;height:${h}px;background:radial-gradient(circle at 30% 35%,#2a1408 0%,#1c0a00 60%,#0e0500 100%);color:#fde68a;font-family:'Cormorant Garamond','Noto Serif TC',serif;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;text-align:center}body::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(212,165,116,0.04) 0 1px,transparent 1px 80px),repeating-linear-gradient(0deg,rgba(212,165,116,0.04) 0 1px,transparent 1px 80px);pointer-events:none}body::after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 ${Math.round(h*0.3)}px rgba(0,0,0,0.7);pointer-events:none}.l{font-size:${ls}px;line-height:1;margin-bottom:${Math.round(h*0.025)}px}.t{font-size:${ts}px;font-weight:600;color:#fde68a;letter-spacing:0.03em;margin:0;line-height:1.1}.s{font-size:${ss}px;color:#d4a574;margin:${Math.round(h*0.02)}px 0 0;font-style:italic}.b{margin-top:${Math.round(h*0.04)}px;padding:${Math.round(h*0.012)}px ${Math.round(h*0.03)}px;border:1px solid #78350f;border-radius:999px;background:rgba(120,53,15,0.25);color:#fde68a;font-size:${bs}px;letter-spacing:0.15em}.w{position:absolute;bottom:${Math.round(h*0.03)}px;right:${Math.round(w*0.025)}px;font-size:${Math.round(h*0.022)}px;color:rgba(212,165,116,0.55);letter-spacing:0.18em;font-family:sans-serif}</style></head><body><div class="l">🌿</div><h1 class="t">${esc(spec.title)}</h1><div class="s">${esc(spec.subtitle)}</div><div class="b">${esc(spec.badge)}</div><div class="w">TRAILPAINT 路小繪</div></body></html>`; }
function runChrome(args) { return new Promise((res, rej) => { const p = spawn(CHROME, args, { stdio: 'pipe' }); p.on('close', (c) => c === 0 ? res() : rej(new Error(`chrome ${c}`))); }); }
function runSips(args) { return new Promise((res, rej) => { const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] }); p.on('close', (c) => c === 0 ? res() : rej(new Error(`sips ${c}`))); }); }

await mkdir(TMP, { recursive: true });
await mkdir(STORY_DIR, { recursive: true });
const credits = [], failed = [];
console.log(`Building stories/magellan/ — 1 segment / ${SEGMENT.spots.length} spots`);
const projSpots = [];
for (let i = 0; i < SEGMENT.spots.length; i++) {
  const s = SEGMENT.spots[i], num = i + 1;
  process.stdout.write(`  ${num}. ${s.title}... `);
  const hit = await searchCommonsTopHit(s.photo_query);
  const baseSpot = { id: `s${num}`, num, latlng: s.latlng, title: s.title, desc: s.desc, photo: null, iconId: 'pin', cardOffset: { x: 0, y: -60 }, historical_refs: s.historical_refs };
  if (!hit) { process.stdout.write('NO HIT\n'); failed.push({ num, title: s.title, query: s.photo_query }); projSpots.push(baseSpot); continue; }
  let p = null; try { p = await fetchAsBase64(hit.thumbUrl); } catch (e) { process.stdout.write('FETCH FAIL\n'); failed.push({ num, title: s.title, err: e.message }); projSpots.push(baseSpot); continue; }
  const meta = buildPhotoMeta(hit);
  process.stdout.write(`✓ ${hit.file} (${meta.license})\n`);
  credits.push({ num, title: s.title, file: hit.file, meta });
  projSpots.push({ ...baseSpot, photo: p, photoMeta: meta });
  await sleep(500);
}
const project = { version: 5, name: `麥哲倫環球航行 — ${SEGMENT.name}`, center: SEGMENT.center, zoom: SEGMENT.zoom, basemapId: 'voyager', spots: projSpots, routes: [{ id: 'r1', name: SEGMENT.name, pts: SEGMENT.spots.map((s) => s.latlng), color: SEGMENT.color, elevations: null }] };
await writeFile(join(STORY_DIR, `${SEGMENT.id}.trailpaint.json`), JSON.stringify(project, null, 2));
console.log(`\n  cover: generating placeholder...`);
for (const [n, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], [`${SEGMENT.id}-thumb`, 400, 400]]) {
  const hp = join(TMP, `${n}.html`), pp = join(TMP, `${n}.png`);
  writeFileSync(hp, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome(['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${w},${h}`, `--screenshot=${pp}`, `file://${hp}`]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', n.endsWith('thumb') ? '78' : '85', pp, '--out', join(STORY_DIR, `${n}.jpg`)]);
  console.log(`    ✓ ${n}.jpg`);
}
const storyJson = { id: 'magellan', title: '麥哲倫環球航行', subtitle: SEGMENT.subtitle, description: SEGMENT.description, locale: 'zh-TW', cover: 'cover.jpg', music: { src: '../music/voller-hoffnung.mp3', title: 'Voller Hoffnung — Ronny Matthes', credit: 'Ronny Matthes (Jamendo / Internet Archive)', license: 'CC' }, og: { title: '麥哲倫環球航行 — TrailPaint Stories', description: SEGMENT.description, image: 'og.jpg' }, stories: [{ id: SEGMENT.id, title: SEGMENT.name, subtitle: SEGMENT.subtitle, description: SEGMENT.description, data: `${SEGMENT.id}.trailpaint.json`, thumbnail: `${SEGMENT.id}-thumb.jpg`, color: SEGMENT.color, music: '../music/voller-hoffnung.mp3' }], footer: { cta: '在 TrailPaint 中建立你自己的故事地圖', url: 'https://trailpaint.org/app/' } };
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));
const lines = ['# 麥哲倫環球航行 — 圖片來源與授權', '', '本故事為 **非營利個人學術展示** 使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。', '', `生成日期：${new Date().toISOString().slice(0, 10)}`, '', '---', '', '## Spot 照片', '', '| # | Spot | 作者 | 授權 | 來源 |', '|---|---|---|---|---|'];
for (const c of credits) lines.push(`| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
lines.push('', '## 路線爭議參考', '');
lines.push('- **「環球航行第一人」**：Magellan 1521 死於 Mactan 未完整環球，Elcano 完成最後段；部分學者認 Magellan 1511 隨葡東行至 Maluku 加 1519-21 西行回 Maluku 即環球，但兩段不連貫');
lines.push('- **「Patagonia 巨人」**：Pigafetta 記「身高為一般西班牙人兩倍」— 後世學者認為是文學誇飾，Tehuelche 男性平均 1.8m 對當時西班牙人 1.55m 確顯特高');
lines.push('- **Mactan 戰役 Lapu-Lapu 評價**：菲律賓尊為民族英雄抗西始祖 vs 西方傳統視為「殺害航海家的酋長」— 1990s 後菲律賓史學主流');
lines.push('', '學者引用：Pigafetta《Magellan\'s Voyage》(1525) 一手史料 / Bergreen《Over the Edge of the World》/ Fernández-Armesto《Pathfinders》/ Maximilianus Transylvanus《De Moluccis》/ Mojares 菲律賓史學');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));
console.log(`\n${'═'.repeat(60)}\n✅ ${SEGMENT.spots.length} spots, ${credits.length} ok, ${failed.length} failed`);
if (failed.length) for (const f of failed) console.log(`   ${f.num}  ${f.query || ''}  ${f.err || ''}`);
