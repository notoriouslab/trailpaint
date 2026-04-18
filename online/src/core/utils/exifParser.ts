import exifr from 'exifr/dist/lite.umd.js';

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
  const data = await exifr.parse(file, {
    gps: true,
    ifd0: false,
    exif: true,
    pick: ['DateTimeOriginal', 'latitude', 'longitude'],
  });

  let latlng: [number, number] | null = null;
  if (data?.latitude !== undefined && data?.longitude !== undefined) {
    latlng = [data.latitude, data.longitude];
  }

  let takenAt: Date | null = null;
  if (data?.DateTimeOriginal) {
    const candidate =
      data.DateTimeOriginal instanceof Date
        ? data.DateTimeOriginal
        : new Date(data.DateTimeOriginal);
    // Reject Invalid Date (e.g. EXIF with garbage timestamp); formatDateTime
    // would otherwise emit "NaN-NaN-NaN NaN:NaN" as the spot title.
    if (!isNaN(candidate.getTime())) takenAt = candidate;
  }

  return { file, latlng, takenAt };
}
