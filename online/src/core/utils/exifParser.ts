import exifr from 'exifr';
import { MAX_PHOTO_BYTES } from './exifToGeojson';

// EXIF DateTimeOriginal: exactly 'YYYY:MM:DD HH:MM:SS', no tz suffix, no trailing
// bytes. Anchored ^$ rejects null-byte truncation tricks and ISO variants that
// new Date() would silently parse as UTC.
const EXIF_DATETIME_RE = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

// Sane upper bound for HEIC `iloc` item_count. Real iPhone HEICs carry ~2–15
// items (primary image, thumbnail, depth, HDR gain map, Exif, XMP); 1000 is
// already two orders of magnitude above that but cheap to enforce.
const ILOC_ITEM_CAP = 1000;

// Four-char box type at `pos`. Cheap inline ASCII read — HEIC box types are
// always 4 ASCII chars, never UTF-8.
function boxType(v: DataView, pos: number): string {
  return (
    String.fromCharCode(v.getUint8(pos + 4)) +
    String.fromCharCode(v.getUint8(pos + 5)) +
    String.fromCharCode(v.getUint8(pos + 6)) +
    String.fromCharCode(v.getUint8(pos + 7))
  );
}

/**
 * Pre-scan a BMFF (HEIC/HEIF/AVIF) buffer for ExifReader-level DoS signatures
 * before handing it to the library. ExifReader iterates `iloc` items without
 * sanity checks; a malicious file with offsetSize=lengthSize=0 traps it in a
 * 65535×65535 loop that freezes the tab.
 *
 * Returns true if the buffer looks parse-safe. Returns false on the known
 * attack signatures. Unknown / non-BMFF / malformed → true (let the parser
 * handle it, exceptions are caught upstream).
 */
export function isBmffSafeToParse(buf: ArrayBuffer): boolean {
  const max = Math.min(buf.byteLength, 262144);
  if (max < 16) return true; // too small to be any BMFF we care about
  const v = new DataView(buf, 0, max);

  // Must start with a ftyp box; otherwise not a BMFF we need to worry about.
  if (boxType(v, 0) !== 'ftyp') return true;

  // Walk top-level boxes looking for `meta`.
  let pos = 0;
  while (pos + 8 <= max) {
    const size = v.getUint32(pos);
    const type = boxType(v, pos);
    // 64-bit or open-ended size — bail out, let ExifReader try. Common in mdat
    // but we've stopped well before mdat anyway.
    if (size < 8) return true;
    if (type === 'meta') {
      // `meta` is a FullBox: 4 bytes version+flags before sub-boxes.
      const metaEnd = Math.min(pos + size, max);
      let q = pos + 8 + 4;
      while (q + 8 <= metaEnd) {
        const sub = v.getUint32(q);
        if (sub < 8) return true;
        if (boxType(v, q) === 'iloc') {
          // FullBox header (version + flags) at q+8..q+11, iloc payload starts q+12.
          const ilocVersion = v.getUint8(q + 8);
          const sizeByte = v.getUint8(q + 12);
          const offsetSize = (sizeByte >> 4) & 0x0f;
          const lengthSize = sizeByte & 0x0f;
          // Attack signature: offsetSize and lengthSize both zero means each
          // extent iteration advances by zero — 65535×65535 never terminates.
          if (offsetSize === 0 && lengthSize === 0) return false;
          // itemCount width depends on iloc version.
          const itemCount =
            ilocVersion < 2 ? v.getUint16(q + 14) : v.getUint32(q + 14);
          if (itemCount > ILOC_ITEM_CAP) return false;
          return true;
        }
        q += sub;
      }
      return true;
    }
    pos += size;
  }
  return true;
}

export interface ExifData {
  file: File;
  latlng: [number, number] | null; // [lat, lng] — TrailPaint convention; null when EXIF has no GPS
  takenAt: Date | null;
}

function inRange(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    isFinite(lat) &&
    isFinite(lng) &&
    // Range guard: reject malicious/corrupt EXIF that passes isFinite but lies
    // outside the WGS84 domain; downstream cos(lat) and Mercator projection
    // will produce nonsense coordinates otherwise.
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    // Null Island: (0, 0) is a valid WGS84 coordinate in the Gulf of Guinea but
    // in practice means "uninitialized GPS chip". Reject so the photo falls
    // into pendingLocation instead of being pinned to the ocean.
    !(lat === 0 && lng === 0)
  );
}

/**
 * Read GPS + DateTimeOriginal from a photo's EXIF data.
 * Throws if the file cannot be parsed as an image (e.g. corrupt or non-image).
 * Returns nullable fields when the file parses but lacks GPS or timestamp.
 */
export async function parseExif(file: File): Promise<ExifData> {
  // Defence in depth: callers should already have filtered oversized files,
  // but parseExif may be reused elsewhere. Reject before touching EXIF so a
  // 500MB HEIC can't OOM the tab through the fallback's arrayBuffer() read.
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('照片超過大小限制');
  }

  // exifr throws on unreadable input — we let that propagate so the caller
  // (exifToGeojson) can distinguish unreadable from "readable but missing EXIF".
  //
  // Two calls instead of one:
  // - exifr.gps() is a dedicated helper that always enables the GPS IFD and
  //   returns translated { latitude, longitude } decimals (handles iPhone HEIC
  //   containers reliably where the pick-array shortcut on exifr.parse does not).
  // - exifr.parse() with a pick list is cheapest for just the timestamp.
  // exifr reads the file bytes once internally for each call; Blob.arrayBuffer
  // is cached by the browser so there is no duplicate I/O.
  const [gps, meta] = await Promise.all([
    exifr.gps(file).catch(() => null),
    exifr.parse(file, ['DateTimeOriginal']).catch(() => null),
  ]);

  let latlng: [number, number] | null = null;
  if (gps && inRange(gps.latitude, gps.longitude)) {
    latlng = [gps.latitude, gps.longitude];
  }

  let takenAt: Date | null = null;
  if (meta?.DateTimeOriginal) {
    const candidate =
      meta.DateTimeOriginal instanceof Date
        ? meta.DateTimeOriginal
        : new Date(meta.DateTimeOriginal);
    if (!isNaN(candidate.getTime())) takenAt = candidate;
  }

  // Fallback: exifr rejects newer HEIC containers (e.g. iOS adaptive-HDR with
  // `tmap` brand pushes ftyp size past exifr's hard-coded ≤50 check) as
  // "Unknown file format" even though the EXIF payload is intact. Retry with
  // ExifReader only when exifr gave up on the file entirely, so normal photos
  // without GPS still short-circuit after a single pass.
  if (gps === null && meta === null) {
    try {
      // Dynamic import keeps exifreader (~34 KB gzip) out of the main bundle;
      // it only loads when we actually hit a HEIC container exifr can't read.
      const [{ default: ExifReader }, buf] = await Promise.all([
        import('exifreader'),
        file.arrayBuffer(),
      ]);
      // Gate ExifReader behind a BMFF sanity scan. Known DoS signatures in the
      // iloc box trap ExifReader's parser in a multi-billion-iteration loop on
      // the main thread; rejecting up front keeps the tab responsive.
      if (!isBmffSafeToParse(buf)) {
        throw new Error('HEIC iloc 結構異常');
      }
      const tags = ExifReader.load(buf, { expanded: true });
      const fLat = tags.gps?.Latitude;
      const fLng = tags.gps?.Longitude;
      if (typeof fLat === 'number' && typeof fLng === 'number' && inRange(fLat, fLng)) {
        latlng = [fLat, fLng];
      }
      const rawDto = tags.exif?.DateTimeOriginal?.description;
      if (typeof rawDto === 'string' && EXIF_DATETIME_RE.test(rawDto)) {
        // EXIF DateTimeOriginal is 'YYYY:MM:DD HH:MM:SS' in the camera's local
        // time. Convert the date separators so Date parses it without forcing
        // UTC, preserving the same local-time semantics exifr uses.
        const iso = rawDto.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
        const d = new Date(iso);
        if (!isNaN(d.getTime())) takenAt = d;
      }
    } catch {
      // fall through — original "無法解析" throw below still fires
    }
  }

  // If both helpers failed outright and the fallback extracted nothing, throw
  // so the caller counts it as unreadable rather than silently pending.
  if (gps === null && meta === null && latlng === null && takenAt === null) {
    throw new Error('無法解析照片 metadata');
  }

  return { file, latlng, takenAt };
}
