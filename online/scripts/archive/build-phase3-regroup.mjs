#!/usr/bin/env node
/**
 * Phase 3: regroup paul-*, xuanzang-*, zhenghe-* into proper story groups
 * matching the taiwan-missionaries / passion-week pattern.
 *
 *   stories/bible/paul-*.json       → stories/paul/(first|second|to-rome).trailpaint.json
 *   stories/china/xuanzang-*.json   → stories/xuanzang/(west|return).trailpaint.json
 *   stories/china/zhenghe-*.json    → stories/zheng-he/(first|seventh).trailpaint.json
 *
 * Regenerate per-group story.json, rebuild catalog.json entries (one per group
 * instead of one per .trailpaint.json), drop empty bible/ china/ dirs.
 *
 * Run: node online/scripts/build-phase3-regroup.mjs
 */
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const STORIES = join(ROOT, 'stories');

async function runSips(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('sips', args, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`sips ${c}`))));
  });
}

/* ── Group definitions ── */

const GROUPS = [
  {
    id: 'paul',
    collection: 'bible',
    title: '使徒保羅宣教路線',
    subtitle: 'AD 46-62 使徒行傳三次旅行與押解羅馬',
    description: '使徒保羅一生四度橫渡地中海，從敘利亞安提阿三次差遣出航，把福音帶進小亞細亞、馬其頓、亞該亞，最後押解羅馬受審。三段互動地圖沿使徒行傳 13-28 章的足跡，配合文藝復興聖經畫作與古典遺址，重走這段奠定歐洲教會的壯遊。',
    color: '#b45309',
    music: '../music/sorrow-and-love.mp3',
    srcDir: 'bible',
    stories: [
      { id: 'first-journey', oldFileStem: 'paul-first-journey',
        title: '第一次宣教旅行', subtitle: 'AD 46-48 居比路與南加拉太', color: '#dc2626' },
      { id: 'second-journey', oldFileStem: 'paul-second-journey',
        title: '第二次宣教旅行', subtitle: 'AD 49-52 馬其頓呼聲、歐洲開道', color: '#b91c1c' },
      { id: 'to-rome', oldFileStem: 'paul-to-rome',
        title: '押解羅馬海難記', subtitle: 'AD 60-61 使徒行傳 27-28', color: '#7f1d1d' },
    ],
  },
  {
    id: 'xuanzang',
    collection: 'china',
    title: '玄奘西行',
    subtitle: 'AD 629-645 大唐西域記',
    description: '唐代高僧玄奘 629 年自長安偷渡出關，歷五萬里、百餘國，入天竺求法十七年，於 645 年攜六百五十七部梵本佛經歸長安。兩段互動地圖涵蓋西行與歸程，沿途搭配敦煌莫高窟、高昌故城、那爛陀遺址等實景影像。',
    color: '#e05a1a',
    music: '../music/voller-hoffnung.mp3',
    srcDir: 'china',
    stories: [
      { id: 'west', oldFileStem: 'xuanzang-west',
        title: '西行取經', subtitle: '長安 → 那爛陀', color: '#e05a1a' },
      { id: 'return', oldFileStem: 'xuanzang-return',
        title: '歸程東返', subtitle: '那爛陀 → 長安', color: '#c2410c' },
    ],
  },
  {
    id: 'zheng-he',
    collection: 'exploration',
    title: '鄭和下西洋',
    subtitle: 'AD 1405-1433 明代寶船七下西洋',
    description: '永樂至宣德年間，明廷七次派鄭和率寶船隊遠航西洋，足跡達東南亞、印度、阿拉伯、東非。兩段互動地圖呈現「首航」與「遺作」——1405 年的龍江寶船初啟 vs 1433 年鄭和卒於古里的最後一航——跨越二十八年的壯舉收束。',
    color: '#1e40af',
    music: '../music/voller-hoffnung.mp3',
    srcDir: 'china',
    stories: [
      { id: 'first', oldFileStem: 'zhenghe-first',
        title: '第一次下西洋', subtitle: 'AD 1405-1407 首航', color: '#2563eb' },
      { id: 'seventh', oldFileStem: 'zhenghe-seventh',
        title: '第七次下西洋', subtitle: 'AD 1431-1433 最後壯航，卒於古里', color: '#1e40af' },
    ],
  },
];

/* ── Move files + build story.json ── */

for (const g of GROUPS) {
  const groupDir = join(STORIES, g.id);
  await mkdir(groupDir, { recursive: true });

  for (const s of g.stories) {
    const srcJson = join(STORIES, g.srcDir, `${s.oldFileStem}.trailpaint.json`);
    const srcThumb = join(STORIES, g.srcDir, `${s.oldFileStem}-thumb.jpg`);
    const destJson = join(groupDir, `${s.id}.trailpaint.json`);
    const destThumb = join(groupDir, `${s.id}-thumb.jpg`);
    // Guard: refuse to overwrite a populated destination (prevents data loss
    // on re-runs where both src and dest exist simultaneously).
    if (existsSync(srcJson)) {
      if (existsSync(destJson)) {
        console.log(`  skip: ${destJson} exists (src also exists — manual merge needed)`);
      } else {
        await rename(srcJson, destJson);
      }
    }
    if (existsSync(srcThumb)) {
      if (existsSync(destThumb)) {
        console.log(`  skip: ${destThumb} exists`);
      } else {
        await rename(srcThumb, destThumb);
      }
    }
    // Update project.name inside JSON to show the group context
    if (existsSync(destJson)) {
      const proj = JSON.parse(await readFile(destJson, 'utf8'));
      proj.name = `${g.title} — ${s.title}`;
      // also rename the first route.name for consistency
      if (proj.routes?.[0]) proj.routes[0].name = proj.name;
      await writeFile(destJson, JSON.stringify(proj, null, 2));
    }
  }

  // Copy cover from first story thumb → group cover (720px)
  const firstThumbSrc = join(groupDir, `${g.stories[0].id}-thumb.jpg`);
  const coverPath = join(groupDir, 'cover.jpg');
  if (existsSync(firstThumbSrc)) {
    await runSips(['-Z', '720', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', firstThumbSrc, '--out', coverPath]);
  }

  const storyJson = {
    id: g.id,
    title: g.title,
    subtitle: g.subtitle,
    description: g.description,
    locale: 'zh-TW',
    cover: 'cover.jpg',
    music: {
      src: g.music,
      title: g.music.includes('voller') ? 'Voller Hoffnung — Ronny Matthes'
           : g.music.includes('sorrow') ? 'Sorrow and Love — Ronny Matthes'
           : 'Redeemed — Ronny Matthes',
      credit: 'Ronny Matthes (Jamendo / Internet Archive)',
      license: 'CC',
    },
    og: {
      title: `${g.title} — TrailPaint Stories`,
      description: g.description,
      image: 'og.jpg',
    },
    stories: g.stories.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      description: s.subtitle,
      data: `${s.id}.trailpaint.json`,
      thumbnail: `${s.id}-thumb.jpg`,
      color: s.color,
      music: g.music,
    })),
    footer: {
      cta: '在 TrailPaint 中建立你自己的故事地圖',
      url: 'https://trailpaint.org/app/',
    },
  };
  await writeFile(join(groupDir, 'story.json'), JSON.stringify(storyJson, null, 2) + '\n');
  console.log(`✅ wrote stories/${g.id}/ (${g.stories.length} stories)`);
}

/* ── Delete old bible/ china/ directories (they are not story groups) ── */

for (const old of ['bible', 'china']) {
  const dir = join(STORIES, old);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true, force: true });
    console.log(`🗑  removed stories/${old}/`);
  }
}

/* ── Patch catalog.json: replace per-json entries with per-group entries ── */

const catalogPath = join(STORIES, 'catalog.json');
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));

// Remove stale per-journey entries
const staleIds = new Set([
  'paul-first-journey', 'paul-second-journey', 'paul-to-rome',
  'xuanzang-west', 'xuanzang-return',
  'zhenghe-first', 'zhenghe-seventh',
]);
catalog.stories = catalog.stories.filter((s) => !staleIds.has(s.id));

// Upsert group entries
for (const g of GROUPS) {
  const entry = {
    id: g.id,
    collection: g.collection,
    title: g.title,
    subtitle: g.subtitle,
    description: g.description,
    thumbnail: `${g.id}/cover.jpg`,
    path: `${g.id}/`,
    count: g.stories.length,
  };
  const i = catalog.stories.findIndex((s) => s.id === g.id);
  if (i < 0) catalog.stories.push(entry);
  else catalog.stories[i] = entry;
}

await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log('📝 patched stories/catalog.json');

/* ── Assert catalog.count matches story.json for every group ── */
const failures = [];
for (const g of GROUPS) {
  const storyPath = join(STORIES, g.id, 'story.json');
  const s = JSON.parse(await readFile(storyPath, 'utf8'));
  const catEntry = catalog.stories.find((x) => x.id === g.id);
  if (catEntry && s.stories.length !== catEntry.count) {
    failures.push(`${g.id}: story.json has ${s.stories.length}, catalog.count=${catEntry.count}`);
  }
}
if (failures.length > 0) {
  console.error('\n❌ count mismatch:');
  for (const f of failures) console.error(`   ${f}`);
  process.exit(1);
}
console.log('✔ catalog.count matches story.json for every group.');

console.log('\n✅ Phase 3 regroup done.');
console.log(`   paul/ (3) + xuanzang/ (2) + zheng-he/ (2) — total 5 catalog entries replaced by 3.`);
console.log('   bible/ china/ removed (collections are catalog-only, not directories).');
