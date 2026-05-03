/**
 * Cross-fade overlay tile layer manager.
 *
 * Provides:
 *   - `crossFadeOverlay()` — RAF-driven opacity transition between two L.TileLayer
 *   - `useOverlayLayer()` — React hook used by both BasemapSwitcher and TimeSlider
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md D1
 * Spike PoC: spike/cross-fade-tilelayer commit bc2d4f9
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { OVERLAYS } from './overlays';
import { isOverlayThresholdReached } from './tileErrorThreshold';
export { TILE_ERROR_THRESHOLD, isOverlayThresholdReached } from './tileErrorThreshold';

interface CrossFadeHandle {
  /** Cancel the in-flight animation. Snaps both layers to the final target state. */
  cancel: () => void;
}

/**
 * Cross-fade between two overlay tile layers using requestAnimationFrame.
 * Returns a handle with `cancel()` to abort mid-way (used when user rapidly
 * switches overlays — old animation is cancelled before new one starts).
 *
 * If `fadingOut` is provided it will be removed from the map at the end (or on cancel).
 * If `fadingIn` is provided it will end up at `targetOpacity`.
 */
export function crossFadeOverlay(
  map: L.Map,
  fadingOut: L.TileLayer | null,
  fadingIn: L.TileLayer | null,
  targetOpacity: number,
  onComplete?: () => void,
  durationMs = 400,
): CrossFadeHandle {
  const start = performance.now();
  let cancelled = false;
  let rafId = 0;

  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min((now - start) / durationMs, 1);
    if (fadingOut) fadingOut.setOpacity(targetOpacity * (1 - t));
    if (fadingIn) fadingIn.setOpacity(targetOpacity * t);
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      if (fadingOut && map.hasLayer(fadingOut)) map.removeLayer(fadingOut);
      onComplete?.();
    }
  };
  rafId = requestAnimationFrame(step);

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      cancelAnimationFrame(rafId);
      // Snap to terminal state — fadingOut is removed, fadingIn jumps to target opacity
      if (fadingOut && map.hasLayer(fadingOut)) map.removeLayer(fadingOut);
      if (fadingIn) fadingIn.setOpacity(targetOpacity);
    },
  };
}

interface UseOverlayLayerOpts {
  map: L.Map;
  overlayId: string | null;
  opacity: number;
  durationMs?: number;
  /**
   * Called when the active overlay's tile server returns errors for 3 distinct
   * tile URLs (overlay-wide failure heuristic, R1 risk mitigation).
   * Caller is expected to clear the overlay selection so the layer fades out.
   */
  onLoadError?: () => void;
}


/**
 * Manages a Leaflet overlay tile layer with cross-fade transitions.
 * Shared between BasemapSwitcher (click-to-switch) and TimeSlider (drag-to-snap).
 *
 * Behaviour:
 *   - overlayId change → fade out old, fade in new
 *   - overlayId → null → fade out current
 *   - opacity change without overlayId change → live setOpacity (no animation)
 *   - rapid switches → previous animation cancelled before next starts
 *   - unmount → in-flight animation cancelled + current layer removed
 */
export function useOverlayLayer({
  map,
  overlayId,
  opacity,
  durationMs = 400,
  onLoadError,
}: UseOverlayLayerOpts) {
  const layerRef = useRef<L.TileLayer | null>(null);
  const animHandleRef = useRef<CrossFadeHandle | null>(null);
  // Stable ref so the effect doesn't re-run when caller passes a fresh callback closure
  const onLoadErrorRef = useRef(onLoadError);
  useEffect(() => { onLoadErrorRef.current = onLoadError; }, [onLoadError]);

  useEffect(() => {
    // Cancel any in-flight cross-fade before starting new transition
    animHandleRef.current?.cancel();
    animHandleRef.current = null;

    const fadingOut = layerRef.current;

    // Transition to "no overlay"
    if (!overlayId) {
      if (fadingOut) {
        animHandleRef.current = crossFadeOverlay(
          map,
          fadingOut,
          null,
          opacity,
          undefined,
          durationMs,
        );
      }
      layerRef.current = null;
      return;
    }

    const ov = OVERLAYS.find((o) => o.id === overlayId);
    if (!ov) return;

    // Create new layer at opacity 0, sit above fadingOut during animation
    const newLayer = L.tileLayer(ov.url, {
      attribution: ov.attribution,
      maxZoom: ov.maxZoom,
      maxNativeZoom: ov.maxNativeZoom,
      opacity: 0,
      crossOrigin: true,
    }).addTo(map);
    newLayer.setZIndex(2);

    // Track distinct failed tile URLs scoped to THIS layer instance.
    // Counter resets automatically when overlayId changes (effect re-runs → new Set).
    const erroredUrls = new Set<string>();
    let errorFired = false;
    const handleTileError = (e: L.TileErrorEvent) => {
      if (errorFired) return;
      const url = (e.tile as HTMLImageElement | undefined)?.src;
      if (isOverlayThresholdReached(erroredUrls, url)) {
        errorFired = true;
        onLoadErrorRef.current?.();
      }
    };
    newLayer.on('tileerror', handleTileError);

    animHandleRef.current = crossFadeOverlay(
      map,
      fadingOut,
      newLayer,
      opacity,
      () => newLayer.setZIndex(1), // settle to standard z-index after animation
      durationMs,
    );

    layerRef.current = newLayer;
    // No cleanup function — layer persists until next effect run or unmount handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayId, map]);

  // Live opacity update without re-creating layer
  useEffect(() => {
    layerRef.current?.setOpacity(opacity);
  }, [opacity]);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      animHandleRef.current?.cancel();
      const layer = layerRef.current;
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return layerRef;
}
