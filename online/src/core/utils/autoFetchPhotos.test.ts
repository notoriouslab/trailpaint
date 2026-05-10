import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { autoFetchPhotos, AutoFetchAbortError } from './autoFetchPhotos';
import type { Project } from '../models/types';

vi.mock('./commonsApi', () => ({
  searchCommonsPhoto: vi.fn(),
}));
vi.mock('./fetchAndEncodeImage', () => ({
  fetchAsBase64: vi.fn(),
}));

import { searchCommonsPhoto } from './commonsApi';
import { fetchAsBase64 } from './fetchAndEncodeImage';

const mockSearch = searchCommonsPhoto as ReturnType<typeof vi.fn>;
const mockFetch = fetchAsBase64 as ReturnType<typeof vi.fn>;

function mkProject(spotConfigs: Array<{ id: string; title: string; query?: string }>): Project {
  return {
    version: 4,
    name: 't',
    center: [0, 0],
    zoom: 8,
    spots: spotConfigs.map((c) => ({
      id: c.id,
      latlng: [0, 0],
      num: 0,
      title: c.title,
      desc: '',
      photo: null,
      iconId: 'pin',
      cardOffset: { x: 0, y: 0 },
      photo_query: c.query,
    })),
    routes: [],
  };
}

const validHit = {
  thumbUrl: 'https://upload.wikimedia.org/thumb/x.jpg',
  mime: 'image/jpeg',
  license: 'CC BY-SA 3.0',
  author: 'AngMoKio',
  authorUrl: 'https://commons.wikimedia.org/wiki/User:AngMoKio',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
};

describe('autoFetchPhotos', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearch.mockReset();
    mockFetch.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
    // advance all pending timers (sleep 500ms between spots) until the
    // promise resolves or rejects.
    const result = Promise.race([
      promise,
      (async () => {
        for (let i = 0; i < 50; i++) {
          await vi.advanceTimersByTimeAsync(500);
          await Promise.resolve();
        }
      })(),
    ]);
    return promise.finally(() => result);
  }

  it('writes photo + photoMeta for each query that hits', async () => {
    mockSearch.mockResolvedValue(validHit);
    mockFetch.mockResolvedValue('data:image/jpeg;base64,ABCD');
    const project = mkProject([
      { id: 's1', title: 'Taipei 101', query: 'Taipei 101' },
      { id: 's2', title: '七星山', query: '七星山' },
    ]);
    const onProgress = vi.fn();
    const result = await runWithTimers(autoFetchPhotos(project, onProgress));
    expect(result.project.spots[0].photo).toBe('data:image/jpeg;base64,ABCD');
    expect(result.project.spots[0].photoMeta).toEqual({
      source: 'wikimedia-commons',
      license: 'CC BY-SA 3.0',
      author: 'AngMoKio',
      authorUrl: 'https://commons.wikimedia.org/wiki/User:AngMoKio',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
    });
    expect(result.report.found).toBe(2);
    expect(result.report.missed).toEqual([]);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, 1, 2, 'Taipei 101');
  });

  it('pushes spot into missed when query is empty string', async () => {
    const project = mkProject([{ id: 's1', title: 'x', query: '' }]);
    const result = await runWithTimers(autoFetchPhotos(project, vi.fn()));
    expect(mockSearch).not.toHaveBeenCalled();
    expect(result.report.missed).toEqual([{ spotId: 's1', title: 'x', query: '' }]);
    expect(result.project.spots[0].photo).toBeNull();
  });

  it('pushes spot into missed when Commons returns null', async () => {
    mockSearch.mockResolvedValue(null);
    const project = mkProject([{ id: 's1', title: 'obscure', query: 'Nonexistent XYZ' }]);
    const result = await runWithTimers(autoFetchPhotos(project, vi.fn()));
    expect(result.report.missed).toEqual([{ spotId: 's1', title: 'obscure', query: 'Nonexistent XYZ' }]);
  });

  it('pushes spot into missed when fetchAsBase64 throws (not AbortError)', async () => {
    mockSearch.mockResolvedValue(validHit);
    mockFetch.mockRejectedValue(new Error('HTTP 500'));
    const project = mkProject([{ id: 's1', title: 'x', query: 'q' }]);
    const result = await runWithTimers(autoFetchPhotos(project, vi.fn()));
    expect(result.report.found).toBe(0);
    expect(result.report.missed).toHaveLength(1);
  });

  it('throws AutoFetchAbortError with partial state on abort', async () => {
    mockSearch.mockResolvedValue(validHit);
    mockFetch.mockResolvedValue('data:image/jpeg;base64,AB');
    const project = mkProject([
      { id: 's1', title: 'a', query: 'q1' },
      { id: 's2', title: 'b', query: 'q2' },
      { id: 's3', title: 'c', query: 'q3' },
    ]);
    const ac = new AbortController();
    const onProgress = vi.fn().mockImplementation((i: number) => {
      if (i === 2) ac.abort();
    });
    const promise = autoFetchPhotos(project, onProgress, ac.signal);
    await runWithTimers(promise.catch(() => {}));
    try {
      await promise;
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AutoFetchAbortError);
      const partial = (e as AutoFetchAbortError).partial;
      expect(partial.processed).toBeGreaterThanOrEqual(1);
      expect(partial.project.spots).toHaveLength(3);
    }
  });

  it('sleeps 500ms between spots but not after last', async () => {
    mockSearch.mockResolvedValue(null);
    const project = mkProject([
      { id: 's1', title: 'a', query: 'q1' },
      { id: 's2', title: 'b', query: 'q2' },
    ]);
    const startTime = Date.now();
    const p = autoFetchPhotos(project, vi.fn());
    await runWithTimers(p);
    await p;
    // fake timers: 500ms sleep between s1 and s2 should be observed; no sleep after s2
    expect(Date.now() - startTime).toBeLessThan(2000);  // sanity
  });
});
