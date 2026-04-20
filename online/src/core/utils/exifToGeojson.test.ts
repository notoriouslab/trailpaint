import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exifToGeojson, MAX_PHOTO_BATCH, MAX_PHOTO_BYTES } from './exifToGeojson';

// Mock parseExif so we can control EXIF data per file
vi.mock('./exifParser', () => ({
  parseExif: vi.fn(),
}));

import { parseExif } from './exifParser';

const mockParseExif = parseExif as any;

describe('exifToGeojson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle single photo with GPS and DateTimeOriginal', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDate = new Date(2026, 3, 18, 14, 30);

    mockParseExif.mockResolvedValueOnce({
      file: mockFile,
      latlng: [25.0442, 121.5628],
      takenAt: mockDate,
    });

    const result = await exifToGeojson([mockFile], [25.05, 121.56]);

    expect(result.featureCollection.type).toBe('FeatureCollection');
    expect(result.featureCollection.features).toHaveLength(1);

    const feature = result.featureCollection.features[0];
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    expect(feature.geometry.coordinates).toEqual([121.5628, 25.0442]);
    expect(feature.properties.title).toBe('04-18');
    expect(feature.properties.desc).toBe('2026-04-18 14:30');
    expect(feature.properties.photoRef).toBe('photo.jpg::0');
    expect(feature.properties.pendingLocation).toBeUndefined();

    expect(result.stats.total).toBe(1);
    expect(result.stats.withGps).toBe(1);
    expect(result.stats.withoutGps).toBe(0);

    expect(result.photoFiles?.has('photo.jpg::0')).toBe(true);
    expect(result.photoFiles?.get('photo.jpg::0')).toBe(mockFile);
  });

  it('should handle photo without GPS (pendingLocation)', async () => {
    const mockFile = new File(['test'], 'photo-no-gps.jpg', { type: 'image/jpeg' });
    const mockDate = new Date(2026, 3, 18, 14, 30);
    const mapCenter: [number, number] = [25.05, 121.56];

    mockParseExif.mockResolvedValueOnce({
      file: mockFile,
      latlng: null,
      takenAt: mockDate,
    });

    const result = await exifToGeojson([mockFile], mapCenter);

    const feature = result.featureCollection.features[0];
    expect(feature.geometry.coordinates).toEqual([121.56, 25.05]); // [lng, lat] from mapCenter [lat, lng]
    expect(feature.properties.pendingLocation).toBe(true);
    expect(feature.properties.title).toBe('04-18');
    expect(feature.properties.desc).toBe('2026-04-18 14:30');

    expect(result.stats.withoutGps).toBe(1);
  });

  it('should fallback to filename when no DateTimeOriginal', async () => {
    const mockFile = new File(['test'], 'my-photo.jpg', { type: 'image/jpeg' });

    mockParseExif.mockResolvedValueOnce({
      file: mockFile,
      latlng: [25.0442, 121.5628],
      takenAt: null,
    });

    const result = await exifToGeojson([mockFile], [25.05, 121.56]);

    const feature = result.featureCollection.features[0];
    expect(feature.properties.title).toBe('my-photo');
  });

  it('should handle MAX_PHOTO_BATCH limit', async () => {
    const files = Array.from({ length: 25 }, (_, i) =>
      new File(['test'], `photo-${i}.jpg`, { type: 'image/jpeg' })
    );

    mockParseExif.mockImplementation((file: File) =>
      Promise.resolve({
        file,
        latlng: [25.05, 121.56],
        takenAt: new Date(2026, 3, 18, 14, 30),
      })
    );

    const result = await exifToGeojson(files, [25.05, 121.56]);

    expect(result.featureCollection.features).toHaveLength(MAX_PHOTO_BATCH); // 20
    expect(result.stats.total).toBe(25);
    expect(result.stats.withGps).toBe(MAX_PHOTO_BATCH); // 20
    expect(result.photoFiles?.size).toBe(MAX_PHOTO_BATCH); // 20
  });

  it('should handle mixed GPS/no-GPS photos', async () => {
    const file1 = new File(['test'], 'with-gps.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test'], 'no-gps.jpg', { type: 'image/jpeg' });
    const file3 = new File(['test'], 'with-gps-2.jpg', { type: 'image/jpeg' });

    mockParseExif
      .mockResolvedValueOnce({
        file: file1,
        latlng: [25.0442, 121.5628],
        takenAt: new Date(2026, 3, 18, 14, 30),
      })
      .mockResolvedValueOnce({
        file: file2,
        latlng: null,
        takenAt: new Date(2026, 3, 18, 14, 31),
      })
      .mockResolvedValueOnce({
        file: file3,
        latlng: [25.0443, 121.5628],
        takenAt: new Date(2026, 3, 18, 14, 32),
      });

    const result = await exifToGeojson([file1, file2, file3], [25.05, 121.56]);

    expect(result.featureCollection.features).toHaveLength(3);
    expect(result.stats.withGps).toBe(2);
    expect(result.stats.withoutGps).toBe(1);

    // Check pendingLocation flag
    expect(result.featureCollection.features[0].properties.pendingLocation).toBeUndefined();
    expect(result.featureCollection.features[1].properties.pendingLocation).toBe(true);
    expect(result.featureCollection.features[2].properties.pendingLocation).toBeUndefined();
  });

  it('should disambiguate same filename with index', async () => {
    const file1 = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    mockParseExif.mockImplementation((file: File) =>
      Promise.resolve({
        file,
        latlng: [25.05, 121.56],
        takenAt: new Date(2026, 3, 18, 14, 30),
      })
    );

    const result = await exifToGeojson([file1, file2], [25.05, 121.56]);

    const refs = result.featureCollection.features.map((f) => f.properties.photoRef);
    expect(refs).toEqual(['photo.jpg::0', 'photo.jpg::1']);
  });

  it('should yield to event loop between files', async () => {
    const files = [
      new File(['test'], 'photo1.jpg', { type: 'image/jpeg' }),
      new File(['test'], 'photo2.jpg', { type: 'image/jpeg' }),
    ];

    const timeoutSpy = vi.spyOn(global, 'setTimeout');

    mockParseExif.mockImplementation((file: File) =>
      Promise.resolve({
        file,
        latlng: [25.05, 121.56],
        takenAt: new Date(2026, 3, 18, 14, 30),
      })
    );

    await exifToGeojson(files, [25.05, 121.56]);

    // Should call setTimeout at least once (per file)
    expect(timeoutSpy).toHaveBeenCalled();
    timeoutSpy.mockRestore();
  });

  it('should handle empty file list', async () => {
    const result = await exifToGeojson([], [25.05, 121.56]);

    expect(result.featureCollection.features).toHaveLength(0);
    expect(result.stats.total).toBe(0);
    expect(result.stats.withGps).toBe(0);
    expect(result.photoFiles).toBeUndefined();
  });

  it('rejects files over MAX_PHOTO_BYTES without calling parseExif (OOM defence)', async () => {
    // Create a File whose .size reports >10MB without actually allocating it
    const oversized = new File(['tiny'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(oversized, 'size', { value: MAX_PHOTO_BYTES + 1 });

    const result = await exifToGeojson([oversized], [25, 121]);

    expect(mockParseExif).not.toHaveBeenCalled();
    expect(result.featureCollection.features).toHaveLength(0);
    expect(result.stats.unreadable).toBe(1);
    expect(result.stats.total).toBe(1);
  });

  it('counts only non-image files as unreadable (images with bad EXIF go pending)', async () => {
    const good = new File(['test'], 'good.jpg', { type: 'image/jpeg' });
    const nonImage = new File(['test'], 'bad.bin', { type: 'application/octet-stream' });

    mockParseExif
      .mockResolvedValueOnce({
        file: good,
        latlng: [25.05, 121.56],
        takenAt: new Date(2026, 3, 18, 14, 30),
      })
      .mockRejectedValueOnce(new Error('Invalid image'));

    const result = await exifToGeojson([good, nonImage], [25.05, 121.56]);

    expect(result.featureCollection.features).toHaveLength(1);
    expect(result.featureCollection.features[0].properties.title).toBe('04-18');
    expect(result.stats.total).toBe(2);
    expect(result.stats.withGps).toBe(1);
    expect(result.stats.withoutGps).toBe(0);
    expect(result.stats.unreadable).toBe(1);
  });

  it('HEIC / PNG / other image/* files with exifr throw are treated as pendingLocation (not unreadable)', async () => {
    const heic = new File(['heic bytes'], 'IMG_9928.HEIC', { type: 'image/heic' });
    const pngByExt = new File(['png bytes'], 'screenshot.png', { type: '' });

    mockParseExif
      .mockRejectedValueOnce(new Error('exifr cannot decode HEIC'))
      .mockRejectedValueOnce(new Error('no EXIF'));

    const result = await exifToGeojson([heic, pngByExt], [25, 121]);

    expect(result.featureCollection.features).toHaveLength(2);
    expect(result.featureCollection.features[0].properties.pendingLocation).toBe(true);
    expect(result.featureCollection.features[0].properties.title).toBe('IMG_9928');
    expect(result.featureCollection.features[1].properties.pendingLocation).toBe(true);
    expect(result.stats.unreadable).toBe(0);
    expect(result.stats.withoutGps).toBe(2);
  });

  it('no-GPS photo interpolates between flanking GPS photos by time', async () => {
    const f1 = new File(['test'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['test'], 'b.jpg', { type: 'image/jpeg' });
    const f3 = new File(['test'], 'c.jpg', { type: 'image/jpeg' });

    mockParseExif
      .mockResolvedValueOnce({ file: f1, latlng: [25.00, 121.00], takenAt: new Date(2026, 3, 18, 14, 0) })
      .mockResolvedValueOnce({ file: f2, latlng: null,              takenAt: new Date(2026, 3, 18, 14, 30) })
      .mockResolvedValueOnce({ file: f3, latlng: [25.10, 121.20], takenAt: new Date(2026, 3, 18, 15, 0) });

    // mapCenter is Taiwan; middle photo must NOT end up there.
    const result = await exifToGeojson([f1, f2, f3], [23.5, 121.0]);

    const [lng, lat] = result.featureCollection.features[1].geometry.coordinates;
    // frac = 0.5 → interpolated anchor (25.05, 121.10) + sunflower spread.
    // Tight ±0.001° (≈ 111m) so a spread bug can't hide inside the window.
    expect(lat).toBeGreaterThan(25.049);
    expect(lat).toBeLessThan(25.051);
    expect(lng).toBeGreaterThan(121.099);
    expect(lng).toBeLessThan(121.101);
    expect(result.featureCollection.features[1].properties.pendingLocation).toBe(true);
  });

  it('interpolates along the short arc across the antimeridian (+179° ↔ -179°)', async () => {
    const f1 = new File(['test'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['test'], 'b.jpg', { type: 'image/jpeg' });
    const f3 = new File(['test'], 'c.jpg', { type: 'image/jpeg' });

    mockParseExif
      .mockResolvedValueOnce({ file: f1, latlng: [0, 179.9],  takenAt: new Date(2026, 3, 18, 14, 0) })
      .mockResolvedValueOnce({ file: f2, latlng: null,         takenAt: new Date(2026, 3, 18, 14, 30) })
      .mockResolvedValueOnce({ file: f3, latlng: [0, -179.9], takenAt: new Date(2026, 3, 18, 15, 0) });

    const result = await exifToGeojson([f1, f2, f3], [23.5, 121.0]);

    const [lng] = result.featureCollection.features[1].geometry.coordinates;
    // Short-arc interp crosses ±180°; naive linear would land near 0° (wrong hemisphere).
    const absLng = Math.abs(lng);
    expect(absLng).toBeGreaterThan(179);
    expect(absLng).toBeLessThanOrEqual(180);
  });

  it('does not spread photos anchored near the poles (|lat|>84°)', async () => {
    const f1 = new File(['test'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['test'], 'b.jpg', { type: 'image/jpeg' });
    const f3 = new File(['test'], 'c.jpg', { type: 'image/jpeg' });

    mockParseExif
      .mockResolvedValueOnce({ file: f1, latlng: [87.0, 0], takenAt: new Date(2026, 3, 18, 14, 0) })
      .mockResolvedValueOnce({ file: f2, latlng: null,        takenAt: new Date(2026, 3, 18, 14, 10) })
      .mockResolvedValueOnce({ file: f3, latlng: null,        takenAt: new Date(2026, 3, 18, 14, 20) });

    const result = await exifToGeojson([f1, f2, f3], [0, 0]);
    const [lng, lat] = result.featureCollection.features[1].geometry.coordinates;
    // Pole-safe: return anchor verbatim instead of flinging dLng to infinity
    expect(lat).toBe(87.0);
    expect(lng).toBe(0);
  });

  it('no-GPS photo before all GPS photos snaps to the earliest GPS anchor', async () => {
    const f1 = new File(['test'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['test'], 'b.jpg', { type: 'image/jpeg' });

    mockParseExif
      .mockResolvedValueOnce({ file: f1, latlng: null,              takenAt: new Date(2026, 3, 18, 8, 0) })
      .mockResolvedValueOnce({ file: f2, latlng: [40.00, -74.00], takenAt: new Date(2026, 3, 18, 9, 0) });

    const result = await exifToGeojson([f1, f2], [23.5, 121.0]);

    const [lng, lat] = result.featureCollection.features[0].geometry.coordinates;
    // Anchored near f2, not mapCenter; spread < 100m
    expect(lat).toBeGreaterThan(39.99);
    expect(lat).toBeLessThan(40.01);
    expect(lng).toBeGreaterThan(-74.01);
    expect(lng).toBeLessThan(-73.99);
  });

  it('no-GPS photo without takenAt falls back to GPS centroid, not mapCenter', async () => {
    const f1 = new File(['test'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['test'], 'b.jpg', { type: 'image/jpeg' });
    const f3 = new File(['test'], 'c.jpg', { type: 'image/jpeg' });

    mockParseExif
      .mockResolvedValueOnce({ file: f1, latlng: [10.00, 20.00], takenAt: null })
      .mockResolvedValueOnce({ file: f2, latlng: null,             takenAt: null })
      .mockResolvedValueOnce({ file: f3, latlng: [12.00, 22.00], takenAt: null });

    const result = await exifToGeojson([f1, f2, f3], [23.5, 121.0]);

    const [lng, lat] = result.featureCollection.features[1].geometry.coordinates;
    // Centroid of (10,20) and (12,22) = (11,21); spread < 100m
    expect(lat).toBeGreaterThan(10.99);
    expect(lat).toBeLessThan(11.01);
    expect(lng).toBeGreaterThan(20.99);
    expect(lng).toBeLessThan(21.01);
  });

  it('whole batch with no GPS still falls back to mapCenter', async () => {
    const f1 = new File(['test'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['test'], 'b.jpg', { type: 'image/jpeg' });

    mockParseExif
      .mockResolvedValueOnce({ file: f1, latlng: null, takenAt: new Date(2026, 3, 18, 14, 0) })
      .mockResolvedValueOnce({ file: f2, latlng: null, takenAt: new Date(2026, 3, 18, 14, 30) });

    const mapCenter: [number, number] = [23.5, 121.0];
    const result = await exifToGeojson([f1, f2], mapCenter);

    for (const feat of result.featureCollection.features) {
      expect(feat.geometry.coordinates).toEqual([121.0, 23.5]); // [lng, lat]
      expect(feat.properties.pendingLocation).toBe(true);
    }
  });

  it('multiple no-GPS photos sharing an anchor spread to distinct points', async () => {
    const f1 = new File(['test'], 'a.jpg', { type: 'image/jpeg' });
    const f2 = new File(['test'], 'b.jpg', { type: 'image/jpeg' });
    const f3 = new File(['test'], 'c.jpg', { type: 'image/jpeg' });

    mockParseExif
      .mockResolvedValueOnce({ file: f1, latlng: [25.00, 121.00], takenAt: new Date(2026, 3, 18, 14, 0) })
      .mockResolvedValueOnce({ file: f2, latlng: null,              takenAt: new Date(2026, 3, 18, 14, 10) })
      .mockResolvedValueOnce({ file: f3, latlng: null,              takenAt: new Date(2026, 3, 18, 14, 20) });

    const result = await exifToGeojson([f1, f2, f3], [23.5, 121.0]);

    const c2 = result.featureCollection.features[1].geometry.coordinates;
    const c3 = result.featureCollection.features[2].geometry.coordinates;
    // Both anchor on f1 (only one-sided GPS), but spread must differ
    expect(c2).not.toEqual(c3);
  });

  it('should format DateTimeOriginal as YYYY-MM-DD HH:mm', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDate = new Date(2026, 3, 18, 9, 5, 30); // local 09:05:30

    mockParseExif.mockResolvedValueOnce({
      file: mockFile,
      latlng: [25.05, 121.56],
      takenAt: mockDate,
    });

    const result = await exifToGeojson([mockFile], [25.05, 121.56]);

    const feature = result.featureCollection.features[0];
    expect(feature.properties.title).toBe('04-18');
    expect(feature.properties.desc).toBe('2026-04-18 09:05');
  });
});
