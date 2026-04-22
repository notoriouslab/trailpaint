import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseArtistHtml, searchCommonsPhoto } from './commonsApi';

describe('parseArtistHtml', () => {
  it('extracts name and url from standard Commons User link (// prefix)', () => {
    const html = '<a href="//commons.wikimedia.org/wiki/User:Xxx" title="User:Xxx">Xxx</a>';
    expect(parseArtistHtml(html)).toEqual({
      name: 'Xxx',
      url: 'https://commons.wikimedia.org/wiki/User:Xxx',
    });
  });

  it('extracts name and url from root-relative path (/ prefix)', () => {
    const html = '<a href="/wiki/User:Y">Y</a>';
    expect(parseArtistHtml(html)).toEqual({
      name: 'Y',
      url: 'https://commons.wikimedia.org/wiki/User:Y',
    });
  });

  it('extracts name from plain span (no anchor)', () => {
    const html = '<span class="int-own-work" lang="en">Own work</span>';
    expect(parseArtistHtml(html)).toEqual({ name: 'Own work', url: null });
  });

  it('returns plain text when input is not HTML', () => {
    expect(parseArtistHtml('Anonymous')).toEqual({ name: 'Anonymous', url: null });
  });

  it('falls back to Unknown on empty input', () => {
    expect(parseArtistHtml('')).toEqual({ name: 'Unknown', url: null });
  });

  it('preserves absolute http(s) URL without rewriting', () => {
    const html = '<a href="https://example.com/profile">Author</a>';
    expect(parseArtistHtml(html)).toEqual({
      name: 'Author',
      url: 'https://example.com/profile',
    });
  });
});

describe('searchCommonsPhoto', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null on empty query', async () => {
    const hit = await searchCommonsPhoto('   ');
    expect(hit).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns null when API responds non-ok', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('', { status: 500 }),
    );
    const hit = await searchCommonsPhoto('Taipei 101');
    expect(hit).toBeNull();
  });

  it('returns null when no pages found', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ query: {} }), { status: 200 }),
    );
    const hit = await searchCommonsPhoto('nonexistent-xyz-spot');
    expect(hit).toBeNull();
  });

  it('returns null when first page has no imageinfo', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ query: { pages: { '1': { title: 'File:X' } } } }), { status: 200 }),
    );
    const hit = await searchCommonsPhoto('x');
    expect(hit).toBeNull();
  });

  it('filters out non-image mime (D12 defense)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({
        query: {
          pages: {
            '1': {
              title: 'File:audio.ogg',
              imageinfo: [{
                thumburl: 'https://upload.wikimedia.org/x.ogg',
                mime: 'application/ogg',
                extmetadata: {},
              }],
            },
          },
        },
      }), { status: 200 }),
    );
    const hit = await searchCommonsPhoto('weird');
    expect(hit).toBeNull();
  });

  it('returns complete CommonsHit on success', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({
        query: {
          pages: {
            '42': {
              title: 'File:Taipei 101 2009 amk.jpg',
              imageinfo: [{
                thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Taipei_101_2009_amk.jpg/600px-Taipei_101_2009_amk.jpg',
                mime: 'image/jpeg',
                extmetadata: {
                  LicenseShortName: { value: 'CC BY-SA 3.0' },
                  Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:AngMoKio">AngMoKio</a>' },
                },
              }],
            },
          },
        },
      }), { status: 200 }),
    );
    const hit = await searchCommonsPhoto('Taipei 101');
    expect(hit).toEqual({
      thumbUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Taipei_101_2009_amk.jpg/600px-Taipei_101_2009_amk.jpg',
      mime: 'image/jpeg',
      license: 'CC BY-SA 3.0',
      author: 'AngMoKio',
      authorUrl: 'https://commons.wikimedia.org/wiki/User:AngMoKio',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File%3ATaipei%20101%202009%20amk.jpg',
    });
  });

  it('falls back to Unknown license when extmetadata missing', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({
        query: {
          pages: {
            '1': {
              title: 'File:bare.jpg',
              imageinfo: [{
                thumburl: 'https://upload.wikimedia.org/x.jpg',
                mime: 'image/jpeg',
              }],
            },
          },
        },
      }), { status: 200 }),
    );
    const hit = await searchCommonsPhoto('x');
    expect(hit?.license).toBe('Unknown');
    expect(hit?.author).toBe('Unknown');
    expect(hit?.authorUrl).toBeNull();
  });

  it('includes filetype:bitmap in gsrsearch param (D12)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ query: { pages: {} } }), { status: 200 }),
    );
    await searchCommonsPhoto('Antioch');
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain('filetype%3Abitmap');
  });

  it('includes origin=* for CORS and gsrlimit=1 for top-only', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ query: { pages: {} } }), { status: 200 }),
    );
    await searchCommonsPhoto('x');
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/origin=(\*|%2A)/);  // URLSearchParams 不 encode `*`，但接受 `%2A` 亦合規
    expect(calledUrl).toContain('gsrlimit=1');
    expect(calledUrl).toContain('iiurlwidth=600');
  });
});
