/**
 * Today's 368 Taiwan townships (NLSC 鄉鎮市區界) → TOWNCODE lookup (020 D2).
 * Every candidate is re-assigned by its own coordinates; source-provided
 * district fields are not trusted (old district names, wrong districts).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const TOWNS_GEOJSON = join(__dirname, '..', '..', '..', '..', 'data', 'geo', 'tw-towns.geojson');

let cache = null;

/** Load once: [{ towncode, county, town, polygons: [[ring, ...holes], ...], bbox }] */
export function loadTowns(path = TOWNS_GEOJSON) {
  if (cache && cache.path === path) return cache.towns;
  const fc = JSON.parse(readFileSync(path, 'utf8'));
  const towns = fc.features.map((f) => {
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const poly of polygons) {
      for (const [lng, lat] of poly[0]) {
        w = Math.min(w, lng); e = Math.max(e, lng);
        s = Math.min(s, lat); n = Math.max(n, lat);
      }
    }
    const p = f.properties;
    return { towncode: p.TOWNCODE, county: p.COUNTYNAME, town: p.TOWNNAME, polygons, bbox: [w, s, e, n] };
  });
  cache = { path, towns };
  return towns;
}

/** Even-odd ray cast; ring = [[lng, lat], ...]. */
function inRing(lng, lat, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Inside the outer ring and outside every hole. */
function inPolygon(lng, lat, [outer, ...holes]) {
  return inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h));
}

/** TOWNCODE containing the point, or null (sea / outside Taiwan). */
export function townOf(lat, lng, towns = loadTowns()) {
  for (const t of towns) {
    const [w, s, e, n] = t.bbox;
    if (lng < w || lng > e || lat < s || lat > n) continue;
    if (t.polygons.some((poly) => inPolygon(lng, lat, poly))) return t.towncode;
  }
  return null;
}
