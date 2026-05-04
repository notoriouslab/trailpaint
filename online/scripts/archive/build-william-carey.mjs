#!/usr/bin/env node
/**
 * Builder for stories/william-carey/ (Tier 3 Phase 10).
 * Single segment AD 1792-1834. 「現代宣教之父」.
 * No overlay (India geography outside CCTS coverage).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'william-carey');
const TMP = '/tmp/tp-william-carey';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEGMENT = {
  id: 'india',
  name: '印度宣教',
  subtitle: 'AD 1792 — 1834 從諾丁罕到 Serampore',
  description: 'William Carey 31 歲 1792 諾丁罕講道「期待從神而來大事，為神嘗試大事」啟動 Particular Baptist Missionary Society；次年抵加爾各答開啟 41 年印度宣教。1800 移居丹麥屬 Serampore 創立 Mission，1809 完成 Bengali 全本聖經、1818 創立 Serampore College — 譯經逾 40 種語文、創印度第一份報紙、推動寡婦殉葬廢除。「現代宣教之父」典範。',
  color: '#7c2d12',
  center: [25.0, 60.0],
  zoom: 4,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '諾丁罕 Nottingham（1792 異象）',
      latlng: [52.9548, -1.1581],
      historical_refs: ['William Carey《An Enquiry into the Obligations of Christians to use Means for the Conversion of the Heathens》(1792)'],
      desc: `1792 年 5 月 31 日 Carey 於諾丁罕一場 Particular Baptist 牧師大會講道，依以賽亞 54:2-3「要擴張你帳幕之地」。傳統口傳引言：「期待從神而來大事；為神嘗試大事」(Expect Great Things from God; Attempt Great Things for God) — 講道稿失傳，學者承認此句是後世口傳精煉。同年 5 月 12 日 Carey 著《Enquiry》87 頁論「外邦人歸主」是基督徒義務 — 啟動現代基督新教宣教運動。10 月 2 日 Particular Baptist Society for Propagating the Gospel among the Heathen 成立，Carey 為差遣首位宣教士。

學者引用：Mary Drewery《William Carey: A Biography》(Hodder, 1978) 章 4；Timothy George《Faithful Witness: The Life and Mission of William Carey》(Christian History, 1991)。`,
      photo_query: 'Nottingham St Marys church|諾丁罕聖瑪利教堂',
    },
    {
      title: '倫敦 London（1793 出航）',
      latlng: [51.5074, -0.1278],
      historical_refs: ['Andrew Fuller《Memoirs of William Carey》(1816)'],
      desc: `1793 年 6 月 13 日 Carey 從倫敦碼頭乘 Kron Princessa Maria 號（丹麥船）出航 — 因英國東印度公司不允許傳教士搭乘，必須繞道丹麥船公司。同行妻 Dorothy（半信半願）+ 4 子。航程 5 個月，11 月 11 日抵加爾各答 Hooghly 河口。

學者引用：Drewery 同上書章 5；Vishal Mangalwadi & Ruth Mangalwadi《The Legacy of William Carey》(Crossway, 1999) 章 1。`,
      photo_query: 'London Thames docks 18th century|倫敦泰晤士河碼頭 18 世紀',
    },
    {
      title: '加爾各答 Calcutta（1793 抵達）',
      latlng: [22.5726, 88.3639],
      historical_refs: ['Carey《Journal》(1793-)'],
      desc: `1793 年 11 月抵英屬印度首府加爾各答。當時東印度公司禁止傳教士入境，Carey 一家被迫躲藏於孟加拉鄉間。1794 年 6 月 Carey 接任靛藍 (indigo) 工廠經理 — 賺錢自養 + 學 Bengali + 暗地翻譯。早期 6 年事工艱辛：嬰兒夭折、Dorothy 精神崩潰（後病逝 1807）、自己幾度疫病。

學者引用：Drewery 同上書章 6；S. Pearce Carey（Carey 曾孫）《William Carey, D.D.》(Hodder, 1923) 含 Carey 1794 旅程細節。`,
      photo_query: 'Calcutta Hooghly river ghats|加爾各答 Hooghly 河岸',
    },
    {
      title: 'Mudnabati（1794-1799 Bengal 北部）',
      latlng: [24.7700, 88.1500],
      historical_refs: ['Carey 1794-1799 工廠日誌（British Library OIOC）'],
      desc: `Carey 在 Bengal 北部 Malda 區 Mudnabati 靛藍工廠任經理 5 年。期間：完成 Bengali 新約初稿（1797）、學 Sanskrit、寫 Bengali 文法書、繁殖植物（Carey 一生熱愛植物學，後創 Serampore Botanical Garden）。1799 工廠歇業，舉家遷 Serampore — 適逢 Joshua Marshman + William Ward 抵達加入。

學者引用：Pearce Carey 同上書章 8；Sunil Kumar Chatterjee《William Carey and Serampore》(Bishnupur, 1984) 整理 Mudnabati 工廠資料。`,
      photo_query: 'Malda district India|Malda 孟加拉地區',
    },
    {
      title: 'Serampore（1800 創立 Mission）',
      latlng: [22.7521, 88.3422],
      historical_refs: ['Serampore Mission Form of Agreement (1805) by Trio'],
      desc: `1800 年 1 月 10 日 Carey + Marshman + Ward「Serampore Trio」於丹麥屬 Serampore (距加爾各答 24 公里) 創立 Serampore Mission — 因丹麥治下不受東印度公司禁令限制。1805 年制定《Form of Agreement》11 條使命原則含「我們不為自己累積財富」、「教育印度人成為自主領袖」。1810 完成 Bengali 全本聖經，1818 譯遍六大印度語系全本（Bengali / Sanskrit / Hindi / Marathi / Punjabi / Oriya）+ 部分 Tibetan / Burmese / Chinese。1818 印度第一份雙語報紙《Friend of India》發行。

學者引用：Mangalwadi 同上書章 4 整理 Serampore Trio 模式對日後宣教史影響；A. Christopher Smith《The Serampore Mission Enterprise》(Regnum, 2006)。`,
      photo_query: 'Serampore West Bengal church|Serampore 西孟加拉教堂',
    },
    {
      title: 'Serampore College（1818）',
      latlng: [22.7479, 88.3461],
      historical_refs: ['Serampore College Charter (1827)'],
      desc: `1818 年 7 月 15 日 Serampore Trio 在 Serampore 創立亞洲第一所 grant degree 的高等學府 — Serampore College。1827 年丹麥國王 Frederik VI 賜予正式 college charter（早於印度任何 British India 大學）。設神學、文學、科學三系，招生不分種姓宗教 — 革命性立場。Carey 1834 卒前最後事工是推動印度禁絕 sati（寡婦殉葬）習俗，1829 英國總督 Lord Bentinck 簽署 Bengal Sati Regulation 立法禁絕 — Carey 為主要運動推手，當日適逢主日，Carey 親自譯為 Bengali 公告。

學者引用：George 同上書章 5；E. Daniel Potts《British Baptist Missionaries in India 1793-1837》(Cambridge UP, 1967)。`,
      photo_query: 'Serampore College old building|Serampore 學院老建築',
    },
    {
      title: 'Serampore（1834 葬地）',
      latlng: [22.7556, 88.3404],
      historical_refs: ['Carey《Last Will》(1832)'],
      desc: `1834 年 6 月 9 日 Carey 73 歲卒於 Serampore — 41 年印度事工從未回英國一次。葬於 Serampore Mission Cemetery（即今 Carey Memorial Cemetery）。Carey 遺囑指定墓誌銘僅 12 字：「A wretched, poor, and helpless worm, on Thy kind arms I fall.」(Isaac Watts 詩篇 36 詩節, Carey 譯為 Bengali 多年) — 拒絕任何頌揚。

爭議：「期待從神而來大事」名言真實性 — 講道稿失傳，現代學者 A. Christopher Smith 認為是後世口傳精煉，非 Carey 原句但符合其精神。

學者引用：Drewery 同上書章 13；Pearce Carey 同上書章 25；Smith 同上書章 1。`,
      photo_query: 'Serampore Carey grave cemetery|Serampore 凱瑞墓',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '威廉凱瑞印度宣教',
  subtitle: '現代宣教之父 41 年',
  badge: 'AD 1792 — 1834',
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
    name: `威廉凱瑞印度宣教 — ${seg.name}`,
    center: seg.center,
    zoom: seg.zoom,
    basemapId: 'voyager',
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

console.log(`Building stories/william-carey/ — 1 segment / ${SEGMENT.spots.length} spots`);

await buildSegment(SEGMENT, credits, failed);

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], ['india-thumb', 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name === 'india-thumb' ? '78' : '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

const storyJson = {
  id: 'william-carey',
  title: '威廉凱瑞印度宣教',
  subtitle: 'AD 1792 — 1834 從諾丁罕到 Serampore 41 年',
  description: '英國浸信會宣教士 William Carey 1792 諾丁罕講道激勵成立 Particular Baptist Missionary Society — 啟動現代基督新教宣教運動。1793 抵加爾各答，1800 Serampore Trio 於丹麥屬 Serampore 創立 Mission；41 年間譯印度六大語系聖經、亞洲第一所 grant-degree 高等學府 Serampore College、推動印度禁絕寡婦殉葬。被尊為「現代宣教之父」。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '威廉凱瑞印度宣教 — TrailPaint Stories',
    description: '互動地圖：1792 諾丁罕到 1834 Serampore，7 spots 跨英國/印度 41 年宣教史',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'india',
      title: SEGMENT.name,
      subtitle: SEGMENT.subtitle,
      description: SEGMENT.description,
      data: 'india.trailpaint.json',
      thumbnail: 'india-thumb.jpg',
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
  '# 威廉凱瑞印度宣教 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / india-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-william-carey.mjs`。',
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
lines.push('- **「期待從神而來大事；為神嘗試大事」名言**：1792 諾丁罕講道口傳，原講道稿失傳，現代學者 A. Christopher Smith 認為是後世口傳精煉');
lines.push('- **Serampore Trio 模式**：Carey + Marshman + Ward 三人協作平等分工 vs 單人英雄敘事 — Mangalwadi 整理為日後跨文化宣教團隊原型');
lines.push('- **Mudnabati 早期 6 年事工成效**：傳統福音派視為「沉默的耕種期」vs 修正派視為「事工失敗主動轉向」');
lines.push('');
lines.push('學者引用：Drewery / Mangalwadi《Legacy of William Carey》/ Timothy George《Faithful Witness》/ Pearce Carey 家族傳記 / Smith《Serampore Mission Enterprise》/ Potts《British Baptist Missionaries in India》');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
console.log(`✅ ${SEGMENT.spots.length} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
