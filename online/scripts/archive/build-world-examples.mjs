#!/usr/bin/env node
/**
 * ═════════════════════════════════════════════════════════════════
 * ⚠ ARCHIVED (2026-04-21): DO NOT RE-RUN.
 *
 * This builder originally wrote 3 world-history examples into
 *   online/src/data/examples/{保羅第一次宣教旅行,玄奘西行取經,鄭和第七次下西洋}.trailpaint.json
 *
 * Those files have been promoted to stories/{paul,xuanzang,zheng-he}/
 * by Phase 1 (build-phase1-stories.mjs) and Phase 3 (build-phase3-regroup.mjs).
 * Re-running this script would resurrect ZOMBIE example files that are no
 * longer registered in sampleProject.ts EXAMPLE_ROUTES. Kept for historical
 * reference only — not part of the current build chain.
 *
 * Stored alongside its successor scripts (build-phase2-stories.mjs,
 * build-phase3-regroup.mjs, patch-missing-photos.mjs) for the Phase 2+ flows.
 * ═════════════════════════════════════════════════════════════════
 */

// Refuse to run. Comment out this block only if you know what you're doing.
console.error('⛔ build-world-examples.mjs is ARCHIVED — see the header comment. Exiting.');
process.exit(1);

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = '/tmp/tp-world-images';
const OUT_DIR = join(__dirname, '..', 'src', 'data', 'examples');
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) curl';
const DEFAULT_CARD_OFFSET = { x: 0, y: -60 };

await mkdir(TMP, { recursive: true });

async function runSips(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`sips exit ${code}`))));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function curlDownload(url, dest) {
  return new Promise((resolve, reject) => {
    const p = spawn('curl', ['-sSL', '--max-time', '60', '-A', UA, '-o', dest, '-w', '%{http_code}', url], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let code = '';
    p.stdout.on('data', (d) => (code += d.toString()));
    p.on('close', (exit) => {
      if (exit !== 0) return reject(new Error(`curl exit ${exit}`));
      resolve(code.trim());
    });
  });
}

async function fetchWithRetry(url, id, dest) {
  const backoffs = [10000, 30000, 60000];
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    const code = await curlDownload(url, dest);
    if (code.startsWith('2')) return;
    if ((code === '429' || code.startsWith('5')) && attempt < backoffs.length) {
      const wait = backoffs[attempt];
      process.stdout.write(`[${code}, wait ${wait / 1000}s] `);
      await sleep(wait);
      continue;
    }
    throw new Error(`fetch ${id}: HTTP ${code}`);
  }
  throw new Error(`fetch ${id}: exhausted retries`);
}

async function fetchAndCompress(id, url) {
  const raw = join(TMP, `${id}.raw`);
  const out = join(TMP, `${id}.jpg`);
  if (!existsSync(out)) {
    process.stdout.write(`  fetching ${id}... `);
    await fetchWithRetry(url, id, raw);
    await runSips(['-Z', '900', '-s', 'format', 'jpeg', '-s', 'formatOptions', '65', raw, '--out', out]);
    process.stdout.write('ok\n');
    await sleep(2500); // gentle to Wikimedia
  }
  const jpg = await readFile(out);
  const sizeKB = Math.round(jpg.length / 1024);
  return { dataUrl: `data:image/jpeg;base64,${jpg.toString('base64')}`, sizeKB };
}

function buildSpot(idx, stop, photoDataUrl) {
  const s = {
    id: `s${idx + 1}`,
    num: idx + 1,
    latlng: stop.latlng,
    title: stop.title,
    desc: stop.desc + (stop.photo_credit ? `\n\n📷 ${stop.photo_credit}` : ''),
    photo: photoDataUrl,
    iconId: 'pin',
    cardOffset: DEFAULT_CARD_OFFSET,
  };
  if (stop.scripture_refs && stop.scripture_refs.length > 0) {
    s.scripture_refs = stop.scripture_refs;
  }
  return s;
}

function buildProject({ name, center, zoom, overlay, color }, spotsWithPhotos) {
  return {
    version: 4,
    name,
    center,
    zoom,
    basemapId: 'voyager',
    spots: spotsWithPhotos,
    routes: [
      {
        id: 'r1',
        name,
        color,
        pts: spotsWithPhotos.map((s) => s.latlng),
        elevations: null,
      },
    ],
    overlay: { id: overlay, opacity: 0.6 },
  };
}

// ───────── DATA ─────────

const PAUL = {
  idPrefix: 'paul',
  file: '保羅第一次宣教旅行',
  overlay: 'rome_200',
  center: [35.8, 34.5],
  zoom: 6,
  color: 'red',
  stops: [
    { title: '敘利亞安提阿 (Antioch on the Orontes)', latlng: [36.20124, 36.16067],
      desc: '起點。聖靈差遣保羅和巴拿巴從這裡出發（徒13:1-3）。安提阿是當時羅馬帝國第三大城，門徒首次被稱為「基督徒」之處（徒11:26）。旅程結束後他們也回到此地向教會述職（徒14:26-28）。',
      scripture_refs: ['Acts 13:1-3', 'Acts 14:26-28', 'Acts 11:26'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Antioch_in_Syria_engraving_by_William_Miller_after_H_Warren.jpg',
      photo_credit: 'William Miller（依 H. Warren 原畫）, Antioch in Syria, 19 世紀銅版畫（PD）' },
    { title: '西流基 (Seleucia Pieria)', latlng: [36.12139, 35.92583],
      desc: '安提阿的外港，保羅一行在此登船前往居比路（徒13:4）。今土耳其 Samandağ 附近仍留有羅馬時代的 Vespasianus–Titus 水道隧道遺跡。',
      scripture_refs: ['Acts 13:4'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7f/Vespasianus_Titus_Tunnel%2C_an_ancient_water_tunnel_built_in_the_1st_century_AD_during_the_reign_of_the_Roman_emperor_Vespasianus_within_the_boundaries_of_Seleucia_Pieria_%28Samandag%29%2C_Turkey_%2835932922190%29.jpg',
      photo_credit: 'Carole Raddato, Vespasianus Titus Tunnel, Seleucia Pieria, 2017 (CC BY-SA 2.0)' },
    { title: '撒拉米 (Salamis)', latlng: [35.18278, 33.90056],
      desc: '船抵居比路東岸撒拉米，保羅和巴拿巴在此進入猶太會堂傳講神的道，有約翰（馬可）作幫手（徒13:5）。今法馬古斯塔近郊遺址仍有羅馬體育場和巴西利卡。',
      scripture_refs: ['Acts 13:5'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Basilica_ruins_in_Salamis%2C_Cyprus.jpg',
      photo_credit: 'A.Savin, Basilica ruins in Salamis, Cyprus (CC BY 2.0)' },
    { title: '帕弗 (Paphos)', latlng: [34.75722, 32.40639],
      desc: '走遍全島抵達西岸首府帕弗。保羅叱責行法術的巴耶穌（以呂馬），使他暫時瞎眼，方伯士求保羅因而信主（徒13:6-12）。此站起保羅由「掃羅」改稱「保羅」。',
      scripture_refs: ['Acts 13:6-12'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/V%26A_-_Raphael%2C_The_Conversion_of_the_Proconsul_%281515%29.jpg',
      photo_credit: 'Raphael, The Conversion of the Proconsul (Blinding of Elymas), 1515 (PD, V&A)' },
    { title: '別加 (Perga)', latlng: [36.96167, 30.85472],
      desc: '離開居比路，抵達旁非利亞的別加。約翰（馬可）在此離隊返回耶路撒冷，成為日後保羅與巴拿巴爭論的導火線（徒13:13；徒15:37-39）。',
      scripture_refs: ['Acts 13:13', 'Acts 14:25'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Ruins_at_Perge.jpg',
      photo_credit: 'Sinan Şahin, Ruins at Perge (CC BY-SA 4.0)' },
    { title: '彼西底的安提阿 (Pisidian Antioch)', latlng: [38.30528, 31.19083],
      desc: '保羅在此會堂的講道是使徒行傳中最長的一次（徒13:16-41），引發外邦人踴躍歸主。猶太人挑撥逼迫，保羅與巴拿巴跺下腳上塵土離去（徒13:50-51）。遺址位於今土耳其 Yalvaç。',
      scripture_refs: ['Acts 13:14-52'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Antioch_of_Pisidia_2862.jpg',
      photo_credit: 'Dosseman, Antioch of Pisidia ruins (CC BY-SA 4.0)' },
    { title: '以哥念 (Iconium)', latlng: [37.87139, 32.48472],
      desc: '保羅與巴拿巴在會堂放膽講道，有許多猶太人和希臘人信了主，但城裡眾人分為兩派。得知將被石頭打時他們逃往路司得（徒14:1-6）。今土耳其 Konya 城。',
      scripture_refs: ['Acts 14:1-6'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/76/El_Greco_-_St._Paul_-_Google_Art_Project.jpg',
      photo_credit: 'El Greco, Saint Paul, c.1608-14 (PD, Museo del Greco, Toledo)' },
    { title: '路司得 (Lystra)', latlng: [37.58028, 32.45194],
      desc: '保羅醫好生來瘸腿的人，眾人以為是丟斯、希耳米下凡要獻祭（徒14:8-18）。隨後安提阿、以哥念的猶太人趕來煽動，用石頭打保羅，拖出城外以為他已死（徒14:19）。少年提摩太的家鄉。',
      scripture_refs: ['Acts 14:8-20', 'Acts 16:1-3'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/V%26A_-_Raphael%2C_The_Sacrifice_at_Lystra_%281515%29.jpg',
      photo_credit: 'Raphael, The Sacrifice at Lystra, 1515 (PD, V&A)' },
    { title: '特庇 (Derbe)', latlng: [37.35000, 33.33333],
      desc: '東行抵達南加拉太最遠一站特庇，在此傳福音並使好些人作門徒（徒14:20-21）。之後決意循原路折返堅固各地門徒，而非取道最近的陸路回敘利亞。',
      scripture_refs: ['Acts 14:20-21'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/DAVIS%281879%29_p329_SITE_OF_DERBE%2C_KARAJH_DAGH_MOUNTAINS_IN_THE_DISTANCE.jpg',
      photo_credit: 'E.J. Davis, Site of Derbe, Karajh Dagh Mountains, 1879 (PD)' },
    { title: '亞大利 (Attalia)', latlng: [36.88444, 30.70556],
      desc: '回程經別加，再下到港口亞大利搭船返敘利亞（徒14:25-26）。今土耳其 Antalya 舊城 Kaleiçi 仍保存羅馬時期哈德良門，是保羅當年可能經過的港口城門。',
      scripture_refs: ['Acts 14:25-26'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Hadrian%27s_Gate%2C_Antalya_06.jpg',
      photo_credit: "Bernard Gagnon, Hadrian's Gate, Antalya (CC BY-SA 3.0)" },
    { title: '返抵敘利亞安提阿 (Return to Antioch)', latlng: [36.20124, 36.16067],
      desc: '船抵安提阿，聚集教會述說神藉他們所行的一切事，並神怎樣為外邦人開了信道的門（徒14:27-28）。他們在此同門徒住了多日，為第二次旅行與耶路撒冷會議（徒15）埋下伏筆。',
      scripture_refs: ['Acts 14:27-28', 'Acts 15:1-2'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/W-H-Bartlett-Rovine_di_Antiochia.jpg',
      photo_credit: 'W.H. Bartlett, Rovine di Antiochia, 19 世紀版畫 (PD)' },
  ],
};

const XUANZANG = {
  idPrefix: 'xuanzang',
  file: '玄奘西行取經',
  overlay: 'tang_741',
  center: [39.5, 76.0],
  zoom: 4,
  color: 'orange',
  stops: [
    { title: "長安 (Chang'an, 西安)", latlng: [34.21966, 108.95936],
      desc: '貞觀三年（629），玄奘於長安結同伴上表請西行求法，遭朝廷駁回；遂私自出關。返國後於大慈恩寺譯經十九年，高宗永徽三年建大雁塔以藏梵夾。大慈恩寺為玄奘事業大本營。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Giant_Wild_Goose_Pagoda.jpg',
      photo_credit: '大雁塔（西安慈恩寺），Alex Kwok (CC BY-SA 3.0)' },
    { title: '涼州 (Liangzhou, 武威)', latlng: [37.92830, 102.64199],
      desc: '河西走廊第一重鎮，玄奘於此開講《涅槃》《攝論》《般若》，聲名遠播。唐律禁邊，涼州都督李大亮奉敕查禁西行，僧慧威命弟子夜送玄奘出城潛行。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Tiantishan_Grotto_Budda.jpg',
      photo_credit: '天梯山石窟佛像（涼州）(CC BY-SA)' },
    { title: '瓜州 (Guazhou)', latlng: [40.52111, 95.83370],
      desc: '滯留月餘，訪得胡人石槃陀為嚮導，並購瘦老赤馬。瓜州刺史獨孤達暗中資助。鄰近榆林窟藏唐代壁畫，為玄奘經行時代之佛教視覺遺存。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Yulin_Cave_25_w_wall_Manjusri_%28Tang%29.jpg',
      photo_credit: '榆林窟第 25 窟 文殊變（唐），瓜州縣 (PD)' },
    { title: '玉門關 (Yumen Pass)', latlng: [40.35861, 93.86333],
      desc: '夜渡葫蘆河，避五烽而過。第四烽校尉王祥欲射，聞玄奘誓死求法而放行並贈水囊。過關後入莫賀延磧（今哈順戈壁），八百里無水，誤覆皮囊瀕死，默念觀音第五日得泉。此為全程最險關。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Yumenguan.jpg',
      photo_credit: '玉門關小方盤城遺址 (CC BY-SA)' },
    { title: '伊吾 (Yiwu, 哈密 Hami)', latlng: [42.82995, 93.51316],
      desc: '脫磧後抵伊吾，漢僧老淚縱橫相迎。西突厥屬國，初為唐羈縻。玄奘原擬北循可汗浮圖路，聞高昌王麴文泰遣使強邀，只得南折入高昌。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Military_Governor_of_the_Town_of_Hami%2C_Xinjiang%2C_1875_WDL1906.png',
      photo_credit: '哈密城軍政長官，1875 俄國使團 Boiarskii 攝 (WDL/PD)' },
    { title: '高昌 (Gaochang)', latlng: [42.85139, 89.52889],
      desc: '麴文泰敬信佛法，留玄奘欲拜為國師。玄奘絕食三日以死抗拒，王改執弟子禮，結為兄弟，資給西行盤纏、從者三十、信二十四封遞達沿途諸國。此為《西遊記》「唐王結拜御弟」原型。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/%E9%AB%98%E6%98%8C%E5%8F%A4%E5%9F%8E.jpg',
      photo_credit: '高昌故城遺址（吐魯番）(CC BY-SA)' },
    { title: '龜茲 (Kucha, 庫車)', latlng: [41.71667, 82.93333],
      desc: '小乘說一切有部重鎮，國王、僧正木叉毱多出迎。玄奘與毱多辯《俱舍》《攝論》屢勝，停留六十餘日待雪化越凌山。鄰近克孜爾千佛洞為同期佛教美術中心。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Scene_of_Hell%2C_Cave_of_the_Devils%2C_Kizil_Caves%2C_circa_600_CE.jpg',
      photo_credit: '克孜爾石窟地獄圖，約 600 CE (PD)' },
    { title: '凌山 (Bedel Pass, 天山越)', latlng: [41.90000, 78.43000],
      desc: '由龜茲西北越天山凌山（今別迭里達坂）。《大唐西域記》卷一：「凌山者，即蔥嶺之北隅也，山谷積雪，春夏合凍。」凍死徒眾十之三四，牛馬過半。下山抵大清池（伊塞克湖），與西突厥統葉護可汗相會於素葉水城。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Bezeklik_caves%2C_Pranidhi_scene_14%2C_temple_9.JPG',
      photo_credit: '柏孜克里克千佛洞誓願圖（唐絲路胡人供養人）(PD)' },
    { title: '颯秣建 (Samarkand)', latlng: [39.65417, 66.95972],
      desc: '粟特重鎮，拜火教盛行而僧寺荒廢。玄奘面陳康國王，感化其奉佛，允修二伽藍、度沙門。今阿弗拉西阿卜丘（Afrasiab）出土「使者圖」壁畫（約 650 CE）正繪此期宮廷景象。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/db/Afrasiab_-_details_from_The_Ambassadors%27_Painting.JPG',
      photo_credit: "阿弗拉西阿卜使者圖細部，約 650 CE，撒馬爾罕 (PD)" },
    { title: '縛喝羅 (Balkh, 阿富汗)', latlng: [36.75500, 66.89750],
      desc: '吐火羅故地，號小王舍城，伽藍百餘、僧徒三千。玄奘於此遇小乘大德般若羯羅，共研《毘婆沙論》月餘。南行越大雪山（興都庫什），經梵衍那國，禮其摩崖大佛（即 2001 被毀之巴米揚大佛）。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Xuanzang_returned_from_India._Dunhuang_mural%2C_Cave_103._High_Tang_period_%28712-765%29..jpg',
      photo_credit: '敦煌莫高窟第 103 窟 玄奘取經圖（盛唐）(PD)' },
    { title: '那爛陀寺 (Nālandā)', latlng: [25.13639, 85.44389],
      desc: '摩揭陀國首剎，僧眾萬人。戒賢正法藏（Śīlabhadra）年逾百歲，為玄奘開講《瑜伽師地論》十五月。玄奘留學五年，兼通因明、聲明，升為十德之一。今存紅磚僧院與大塔遺址。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Nalanda_University_ruins.JPG',
      photo_credit: '那爛陀寺遺址（比哈爾邦）(CC BY-SA 3.0)' },
  ],
};

const ZHENGHE = {
  idPrefix: 'zhenghe',
  file: '鄭和第七次下西洋',
  overlay: 'ming_1582',
  center: [12.0, 88.0],
  zoom: 4,
  color: 'blue',
  stops: [
    { title: '南京龍江寶船廠 (Longjiang Shipyard, Nanjing)', latlng: [32.10361, 118.72528],
      desc: '宣德五年六月詔下後，龍江寶船廠為第七次下西洋整備大䌈二百餘艘，其中九桅寶船居首。鄭和於此總領船工、徵募官兵二萬七千五百餘員，為明代最末一次西洋遠航奠基。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Portrait_of_Zheng_He%2C_published_about_1600.jpg',
      photo_credit: '鄭和像，約 1600 年刊本 (PD)' },
    { title: '太倉劉家港 (Liujiagang, Taicang)', latlng: [31.49278, 121.21806],
      desc: '宣德六年春，船隊集結於長江口太倉劉家港候風；鄭和於此重建天妃宮並立《通番事蹟碑》，追述前六次航程、祈求第七次平安。這是歷次下西洋傳統的啟碇錨地。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Treasure_Boat_Shipyard_-_stele_pavilion_-_Liujiagang_stele_-_P1080101.JPG',
      photo_credit: '劉家港通番事蹟碑（鄭和 1431 年立）(CC BY-SA)' },
    { title: '福建長樂太平港 (Changle Taiping Harbour)', latlng: [25.96250, 119.52361],
      desc: '宣德六年冬，船隊南下駐泊長樂太平港候東北季風。鄭和於南山重修天妃宮並立《天妃靈應之記》碑，翌年正月祭畢開洋，這是寶船隊最後一次從中國本土出洋。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Zheng_He%27s_visits_to_the_West_on_the_book_%22Heavenly_Princess_Classics%22_1420.jpg',
      photo_credit: '《天妃經》1420 版寶船卷首圖 (PD)' },
    { title: '占城新州港 (Champa, Qui Nhon)', latlng: [13.76667, 109.21667],
      desc: '宣德七年正月船隊抵占城新州港，占城王遣使奉金葉表、象牙犀角朝貢。此為船隊渡南海後首個外邦停靠站，亦是歷次下西洋必經之地。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Mao_Kun_map_-_Sumatra_%26_Thailand.JPG',
      photo_credit: '鄭和航海圖．蘇門答臘暹羅段（武備志 1628 茅坤本）(PD)' },
    { title: '滿剌加 (Malacca)', latlng: [2.19583, 102.24861],
      desc: '二月抵滿剌加，在此設立官廠囤積貨物、修理船舶，作為西洋航段的中繼總站。滿剌加王室因明廷冊封脫離暹羅桎梏，一向對寶船隊最為親附。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Mao_Kun_map_-_Malacca.png',
      photo_credit: '鄭和航海圖．滿剌加段（武備志 1628）(PD)' },
    { title: '蘇門答剌 (Samudera Pasai, Sumatra)', latlng: [5.17917, 97.07500],
      desc: '六月船隊抵蘇門答剌北岸，為進入印度洋前最後的補給與分艦點。鄭和在此遣副使洪保率分艦隊遠赴天方（麥加），主力船隊則續航錫蘭、古里。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/78/ShenDuGiraffePainting.jpg',
      photo_credit: '沈度《瑞應麒麟圖》，永樂十二年（1414）麻林進貢 (PD)' },
    { title: '錫蘭山別羅里 (Ceylon / Galle)', latlng: [6.02680, 80.21700],
      desc: '船隊循印度洋西航至錫蘭山南岸的別羅里港。此處為鄭和第二次下西洋時所立《布施錫蘭山佛寺碑》的故地，漢、泰米爾、波斯三語並列，見證寶船隊宗教並祀之風。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Mao_Kun_map_-_Ceylon%2C_Africa.png',
      photo_credit: '鄭和航海圖．錫蘭與非洲段（武備志 1628）(PD)' },
    { title: '古里 (Calicut, modern Kozhikode)', latlng: [11.25880, 75.78040],
      desc: '古里為歷次下西洋的西洋總會，也是鄭和最鍾愛的海外據點。宣德八年（1433）三月，鄭和在此次回航途中卒於古里，享年六十二；王景弘代領船隊扶柩東返，衣冠葬於南京牛首山。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Mao_Kun_map_-_India%2C_Africa.JPG',
      photo_credit: '鄭和航海圖．印度與非洲段（武備志 1628）(PD)' },
    { title: '忽魯謨斯 (Hormuz)', latlng: [27.09444, 56.45306],
      desc: '寶船主隊續航至波斯灣口的忽魯謨斯，此為第七次下西洋主力艦隊的最西停靠。忽魯謨斯王遣使隨船回朝，獻獅子、麒麟、西馬、金錢豹等奇獸珍寶。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/91/Traced_and_restored_map_illustration_from_%22Tian_Fei_Jing%22_first_volume_of_Zheng_He%27s_voyages_to_the_West.jpg',
      photo_credit: '《天妃經》卷首鄭和下西洋圖（1420 年版摹本）(PD)' },
    { title: '天方 (Mecca, via Jeddah)', latlng: [21.42250, 39.82620],
      desc: '洪保率分艦隊自蘇門答剌西渡，經阿丹入紅海抵天方；七人小隊陸行朝覲麥加，購麒麟、獅子、駝雞東返，為鄭和船隊足跡所至最西的點。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/78/ShenDuGiraffePainting.jpg',
      photo_credit: '沈度《瑞應麒麟圖》(PD，代表分艦隊遠取異獸)' },
    { title: '麻林地 (Malindi, Kenya)', latlng: [-3.21750, 40.11670],
      desc: '鄭和船隊在歷次航行中最遠抵達東非麻林地；麻林國於永樂十三年獻麒麟（長頸鹿），翰林沈度繪《瑞應麒麟圖》以紀。第七次航程仍派分艦巡歷非洲東岸，維繫朝貢體系。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Mao_Kun_map_-_Ceylon%2C_Africa.png',
      photo_credit: '鄭和航海圖．非洲段（武備志 1628）(PD，同錫蘭段切片)' },
  ],
};

// ───────── PIPELINE ─────────

const ROUTES = [PAUL, XUANZANG, ZHENGHE];

for (const r of ROUTES) {
  console.log(`\n== ${r.file} (${r.stops.length} stops) ==`);
  const spotsWithPhotos = [];
  let totalKB = 0;
  for (let i = 0; i < r.stops.length; i++) {
    const { dataUrl, sizeKB } = await fetchAndCompress(`${r.idPrefix}_${i}`, r.stops[i].photo_url);
    totalKB += sizeKB;
    spotsWithPhotos.push(buildSpot(i, r.stops[i], dataUrl));
  }
  console.log(`  photos total: ${totalKB} KB`);
  const project = buildProject(
    { name: r.file, center: r.center, zoom: r.zoom, overlay: r.overlay, color: r.color },
    spotsWithPhotos,
  );
  const dest = join(OUT_DIR, `${r.file}.trailpaint.json`);
  await writeFile(dest, JSON.stringify(project, null, 2));
  const bytes = Buffer.byteLength(JSON.stringify(project));
  console.log(`  wrote ${dest} (${Math.round(bytes / 1024)} KB)`);
}

console.log('\nDone. Remember to update sampleProject.ts to register the new examples.');
