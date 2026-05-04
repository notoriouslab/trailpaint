#!/usr/bin/env node
/**
 * One-shot builder for stories/early-church/ (Tier 2 Phase 6, 2026-05-04).
 *
 * Single segment AD 30-46 (era.jesus → era.paul transition):
 *   - acts.trailpaint.json   7 spots  馬可樓五旬節 → 安提阿基督徒首稱
 *
 * Pipeline mirrors build-jesus-birth.mjs.
 * Run: `node online/scripts/archive/build-early-church.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'early-church');
const TMP = '/tmp/tp-early-church';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: 30, end: 46 };

const SEGMENT_ACTS = {
  id: 'acts',
  name: '從耶路撒冷到安提阿',
  subtitle: 'AD 30 — 46 五旬節到第一次差遣前',
  description: '耶穌升天後 10 日五旬節聖靈降臨於馬可樓，120 門徒當日 3000 人受洗，耶路撒冷教會誕生。司提反殉道引發大逼迫使福音擴散至撒馬利亞、海岸、敘利亞；彼得在約帕屋頂異象後接納外邦人哥尼流；安提阿「基督徒」首稱，成為差遣保羅出航的母會。',
  color: '#b45309',
  center: [33.0, 35.5],
  zoom: 6,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '耶路撒冷馬可樓 Cenacle',
      latlng: [31.7715, 35.2293],
      scripture_refs: ['Acts 1:13-14', 'Acts 2:1-41', 'Acts 4:32-37'],
      desc: `傳統認為最後晚餐之地（可 14:14-15）也是五旬節聖靈降臨之地（徒 2）。120 門徒在此聚集禱告，聖靈如火舌降臨，當日 3000 人受洗誕生耶路撒冷教會。位置爭議：傳統 Cenacle 在錫安山（4 世紀拜占庭標定，今 Coenaculum 建築為 14 世紀方濟各會所建），下層即傳統大衛王墓所在。

學者引用：Bargil Pixner《Paths of the Messiah》(Ignatius, 2010) 整理錫安山「使徒教會」(Mother of all Churches) 早期傳承；F. F. Bruce《The Book of Acts》(NICNT, 1988) 章 2 論五旬節事件考據。`,
      photo_query: 'Cenacle Mount Zion|錫安山馬可樓',
    },
    {
      title: '撒馬利亞 Samaria (Sebaste)',
      latlng: [32.2761, 35.1908],
      scripture_refs: ['Acts 8:1-25', 'John 4:1-42'],
      desc: `司提反殉道後門徒分散，腓利率先傳道至撒馬利亞城（徒 8:5）。這是基督教第一次跨越猶太-撒馬利亞 700 年敵意的界線。彼得約翰隨後從耶路撒冷下來按手，撒馬利亞信徒受聖靈。今 Sebaste 遺址含 Iron Age 暗利王宮殘跡（王上 16:24 暗利建撒馬利亞城）+ 希律王擴建的 Augustaeum 神廟基座（約瑟夫《古史》15.298）。

學者引用：Eckhard J. Schnabel《Early Christian Mission Vol. 1》(IVP, 2004) 章 5 「Mission to Samaria」；J. W. Crowfoot《The Buildings at Samaria》(PEF, 1942) Iron Age 與羅馬層分析。`,
      photo_query: 'Sebaste Samaria ruins|撒馬利亞古城遺址',
    },
    {
      title: '加薩路上 Ein Yael',
      latlng: [31.7322, 35.1700],
      scripture_refs: ['Acts 8:26-40', 'Isa 53:7-8'],
      desc: `衣索匹亞太監（埃塞俄比亞女王干大基的財政大臣）讀以賽亞 53 章，腓利受聖靈引導跑近他的車解經並施洗（徒 8:26-40）。是非猶太人受洗的第一案例之一，比哥尼流（徒 10）更早。具體位置爭議：傳統認為耶路撒冷西南 Ein Yael（今 Ein Hanniya 自然保護區）4 世紀拜占庭朝聖標定 vs 加薩近郊 Beit Sur vs Wadi al-Qilt（耶利哥下坡）。

學者引用：Jerome Murphy-O'Connor《The Holy Land》(Oxford, 5th ed 2008) 章 6 整理拜占庭傳承位置；F. F. Bruce 同上書註解「下到加薩」(Acts 8:26) 路線地理。`,
      photo_query: 'Wadi Qelt Judean desert|猶大曠野',
    },
    {
      title: '大馬色路 Damascus Road',
      latlng: [33.5138, 36.2765],
      scripture_refs: ['Acts 9:1-22', 'Acts 22:6-21', 'Acts 26:12-18', 'Gal 1:11-17'],
      desc: `掃羅領大祭司公文前往大馬色搜捕門徒，將近城時午正大光照他，聽見「掃羅，掃羅，你為甚麼逼迫我？」（徒 9:4）。亞拿尼亞按手後三日眼能看見、受洗，立即在大馬色會堂宣講耶穌是神的兒子。傳統位置 Bab Kisan（東城門，今 Bab Sharqi 區，敘利亞大馬色舊城東南）— 5 世紀拜占庭起朝聖傳承。

學者引用：F. F. Bruce《Paul: Apostle of the Heart Set Free》(Eerdmans, 1977) 章 4 整理三福音書版本歸主敘事差異；Larry W. Hurtado《Lord Jesus Christ》(Eerdmans, 2003) 論掃羅歸主作為早期基督教神論轉折點。`,
      photo_query: 'Damascus old city Bab Kisan|大馬色舊城基山門',
    },
    {
      title: '約帕 Joppa',
      latlng: [32.0540, 34.7506],
      scripture_refs: ['Acts 9:36-43', 'Acts 10:9-23', 'Acts 11:1-18'],
      desc: `彼得在約帕復活女徒多加（徒 9:40），住在硝皮匠西門家（徒 9:43）— 對嚴守潔淨律法的猶太人而言，住在「不潔」工匠家本身已是敏感舉動。次日午正在屋頂禱告，看見天降大布盛各樣動物的異象，神三次說「神所潔淨的，你不可當作俗物」（徒 10:15），預備他接納哥尼流。今 Tel Aviv-Jaffa 區 Old Jaffa（古約帕）含 1 世紀地層。

學者引用：Ben Witherington III《The Acts of the Apostles》(Eerdmans, 1998) 章 10 論「神所潔淨」異象與外邦傳福音的神學基礎；Jerome Murphy-O'Connor 同上書整理 Old Jaffa 朝聖傳承「西門皮匠之家」。`,
      photo_query: 'Old Jaffa Tel Aviv|約帕古城',
    },
    {
      title: '該撒利亞 Caesarea Maritima',
      latlng: [32.5006, 34.8917],
      scripture_refs: ['Acts 10:1-48', 'Acts 11:1-18', 'Acts 21:8-14'],
      desc: `羅馬亞細亞行省巡撫駐節地，希律大帝 BC 22-9 大興土木建為地中海大港。意大利營百夫長哥尼流是「敬畏神的人」(God-fearer, σεβομενος τον θεον)，蒙天使指示派人去約帕請彼得。彼得來到他家講道時聖靈降臨眾外邦人（徒 10:44），開啟了「外邦人也得了生命」(徒 11:18) 的教會新階段。今 Caesarea National Park 含 Herodian 港灣、羅馬劇場、希律王宮、拜占庭街廓 — 1959-2018 多輪挖掘。

學者引用：Joseph Patrich《Studies in the Archaeology and History of Caesarea Maritima》(Brill, 2011)；Schnabel 同上書 Vol. 1 章 7 論「God-fearers」社會學分類。`,
      photo_query: 'Caesarea Maritima ruins|該撒利亞古港',
    },
    {
      title: '安提阿 Antioch on the Orontes',
      latlng: [36.2017, 36.1606],
      scripture_refs: ['Acts 11:19-26', 'Acts 13:1-3', 'Gal 2:11-14'],
      desc: `司提反殉道後分散門徒抵達敘利亞安提阿，向希臘人傳福音建立第一個外邦人多數的教會（徒 11:20）。耶路撒冷母會差派巴拿巴查驗，巴拿巴召掃羅同來，師徒在此教導一年。「門徒稱為基督徒（Christianoi），是從安提阿起首」（徒 11:26）— 是嘲諷字源（「基督那派的」）後成為自稱。教會差遣保羅與巴拿巴第一次外邦宣教（徒 13:2-3），開啟保羅三次旅程。今土耳其 Antakya 市，1932-39 普林斯頓挖掘出大量馬賽克，今藏 Hatay Archaeology Museum。

學者引用：F. F. Bruce 同上書章 21 論「Christianoi 字源；Schnabel 同上 Vol. 1 章 9 論安提阿教會社會結構；Magen Broshi《The Population of Western Palestine》(IEJ 29, 1979) 估安提阿 1 世紀人口 30-50 萬，僅次於羅馬與亞歷山大。`,
      photo_query: 'Antakya Hatay archaeological museum|安提阿哈塔伊博物館',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '使徒行傳早期教會',
  subtitle: '從耶路撒冷到安提阿',
  badge: 'AD 30 — 46',
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

async function buildSegment(seg, credits, failed) {
  console.log(`\n  ── ${seg.id} (${seg.spots.length} spots) ──`);
  const projSpots = [];
  for (let i = 0; i < seg.spots.length; i++) {
    const s = seg.spots[i];
    const num = i + 1;
    process.stdout.write(`    ${num}. ${s.title}... `);
    const hit = await searchCommonsTopHit(s.photo_query);
    const baseSpot = {
      id: `s${num}`, num, latlng: s.latlng, title: s.title,
      desc: s.desc, photo: null, iconId: 'pin',
      cardOffset: { x: 0, y: -60 },
      scripture_refs: s.scripture_refs,
      era: { ...ERA },
    };
    if (!hit) {
      process.stdout.write('NO HIT\n');
      failed.push({ seg: seg.id, num, title: s.title, query: s.photo_query });
      projSpots.push(baseSpot);
      continue;
    }
    let photoBase64 = null;
    try {
      photoBase64 = await fetchAsBase64(hit.thumbUrl);
    } catch (e) {
      process.stdout.write(`FETCH FAIL\n`);
      failed.push({ seg: seg.id, num, title: s.title, query: s.photo_query, err: e.message });
      projSpots.push(baseSpot);
      continue;
    }
    const meta = buildPhotoMeta(hit);
    process.stdout.write(`✓ ${hit.file} (${meta.license})\n`);
    credits.push({ section: 'spot', seg: seg.id, num, title: s.title, file: hit.file, meta });
    projSpots.push({ ...baseSpot, photo: photoBase64, photoMeta: meta });
    await sleep(500);
  }

  const project = {
    version: 5,
    name: `使徒行傳早期教會 — ${seg.name}`,
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

await mkdir(TMP, { recursive: true });
await mkdir(STORY_DIR, { recursive: true });

const credits = [];
const failed = [];

console.log(`Building stories/early-church/ — 1 segment / ${SEGMENT_ACTS.spots.length} spots`);

await buildSegment(SEGMENT_ACTS, credits, failed);

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], ['acts-thumb', 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name === 'acts-thumb' ? '78' : '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

const storyJson = {
  id: 'early-church',
  title: '使徒行傳早期教會',
  subtitle: 'AD 30 — 46 從耶路撒冷到安提阿',
  description: '耶穌升天後 10 日五旬節聖靈降臨於馬可樓 120 門徒，當日 3000 人受洗誕生耶路撒冷教會。司提反殉道引發的逼迫使福音擴散至撒馬利亞、海岸、敘利亞；衣索匹亞太監受洗、彼得屋頂異象後接納哥尼流家、安提阿教會「基督徒」首稱並差遣保羅出航。本路線 7 spots 補完保羅三次旅程之前的早期教會敘事。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '使徒行傳早期教會 — TrailPaint Stories',
    description: '互動地圖：AD 30 五旬節到 AD 46 安提阿差遣，7 spots 含早期教會跨文化突破',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'acts',
      title: SEGMENT_ACTS.name,
      subtitle: SEGMENT_ACTS.subtitle,
      description: SEGMENT_ACTS.description,
      data: 'acts.trailpaint.json',
      thumbnail: 'acts-thumb.jpg',
      color: SEGMENT_ACTS.color,
      music: SEGMENT_ACTS.music,
    },
  ],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

const lines = [
  '# 使徒行傳早期教會 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / acts-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-early-church.mjs`。',
  '',
  '## Spot 照片',
  '',
  '| # | Spot | 作者 | 授權 | 來源 |',
  '|---|---|---|---|---|',
];
for (const c of credits.filter((x) => x.section === 'spot')) {
  lines.push(`| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
}
lines.push('');
lines.push('## 路線爭議參考');
lines.push('');
lines.push('本故事採傳統使徒行傳年代學（AD 30 五旬節 — AD 46 第一次差遣前）。爭議地點 desc 標明各派立場與學者引用：');
lines.push('- **馬可樓 Cenacle**：傳統錫安山位置（4 世紀拜占庭標定）vs 不同錫安山解讀');
lines.push('- **衣索匹亞太監受洗**：Ein Yael / Ein Hanniya（傳統）vs 加薩近郊 Beit Sur vs Wadi al-Qilt');
lines.push('- **「基督徒」首稱（Christianoi）**：嘲諷字源（外人取笑）vs 自稱（門徒接受）— F. F. Bruce 整理兩派觀點');
lines.push('- **哥尼流身份**：「敬畏神的人」(God-fearer) — 完全皈依猶太前的中間階段 vs 非正式關注者');
lines.push('');
lines.push('學者引用：F. F. Bruce《The Book of Acts》/ Witherington III / Schnabel《Early Christian Mission》/ Murphy-O\'Connor / Hurtado / Pixner');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
const totalSpots = SEGMENT_ACTS.spots.length;
console.log(`✅ ${totalSpots} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
