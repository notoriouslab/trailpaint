import { describe, it, expect } from 'vitest';
import { OVERLAYS, getOverlayZoomCap, OVERLAY_GROUP_ORDER, OVERLAY_GROUP_LABEL_KEY } from './overlays';

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
    expect(getOverlayZoomCap('tang_741')).toBe(10);
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
