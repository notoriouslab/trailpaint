import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseExif, isBmffSafeToParse } from './exifParser';

vi.mock('exifr', () => ({
  default: {
    parse: vi.fn(),
    gps: vi.fn(),
  },
}));

vi.mock('exifreader', () => ({
  default: {
    load: vi.fn(),
  },
}));

import exifr from 'exifr';
import ExifReader from 'exifreader';

const mockExifr = exifr as unknown as {
  parse: ReturnType<typeof vi.fn>;
  gps: ReturnType<typeof vi.fn>;
};

const mockExifReader = ExifReader as unknown as {
  load: ReturnType<typeof vi.fn>;
};

// Build a minimal BMFF buffer (ftyp + meta/iloc) for iloc sanity-check tests.
// Does NOT include actual iloc items — the scanner only reads the iloc header.
function buildBmff(opts: {
  offsetSize?: number;
  lengthSize?: number;
  itemCount?: number;
  ilocVersion?: number;
  hasIloc?: boolean;
} = {}): ArrayBuffer {
  const {
    offsetSize = 4,
    lengthSize = 4,
    itemCount = 5,
    ilocVersion = 1,
    hasIloc = true,
  } = opts;

  const ilocItemCountWidth = ilocVersion < 2 ? 2 : 4;
  const ilocSize = hasIloc ? 8 + 4 + 2 + ilocItemCountWidth : 0;
  const metaSize = 8 + 4 + ilocSize;
  const ftypSize = 16;
  const buf = new ArrayBuffer(ftypSize + metaSize);
  const v = new DataView(buf);
  const writeFourCC = (pos: number, s: string) => {
    for (let i = 0; i < 4; i++) v.setUint8(pos + i, s.charCodeAt(i));
  };

  let p = 0;
  v.setUint32(p, ftypSize); writeFourCC(p + 4, 'ftyp'); p += 8;
  writeFourCC(p, 'heic'); p += 4;
  p += 4; // minor ver 0

  v.setUint32(p, metaSize); writeFourCC(p + 4, 'meta'); p += 8;
  p += 4; // FullBox version+flags

  if (hasIloc) {
    v.setUint32(p, ilocSize); writeFourCC(p + 4, 'iloc'); p += 8;
    v.setUint8(p, ilocVersion); p += 4; // version (1 byte) + flags (3 bytes)
    v.setUint8(p++, (offsetSize << 4) | lengthSize);
    v.setUint8(p++, 0); // baseOffsetSize=0, indexSize=0
    if (ilocVersion < 2) v.setUint16(p, itemCount);
    else v.setUint32(p, itemCount);
  }

  return buf;
}

describe('isBmffSafeToParse', () => {
  it('accepts a legitimate HEIC iloc with reasonable counts', () => {
    expect(isBmffSafeToParse(buildBmff({ offsetSize: 4, lengthSize: 4, itemCount: 5 }))).toBe(true);
  });

  it('rejects the DoS signature: offsetSize=0 AND lengthSize=0', () => {
    expect(isBmffSafeToParse(buildBmff({ offsetSize: 0, lengthSize: 0, itemCount: 10 }))).toBe(false);
  });

  it('rejects absurd itemCount even with legitimate size fields', () => {
    expect(isBmffSafeToParse(buildBmff({ offsetSize: 4, lengthSize: 4, itemCount: 65535 }))).toBe(false);
  });

  it('allows only one of offsetSize/lengthSize to be zero (not both)', () => {
    expect(isBmffSafeToParse(buildBmff({ offsetSize: 4, lengthSize: 0 }))).toBe(true);
    expect(isBmffSafeToParse(buildBmff({ offsetSize: 0, lengthSize: 4 }))).toBe(true);
  });

  it('handles iloc v2 with 32-bit itemCount', () => {
    expect(isBmffSafeToParse(buildBmff({ ilocVersion: 2, itemCount: 100 }))).toBe(true);
    expect(isBmffSafeToParse(buildBmff({ ilocVersion: 2, itemCount: 1_000_000 }))).toBe(false);
  });

  it('returns true for non-BMFF buffers (lets JPEG path alone)', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(isBmffSafeToParse(jpeg.buffer)).toBe(true);
  });

  it('returns true for tiny buffers (nothing to scan)', () => {
    expect(isBmffSafeToParse(new ArrayBuffer(4))).toBe(true);
  });

  it('returns true for BMFF without iloc (nothing to attack)', () => {
    expect(isBmffSafeToParse(buildBmff({ hasIloc: false }))).toBe(true);
  });
});

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

  it('throws when both exifr helpers reject AND fallback finds nothing', async () => {
    const mockFile = new File(['test'], 'corrupt.bin', { type: 'application/octet-stream' });

    mockExifr.gps.mockRejectedValueOnce(new Error('Invalid image'));
    mockExifr.parse.mockRejectedValueOnce(new Error('Invalid image'));
    mockExifReader.load.mockImplementationOnce(() => {
      throw new Error('Invalid image');
    });

    await expect(parseExif(mockFile)).rejects.toThrow(/無法解析/);
  });

  it('falls back to ExifReader when exifr rejects a modern HEIC container', async () => {
    // Simulates iOS 18+ adaptive-HDR HEIC: exifr bails on the ftyp size check
    // but the EXIF payload is intact and ExifReader extracts it.
    const mockFile = new File(['heic'], 'IMG.HEIC', { type: 'image/heic' });

    mockExifr.gps.mockRejectedValueOnce(new Error('Unknown file format'));
    mockExifr.parse.mockRejectedValueOnce(new Error('Unknown file format'));
    mockExifReader.load.mockReturnValueOnce({
      gps: { Latitude: 23.59306, Longitude: 119.60749 },
      exif: { DateTimeOriginal: { description: '2026:04:10 17:17:01' } },
    });

    const result = await parseExif(mockFile);

    expect(result.latlng).toEqual([23.59306, 119.60749]);
    expect(result.takenAt).toBeInstanceOf(Date);
    // Local-time parse: preserves the wall-clock EXIF timestamp rather than shifting to UTC.
    expect(result.takenAt?.getFullYear()).toBe(2026);
    expect(result.takenAt?.getMonth()).toBe(3); // April
    expect(result.takenAt?.getDate()).toBe(10);
    expect(result.takenAt?.getHours()).toBe(17);
    expect(result.takenAt?.getMinutes()).toBe(17);
  });

  it('fallback rejects out-of-range coordinates from ExifReader too', async () => {
    const mockFile = new File(['heic'], 'IMG.HEIC', { type: 'image/heic' });

    mockExifr.gps.mockRejectedValueOnce(new Error('Unknown file format'));
    mockExifr.parse.mockRejectedValueOnce(new Error('Unknown file format'));
    mockExifReader.load.mockReturnValueOnce({
      gps: { Latitude: 200, Longitude: 50 },
      exif: { DateTimeOriginal: { description: '2026:04:10 17:17:01' } },
    });

    const result = await parseExif(mockFile);
    expect(result.latlng).toBeNull();
    expect(result.takenAt).toBeInstanceOf(Date);
  });

  it('does not invoke ExifReader when exifr read the file successfully (even without GPS)', async () => {
    const mockFile = new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.gps.mockResolvedValueOnce(undefined);
    mockExifr.parse.mockResolvedValueOnce(undefined);

    const result = await parseExif(mockFile);

    expect(result.latlng).toBeNull();
    expect(result.takenAt).toBeNull();
    expect(mockExifReader.load).not.toHaveBeenCalled();
  });

  it('rejects the Null Island coordinate (0, 0) as uninitialized GPS', async () => {
    const mockFile = new File(['jpg'], 'photo.jpg', { type: 'image/jpeg' });

    mockExifr.gps.mockResolvedValueOnce({ latitude: 0, longitude: 0 });
    mockExifr.parse.mockResolvedValueOnce(undefined);

    const result = await parseExif(mockFile);
    expect(result.latlng).toBeNull();
  });

  it('rejects DateTimeOriginal with trailing garbage (null byte truncation attack)', async () => {
    const mockFile = new File(['heic'], 'IMG.HEIC', { type: 'image/heic' });

    mockExifr.gps.mockRejectedValueOnce(new Error('Unknown'));
    mockExifr.parse.mockRejectedValueOnce(new Error('Unknown'));
    mockExifReader.load.mockReturnValueOnce({
      gps: undefined,
      exif: { DateTimeOriginal: { description: '2026:04:10 17:17:01\x00evil' } },
    });

    await expect(parseExif(mockFile)).rejects.toThrow(/無法解析/);
  });

  it('rejects DateTimeOriginal that is valid ISO but not EXIF format', async () => {
    const mockFile = new File(['heic'], 'IMG.HEIC', { type: 'image/heic' });

    mockExifr.gps.mockRejectedValueOnce(new Error('Unknown'));
    mockExifr.parse.mockRejectedValueOnce(new Error('Unknown'));
    mockExifReader.load.mockReturnValueOnce({
      gps: undefined,
      // ISO with Z would silently be parsed as UTC, shifting wall-clock by tz offset
      exif: { DateTimeOriginal: { description: '2026-04-10T17:17:01Z' } },
    });

    await expect(parseExif(mockFile)).rejects.toThrow(/無法解析/);
  });

  it('refuses to invoke ExifReader when BMFF pre-scan flags the buffer as DoS', async () => {
    const evilBuf = buildBmff({ offsetSize: 0, lengthSize: 0, itemCount: 65535 });
    const evil = new File([evilBuf], 'evil.HEIC', { type: 'image/heic' });

    mockExifr.gps.mockRejectedValueOnce(new Error('Unknown'));
    mockExifr.parse.mockRejectedValueOnce(new Error('Unknown'));

    await expect(parseExif(evil)).rejects.toThrow(/無法解析/);
    expect(mockExifReader.load).not.toHaveBeenCalled();
  });

  it('rejects files larger than MAX_PHOTO_BYTES before touching EXIF', async () => {
    const huge = new File(['tiny'], 'huge.heic', { type: 'image/heic' });
    Object.defineProperty(huge, 'size', { value: 10 * 1024 * 1024 + 1 });

    await expect(parseExif(huge)).rejects.toThrow(/超過大小限制/);
    expect(mockExifr.gps).not.toHaveBeenCalled();
    expect(mockExifr.parse).not.toHaveBeenCalled();
    expect(mockExifReader.load).not.toHaveBeenCalled();
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
