#!/usr/bin/env node
/**
 * One-shot builder for stories/matteo-ricci/ (Tier 2 Phase 7, 2026-05-04).
 *
 * Single segment AD 1582-1610 (Ming Dynasty, ming_1582 overlay):
 *   - journey.trailpaint.json   7 spots  澳門 → 北京 28 年
 *
 * HISTORY_SCALE perspective (not BIBLE_SCALE) — this is the first Tier-X
 * story anchored to a Chinese historical overlay rather than rome_200.
 *
 * Run: `node online/scripts/archive/build-matteo-ricci.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'matteo-ricci');
const TMP = '/tmp/tp-matteo-ricci';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: 1582, end: 1610 };

const SEGMENT_JOURNEY = {
  id: 'journey',
  name: '從澳門到北京',
  subtitle: 'AD 1582 — 1610 萬曆年間 28 年',
  description: '義大利耶穌會士利瑪竇 1582 抵澳門，先在肇慶以「西僧」身份學中文書畫《山海輿地全圖》；後改穿儒服自稱「西儒」，從韶州、南昌、南京一路北上，1601 入京覲見萬曆皇帝獻自鳴鐘成為首位居北京的天主教傳教士。1610 年卒於北京，獲明朝特准賜葬柵欄墓地，開啟「中國禮儀之爭」前的文化適應宣教典範。',
  color: '#7c2d12',
  center: [30.0, 115.0],
  zoom: 5,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '澳門 Macau',
      latlng: [22.1987, 113.5439],
      scripture_refs: ['Acts 1:8', 'Matt 28:19-20'],
      desc: `1582 年 8 月 7 日利瑪竇抵澳門 — 葡萄牙人在中國的據點，東印度耶穌會視察員范禮安（Alessandro Valignano）已制定「中國事工策略」：先學中文。利瑪竇與羅明堅（Michele Ruggieri）一起學廣東話與官話兩年。澳門當時人口約 1 萬，是西方了解中國的窗口。

學者引用：Jonathan Spence《The Memory Palace of Matteo Ricci》(Penguin, 1984) 序章；Liam Matthew Brockey《Journey to the East: The Jesuit Mission to China, 1579-1724》(Belknap/Harvard, 2007) 章 1。`,
      photo_query: 'Macau old churches Ruins of St Pauls|澳門大三巴牌坊',
      historical_refs: ['利瑪竇《利瑪竇中國札記》卷 1'],
    },
    {
      title: '肇慶 Zhaoqing',
      latlng: [23.0476, 112.4647],
      scripture_refs: ['1 Cor 9:20-23'],
      desc: `1583 年 9 月與羅明堅獲兩廣總督郭應聘准允入肇慶，是利瑪竇在中國的第一個固定居所。建仙花寺（Xianhua Si，名稱借佛教用語），最初穿僧服自稱「西僧」。1584 年完成《山海輿地全圖》— 第一張中文世界地圖，把歐洲地理知識帶入中國，朝廷學者爭相抄錄。1585 年羅明堅譯《天主實錄》— 第一本中文天主教教義書。

學者引用：Spence 同上書章 4 整理仙花寺與《山海輿地全圖》；David E. Mungello《Curious Land: Jesuit Accommodation and the Origins of Sinology》(Hawaii UP, 1989) 章 1。`,
      photo_query: 'Zhaoqing Seven Star Crags|肇慶七星岩',
      historical_refs: ['利瑪竇《山海輿地全圖》(1584)'],
    },
    {
      title: '韶州 Shaozhou',
      latlng: [24.8108, 113.5972],
      scripture_refs: [],
      desc: `1589 年因兩廣新任總督劉繼文驅逐肇慶會所，利瑪竇北遷韶州（今韶關）。在此結交儒士瞿汝夔（即《天主教東傳文獻》編輯瞿太素），於 1594 年改穿儒服、留鬍子、自稱「西儒」— 文化適應策略大轉折。瞿汝夔協助將《幾何原本》前半部譯成中文（1594 完成第 1 卷）。

學者引用：Brockey 同上書章 2「Chinese Robes」；Mungello 同上書整理利瑪竇從佛僧到儒士的身份轉換歷史；林金水《利瑪竇與中國》(中國社會科學, 1996) 整理瞿汝夔關係。`,
      photo_query: 'Shaoguan Nanhua Temple|韶關南華寺',
      historical_refs: ['瞿汝夔《利瑪竇傳》'],
    },
    {
      title: '南昌 Nanchang',
      latlng: [28.6829, 115.8581],
      scripture_refs: [],
      desc: `1595-1598 年間定居南昌。在此結交建安王朱多𤊟、樂安王朱多焿，撰寫《交友論》(De Amicitia, 1595) — 整理西方論友誼經典 100 條（亞里斯多德、塞內卡、聖奧古斯丁），翻譯為精煉中文，被江西文人廣泛抄傳。1596 年成為中國耶穌會 Superior（總會長）。1599 年完成《二十五言》— 西方斯多葛哲學對話。

學者引用：Spence 同上書章 5 論《交友論》傳播；Brockey 同上書章 3；計翔翔《利瑪竇思想與中國儒學》(寧波出版社, 2007)。`,
      photo_query: 'Nanchang Tengwang Pavilion|南昌滕王閣',
      historical_refs: ['利瑪竇《交友論》(1595)、《二十五言》(1599)'],
    },
    {
      title: '南京 Nanjing',
      latlng: [32.0603, 118.7969],
      scripture_refs: [],
      desc: `1598 年第一次跟工部侍郎王弘誨入北京失敗（適逢日本朝鮮入侵，明廷無暇接見洋人）回南京。1599-1600 年在南京定居，與徐光啟（後 1604 年受洗教名 Paul）、李之藻（後受洗教名 Leon）建立深厚友誼 — 此二人成為「中國禮儀之爭」前最重要的本地耶穌會學者。1600 年再次北上入京。

學者引用：Brockey 同上書章 4 論利瑪竇與徐光啟、李之藻學術合作；Spence 同上書章 6「The First Picture: Apostles in a Storm at Sea」整理 1600 年北上歷程。`,
      photo_query: 'Nanjing Ming city walls|南京明城牆',
      historical_refs: ['徐光啟、李之藻著作集'],
    },
    {
      title: '北京 Beijing（覲見萬曆）',
      latlng: [39.9163, 116.3972],
      scripture_refs: [],
      desc: `1601 年 1 月 24 日抵北京，向萬曆皇帝獻自鳴鐘（大小鐘各一）、《萬國輿圖》、聖經、棱鏡、玻璃。萬曆對自鳴鐘的「會說話聲音」極為驚奇 — 留下利瑪竇等修自鳴鐘，並賜居北京。利瑪竇在京 9 年（1601-1610），在徐光啟協助下 1607 年完成《幾何原本》前 6 卷漢譯，定名「幾何學」一詞流傳至今。1605 年建宣武門天主堂（南堂前身）。

學者引用：Spence《The Memory Palace of Matteo Ricci》整本書圍繞利瑪竇北京記憶宮殿教學法；Brockey 同上書章 5；Mungello 同上書章 3。`,
      photo_query: 'Beijing Forbidden City|北京紫禁城',
      historical_refs: ['利瑪竇、徐光啟譯《幾何原本》(1607)'],
    },
    {
      title: '柵欄墓地 Zhalan Cemetery',
      latlng: [39.9276, 116.3175],
      scripture_refs: [],
      desc: `1610 年 5 月 11 日利瑪竇病逝北京，明萬曆皇帝特賜柵欄墓地（今北京阜成門外，現屬中共中央黨校 / 國家行政學院校園內）— 這是中國皇帝第一次破例賜外國傳教士葬地，象徵明廷對利瑪竇地位的肯定。墓園後續埋葬湯若望（1666）、南懷仁（1688）等耶穌會士共 60 餘人，今存 63 塊墓碑。利瑪竇墓碑由葉向高（時任內閣首輔）題寫。

學者引用：Brockey 同上書章 6「Endings」；Mungello 同上書章 4 論柵欄墓對中西文化交流象徵意義；陳垣《元也里可溫教考》整理元明天主教歷史。`,
      photo_query: 'Zhalan Cemetery Beijing Matteo Ricci tomb|北京柵欄墓地利瑪竇墓',
      historical_refs: ['葉向高〈利瑪竇墓誌銘〉(1610)'],
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '利瑪竇明清來華',
  subtitle: '從澳門到北京 28 年',
  badge: 'AD 1582 — 1610',
};

/* ── Commons API + helpers ── */

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
    name: `利瑪竇明清來華 — ${seg.name}`,
    center: seg.center,
    zoom: seg.zoom,
    basemapId: 'voyager',
    overlay: { id: 'ming_1582', opacity: 0.5 },
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

console.log(`Building stories/matteo-ricci/ — 1 segment / ${SEGMENT_JOURNEY.spots.length} spots (ming_1582 overlay)`);

await buildSegment(SEGMENT_JOURNEY, credits, failed);

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], ['journey-thumb', 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name === 'journey-thumb' ? '78' : '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

const storyJson = {
  id: 'matteo-ricci',
  title: '利瑪竇明清來華',
  subtitle: 'AD 1582 — 1610 從澳門到北京 28 年',
  description: '義大利耶穌會士 Matteo Ricci 1582 抵澳門，先以「西僧」身份學中文書畫《山海輿地全圖》；後改穿儒服自稱「西儒」，從韶州、南昌、南京一路北上，1601 入京覲見萬曆皇帝獻自鳴鐘成為首位居北京的天主教傳教士。1610 年卒於北京獲明朝特准賜葬柵欄墓地，開啟「中國禮儀之爭」前的文化適應宣教典範。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '利瑪竇明清來華 — TrailPaint Stories',
    description: '互動地圖：1582 澳門到 1610 北京柵欄墓，7 spots 含《幾何原本》《天主實義》翻譯里程碑',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'journey',
      title: SEGMENT_JOURNEY.name,
      subtitle: SEGMENT_JOURNEY.subtitle,
      description: SEGMENT_JOURNEY.description,
      data: 'journey.trailpaint.json',
      thumbnail: 'journey-thumb.jpg',
      color: SEGMENT_JOURNEY.color,
      music: SEGMENT_JOURNEY.music,
    },
  ],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

const lines = [
  '# 利瑪竇明清來華 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / journey-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-matteo-ricci.mjs`。',
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
lines.push('本故事採傳統耶穌會年代（1582 抵澳門到 1610 卒於北京）。爭議點：');
lines.push('- **「上帝」「天主」翻譯**：利瑪竇《天主實義》主張用「上帝」對應 Deus，引發後續「中國禮儀之爭」(1645-1742) — 利瑪竇生前已預備此論辯');
lines.push('- **祭祖祭孔的合法性**：利瑪竇主張為「公民禮儀」非偶像崇拜，可允信徒參與；繼任者龍華民（Niccolò Longobardo）反對 — 1645 教廷判定禁止後引發中梵衝突 200 年');
lines.push('- **在華 28 年成就規模**：截至 1610 全國僅約 2,500 信徒（少數派視為失敗 vs 多數派視為文化適應典範）');
lines.push('');
lines.push('學者引用：Spence《The Memory Palace of Matteo Ricci》/ Mungello《Curious Land》/ Brockey《Journey to the East》/ 林金水《利瑪竇與中國》/ 計翔翔《利瑪竇思想與中國儒學》');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
const totalSpots = SEGMENT_JOURNEY.spots.length;
console.log(`✅ ${totalSpots} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
