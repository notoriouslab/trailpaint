import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseExif } from './exifParser';

vi.mock('exifr', () => ({
  default: {
    parse: vi.fn(),
    gps: vi.fn(),
  },
}));

import exifr from 'exifr';

const mockExifr = exifr as unknown as {
  parse: ReturnType<typeof vi.fn>;
  gps: ReturnType<typeof vi.fn>;
};

describe('parseExif', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reads GPS via exifr.gps() and timestamp via exifr.parse()', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDate = new Date('2026-01-21T06:48:53Z');

    mockExifr.gps.mockResolvedValueOnce({ latitude: 13.7519, longitude: 100.5011 });
    mockExifr.parse.mockResolvedValueOnce({ DateTimeOriginal: mockDate });

    const result = await parseExif(mockFile);

    expect(result.file).toBe(mockFile);
    expect(result.latlng).toEqual([13.7519, 100.5011]);
    expect(result.takenAt).toBe(mockDate);
  });

  it('returns null latlng when gps helper resolves to undefined (no GPS block)', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDate = new Date('2026-04-18T14:30:00Z');

    mockExifr.gps.mockResolvedValueOnce(undefined);
    mockExifr.parse.mockResolvedValueOnce({ DateTimeOriginal: mockDate });

    const result = await parseExif(mockFile);

    expect(result.latlng).toBeNull();
    expect(result.takenAt).toBe(mockDate);
  });

  it('returns latlng only when DateTimeOriginal is missing', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.gps.mockResolvedValueOnce({ latitude: 25.0442, longitude: 121.5628 });
    mockExifr.parse.mockResolvedValueOnce(undefined);

    const result = await parseExif(mockFile);

    expect(result.latlng).toEqual([25.0442, 121.5628]);
    expect(result.takenAt).toBeNull();
  });

  it('returns both null when file is a valid image without EXIF (does not throw)', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.gps.mockResolvedValueOnce(undefined);
    mockExifr.parse.mockResolvedValueOnce(undefined);

    const result = await parseExif(mockFile);

    expect(result.latlng).toBeNull();
    expect(result.takenAt).toBeNull();
  });

  it('throws when both exifr helpers reject (file cannot be parsed at all)', async () => {
    const mockFile = new File(['test'], 'corrupt.bin', { type: 'application/octet-stream' });

    mockExifr.gps.mockRejectedValueOnce(new Error('Invalid image'));
    mockExifr.parse.mockRejectedValueOnce(new Error('Invalid image'));

    await expect(parseExif(mockFile)).rejects.toThrow(/無法解析/);
  });

  it('drops non-finite latitude/longitude values', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.gps.mockResolvedValueOnce({ latitude: NaN, longitude: 100 });
    mockExifr.parse.mockResolvedValueOnce(undefined);

    const result = await parseExif(mockFile);
    expect(result.latlng).toBeNull();
  });

  it('drops Invalid Date from malformed DateTimeOriginal string', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.gps.mockResolvedValueOnce({ latitude: 25, longitude: 121 });
    mockExifr.parse.mockResolvedValueOnce({ DateTimeOriginal: 'totally not a date' });

    const result = await parseExif(mockFile);
    expect(result.takenAt).toBeNull();
    expect(result.latlng).toEqual([25, 121]);
  });

  it('rejects out-of-range latitude/longitude (passes isFinite but outside WGS84)', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    // latitude 200 is finite but bogus → must drop the pair entirely
    mockExifr.gps.mockResolvedValueOnce({ latitude: 200, longitude: 50 });
    mockExifr.parse.mockResolvedValueOnce(undefined);
    expect((await parseExif(mockFile)).latlng).toBeNull();

    mockExifr.gps.mockResolvedValueOnce({ latitude: 40, longitude: 200 });
    mockExifr.parse.mockResolvedValueOnce(undefined);
    expect((await parseExif(mockFile)).latlng).toBeNull();

    mockExifr.gps.mockResolvedValueOnce({ latitude: -90.0001, longitude: 0 });
    mockExifr.parse.mockResolvedValueOnce(undefined);
    expect((await parseExif(mockFile)).latlng).toBeNull();

    // Exact boundaries are accepted
    mockExifr.gps.mockResolvedValueOnce({ latitude: 90, longitude: -180 });
    mockExifr.parse.mockResolvedValueOnce(undefined);
    expect((await parseExif(mockFile)).latlng).toEqual([90, -180]);
  });

  it('converts DateTimeOriginal string to Date when needed', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.gps.mockResolvedValueOnce({ latitude: 25.0442, longitude: 121.5628 });
    mockExifr.parse.mockResolvedValueOnce({ DateTimeOriginal: '2026-04-18T14:30:00Z' });

    const result = await parseExif(mockFile);
    expect(result.takenAt).toBeInstanceOf(Date);
    expect(result.takenAt?.toISOString().startsWith('2026-04-18T14:30')).toBe(true);
  });
});
