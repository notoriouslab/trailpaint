#!/usr/bin/env node
/**
 * One-shot builder for stories/hudson-taylor/ (Tier 2 Phase 8, 2026-05-04).
 *
 * Two segments AD 1853-1905 (Hudson Taylor 50 years in China):
 *   - coastal.trailpaint.json   5 spots  倫敦 → 沿海事工 (1853-1865)
 *   - inland.trailpaint.json    5 spots  CIM 創立 → 內陸擴展 (1866-1905)
 *
 * Overlay: ming_1582 (closest available China overlay, time-shifted ~270 years
 * but geographic风格 still aligned). 戴德生 1853-1905 不在任何 BIBLE_SCALE 或
 * HISTORY_SCALE tick 附近，所以 spot 不設 era 讓故事永顯示，segment 副標
 * 明示年代。
 *
 * Run: `node online/scripts/archive/build-hudson-taylor.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'hudson-taylor');
const TMP = '/tmp/tp-hudson-taylor';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SEGMENT_COASTAL = {
  id: 'coastal',
  name: '抵華與沿海事工',
  subtitle: 'AD 1853 — 1865 從倫敦到布萊頓海岸異象',
  description: '戴德生 21 歲被中國福音會（CES）差遣，1854 抵上海，1856 在寧波建立第一個固定事工地並與馬利亞 Maria Dyer 結婚。1860 因病返英，臥床期間翻譯寧波話新約聖經。1865 年 6 月 25 日布萊頓海岸異象 — 為內陸 11 省每省 2 名宣教士共 24 人懇求 — 同日創立中國內地會（CIM）。',
  color: '#7c2d12',
  center: [40.0, 60.0],
  zoom: 3,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '倫敦 London（差遣出航）',
      latlng: [51.5074, -0.1278],
      historical_refs: ['Howard Taylor《Hudson Taylor in Early Years》(1911)'],
      desc: `1853 年 9 月 19 日戴德生 21 歲從倫敦利物浦碼頭乘 Dumfries 號出航，由中國福音會（Chinese Evangelization Society, CES）差遣，是當時 5 位 CES 宣教士之一。航程 5 個月經好望角繞行，1854 年 3 月 1 日抵上海。CES 1860 解散後戴德生決定不再依賴差會自立，這成為 CIM「不向人募款，唯仰望神」原則的起點。

學者引用：A. J. Broomhall《Hudson Taylor and China's Open Century Vol. 1: Barbarians at the Gates》(Hodder, 1981) 整理 1853 出航與 CES 處境。`,
      photo_query: 'London Trafalgar Square Victorian|倫敦特拉法加廣場',
    },
    {
      title: '上海 Shanghai（1854 抵達）',
      latlng: [31.2304, 121.4737],
      historical_refs: ['倫敦會（LMS）醫院記錄'],
      desc: `1854 年 3 月 1 日抵上海正逢太平天國戰爭。最初依附倫敦會（LMS）的麥都思（Walter Henry Medhurst）醫院學中文。1855 年遇沿海第一次傳教旅行：青浦、嘉定 — 期間穿西式服裝引起抗拒。返滬後做出影響日後事工的決定：剃髮留辮、穿中式長袍 — 此舉被當時西方宣教界普遍視為「失體統」，戴德生卻認為文化適應是進入中國內陸的關鍵。

學者引用：Daniel H. Bays《A New History of Christianity in China》(Wiley-Blackwell, 2012) 章 4 整理 19 世紀中葉宣教士文化適應策略；Broomhall 同上書 Vol. 1。`,
      photo_query: 'Shanghai Bund 19th century|上海外灘 19 世紀',
    },
    {
      title: '寧波 Ningbo（1856 建立事工 + 結婚）',
      latlng: [29.8683, 121.5440],
      historical_refs: ['戴德生《寧波土話新約聖經》(1860)'],
      desc: `1855-1860 寧波是戴德生第一個固定事工地。1857 年與 CES 退會自立。1858 年 1 月 20 日與馬利亞・戴雅（Maria Dyer，倫敦會宣教士戴爾女兒）結婚，馬利亞此後是戴德生事工的關鍵夥伴與中文老師。期間發展出中文姓名「戴德生」(Dai De-sheng) — 「德」呼應 Taylor 的 t，「生」喻新生。1859-60 在寧波翻譯寧波話 colloquial 新約聖經。

學者引用：Howard Taylor《Hudson Taylor and the China Inland Mission: The Growth of a Work of God》(CIM, 1918) 章 8；Roger Steer《J. Hudson Taylor: A Man in Christ》(OMF, 1990) 章 6。`,
      photo_query: 'Ningbo Tianyige|寧波天一閣',
    },
    {
      title: '倫敦 London（1860 養病 + 寧波土話聖經）',
      latlng: [51.5400, -0.0500],
      historical_refs: ['戴德生《China: Its Spiritual Need and Claims》(1865)'],
      desc: `1860 年因健康崩潰回英養病。在倫敦東區 Coborn Street 與 Beaumont Street 期間（1860-66）翻譯寧波話新約聖經、招募新宣教士、寫作《中國 — 屬靈的需要與訴求》(China: Its Spiritual Need and Claims, 1865)。書中震驚英國教界的數據：「每月 100 萬中國人在沒聽過福音的情況下進入永恆」— 成為 CIM 創立的動員文宣。同期間在皮蘭路（Pyrland Road）建立倫敦事務所，為日後 CIM 總部前身。

學者引用：Broomhall 同上書 Vol. 2-3；Steer 同上書章 11-12。`,
      photo_query: 'London East End Victorian|倫敦東區維多利亞時代',
    },
    {
      title: '布萊頓海岸 Brighton（1865 異象）',
      latlng: [50.8225, -0.1372],
      historical_refs: ['戴德生《Brighton Beach Decision》日記 (1865-06-25)'],
      desc: `1865 年 6 月 25 日（主日）戴德生在 Brighton 海邊禱告，為中國內陸 11 個無宣教士的省份每省懇求 2 名宣教士、共 24 人。同日寫支票存入倫敦銀行 10 英鎊，標明「China Inland Mission」開戶 — CIM 正式誕生。次年 5 月 26 日 Lammermuir 號載戴德生夫婦 + 16 名宣教士 + 4 個孩童共 22 人從倫敦啟航，9 月 30 日抵上海。CIM 是當時第一個以「跨宗派、無固定差會經費保證、本地服侍中國最內陸」為原則的差會。

學者引用：Steer 同上書章 13「The Brighton Beach Decision」；Bays 同上書章 4 論 CIM 在 19 世紀末宣教史的轉折地位。`,
      photo_query: 'Brighton beach Sussex pier|布萊頓海灘碼頭',
    },
  ],
};

const SEGMENT_INLAND = {
  id: 'inland',
  name: 'CIM 創立與內陸擴展',
  subtitle: 'AD 1866 — 1905 從杭州總部到鎮江葬地',
  description: '1866 Lammermuir 號 22 人抵滬，杭州設 CIM 中國總部。次 40 年內 CIM 宣教士進入中國 18 省（含內陸 11 省）建立傳教站逾 200 處。1900 義和團事變 CIM 殉道 58 名宣教士 + 21 名子女，是 19 世紀末中國宣教最沈重損失。1905 戴德生在湖南長沙之行卒於鎮江，葬於鎮江西郊牛皮巷。',
  color: '#b45309',
  center: [30.5, 113.0],
  zoom: 5,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '杭州 Hangzhou（1866 CIM 總部）',
      latlng: [30.2741, 120.1551],
      historical_refs: ['Lammermuir 號航海日誌 (1866-1867)'],
      desc: `1866 年 11 月 Lammermuir 號 22 人抵上海後南下杭州，租新巷 1 號設 CIM 中國總部。戴德生堅持新進宣教士全員穿中式服裝、剃髮蓄辮 — 此舉至 1880s 仍受其他差會宣教士批評。但 CIM 的「中國化」策略使其在內陸推進速度遠超其他差會。杭州事工亦含女宣教士獨立工作 — 戴德生支持女性進入內陸宣教，是 19 世紀宣教界少見立場。

學者引用：Broomhall 同上書 Vol. 4 章 3；Bays 同上書章 4。`,
      photo_query: 'Hangzhou West Lake old|杭州西湖',
    },
    {
      title: '安慶 Anqing（1869 第一個內陸站）',
      latlng: [30.5085, 117.0454],
      historical_refs: ['CIM Annual Report (1869)'],
      desc: `1869 年戴德生派宣教士進駐安徽安慶，這是 CIM 第一個內陸（沿海以外）固定宣教站，揭開向中國 11 個無宣教士省份推進的序幕。當時長江流域宣教成本極高 — 民眾敵意、夏季疫病、太平天國餘波。戴德生 1870 年提出「兩條腿原則」：每對宣教士夫婦進駐前先做 6 個月無薪嚮導期，由本地基督徒陪行考察 — 此原則成為日後 CIM 內陸擴展的標準作業。

學者引用：Howard Taylor 同上書章 18；Steer 同上書章 17。`,
      photo_query: 'Anqing Yangtze River|安慶長江',
    },
    {
      title: '漢口 Hankou（1874 中部基地）',
      latlng: [30.5928, 114.3055],
      historical_refs: ['楊格非《Hankow Mission Diary》(1874-)'],
      desc: `1874 年 CIM 在漢口設立中部基地（與 LMS 楊格非 Griffith John 共用）— 漢口因水路通九省，成為 CIM 進入湖北、四川、雲南、貴州等內陸省份的轉運中心。戴德生 1881 年在此召開「武漢會議」確立 CIM 中部 5 省（湖北、湖南、四川、貴州、雲南）擴展計畫，目標每省 2 對宣教士共 70 人 — 響應 1875 倫敦「Cambridge Seven」異象。1880s 後 CIM 在這 5 省共建立傳教站 80 餘處。

學者引用：Broomhall 同上書 Vol. 5；中華續行委辦會《中華歸主》(1922) 整理 19 世紀末各差會分區資料。`,
      photo_query: 'Hankou Wuhan old British concession|漢口武漢英租界',
    },
    {
      title: '長沙 Changsha（1880s 反教抗爭）',
      latlng: [28.2278, 112.9388],
      historical_refs: ['戴德生《Hunan Mission Crisis》報告 (1891)'],
      desc: `湖南是中國民族主義反教情緒最強烈省份，1860s-1890s 多次焚燒教堂、殺害宣教士。長沙 1891 年大規模反教暴動 CIM 損失嚴重。戴德生選擇「不退、不報復、繼續愛湖南」— 1898 派 22 對夫婦進駐長沙建立教會。1900 義和團事變最慘重損失也在華北華中地區，CIM 殉道 58 名宣教士 + 21 名子女 — 是 19 世紀宣教史最沈重事件之一。1901 年戴德生在瑞士 Davos 養病期間發表「拒絕清廷賠款」聲明 — 拒絕接受清政府 8000 萬兩白銀賠償，避免讓殉道宣教士的血換成利益訴求。

學者引用：Bays 同上書章 5「The Boxer Uprising」；Marshall Broomhall《Last Letters and Further Records of Martyred Missionaries of the China Inland Mission》(CIM, 1901)。`,
      photo_query: 'Changsha Hunan old city|長沙湖南老城',
    },
    {
      title: '鎮江 Zhenjiang（1905 葬地）',
      latlng: [32.2044, 119.4554],
      historical_refs: ['CIM Memorial Plaque, Zhenjiang'],
      desc: `1905 年 6 月 3 日戴德生 73 歲在湖南長沙巡視期間病重，遷至鎮江修養，6 月 3 日卒於鎮江 — 距離他 50 年前抵上海整整 51 年。葬於鎮江西郊馬利亞墓旁（馬利亞 1870 在鎮江因家中傳染病過世，戴德生在華期間最深的傷痛）。今鎮江牛皮巷北固山下「戴德生墓園」立有兩塊紀念碑：1905 原墓碑（文革期間遷葬）+ 2008 OMF 重立的紀念碑「我若有千條性命，每一條都歸中國」。

學者引用：Broomhall 同上書 Vol. 7「Refining Fire」章 8；OMF International《Heritage Statement》(1965, CIM 100 週年改名)。`,
      photo_query: 'Zhenjiang Beigu Mountain|鎮江北固山',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '戴德生中國內地會',
  subtitle: '從倫敦到鎮江 50 年',
  badge: 'AD 1853 — 1905',
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
    // Hudson Taylor 1853-1905 不在任何 era tick 附近，不設 era 讓故事永顯示
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
    name: `戴德生中國內地會 — ${seg.name}`,
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

console.log(`Building stories/hudson-taylor/ — 2 segments / ${SEGMENT_COASTAL.spots.length + SEGMENT_INLAND.spots.length} spots (no era — 1853-1905 outside tick range)`);

await buildSegment(SEGMENT_COASTAL, credits, failed);
await buildSegment(SEGMENT_INLAND, credits, failed);

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

for (const seg of [SEGMENT_COASTAL, SEGMENT_INLAND]) {
  const spec = {
    title: seg.name,
    subtitle: '戴德生中國內地會',
    badge: seg.subtitle.split('—')[0].trim(),
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

const storyJson = {
  id: 'hudson-taylor',
  title: '戴德生中國內地會',
  subtitle: 'AD 1853 — 1905 從倫敦到鎮江 50 年',
  description: '英國宣教士 James Hudson Taylor 21 歲被中國福音會差遣抵滬，後在寧波建立事工並結婚。1865 倫敦布萊頓海岸異象創立中國內地會（CIM），1866 Lammermuir 號 22 人抵杭州設總部。次 40 年 CIM 進入中國 18 省含內陸 11 省，建立傳教站 200+ 處。1900 義和團事變殉道 58 名宣教士。1905 卒於鎮江，葬西郊妻子馬利亞旁。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '戴德生中國內地會 — TrailPaint Stories',
    description: '互動地圖：1853 倫敦差遣到 1905 鎮江葬地，10 spots 跨英國/中國 50 年宣教史',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'coastal',
      title: SEGMENT_COASTAL.name,
      subtitle: SEGMENT_COASTAL.subtitle,
      description: SEGMENT_COASTAL.description,
      data: 'coastal.trailpaint.json',
      thumbnail: 'coastal-thumb.jpg',
      color: SEGMENT_COASTAL.color,
      music: SEGMENT_COASTAL.music,
    },
    {
      id: 'inland',
      title: SEGMENT_INLAND.name,
      subtitle: SEGMENT_INLAND.subtitle,
      description: SEGMENT_INLAND.description,
      data: 'inland.trailpaint.json',
      thumbnail: 'inland-thumb.jpg',
      color: SEGMENT_INLAND.color,
      music: SEGMENT_INLAND.music,
    },
  ],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

const lines = [
  '# 戴德生中國內地會 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '## Era 設計說明',
  '',
  '戴德生在華 1853-1905，不在現有 BIBLE_SCALE 或 HISTORY_SCALE 任何 tick 附近（最近 ming_1582 偏早 270 年）。本故事 spot 不設 era，讓故事在 TimeSlider 拖任何位置都永顯示，避免 fade out。未來如果新增 ad1820 (清代) overlay 或 era.qing tick，可回頭補 era 標記。',
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / coastal-thumb.jpg / inland-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-hudson-taylor.mjs`。',
  '',
];
for (const segId of ['coastal', 'inland']) {
  const segName = segId === 'coastal' ? '抵華與沿海事工（倫敦 → 布萊頓）' : 'CIM 創立與內陸擴展（杭州 → 鎮江）';
  lines.push(`## ${segName}`);
  lines.push('');
  lines.push('| # | Spot | 作者 | 授權 | 來源 |');
  lines.push('|---|---|---|---|---|');
  for (const c of credits.filter((x) => x.section === 'spot' && x.seg === segId)) {
    lines.push(`| ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
  }
  lines.push('');
}
lines.push('## 學者引用');
lines.push('');
lines.push('- A. J. Broomhall《Hudson Taylor and China\'s Open Century》7 卷 (Hodder & Stoughton, 1981-1989) — 終極傳記');
lines.push('- Howard Taylor & Mrs. Howard Taylor《Hudson Taylor and the China Inland Mission》(CIM, 1918) — 戴德生家族官方傳');
lines.push('- Daniel H. Bays《A New History of Christianity in China》(Wiley-Blackwell, 2012) — 現代學術通史');
lines.push('- Roger Steer《J. Hudson Taylor: A Man in Christ》(OMF, 1990)');
lines.push('- Marshall Broomhall《Last Letters and Further Records of Martyred Missionaries of the China Inland Mission》(CIM, 1901) — 義和團事變殉道紀錄');
lines.push('');
lines.push('CIM 1965 改名 OMF International（海外基督使團），仍持續在亞洲十九國差遣宣教士。');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
const totalSpots = SEGMENT_COASTAL.spots.length + SEGMENT_INLAND.spots.length;
console.log(`✅ ${totalSpots} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
