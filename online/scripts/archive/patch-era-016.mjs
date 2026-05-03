#!/usr/bin/env node
/**
 * One-shot patch: add `era` field to historical-story spots so the
 * 016 TimeSlider's chronological compilation playback + spot fade work.
 *
 * Era values per segment are written below — same `{ start, end }` applied
 * to every spot in that segment (segment-level granularity is enough for
 * dramatic fade; future spec may refine to spot-level if needed).
 *
 * Re-runnable: overwriting `era` is idempotent, but skip if you've already
 * patched a segment to spot-level era.
 *
 * Run:
 *   node online/scripts/archive/patch-era-016.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const ERA_MAP = {
  // Paul's three missionary journeys (Acts 13-28)
  'paul/first-journey':              { start: 46,    end: 48 },
  'paul/second-journey':             { start: 49,    end: 52 },
  'paul/to-rome':                    { start: 60,    end: 62 },

  // Jesus' Galilean ministry → Transfiguration → Passion Week
  'jesus-galilee/early-galilee':     { start: 27,    end: 29 },
  'jesus-galilee/transfiguration-road': { start: 29, end: 30 },
  'passion-week/entry':              { start: 30,    end: 30 },
  'passion-week/passion':            { start: 30,    end: 30 },
  'passion-week/resurrection':       { start: 30,    end: 30 },

  // Silk Road historical figures
  'zhang-qian/first-mission':        { start: -138,  end: -126 },
  'zhang-qian/second-mission':       { start: -119,  end: -115 },
  'xuanzang/west':                   { start: 629,   end: 633 },
  'xuanzang/return':                 { start: 643,   end: 645 },
  'marco-polo/east-journey':         { start: 1271,  end: 1275 },
  'marco-polo/west-return':          { start: 1291,  end: 1295 },

  // Song-Yuan transition + late-Ming explorer
  'wen-tianxiang/southern-retreat':  { start: 1275,  end: 1278 },
  'wen-tianxiang/northern-captivity':{ start: 1278,  end: 1283 },
  'xu-xiake/southwest-journey':      { start: 1636,  end: 1640 },
};

let totalSegments = 0;
let totalSpots = 0;

for (const [seg, era] of Object.entries(ERA_MAP)) {
  const filePath = path.join(REPO_ROOT, 'stories', `${seg}.trailpaint.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP (missing): ${seg}`);
    continue;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.spots)) {
    console.warn(`SKIP (no spots array): ${seg}`);
    continue;
  }
  for (const spot of data.spots) {
    spot.era = { start: era.start, end: era.end };
  }
  // Preserve trailing newline if the original had one (most editors add it)
  const trailingNewline = raw.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + trailingNewline, 'utf-8');
  totalSegments += 1;
  totalSpots += data.spots.length;
  const fmtYear = (y) => (y < 0 ? `BC ${-y}` : `AD ${y}`);
  console.log(
    `${seg.padEnd(40)} → ${data.spots.length} spots × era { ${fmtYear(era.start)} – ${fmtYear(era.end)} }`,
  );
}

console.log(`\nDone. Patched ${totalSegments} segments / ${totalSpots} spots.`);
