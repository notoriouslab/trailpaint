#!/usr/bin/env node
/**
 * One-shot builder for stories/jesus-birth/ (Tier 2 Phase 5, 2026-05-04).
 *
 * Single segment anchored to era.jesus (rome_200 overlay):
 *   - nativity.trailpaint.json   7 spots  拿撒勒受報 → 12 歲聖殿問道
 *
 * Pipeline mirrors build-babylon.mjs.
 * Run: `node online/scripts/archive/build-jesus-birth.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'jesus-birth');
const TMP = '/tmp/tp-jesus-birth';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: -6, end: 12 }; // BC 6 受報 → AD 12 聖殿問道

const SEGMENT_NATIVITY = {
  id: 'nativity',
  name: '降生',
  subtitle: 'BC 6 — AD 12 從拿撒勒到耶路撒冷',
  description: '加百列向馬利亞報訊（路 1:26-38），馬利亞造訪以利沙伯，與約瑟在伯利恆生下耶穌（路 2:1-7）。八天行割禮，四十天聖殿獻嬰禮西面亞拿祝福；逃亡埃及避希律屠殺嬰孩；返拿撒勒成長，12 歲於聖殿與教師問答。本路線採 BC 6 早期年代論（呼應希律 BC 4 過世）。',
  color: '#b45309',
  center: [31.5, 33.5],
  zoom: 6,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '拿撒勒 Nazareth（受報）',
      latlng: [32.7019, 35.2978],
      scripture_refs: ['Luke 1:26-38', 'Matt 1:18-25'],
      desc: `天使加百列在馬利亞與木匠約瑟訂婚期間造訪宣告：「妳要懷孕生子，可以給他起名叫耶穌」（路 1:31）。傳統認定地點為今 Basilica of the Annunciation（天使報喜堂），4 世紀拜占庭原堂之上 1969 義大利建築師 Giovanni Muzio 完成現今教堂。地下層保留 1 世紀拿撒勒民居洞穴，被傳統認為馬利亞家舊址。

學者引用：Raymond E. Brown《The Birth of the Messiah》(Doubleday, 1977/1993) 標準學術參考；考古學家 Bellarmino Bagatti《Excavations in Nazareth》(Franciscan Printing, 1969) 整理拜占庭早期傳承證據。`,
      photo_query: 'Basilica of the Annunciation Nazareth|拿撒勒天使報喜堂',
    },
    {
      title: '以利沙伯山地 Ein Karem',
      latlng: [31.7656, 35.1622],
      scripture_refs: ['Luke 1:39-56'],
      desc: `馬利亞匆忙起身往猶大山地拜訪以利沙伯，以利沙伯腹中胎兒（施洗約翰）跳動，馬利亞唱出「尊主頌」(Magnificat, 路 1:46-55)。傳統位置 Ein Karem（今耶路撒冷西郊），有 Church of the Visitation（造訪堂，方濟各會 1955 重建）與 Church of St. John the Baptist（聖約翰誕生堂）。

學者引用：Joan E. Taylor《Christians and the Holy Places》(Oxford, 1993) 整理拜占庭時期 Ein Karem 朝聖傳承；Brown 同上書質疑具體地點，但承認猶大山地為合理範圍。`,
      photo_query: 'Ein Karem Visitation church|因卡瑞姆造訪堂',
    },
    {
      title: '伯利恆 Bethlehem（降生）',
      latlng: [31.7044, 35.2024],
      scripture_refs: ['Luke 2:1-20', 'Matt 2:1-12', 'Mic 5:2'],
      desc: `為應驗彌迦先知預言「伯利恆以法他啊...將來必有一位從你那裡出來」（彌 5:2），馬利亞與約瑟回大衛城上戶口時生下耶穌，置嬰孩於馬槽。Church of the Nativity（聖誕教堂）建於君士坦丁時期 326-339 年，傳統認定主誕生洞穴（Grotto of Nativity）。1934 修復露出 Justinian 馬賽克地板。

爭議：耶穌出生年代 — 希律王 BC 4 過世，多數學者推論耶穌生於 BC 6-4 之間；本路線採 BC 6 早期論（Paul L. Maier）。

學者引用：Paul L. Maier《In the Fullness of Time》(Kregel, 1991) 編年學整理；Justin Martyr《First Apology》65（BC 150）即記主誕生洞穴傳承。`,
      photo_query: 'Church of the Nativity Bethlehem|伯利恆聖誕教堂',
    },
    {
      title: '耶路撒冷聖殿（獻嬰）',
      latlng: [31.7780, 35.2354],
      scripture_refs: ['Luke 2:22-38', 'Lev 12:6-8'],
      desc: `按摩西律法，男嬰滿四十日後母親到聖殿獻祭潔淨（利 12）。馬利亞與約瑟獻一對斑鳩或兩隻雛鴿（窮人之祭）。聖殿中有義人西面與女先知亞拿，受聖靈感動認出嬰孩耶穌即彌賽亞，西面唱出尊主頌（Nunc Dimittis, 路 2:29-32）：「主啊，如今可以照你的話釋放僕人安然去世」。

學者引用：Joachim Jeremias《Jerusalem in the Time of Jesus》(SCM, 1969) 整理希律聖殿時期女院（Court of Women）獻嬰儀禮空間；R. T. France《The Gospel of Matthew》(NICNT, 2007)。`,
      photo_query: 'Temple Mount Jerusalem southern wall|耶路撒冷聖殿山南牆',
    },
    {
      title: '埃及 Egypt（避難）',
      latlng: [30.1276, 31.3208],
      scripture_refs: ['Matt 2:13-15', 'Hos 11:1', 'Matt 2:19-21'],
      desc: `希律王覺得被博士愚弄，下令屠殺伯利恆兩歲以下男嬰（太 2:16）。約瑟夢中得指示連夜帶馬利亞與孩子逃往埃及（太 2:13-15），應驗何西阿 11:1「我從埃及召出我的兒子」。傳統位置今開羅東北 Mostorod 與 al-Matariya（古 Heliopolis 太陽城）— 科普特正教會傳承「聖家足跡」(Holy Family Trail) 朝聖路線含 25 站。

爭議：聖經僅言「往埃及去」，具體位置由 4 世紀科普特傳承推定，無考古定論。希律 BC 4 過世，聖家在埃及約 1-2 年。

學者引用：Otto F. A. Meinardus《Two Thousand Years of Coptic Christianity》(AUC, 1999) 章 2「The Holy Family in Egypt」；Stephen Davis《Coptic Christology in Practice》(Oxford, 2008)。`,
      photo_query: 'Heliopolis Egypt obelisk|埃及太陽城方尖碑',
    },
    {
      title: '拿撒勒 Nazareth（成長）',
      latlng: [32.7050, 35.3030],
      scripture_refs: ['Matt 2:19-23', 'Luke 2:40', 'Luke 2:51-52'],
      desc: `希律王過世後，約瑟夢中再得指示返以色列。本欲回猶太地，得知亞基老接續希律治猶太，恐懼之下改往加利利拿撒勒（太 2:22-23）。耶穌在此成長：「孩子漸漸長大，強健起來，充滿智慧，又有神的恩在他身上」（路 2:40）。1 世紀拿撒勒人口僅 200-400 人，是無名小村。

爭議：「他必稱為拿撒勒人」(太 2:23) 預言來源 — 多數學者認為是匯總預言 spirit，無單一舊約直接對應；少數學者認指 nezer（嫩枝，賽 11:1）的字源關聯。

學者引用：R. T. France 同上書整理「拿撒勒人」預言四種解讀；考古學家 Yardenna Alexandre 2009 在 Basilica of the Annunciation 旁挖出 1 世紀民居，確認當時拿撒勒為農村聚落。`,
      photo_query: 'Nazareth old city|拿撒勒舊城',
    },
    {
      title: '耶路撒冷聖殿（12 歲問道）',
      latlng: [31.7770, 35.2370],
      scripture_refs: ['Luke 2:41-52'],
      desc: `逾越節耶穌 12 歲，按猶太習俗第一次參加成年禮前的朝聖。回程父母在拿撒勒商隊中找不到他，回到耶路撒冷三日後在聖殿教師中尋見。「凡聽見他的，都希奇他的聰明和他的應對」（路 2:47）。耶穌答父母：「為什麼找我呢？豈不知我應當以我父的事為念嗎？」（路 2:49 — 路加福音耶穌第一句話）。本事件為四福音書中耶穌童年期唯一記載。

學者引用：I. Howard Marshall《The Gospel of Luke》(NIGTC, 1978) 章 2 詳註「父的事」(en tois tou patros mou) 雙關語：父神事工 vs 父神家（聖殿）；Joachim Jeremias 同上書整理希律聖殿教師講學區域（Royal Stoa 南廊）。`,
      photo_query: 'Royal Stoa Temple Mount Herod|希律聖殿南廊',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '耶穌降生',
  subtitle: '從拿撒勒到耶路撒冷',
  badge: 'BC 6 — AD 12',
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
    name: `耶穌降生 — ${seg.name}`,
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

console.log(`Building stories/jesus-birth/ — 1 segment / ${SEGMENT_NATIVITY.spots.length} spots`);

await buildSegment(SEGMENT_NATIVITY, credits, failed);

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], ['nativity-thumb', 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name === 'nativity-thumb' ? '78' : '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

const storyJson = {
  id: 'jesus-birth',
  title: '耶穌降生',
  subtitle: 'BC 6 — AD 12 從拿撒勒到聖殿',
  description: '加百列向馬利亞報訊，與約瑟在伯利恆生下嬰孩耶穌；逃亡埃及避希律屠殺、返拿撒勒成長、12 歲於聖殿與教師問答。本路線採 BC 6 早期年代論（呼應希律 BC 4 過世），補完 jesus-galilee 受洗前的童年敘事。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '耶穌降生 — TrailPaint Stories',
    description: '互動地圖：BC 6 受報到 AD 12 聖殿問道，7 spots 含降生年代與逃亡埃及位置爭議',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'nativity',
      title: SEGMENT_NATIVITY.name,
      subtitle: SEGMENT_NATIVITY.subtitle,
      description: SEGMENT_NATIVITY.description,
      data: 'nativity.trailpaint.json',
      thumbnail: 'nativity-thumb.jpg',
      color: SEGMENT_NATIVITY.color,
      music: SEGMENT_NATIVITY.music,
    },
  ],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

const lines = [
  '# 耶穌降生 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / nativity-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-jesus-birth.mjs`。',
  '',
  '## Spot 照片（降生）',
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
lines.push('本故事採 BC 6 早期年代論（呼應希律 BC 4 過世）。爭議地點 desc 標明各派立場與學者引用：');
lines.push('- **耶穌出生年代**：BC 6（Maier 早期論）vs BC 4-5（多數學者）vs AD 1（傳統紀年法 Dionysius Exiguus 525 計算誤差）');
lines.push('- **逃亡埃及位置**：傳統 Heliopolis / Mostorod / al-Matariya — 4 世紀科普特傳承推定，無考古定論');
lines.push('- **「拿撒勒人」預言**：彙總預言 spirit（多數）vs nezer（嫩枝賽 11:1，少數）');
lines.push('- **以賽亞 7:14 童女懷孕**：福音派視為先知預言精準對應 vs 自由派認為再詮釋（almah=年輕女子 vs parthenos=童女）');
lines.push('');
lines.push('學者引用：Brown / France / Marshall / Maier / Bagatti / Taylor / Jeremias / Meinardus');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
const totalSpots = SEGMENT_NATIVITY.spots.length;
console.log(`✅ ${totalSpots} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
