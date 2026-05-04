#!/usr/bin/env node
/**
 * One-shot builder for stories/exodus-conquest/ (Tier 1 Phase 2, 2026-05-04).
 *
 * Two segments anchored to era.exodus (BC 1446 traditional早期出埃及論):
 *   - exodus.trailpaint.json     7 spots  歌珊 → 西奈山
 *   - conquest.trailpaint.json   6 spots  加低斯 → 示劍
 *
 * Pipeline mirrors build-revelation-churches.mjs (Phase 1):
 *   Commons API search → photoMeta + base64 → segment + story.json + CREDITS.md.
 *   Cover/og/thumb generated as TrailPaint placeholder via Chrome headless.
 *
 * Run: `node online/scripts/archive/build-exodus.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'exodus-conquest');
const TMP = '/tmp/tp-exodus-conquest';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: -1446, end: -1406 }; // 早期出埃及論 + 40 年曠野

/* ── Segment definitions ── */

const SEGMENT_EXODUS = {
  id: 'exodus',
  name: '出埃及',
  subtitle: 'BC 1446 從歌珊到西奈山',
  description: '以色列人在埃及為奴 430 年後（出 12:40-41），摩西帶領他們離開蘭塞，過紅海，行走曠野，最終在西奈山頒布律法。本路線採早期出埃及論（BC 1446）。',
  color: '#b45309',
  center: [29.5, 33.0],
  zoom: 7,
  spots: [
    {
      title: '歌珊地 Goshen',
      latlng: [30.70, 31.85],
      scripture_refs: ['Gen 47:1-6', 'Exod 1:1-14'],
      desc: `尼羅河三角洲東部，雅各家族 70 人入埃及定居處（創 47:1-6），430 年後繁衍至約 200 萬人。新王朝法老起來不認識約瑟，下令逼以色列人作苦工建造積貨城。

學者引用：James K. Hoffmeier《Israel in Egypt》(Oxford, 1996) 將歌珊定位於 Wadi Tumilat（東三角洲）；Kenneth Kitchen《On the Reliability of the Old Testament》(Eerdmans, 2003) 同論。考古學者爭論：晚期出埃及論（BC 1270）派將歌珊指向 Pi-Ramesses 區。`,
      photo_query: 'Nile Delta Wadi Tumilat|尼羅河三角洲',
    },
    {
      title: '蘭塞 Rameses (Pi-Ramesses)',
      latlng: [30.80, 31.83],
      scripture_refs: ['Exod 1:11', 'Exod 12:37'],
      desc: `法老指派以色列人建造的兩座積貨城之一（出 1:11），出埃及的出發點（出 12:37）。位置爭議：奧地利考古學家 Manfred Bietak 1966- 在 Tell el-Daba / Qantir 挖掘確認 Pi-Ramesses 位置（拉美西斯二世首都）。

學者引用：Manfred Bietak《Avaris and Piramesse》(British Academy, 1979)；早期論派如 Bryant Wood (Associates for Biblical Research) 認為此城名為後期編輯回名（出埃及實際時間早於 Pi-Ramesses 命名），不影響 BC 1446 主張。`,
      photo_query: 'Pi-Ramesses Qantir|拉美西斯二世首都',
    },
    {
      title: '疏割 Succoth',
      latlng: [30.55, 32.10],
      scripture_refs: ['Exod 12:37', 'Exod 13:20', 'Num 33:5-6'],
      desc: `離開蘭塞後第一站（出 12:37）。傳統認定為 Tell el-Maskhuta（埃及東部 Wadi Tumilat 末端，今 Ismailia 西方），約 60 萬男丁加家屬在此整軍。

學者引用：Charles Aling《Egypt and Bible History》(Baker, 1981)；Hoffmeier 同上書，章 4「The Eastern Delta and the Exodus Route」。`,
      photo_query: 'Tell el-Maskhuta|疏割',
    },
    {
      title: '過紅海 Yam Suph',
      latlng: [30.00, 32.55],
      scripture_refs: ['Exod 14:1-31', 'Exod 15:1-21'],
      desc: `「Yam Suph」字面意為「蘆葦海」(Sea of Reeds)，傳統英譯 Red Sea。位置爭議三派：
（1）傳統派：蘇伊士灣北端某湖（如 Lake Timsah / Bitter Lakes）— 出埃及記指涉地理較合理
（2）真紅海派：今紅海亞喀巴灣 — 申命記某些章節支持
（3）地中海派：Manashe Har-El 1980s 提議地中海南岸湖泊

本路線採傳統派 Bitter Lakes 區。

學者引用：James Hoffmeier《Ancient Israel in Sinai》(Oxford, 2005) 主蘆葦海說；Bernard Batto《Slaying the Dragon》(Westminster, 1992) 從文學功能讀解。`,
      photo_query: 'Bitter Lakes Suez|蘇伊士運河大苦湖',
    },
    {
      title: '瑪拉 Marah',
      latlng: [28.97, 33.18],
      scripture_refs: ['Exod 15:22-26'],
      desc: `過紅海後在書珥曠野走三天找不到水，到瑪拉但水苦不能喝。摩西按神指示投樹枝入水，水變甜（出 15:22-26）。傳統位置 Ain Hawarah（今 Hawara 綠洲），亞喀巴灣與蘇伊士灣之間 Sinai 西部沙漠，距 Suez 約 75 公里。

學者引用：Charles Beke 1840s 首先提議此位置，沿用至今多數聖經地圖。`,
      photo_query: 'Marah Bible|Sinai desert oasis',
    },
    {
      title: '以琳 Elim',
      latlng: [28.85, 33.12],
      scripture_refs: ['Exod 15:27', 'Num 33:9'],
      desc: `「在那裡有十二股水泉，七十棵棕樹」（出 15:27）。傳統認定為 Wadi Gharandel（西奈半島西岸），距瑪拉約 10 公里南向，至今仍為 Sinai 半島少有的常年泉地之一。

學者引用：Edward Robinson《Biblical Researches in Palestine》(1841) 19 世紀首批考察此地的學者。`,
      photo_query: 'Elim Bible|Sinai palm trees oasis',
    },
    {
      title: '西奈山 Mount Sinai',
      latlng: [28.539, 33.973],
      scripture_refs: ['Exod 19:1-25', 'Exod 20:1-21', 'Exod 32-34'],
      desc: `頒布十誡與西奈之約之地（出 19-20）。位置爭議：
（1）**傳統派**：Jebel Musa（西奈半島南端，今 St. Catherine 修道院 4 世紀建立傳承）— 本路線採用
（2）Har Karkom 派：以色列考古學者 Emmanuel Anati 1980s 主張內蓋夫北部
（3）Jebel al-Lawz 派：Bryant Wood《Bible and Spade》主張沙烏地阿拉伯西北
（4）Sin Bishar 派：Menashe Har-El 提議

各派主要爭點：聖經地名線索（如「神的山」「米甸地」）、考古層、以色列人 40 年路線距離。

學者引用：Emmanuel Anati《The Mountain of God: Har Karkom》(Rizzoli, 1986)；Hoffmeier《Ancient Israel in Sinai》(Oxford, 2005) 力挺傳統 Jebel Musa。`,
      photo_query: 'Mount Sinai Jebel Musa|西奈山 Saint Catherine',
    },
  ],
};

const SEGMENT_CONQUEST = {
  id: 'conquest',
  name: '進迦南',
  subtitle: 'BC 1406 加低斯到示劍',
  description: '40 年曠野漂流結束後，以色列人從加低斯巴尼亞北上，繞過摩押與亞捫，渡過約旦河，攻陷耶利哥與艾城，在示劍立約獻祭——應許之地正式成為以色列地。',
  color: '#7c2d12',
  center: [31.5, 35.0],
  zoom: 8,
  spots: [
    {
      title: '加低斯巴尼亞 Kadesh-Barnea',
      latlng: [30.65, 34.42],
      scripture_refs: ['Num 13:1-33', 'Num 14:1-45', 'Num 20:1-13'],
      desc: `以色列人 40 年曠野的駐紮中心（民 13-14, 20）。傳統位置 Ein Qudeirat（今西奈半島東北部 / 以色列南境），擁有西奈半島最大常年泉。摩西在此派 12 探子窺探迦南地，10 探子報惡訊導致民眾叛亂，神判該世代不得進迦南；亦在此擊磐石取水（民 20）。

學者引用：Rudolph Cohen《Excavations at Kadesh-Barnea》(IAA Reports, 1981)，三層 Iron Age 堡壘考古發掘確認 Ein Qudeirat 為 Kadesh。`,
      photo_query: 'Kadesh Barnea|Tell el-Qudeirat',
    },
    {
      title: '何珥山 Mount Hor',
      latlng: [30.319, 35.407],
      scripture_refs: ['Num 20:22-29', 'Num 33:37-39'],
      desc: `亞倫卒於此山（民 20:28），享年 123 歲。傳統位置 Jebel Nebi Harun（佩特拉附近，約旦），4 世紀拜占庭傳承延續至今，山頂建小白色清真寺紀念亞倫；穆斯林、猶太人、基督徒同視為聖山。

學者引用：Burton MacDonald《East of the Jordan》(ASOR, 2000) 整理約旦考古傳統位置；現代部分學者提議 Jebel Madurah（北 Negev）為替代。`,
      photo_query: 'Aaron Tomb Petra|Jabal Harun shrine',
    },
    {
      title: '摩押平原 / 尼波山',
      latlng: [31.768, 35.725],
      scripture_refs: ['Num 22-36', 'Deut 34:1-12'],
      desc: `進迦南前最後駐地（民 22）。摩西在尼波山頂遠眺應許之地後過世（申 34），葬於摩押谷中至今無人知其墳。今約旦尼波山設拜占庭紀念教堂（4 世紀建立），可見當時馬賽克地圖。

學者引用：Michele Piccirillo《The Mosaics of Jordan》(ACOR, 1993) 詳述尼波山馬賽克考古；Burton MacDonald 同上書。`,
      photo_query: 'Mount Nebo Jordan|尼波山摩押',
    },
    {
      title: '過約旦河 Jordan Crossing',
      latlng: [31.853, 35.553],
      scripture_refs: ['Josh 3:1-17', 'Josh 4:1-24'],
      desc: `約書亞帶以色列人過約旦河（書 3-4）。神使約旦河水從上游 Adam 城（Damiya）斷流，以色列人乾地過河；過河後立 12 石為記。傳統地點 Bethabara / Al-Maghtas（耶利哥東約 8 公里），亦為後世施洗約翰為耶穌施洗之處（約 1:28）— UNESCO 2015 列名。

學者引用：Mohammad Waheeb《The Discovery of Bethany Beyond the Jordan》(2008) 發掘報告；Pope John Paul II 2000 年 Jubilee 朝聖確立此地。`,
      photo_query: 'Bethany Beyond Jordan Al-Maghtas|約旦河過河處',
    },
    {
      title: '耶利哥 Jericho',
      latlng: [31.8717, 35.4441],
      scripture_refs: ['Josh 6:1-27'],
      desc: `城牆崩塌、以色列人渡河後第一座征服之城（書 6）。Tell es-Sultan 是世界已知最古老連續居住城市之一（新石器時代起），含八千年歷史層。城牆崩塌之考古學爭議：
- **早期出埃及論派**：Bryant Wood 1990《Did the Israelites Conquer Jericho?》主張 City IV 毀於 BC 1400 左右，與聖經一致
- **晚期論 / 反方**：Kathleen Kenyon 1950s 挖掘認定 City IV 毀於 BC 1550 早於出埃及，故認為書 6 為後世神話

學者引用：Bryant G. Wood《Biblical Archaeology Review》16:2 (1990)；Kathleen Kenyon《Excavations at Jericho》(BSA, 1981)。`,
      photo_query: 'Tell es-Sultan Jericho|耶利哥古城',
    },
    {
      title: '示劍 Shechem',
      latlng: [32.213, 35.282],
      scripture_refs: ['Josh 8:30-35', 'Josh 24:1-28', 'Gen 12:6-7', 'Gen 33:18-20'],
      desc: `亞伯拉罕入迦南第一站（創 12:6-7），雅各購地立壇（創 33:18-20）。約書亞征服中央山地後，按摩西吩咐在以巴路山與基利心山之間立壇宣讀律法（書 8:30-35）；晚年在此立約，整理盟約石碑（書 24）。今 Tell Balata 考古層保留 Middle Bronze 城門與 Late Bronze 神廟基座，1928-34 德國挖掘 + 1956-72 ASOR 接續。

學者引用：Edward F. Campbell《Shechem III: The Stratigraphy and Architecture》(ASOR, 2002) 完整考古報告；亞伯拉罕宣告「我要把這地賜給你的後裔」(創 12:7) 與書 24 立約形成 Genesis-Joshua 收束結構。`,
      photo_query: 'Tell Balata Shechem|示劍古城',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '出埃及進迦南',
  subtitle: '從歌珊到應許之地',
  badge: 'BC 1446 — 1406',
};

/* ── Commons API helpers (mirror build-revelation-churches.mjs) ── */

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

/* ── Cover placeholder generation ── */

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
function runSips(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`sips ${c}`))));
  });
}

/* ── Build a segment ── */

async function buildSegment(seg, credits, failed) {
  console.log(`\n  ── ${seg.id} (${seg.spots.length} spots) ──`);
  const projSpots = [];
  for (let i = 0; i < seg.spots.length; i++) {
    const s = seg.spots[i];
    const num = i + 1;
    process.stdout.write(`    ${num}. ${s.title}... `);
    const hit = await searchCommonsTopHit(s.photo_query);
    if (!hit) {
      process.stdout.write('NO HIT\n');
      failed.push({ seg: seg.id, num, title: s.title, query: s.photo_query });
      projSpots.push({
        id: `s${num}`, num, latlng: s.latlng, title: s.title,
        desc: s.desc, photo: null, iconId: 'pin',
        cardOffset: { x: 0, y: -60 },
        scripture_refs: s.scripture_refs,
        era: { ...ERA },
      });
      continue;
    }
    let photoBase64 = null;
    try {
      photoBase64 = await fetchAsBase64(hit.thumbUrl);
    } catch (e) {
      process.stdout.write(`FETCH FAIL\n`);
      failed.push({ seg: seg.id, num, title: s.title, query: s.photo_query, err: e.message });
      projSpots.push({
        id: `s${num}`, num, latlng: s.latlng, title: s.title,
        desc: s.desc, photo: null, iconId: 'pin',
        cardOffset: { x: 0, y: -60 },
        scripture_refs: s.scripture_refs,
        era: { ...ERA },
      });
      continue;
    }
    const meta = buildPhotoMeta(hit);
    process.stdout.write(`✓ ${hit.file} (${meta.license})\n`);
    credits.push({ section: 'spot', seg: seg.id, num, title: s.title, file: hit.file, meta });
    projSpots.push({
      id: `s${num}`, num, latlng: s.latlng, title: s.title,
      desc: s.desc, photo: photoBase64, iconId: 'pin',
      cardOffset: { x: 0, y: -60 },
      scripture_refs: s.scripture_refs,
      era: { ...ERA },
      photoMeta: meta,
    });
    await sleep(500);
  }

  const project = {
    version: 5,
    name: `出埃及進迦南 — ${seg.name}`,
    center: seg.center,
    zoom: seg.zoom,
    basemapId: 'voyager',
    overlay: { id: 'rome_200', opacity: 0.5 },
    spots: projSpots,
    routes: [
      {
        id: 'r1',
        name: seg.name,
        pts: seg.spots.map((s) => s.latlng),
        color: seg.color,
        elevations: null,
      },
    ],
  };
  await writeFile(join(STORY_DIR, `${seg.id}.trailpaint.json`),
    JSON.stringify(project, null, 2));
}

/* ── Main ── */

await mkdir(TMP, { recursive: true });
await mkdir(STORY_DIR, { recursive: true });

const credits = [];
const failed = [];

console.log(`Building stories/exodus-conquest/ — 2 segments / ${SEGMENT_EXODUS.spots.length + SEGMENT_CONQUEST.spots.length} spots`);

await buildSegment(SEGMENT_EXODUS, credits, failed);
await buildSegment(SEGMENT_CONQUEST, credits, failed);

/* ── Cover ── */
console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

// Per-segment thumbs (400x400 from same placeholder, badge differs by segment)
for (const seg of [SEGMENT_EXODUS, SEGMENT_CONQUEST]) {
  const spec = {
    title: seg.name,
    subtitle: '出埃及進迦南',
    badge: seg.subtitle.split(' ')[0], // BC 1446 / BC 1406
  };
  const htmlPath = join(TMP, `${seg.id}-thumb.html`);
  const pngPath = join(TMP, `${seg.id}-thumb.png`);
  writeFileSync(htmlPath, makeCoverHtml(spec, 400, 400));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=400,400`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '78',
    pngPath, '--out', join(STORY_DIR, `${seg.id}-thumb.jpg`)]);
  console.log(`    ✓ ${seg.id}-thumb.jpg`);
}

/* ── story.json ── */
const storyJson = {
  id: 'exodus-conquest',
  title: '出埃及進迦南',
  subtitle: 'BC 1446 — 1406 從歌珊到應許之地',
  description: '以色列人在埃及為奴 430 年後，摩西帶領他們離開蘭塞積貨城，過紅海、走西奈、頒律法；40 年後新世代從加低斯北上，渡過約旦河，征服迦南中央山地，在示劍立約。本路線採早期出埃及論（BC 1446），路線爭議地點 desc 標明各派立場與學者引用。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '出埃及進迦南 — TrailPaint Stories',
    description: '互動地圖：BC 1446 從歌珊到示劍，13 spots 含路線爭議學者引用',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'exodus',
      title: SEGMENT_EXODUS.name,
      subtitle: SEGMENT_EXODUS.subtitle,
      description: SEGMENT_EXODUS.description,
      data: 'exodus.trailpaint.json',
      thumbnail: 'exodus-thumb.jpg',
      color: SEGMENT_EXODUS.color,
      music: '../music/voller-hoffnung.mp3',
    },
    {
      id: 'conquest',
      title: SEGMENT_CONQUEST.name,
      subtitle: SEGMENT_CONQUEST.subtitle,
      description: SEGMENT_CONQUEST.description,
      data: 'conquest.trailpaint.json',
      thumbnail: 'conquest-thumb.jpg',
      color: SEGMENT_CONQUEST.color,
      music: '../music/voller-hoffnung.mp3',
    },
  ],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

/* ── CREDITS.md ── */
const lines = [
  '# 出埃及進迦南 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / exodus-thumb.jpg / conquest-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-exodus.mjs`。',
  '',
];
for (const segId of ['exodus', 'conquest']) {
  const segName = segId === 'exodus' ? '出埃及（歌珊 → 西奈山）' : '進迦南（加低斯 → 示劍）';
  lines.push(`## ${segName}`);
  lines.push('');
  lines.push('| # | Spot | 作者 | 授權 | 來源 |');
  lines.push('|---|---|---|---|---|');
  for (const c of credits.filter((x) => x.section === 'spot' && x.seg === segId)) {
    lines.push(`| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
  }
  lines.push('');
}
lines.push('## 路線爭議參考');
lines.push('');
lines.push('本故事採 BC 1446 早期出埃及論。路線爭議地點 desc 標明各派立場與學者引用：');
lines.push('- **西奈山**：Jebel Musa（傳統）vs Har Karkom (Anati) vs Jebel al-Lawz (Wood) vs Sin Bishar (Har-El)');
lines.push('- **紅海/Yam Suph**：Bitter Lakes（傳統）vs 真紅海亞喀巴灣 vs 地中海湖泊');
lines.push('- **耶利哥**：Wood vs Kenyon 城牆崩塌年代爭議');
lines.push('- **何珥山**：Jebel Nebi Harun（傳統 約旦）vs Jebel Madurah (Negev)');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
const totalSpots = SEGMENT_EXODUS.spots.length + SEGMENT_CONQUEST.spots.length;
console.log(`✅ ${totalSpots} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
