/**
 * Tests for loadCompilation (T4).
 *
 * Covers full-success / partial-fail / segment-id propagation.
 * Uses globalThis.fetch mock — vitest node env has no fetch by default.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadCompilation, orderCompilationSpots, type CompilationSpot } from './compilations';
import type { Compilation } from '../models/types';

const baseCompilation: Compilation = {
  id: 'silk-road-2000',
  title: 'Silk Road 2000',
  segments: ['zhang-qian/first-mission', 'xuanzang/west', 'marco-polo/east-journey'],
  playback: 'chronological',
};

function makeStorySegment(idSuffix: string, spotCount = 2) {
  return {
    version: 4,
    name: `seg-${idSuffix}`,
    center: [30, 100],
    zoom: 5,
    spots: Array.from({ length: spotCount }, (_, i) => ({
      id: `${idSuffix}-spot-${i}`,
      latlng: [30 + i, 100 + i],
      num: i + 1,
      title: `Spot ${i}`,
      desc: '',
      photo: null,
      iconId: 'pin',
      cardOffset: { x: 0, y: -60 },
    })),
    routes: [],
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  // Don't pollute other test files
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe('loadCompilation', () => {
  it('full success: all 3 segments load → spots merged + tagged with _sourceSegmentId', async () => {
    fetchMock.mockImplementation((url: string) => {
      const seg = url.match(/\/stories\/(.+)\.trailpaint\.json$/)?.[1] ?? '';
      return Promise.resolve(
        new Response(JSON.stringify(makeStorySegment(seg, 2)), { status: 200 }),
      );
    });

    const result = await loadCompilation(baseCompilation);

    expect(result.failedSegments).toEqual([]);
    expect(result.spots).toHaveLength(6); // 3 segments × 2 spots
    // Each spot tagged with its source segment
    const seg0Spots = result.spots.filter((s) => s._sourceSegmentId === 'zhang-qian/first-mission');
    const seg1Spots = result.spots.filter((s) => s._sourceSegmentId === 'xuanzang/west');
    const seg2Spots = result.spots.filter((s) => s._sourceSegmentId === 'marco-polo/east-journey');
    expect(seg0Spots).toHaveLength(2);
    expect(seg1Spots).toHaveLength(2);
    expect(seg2Spots).toHaveLength(2);
  });

  it('partial fail: 1 segment 404 → other 2 succeed + failedSegments lists the loser', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('xuanzang/west')) {
        return Promise.resolve(new Response('Not Found', { status: 404 }));
      }
      const seg = url.match(/\/stories\/(.+)\.trailpaint\.json$/)?.[1] ?? '';
      return Promise.resolve(
        new Response(JSON.stringify(makeStorySegment(seg, 2)), { status: 200 }),
      );
    });

    const result = await loadCompilation(baseCompilation);

    expect(result.failedSegments).toEqual(['xuanzang/west']);
    expect(result.spots).toHaveLength(4); // 2 surviving segments × 2 spots
    expect(result.spots.every((s) => s._sourceSegmentId !== 'xuanzang/west')).toBe(true);
  });

  it('all-fail: every segment 500 → spots empty + failedSegments contains all', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));

    const result = await loadCompilation(baseCompilation);

    expect(result.spots).toEqual([]);
    expect(result.routes).toEqual([]);
    expect(result.failedSegments).toEqual([
      'zhang-qian/first-mission',
      'xuanzang/west',
      'marco-polo/east-journey',
    ]);
  });

  it('rejects malformed JSON without crashing the whole compilation', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('xuanzang')) {
        return Promise.resolve(new Response('not json {{{', { status: 200 }));
      }
      const seg = url.match(/\/stories\/(.+)\.trailpaint\.json$/)?.[1] ?? '';
      return Promise.resolve(
        new Response(JSON.stringify(makeStorySegment(seg, 1)), { status: 200 }),
      );
    });

    const result = await loadCompilation(baseCompilation);

    expect(result.failedSegments).toEqual(['xuanzang/west']);
    expect(result.spots).toHaveLength(2); // 2 surviving × 1 spot each
  });

  it('respects custom basePath', async () => {
    let calledUrl = '';
    fetchMock.mockImplementation((url: string) => {
      calledUrl = url;
      return Promise.resolve(
        new Response(JSON.stringify(makeStorySegment('x', 0)), { status: 200 }),
      );
    });

    await loadCompilation(
      { ...baseCompilation, segments: ['paul/first-journey'] },
      { basePath: 'cdn/stories' },
    );

    expect(calledUrl).toBe('/cdn/stories/paul/first-journey.trailpaint.json');
  });

  it('sequential playback: segment + spot order preserved', () => {
    const spots: CompilationSpot[] = [
      { id: 'a', _sourceSegmentId: 'seg1' } as CompilationSpot,
      { id: 'b', _sourceSegmentId: 'seg2' } as CompilationSpot,
      { id: 'c', _sourceSegmentId: 'seg1' } as CompilationSpot,
    ];
    const result = orderCompilationSpots(spots, 'sequential');
    expect(result.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('chronological: full era coverage → sorts BC before AD across segments', () => {
    const spots: CompilationSpot[] = [
      { id: 'marco', era: { start: 1271, end: 1295 }, _sourceSegmentId: 'marco-polo' } as CompilationSpot,
      { id: 'zhang', era: { start: -138, end: -126 }, _sourceSegmentId: 'zhang-qian' } as CompilationSpot,
      { id: 'xuan', era: { start: 629, end: 645 }, _sourceSegmentId: 'xuanzang' } as CompilationSpot,
    ];
    const result = orderCompilationSpots(spots, 'chronological');
    expect(result.map((s) => s.id)).toEqual(['zhang', 'xuan', 'marco']);
  });

  it('chronological: spot without era falls back to segment average era', () => {
    const spots: CompilationSpot[] = [
      // marco-polo segment avg era = 1283 (mid of 1271-1295)
      { id: 'marco-1', era: { start: 1271, end: 1295 }, _sourceSegmentId: 'marco-polo' } as CompilationSpot,
      { id: 'marco-no-era', _sourceSegmentId: 'marco-polo' } as CompilationSpot,
      // zhang-qian segment avg = -132
      { id: 'zhang-1', era: { start: -138, end: -126 }, _sourceSegmentId: 'zhang-qian' } as CompilationSpot,
    ];
    const result = orderCompilationSpots(spots, 'chronological');
    // marco-no-era falls in marco-polo's bracket (~1283) → sorts after zhang
    expect(result[0].id).toBe('zhang-1');
    expect(result.slice(1).map((s) => s.id).sort()).toEqual(['marco-1', 'marco-no-era']);
  });

  it('chronological: segment with no era at all sinks to the end', () => {
    const spots: CompilationSpot[] = [
      { id: 'modern-a', _sourceSegmentId: 'taiwan-hike' } as CompilationSpot,
      { id: 'modern-b', _sourceSegmentId: 'taiwan-hike' } as CompilationSpot,
      { id: 'roman', era: { start: 30, end: 30 }, _sourceSegmentId: 'paul' } as CompilationSpot,
    ];
    const result = orderCompilationSpots(spots, 'chronological');
    expect(result[0].id).toBe('roman');
    expect(result.slice(1).map((s) => s.id).sort()).toEqual(['modern-a', 'modern-b']);
  });

  it('does not mutate the input array', () => {
    const spots: CompilationSpot[] = [
      { id: 'a', era: { start: 100, end: 100 }, _sourceSegmentId: 'x' } as CompilationSpot,
      { id: 'b', era: { start: 50, end: 50 }, _sourceSegmentId: 'y' } as CompilationSpot,
    ];
    const ids = spots.map((s) => s.id);
    orderCompilationSpots(spots, 'chronological');
    expect(spots.map((s) => s.id)).toEqual(ids);
  });

  it('routes from each segment are concatenated in segment order', async () => {
    fetchMock.mockImplementation((url: string) => {
      const seg = url.match(/\/stories\/(.+)\.trailpaint\.json$/)?.[1] ?? '';
      const data = makeStorySegment(seg, 0);
      data.routes = [
        // Type-coerced via cast — test fixture only
        { id: `r-${seg}`, name: '', color: 'red', pts: [[0, 0], [1, 1]], elevations: null } as unknown as never,
      ];
      return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }));
    });

    const result = await loadCompilation(baseCompilation);

    expect(result.routes.map((r) => r.id)).toEqual([
      'r-zhang-qian/first-mission',
      'r-xuanzang/west',
      'r-marco-polo/east-journey',
    ]);
  });
});
