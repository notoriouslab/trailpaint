#!/usr/bin/env node
/**
 * One-shot builder for stories/babylon-exile-return/ (Tier 1 Phase 4, 2026-05-04).
 *
 * Two segments anchored to era.babylon (BC 586 fall of Jerusalem):
 *   - exile.trailpaint.json    5 spots  耶路撒冷被毀 → 巴比倫
 *   - return.trailpaint.json   4 spots  Pasargadae → 重建城牆
 *
 * Pipeline mirrors build-david.mjs (Phase 3).
 * Run: `node online/scripts/archive/build-babylon.mjs`
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'babylon-exile-return');
const TMP = '/tmp/tp-babylon-exile-return';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: -605, end: -432 }; // 第一波被擄 BC 605 → 尼希米第二次回來 BC 432

const SEGMENT_EXILE = {
  id: 'exile',
  name: '被擄',
  subtitle: 'BC 605 — 586 從卡爾凱米到巴比倫',
  description: 'BC 605 尼布甲尼撒在卡爾凱米擊敗埃及，啟動巴比倫帝國對猶大的三波擄掠：BC 605 但以理一行被擄、BC 597 約雅斤王 + 以西結被擄、BC 586 西底家王被弄瞎、聖殿被焚。被擄者沿幼發拉底河北上又東南，終達巴比倫城外提勒亞畢駐紮。',
  color: '#7f1d1d',
  center: [34.5, 40.0],
  zoom: 5,
  music: '../music/sorrow-and-love.mp3',
  spots: [
    {
      title: '卡爾凱米 Carchemish',
      latlng: [36.8259, 37.9985],
      scripture_refs: ['Jer 46:2', '2 Chr 35:20-24'],
      desc: `BC 605 尼布甲尼撒（時為太子）在此擊敗法老尼哥的埃及聯軍，奠定新巴比倫帝國對近東的霸權，啟動猶大被擄三波序幕。今土耳其與敘利亞邊界的 Jerablus 遺址，1911-14 大英博物館 Leonard Woolley + T. E. Lawrence（阿拉伯的勞倫斯）挖掘。

學者引用：D. J. Wiseman《Chronicles of Chaldaean Kings (626-556 B.C.) in the British Museum》(British Museum, 1956) 整理巴比倫泥版年代學，確認卡爾凱米戰役 BC 605 與耶利米預言時間吻合。`,
      photo_query: 'Carchemish ancient|Karkemish Hittite',
    },
    {
      title: '耶路撒冷被毀 Jerusalem',
      latlng: [31.7780, 35.2354],
      scripture_refs: ['2 Kings 25:8-21', 'Jer 39:1-10', 'Lam 1-5', 'Ezek 24:1-2'],
      desc: `BC 586 尼布甲尼撒之護衛長尼布撒拉旦焚燒聖殿、王宮、貴族房屋（王下 25:9）；耶路撒冷城牆被拆，殿中銅柱、銅海打碎運回巴比倫。猶太人定為國恥日 Tisha B\'Av（埃波月 9 日），至今仍在禁食。耶利米哀歌 5 章為這場毀滅留下的詩。

學者引用：Israel Finkelstein & Neil Asher Silberman《The Bible Unearthed》(Free Press, 2001) 整理 Lachish Ostraca（拉吉陶片）等同期考古文獻；Avraham Faust《Judah in the Neo-Babylonian Period》(SBL, 2012)。`,
      photo_query: 'Western Wall Temple Mount destruction|耶路撒冷哭牆',
    },
    {
      title: '利比拉 Riblah',
      latlng: [34.4583, 36.4500],
      scripture_refs: ['2 Kings 25:6-7', 'Jer 52:9-11', '2 Kings 23:33'],
      desc: `奧龍底斯河（Orontes）河畔軍事重鎮，新巴比倫帝國北部行政中心。西底家王逃離耶路撒冷後在耶利哥附近被俘，押至此處。尼布甲尼撒在他眼前殺了他兒子，然後弄瞎他眼，用銅煉鎖著押解到巴比倫（王下 25:6-7）— 西底家成為失明俘虜目睹的最後影像。今敘利亞中部 Riblah 村附近，靠近 Homs。

學者引用：Edward Lipiński《On the Skirts of Canaan in the Iron Age》(Peeters, 2006) 整理 Iron Age 北敘利亞區域政治史；Riblah 為新巴比倫帝國西部軍事司令部多次出現於楔形文字泥版。`,
      photo_query: 'Orontes River Syria|奧龍底斯河',
    },
    {
      title: '提勒亞畢 Tel-Abib',
      latlng: [36.4189, 40.7500],
      scripture_refs: ['Ezek 1:1-3', 'Ezek 3:15', 'Ezek 33:21-22'],
      desc: `「迦巴魯河邊」(by the river Chebar) 被擄者主要安置區（結 1:1, 3:15）。Chebar = 楔形文字 nāru kabari，今 Khabur 河（幼發拉底河支流）流域。以西結 BC 597 第二波被擄至此（結 1:2），於 BC 593 開始受呼召作先知。今伊拉克北部 / 敘利亞東北 Khabur 河流域考古層豐富。

學者引用：Daniel I. Block《The Book of Ezekiel》(Eerdmans, 1997-98) 整理 Chebar = Khabur 共識；Bustenay Oded《Mass Deportations and Deportees in the Neo-Assyrian Empire》(Reichert, 1979) 整理新巴比倫遣徙策略。`,
      photo_query: 'Khabur river Syria|哈博河',
    },
    {
      title: '巴比倫 Babylon',
      latlng: [32.5364, 44.4203],
      scripture_refs: ['Dan 1-6', '2 Kings 25:27-30', 'Ps 137:1-9', 'Jer 50-51'],
      desc: `新巴比倫帝國首都，但以理三朋友在尼布甲尼撒、伯沙撒、大利烏王朝侍奉超過 70 年。「我們曾在巴比倫的河邊坐下，一追想錫安就哭了」（詩 137:1）。城牆 8 公里長，雙重城牆 + Ishtar Gate（藍釉磚 + 龍與牛浮雕）今藏柏林 Pergamon Museum。Robert Koldewey 1899-1917 德國挖掘隊發掘古城核心，尼布甲尼撒泥版證實聖經王名與紀年。

學者引用：Robert Koldewey《Das wieder erstehende Babylon》(1925) 完整挖掘報告；D. J. Wiseman 同上；Joan Oates《Babylon》(Thames & Hudson, 1986)。`,
      photo_query: 'Babylon Ishtar Gate|巴比倫伊絲塔門',
    },
  ],
};

const SEGMENT_RETURN = {
  id: 'return',
  name: '歸回',
  subtitle: 'BC 539 — 445 從居魯士到尼希米',
  description: 'BC 539 居魯士滅巴比倫，次年頒詔允許猶太人歸回重建聖殿（拉 1）。三波歸回：BC 538 所羅巴伯領 5 萬人、BC 458 以斯拉領祭司文士、BC 445 尼希米領 52 天重建城牆。書珊王宮為波斯帝國冬都，尼希米與以斯帖在此事奉。',
  color: '#b45309',
  center: [33.0, 45.0],
  zoom: 5,
  music: '../music/voller-hoffnung.mp3',
  spots: [
    {
      title: '居魯士陵 Pasargadae',
      latlng: [30.1944, 53.1672],
      scripture_refs: ['Ezra 1:1-4', '2 Chr 36:22-23', 'Isa 44:28-45:1'],
      desc: `居魯士大帝陵墓，波斯首都 Pasargadae 北部 1.5 公里（今伊朗法爾斯省）。BC 539 居魯士滅巴比倫，次年頒詔允許各民族歸回原籍重建神廟。以賽亞 BC 700 預言「我所牧養的 — 居魯士」（賽 44:28）— 福音派視為先知預言精準典範。1879 大英博物館 Hormuzd Rassam 在巴比倫挖出 Cyrus Cylinder（居魯士圓柱），上載類似宗教寬容詔書，部分學者認以斯拉版本是 Yehud 在地化適配，部分認為兩份是平行詔書。

學者引用：David Stronach《Pasargadae》(Oxford, 1978) 完整挖掘報告；Pierre Briant《From Cyrus to Alexander》(Eisenbrauns, 2002) 波斯帝國權威通史；Cyrus Cylinder 今藏大英博物館 BM 90920。`,
      photo_query: 'Pasargadae Cyrus tomb|居魯士陵帕薩爾加德',
    },
    {
      title: '書珊 Susa',
      latlng: [32.1894, 48.2467],
      scripture_refs: ['Neh 1:1', 'Neh 2:1', 'Esth 1:2', 'Dan 8:2'],
      desc: `古以攔王國首都，波斯帝國四大都城之一（冬都）。尼希米於亞達薛西王 20 年（BC 445）尼散月在此王宮中侍立王前作酒政，求王准予歸回重建耶路撒冷城牆（尼 2）。以斯帖記全書亦發生於此宮中。但以理在此見公綿羊與公山羊異象（但 8:2）。1850s 起 W. K. Loftus、Marcel Dieulafoy、Roman Ghirshman 多次挖掘 Apadana 大殿與 Darius 王宮基台。

學者引用：Roman Ghirshman《Iran from the Earliest Times to the Islamic Conquest》(Penguin, 1954)；Edwin M. Yamauchi《Persia and the Bible》(Baker, 1990) 整理書珊與聖經人物對照。`,
      photo_query: 'Susa Shush Iran|書珊伊朗',
    },
    {
      title: '重建聖殿 Second Temple',
      latlng: [31.7780, 35.2354],
      scripture_refs: ['Ezra 3:8-13', 'Ezra 6:13-22', 'Hag 2:1-9', 'Zech 4:1-14'],
      desc: `BC 538 所羅巴伯與大祭司耶書亞領首批 49,897 人歸回（拉 2:64-65），BC 536 立殿基；因撒馬利亞人攔阻停工 16 年，至 BC 520 因哈該與撒迦利亞先知激勵復工，BC 516 落成。哈該 2:3 記老人比較不上所羅門聖殿哭泣的場景：規模較小，無約櫃。今聖殿山面積即希律王 BC 19 大擴建後的範圍。

學者引用：Lester L. Grabbe《A History of the Jews and Judaism in the Second Temple Period Vol. 1》(T&T Clark, 2004)；H. G. M. Williamson《Ezra, Nehemiah》(Word Biblical Commentary, 1985)。`,
      photo_query: 'Western Wall Jerusalem Second Temple|耶路撒冷哭牆第二聖殿',
    },
    {
      title: '重建城牆 Nehemiah Wall',
      latlng: [31.7811, 35.2350],
      scripture_refs: ['Neh 2:11-20', 'Neh 4:1-23', 'Neh 6:15-16'],
      desc: `BC 445 尼希米抵耶路撒冷後夜間騎驢繞行查驗（尼 2:11-15），組織 42 段工程同時進行：祭司、貴族、商人、香膏匠、女兒一起砌牆，半人作工半人持兵器（尼 4:16-18），52 日完工。今 Eilat Mazar 2007-2008 在 City of David 北側發掘出符合尼希米時期的城牆段，用泥磚與石塊混合建造（與聖經「修補」描述吻合）。

學者引用：Eilat Mazar《The Palace of King David》(Shoham, 2009) 含尼希米城牆段考古；Jacob L. Wright《Rebuilding Identity: The Nehemiah Memoir》(De Gruyter, 2004) 文本與考古交叉分析。`,
      photo_query: 'City of David walls Jerusalem|耶路撒冷大衛城北側城牆',
    },
  ],
};

const COVER_HTML_SPEC = {
  title: '巴比倫被擄歸回',
  subtitle: '從聖殿被毀到城牆重建',
  badge: 'BC 605 — 432',
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
    name: `巴比倫被擄歸回 — ${seg.name}`,
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

console.log(`Building stories/babylon-exile-return/ — 2 segments / ${SEGMENT_EXILE.spots.length + SEGMENT_RETURN.spots.length} spots`);

await buildSegment(SEGMENT_EXILE, credits, failed);
await buildSegment(SEGMENT_RETURN, credits, failed);

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

for (const seg of [SEGMENT_EXILE, SEGMENT_RETURN]) {
  const spec = {
    title: seg.name,
    subtitle: '巴比倫被擄歸回',
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
  id: 'babylon-exile-return',
  title: '巴比倫被擄歸回',
  subtitle: 'BC 605 — 432 從聖殿被毀到城牆重建',
  description: 'BC 586 尼布甲尼撒焚燒聖殿開啟猶大 70 年被擄歲月；BC 539 居魯士滅巴比倫頒詔允許歸回。三波歸回（所羅巴伯/以斯拉/尼希米）跨越 100 年完成聖殿（BC 516）與城牆（BC 445）重建。本故事涵蓋兩端 9 spots，從卡爾凱米戰役啟動被擄到尼希米 52 天城牆完工。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/sorrow-and-love.mp3',
    title: 'Sorrow and Love — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '巴比倫被擄歸回 — TrailPaint Stories',
    description: '互動地圖：BC 586 聖殿毀到 BC 445 城牆重建，9 spots 含 Cyrus Cylinder 與 Tel Dan Stele 考古',
    image: 'og.jpg',
  },
  stories: [
    {
      id: 'exile',
      title: SEGMENT_EXILE.name,
      subtitle: SEGMENT_EXILE.subtitle,
      description: SEGMENT_EXILE.description,
      data: 'exile.trailpaint.json',
      thumbnail: 'exile-thumb.jpg',
      color: SEGMENT_EXILE.color,
      music: SEGMENT_EXILE.music,
    },
    {
      id: 'return',
      title: SEGMENT_RETURN.name,
      subtitle: SEGMENT_RETURN.subtitle,
      description: SEGMENT_RETURN.description,
      data: 'return.trailpaint.json',
      thumbnail: 'return-thumb.jpg',
      color: SEGMENT_RETURN.color,
      music: SEGMENT_RETURN.music,
    },
  ],
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

const lines = [
  '# 巴比倫被擄歸回 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / exile-thumb.jpg / return-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-babylon.mjs`。',
  '',
];
for (const segId of ['exile', 'return']) {
  const segName = segId === 'exile' ? '被擄（卡爾凱米 → 巴比倫）' : '歸回（Pasargadae → 城牆重建）';
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
lines.push('本故事採傳統聖經年代學（BC 605 第一波被擄至 BC 432 尼希米第二次回來）。爭議地點 desc 標明各派立場與學者引用：');
lines.push('- **居魯士頒詔真實性**：以斯拉 1 章詔書 vs 1879 大英博物館出土 Cyrus Cylinder（BM 90920）— 多數學者認 Cyrus Cylinder 為原型，以斯拉版本是 Yehud 在地化適配；福音派視為兩份平行詔書');
lines.push('- **提勒亞畢位置**：Daniel Block 整理共識認 Chebar = Khabur 河；考古層豐富但 Tel-Abib 確切位置仍待 survey 確認');
lines.push('- **重建聖殿規模**：哈該 2:3 老人哭哭比較不上所羅門聖殿 — 第二聖殿規模較小無約櫃，希律 BC 19 大擴建後才回到所羅門級規模');
lines.push('- **尼希米城牆**：Eilat Mazar 2007-2008 在 City of David 北側挖出符合尼希米時期城牆段（混合泥磚與石塊，與聖經「修補」描述吻合）');
lines.push('');
lines.push('Cyrus Cylinder（BM 90920）今藏大英博物館，1971 聯合國認定為「世界第一份人權宣言」雛形。');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
const totalSpots = SEGMENT_EXILE.spots.length + SEGMENT_RETURN.spots.length;
console.log(`✅ ${totalSpots} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
