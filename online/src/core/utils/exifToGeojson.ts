import type { ImportBundle } from './geojsonImport';
import { parseExif } from './exifParser';

export const MAX_PHOTO_BATCH = 20;
// Per-photo size cap before EXIF parsing — reject 50MB payloads that would OOM the tab.
// Camera JPEGs are typically 2–5MB; 10MB is generous without inviting abuse.
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Sunflower spread so multiple no-GPS photos anchored to the same point don't
// stack. 35m base radius * sqrt(k) grows gently; golden angle avoids radial
// bands. Visible at street zoom, ignorable at country zoom.
const SPREAD_BASE_RADIUS_M = 35;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const METERS_PER_DEG_LAT = 111320;

export interface ExifStats {
  total: number;
  withGps: number;
  withoutGps: number;
  unreadable: number;
}

type PointFeature = {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    title: string;
    desc: string;
    photoRef: string;
    pendingLocation?: boolean;
  };
};

type Entry = {
  photoRef: string;
  title: string;
  desc: string;
  latlng: [number, number] | null; // [lat, lng]
  takenAt: Date | null;
};

/**
 * Convert a batch of photos to a GeoJSON FeatureCollection via EXIF parsing.
 * - Processes up to MAX_PHOTO_BATCH photos (caller truncates or surfaces toast)
 * - Files larger than MAX_PHOTO_BYTES are counted unreadable (skip EXIF to avoid OOM)
 * - Photos with GPS become Points at their real location
 * - Photos without GPS are anchored near time-adjacent GPS photos in the same
 *   batch (linear interpolation when flanked, nearest when one-sided, centroid
 *   when no takenAt). Only a batch with zero GPS falls back to mapCenter.
 *   All no-GPS photos keep pendingLocation=true so the user can confirm.
 * - Unreadable files (parseExif throws on non-images) are counted in stats.unreadable
 */
export async function exifToGeojson(
  files: File[],
  mapCenter: [number, number], // [lat, lng]
): Promise<ImportBundle & { stats: ExifStats }> {
  const stats: ExifStats = {
    total: files.length,
    withGps: 0,
    withoutGps: 0,
    unreadable: 0,
  };

  const filesToProcess = files.slice(0, MAX_PHOTO_BATCH);
  const entries: Entry[] = [];
  const photoFiles = new Map<string, File>();

  // Pass 1 — read EXIF, build entry list
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    // Yield to the event loop so the UI stays responsive for 20 photos (D2)
    await new Promise((r) => setTimeout(r, 0));

    // Reject oversized files up-front; exifr on 50MB+ payloads OOMs the tab.
    if (file.size > MAX_PHOTO_BYTES) {
      stats.unreadable++;
      continue;
    }

    let exifData;
    try {
      exifData = await parseExif(file);
    } catch {
      // exifr lite only fully decodes JPEG/TIFF; HEIC/PNG/WebP screenshots
      // may throw. Treat any image/* file as "no EXIF" → pendingLocation so
      // the user can drag it onto the map, rather than silently dropping it.
      const isImage =
        file.type.startsWith('image/') ||
        /\.(heic|heif|png|webp|gif|tiff?|jpe?g|bmp|avif)$/i.test(file.name);
      if (!isImage) {
        stats.unreadable++;
        continue;
      }
      exifData = { file, latlng: null, takenAt: null };
    }

    const photoRef = `${file.name}::${i}`;
    photoFiles.set(photoRef, file);

    // Title uses short MM-DD prefix so a multi-day album reads as
    // "01-21 曼谷" / "01-22 清邁" without clutter. Desc keeps the full
    // timestamp for reference.
    const shortDate = exifData.takenAt ? formatShortDate(exifData.takenAt) : null;
    const fullDateTime = exifData.takenAt ? formatDateTime(exifData.takenAt) : null;
    entries.push({
      photoRef,
      title: shortDate ?? file.name.replace(/\.[^.]+$/, ''),
      desc: fullDateTime ?? '',
      latlng: exifData.latlng,
      takenAt: exifData.takenAt,
    });

    if (exifData.latlng) stats.withGps++;
    else stats.withoutGps++;
  }

  // Pass 2 — resolve coordinates for no-GPS entries
  const gpsEntries = entries.filter((e) => e.latlng !== null) as (Entry & {
    latlng: [number, number];
  })[];
  const gpsCentroid = gpsEntries.length > 0 ? centroid(gpsEntries.map((e) => e.latlng)) : null;

  let spreadIdx = 0; // global spread counter across no-GPS entries
  const features: PointFeature[] = entries.map((e) => {
    let coord: [number, number]; // [lat, lng]
    let pending = false;

    if (e.latlng) {
      coord = e.latlng;
    } else {
      pending = true;
      if (gpsEntries.length === 0) {
        // Whole batch has no GPS → fall back to map center
        coord = mapCenter;
      } else {
        const anchor = resolveAnchor(e, gpsEntries, gpsCentroid!);
        spreadIdx++;
        coord = applySpread(anchor, spreadIdx);
      }
    }

    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [coord[1], coord[0]] }, // GeoJSON [lng, lat]
      properties: {
        title: e.title,
        desc: e.desc,
        photoRef: e.photoRef,
        ...(pending && { pendingLocation: true }),
      },
    };
  });

  return {
    featureCollection: { type: 'FeatureCollection', features },
    photoFiles: photoFiles.size > 0 ? photoFiles : undefined,
    stats,
  };
}

/** Pick an anchor lat/lng for a no-GPS entry based on time adjacency. */
function resolveAnchor(
  entry: Entry,
  gpsEntries: (Entry & { latlng: [number, number] })[],
  gpsCentroid: [number, number],
): [number, number] {
  if (!entry.takenAt) return gpsCentroid;

  const t = entry.takenAt.getTime();
  let before: (Entry & { latlng: [number, number] }) | null = null;
  let after: (Entry & { latlng: [number, number] }) | null = null;

  for (const g of gpsEntries) {
    if (!g.takenAt) continue;
    const gt = g.takenAt.getTime();
    if (gt <= t) {
      if (!before || gt > before.takenAt!.getTime()) before = g;
    } else {
      if (!after || gt < after.takenAt!.getTime()) after = g;
    }
  }

  if (before && after) {
    // Linear interpolation by time. Take the short arc in longitude so a batch
    // that straddles the antimeridian (e.g. +179° ↔ -179°) doesn't flip around
    // the globe (2° short arc would otherwise render as a 358° long arc).
    const bt = before.takenAt!.getTime();
    const at = after.takenAt!.getTime();
    const frac = at === bt ? 0 : (t - bt) / (at - bt);
    const lat = before.latlng[0] + (after.latlng[0] - before.latlng[0]) * frac;
    let dLng = after.latlng[1] - before.latlng[1];
    if (dLng > 180) dLng -= 360;
    else if (dLng < -180) dLng += 360;
    let lng = before.latlng[1] + dLng * frac;
    if (lng > 180) lng -= 360;
    else if (lng < -180) lng += 360;
    return [lat, lng];
  }
  if (before) return before.latlng;
  if (after) return after.latlng;
  // No GPS entry has takenAt → fall back to centroid
  return gpsCentroid;
}

/** Average lat/lng of a list of points. */
function centroid(points: [number, number][]): [number, number] {
  const sum = points.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]] as [number, number],
    [0, 0] as [number, number],
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

/** Sunflower-pattern spread so overlapping no-GPS photos don't stack. */
function applySpread(anchor: [number, number], k: number): [number, number] {
  // Near the poles cos(lat) collapses toward zero, so any metric dLng explodes
  // into huge degree offsets; Web Mercator also clamps at ±85°. Return the
  // anchor unchanged — a handful of photos stacking at the pole is better than
  // flinging them across a continent.
  if (Math.abs(anchor[0]) > 84) return anchor;

  const r = SPREAD_BASE_RADIUS_M * Math.sqrt(k);
  const theta = k * GOLDEN_ANGLE;
  const dx = r * Math.cos(theta);
  const dy = r * Math.sin(theta);
  const cosLat = Math.cos((anchor[0] * Math.PI) / 180);
  const dLat = dy / METERS_PER_DEG_LAT;
  const dLng = dx / (METERS_PER_DEG_LAT * cosLat);

  let lat = anchor[0] + dLat;
  let lng = anchor[1] + dLng;
  if (lat > 85) lat = 85;
  else if (lat < -85) lat = -85;
  if (lng > 180) lng -= 360;
  else if (lng < -180) lng += 360;
  return [lat, lng];
}

function formatShortDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

function formatDateTime(date: Date): string {
  // Use local methods so EXIF DateTimeOriginal displays as the original
  // camera wall-clock time. exifr interprets the EXIF string with the
  // viewer's local TZ; read-back via local methods yields the original
  // wall-clock unchanged — accurate for the common "captured locally,
  // viewed locally" case without extra OffsetTimeOriginal parsing.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
