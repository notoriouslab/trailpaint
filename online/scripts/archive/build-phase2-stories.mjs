#!/usr/bin/env node
/**
 * Phase 2: build 4 new world-history stories (44 stops total).
 * Fetch PD images → sips compress → base64 inline → emit .trailpaint.json
 * into stories/bible + stories/china, write thumb, patch catalog + story.json.
 *
 * Run: node online/scripts/build-phase2-stories.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const STORIES = join(ROOT, 'stories');
const TMP = '/tmp/tp-world-images';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) curl';
const DEFAULT_CARD_OFFSET = { x: 0, y: -60 };

await mkdir(TMP, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSips(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`sips ${c}`))));
  });
}

async function curlDownload(url, dest) {
  return new Promise((resolve, reject) => {
    const p = spawn('curl', ['-sSL', '--max-time', '60', '-A', UA, '-o', dest, '-w', '%{http_code}', url], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let code = '';
    p.stdout.on('data', (d) => (code += d.toString()));
    p.on('close', (x) => (x !== 0 ? reject(new Error(`curl ${x}`)) : resolve(code.trim())));
  });
}

const FAILED = [];

async function fetchWithRetry(url, id, dest) {
  const backoffs = [10000, 30000, 60000];
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    const code = await curlDownload(url, dest);
    if (code.startsWith('2')) return 'ok';
    if (code === '404') return '404';
    if ((code === '429' || code.startsWith('5')) && attempt < backoffs.length) {
      const wait = backoffs[attempt];
      process.stdout.write(`[${code}, wait ${wait / 1000}s] `);
      await sleep(wait);
      continue;
    }
    return `fail_${code}`;
  }
  return 'exhausted';
}

async function fetchAndCompress(id, url) {
  const raw = join(TMP, `${id}.raw`);
  const out = join(TMP, `${id}.jpg`);
  if (!existsSync(out)) {
    process.stdout.write(`  ${id}... `);
    const result = await fetchWithRetry(url, id, raw);
    if (result !== 'ok') {
      process.stdout.write(`[${result}] SKIP\n`);
      FAILED.push({ id, url, result });
      return null;
    }
    await runSips(['-Z', '900', '-s', 'format', 'jpeg', '-s', 'formatOptions', '65', raw, '--out', out]);
    process.stdout.write('ok\n');
    await sleep(2500);
  }
  const jpg = await readFile(out);
  return { dataUrl: `data:image/jpeg;base64,${jpg.toString('base64')}`, sizeKB: Math.round(jpg.length / 1024) };
}

function buildSpot(idx, stop, photoDataUrl) {
  const s = {
    id: `s${idx + 1}`,
    num: idx + 1,
    latlng: stop.latlng,
    title: stop.title,
    desc: stop.desc + (photoDataUrl && stop.photo_credit ? `\n\n📷 ${stop.photo_credit}` : ''),
    photo: photoDataUrl,
    iconId: 'pin',
    cardOffset: DEFAULT_CARD_OFFSET,
  };
  if (stop.scripture_refs && stop.scripture_refs.length > 0) s.scripture_refs = stop.scripture_refs;
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
    routes: [{
      id: 'r1',
      name,
      color,
      pts: spotsWithPhotos.map((s) => s.latlng),
      elevations: null,
    }],
    overlay: { id: overlay, opacity: 0.6 },
  };
}

// ───────── DATA: 4 routes × ~11 stops ─────────

const PAUL_2 = {
  idPrefix: 'paul2',
  collection: 'bible',
  storyId: 'paul-second-journey',
  filename: 'paul-second-journey.trailpaint.json',
  name: '保羅第二次宣教旅行',
  subtitle: 'AD 49-52 使徒行傳 15:36-18:22',
  description: '保羅與西拉從安提阿出發，經小亞細亞來到特羅亞時見馬其頓異象（徒16:9），把福音首次帶入歐洲。途中在腓立比遭監禁、在雅典亞略巴古講論、在哥林多牧養十八個月，最後經以弗所、耶路撒冷返回敘利亞的安提阿。',
  center: [38.5, 28.0], zoom: 5, overlay: 'rome_200', color: 'red',
  stops: [
    { title: '敘利亞的安提阿 (Antioch on the Orontes)', latlng: [36.2021, 36.1604],
      desc: '保羅與巴拿巴為馬可的事起爭執後分道，保羅另揀選西拉從這裡的母會出發，展開第二次宣教旅行（徒15:36-41）。安提阿教會是向外邦宣教的差派基地，「門徒稱為基督徒是從安提阿起首」（徒11:26）。',
      scripture_refs: ['Acts 15:36-41', 'Acts 11:26'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Antioch_Saint_Pierre_Church_Inside.JPG',
      photo_credit: 'Antioch Saint Pierre Church, Onur Volkan Hatem (CC BY-SA 2.5)' },
    { title: '特庇 (Derbe)', latlng: [37.3490, 33.3450],
      desc: '保羅與西拉走陸路穿越敘利亞、基利家，越過托羅斯山的「西里西亞門」後先抵特庇，堅固第一次旅行時所建立的教會（徒16:1）。',
      scripture_refs: ['Acts 16:1'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/DAVIS%281879%29_p329_SITE_OF_DERBE%2C_KARAJH_DAGH_MOUNTAINS_IN_THE_DISTANCE.jpg',
      photo_credit: 'E.J. Davis, Site of Derbe, 1879 (PD)' },
    { title: '路司得 (Lystra)', latlng: [37.5833, 32.4500],
      desc: '少年提摩太在此加入宣教團，保羅為讓他顧及猶太同工便給他行割禮（徒16:1-3）。保羅第一次旅行時曾在此被石頭打至昏死，此番再訪交出新傳人。',
      scripture_refs: ['Acts 16:1-5'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/V%26A_-_Raphael%2C_The_Sacrifice_at_Lystra_%281515%29.jpg',
      photo_credit: 'Raphael, The Sacrifice at Lystra, 1515 (PD, V&A)' },
    { title: '特羅亞 (Troas)', latlng: [39.7547, 26.1589],
      desc: '聖靈兩次攔阻保羅往亞西亞和庇推尼後，他在特羅亞港夜間見異象——一個馬其頓人呼求「請你過來幫助我們」（徒16:9-10）。這是福音首次被引進歐洲的轉捩點，路加也從此加入（「我們」敘事開始）。',
      scripture_refs: ['Acts 16:6-10'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Alexandria_Troas_Thermen.JPG',
      photo_credit: 'Alexandria Troas Roman baths, Elelicht (CC BY-SA 3.0)' },
    { title: '尼亞波利 (Neapolis)', latlng: [40.9356, 24.4129],
      desc: '保羅一行從特羅亞開船，經撒摩特喇，次日抵馬其頓的門戶港尼亞波利（今卡瓦拉），福音的腳蹤自此踏上歐洲大陸（徒16:11）。',
      scripture_refs: ['Acts 16:11'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/View_of_Kavala_from_the_ancient_Via_Egnatia.jpg',
      photo_credit: 'View of Kavala from ancient Via Egnatia, Xristoupolitis (CC BY-SA 4.0)' },
    { title: '腓立比 (Philippi)', latlng: [41.0131, 24.2870],
      desc: '賣紫色布的呂底亞在河邊禱告處信主，全家受洗，歐洲第一間家庭教會在此誕生（徒16:13-15）。保羅趕出使女身上的鬼靈後與西拉被下監，半夜禱告唱詩時地震震開監門，禁卒全家歸主（徒16:25-34）。',
      scripture_refs: ['Acts 16:12-40'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/77/1627_Rembrandt_Paulus_im_Gef%C3%A4ngnis_Staatsgalerie_Stuttgart_anagoria.JPG',
      photo_credit: 'Rembrandt, Paulus im Gefängnis, 1627 (PD, Staatsgalerie Stuttgart)' },
    { title: '帖撒羅尼迦 (Thessalonica)', latlng: [40.6401, 22.9444],
      desc: '保羅沿羅馬大道 Via Egnatia 來到馬其頓省會，連三個安息日在會堂辯論，信者甚眾（徒17:1-4）。反對的猶太人煽動市民圍攻耶孫的家，弟兄們連夜送保羅離開。',
      scripture_refs: ['Acts 17:1-9'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Rotonde_de_Thessalonique.jpg',
      photo_credit: 'Rotunda of Thessaloniki, Iolchos07 (CC BY-SA 4.0)' },
    { title: '庇哩亞 (Berea)', latlng: [40.5244, 22.2014],
      desc: '庇哩亞人聽道比帖撒羅尼迦人更「賢於」，天天考查聖經驗證保羅所傳的（徒17:10-12）。帖撒羅尼迦的敵對者追來煽動群眾，弟兄們便送保羅到海邊往雅典。',
      scripture_refs: ['Acts 17:10-15'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/b/b5/St-Paul-in-Beroia.jpg',
      photo_credit: "St Paul's Tribune in Veria/Berea, Edal Anton Lefterov (CC BY-SA 3.0)" },
    { title: '雅典 (Athens)', latlng: [37.9715, 23.7267],
      desc: '保羅見滿城偶像，心裡著急，就在會堂與市集辯論，被請上亞略巴古向希臘哲學家講論「未識之神」，引用他們的詩人，宣告獨一真神與復活（徒17:16-34）。丟尼修與婦人大馬哩等人信主。',
      scripture_refs: ['Acts 17:16-34'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/V%26A_-_Raphael%2C_St_Paul_Preaching_in_Athens_%281515%29.jpg',
      photo_credit: 'Raphael, St Paul Preaching in Athens, 1515 (PD, V&A)' },
    { title: '哥林多 (Corinth)', latlng: [37.9061, 22.8782],
      desc: '保羅在此住滿一年六個月，與製帳棚的亞居拉和百基拉同住同工，安息日在會堂勸化人（徒18:1-11）。主夜間異象說「有許多百姓是我的人」，哥林多教會從此建立；方伯迦流拒絕受理猶太人的控告。',
      scripture_refs: ['Acts 18:1-18'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Temple_of_Apollo_%28Corinth%29.JPG',
      photo_credit: 'Temple of Apollo, Corinth, Ixnay (PD)' },
    { title: '以弗所 (Ephesus)', latlng: [37.9395, 27.3417],
      desc: '保羅帶亞居拉、百基拉從堅革哩開航，短暫停靠以弗所進會堂辯論；眾人請他多住，他辭別說「神若許我，我還要回到你們這裡」（徒18:19-21），留下夫婦二人繼續牧養。',
      scripture_refs: ['Acts 18:18-21'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Ephesus_Celsus_Library_Fa%C3%A7ade.jpg',
      photo_credit: 'Library of Celsus façade, Ephesus, Benh LIEU SONG (CC BY-SA 3.0)' },
    { title: '耶路撒冷與安提阿歸航 (Jerusalem & Antioch)', latlng: [31.7781, 35.2353],
      desc: '保羅在該撒利亞上岸後，上耶路撒冷問教會安，再下到安提阿總會述職，第二次宣教旅行圓滿結束（徒18:22）。全程約三千英里、歷時近三年，福音自此在歐洲生根。',
      scripture_refs: ['Acts 18:22'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/JERUSALEM_THE_OLD_CITY_%26_THE_TEMPLE_MOUNT.JPG',
      photo_credit: 'Jerusalem Old City & Temple Mount, Avraham Graicer (CC BY-SA 4.0)' },
  ],
};

const PAUL_ROME = {
  idPrefix: 'paulrome',
  collection: 'bible',
  storyId: 'paul-to-rome',
  filename: 'paul-to-rome.trailpaint.json',
  name: '保羅押解羅馬海難記',
  subtitle: 'AD 60-61 使徒行傳 27-28',
  description: '使徒行傳 27-28 章記載，保羅在該撒利亞向凱撒上訴後，由百夫長猶流押送，歷經地中海秋冬狂風、在米利大（馬爾他）觸礁船毀、被毒蛇咬卻無恙、醫治部百流父親，最後沿亞比烏古道抵達羅馬軟禁兩年，仍放膽傳福音。',
  center: [36.5, 22.0], zoom: 5, overlay: 'rome_200', color: 'red',
  stops: [
    { title: '該撒利亞 (Caesarea Maritima)', latlng: [32.5022, 34.8920],
      desc: '保羅在此向非斯都上訴凱撒，後與亞基帕王對話（徒25-26）。百夫長猶流押解他登上一艘亞大米田的船啟航（徒27:1-2），同行有路加與馬其頓人亞里達古。',
      scripture_refs: ['Acts 25', 'Acts 26', 'Acts 27:1-2'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Cesarea_Harbor_Ruins_%D7%A2%D7%AA%D7%99%D7%A7%D7%95%D7%AA_%D7%A0%D7%9E%D7%9C_%D7%A7%D7%99%D7%A1%D7%A8%D7%99%D7%94.jpg',
      photo_credit: 'Caesarea Harbor ruins, Wikimedia Commons (CC BY-SA 4.0)' },
    { title: '西頓 (Sidon)', latlng: [33.5634, 35.3711],
      desc: '船次日抵達西頓，猶流寬待保羅，准他上岸訪友得著照應（徒27:3）。此為航程中罕見的恩慈一瞥。',
      scripture_refs: ['Acts 27:3'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/View_from_Sidon%27s_Sea_Castle%2C_Sidon%2C_Lebanon.jpg',
      photo_credit: "View from Sidon's Sea Castle (CC BY 4.0)" },
    { title: '每拉 (Myra of Lycia)', latlng: [36.2597, 29.9847],
      desc: '因風不順，船貼居比路背風岸行至呂家的每拉（徒27:4-5）。百夫長在此尋獲一隻往義大利的亞歷山大糧船，換船續航（徒27:6）。',
      scripture_refs: ['Acts 27:4-6'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Myra_theatre.jpg',
      photo_credit: 'Myra theatre, Ingo Mehling (CC BY-SA)' },
    { title: '佳澳 (Fair Havens, Crete)', latlng: [34.9039, 24.7950],
      desc: '多日逆風後勉強沿革哩底南岸行至佳澳（徒27:7-8）。保羅預言前行必有損失，船主與百夫長仍決意開船，埋下災禍伏筆（徒27:9-12）。',
      scripture_refs: ['Acts 27:7-12'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/03/1600_kaloi_limenes.jpg',
      photo_credit: '1650 engraving of Fair Havens by F. Basilicata (PD)' },
    { title: '米利大船難灣 (St Paul\'s Bay, Malta)', latlng: [35.9542, 14.3708],
      desc: '友拉革羅（東北風）颳了十四晝夜，船在亞底亞海漂流（徒27:14-27）。天使應許眾人性命保全，黎明時撞礁船毀，276 人全數游上岸登陸米利大（徒27:22-44）。',
      scripture_refs: ['Acts 27:13-44'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Laurent_de_La_Hyre%27s_Saint_Paul_Shipwrecked_on_Malta.jpg',
      photo_credit: 'Laurent de La Hyre, Saint Paul Shipwrecked on Malta (PD)' },
    { title: '米利大部百流莊 (Publius\'s Estate, Malta)', latlng: [35.9490, 14.4045],
      desc: '保羅拾柴時毒蛇咬手卻安然無恙，土人以為他是神（徒28:3-6）。首領部百流接待三日，保羅按手醫好其父熱病與痢疾，全島病人皆得醫治，越冬三月後離岸（徒28:7-11）。',
      scripture_refs: ['Acts 28:1-11'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/St._Paul%2C_shipwrecked_on_Malta%2C_is_attacked_by_a_snake_which_Wellcome_V0034993.jpg',
      photo_credit: 'St. Paul attacked by a snake on Malta, Wellcome V0034993 (CC BY 4.0)' },
    { title: '敘拉古 (Syracuse, Sicily)', latlng: [37.0627, 15.2934],
      desc: '改乘另一艘過冬的亞歷山大船（以丟斯雙子為船頭像），到敘拉古停泊三日（徒28:11-12）。西西里島東岸古希臘名城，羅馬省會要港。',
      scripture_refs: ['Acts 28:11-12'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Cathedral_of_Syracuse%2C_Ortigia%2C_Siracusa%2C_Sicily.jpg',
      photo_credit: 'Cathedral of Syracuse, Ortigia (CC BY-SA)' },
    { title: '部丟利 (Puteoli)', latlng: [40.8244, 14.1256],
      desc: '經利基翁（Rhegium）南風驟起，次日直航部丟利登陸（徒28:13）。當地已有弟兄，挽留保羅住了七日——羅馬帝國主要糧港，從此轉陸路北上。',
      scripture_refs: ['Acts 28:13-14'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Antieke_ru%C3%AFne_in_Pozzuoli%2C_RP-F-00-1462.jpg',
      photo_credit: 'Ancient ruin in Pozzuoli, Rijksmuseum RP-F-00-1462 (PD)' },
    { title: '亞比烏市 (Forum of Appius)', latlng: [41.5420, 13.0880],
      desc: '羅馬弟兄聞訊，遠行至亞比烏市（亞比烏古道上第 43 哩驛站）迎接保羅（徒28:15）。保羅見了就感謝神，放心壯膽。',
      scripture_refs: ['Acts 28:15'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Giovanni_Battista_Piranesi%2C_Parte_dell%27antica_Via_Appia_fuori_de_Porta_S._Sebastiano%2C_1748%2C_NGA_125678.jpg',
      photo_credit: "Piranesi, Parte dell'antica Via Appia, 1748 (PD, NGA)" },
    { title: '三館 (Three Taverns)', latlng: [41.6400, 12.8140],
      desc: '另一批弟兄在亞比烏古道第 33 哩的三館（Tres Tabernae）迎候（徒28:15）。兩批接力的接待成為保羅入京前最後的屬靈堅固。',
      scripture_refs: ['Acts 28:15'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Appian_Way_-_DPLA_-_d4c11db0171646de80fd3117c988d8da.jpg',
      photo_credit: 'Appian Way, DPLA via Wikimedia Commons (PD)' },
    { title: '羅馬 (Rome)', latlng: [41.8925, 12.4853],
      desc: '保羅抵羅馬蒙准自租房屋軟禁，有兵丁看守（徒28:16）。住滿兩年，放膽傳神國的道，將基督的事教導眾人，沒有人禁止（徒28:30-31）。此為使徒行傳結尾，公認時間約主後 62 年。',
      scripture_refs: ['Acts 28:16-31'],
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Mamertine_Prison.jpg',
      photo_credit: 'Mamertine Prison, Rome (CC BY-SA)' },
  ],
};

const XUANZANG_RETURN = {
  idPrefix: 'xuanzangret',
  collection: 'china',
  storyId: 'xuanzang-return',
  filename: 'xuanzang-return.trailpaint.json',
  name: '玄奘歸程東返',
  subtitle: 'AD 643-645 大唐西域記',
  description: '貞觀十七年至十九年，玄奘攜六百五十七部梵本佛經自那爛陀啟程返唐。循北天竺、迦濕彌羅、興都庫什越帕米爾，於于闐半年校經並上表請罪，經敦煌、瓜州、玉門重入大唐，抵長安受唐太宗親迎，終駐大慈恩寺主持十九年譯經。',
  center: [36.5, 75.0], zoom: 4, overlay: 'tang_741', color: 'orange',
  stops: [
    { title: '那爛陀寺 (Nālandā)', latlng: [25.1358, 85.4437],
      desc: '貞觀十七年（AD 643）春，玄奘辭別戒賢法師與那爛陀眾僧，攜帶六百五十七部梵本佛經與七尊佛像踏上東返之路。戒日王與鳩摩羅王親送過恆河，大象馱經、隨行僧眾與衛隊數十人同行。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Nalanda_University_ruins.JPG',
      photo_credit: 'Nalanda ruins (CC BY-SA 3.0)' },
    { title: '迦濕彌羅 (Kashmir / Srinagar)', latlng: [34.0837, 74.7973],
      desc: '自北天竺經呾叉始羅、濫波折入迦濕彌羅（今克什米爾斯利那加一帶）。此處水木深邃，玄奘留駐補抄在印未竟之經論，並於寺院校勘梵本。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Dal_Lake_Hazratbal_Srinagar.jpg',
      photo_credit: 'Dal Lake Hazratbal Srinagar, Suhail Skindar Sofi (CC BY-SA 4.0)' },
    { title: '興都庫什山 (Hindu Kush / 大雪山)', latlng: [35.5000, 71.5000],
      desc: '自濫波北上，翻越《大唐西域記》所稱「大雪山」興都庫什。大象踏雪前行，山路冰崖壁立，僧眾裹氈夜宿，險過前往印度時的南麓商路。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Hindukush_Mountains_near_Chitral.jpg',
      photo_credit: 'Hindukush Mountains near Chitral, Zeeshan-ul-hassan Usmani (CC BY-SA 4.0)' },
    { title: '帕米爾 (Pamir / 波謎羅川)', latlng: [38.5000, 73.5000],
      desc: '過睹貨邏、瞿薩旦那之間的波謎羅川（今帕米爾高原），群山積雪、暴風驟至。途中遇強盜與洪流，馱經巨象溺斃，五十夾佛經散落雪水中，玄奘於于闐遣使請抄補。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Lake_Karakul.jpg',
      photo_credit: 'Lake Karakul, Pamir Mountains, Benoît Vicart (CC0)' },
    { title: '于闐國 (Khotan / 今和田)', latlng: [37.1107, 79.9253],
      desc: '玄奘抵于闐（瞿薩旦那國），駐於此地校補帕米爾遺失之佛經，並上表太宗自陳十七年前私自西出玉門之罪，請旨還京。留駐七、八月，待長安回音。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/37/Khotan-melikawat-ruinas-d01.jpg',
      photo_credit: 'Khotan Melikawat ruins, Colegota (CC BY-SA 2.5 ES)' },
    { title: '敦煌 (Dunhuang / 沙州)', latlng: [40.1417, 94.6619],
      desc: '貞觀十八年末，太宗詔敕沿途州縣接迎，玄奘自于闐東出，過且末、石城，抵沙州敦煌。此後莫高窟第 103 窟、第 3 窟陸續繪出《玄奘取經圖》，將其歸程納入佛教藝術。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/4/47/GateOfMogaoCaves.jpg',
      photo_credit: 'Gate of Mogao Caves, Dunhuang, Fanghong (CC BY-SA 3.0)' },
    { title: '瓜州 (Guazhou / 鎖陽城)', latlng: [40.2486, 96.2167],
      desc: '循疏勒河北岸至瓜州，即當年冒險西出時受州吏追捕之地。今鎖陽城遺址之塔爾寺殘塔，為唐瓜州治所西側佛教據點，玄奘重入時州府官民列隊相迎。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Suoyang_City_01.jpg',
      photo_credit: 'Suoyang City ruins (Guazhou), Zanhe (CC BY-SA 4.0)' },
    { title: '玉門關重入唐境 (Yumen Pass Re-entry)', latlng: [40.3544, 93.8667],
      desc: '貞觀十九年正月，玄奘自瓜州東南行，經玉門舊關正式重返大唐疆域。當年夜渡葫蘆河、偷越五烽的亡命客，如今以國師之禮、驛馬護送入關。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Yumenguan.jpg',
      photo_credit: '玉門關小方盤城遺址 (CC BY-SA 3.0 / GFDL)' },
    { title: "長安郊迎 (Chang'an Welcome)", latlng: [34.2658, 108.9541],
      desc: '貞觀十九年正月二十四日，玄奘抵長安。房玄齡率百官、僧俗數萬列朱雀街夾道相迎，梵經佛像陳於弘福寺。太宗時在洛陽，遣使急召玄奘往見。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/098_Xuanzang.jpg',
      photo_credit: 'Xuanzang statue, Nalanda Museum, Anandajoti Bhikkhu (CC BY-SA 4.0)' },
    { title: "大慈恩寺 (Da Ci'en Temple)", latlng: [34.2186, 108.9597],
      desc: '貞觀二十二年太子李治為母追福敕建大慈恩寺，請玄奘住持並設翻經院。玄奘自此領譯場主持十九年，譯出《瑜伽師地論》《大般若經》等七十五部一千三百三十五卷。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/0/06/DaCiEnSi.jpg',
      photo_credit: "Da Ci'en Temple, Emcc (CC BY-SA 3.0)" },
    { title: '大雁塔 (Giant Wild Goose Pagoda)', latlng: [34.2186, 108.9590],
      desc: '永徽三年（AD 652），玄奘奏請於慈恩寺西院仿印度窣堵坡式樣，起五層磚塔以貯西行所攜梵本佛經與舍利，即今大雁塔前身。晚年刻「雁塔題名」傳統自此而生。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Giant_Wild_Goose_Pagoda.jpg',
      photo_credit: 'Giant Wild Goose Pagoda, Alex Kwok (CC BY-SA 3.0)' },
  ],
};

const ZHENGHE_1 = {
  idPrefix: 'zhenghe1',
  collection: 'china',
  storyId: 'zhenghe-first',
  filename: 'zhenghe-first.trailpaint.json',
  name: '鄭和第一次下西洋',
  subtitle: 'AD 1405-1407 首航',
  description: '永樂三年夏，鄭和奉明成祖之命首航西洋，率寶船 62 艘、大小船舶 317 艘、官兵水手 27,800 人，從南京龍江寶船廠出江，經太倉劉家港鳴鑼啟航，歷占城、爪哇、舊港——在舊港擊破海盜陳祖義，再訪滿剌加、錫蘭，最遠抵印度西岸古里立碑紀念。',
  center: [20.0, 97.0], zoom: 4, overlay: 'ming_1582', color: 'blue',
  stops: [
    { title: '南京龍江寶船廠 (Longjiang Shipyard, Nanjing)', latlng: [32.0756, 118.7483],
      desc: '永樂二年至三年，明廷下令在南京城西北三汊河口龍江船廠趕造「寶船」——最大者四十四丈、寬十八丈，九桅十二帆，可載千人。艦隊主力 62 艘寶船、連同糧船馬船戰船共 317 艘，在此陸續下水。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Nanjing_Treasure_Boat_Shipyard_-_model_of_a_treasure_boat_rudder_-_P1070985.JPG',
      photo_credit: '寶船舵模型, 南京寶船廠遺址公園, Vmenkov (CC BY-SA 3.0)' },
    { title: '太倉劉家港 (Liujiagang, Taicang)', latlng: [31.5754, 121.2643],
      desc: '永樂三年六月，寶船艦隊沿長江順流而下，於蘇州府太倉州劉家港集結鳴鑼。此處為明初海運糧倉與出海口，鄭和在天妃宮焚香祭拜媽祖，全軍受閱後正式出洋。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Treasure_Boat_Shipyard_-_stele_pavilion_-_Liujiagang_stele_-_P1080101.JPG',
      photo_credit: '劉家港通番事跡碑仿刻, Vmenkov (CC BY-SA 3.0)' },
    { title: '福建五虎門 (Wuhumen, Fujian)', latlng: [26.1297, 119.6358],
      desc: '艦隊沿海南下至福建長樂港，於閩江口外的五虎門等候東北季風。水手在此補給淡水、木柴、糧米，並於長樂南山塔下重修天妃宮。冬至前後季風一起，寶船列陣穿五虎門入南海。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/7e/WuBeiZhi.jpg',
      photo_credit: '《武備志》1628 年刊 鄭和航海圖頁 (PD)' },
    { title: '占城新州 (Champa / Qui Nhon)', latlng: [13.7789, 109.2194],
      desc: '首站抵達占城國新州港（今越南歸仁），占城王以象輦出迎，貢象牙、犀角、沉香。明使宣讀永樂詔書、賜印綬冠帶，確立占城為大明藩屬。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Mao_Kun_map_-_Pahang%2C_Pulau_Tioman.jpg',
      photo_credit: '鄭和航海圖．南海航路段（武備志 1628）(PD)' },
    { title: '爪哇麻喏巴歇 (Java / Majapahit)', latlng: [-7.5558, 112.3839],
      desc: '艦隊南下爪哇海，泊麻喏巴歇港口。時值爪哇東西王內戰，西王兵誤殺明軍 170 人，西王驚懼遣使謝罪納黃金六萬兩。鄭和以「柔遠人」之策不興刀兵，被南洋諸國視為明朝寬宏的示範。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Treasure_ship.JPG',
      photo_credit: '馬歡《瀛涯勝覽》明刻本寶船圖, 1435 (PD)' },
    { title: '舊港 (Palembang, Sumatra)', latlng: [-2.9909, 104.7566],
      desc: '艦隊過馬六甲海峽至舊港，廣東籍海盜頭目陳祖義盤踞於此劫掠商旅。陳詐降暗謀夜襲，當地華人施進卿密報鄭和。明軍反設伏，大破盜眾、焚船十艘、斬五千餘級，生擒陳祖義押回南京處斬——這是下西洋首場實戰。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Mao_Kun_map_-_Sumatra_%26_Thailand.JPG',
      photo_credit: '鄭和航海圖．蘇門答臘暹羅段（武備志 1628）(PD)' },
    { title: '滿剌加 (Malacca)', latlng: [2.1896, 102.2501],
      desc: '艦隊停泊滿剌加（麻六甲），時此地僅為暹羅藩屬小邑。鄭和建「官廠」倉庫作為遠航中轉站，帶回滿剌加王子拜里米蘇剌覲見明廷。永樂帝後冊封其為滿剌加國王，開啟其脫離暹羅的轉折。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Mao_Kun_map_-_Malacca.png',
      photo_credit: '鄭和航海圖．滿剌加段（武備志 1628）(PD)' },
    { title: '錫蘭山 (Ceylon / Galle)', latlng: [6.0328, 80.2170],
      desc: '橫渡孟加拉灣抵錫蘭山國（今斯里蘭卡南部加勒港）。鄭和敬三寶：佛祖、真主、毗濕奴——後於二次下西洋(1409)在此立三語碑，今存可倫坡國家博物館，聯合國教科文組織已列入世界記憶名錄。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Gall_Trilingual_Inscription.jpg',
      photo_credit: '加勒三語碑, 可倫坡國家博物館藏, Kanatonian (CC BY-SA 3.0)' },
    { title: '古里 (Calicut / Kozhikode)', latlng: [11.2588, 75.7804],
      desc: '1406 年末抵此行最西終點——印度西海岸古里國。國王沙米地喜以鼓樂大象迎接，鄭和宣讀詔書、封王賜印，並在城外立石碑一方，銘曰：「去中國十萬餘里，民物咸若，熙皡同風，刻石於茲，永示萬世。」',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Mao_Kun_map_-_India%2C_Africa.JPG',
      photo_credit: '鄭和航海圖．印度與非洲段（武備志 1628）(PD)' },
    { title: '返航南京 (Return to Nanjing)', latlng: [32.0603, 118.7969],
      desc: '永樂五年九月，艦隊滿載香料、寶石、珍禽異獸與諸國貢使，循原路東返。鄭和獻俘陳祖義於南京奉天門，永樂帝大悅當眾處斬盜首。首航功成，朝廷即籌第二次下西洋。',
      photo_url: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Nanjing_Treasure_Boat_-_P1070978.JPG',
      photo_credit: '南京寶船廠遺址公園 復原中型寶船, Vmenkov (CC BY-SA 3.0)' },
  ],
};

// ───────── Run ─────────

const ROUTES = [PAUL_2, PAUL_ROME, XUANZANG_RETURN, ZHENGHE_1];

for (const r of ROUTES) {
  console.log(`\n== ${r.name} (${r.stops.length} stops) ==`);
  const spotsWithPhotos = [];
  let totalKB = 0;
  for (let i = 0; i < r.stops.length; i++) {
    const res = await fetchAndCompress(`${r.idPrefix}_${i}`, r.stops[i].photo_url);
    if (res) totalKB += res.sizeKB;
    spotsWithPhotos.push(buildSpot(i, r.stops[i], res?.dataUrl ?? null));
  }
  console.log(`  photos total: ${totalKB} KB`);
  const project = buildProject(
    { name: r.name, center: r.center, zoom: r.zoom, overlay: r.overlay, color: r.color },
    spotsWithPhotos,
  );
  const targetDir = join(STORIES, r.collection);
  await mkdir(targetDir, { recursive: true });
  const dest = join(targetDir, r.filename);
  await writeFile(dest, JSON.stringify(project, null, 2));
  const bytes = Buffer.byteLength(JSON.stringify(project));
  console.log(`  wrote ${dest} (${Math.round(bytes / 1024)} KB)`);

  // per-story thumb.jpg (downscale from first non-null spot photo)
  let firstIdx = 0;
  while (firstIdx < r.stops.length && !spotsWithPhotos[firstIdx].photo) firstIdx++;
  if (firstIdx < r.stops.length) {
    const firstRaw = join(TMP, `${r.idPrefix}_${firstIdx}.raw`);
    const thumbPath = join(targetDir, `${r.storyId}-thumb.jpg`);
    await runSips(['-Z', '360', '-s', 'format', 'jpeg', '-s', 'formatOptions', '70', firstRaw, '--out', thumbPath]);
  }
}

if (FAILED.length > 0) {
  console.log(`\n⚠️  ${FAILED.length} image(s) failed:`);
  for (const f of FAILED) console.log(`   ${f.id}  [${f.result}]  ${f.url}`);
}

// ───────── Patch story.json for each collection ─────────

for (const collection of ['bible', 'china']) {
  const storyPath = join(STORIES, collection, 'story.json');
  const story = JSON.parse(await readFile(storyPath, 'utf8'));
  for (const r of ROUTES.filter((x) => x.collection === collection)) {
    if (story.stories.some((s) => s.id === r.storyId)) continue;
    story.stories.push({
      id: r.storyId,
      title: r.name,
      subtitle: r.subtitle,
      description: r.description,
      data: r.filename,
      thumbnail: `${r.storyId}-thumb.jpg`,
      color: r.color === 'red' ? '#dc2626' : r.color === 'orange' ? '#e05a1a' : '#2563eb',
      music: story.music.src,
    });
  }
  await writeFile(storyPath, JSON.stringify(story, null, 2) + '\n');
  console.log(`patched ${collection}/story.json`);
}

// ───────── Patch catalog.json ─────────

const catalogPath = join(STORIES, 'catalog.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
for (const r of ROUTES) {
  const idx = catalog.stories.findIndex((x) => x.id === r.storyId);
  const entry = {
    id: r.storyId,
    collection: r.collection,
    title: r.name,
    subtitle: r.subtitle,
    description: r.description,
    thumbnail: `${r.collection}/${r.storyId}-thumb.jpg`,
    path: `${r.collection}/`,
    count: 1,
  };
  if (idx < 0) catalog.stories.push(entry);
  else catalog.stories[idx] = entry;
}
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log('patched stories/catalog.json');

console.log('\n✅ Phase 2 done.');
