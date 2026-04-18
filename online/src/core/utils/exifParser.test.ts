import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseExif } from './exifParser';

// Mock exifr
vi.mock('exifr/dist/lite.umd.js', () => ({
  default: {
    parse: vi.fn(),
  },
}));

import exifr from 'exifr/dist/lite.umd.js';

const mockExifr = exifr as any;

describe('parseExif', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should parse EXIF with GPS data, returning [lat, lng] per project convention', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDate = new Date('2026-04-18T14:30:00Z');

    mockExifr.parse.mockResolvedValueOnce({
      latitude: 25.0442,
      longitude: 121.5628,
      DateTimeOriginal: mockDate,
    });

    const result = await parseExif(mockFile);

    expect(result.file).toBe(mockFile);
    expect(result.latlng).toEqual([25.0442, 121.5628]);
    expect(result.takenAt).toBe(mockDate);
  });

  it('should handle file without GPS data', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDate = new Date('2026-04-18T14:30:00Z');

    mockExifr.parse.mockResolvedValueOnce({
      DateTimeOriginal: mockDate,
    });

    const result = await parseExif(mockFile);

    expect(result.file).toBe(mockFile);
    expect(result.latlng).toBeNull();
    expect(result.takenAt).toBe(mockDate);
  });

  it('should handle file with GPS but no DateTimeOriginal', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.parse.mockResolvedValueOnce({
      latitude: 25.0442,
      longitude: 121.5628,
    });

    const result = await parseExif(mockFile);

    expect(result.file).toBe(mockFile);
    expect(result.latlng).toEqual([25.0442, 121.5628]);
    expect(result.takenAt).toBeNull();
  });

  it('should handle file with no EXIF data', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.parse.mockResolvedValueOnce({});

    const result = await parseExif(mockFile);

    expect(result.file).toBe(mockFile);
    expect(result.latlng).toBeNull();
    expect(result.takenAt).toBeNull();
  });

  it('propagates error when file is unreadable (caller distinguishes vs no-EXIF)', async () => {
    const mockFile = new File(['test'], 'corrupt.bin', { type: 'application/octet-stream' });

    mockExifr.parse.mockRejectedValueOnce(new Error('Invalid image'));

    await expect(parseExif(mockFile)).rejects.toThrow('Invalid image');
  });

  it('drops Invalid Date from malformed DateTimeOriginal string', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    mockExifr.parse.mockResolvedValueOnce({
      DateTimeOriginal: 'totally not a date',
      latitude: 25,
      longitude: 121,
    });

    const result = await parseExif(mockFile);
    expect(result.takenAt).toBeNull();
    expect(result.latlng).toEqual([25, 121]);
  });

  it('should convert DateTimeOriginal string to Date if needed', async () => {
    const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const dateString = '2026-04-18T14:30:00Z';

    mockExifr.parse.mockResolvedValueOnce({
      DateTimeOriginal: dateString,
      latitude: 25.0442,
      longitude: 121.5628,
    });

    const result = await parseExif(mockFile);

    expect(result.takenAt).toBeInstanceOf(Date);
    expect(result.takenAt?.toISOString().startsWith('2026-04-18T14:30')).toBe(true);
  });
});
