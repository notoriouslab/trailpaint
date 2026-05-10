import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchAsBase64 } from './fetchAndEncodeImage';

describe('fetchAsBase64', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('converts a successful response into a data URL string', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(blob, { status: 200 }));
    const result = await fetchAsBase64('https://example.com/x.jpg');
    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('throws on non-ok HTTP status', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response('', { status: 404 }));
    await expect(fetchAsBase64('https://example.com/missing.jpg')).rejects.toThrow(/HTTP 404/);
  });

  it('propagates AbortSignal via fetch', async () => {
    const ac = new AbortController();
    (fetch as ReturnType<typeof vi.fn>).mockImplementationOnce((_: string, opts?: RequestInit) => {
      return new Promise((_, reject) => {
        opts?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });
    const p = fetchAsBase64('https://example.com/x.jpg', ac.signal);
    ac.abort();
    await expect(p).rejects.toThrow(/aborted/);
  });
});
