#!/usr/bin/env node
/**
 * One-shot builder for stories/david-king/ (Tier 1 Phase 3, 2026-05-04).
 *
 * Two segments anchored to era.david (BC 1000):
 *   - rise.trailpaint.json     6 spots  伯利恆 → 耶路撒冷（建國敘事）
 *   - reign.trailpaint.json    5 spots  摩利亞 → 基遍（王朝悲劇與傳承）
 *
 * Pipeline mirrors build-exodus.mjs (Phase 2).
 * Run: `node online/scripts/archive/build-david.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'david-king');
const TMP = '/tmp/tp-david-king';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: -1010, end: -970 }; // 大衛在位約 BC 1010-970

const SEGMENT_RISE = {
  id: 'rise',
  name: '從牧羊到建京都',
  subtitle: 'BC 1025 — 1003 伯利恆到耶路撒冷',
  description: '少年大衛在伯利恆受撒母耳膏立，於以拉谷以彈弓擊倒歌利亞名震以色列，遭掃羅猜忌後流亡曠野召聚 400 人，於希伯崙作猶大王 7 年，最終攻克錫安城建立耶路撒冷為京都，歷時約 22 年。',
  color: '#b45309',
  center: [31.6, 35.1],
  zoom: 9,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '伯利恆 Bethlehem',
      latlng: [31.7044, 35.2024],
      scripture_refs: ['1 Sam 16:1-13', '1 Sam 17:12', 'Ruth 4:18-22'],
      desc: `「猶大伯利恆」（Bethlehem of Judah），耶西 8 子之地。撒母耳奉神命到此膏立大衛為下一任以色列王（撒上 16）。從路得到大衛的家譜（得 4:18-22），這座小村莊是後來彌賽亞先知傳統的源頭（彌 5:2）。

學者引用：Avraham Faust《The Archaeology of Israelite Society in Iron Age II》(Eisenbrauns, 2012) 整理猶大山地 Iron Age I-II 聚落考古；伯利恆 Iron Age 層在當代 Church of the Nativity 之下難以挖掘，主要靠周邊 survey。`,
      photo_query: 'Bethlehem old city|伯利恆古城',
    },
    {
      title: '以拉谷 Valley of Elah',
      latlng: [31.6925, 34.9550],
      scripture_refs: ['1 Sam 17:1-58'],
      desc: `大衛擊歌利亞之地（撒上 17）。以色列軍與非利士軍對峙的山谷，今 Khirbet Qeiyafa 考古遺址 (Yosef Garfinkel 2007-2013 挖掘) 即位於以拉谷北側，碳 14 定年 BC 1020-980 與聖經大衛時代吻合，堡壘規模顯示猶大已具國家形態。

學者引用：Yosef Garfinkel & Saar Ganor《Khirbet Qeiyafa Vol. 1: Excavation Report 2007-2008》(IES, 2009)，挑戰 Finkelstein "Low Chronology"（認為大衛王國規模僅地方酋邦）；Israel Finkelstein《David and Solomon》(Free Press, 2006) 反方立場。`,
      photo_query: 'Khirbet Qeiyafa Elah Valley|以拉谷古堡',
    },
    {
      title: '亞杜蘭洞 Cave of Adullam',
      latlng: [31.6500, 34.9833],
      scripture_refs: ['1 Sam 22:1-2', '2 Sam 23:13-17'],
      desc: `大衛逃避掃羅追殺的躲藏地（撒上 22）。「凡受窘迫的、欠債的、心裡苦惱的，都聚集到他那裡，他就作他們的頭目；跟隨他的約有四百人。」傳統位置 Khirbet Sheikh Madhkur 附近的洞穴系統，今 Adullam Forest 自然保護區內。後來大衛三勇士冒死從伯利恆井打水（撒下 23:13-17）也發生於此。

學者引用：Edward Robinson《Biblical Researches in Palestine》(1841) 19 世紀首批考察；現代 Israeli Nature Reserves 維護古跡。`,
      photo_query: 'Adullam cave|亞杜蘭洞穴',
    },
    {
      title: '隱基底 En Gedi',
      latlng: [31.4617, 35.3870],
      scripture_refs: ['1 Sam 24:1-22'],
      desc: `「野山羊磐石」(Rocks of the Wild Goats)。死海西岸綠洲，大衛在洞中割掃羅衣襟一角而不殺之地（撒上 24）。今 Ein Gedi National Park 含古猶太會堂遺址（5-6 世紀拜占庭）與 Iron Age 聚落層。

學者引用：Benjamin Mazar《En-Gedi Excavations》(IES, 1966-72) Iron Age 聚落確認與聖經時期吻合。`,
      photo_query: 'Ein Gedi oasis Dead Sea|隱基底死海綠洲',
    },
    {
      title: '希伯崙 Hebron',
      latlng: [31.5326, 35.0998],
      scripture_refs: ['2 Sam 2:1-4', '2 Sam 5:1-5', 'Gen 23:17-20'],
      desc: `大衛先在此作猶大支派的王 7 年半，後北方 11 支派長老來到希伯崙立大衛為全以色列王（撒下 5:3）。亞伯拉罕葬地（創 23），今 Cave of the Patriarchs / Tomb of the Patriarchs，希律王時代擴建為現今城牆遺跡。

學者引用：Avraham Negev & Shimon Gibson《Archaeological Encyclopedia of the Holy Land》(Continuum, 2001) 「Hebron」條；Iron Age 城層被 Herodian 與 Mamluk 層覆蓋難挖掘。`,
      photo_query: 'Hebron Cave Patriarchs|希伯崙麥比拉洞',
    },
    {
      title: '耶路撒冷 Jerusalem (錫安城)',
      latlng: [31.7740, 35.2350],
      scripture_refs: ['2 Sam 5:6-12', '1 Chr 11:4-9'],
      desc: `大衛攻克耶布斯人的錫安堡壘建為京都（撒下 5:6-10）。城防之爭：聖經記約押從「水溝」(tsinnor) 攻入；考古學者 Eilat Mazar 2005-2010 在錫安山東坡（City of David）挖出大型階梯式石牆結構，命名為「大衛王宮」(Large Stone Structure)，引發學界爭論。

學者引用：Eilat Mazar《Preliminary Report on the City of David Excavations 2005》(Shoham, 2007)；反方 Israel Finkelstein 質疑年代學。1993 Tel Dan Stele "House of David" 銘文出土後，多數學者接受大衛為真實王朝奠基者。`,
      photo_query: 'City of David Jerusalem|耶路撒冷大衛城',
    },
  ],
};

const SEGMENT_REIGN = {
  id: 'reign',
  name: '王朝與傳承',
  subtitle: 'BC 1003 — 970 烏利亞與押沙龍',
  description: '大衛攻克耶路撒冷後 33 年王朝充滿榮耀與悲劇：買亞勞拿禾場為聖殿預備地、攻打亞捫人時爆發拔示巴與烏利亞事件、長子押沙龍叛變兵敗約旦河外、晚年所羅門在基遍蒙神顯現確立王位。',
  color: '#7f1d1d',
  center: [31.85, 35.6],
  zoom: 9,
  music: '../music/sorrow-and-love.mp3',
  spots: [
    {
      title: '摩利亞山 / 亞勞拿禾場',
      latlng: [31.7780, 35.2354],
      scripture_refs: ['2 Sam 24:18-25', '2 Chr 3:1', 'Gen 22:2'],
      desc: `大衛數點百姓後遭瘟疫，按先知迦得指示在耶布斯人亞勞拿的禾場築壇獻祭（撒下 24）。歷代志下 3:1 明指即「摩利亞山」(Mount Moriah)，亦即亞伯拉罕獻以撒之地（創 22）。所羅門後來於此建第一聖殿。

爭議：拉比傳統 + 基督教傳統皆認定耶路撒冷聖殿山即摩利亞山；撒馬利亞傳統認為位於基利心山（Mount Gerizim）— 今撒馬利亞五書經（Samaritan Pentateuch）創 22:2 即作「摩利亞地」(haMoreh) 而非「摩利亞」。

學者引用：Leen Ritmeyer《The Quest: Revealing the Temple Mount in Jerusalem》(Carta, 2006) 重建大衛時期到希律時期聖殿山地形變遷。`,
      photo_query: 'Temple Mount Jerusalem Dome of the Rock|耶路撒冷聖殿山',
    },
    {
      title: '拉巴 Rabbah',
      latlng: [31.9466, 35.9239],
      scripture_refs: ['2 Sam 11:1-27', '2 Sam 12:26-31'],
      desc: `亞捫王國首都（今約旦首都安曼 Citadel）。大衛攻打拉巴期間，於耶路撒冷王宮屋頂見拔示巴沐浴，計謀使烏利亞戰死於拉巴城外（撒下 11）。先知拿單指責「你以刀殺害了赫人烏利亞」，後拔示巴生所羅門。今 Amman Citadel 含 Iron Age II 城牆段、羅馬時期 Hercules 神廟、拜占庭教堂、Umayyad 宮殿層。

學者引用：Adnan Hadidi《The Archaeology of Jordan》(JAA, 1982)；Burton MacDonald《East of the Jordan》(ASOR, 2000)。`,
      photo_query: 'Amman Citadel|安曼古堡',
    },
    {
      title: '瑪哈念 Mahanaim',
      latlng: [32.155, 35.671],
      scripture_refs: ['2 Sam 17:24-29', '2 Sam 18:1-33', 'Gen 32:1-2'],
      desc: `押沙龍叛變期間大衛東渡約旦避難之地（撒下 17:24）。後押沙龍親率以色列軍越過約旦交戰，於以法蓮樹林敗於約押軍（撒下 18），大衛在城門哀哭「我兒押沙龍啊」。位置爭議：傳統 Tulul edh-Dhahab esh-Sharqiya（Jabbok 河北岸雙丘）vs Tell ed-Dahab vs 其他。Edward Robinson 1838 首次提議 Tulul edh-Dhahab。

學者引用：Burton MacDonald《East of the Jordan》(ASOR, 2000) 整理約旦東岸聖經位置；Israel Finkelstein 2009-2017 主持 Tulul edh-Dhahab 挖掘。`,
      photo_query: 'Jabbok river|Wadi Zarqa Jordan',
    },
    {
      title: '隱羅結 En Rogel',
      latlng: [31.7639, 35.2369],
      scripture_refs: ['1 Kings 1:5-9', 'Josh 15:7', '2 Sam 17:17'],
      desc: `「漂洗工之泉」(Fuller\'s Spring)，耶路撒冷東南汲淪谷與欣嫩谷交會處。大衛長子亞多尼雅（押沙龍死後的繼承候選）在此自立為王宴請眾兄弟與亞比亞他、約押（王上 1:9）；同時拿單與拔示巴急報大衛，使大衛立即立所羅門為王。今 Bir Ayyub（約伯井）即傳統位置。

學者引用：Yigal Shiloh《Excavations at the City of David Vol. 1》(Qedem, 1984) 大衛時期耶路撒冷水系研究；Dan Bahat《The Carta Jerusalem Atlas》(Carta, 2011)。`,
      photo_query: 'Kidron Valley Jerusalem|汲淪谷',
    },
    {
      title: '基遍 Gibeon',
      latlng: [31.8467, 35.1900],
      scripture_refs: ['1 Kings 3:4-15', '2 Chr 1:3-13', '1 Chr 16:39-42'],
      desc: `大衛時期會幕所在地（代上 16:39），所羅門即位後在此獻一千祭，神在夜間夢中向他顯現問「你願我賜你什麼？」（王上 3:5）— 所羅門求「智慧的心」。今 el-Jib 村，James Pritchard 1956-62 挖掘出鑿石蓄水池（深 25m）、刻有「Gibeon」字樣陶罐 31 個、Iron Age II 城牆段。

學者引用：James B. Pritchard《Gibeon: Where the Sun Stood Still》(Princeton, 1962) 完整挖掘報告；Pritchard 是極少數親自確認聖經城名考古證據的案例之一。`,
      photo_query: 'el-Jib Gibeon|基遍古城',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '大衛王生平',
  subtitle: '從伯利恆牧羊到耶路撒冷',
  badge: 'BC 1010 — 970',
};

/* ── Commons API helpers ── */

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
    name: `大衛王生平 — ${seg.name}`,
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

console.log(`Building stories/david-king/ — 2 segments / ${SEGMENT_RISE.spots.length + SEGMENT_REIGN.spots.length} spots`);

await buildSegment(SEGMENT_RISE, credits, failed);
await buildSegment(SEGMENT_REIGN, credits, failed);

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

for (const seg of [SEGMENT_RISE, SEGMENT_REIGN]) {
  const spec = {
    title: seg.name,
    subtitle: '大衛王生平',
    badge: seg.subtitle.split('—')[0].trim(), // "BC 1025"
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
  id: 'david-king',
  title: '大衛王生平',
  subtitle: 'BC 1010 — 970 從伯利恆到耶路撒冷',
  description: '少年牧羊人從伯利恆受撒母耳膏立，在以拉谷以彈弓擊敗歌利亞名震以色列；流亡曠野召聚 400 人，於希伯崙作猶大王 7 年，最終攻克錫安建立耶路撒冷為京都。在位 33 年間經歷拔示巴與烏利亞、押沙龍叛變等宮廷悲劇，晚年所羅門在基遍蒙神顯現繼承王位。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '大衛王生平 — TrailPaint Stories',
    description: '互動地圖：BC 1010 從伯利恆到耶路撒冷，11 spots 含 City of David 考古爭議',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'rise',
      title: SEGMENT_RISE.name,
      subtitle: SEGMENT_RISE.subtitle,
      description: SEGMENT_RISE.description,
      data: 'rise.trailpaint.json',
      thumbnail: 'rise-thumb.jpg',
      color: SEGMENT_RISE.color,
      music: SEGMENT_RISE.music,
    },
    {
      id: 'reign',
      title: SEGMENT_REIGN.name,
      subtitle: SEGMENT_REIGN.subtitle,
      description: SEGMENT_REIGN.description,
      data: 'reign.trailpaint.json',
      thumbnail: 'reign-thumb.jpg',
      color: SEGMENT_REIGN.color,
      music: SEGMENT_REIGN.music,
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
  '# 大衛王生平 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / rise-thumb.jpg / reign-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-david.mjs`。',
  '',
];
for (const segId of ['rise', 'reign']) {
  const segName = segId === 'rise' ? '從牧羊到建京都（伯利恆 → 耶路撒冷）' : '王朝與傳承（摩利亞 → 基遍）';
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
lines.push('本故事採早期 Iron Age IIA 年代學（BC 1010-970 大衛王在位）。爭議地點 desc 標明各派立場與學者引用：');
lines.push('- **大衛王國規模**：Mazar / Faust / Garfinkel（國家形態，Iron Age IIA 城防 + Khirbet Qeiyafa） vs Finkelstein "Low Chronology"（地方酋邦）');
lines.push('- **City of David / 大衛王宮**：Eilat Mazar 2005-2010 Large Stone Structure 認定 vs Finkelstein 質疑年代學');
lines.push('- **摩利亞山位置**：耶路撒冷聖殿山（拉比 + 基督教傳統）vs 基利心山（撒馬利亞傳統）');
lines.push('- **瑪哈念位置**：Tulul edh-Dhahab（多數）vs Tell ed-Dahab vs 其他約旦東岸候選');
lines.push('');
lines.push('1993 Tel Dan Stele "House of David"（亞蘭文 BC 9 世紀）銘文出土後，多數學者接受大衛為真實王朝奠基者；爭議集中於王國規模而非存在性。');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
const totalSpots = SEGMENT_RISE.spots.length + SEGMENT_REIGN.spots.length;
console.log(`✅ ${totalSpots} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
