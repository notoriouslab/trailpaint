import { describe, it, expect } from 'vitest';
import {
  OVERLAYS,
  getOverlayZoomCap,
  getRelevantOverlayIds,
  OVERLAY_GROUP_ORDER,
  OVERLAY_GROUP_LABEL_KEY,
} from './overlays';

describe('getOverlayZoomCap', () => {
  it('returns undefined when overlayId is null/undefined/empty', () => {
    expect(getOverlayZoomCap(null)).toBeUndefined();
    expect(getOverlayZoomCap(undefined)).toBeUndefined();
    expect(getOverlayZoomCap('')).toBeUndefined();
  });

  it('returns undefined when overlayId does not match any overlay', () => {
    expect(getOverlayZoomCap('does-not-exist')).toBeUndefined();
  });

  it('returns the maxNativeZoom of a matching overlay', () => {
    // CCTS ancient-China overlays all cap at z=10
    expect(getOverlayZoomCap('han_bc7')).toBe(10);
    expect(getOverlayZoomCap('tang_741')).toBe(10);
    expect(getOverlayZoomCap('song_1208')).toBe(10);
    expect(getOverlayZoomCap('yuan_1330')).toBe(10);
    expect(getOverlayZoomCap('ming_1582')).toBe(10);
    expect(getOverlayZoomCap('rome_200')).toBe(10);
    // Taiwan overlays cap at z=14 (tile server 500s above z14)
    expect(getOverlayZoomCap('jm200k_1897')).toBe(14);
    expect(getOverlayZoomCap('jm20k_1921')).toBe(14);
    expect(getOverlayZoomCap('corona_1966')).toBe(14);
  });
});

describe('OVERLAYS definitions', () => {
  it('every overlay has a valid group that is in OVERLAY_GROUP_ORDER', () => {
    for (const ov of OVERLAYS) {
      expect(OVERLAY_GROUP_ORDER).toContain(ov.group);
    }
  });

  it('every overlay has well-formed bounds [[S,W],[N,E]]', () => {
    for (const ov of OVERLAYS) {
      expect(ov.bounds).toBeDefined();
      const [[s, w], [n, e]] = ov.bounds!;
      expect(s).toBeLessThan(n);
      expect(w).toBeLessThan(e);
    }
  });

  it('every group used has a label key entry', () => {
    for (const ov of OVERLAYS) {
      expect(OVERLAY_GROUP_LABEL_KEY[ov.group]).toBeTruthy();
    }
  });

  it('ids are unique', () => {
    const ids = OVERLAYS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getRelevantOverlayIds', () => {
  it('returns ALL overlay ids when spots array is empty (no filter possible)', () => {
    const result = getRelevantOverlayIds([]);
    expect(result.size).toBe(OVERLAYS.length);
    for (const ov of OVERLAYS) expect(result.has(ov.id)).toBe(true);
  });

  it('London (UK) only matches rome_200 — Taiwan/China overlays excluded', () => {
    const london: [number, number][] = [[51.5, -0.1]];
    const result = getRelevantOverlayIds(london);
    expect(result.has('rome_200')).toBe(true);
    expect(result.has('jm200k_1897')).toBe(false);
    expect(result.has('jm20k_1921')).toBe(false);
    expect(result.has('corona_1966')).toBe(false);
    expect(result.has('han_bc7')).toBe(false);
    expect(result.has('tang_741')).toBe(false);
    expect(result.has('song_1208')).toBe(false);
    expect(result.has('yuan_1330')).toBe(false);
    expect(result.has('ming_1582')).toBe(false);
  });

  it('Xi’an (China interior) matches china overlays but NOT rome_200', () => {
    // Xi'an at lng 108.9 is east of rome_200's east bound (55), so excluded
    const xian: [number, number][] = [[34.3, 108.9]];
    const result = getRelevantOverlayIds(xian);
    expect(result.has('han_bc7')).toBe(true);
    expect(result.has('tang_741')).toBe(true);
    expect(result.has('song_1208')).toBe(true);
    expect(result.has('rome_200')).toBe(false);
    expect(result.has('jm200k_1897')).toBe(false); // Taiwan box doesn't cover Xi'an
  });

  it('Silk Road (London → Shanghai) bounds intersects both Roman and China overlays', () => {
    const silk: [number, number][] = [[51.5, -0.1], [31.2, 121.5]];
    const result = getRelevantOverlayIds(silk);
    expect(result.has('rome_200')).toBe(true);
    expect(result.has('han_bc7')).toBe(true);
    expect(result.has('tang_741')).toBe(true);
    // Taiwan bounds (lng 119.5-122.3) overlaps the [-0.1, 121.5] longitude span,
    // and lat box [21.5, 25.5] overlaps [31.2, 51.5] only if any spot's lat is in that range.
    // Neither London (51.5) nor Shanghai (31.2) is inside [21.5, 25.5] — but the bounding
    // box of the route (south=31.2, north=51.5) does NOT overlap [21.5, 25.5] (north of TW).
    // So Taiwan overlays should be excluded.
    expect(result.has('jm200k_1897')).toBe(false);
  });

  it('single Taipei spot matches Taiwan overlays (and overlapping China bounds)', () => {
    const taipei: [number, number][] = [[25, 121.5]];
    const result = getRelevantOverlayIds(taipei);
    expect(result.has('jm200k_1897')).toBe(true);
    expect(result.has('jm20k_1921')).toBe(true);
    expect(result.has('corona_1966')).toBe(true);
    // China historic bounds [[18,73],[54,135]] also covers Taipei — accepted as relevant
    expect(result.has('han_bc7')).toBe(true);
    // Roman Mediterranean bounds (east edge 55) does not reach Taipei (lng 121.5)
    expect(result.has('rome_200')).toBe(false);
  });
});
