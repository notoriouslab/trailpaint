#!/usr/bin/env node
/**
 * Probe which z11 tiles (~20 km) of each Taiwan historical overlay actually
 * contain map content, and write src/map/overlayCoverage.ts (019).
 *
 * Why: the 中研院 tileserver answers 200 with a tiny blank tile where a sheet
 * was never scanned (e.g. 1921 堡圖 has no 高雄/屏東, Corona 1966 no 台南).
 * Without a coverage table the Player picks a map by year and shows nothing.
 *
 *   Run: node online/scripts/probe-overlay-coverage.mjs <counties.geojson> [--only id,id]
 *   (counties.geojson = NLSC 縣市界 in WGS84, used only to skip sea tiles;
 *    --only re-probes the listed overlays and keeps the others from the
 *    existing overlayCoverage.ts — spares the tileserver a full re-run)
 *
 * ~150 land tiles × N overlays, one request every 400 ms. Re-run only when
 * adding a Taiwan overlay.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'map', 'overlayCoverage.ts');
const UA = 'TrailPaint-example-builder/1.0 (https://trailpaint.org; https://github.com/notoriouslab/trailpaint) coverage-probe';
const Z = 11;
/** Blank tiles from the tileserver are 197–936 bytes; real content is larger. */
const MIN_BYTES = 1024;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// overlay id → tileserver img prefix + probe zoom (keep in sync with OVERLAYS in
// overlays.ts). Probe zoom must exist in the layer's pyramid: the 1945 city
// plans start at z12 and answer blank at z11. Finer probes fold into z11 cells.
const LAYERS = {
  jm200k_1897: { img: 'JM200K_1897-png', z: 11 },
  tw_1904: { img: 'JM20K_1904-jpg', z: 11 },
  jm20k_1921: { img: 'JM20K_1921-jpg', z: 11 },
  tw_1945: { img: 'AMCityPlan_1945-png', z: 12 },
  tw_1955: { img: 'TM25K_1955-png', z: 11 },
  corona_1966: { img: 'Taiwan_Corona_1966-png', z: 11 },
  tw_1989: { img: 'TM25K_1989-jpg', z: 11 },
  tw_1993: { img: 'TM25K_1993-jpg', z: 11 },
};

const countiesPath = process.argv[2];
if (!countiesPath) {
  console.error('usage: node probe-overlay-coverage.mjs <counties.geojson> [--only id,id]');
  process.exit(1);
}
const onlyArg = process.argv.indexOf('--only');
const ONLY = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',')) : null;

/** Existing table, so --only can keep the overlays it doesn't re-probe. */
function readExisting() {
  if (!existsSync(OUT)) return {};
  const out = {};
  for (const m of readFileSync(OUT, 'utf8').matchAll(/^ {2}(\w+): new Set\(\[(.*)\]\),$/gm)) {
    out[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }
  return out;
}
const counties = JSON.parse(readFileSync(countiesPath, 'utf8'));
const rings = counties.features.flatMap((f) =>
  f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0]));

function inRing(lon, lat, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const onLand = (lon, lat) => rings.some((r) => inRing(lon, lat, r));

const lon2x = (lon) => Math.floor(((lon + 180) / 360) * 2 ** Z);
const lat2y = (lat) => Math.floor(((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** Z);
const x2lon = (x) => (x / 2 ** Z) * 360 - 180;
const y2lat = (y) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** Z))) * 180) / Math.PI;

// Taiwan + Penghu + Kinmen + Matsu
const [W, S, E, N] = [118.1, 21.8, 122.1, 26.4];
const tiles = [];
for (let x = lon2x(W); x <= lon2x(E); x++) {
  for (let y = lat2y(N); y <= lat2y(S); y++) {
    // 4×4 sample grid inside the tile — small islands still count as land
    let land = false;
    for (let i = 0; i < 4 && !land; i++) {
      for (let j = 0; j < 4 && !land; j++) {
        const lon = x2lon(x + (i + 0.5) / 4);
        const lat = y2lat(y + (j + 0.5) / 4);
        land = onLand(lon, lat);
      }
    }
    if (land) tiles.push([x, y]);
  }
}
console.log(`${tiles.length} land tiles at z${Z}${ONLY ? ` — re-probing ${[...ONLY].join(', ')}` : ''}`);

async function hasContent(img, z, x, y) {
  const url = `https://gis.sinica.edu.tw/tileserver/file-exists.php?img=${img}-${z}-${x}-${y}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    return r.ok && (await r.arrayBuffer()).byteLength > MIN_BYTES;
  } catch {
    return false;
  } finally {
    await sleep(400);
  }
}

const existing = readExisting();
const coverage = {};
for (const [id, { img, z }] of Object.entries(LAYERS)) {
  if (ONLY && !ONLY.has(id)) {
    if (!existing[id]) throw new Error(`--only: no existing coverage for ${id}; run without --only`);
    coverage[id] = existing[id];
    continue;
  }
  const covered = [];
  for (const [x, y] of tiles) {
    // A z11 cell counts as covered if any of its children at the probe zoom has content.
    const k = 2 ** (z - Z);
    let ok = false;
    for (let dx = 0; dx < k && !ok; dx++) {
      for (let dy = 0; dy < k && !ok; dy++) {
        ok = await hasContent(img, z, x * k + dx, y * k + dy);
      }
    }
    if (ok) covered.push(`${x},${y}`);
  }
  coverage[id] = covered;
  console.log(`  ${id.padEnd(12)} ${covered.length}/${tiles.length} (probed at z${z})`);
}

const body = Object.entries(coverage)
  .map(([id, cells]) => `  ${id}: new Set([${cells.map((c) => `'${c}'`).join(', ')}]),`)
  .join('\n');
writeFileSync(OUT, `/* AUTO-GENERATED by online/scripts/probe-overlay-coverage.mjs — do not edit. */
/* Generated ${new Date().toISOString().slice(0, 10)} from ${tiles.length} Taiwan land tiles. */

/** Zoom of the coverage grid: one cell = one z${Z} XYZ tile (~20 km). */
export const COVERAGE_ZOOM = ${Z};

/**
 * Overlay id → z${Z} tiles ("x,y") that actually contain map content.
 * Overlays absent from this map are treated as covering their whole bounds.
 */
export const OVERLAY_COVERAGE: Record<string, ReadonlySet<string>> = {
${body}
};
`);
console.log(`\nwrote ${OUT}`);
