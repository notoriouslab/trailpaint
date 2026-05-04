#!/usr/bin/env node
/**
 * Phase 12: extend stories/zheng-he/ with middle segment (voyages 2-6, 1407-1422).
 * Adds zheng-he/middle.trailpaint.json + middle-thumb.jpg + updates story.json.
 * Existing first/seventh segments untouched.
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'zheng-he');
const TMP = '/tmp/tp-zheng-he-middle';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: 1407, end: 1422 };

const SEGMENT = {
  id: 'middle',
  name: '中段五次航行',
  subtitle: 'AD 1407 — 1422 第二至第六次下西洋',
  description: '永樂年間第二至第六次下西洋（1407-1422），鄭和率寶船隊推進至印度西南古里、波斯灣口忽魯謨斯、阿拉伯半島亞丁、最遠抵非洲東岸麻林（今肯亞）— 比哥倫布橫渡大西洋早 80 年。第四航 (1413-1415) 是中國前現代海洋史最遠航行記錄。本段 5 spots 標出五次航次共同經停的關鍵港埠。',
  color: '#92400e',
  center: [10.0, 80.0],
  zoom: 4,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '滿剌加 Malacca',
      latlng: [2.1896, 102.2501],
      historical_refs: ['馬歡《瀛涯勝覽》滿剌加國條 (1451)'],
      desc: `第二次下西洋（1407-1409）鄭和在滿剌加王國設「官廠」(駐軍營兼倉庫)，是中國海外第一個正式軍事據點。馬六甲海峽是印度洋通南海的咽喉，所有後續航次必經。1411 年鄭和護送滿剌加國王拜里米蘇剌一行 540 人朝貢明廷，這是滿剌加從蘇門答臘附庸躍升為東南亞海權強國的關鍵 — 永樂帝賜予「金印詔誥」確立其獨立國格。

學者引用：Edward L. Dreyer《Zheng He: China and the Oceans in the Early Ming Dynasty》(Pearson, 2007) 章 3；Louise Levathes《When China Ruled the Seas》(Oxford, 1994) 章 5；鄭鶴聲《鄭和遺事彙編》(中華書局, 1948)。`,
      photo_query: 'Malacca river|Melaka river',
    },
    {
      title: '古里 Calicut',
      latlng: [11.2588, 75.7804],
      historical_refs: ['鞏珍《西洋番國志》古里國條 (1434)'],
      desc: `印度西南馬拉巴海岸最大胡椒貿易港，第三至第七航的「西洋」核心終點。鄭和首航即抵此並立碑「其國去中國十萬餘里，民物熙皡，大同風俗，刻石於茲，永示萬世」(費信《星槎勝覽》)，是中國海外最早的勒石紀念碑。鄭和 1433 年第七航卒於古里返航途中。1498 年達伽馬抵此即西方所謂「發現印度」— 比鄭和晚 93 年。

學者引用：費信《星槎勝覽》(1436) 記古里立碑；Dreyer 同上書章 4；Roderich Ptak《China's Seaborne Trade with South and Southeast Asia》(Variorum, 1999) 整理古里中印貿易史。`,
      photo_query: 'Calicut Kozhikode beach Kerala|古里印度卡利卡特',
    },
    {
      title: '忽魯謨斯 Hormuz',
      latlng: [27.0980, 56.4500],
      historical_refs: ['馬歡《瀛涯勝覽》忽魯謨斯國條 (1451)'],
      desc: `波斯灣口戰略要塞，控制印度洋進入兩河流域與紅海的咽喉。第五航（1417-1419）鄭和首抵此地，與當時 Hormuz 王國（蒙古伊兒汗國後裔，建於 1262）建立外交。馬歡《瀛涯勝覽》詳記忽魯謨斯人「皆白晳俊偉」、市場「金銀錢及一切番貨甚廣」— 是中世紀全球貿易十字路口最詳實的中文記載。第六、七航也多次造訪。

學者引用：Levathes 同上書章 7；Dreyer 同上書章 5；張燮《東西洋考》(1617) 對比明後期忽魯謨斯衰敗紀錄。`,
      photo_query: 'Hormuz Island Persian Gulf|忽魯謨斯波斯灣',
    },
    {
      title: '亞丁 Aden',
      latlng: [12.7855, 45.0187],
      historical_refs: ['馬歡《瀛涯勝覽》阿丹國條 (1451)'],
      desc: `紅海南口要港，鄭和第四航（1413-1415）首訪，第五至七航持續往來。亞丁王國（Rasulid Dynasty 1229-1454 統治期）是當時紅海最強海權，也是鄭和向阿拉伯半島、非洲擴展的補給基地。從亞丁出發鄭和分隊（由太監洪保率）抵麥加、麻林（今肯亞馬林迪），是中國前現代外交活動最遠地理範圍。

學者引用：Levathes 同上書章 6；Sally K. Church《Zheng He's Voyages: New Perspectives》(SOAS, 2008) 整理紅海與東非分隊史料；季烨《鄭和西洋史考》(三聯, 2003)。`,
      photo_query: 'Aden Yemen old city|亞丁葉門古城',
    },
    {
      title: '麻林 Malindi',
      latlng: [-3.2192, 40.1169],
      historical_refs: ['《明史·鄭和傳》', '麻林貢麒麟事件 1414/1415'],
      desc: `非洲東岸今肯亞 Malindi 港。第四航 1414 年鄭和分隊抵此，麻林國王送長頸鹿（中文記為「麒麟」古代瑞獸）回中國，永樂帝親自於奉天門接受朝貢 — 是中國皇家儀式中第一次接見非洲使節。Malindi 是鄭和七航最遠抵達點（部分學者認為分隊更南至 Mozambique 或 Sofala，但無定論）。Gavin Menzies《1421: The Year China Discovered the World》(2002) 主張鄭和分隊抵美洲，但證據被學界主流否定。

學者引用：Levathes 同上書章 8 整理麒麟貢史料；Dreyer 同上書章 6 評估 Menzies「1421 假說」；Church 同上書章 9。`,
      photo_query: 'Malindi Kenya old town|麻林肯亞馬林迪',
    },
  ],
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

function makeThumbHtml(spec, w, h) {
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
</style></head><body>
<div class="leaf">🌿</div>
<h1 class="title">${esc(spec.title)}</h1>
<div class="subtitle">${esc(spec.subtitle)}</div>
<div class="badge">${esc(spec.badge)}</div>
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

await mkdir(TMP, { recursive: true });

const credits = [];
const failed = [];

console.log(`Building stories/zheng-he/middle.trailpaint.json — ${SEGMENT.spots.length} spots`);

const projSpots = [];
for (let i = 0; i < SEGMENT.spots.length; i++) {
  const s = SEGMENT.spots[i];
  const num = i + 1;
  process.stdout.write(`  ${num}. ${s.title}... `);
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
    failed.push({ num, title: s.title, query: s.photo_query });
    projSpots.push(baseSpot);
    continue;
  }
  let photoBase64 = null;
  try {
    photoBase64 = await fetchAsBase64(hit.thumbUrl);
  } catch (e) {
    process.stdout.write(`FETCH FAIL\n`);
    failed.push({ num, title: s.title, query: s.photo_query, err: e.message });
    projSpots.push(baseSpot);
    continue;
  }
  const meta = buildPhotoMeta(hit);
  process.stdout.write(`✓ ${hit.file} (${meta.license})\n`);
  credits.push({ num, title: s.title, file: hit.file, meta });
  projSpots.push({ ...baseSpot, photo: photoBase64, photoMeta: meta });
  await sleep(500);
}

const project = {
  version: 5,
  name: `鄭和下西洋 — ${SEGMENT.name}`,
  center: SEGMENT.center,
  zoom: SEGMENT.zoom,
  basemapId: 'voyager',
  overlay: { id: 'ming_1582', opacity: 0.5 },
  spots: projSpots,
  routes: [
    {
      id: 'r1',
      name: SEGMENT.name,
      pts: SEGMENT.spots.map((s) => s.latlng),
      color: SEGMENT.color,
      elevations: null,
    },
  ],
};
await writeFile(join(STORY_DIR, 'middle.trailpaint.json'), JSON.stringify(project, null, 2));

// Generate middle-thumb
const htmlPath = join(TMP, 'middle-thumb.html');
const pngPath = join(TMP, 'middle-thumb.png');
writeFileSync(htmlPath, makeThumbHtml({ title: '中段五次航行', subtitle: '鄭和下西洋 2-6 航', badge: 'AD 1407 — 1422' }, 400, 400));
await runChrome([
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--window-size=400,400`,
  `--screenshot=${pngPath}`,
  `file://${htmlPath}`,
]);
await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '78',
  pngPath, '--out', join(STORY_DIR, 'middle-thumb.jpg')]);
console.log(`  ✓ middle-thumb.jpg`);

// Update story.json — insert middle between first and seventh
const storyJson = JSON.parse(await readFile(join(STORY_DIR, 'story.json'), 'utf8'));
storyJson.stories = storyJson.stories.filter((s) => s.id !== 'middle');
const middleEntry = {
  id: 'middle',
  title: SEGMENT.name,
  subtitle: SEGMENT.subtitle,
  description: SEGMENT.description,
  data: 'middle.trailpaint.json',
  thumbnail: 'middle-thumb.jpg',
  color: SEGMENT.color,
  music: '../music/voller-hoffnung.mp3',
};
const firstIdx = storyJson.stories.findIndex((s) => s.id === 'first');
storyJson.stories.splice(firstIdx + 1, 0, middleEntry);
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));
console.log(`  ✓ story.json updated (now first → middle → seventh)`);

// Append to CREDITS.md
let creditsExisting = '';
try {
  creditsExisting = await readFile(join(STORY_DIR, 'CREDITS.md'), 'utf8');
} catch {}
const newCreditsBlock = [
  '',
  '---',
  '',
  '## 中段五次航行（middle.trailpaint.json）— Phase 12 補完 (2026-05-04)',
  '',
  '| # | Spot | 作者 | 授權 | 來源 |',
  '|---|---|---|---|---|',
];
for (const c of credits) {
  newCreditsBlock.push(`| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
}
newCreditsBlock.push('');
newCreditsBlock.push('學者引用：Edward L. Dreyer《Zheng He: China and the Oceans in the Early Ming Dynasty》(Pearson, 2007) / Louise Levathes《When China Ruled the Seas》(Oxford, 1994) / 馬歡《瀛涯勝覽》/ 費信《星槎勝覽》/ 鞏珍《西洋番國志》/ Sally K. Church《Zheng He\'s Voyages: New Perspectives》(SOAS, 2008)');
newCreditsBlock.push('');
newCreditsBlock.push('爭議：Gavin Menzies《1421: The Year China Discovered the World》(2002) 主張鄭和分隊抵美洲 — 學界主流否定。');
await writeFile(join(STORY_DIR, 'CREDITS.md'), creditsExisting + newCreditsBlock.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
console.log(`✅ ${SEGMENT.spots.length} spots, ${credits.length} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log('\n⚠️  Failed:');
  for (const f of failed) console.log(`   ${f.num}  ${f.query}  ${f.err || ''}`);
}
