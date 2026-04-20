import exifr from 'exifr';

export interface ExifData {
  file: File;
  latlng: [number, number] | null; // [lat, lng] — TrailPaint convention; null when EXIF has no GPS
  takenAt: Date | null;
}

/**
 * Read GPS + DateTimeOriginal from a photo's EXIF data.
 * Throws if the file cannot be parsed as an image (e.g. corrupt or non-image).
 * Returns nullable fields when the file parses but lacks GPS or timestamp.
 */
export async function parseExif(file: File): Promise<ExifData> {
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
  if (
    gps &&
    typeof gps.latitude === 'number' &&
    typeof gps.longitude === 'number' &&
    isFinite(gps.latitude) &&
    isFinite(gps.longitude) &&
    // Range guard: reject malicious/corrupt EXIF that passes isFinite but lies
    // outside the WGS84 domain; downstream cos(lat) and Mercator projection
    // will produce nonsense coordinates otherwise.
    gps.latitude >= -90 &&
    gps.latitude <= 90 &&
    gps.longitude >= -180 &&
    gps.longitude <= 180
  ) {
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

  // If both helpers failed outright (the file cannot be parsed at all), throw
  // so the caller counts it as unreadable rather than silently pending.
  if (gps === null && meta === null) {
    throw new Error('無法解析照片 metadata');
  }

  return { file, latlng, takenAt };
}
