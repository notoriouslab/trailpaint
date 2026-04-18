import { describe, it, expect, vi, beforeEach } from 'vitest';
// Browser globals (window) are provided by test-setup.ts via vitest setupFiles

// Mock compressImage to avoid createImageBitmap (not available in node env)
vi.mock('../hooks/useImageCompress', () => ({
  compressImage: vi.fn(async (file: File) => `data:image/jpeg;base64,MOCK-${file.name}`),
}));

// Mock reverseGeocode to avoid network calls (importGpx would hit it)
vi.mock('../utils/reverseGeocode', () => ({
  reverseGeocode: vi.fn(async () => null),
}));

// Mock geocodeQueue so we can assert enqueue + trigger onResult synchronously
vi.mock('../utils/geocodeQueue', () => ({
  enqueueGeocode: vi.fn(),
}));

// Mock i18n t() used by addSpot / importGpx
vi.mock('../../i18n', () => ({
  t: (key: string) => key,
}));

import { useProjectStore } from './useProjectStore';
import type { Spot } from '../models/types';
import type { Route } from '../models/routes';
import type { ImportResult } from '../utils/geojsonImport';
import { DEFAULT_CARD_OFFSET } from '../models/types';
import { enqueueGeocode } from '../utils/geocodeQueue';
const mockEnqueueGeocode = enqueueGeocode as unknown as ReturnType<typeof vi.fn>;

function resetStore() {
  useProjectStore.setState({
    project: {
      version: 4,
      name: 'Test',
      center: [0, 0],
      zoom: 8,
      spots: [],
      routes: [],
    },
    selectedSpotId: null,
    selectedRouteId: null,
    pendingFlyTo: null,
  });
}

function mkSpot(overrides: Partial<Spot> = {}): Spot {
  return {
    id: crypto.randomUUID(),
    latlng: [0, 0],
    num: 0,
    title: 'x',
    desc: '',
    photo: null,
    iconId: 'pin',
    cardOffset: { ...DEFAULT_CARD_OFFSET },
    ...overrides,
  };
}

function mkRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: crypto.randomUUID(),
    name: '',
    pts: [[0, 0], [1, 1]],
    color: 'orange',
    elevations: null,
    ...overrides,
  };
}

describe('importPOIs — append + renumber + flyTo (010 D6)', () => {
  beforeEach(resetStore);

  it('appends spots and routes to existing project without replacing', async () => {
    useProjectStore.setState({
      project: {
        ...useProjectStore.getState().project,
        spots: [mkSpot({ num: 1, title: 'existing' })],
        routes: [mkRoute({ name: 'existingRoute' })],
      },
    });
    const result: ImportResult = {
      spots: [mkSpot({ num: 0, title: 'new1' }), mkSpot({ num: 0, title: 'new2' })],
      routes: [mkRoute({ name: 'newRoute' })],
    };
    await useProjectStore.getState().importPOIs(result);
    const p = useProjectStore.getState().project;
    expect(p.spots.map((s) => s.title)).toEqual(['existing', 'new1', 'new2']);
    expect(p.routes.map((r) => r.name)).toEqual(['existingRoute', 'newRoute']);
  });

  it('renumbers spots sequentially from 1 after import', async () => {
    const result: ImportResult = {
      spots: [mkSpot({ num: 99, title: 'a' }), mkSpot({ num: 0, title: 'b' })],
      routes: [],
    };
    await useProjectStore.getState().importPOIs(result);
    expect(useProjectStore.getState().project.spots.map((s) => s.num)).toEqual([1, 2]);
  });

  it('sets pendingFlyTo to bounding box center of all points', async () => {
    const result: ImportResult = {
      spots: [mkSpot({ latlng: [10, 100] }), mkSpot({ latlng: [30, 140] })],
      routes: [],
    };
    await useProjectStore.getState().importPOIs(result);
    expect(useProjectStore.getState().pendingFlyTo).toEqual({ center: [20, 120], zoom: 12 });
  });

  it('does not touch pendingFlyTo when importing an empty ImportResult', async () => {
    const existingFly = { center: [1, 2] as [number, number], zoom: 10 };
    useProjectStore.setState({ pendingFlyTo: existingFly });
    await useProjectStore.getState().importPOIs({ spots: [], routes: [] });
    expect(useProjectStore.getState().pendingFlyTo).toEqual(existingFly);
  });

  it('attaches compressed photos via spotPhotoMap (async)', async () => {
    const file = new File(['bytes'], 'pic.jpg', { type: 'image/jpeg' });
    const spot = mkSpot({ latlng: [1, 1], title: 'photo spot' });
    const photoMap = new Map<string, File>([[spot.id, file]]);
    const result: ImportResult = { spots: [spot], routes: [], spotPhotoMap: photoMap };
    await useProjectStore.getState().importPOIs(result);
    // photo compression runs outside set(), wait a microtask
    await new Promise((r) => setTimeout(r, 0));
    const saved = useProjectStore.getState().project.spots.find((s) => s.title === 'photo spot');
    expect(saved?.photo).toBe('data:image/jpeg;base64,MOCK-pic.jpg');
  });
});

describe('importPOIs — geocodeQueue integration (010 D4 / Task 5)', () => {
  beforeEach(() => {
    resetStore();
    mockEnqueueGeocode.mockClear();
  });

  it('enqueues a geocode job per new non-pending spot', async () => {
    const result: ImportResult = {
      spots: [
        mkSpot({ latlng: [25, 121], title: '2026-04-18 14:30' }),
        mkSpot({ latlng: [24, 120], title: '2026-04-18 14:31' }),
      ],
      routes: [],
    };
    await useProjectStore.getState().importPOIs(result);
    expect(mockEnqueueGeocode).toHaveBeenCalledTimes(2);
    const firstCall = mockEnqueueGeocode.mock.calls[0][0];
    expect(firstCall.spotId).toBe(result.spots[0].id);
    expect(firstCall.originalTitle).toBe('2026-04-18 14:30');
    expect(firstCall.latlng).toEqual([25, 121]);
    expect(typeof firstCall.onResult).toBe('function');
  });

  it('skips pendingLocation spots (coord is mapCenter, not real)', async () => {
    const result: ImportResult = {
      spots: [
        mkSpot({ latlng: [0, 0], title: 'pending', pendingLocation: true }),
        mkSpot({ latlng: [25, 121], title: 'real' }),
      ],
      routes: [],
    };
    await useProjectStore.getState().importPOIs(result);
    expect(mockEnqueueGeocode).toHaveBeenCalledTimes(1);
    const call = mockEnqueueGeocode.mock.calls[0][0];
    expect(call.originalTitle).toBe('real');
  });

  it('callback overwrites title only if user has not edited it (checkAndSet)', async () => {
    const spot = mkSpot({ latlng: [25, 121], title: '2026-04-18 14:30' });
    const result: ImportResult = { spots: [spot], routes: [] };
    await useProjectStore.getState().importPOIs(result);

    const job = mockEnqueueGeocode.mock.calls[0][0];
    // Simulate queue firing callback — title still matches original → overwrite
    job.onResult(spot.id, '台北 101', '2026-04-18 14:30');
    expect(useProjectStore.getState().project.spots.find((s) => s.id === spot.id)?.title).toBe('台北 101');
  });

  it('callback skips when originalTitle no longer matches (user edited)', async () => {
    const spot = mkSpot({ latlng: [25, 121], title: '2026-04-18 14:30' });
    const result: ImportResult = { spots: [spot], routes: [] };
    await useProjectStore.getState().importPOIs(result);
    // User renames the spot before geocode resolves
    useProjectStore.getState().updateSpot(spot.id, { title: 'my custom name' });

    const job = mockEnqueueGeocode.mock.calls[0][0];
    job.onResult(spot.id, '台北 101', '2026-04-18 14:30');

    expect(useProjectStore.getState().project.spots.find((s) => s.id === spot.id)?.title).toBe('my custom name');
  });
});

describe('updateSpot — pendingLocation drag-to-clear (010 D5)', () => {
  beforeEach(resetStore);

  it('clears pendingLocation when patch includes latlng and spot was pending', () => {
    const spot = mkSpot({ latlng: [0, 0], pendingLocation: true, title: 'pending' });
    useProjectStore.setState({
      project: { ...useProjectStore.getState().project, spots: [spot] },
    });
    useProjectStore.getState().updateSpot(spot.id, { latlng: [25, 121] });
    const updated = useProjectStore.getState().project.spots[0];
    expect(updated.latlng).toEqual([25, 121]);
    expect(updated.pendingLocation).toBe(false);
  });

  it('keeps pendingLocation=true when patch has no latlng change', () => {
    const spot = mkSpot({ latlng: [0, 0], pendingLocation: true, title: 'pending' });
    useProjectStore.setState({
      project: { ...useProjectStore.getState().project, spots: [spot] },
    });
    useProjectStore.getState().updateSpot(spot.id, { title: 'renamed' });
    const updated = useProjectStore.getState().project.spots[0];
    expect(updated.title).toBe('renamed');
    expect(updated.pendingLocation).toBe(true);
  });

  it('does nothing special for non-pending spot dragged to new location', () => {
    const spot = mkSpot({ latlng: [0, 0], title: 'normal' });
    useProjectStore.setState({
      project: { ...useProjectStore.getState().project, spots: [spot] },
    });
    useProjectStore.getState().updateSpot(spot.id, { latlng: [25, 121] });
    const updated = useProjectStore.getState().project.spots[0];
    expect(updated.latlng).toEqual([25, 121]);
    expect(updated.pendingLocation).toBeUndefined();
  });
});
