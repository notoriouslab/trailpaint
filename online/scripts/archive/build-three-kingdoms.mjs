#!/usr/bin/env node
/**
 * Builder for stories/three-kingdoms/ (Tier 3 Phase 11).
 * Single segment AD 207-234 (Shu-Han 諸葛亮 era).
 * Overlay: three_kingdoms_262 (CCTS ad0262, newly added in this commit).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'three-kingdoms');
const TMP = '/tmp/tp-three-kingdoms';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: 207, end: 234 };

const SEGMENT = {
  id: 'shu-han',
  name: '蜀漢北伐',
  subtitle: 'AD 207 — 234 從隆中對到五丈原',
  description: '建安十二年（207）劉備三顧茅廬於隆中見諸葛亮陳「天下三分」對策；208 年赤壁之戰孫劉聯軍大破曹操；219 年劉備稱漢中王；223 年白帝城託孤；228 年諸葛亮揮淚斬馬謖；234 年諸葛亮卒於五丈原五次北伐途中。本路線採陳壽《三國志》主線，沿蜀漢核心 6 spots 涵蓋 27 年「鞠躬盡瘁，死而後已」之軌。',
  color: '#7f1d1d',
  center: [32.0, 110.0],
  zoom: 6,
  music: '../music/sorrow-and-love.mp3',
  spots: [
    {
      title: '隆中（207 三顧茅廬）',
      latlng: [32.0167, 112.1333],
      historical_refs: ['陳壽《三國志·諸葛亮傳》', '諸葛亮《前出師表》', '羅貫中《三國演義》第 38 回'],
      desc: `建安十二年（207）冬至十三年春，劉備從新野三次造訪隆中草廬請諸葛亮出山，諸葛亮陳「隆中對」三分天下策略：北曹東孫，據荊州益州待時。位置爭議：「南陽」傳統襄陽說（湖北襄陽古隆中）vs 南陽說（河南南陽臥龍崗）— 古代「南陽郡」涵蓋今襄陽 + 南陽兩地，諸葛亮〈出師表〉「躬耕於南陽」指郡名而非市名。傳統襄陽說由 1893 年《湖廣通志》定論，獲多數三國史學者支持。

學者引用：陳壽《三國志·諸葛亮傳》(285) 一手史料；裴松之《三國志注》(429) 整理魏晉早期諸葛亮研究；田餘慶《秦漢魏晉史探微》(中華書局, 2004) 章 7 整理隆中對爭議；Achilles Fang《The Chronicle of the Three Kingdoms》(Harvard UP, 1952) 英譯本。`,
      photo_query: '古隆中|Wuhou Memorial Temple Xiangyang',
    },
    {
      title: '赤壁（208 火攻）',
      latlng: [29.7250, 113.9006],
      historical_refs: ['陳壽《三國志·武帝紀》《周瑜傳》', '羅貫中《三國演義》第 49 回'],
      desc: `建安十三年（208）冬，孫劉聯軍五萬於赤壁江面以火攻破曹操水軍二十餘萬；史稱「赤壁之戰」，奠定三國鼎立基礎。位置爭議：傳統湖北赤壁市（今蒲圻）vs 黃州赤壁（湖北黃岡）— 蘇軾 1082 年《赤壁賦》遊黃州赤壁誤認，此後二地並稱「東坡赤壁」(黃州) 與「武赤壁/文赤壁」(蒲圻)。考古學者譚其驤 1980s 由地名沿革確認蒲圻為真戰場。

學者引用：陳壽《武帝紀》《吳主傳》《先主傳》比對；Rafe de Crespigny《Generals of the South》(ANU, 1990) 詳註赤壁戰役地理與戰術；譚其驤《中國歷史地圖集》第 3 冊三國時期。`,
      photo_query: '赤壁 三國|Chibi Three Kingdoms ancient',
    },
    {
      title: '漢中（219 稱漢中王）',
      latlng: [33.0700, 107.0270],
      historical_refs: ['陳壽《三國志·先主傳》'],
      desc: `建安二十四年（219）夏，劉備擊敗曹操軍奪取漢中（「定軍山黃忠斬夏侯淵」），秋於沔陽稱「漢中王」— 為日後 221 年成都稱帝鋪路。漢中是進取關中、退守益州的戰略要衝，諸葛亮在此屯田累積北伐糧草。今陝西漢中市仍保留拜將壇遺址（劉備拜韓信壇前身），唐代李吉甫《元和郡縣圖志》記此處。

學者引用：王仲犖《魏晉南北朝史》(上海人民, 1979) 章 1；Hans Bielenstein《The Bureaucracy of Han Times》(Cambridge UP, 1980) 整理三國地方政府結構。`,
      photo_query: 'Hanzhong Shaanxi|漢中 陝西',
    },
    {
      title: '白帝城（223 託孤）',
      latlng: [31.0214, 109.5306],
      historical_refs: ['陳壽《三國志·先主傳》《諸葛亮傳》'],
      desc: `章武三年（223）四月，劉備伐吳大敗於猇亭（彝陵之戰），退守白帝城（永安宮）病重。臨終召諸葛亮託孤：「君才十倍曹丕，必能安國，終定大事。若嗣子可輔，輔之；如其不才，君可自取。」(《先主傳》) 諸葛亮泣拜「臣敢竭股肱之力，效忠貞之節，繼之以死！」白帝城今重慶奉節，含拓本「託孤堂」與明清重建的清白堂、明良殿。三峽水庫蓄水後白帝城成為長江中孤島。

學者引用：陳寅恪《唐代政治史述論稿》論魏晉後世對「託孤」儀禮的繼承；易中天《品三國》(上海文藝, 2006) 第 36 集白帝託孤考據。`,
      photo_query: '白帝城 重慶 奉節|Baidicheng Chongqing',
    },
    {
      title: '街亭（228 揮淚斬馬謖）',
      latlng: [34.7833, 106.0250],
      historical_refs: ['陳壽《三國志·王朗傳》《馬良傳》《諸葛亮傳》'],
      desc: `建興六年（228）春，諸葛亮第一次北伐出祁山，派馬謖守街亭（隴右出長安關鍵）。馬謖違諸葛亮「當道紮營」之命，移軍上山被張郃斷水大敗。諸葛亮揮淚斬馬謖、自貶三等。位置爭議：傳統秦安縣隴城鎮（今甘肅秦安）vs 莊浪 vs 張家川 — 1988 隴城鎮考古發現魏晉時期軍事建築群與《三國志》「依阻南山」描述吻合，學界共識傾向秦安說。

學者引用：陳壽《三國志》傳記比對；嚴耕望《唐代交通圖考》(中研院, 1985) 整理隴右交通考；田餘慶 同上書章 8 街亭位置考。`,
      photo_query: 'Qin\'an Tianshui Gansu|秦安天水',
    },
    {
      title: '五丈原（234 諸葛亮卒）',
      latlng: [34.4583, 107.7833],
      historical_refs: ['陳壽《三國志·諸葛亮傳》', '諸葛亮《後出師表》'],
      desc: `建興十二年（234）秋八月，諸葛亮第五次北伐屯五丈原（今陝西寶雞岐山五丈原鎮）與司馬懿對峙百餘日。八月二十八日卒於軍中，享年五十四歲。〈後出師表〉「鞠躬盡瘁，死而後已」八字成為千古忠義範式。蜀軍依諸葛亮遺命緩緩退兵，司馬懿出視營壘讚「天下奇才也！」六月諸葛亮預覺氣絕，命楊儀按錦囊計劃秋葬定軍山（漢中），不歸成都；今陝西勉縣武侯墓 1700 年來香火不絕。

學者引用：陳壽《諸葛亮傳》末傳論「於治戎為長，奇謀為短」評價；柳春藩《諸葛亮傳》(中華書局, 1985)；陳致平《中華通史》(黎明文化, 1979) 三國卷論諸葛亮治蜀貢獻。`,
      photo_query: 'Wuhou Memorial Temple Chengdu|武侯祠成都',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '三國蜀漢北伐',
  subtitle: '從隆中對到五丈原',
  badge: 'AD 207 — 234',
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
      historical_refs: s.historical_refs,
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
    name: `三國蜀漢北伐 — ${seg.name}`,
    center: seg.center,
    zoom: seg.zoom,
    basemapId: 'voyager',
    overlay: { id: 'three_kingdoms_262', opacity: 0.5 },
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

console.log(`Building stories/three-kingdoms/ — 1 segment / ${SEGMENT.spots.length} spots (three_kingdoms_262 overlay)`);

await buildSegment(SEGMENT, credits, failed);

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], ['shu-han-thumb', 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name === 'shu-han-thumb' ? '78' : '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

const storyJson = {
  id: 'three-kingdoms',
  title: '三國蜀漢北伐',
  subtitle: 'AD 207 — 234 從隆中對到五丈原',
  description: '劉備三顧茅廬於隆中見諸葛亮陳天下三分；208 赤壁之戰孫劉聯軍火破曹操水軍；219 漢中王；223 白帝託孤；228 街亭揮淚斬馬謖；234 諸葛亮卒於五丈原。本路線採陳壽《三國志》主線沿蜀漢核心 6 spots 涵蓋 27 年「鞠躬盡瘁，死而後已」之軌。CCTS 三國 262 古地圖底圖 + 學者引用論及隆中、赤壁、街亭三個位置爭議。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/sorrow-and-love.mp3',
    title: 'Sorrow and Love — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '三國蜀漢北伐 — TrailPaint Stories',
    description: '互動地圖：207 三顧茅廬到 234 五丈原，6 spots 跨蜀漢 27 年；CCTS 三國 262 古地圖底圖',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'shu-han',
      title: SEGMENT.name,
      subtitle: SEGMENT.subtitle,
      description: SEGMENT.description,
      data: 'shu-han.trailpaint.json',
      thumbnail: 'shu-han-thumb.jpg',
      color: SEGMENT.color,
      music: SEGMENT.music,
    },
  ],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

const lines = [
  '# 三國蜀漢北伐 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / shu-han-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-three-kingdoms.mjs`。',
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
lines.push('- **隆中位置**：襄陽說（湖北襄陽古隆中，1893《湖廣通志》傳統）vs 南陽說（河南南陽臥龍崗）— 古「南陽郡」涵蓋兩地，多數學者支持襄陽說');
lines.push('- **赤壁戰場位置**：傳統湖北赤壁市（蒲圻）vs 黃州赤壁（黃岡）— 蘇軾 1082《赤壁賦》誤認黃州，譚其驤 1980s 由地名沿革確認蒲圻為真戰場');
lines.push('- **街亭位置**：傳統秦安縣隴城鎮（甘肅秦安，1988 考古確認）vs 莊浪 vs 張家川');
lines.push('');
lines.push('學者引用：陳壽《三國志》/ 裴松之《三國志注》/ 田餘慶《秦漢魏晉史探微》/ Achilles Fang《Chronicle of the Three Kingdoms》/ Rafe de Crespigny《Generals of the South》/ 譚其驤《中國歷史地圖集》/ 易中天《品三國》');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
console.log(`✅ ${SEGMENT.spots.length} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
