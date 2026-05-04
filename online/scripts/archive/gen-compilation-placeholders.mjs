#!/usr/bin/env node
/**
 * One-shot placeholder generator (T11 follow-up, 2026-05-04).
 *
 * Replaces the 6 borrowed-from-stories compilation cover/thumb files +
 * 2 church/ images with TrailPaint-branded placeholders (dark-paper +
 * 🌿 + title/subtitle). Same filenames so they're a drop-in upgrade.
 *
 * Pipeline: HTML template → Chrome headless --screenshot (PNG) →
 * sips conversion (JPG q=85) → final destination.
 *
 * Designed to be replaced wholesale once 主公 hands off real artwork.
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '../../..');
const TMP = resolve(REPO, 'online/scripts/archive/.placeholder-tmp');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** @typedef {{ id:string, w:number, h:number, dst:string, title:string, subtitle:string, badge:string }} Spec */

/** @type {Spec[]} */
const SPECS = [
  {
    id: 'paul-three-journeys-cover',
    w: 1080, h: 1080,
    dst: 'stories/compilations/paul-three-journeys-cover.jpg',
    title: '保羅宣教三次旅行',
    subtitle: '三次差遣 + 押解羅馬',
    badge: 'AD 46–62',
  },
  {
    id: 'paul-three-journeys-thumb',
    w: 1200, h: 628,
    dst: 'stories/compilations/paul-three-journeys-thumb.jpg',
    title: '保羅宣教三次旅行',
    subtitle: '使徒行傳 13–28 章足跡',
    badge: 'AD 46–62',
  },
  {
    id: 'four-gospels-cover',
    w: 1080, h: 1080,
    dst: 'stories/compilations/four-gospels-cover.jpg',
    title: '四福音書地圖',
    subtitle: '加利利傳道 + 受難週',
    badge: 'AD 27–30',
  },
  {
    id: 'four-gospels-thumb',
    w: 1200, h: 628,
    dst: 'stories/compilations/four-gospels-thumb.jpg',
    title: '四福音書地圖',
    subtitle: '馬太・馬可・路加・約翰',
    badge: 'AD 27–30',
  },
  {
    id: 'silk-road-2000-cover',
    w: 1080, h: 1080,
    dst: 'stories/compilations/silk-road-2000-cover.jpg',
    title: '絲路 2000 年',
    subtitle: '同一條走廊三段足跡',
    badge: 'BC 138 — AD 1295',
  },
  {
    id: 'silk-road-2000-thumb',
    w: 1200, h: 628,
    dst: 'stories/compilations/silk-road-2000-thumb.jpg',
    title: '絲路 2000 年',
    subtitle: '張騫・玄奘・馬可波羅',
    badge: 'BC 138 — AD 1295',
  },
  {
    id: 'church-cover',
    w: 1200, h: 630,
    dst: 'church/cover.jpg',
    title: '教會 × TrailPaint',
    subtitle: '聖經故事與宣教史的互動地圖',
    badge: '主日學・週報・嵌入',
  },
  {
    id: 'church-og',
    w: 1200, h: 630,
    dst: 'church/og.jpg',
    title: '教會 × TrailPaint',
    subtitle: '保羅三次・四福音書・絲路 2000 年',
    badge: '年代滑桿 + 電子明信片',
  },
  // ── Tier 1+2 完成後新增的 2 合輯（2026-05-04）── //
  {
    id: 'bible-narrative-cover',
    w: 1080, h: 1080,
    dst: 'stories/compilations/bible-narrative-cover.jpg',
    title: '聖經敘事年代軸',
    subtitle: '貫穿全本聖經 1500 年',
    badge: 'BC 1446 — AD 95',
  },
  {
    id: 'bible-narrative-thumb',
    w: 1200, h: 628,
    dst: 'stories/compilations/bible-narrative-thumb.jpg',
    title: '聖經敘事年代軸',
    subtitle: '出埃及 → 大衛 → 巴比倫 → 耶穌 → 保羅 → 啟示錄',
    badge: 'BC 1446 — AD 95',
  },
  {
    id: 'great-century-cover',
    w: 1080, h: 1080,
    dst: 'stories/compilations/great-century-cover.jpg',
    title: '十九世紀大宣教世紀',
    subtitle: '西方宣教士進入中國與台灣',
    badge: 'AD 1853 — 1923',
  },
  {
    id: 'great-century-thumb',
    w: 1200, h: 628,
    dst: 'stories/compilations/great-century-thumb.jpg',
    title: '十九世紀大宣教世紀',
    subtitle: '戴德生・馬偕・巴克禮・蘭大衛',
    badge: 'AD 1853 — 1923',
  },
  // ── Tier 3 補完合輯（2026-05-04）── //
  {
    id: 'age-of-discovery-cover',
    w: 1080, h: 1080,
    dst: 'stories/compilations/age-of-discovery-cover.jpg',
    title: '大航海時代 500 年',
    subtitle: '從馬可波羅到庫克',
    badge: 'AD 1271 — 1779',
  },
  {
    id: 'age-of-discovery-thumb',
    w: 1200, h: 628,
    dst: 'stories/compilations/age-of-discovery-thumb.jpg',
    title: '大航海時代 500 年',
    subtitle: '馬可波羅・鄭和・哥倫布・麥哲倫・庫克',
    badge: 'AD 1271 — 1779',
  },
  {
    id: 'mission-east-cover',
    w: 1080, h: 1080,
    dst: 'stories/compilations/mission-east-cover.jpg',
    title: '西方宣教士東進 350 年',
    subtitle: '從利瑪竇到台灣宣教士',
    badge: 'AD 1582 — 1923',
  },
  {
    id: 'mission-east-thumb',
    w: 1200, h: 628,
    dst: 'stories/compilations/mission-east-thumb.jpg',
    title: '西方宣教士東進',
    subtitle: '利瑪竇・凱瑞・戴德生・馬偕',
    badge: 'AD 1582 — 1923',
  },
];

/** Compose the placeholder HTML for a single spec. Title scales with image
 *  height to keep it readable on both 1080×1080 (square) and 1200×628 (wide). */
function makeHtml(spec) {
  const titleSize = Math.round(spec.h * 0.11);
  const subtitleSize = Math.round(spec.h * 0.045);
  const badgeSize = Math.round(spec.h * 0.035);
  const leafSize = Math.round(spec.h * 0.18);
  return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; }
  body {
    width: ${spec.w}px; height: ${spec.h}px;
    background: radial-gradient(circle at 30% 35%, #2a1408 0%, #1c0a00 60%, #0e0500 100%);
    color: #fde68a;
    font-family: 'Cormorant Garamond', 'EB Garamond', 'Noto Serif TC', 'Times New Roman', serif;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
    text-align: center;
  }
  /* Ink-grid texture, hand-drawn feel without external assets */
  body::before {
    content: '';
    position: absolute; inset: 0;
    background:
      repeating-linear-gradient(
        90deg,
        rgba(212,165,116,0.04) 0 1px,
        transparent 1px 80px
      ),
      repeating-linear-gradient(
        0deg,
        rgba(212,165,116,0.04) 0 1px,
        transparent 1px 80px
      );
    pointer-events: none;
  }
  /* Vignette */
  body::after {
    content: '';
    position: absolute; inset: 0;
    box-shadow: inset 0 0 ${Math.round(spec.h * 0.3)}px rgba(0,0,0,0.7);
    pointer-events: none;
  }
  .leaf {
    font-size: ${leafSize}px;
    line-height: 1;
    margin-bottom: ${Math.round(spec.h * 0.025)}px;
    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
  }
  .title {
    font-size: ${titleSize}px;
    font-weight: 600;
    color: #fde68a;
    letter-spacing: 0.03em;
    margin: 0;
    line-height: 1.1;
    text-shadow: 0 2px 12px rgba(0,0,0,0.6);
  }
  .subtitle {
    font-size: ${subtitleSize}px;
    color: #d4a574;
    margin: ${Math.round(spec.h * 0.02)}px 0 0;
    font-style: italic;
    letter-spacing: 0.05em;
  }
  .badge {
    margin-top: ${Math.round(spec.h * 0.04)}px;
    padding: ${Math.round(spec.h * 0.012)}px ${Math.round(spec.h * 0.03)}px;
    border: 1px solid #78350f;
    border-radius: 999px;
    background: rgba(120,53,15,0.25);
    color: #fde68a;
    font-size: ${badgeSize}px;
    letter-spacing: 0.15em;
  }
  .watermark {
    position: absolute;
    bottom: ${Math.round(spec.h * 0.03)}px;
    right: ${Math.round(spec.w * 0.025)}px;
    font-size: ${Math.round(spec.h * 0.022)}px;
    color: rgba(212,165,116,0.55);
    letter-spacing: 0.18em;
    font-family: 'Helvetica Neue', sans-serif;
  }
</style></head>
<body>
  <div class="leaf">🌿</div>
  <h1 class="title">${escapeHtml(spec.title)}</h1>
  <div class="subtitle">${escapeHtml(spec.subtitle)}</div>
  <div class="badge">${escapeHtml(spec.badge)}</div>
  <div class="watermark">TRAILPAINT 路小繪</div>
</body></html>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function run() {
  if (!existsSync(CHROME)) {
    console.error(`Chrome not found at ${CHROME}`);
    process.exit(1);
  }
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });

  for (const spec of SPECS) {
    const htmlPath = resolve(TMP, `${spec.id}.html`);
    const pngPath = resolve(TMP, `${spec.id}.png`);
    const dstPath = resolve(REPO, spec.dst);

    writeFileSync(htmlPath, makeHtml(spec), 'utf8');

    // Chrome headless screenshot — --window-size pins viewport so CSS
    // pixel values match the image dimensions exactly.
    execSync(
      `"${CHROME}" --headless=new --disable-gpu --hide-scrollbars ` +
      `--window-size=${spec.w},${spec.h} ` +
      `--screenshot="${pngPath}" "file://${htmlPath}"`,
      { stdio: 'pipe' },
    );

    // sips converts PNG → JPG; -s formatOptions 85 keeps file under ~200KB
    // while preserving the 🌿 emoji rendering.
    mkdirSync(dirname(dstPath), { recursive: true });
    execSync(
      `sips -s format jpeg -s formatOptions 85 "${pngPath}" --out "${dstPath}"`,
      { stdio: 'pipe' },
    );

    console.log(`✔ ${spec.dst}  (${spec.w}×${spec.h})`);
  }

  rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${SPECS.length} placeholder images regenerated.`);
}

run();
