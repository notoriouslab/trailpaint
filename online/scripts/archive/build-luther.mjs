#!/usr/bin/env node
/**
 * Builder for stories/luther/ (Tier 3 Phase 9, 2026-05-04).
 * Single segment AD 1517-1546 (Reformation Reformer).
 * No overlay (1517 outside any HISTORY_SCALE tick range).
 *
 * Run: `node online/scripts/archive/build-luther.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'luther');
const TMP = '/tmp/tp-luther';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEGMENT = {
  id: 'reformation',
  name: '宗教改革',
  subtitle: 'AD 1517 — 1546 從 95 條到沃姆斯議會',
  description: '1517 年 10 月 31 日威騰堡城堡教堂 95 條啟動宗教改革，1521 年沃姆斯議會「我立此處」拒絕收回，1521-22 瓦特堡隱居翻譯德文聖經。本路線 7 spots 涵蓋路德 29 年改革生涯，從威騰堡到艾斯雷本葬地。',
  color: '#7c2d12',
  center: [51.0, 11.0],
  zoom: 7,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '威騰堡 Wittenberg（95 條）',
      latlng: [51.8669, 12.6386],
      historical_refs: ['Luther《Disputatio pro declaratione virtutis indulgentiarum》(1517-10-31)'],
      desc: `1517 年 10 月 31 日，奥古斯丁修會修士 Martin Luther 將 95 條反贖罪券論題（《關於贖罪券效力的辯論》）釘上威騰堡城堡教堂（Schlosskirche）大門 — 拉丁文原本，目的是學術辯論。當週同時寄信給 Mainz 大主教 Albrecht（管轄威騰堡）。

爭議：「釘城堡教堂門」是否真實事件？1517 同年無第三方目擊記載；現代學者 Erwin Iserloh《The Theses Were Not Posted》(1968) 認為純屬 Melanchthon 1546 後追述。然 1517 城堡教堂門即為大學公告板（有書面記錄常規貼此），釘論題符合學術習俗，傳統說法仍被多數新教學者接受。

學者引用：Roland H. Bainton《Here I Stand: A Life of Martin Luther》(Abingdon, 1950) 經典傳記；Heiko A. Oberman《Luther: Man Between God and the Devil》(Yale UP, 1989) 中世紀脈絡讀法。`,
      photo_query: 'Wittenberg Schlosskirche castle church|威騰堡城堡教堂',
    },
    {
      title: '海德堡 Heidelberg（1518 論辯）',
      latlng: [49.4093, 8.6939],
      historical_refs: ['Luther《Heidelberg Disputation》(1518-04-26)'],
      desc: `1518 年 4 月 26 日奧古斯丁修會在海德堡召開全德總會，Luther 受邀為 95 條辯護並提出 28 條神學論題 + 12 條哲學論題。其中第 21 條提出「十字架神學」(theologia crucis) vs「榮耀神學」(theologia gloriae) 的對比 — 改革神學的核心架構在此奠定。Martin Bucer（後 Strasbourg 改革者）在此首次受路德影響。

學者引用：Gerhard Forde《On Being a Theologian of the Cross》(Eerdmans, 1997) 整理十字架神學發展；Bainton 同上書章 7。`,
      photo_query: 'Heidelberg Castle ruins|海德堡城堡',
    },
    {
      title: '沃姆斯 Worms（1521 帝國議會）',
      latlng: [49.6334, 8.3622],
      historical_refs: ['Luther《Worms Speech》(1521-04-18)'],
      desc: `1521 年 4 月 17-18 日 Luther 應神聖羅馬帝國皇帝 Charles V 召至沃姆斯帝國議會（Reichstag），被要求收回所有著作。Luther 答：「除非你們從聖經與清楚理性說服我...我立此處，別無他法，願主助我。」(Hier stehe ich, ich kann nicht anders. Gott helfe mir. Amen.) 「我立此處」(Hier stehe ich) 句最早見於 1521 年首版印刷本，現代學者 Roland Bainton 認可此句為真但細節口傳潤飾。皇帝隨後頒《沃姆斯詔書》(Edict of Worms) 將 Luther 列為帝國叛犯。

學者引用：Bainton 同上書章 9；Lyndal Roper《Martin Luther: Renegade and Prophet》(Random House, 2016) — 修正派視角分析現場記錄。`,
      photo_query: 'Worms Luther monument|沃姆斯路德紀念碑',
    },
    {
      title: '瓦特堡 Wartburg（1521-22 翻譯德文聖經）',
      latlng: [50.9667, 10.3083],
      historical_refs: ['Luther 譯《Septembertestament》新約德文 (1522-09)'],
      desc: `沃姆斯議會後 Luther 被帝國通緝，薩克森選帝侯 Frederick the Wise 派人「綁架」Luther 隱藏於瓦特堡 — 假死真隱居 10 個月（1521-05 至 1522-03）。期間化名「Junker Jörg」(喬治騎士)，留鬍鬚著貴族服。10 週內譯出新約德文（從 Erasmus 1516 希臘文版），1522 年 9 月威騰堡印行《九月聖經》— 5000 本兩月內售罄。塑造了現代德語的標準形式。1534 完成全本聖經德譯。

學者引用：Heinz Bluhm《Martin Luther: Creative Translator》(Concordia, 1965) 翻譯學專著；Bainton 同上書章 10。`,
      photo_query: 'Wartburg castle Luther room|瓦特堡路德房間',
    },
    {
      title: '威騰堡 Lutherhaus（1525 結婚）',
      latlng: [51.8657, 12.6504],
      historical_refs: ['Luther《Vom ehelichen Leben》論婚姻 (1522)'],
      desc: `1522 年 3 月 Luther 返威騰堡平息 Karlstadt 激進派引發的暴亂。1525 年 6 月 13 日與前修女 Katharina von Bora 結婚（雙方先解開修道誓言），震驚天主教與新教。婚後居住前奧古斯丁修會（後成 Lutherhaus），共生 6 子。Katharina 經營農場、釀酒、開旅店，自稱「Herr Käthe」(凱蒂大人)，路德書信中稱「my lord Katie」。Lutherhaus 餐桌談話記錄為《Tischreden》(Table Talk) — 6,596 條，1566 後出版。

學者引用：Martin E. Marty《Martin Luther》(Penguin, 2004) 第 7 章；Susan C. Karant-Nunn & Merry E. Wiesner-Hanks《Luther on Women: A Sourcebook》(Cambridge, 2003)。`,
      photo_query: 'Lutherhaus Wittenberg museum|威騰堡路德故居',
    },
    {
      title: 'Coburg 要塞（1530 奧古斯堡會議流亡）',
      latlng: [50.2585, 10.9637],
      historical_refs: ['《Augsburg Confession》(1530-06-25)；Luther《Coburg Letters》'],
      desc: `1530 年 4-10 月奧古斯堡帝國議會討論宗教問題期間，Luther 因為帝國通緝犯身份不能離開薩克森，居 Coburg 要塞（Veste Coburg）— 是當時薩克森境內最南的安全據點，距奧古斯堡 250 公里。Melanchthon 在奧古斯堡主筆《奧古斯堡信條》(Augsburg Confession) 28 條成為新教主要信仰告白；Luther 透過密集書信指導論辯方向。Coburg 要塞房間至今保留為「Lutherzimmer」博物館。

學者引用：Robert Kolb《Luther and the Stories of God》(Baker, 2012) 整理 Augsburg 起草過程；Bainton 同上書章 14。`,
      photo_query: 'Veste Coburg fortress|科堡要塞',
    },
    {
      title: 'Eisleben 艾斯雷本（1546 卒地）',
      latlng: [51.5300, 11.5500],
      historical_refs: ['Justus Jonas《Luther\'s Last Days》(1546)'],
      desc: `1483 年 11 月 10 日 Luther 出生於 Eisleben（薩克森-安哈特），1546 年 2 月 18 日同樣於此卒於返鄉調解 Mansfeld 伯爵家族紛爭期間，享年 62 歲。出生地 Lutherhaus Eisleben + 卒地 Sterbehaus 1996 並列 UNESCO 世界遺產（連同威騰堡 Lutherhaus、Wartburg）。Luther 安葬於威騰堡城堡教堂講壇下方 — 即 1517 釘 95 條的同一座教堂。

爭議：Luther 晚期反猶太著作《On the Jews and Their Lies》(1543) — 福音派視為時代局限，修正派如 Lyndal Roper 認為對後世反猶意識形態（含納粹）有直接影響。本路線採平衡立場：呈現改革神學貢獻同時不迴避晚期失誤。

學者引用：Eric W. Gritsch《Martin Luther's Anti-Semitism》(Eerdmans, 2012) 完整分析；Roper 同上書章 23-24。`,
      photo_query: 'Eisleben Lutherhaus|艾斯雷本路德故居',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '馬丁路德宗教改革',
  subtitle: '從 95 條到沃姆斯議會',
  badge: 'AD 1517 — 1546',
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
    name: `馬丁路德宗教改革 — ${seg.name}`,
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

console.log(`Building stories/luther/ — 1 segment / ${SEGMENT.spots.length} spots`);

await buildSegment(SEGMENT, credits, failed);

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], ['reformation-thumb', 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  writeFileSync(htmlPath, makeCoverHtml(COVER_HTML_SPEC, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name === 'reformation-thumb' ? '78' : '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

const storyJson = {
  id: 'luther',
  title: '馬丁路德宗教改革',
  subtitle: 'AD 1517 — 1546 從 95 條到艾斯雷本葬地',
  description: '奥古斯丁修士 Martin Luther 1517 釘 95 條於威騰堡城堡教堂啟動宗教改革，1521 沃姆斯議會「我立此處」拒絕收回；瓦特堡隱居 10 月譯出德文新約塑造現代德語標準。1525 與前修女 Katharina 結婚震動歐洲；1530 Coburg 要塞遠程指導奧古斯堡信條起草；1546 卒於 Eisleben 故鄉。29 年改革神學遺產含「因信稱義」、「唯獨聖經」、「萬民皆祭司」三大原則。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '馬丁路德宗教改革 — TrailPaint Stories',
    description: '互動地圖：1517 95 條到 1546 卒地，7 spots 跨德國 29 年改革史',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'reformation',
      title: SEGMENT.name,
      subtitle: SEGMENT.subtitle,
      description: SEGMENT.description,
      data: 'reformation.trailpaint.json',
      thumbnail: 'reformation-thumb.jpg',
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
  '# 馬丁路德宗教改革 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / reformation-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-luther.mjs`。',
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
lines.push('- **1517-10-31 釘 95 條城堡教堂門**：傳統說法（多數新教學者）vs Erwin Iserloh 1968 修正派（純為 Melanchthon 1546 後追述）');
lines.push('- **「我立此處 Hier stehe ich」**：1521 首版印刷有此句，現代學者 Bainton 認為真實但口傳潤飾');
lines.push('- **晚期反猶太著作《On the Jews and Their Lies》(1543)**：福音派視為時代局限 vs 修正派 Roper 認為對後世反猶（含納粹）有直接影響');
lines.push('');
lines.push('學者引用：Bainton《Here I Stand》/ Oberman《Luther: Man Between God and the Devil》/ Roper《Renegade and Prophet》/ Marty / Bluhm / Forde / Kolb / Gritsch');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
console.log(`✅ ${SEGMENT.spots.length} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
