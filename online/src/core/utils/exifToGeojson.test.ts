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
    const mockDate = new Date('2026-04-18T14:30:00Z');

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
    expect(feature.properties.title).toBe('2026-04-18 14:30');
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
    const mockDate = new Date('2026-04-18T14:30:00Z');
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
    expect(feature.properties.title).toBe('2026-04-18 14:30');

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
        takenAt: new Date('2026-04-18T14:30:00Z'),
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
        takenAt: new Date('2026-04-18T14:30:00Z'),
      })
      .mockResolvedValueOnce({
        file: file2,
        latlng: null,
        takenAt: new Date('2026-04-18T14:31:00Z'),
      })
      .mockResolvedValueOnce({
        file: file3,
        latlng: [25.0443, 121.5628],
        takenAt: new Date('2026-04-18T14:32:00Z'),
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
        takenAt: new Date('2026-04-18T14:30:00Z'),
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
        takenAt: new Date('2026-04-18T14:30:00Z'),
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

  it('counts unreadable files in stats + skips them (no feature produced)', async () => {
    const good = new File(['test'], 'good.jpg', { type: 'image/jpeg' });
    const bad = new File(['test'], 'bad.bin', { type: 'application/octet-stream' });

    mockParseExif
      .mockResolvedValueOnce({
        file: good,
        latlng: [25.05, 121.56],
        takenAt: new Date('2026-04-18T14:30:00Z'),
      })
      .mockRejectedValueOnce(new Error('Invalid image'));

    const result = await exifToGeojson([good, bad], [25.05, 121.56]);

    expect(result.featureCollection.features).toHaveLength(1);
    expect(result.featureCollection.features[0].properties.title).toBe('2026-04-18 14:30');
    expect(result.stats.total).toBe(2);
    expect(result.stats.withGps).toBe(1);
    expect(result.stats.withoutGps).toBe(0);
    expect(result.stats.unreadable).toBe(1);
  });

  it('should format DateTimeOriginal as YYYY-MM-DD HH:mm', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDate = new Date('2026-04-18T09:05:30Z'); // 09:05:30

    mockParseExif.mockResolvedValueOnce({
      file: mockFile,
      latlng: [25.05, 121.56],
      takenAt: mockDate,
    });

    const result = await exifToGeojson([mockFile], [25.05, 121.56]);

    const feature = result.featureCollection.features[0];
    expect(feature.properties.title).toBe('2026-04-18 09:05');
  });
});
