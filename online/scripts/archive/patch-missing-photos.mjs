#!/usr/bin/env node
/**
 * Fill missing spot photos in existing .trailpaint.json files.
 * Downloads + compresses + base64-inlines PD/CC images into designated spot indices.
 *
 *   Run: node online/scripts/patch-missing-photos.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TMP = '/tmp/tp-patch-images';
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) curl';
await mkdir(TMP, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runSips(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`sips ${c}`))));
  });
}

async function curlDownload(url, dest) {
  return new Promise((resolve) => {
    const p = spawn('curl', ['-sSL', '--max-time', '60', '-A', UA, '-o', dest, '-w', '%{http_code}', url], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let code = '';
    p.stdout.on('data', (d) => (code += d.toString()));
    p.on('close', (x) => {
      if (x !== 0) resolve(`curl_${x}`);
      else resolve(code.trim());
    });
  });
}

const FAILED = [];

async function fetchWithRetry(url, id, dest) {
  const backoffs = [10000, 30000, 60000];
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    const code = await curlDownload(url, dest);
    if (code.startsWith('2')) return 'ok';
    if (code === '404') return '404';
    if ((code === '429' || code.startsWith('5') || code.startsWith('curl_')) && attempt < backoffs.length) {
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
    const r = await fetchWithRetry(url, id, raw);
    if (r !== 'ok') {
      process.stdout.write(`[${r}] SKIP\n`);
      FAILED.push({ id, url, r });
      return null;
    }
    await runSips(['-Z', '900', '-s', 'format', 'jpeg', '-s', 'formatOptions', '65', raw, '--out', out]);
    process.stdout.write('ok\n');
    await sleep(2500);
  }
  const jpg = await readFile(out);
  return `data:image/jpeg;base64,${jpg.toString('base64')}`;
}

/* ── Patches ── */

const PATCHES = [
  // taiwan-missionaries
  { file: 'stories/taiwan-missionaries/barclay.trailpaint.json', idPrefix: 'tm_barclay', spots: [
    { idx: 2, url: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/SinLau_Hospital.jpg',
      credit: '新樓醫院（新樓醫館）, Chloekwok020910 (CC BY 4.0)' },
    { idx: 4, url: 'https://upload.wikimedia.org/wikipedia/commons/3/31/%E8%87%BA%E7%81%A3%E5%BA%9C%E5%9F%8E%E5%B0%8F%E5%8D%97%E9%96%80.JPG',
      credit: '臺灣府城小南門 pre-1945 photograph (PD)' },
    { idx: 5, url: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Tainan_East_Gate_Barclay_Memorial_Church-01.2024-12-18.jpg',
      credit: '東門巴克禮紀念教會, 阿道 (CC BY-SA 4.0)' },
    { idx: 6, url: 'https://upload.wikimedia.org/wikipedia/commons/7/71/%E5%8F%B0%E7%81%A3%E6%95%99%E6%9C%83%E5%85%AC%E5%A0%B1%E7%A4%BE%E7%B8%BD%E7%A4%BE_20160229.jpg',
      credit: '台灣教會公報社總社, Outlookxp (CC BY-SA 4.0)' },
    { idx: 8, url: 'https://upload.wikimedia.org/wikipedia/commons/2/26/%E8%87%BA%E5%8D%97%E7%9C%8B%E8%A5%BF%E8%A1%97%E6%95%99%E6%9C%8320171215.jpg',
      credit: '臺南看西街教會, 地下高雄 (CC BY-SA 4.0)' },
  ]},
  { file: 'stories/taiwan-missionaries/landsborough.trailpaint.json', idPrefix: 'tm_lands', spots: [
    { idx: 4, url: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/%E8%98%AD%E5%A4%A7%E8%A1%9B%E5%A4%AB%E5%A9%A6%E5%88%87%E8%86%9A%E4%B9%8B%E6%84%9B%E7%B4%80%E5%BF%B5%E9%A4%A8.JPG',
      credit: '蘭大衛夫婦切膚之愛紀念館, Pbdragonwang (CC BY-SA 3.0)' },
    { idx: 5, url: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Nursing_staff_of_Shoka_Hospital_of_the_Presbyterian_Church_at_Mackay_Hospital_in_Taihoku_1927.jpg',
      credit: '彰化基督教醫院護理團（1927，代表蘭醫館時代）(PD)' },
    { idx: 7, url: 'https://upload.wikimedia.org/wikipedia/commons/4/42/%E5%BD%B0%E5%8C%96%E5%8D%97%E7%91%A4%E5%AE%AE_Nanyao_Temple%2C_Zhanghua_-_panoramio.jpg',
      credit: '彰化南瑤宮, lienyuan lee (CC BY 3.0)' },
  ]},
  { file: 'stories/taiwan-missionaries/mackay.trailpaint.json', idPrefix: 'tm_mackay', spots: [
    { idx: 4, url: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/British_Library_digitised_image_from_page_218_of_%22From_Far_Formosa._The_island%2C_its_people_and_missions_..._Edited_by_J._A._Macdonald%2C_etc%22.jpg',
      credit: 'From Far Formosa 1896 — Xindian chapel illustration (PD, British Library)' },
    { idx: 5, url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Zhongli_District_Skyline.jpg',
      credit: '中壢區景（代表當地），Vavavis (CC BY-SA 4.0)' },
    { idx: 8, url: 'https://upload.wikimedia.org/wikipedia/commons/9/94/%E4%B8%89%E8%B2%82%E8%A7%92%E7%87%88%E5%A1%94.jpg',
      credit: '三貂角燈塔, Fcuk1203 (CC BY-SA 3.0)' },
    { idx: 10, url: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/SuAo_Bay_Panorama.jpg',
      credit: '蘇澳港全景, SElefant (CC BY-SA 3.0)' },
    { idx: 11, url: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Karenko_from_shinto_shrine.jpg',
      credit: '花蓮港（Karenko, pre-1945）自神社俯瞰 (PD)' },
  ]},
  // examples
  { file: 'online/src/data/examples/九份金瓜石步道.trailpaint.json', idPrefix: 'ex_jiufen', spots: [
    { idx: 0, url: 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Jiufen_Old_Street_01.jpg',
      credit: '九份老街, Kabacchi (CC BY 2.0)' },
    { idx: 3, url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/2017-10-24_scenic_view_near_the_%C5%8Cgon_Shrine.jpg',
      credit: '黃金神社遺址景觀, eugene_o (CC BY 2.0)' },
    { idx: 4, url: 'https://upload.wikimedia.org/wikipedia/commons/8/89/2025.07.19_Gold_Building_of_New_Taipei_City_Gold_Museum.jpg',
      credit: '黃金博物館, 人人生來平等 (CC BY-SA 4.0)' },
  ]},
  { file: 'online/src/data/examples/合歡山主峰步道.trailpaint.json', idPrefix: 'ex_hehuan', spots: [
    { idx: 1, url: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Main_Peak_of_Mount_Hehuan_20220512.jpg',
      credit: '合歡山主峰景（代表碉堡周邊），徐芳蘭 (CC BY 2.0)' },
  ]},
  { file: 'online/src/data/examples/嘉明湖步道.trailpaint.json', idPrefix: 'ex_jiaming', spots: [
    { idx: 0, url: 'https://upload.wikimedia.org/wikipedia/commons/c/c0/Siangyang.JPG',
      credit: '向陽登山口（嘉明湖步道），Kailing3 (CC BY 3.0)' },
    { idx: 1, url: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Xiangyang_Lodge_from_above.jpg',
      credit: '向陽山屋, Taiwan_Mountain (CC BY 2.0)' },
    { idx: 2, url: 'https://upload.wikimedia.org/wikipedia/commons/d/dc/Xiangyang_Cliff_Edge.jpg',
      credit: '向陽名樹路段（代表地標），Elsie Lin (CC BY-SA 2.0)' },
    { idx: 3, url: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Xiangyang_Mountain_Panorama.jpg',
      credit: '向陽山全景, Po-Wei CHU (CC BY 2.0)' },
  ]},
  { file: 'online/src/data/examples/抹茶山聖母山莊步道.trailpaint.json', idPrefix: 'ex_matcha', spots: [
    { idx: 0, url: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Wufengqi_Falls_Taiwan.jpeg',
      credit: '五峰旗瀑布（停車場附近景觀）(CC BY-SA 4.0)' },
    { idx: 1, url: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Catholic_Sanctuary_of_Our_Lady_of_Wufongci_20130218.jpg',
      credit: '五峰旗聖母朝聖地, Jason (CC BY 2.0)' },
    // idx 2 MO3 BLOCKED
    { idx: 3, url: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Match_Mountain.jpg',
      credit: '抹茶山觀景台, Ephemeral Days (CC BY-SA 4.0)' },
    { idx: 4, url: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/%E4%B8%89%E8%A7%92%E5%B4%99%E5%B1%B1_Sanjiaolun_Mountain_-_panoramio.jpg',
      credit: '三角崙山 (Panoramio 6452510, CC BY 3.0)' },
  ]},
  { file: 'online/src/data/examples/阿朗壹古道.trailpaint.json', idPrefix: 'ex_alangyi', spots: [
    { idx: 0, url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Xuhai_Inspection_Office.jpg',
      credit: '旭海安檢所, Joe Lo (CC BY-SA 2.0)' },
    // idx 2 A3 BLOCKED
    { idx: 3, url: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Nantianshi.jpg',
      credit: '南田石海灘, Pppighil (CC BY-SA 3.0)' },
    { idx: 4, url: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Jiunantian_%E8%88%8A%E5%8D%97%E7%94%B0_-_panoramio.jpg',
      credit: '舊南田（阿朗壹北端出口）(Panoramio 6452510, CC BY 3.0)' },
  ]},
  { file: 'online/src/data/examples/陽明山七星山步道.trailpaint.json', idPrefix: 'ex_yangming', spots: [
    { idx: 1, url: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/%E4%B8%83%E6%98%9F%E5%B1%B1%E6%9D%B1%E5%B3%B0_Qixingshan_East_Peak_-_panoramio.jpg',
      credit: '七星山東峰 (Panoramio 6452510, CC BY 3.0)' },
  ]},
];

/* ── Apply ── */

let patched = 0;
for (const p of PATCHES) {
  const path = join(ROOT, p.file);
  const proj = JSON.parse(await readFile(path, 'utf8'));
  console.log(`\n== ${p.file} ==`);
  for (const { idx, url, credit } of p.spots) {
    const id = `${p.idPrefix}_${idx}`;
    const dataUrl = await fetchAndCompress(id, url);
    if (!dataUrl) continue;
    const spot = proj.spots[idx];
    spot.photo = dataUrl;
    const creditTail = `📷 ${credit}`;
    const desc = spot.desc || '';
    if (!desc.includes(creditTail)) {
      spot.desc = desc.trim() + `\n\n${creditTail}`;
    }
    patched++;
  }
  await writeFile(path, JSON.stringify(proj, null, 2));
}

console.log(`\n✅ patched ${patched} spots`);
if (FAILED.length > 0) {
  console.log('\n⚠️  failed:');
  for (const f of FAILED) console.log(`   ${f.id}  [${f.r}]  ${f.url}`);
}
