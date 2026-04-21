#!/usr/bin/env node
/**
 * Phase 1: promote the three world-history examples into stories collections.
 * - Move examples/* → stories/{bible,china}/*.trailpaint.json with english filenames
 * - Extract spot[0].photo as cover.jpg + thumbnail.jpg (resized via sips)
 * - Emit story.json for each collection
 * - Patch stories/catalog.json (add china + exploration collections, + 3 new stories)
 * - Patch sampleProject.ts (remove the three world routes)
 *
 * Run: cd online && node scripts/build-phase1-stories.mjs
 */
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..'); // trailpaint repo root
const EXAMPLES = join(ROOT, 'online', 'src', 'data', 'examples');
const STORIES = join(ROOT, 'stories');

async function runSips(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`sips ${c}`))));
  });
}

function dataUrlToBuffer(dataUrl) {
  const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
  if (!m) throw new Error('bad data URL');
  return Buffer.from(m[1], 'base64');
}

async function writeCoverAndThumb(dir, dataUrl) {
  const coverPath = join(dir, 'cover.jpg');
  const thumbPath = join(dir, 'thumb.jpg');
  const buf = dataUrlToBuffer(dataUrl);
  await writeFile(coverPath, buf);
  // downscale to ~360px for thumb
  await runSips(['-Z', '360', '-s', 'format', 'jpeg', '-s', 'formatOptions', '70', coverPath, '--out', thumbPath]);
}

// ───────── Migration map ─────────

const MIGRATIONS = [
  {
    examplesName: '保羅第一次宣教旅行',
    collection: 'bible',
    storyId: 'paul-first-journey',
    filename: 'paul-first-journey.trailpaint.json',
    title: '保羅第一次宣教旅行',
    subtitle: 'AD 46-48 使徒行傳 13-14',
    description: '使徒保羅與巴拿巴從敘利亞安提阿出發，取道居比路、南加拉太，沿途在會堂傳講耶穌、行神蹟、遭逼迫，再循原路返回安提阿述職。全程約 2,300 公里，開啟外邦人宣教的時代。',
    color: '#dc2626',
  },
  {
    examplesName: '玄奘西行取經',
    collection: 'china',
    storyId: 'xuanzang-west',
    filename: 'xuanzang-west.trailpaint.json',
    title: '玄奘西行取經',
    subtitle: 'AD 629-643 大唐西域記',
    description: '唐代高僧玄奘自長安偷渡出關，歷五萬里、百餘國，經河西走廊、西域、中亞、興都庫什，至天竺那爛陀寺受學於戒賢大師。本路線擇出 11 站，涵蓋出境、西行與終點。',
    color: '#e05a1a',
  },
  {
    examplesName: '鄭和第七次下西洋',
    collection: 'china',
    storyId: 'zhenghe-seventh',
    filename: 'zhenghe-seventh.trailpaint.json',
    title: '鄭和第七次下西洋',
    subtitle: 'AD 1431-1433 最後壯航',
    description: '宣德五年（1430）明宣宗詔鄭和再下西洋，船隊兩百餘艘、官兵二萬七千從南京啟航，遠至忽魯謨斯、非洲東岸。宣德八年三月鄭和卒於歸航途中之古里，大明下西洋的壯舉就此收束。',
    color: '#2563eb',
  },
];

// ───────── Collection descriptors ─────────

const COLLECTIONS = {
  bible: {
    dir: join(STORIES, 'bible'),
    story: {
      id: 'bible',
      title: '聖經地圖',
      subtitle: '使徒行傳與舊約的地理敘事',
      description: '沿著保羅宣教、耶穌受難週等聖經敘事，走過地中海沿岸的古城與遺蹟。互動地圖搭配文藝復興聖經繪畫與 19 世紀聖地版畫，立體呈現經文中的每一段足跡。',
      locale: 'zh-TW',
      music: {
        src: '../music/sorrow-and-love.mp3',
        title: 'Sorrow and Love — Ronny Matthes',
        credit: 'Ronny Matthes (Jamendo / Internet Archive)',
        license: 'CC',
      },
    },
  },
  china: {
    dir: join(STORIES, 'china'),
    story: {
      id: 'china',
      title: '中國歷史',
      subtitle: '跨朝代的壯遊與遠征',
      description: '玄奘西行、鄭和下西洋、張騫通西域⋯⋯中國歷代最動人的長途遷徙與遠航。互動地圖疊合中研院《中國歷代歷史地圖集》，在唐、明等古代版圖上重走這些改變東亞的行程。',
      locale: 'zh-TW',
      music: {
        src: '../music/voller-hoffnung.mp3',
        title: 'Voller Hoffnung — Ronny Matthes',
        credit: 'Ronny Matthes (Jamendo / Internet Archive)',
        license: 'CC',
      },
    },
  },
};

// ───────── 1. Move JSONs + build cover/thumb ─────────

for (const [key, { dir }] of Object.entries(COLLECTIONS)) {
  await mkdir(dir, { recursive: true });
}

for (const m of MIGRATIONS) {
  const src = join(EXAMPLES, `${m.examplesName}.trailpaint.json`);
  if (!existsSync(src)) {
    console.log(`SKIP ${m.examplesName}: already moved or missing`);
    continue;
  }
  const targetDir = COLLECTIONS[m.collection].dir;
  const dest = join(targetDir, m.filename);
  // read first, so we can extract photo before moving
  const raw = await readFile(src, 'utf8');
  const proj = JSON.parse(raw);
  const firstPhoto = proj.spots[0]?.photo;
  if (firstPhoto) {
    await writeCoverAndThumb(targetDir, firstPhoto);
    // per-story thumb file named <storyId>-thumb.jpg for catalog reference
    await runSips(['-Z', '360', '-s', 'format', 'jpeg', '-s', 'formatOptions', '70',
      join(targetDir, 'cover.jpg'), '--out', join(targetDir, `${m.storyId}-thumb.jpg`)]);
  }
  await rename(src, dest);
  console.log(`moved ${m.examplesName} → stories/${m.collection}/${m.filename}`);
}

// ───────── 2. Emit story.json per collection ─────────

for (const [key, { dir, story }] of Object.entries(COLLECTIONS)) {
  const myMigrations = MIGRATIONS.filter((m) => m.collection === key);
  const storyJson = {
    ...story,
    cover: 'cover.jpg',
    og: {
      title: `${story.title} — TrailPaint Stories`,
      description: story.description,
      image: 'og.jpg',
    },
    stories: myMigrations.map((m) => ({
      id: m.storyId,
      title: m.title,
      subtitle: m.subtitle,
      description: m.description,
      data: m.filename,
      thumbnail: `${m.storyId}-thumb.jpg`,
      color: m.color,
      music: story.music.src,
    })),
    footer: {
      cta: '在 TrailPaint 中建立你自己的故事地圖',
      url: 'https://trailpaint.org/app/',
    },
  };
  // use the first story's cover as collection-level cover (simplest)
  if (myMigrations.length > 0) {
    const firstDir = dir;
    // cover.jpg already exists from first migration; do nothing extra
  }
  await writeFile(join(dir, 'story.json'), JSON.stringify(storyJson, null, 2) + '\n');
  console.log(`wrote ${key}/story.json`);
}

// ───────── 3. Patch catalog.json ─────────

const catalogPath = join(STORIES, 'catalog.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));

function upsert(arr, id, payload) {
  const i = arr.findIndex((x) => x.id === id);
  if (i < 0) arr.push(payload);
  else arr[i] = payload;
}

upsert(catalog.collections, 'bible', { id: 'bible', title: '聖經地圖', order: 2 });
upsert(catalog.collections, 'china', { id: 'china', title: '中國歷史', order: 3 });
upsert(catalog.collections, 'exploration', { id: 'exploration', title: '大航海時代', order: 4 });

for (const m of MIGRATIONS) {
  upsert(catalog.stories, m.storyId, {
    id: m.storyId,
    collection: m.collection,
    title: m.title,
    subtitle: m.subtitle,
    description: m.description,
    thumbnail: `${m.collection}/${m.storyId}-thumb.jpg`,
    path: `${m.collection}/`,
    count: 1,
  });
}

await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log('patched stories/catalog.json');

// ───────── 4. Patch sampleProject.ts (remove three world routes) ─────────

const sampleTs = join(ROOT, 'online', 'src', 'core', 'utils', 'sampleProject.ts');
let ts = await readFile(sampleTs, 'utf8');
const removals = ['保羅第一次宣教旅行', '玄奘西行取經', '鄭和第七次下西洋'];
for (const name of removals) {
  // remove LOADERS entry
  ts = ts.replace(new RegExp(`\\s*'${name}':\\s*\\(\\)\\s*=>\\s*import\\([^)]+\\),?`, 'g'), '');
  // remove EXAMPLE_ROUTES entry
  ts = ts.replace(new RegExp(`\\s*\\{\\s*name:\\s*'${name}',\\s*icon:\\s*'[^']+'\\s*\\},?`, 'g'), '');
}
await writeFile(sampleTs, ts);
console.log('patched sampleProject.ts');

console.log('\n✅ Phase 1 migration done.');
console.log('   (Superseded by Phase 3 regroup — bible/ and china/ dirs were removed and replaced with stories/{paul,xuanzang,zheng-he}/.)');
