#!/usr/bin/env node
/**
 * Builder for stories/yu-yonghe/ (裨海紀遊 demo for Academia Sinica GIS collab).
 * Two segments: 渡海來台 (福州→府城, qing_1820) + 牛車北上採硫 (府城→北投, jm200k_1897).
 * Route aligned with THCTS 郁永河《裨海紀遊》路線圖 (thcts.sinica.edu.tw/themes/rc14.php)
 * and 王祿驊、李玉亭、范毅軍、廖泫銘、白璧玲 2011〈《裨海記遊》歷史考證與 GIS 整合應用〉.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const STORY_DIR = join(ROOT, 'stories', 'yu-yonghe');
const TMP = '/tmp/tp-yu-yonghe';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) build';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ERA = { start: 1697, end: 1697 };

const SEGMENTS = [
  {
    id: 'crossing',
    name: '渡海來台',
    subtitle: '1697 正月—二月 福州、廈門、澎湖、鹿耳門',
    description: '康熙三十五年（1696）冬福州火藥庫焚毀，典守者需賠補硫磺，幕客郁永河自告奮勇渡海赴台採硫。康熙三十六年（1697）正月二十四日離福州，陸路經興化、泉州至廈門候船，放洋過澎湖，二月二十五日鹿耳門「買小舟登岸」，於府城停留備辦煉硫工料。《裨海紀遊》卷上詳記黑水溝驚航，是清初渡台海道最重要的第一手紀錄。',
    color: '#1e3a8a',
    center: [24.6, 119.6],
    zoom: 7,
    overlay: { id: 'qing_1820', opacity: 0.5 },
    music: '../music/voller-hoffnung.mp3',
    spots: [
      {
        title: '福州（正月二十四日啟程）',
        latlng: [26.0745, 119.2965],
        historical_refs: ['郁永河《裨海紀遊》卷上', '王祿驊等 2011《地圖》21(2)'],
        desc: `康熙三十五年（1696）冬，福州榕城火藥庫爆焚，五十餘萬斤火藥付之一炬，典守者依例需賠補，硫磺為製藥要料。仁和幕客郁永河聞台灣北投產硫，自告奮勇渡海採辦，康熙三十六年（1697）正月二十四日離福州啟程，取陸路經興化、泉州南下廈門。此行歷時近一年，寫成《裨海紀遊》三卷，是清領初期台灣地理、族群與生態最重要的第一手見聞錄。

學者引用：郁永河《裨海紀遊》（1697；臺灣文獻叢刊本）；王祿驊、李玉亭、范毅軍、廖泫銘、白璧玲〈《裨海記遊》歷史考證與 GIS 整合應用〉《地圖》21(2): 23-26, 2011 — 全程路線之現代 GIS 考證。`,
        photo_query: '福州 三坊七巷|Fuzhou Sanfang Qixiang',
      },
      {
        title: '廈門（放洋渡黑水溝）',
        latlng: [24.4478, 118.0819],
        historical_refs: ['郁永河《裨海紀遊》卷上'],
        desc: `二月間抵廈門候風。清初渡台例由廈門放洋，經澎湖轉入鹿耳門。《裨海紀遊》卷上詳記橫渡台灣海峽所歷「紅水溝」「黑水溝」：「臺灣海道，惟黑水溝最險。自北流南，不知源出何所。海水正碧，溝水獨黑如墨，勢又稍窳，故謂之溝。」黑水溝即澎湖水道的黑潮支流，為清代渡台移民聞之色變的險程。

學者引用：《裨海紀遊》卷上海程紀事；黑水溝洋流之現代海洋學對應見澎湖水道黑潮支流研究。`,
        photo_query: '廈門港 鼓浪嶼|Xiamen Gulangyu harbor',
      },
      {
        title: '澎湖（媽宮澳）',
        latlng: [23.5654, 119.5661],
        historical_refs: ['郁永河《裨海紀遊》卷上', 'THCTS 郁永河路線圖'],
        desc: `舟過澎湖，泊媽宮澳（今馬公港）。媽宮澳因天妃宮得名——今澎湖天后宮，文獻可考至 1604 年（沈有容諭退韋麻郎碑），為台灣最古老的媽祖廟。澎湖自元代設巡檢司，清初為渡台航路的中繼與分汛之地；候風換潮後再放洋東渡，入鹿耳門。

學者引用：《裨海紀遊》卷上；中研院人社中心 THCTS〈郁永河《裨海紀遊》路線圖〉海程段考證。`,
        photo_query: '澎湖天后宮|Penghu Tianhou Temple',
      },
      {
        title: '鹿耳門（二月二十五日登岸）',
        latlng: [23.0405, 120.1250],
        historical_refs: ['郁永河《裨海紀遊》卷上', '王祿驊等 2011《地圖》21(2)'],
        desc: `鹿耳門為台江內海唯一深水航道，鐵板沙暗礁密布，大舟須候潮引港；二月二十五日「買小舟登岸」，換舟渡台江抵府城。1697 年的台江猶是一片內海，1823 年曾文溪改道後逐漸陸化為今日台南安南區的魚塭與市街；三百年海岸線變遷，正是歷史地圖與 GIS 互證的經典題材。

學者引用：王祿驊、李玉亭、范毅軍、廖泫銘、白璧玲 2011 — 登陸段與台江古海岸線之 GIS 考證；THCTS 路線圖。`,
        photo_query: '鹿耳門天后宮|Luermen Tainan',
      },
      {
        title: '台灣府城（備辦煉硫工料）',
        latlng: [22.9975, 120.2025],
        historical_refs: ['郁永河《裨海紀遊》卷中'],
        desc: `郁永河在府城（今台南）停留月餘，購辦煉硫大鑊、布、油、糖等工料並招募工匠。同行者王雲森押工具由海路先運淡水；郁永河則婉拒眾人「海道便捷」之勸，堅持乘牛車走陸路縱貫西部——欲親歷諸番社、遍觀海外形勢。四月初七日，一行五十五人自府城啟程北上。

學者引用：《裨海紀遊》卷中；府城物料籌辦與陸海分運安排見卷中紀事。`,
        photo_query: '赤崁樓|Chihkan Tower Tainan',
      },
    ],
  },
  {
    id: 'northbound',
    name: '牛車北上採硫',
    subtitle: '1697 四月初七—十月 府城—竹塹—淡水—北投',
    description: '四月初七日率眾五十五人乘黃犢車出府城，二十天縱貫西部平原：歷西拉雅四大社、渡濁水溪三分流、阻雨牛罵社、越大甲溪後「番社皆空室」，竹塹迄南嵌八九十里「不見一人一屋」。四月二十七日乘莽葛渡淡水河抵淡水社，溯河過甘答門見「康熙台北湖」，五月起於北投勘硫煉硫，親探硫穴留下台灣文學史最著名的地熱描寫。十月工竣返棹福州。',
    color: '#92400e',
    center: [24.15, 120.75],
    zoom: 8,
    overlay: { id: 'jm200k_1897', opacity: 0.5 },
    music: '../music/voller-hoffnung.mp3',
    spots: [
      {
        title: '麻豆社（西拉雅四大社）',
        latlng: [23.1817, 120.248],
        historical_refs: ['郁永河《裨海紀遊》卷中', 'THCTS 郁永河路線圖'],
        desc: `四月初七日出府城，乘黃犢車北渡大洲溪，首日歷新港社、嘉溜灣社至麻豆社。郁永河記西拉雅四大社「雖皆番居，然嘉木陰森，屋宇完潔，不減內地村落」——新港、嘉溜灣、歐王、麻豆受荷蘭時期教化與明鄭屯墾影響較深，是十七世紀末南台灣平埔聚落的珍貴速寫。

學者引用：《裨海紀遊》卷中；THCTS 路線圖（新港—嘉溜灣—麻豆段社址考證）。`,
        photo_query: '麻豆 台南|Madou Tainan',
      },
      {
        title: '諸羅山社（今嘉義）',
        latlng: [23.4801, 120.4491],
        historical_refs: ['郁永河《裨海紀遊》卷中'],
        desc: `夜渡急水溪、八掌溪抵諸羅山社（今嘉義市）。諸羅縣於 1684 年設縣，但郁永河過境時縣署仍寄治府城佳里興，諸羅山一帶只是番社與零星漢墾；1704 年縣治才實際移駐，1787 年林爽文事變後改名嘉義。文獻中的行政建置與實際聚落面貌的落差，正是歷史 GIS 還原的重要素材。

學者引用：《裨海紀遊》卷中；諸羅建縣沿革見《諸羅縣志》（1717）。`,
        photo_query: '嘉義市|Chiayi city Taiwan',
      },
      {
        title: '半線社（今彰化）',
        latlng: [24.0809, 120.5387],
        historical_refs: ['郁永河《裨海紀遊》卷中', 'THCTS 郁永河路線圖'],
        desc: `經打貓（民雄）、他里霧（斗南）、柴里（斗六）諸社，連渡虎尾溪、西螺溪、東螺溪——皆濁水溪下游分流，水濁流急，牛車涉渡屢陷，是縱貫行程中最艱險的渡溪段。過大武郡社後抵半線社（今彰化市）。濁水溪分流的擺盪改道，日後成為清代彰化平原開發史的關鍵變因。

學者引用：《裨海紀遊》卷中；THCTS 路線圖（濁水溪三渡段水文考證）。`,
        photo_query: '彰化 八卦山|Changhua Baguashan',
      },
      {
        title: '牛罵社（阻雨望山）',
        latlng: [24.2686, 120.5729],
        historical_refs: ['郁永河《裨海紀遊》卷中'],
        desc: `過啞束、大肚、沙轆諸社至牛罵社（今台中清水），適逢連日豪雨，大甲溪水暴漲，被困社中多日。郁永河在此仰望東方層巒雲氣開合，欲入山一探，社人以內山為野番所居而勸止——這段「望山」文字是漢人文獻中對台灣中部內山最早的凝視之一。牛罵社所在的鰲峰山麓，即日後中部新石器文化命名遺址「牛罵頭遺址」。

學者引用：《裨海紀遊》卷中阻雨紀事。`,
        photo_query: '清水 鰲峰山|Qingshui Taichung',
      },
      {
        title: '渡大甲溪（景觀分界）',
        latlng: [24.4412, 120.6517],
        historical_refs: ['郁永河《裨海紀遊》卷中', 'THCTS 郁永河路線圖'],
        desc: `雨歇水退，眾人涉渡水勢湍悍的大甲溪，經大甲社至宛里社（今苗栗苑裡）。THCTS 路線圖考證指出大甲溪是本次行程鮮明的自然與人文分界：過溪之後「經過番社皆空室，求一勺水不可得」——道卡斯族聚落因官府勞役苛重而人去屋空，沿途景象驟然荒涼，與溪南諸社的完聚形成強烈對比。

學者引用：《裨海紀遊》卷中；THCTS〈郁永河《裨海紀遊》路線圖〉（大甲溪景觀分界之考證）。`,
        photo_query: '大甲溪|Dajia River Taiwan',
      },
      {
        title: '吞霄社（今通霄）',
        latlng: [24.489, 120.6772],
        historical_refs: ['郁永河《裨海紀遊》卷中'],
        desc: `沿海岸沙磧北行至吞霄社（今苗栗通霄），右側即台灣海峽。吞霄為道卡斯族大社；郁永河行後僅兩年（1699），吞霄社便因通事苛虐爆發抗官事變——《裨海紀遊》筆下社民勞役之苦，已是事變的伏筆。此段以海線串起後壠、中港諸社，即今日台鐵海線的雛形廊道。

學者引用：《裨海紀遊》卷中；吞霄社事變見《清實錄》康熙三十八年條。`,
        photo_query: '通霄 苗栗 海岸|Tongxiao Miaoli coast',
      },
      {
        title: '竹塹社（八九十里無人煙）',
        latlng: [24.8039, 120.9647],
        historical_refs: ['郁永河《裨海紀遊》卷中'],
        desc: `過後壠、中港至竹塹社（今新竹市）。自此往北是全書最著名的荒涼描寫：「自竹塹迄南嵌八九十里，不見一人一屋，求一樹就蔭不得」，途中麋、鹿、麏、麚逐隊而行。三百年前的桃竹平原猶是麋鹿成群的莽原——與今日的科技城對讀，時空落差正是故事地圖最動人之處。

學者引用：《裨海紀遊》卷中。`,
        photo_query: '新竹 迎曦門|Hsinchu East Gate',
      },
      {
        title: '南嵌社（非人類所宜至）',
        latlng: [25.053, 121.293],
        historical_refs: ['郁永河《裨海紀遊》卷中'],
        desc: `穿越莽原抵南嵌社（今桃園蘆竹南崁）。郁永河記此段入深箐披荊度莽、冠履俱敗，嘆為「非人類所宜至也」。南嵌社為凱達格蘭族聚落，位居南崁溪口，是縱貫路進入台北盆地前的最後補給點。

學者引用：《裨海紀遊》卷中。`,
        photo_query: '南崁溪 桃園|Nankan river Taoyuan',
      },
      {
        title: '八里坌社（莽葛渡河）',
        latlng: [25.1533, 121.4008],
        historical_refs: ['郁永河《裨海紀遊》卷中', 'THCTS 郁永河路線圖'],
        desc: `沿海岸至八里坌社（今新北八里），觀音山下、淡水河南岸。四月二十七日，郁永河在此乘凱達格蘭族的獨木舟「莽葛」渡淡水河——「艋舺」一詞即源自此類獨木舟的音譯，日後成為台北第一街區之名。二十天、縱貫近四百公里的牛車行至此告一段落。

學者引用：《裨海紀遊》卷中；THCTS 路線圖（八里坌—淡水渡河段）。`,
        photo_query: '八里 觀音山 淡水河|Bali Guanyinshan Tamsui',
      },
      {
        title: '淡水社（四月二十七日抵）',
        latlng: [25.1697, 121.439],
        historical_refs: ['郁永河《裨海紀遊》卷中', '王祿驊等 2011《地圖》21(2)'],
        desc: `四月二十七日抵淡水社，寓居淡水社長張大宅，與海運先到的王雲森及工料會合。淡水此時僅有荷西時期城砦遺跡與零星社寮，距 1858 年開港通商尚有一百六十年。郁永河以此為基地，溯河深入台北盆地勘察硫土產地。

學者引用：《裨海紀遊》卷中；王祿驊等 2011（淡水段考證）。`,
        photo_query: '淡水 紅毛城|Tamsui Fort San Domingo',
      },
      {
        title: '甘答門與康熙台北湖',
        latlng: [25.1178, 121.4664],
        historical_refs: ['郁永河《裨海紀遊》卷中'],
        desc: `乘莽葛溯淡水河，「前望兩山夾峙處，曰甘答門，水道甚隘，入門，水忽廣，漶為大湖」（甘答門即今關渡）。郁永河並記麻少翁等三社因康熙三十三年（1694）大地震「陷為大湖」——此即「康熙台北湖」公案的核心史料：台北盆地當時是否真為一片鹹水大湖（地震陷落說），或僅是感潮氾濫的誇大記述（翁佳音等學者的質疑說），至今仍是台灣歷史地理學最著名的辯題，也是古文獻與 GIS、地質資料互證的經典案例。

學者引用：《裨海紀遊》卷中；康熙台北湖論辯（地震陷落說 vs 翁佳音質疑說）。`,
        photo_query: '關渡 淡水河|Guandu Taipei river',
      },
      {
        title: '北投硫穴（採硫工竣）',
        latlng: [25.14, 121.507],
        historical_refs: ['郁永河《裨海紀遊》卷中、卷下', '王祿驊等 2011《地圖》21(2)'],
        desc: `五月起於北投勘硫煉硫，向平埔社人以布易硫土，架鑊提煉。親探硫穴（今龍鳳谷—硫磺谷一帶）留下台灣文學史最著名的地熱描寫：「白氣五十餘道，皆從地底騰激而出，沸珠噴濺，出地尺許」，聞怒雷震盪地底、地熱如炙，並賦詩「造化鍾奇構，崇岡湧沸泉」。歷五月瘴癘風災、僕役病歿殆盡之苦，十月工竣，自淡水放洋返棹福州，往返近一年。

學者引用：《裨海紀遊》卷中硫穴紀事、卷下番境補遺；王祿驊、李玉亭、范毅軍、廖泫銘、白璧玲〈《裨海記遊》歷史考證與 GIS 整合應用〉《地圖》21(2): 23-26, 2011。`,
        photo_query: '硫磺谷 北投|Beitou sulfur valley geothermal',
      },
    ],
  },
];

const COVER_HTML_SPEC = {
  title: '郁永河裨海紀遊',
  subtitle: '康熙採硫紀行 福州—府城—北投',
  badge: 'AD 1697',
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
    name: `郁永河裨海紀遊 — ${seg.name}`,
    center: seg.center,
    zoom: seg.zoom,
    basemapId: 'voyager',
    overlay: seg.overlay,
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

console.log(`Building stories/yu-yonghe/ — ${SEGMENTS.length} segments / ${SEGMENTS.reduce((n, s) => n + s.spots.length, 0)} spots`);

for (const seg of SEGMENTS) {
  await buildSegment(seg, credits, failed);
}

console.log(`\n  cover: generating TrailPaint placeholder...`);
for (const [name, w, h] of [['cover', 1080, 1080], ['og', 1200, 630], ['crossing-thumb', 400, 400], ['northbound-thumb', 400, 400]]) {
  const htmlPath = join(TMP, `${name}.html`);
  const pngPath = join(TMP, `${name}.png`);
  const spec = name === 'crossing-thumb'
    ? { title: '渡海來台', subtitle: '福州—澎湖—鹿耳門', badge: '1697 正月—二月' }
    : name === 'northbound-thumb'
      ? { title: '牛車北上採硫', subtitle: '府城—竹塹—北投', badge: '1697 四月—十月' }
      : COVER_HTML_SPEC;
  writeFileSync(htmlPath, makeCoverHtml(spec, w, h));
  await runChrome([
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w},${h}`,
    `--screenshot=${pngPath}`,
    `file://${htmlPath}`,
  ]);
  await runSips(['-s', 'format', 'jpeg', '-s', 'formatOptions', name.endsWith('-thumb') ? '78' : '85',
    pngPath, '--out', join(STORY_DIR, `${name}.jpg`)]);
  console.log(`    ✓ ${name}.jpg (${w}×${h})`);
}

const storyJson = {
  id: 'yu-yonghe',
  title: '郁永河裨海紀遊',
  subtitle: 'AD 1697 康熙採硫紀行 — 從福州到北投',
  description: '康熙三十六年（1697）郁永河為賠補福州焚毀的火藥硫磺，渡黑水溝赴台採硫：二月二十五日鹿耳門登岸，四月初七乘牛車自府城北上，二十天縱貫西部平原諸番社，四月二十七日抵淡水，五月起於北投勘硫煉硫，十月工竣返棹。《裨海紀遊》是清初台灣地理、族群與生態最重要的第一手見聞錄。路線對齊中研院 THCTS〈郁永河《裨海紀遊》路線圖〉與王祿驊、李玉亭、范毅軍、廖泫銘、白璧玲 2011〈《裨海記遊》歷史考證與 GIS 整合應用〉（《地圖》21(2)）之考證；歷史底圖採中研院 CCTS 清代 1820 與臺灣百年歷史地圖 1897 日治二十萬分一圖。',
  locale: 'zh-TW',
  cover: 'cover.jpg',
  music: {
    src: '../music/voller-hoffnung.mp3',
    title: 'Voller Hoffnung — Ronny Matthes',
    credit: 'Ronny Matthes (Jamendo / Internet Archive)',
    license: 'CC',
  },
  og: {
    title: '郁永河裨海紀遊 — TrailPaint Stories',
    description: '互動地圖：1697 康熙採硫之旅，福州渡黑水溝、牛車縱貫西台灣到北投硫穴，17 spots 對齊中研院 THCTS 路線考證，疊清代 1820 與日治 1897 歷史地圖',
    image: 'og.jpg',
  },
  stories: SEGMENTS.map((seg) => ({
    id: seg.id,
    title: seg.name,
    subtitle: seg.subtitle,
    description: seg.description,
    data: `${seg.id}.trailpaint.json`,
    thumbnail: `${seg.id}-thumb.jpg`,
    color: seg.color,
    music: seg.music,
  })),
  footer: {
    cta: '在 TrailPaint 中建立你自己的故事地圖',
    url: 'https://trailpaint.org/app/',
  },
};
await writeFile(join(STORY_DIR, 'story.json'), JSON.stringify(storyJson, null, 2));

const lines = [
  '# 郁永河裨海紀遊 — 圖片來源與授權',
  '',
  '本故事為 **非營利個人學術展示** 使用。所有 spot 圖片來自 Wikimedia Commons，按各檔案 PD 或 CC BY/CC BY-SA 授權使用。Cover/og/thumb 為 TrailPaint 程式生成 placeholder。',
  '',
  `生成日期：${new Date().toISOString().slice(0, 10)}`,
  '',
  '---',
  '',
  '## 封面 / OG / Thumb',
  '',
  'cover.jpg / og.jpg / crossing-thumb.jpg / northbound-thumb.jpg 為 TrailPaint 程式生成 placeholder。腳本：`online/scripts/archive/build-yu-yonghe.mjs`。',
  '',
  '## Spot 照片',
  '',
  '| Segment | # | Spot | 作者 | 授權 | 來源 |',
  '|---|---|---|---|---|---|',
];
for (const c of credits.filter((x) => x.section === 'spot')) {
  lines.push(`| ${c.seg} | ${c.num} | ${c.title} | ${c.meta.author} | ${c.meta.license} | [Commons File](${c.meta.sourceUrl}) |`);
}
lines.push('');
lines.push('## 路線考證參考');
lines.push('');
lines.push('- 郁永河《裨海紀遊》（1697；臺灣文獻叢刊本）');
lines.push('- 王祿驊、李玉亭、范毅軍、廖泫銘、白璧玲，2011，〈《裨海記遊》歷史考證與 GIS 整合應用〉，《地圖》21(2): 23-26');
lines.push('- 中研院人社中心 THCTS〈郁永河《裨海紀遊》路線圖〉（https://thcts.sinica.edu.tw/themes/rc14.php）');
lines.push('- 歷史底圖：中研院 CCTS 清代 1820 + 臺灣百年歷史地圖 JM200K 1897（中央研究院人社中心 GIS 專題中心）');
lines.push('');
lines.push('備註：1697 年無同時代可用圖磚，渡海段採 CCTS 清嘉慶 1820 圖、台灣段採日治 1897 二十萬分一圖為「最接近的歷史底圖」；社址今地名對照以 THCTS 考證為準。');
await writeFile(join(STORY_DIR, 'CREDITS.md'), lines.join('\n'));

console.log(`\n${'═'.repeat(60)}`);
const okCount = credits.filter((c) => c.section === 'spot').length;
const total = SEGMENTS.reduce((n, s) => n + s.spots.length, 0);
console.log(`✅ ${total} spots, ${okCount} photos ok, ${failed.length} failed`);
if (failed.length) {
  console.log(`\n⚠️  Failed:`);
  for (const f of failed) console.log(`   ${f.seg}/${f.num}  ${f.query}  ${f.err || ''}`);
}
console.log(`\nOutput: ${STORY_DIR}`);
