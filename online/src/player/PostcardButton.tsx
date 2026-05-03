/**
 * PostcardButton — floating 📮 button on PlayerMap that captures the current
 * map view + active spot + currentYear, renders a 1080x1080 IG-square postcard
 * via postcardRenderer, and surfaces a modal preview with download.
 *
 * Design ref: openspec/changes/2026-05-03-016-time-slider-postcard/design.md B4
 *
 * Excluded from captureMap exports via .postcard-button / .postcard-modal classes.
 */

import { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { t, currentLocale } from '../i18n';
import { captureMap, sanitizeFilename } from '../map/ExportButton';
import { renderPostcard } from '../core/utils/postcardRenderer';
import type { StampLocale } from '../core/utils/postcardStamp';
import { getOverlayZoomCap, OVERLAYS } from '../map/overlays';
import { usePlayerStore } from './usePlayerStore';

interface PostcardButtonProps {
  /** Current calendar year on the TimeSlider (drives stamp era text). */
  currentYear: number;
  /** Active overlay id, used to cap the postcard zoom against the overlay's native pyramid. */
  overlayId: string | null;
}

/**
 * Postcard zoom target. Lower than the in-Player flyTo zoom (~13) so the
 * historical map's hand-drawn texture is sharp + spot's regional context
 * (rivers / dynasty borders / seas) is visible. Capped against the overlay's
 * maxNativeZoom so CCTS / DARE tiles don't upscale and blur out.
 */
/** Default postcard zoom for low-res historical overlays (CCTS / DARE maxNativeZoom = 10)
 *  and modern basemap. ~40km viewport diameter — captures regional context. */
const POSTCARD_TARGET_ZOOM_DEFAULT = 10;
/** For hi-res overlays like 中研院 jm200k_1897 / jm20k_1921 / corona_1966
 *  (maxNativeZoom = 14) zoom in further so the postcard shows street-level detail. */
const POSTCARD_TARGET_ZOOM_HIRES = 12;
/** Threshold: overlays with maxNativeZoom >= this count as "hi-res". */
const HIRES_OVERLAY_THRESHOLD = 13;
const POSTCARD_MIN_ZOOM = 5;

/** Pick a postcard target zoom matched to the active overlay's native pyramid.
 *  No overlay / low-res overlay → DEFAULT (10).
 *  Hi-res overlay (Taiwan jm/corona series) → HIRES (12). */
function pickPostcardZoom(overlayId: string | null): number {
  const cap = getOverlayZoomCap(overlayId);
  if (cap === undefined) return POSTCARD_TARGET_ZOOM_DEFAULT;
  if (cap >= HIRES_OVERLAY_THRESHOLD) {
    return Math.min(POSTCARD_TARGET_ZOOM_HIRES, cap);
  }
  return Math.min(POSTCARD_TARGET_ZOOM_DEFAULT, cap);
}
/** Tile-load grace period after setView before captureMap. CCTS / DARE remote
 *  tile servers + fresh viewport extent → 1500ms is the floor that stops the
 *  "rapid-click → patchy postcard" issue 主公 hit. captureMap's own internal
 *  poll covers vector tiles but not raster tiles, so we wait here. */
const POSTCARD_TILE_LOAD_MS = 1500;

/** Find the overlay tile layer (z-index > 0) on the map. Used to dim it for
 *  postcards when the spot sits outside the overlay's geographic bounds. */
function findOverlayTileLayer(map: L.Map): L.TileLayer | undefined {
  let result: L.TileLayer | undefined;
  map.eachLayer((layer) => {
    if (!(layer instanceof L.TileLayer)) return;
    // Internal Leaflet field; documented escape hatch when public API doesn't expose z-index.
    const z = (layer as unknown as { _zIndex?: number })._zIndex;
    if (typeof z === 'number' && z > 0) result = layer;
  });
  return result;
}

function isSpotInOverlayBounds(
  spotLatLng: [number, number],
  overlayId: string | null,
): boolean {
  if (!overlayId) return true;
  const ov = OVERLAYS.find((o) => o.id === overlayId);
  if (!ov?.bounds) return true; // unbounded overlay → always "in"
  const [[s, w], [n, e]] = ov.bounds;
  return spotLatLng[0] >= s && spotLatLng[0] <= n
      && spotLatLng[1] >= w && spotLatLng[1] <= e;
}

type RenderState =
  | { kind: 'idle' }
  | { kind: 'rendering' }
  | { kind: 'ready'; url: string; blob: Blob; filename: string }
  | { kind: 'error'; msg: string };

function resolveLocale(): StampLocale {
  if (currentLocale === 'en') return 'en';
  if (currentLocale === 'ja') return 'ja';
  return 'zh-TW';
}

export default function PostcardButton({ currentYear, overlayId }: PostcardButtonProps) {
  const map = useMap();
  const project = usePlayerStore((s) => s.project);
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);
  const [state, setState] = useState<RenderState>({ kind: 'idle' });

  // Revoke object URL on unmount or when state transitions away from `ready`
  useEffect(() => {
    if (state.kind === 'ready') {
      return () => URL.revokeObjectURL(state.url);
    }
  }, [state]);

  if (!project) return null;

  const handleClick = async () => {
    if (state.kind === 'rendering') return;
    setState({ kind: 'rendering' });

    const oldCenter = map.getCenter();
    const oldZoom = map.getZoom();
    let zoomChanged = false;
    let dimmedOverlay: { layer: L.TileLayer; origOpacity: number } | null = null;

    try {
      const spot =
        activeIndex !== null && activeIndex >= 0 && activeIndex < project.spots.length
          ? project.spots[activeIndex]
          : project.spots[0];

      // Zoom out + recenter on the spot so the postcard reads as a geographic
      // tableau, not a 13-zoom close-up that upscales tiles into mush.
      // Pick zoom adaptively: low-res overlays (CCTS / DARE cap 10) → 10,
      // hi-res overlays (Taiwan jm series cap 14) → 12.
      let target = pickPostcardZoom(overlayId);
      target = Math.max(target, POSTCARD_MIN_ZOOM);
      target = Math.min(target, oldZoom);

      // Fallback: spot lives outside the active overlay's geographic bounds
      // (e.g. a Taiwan-overlay user navigates to a London story) → dim the
      // overlay so the postcard shows the modern basemap instead of a
      // disconnected tile blob. Using setOpacity directly bypasses
      // useOverlayLayer's cross-fade animation; the modal backdrop hides the
      // flicker from the user.
      if (spot && !isSpotInOverlayBounds(spot.latlng, overlayId)) {
        const overlayLayer = findOverlayTileLayer(map);
        if (overlayLayer) {
          const origOpacity = overlayLayer.options.opacity ?? 1;
          overlayLayer.setOpacity(0);
          dimmedOverlay = { layer: overlayLayer, origOpacity };
        }
      }

      // Close popups + recenter (without animation so capture is instant).
      map.closePopup();
      if (spot && (target !== oldZoom || spot.latlng[0] !== oldCenter.lat || spot.latlng[1] !== oldCenter.lng)) {
        map.setView(spot.latlng, target, { animate: false });
        zoomChanged = true;
      }
      // Always wait — even when zoom didn't change, dimmed-overlay /
      // popup-close + tile rerender needs a beat to settle.
      await new Promise((r) => setTimeout(r, POSTCARD_TILE_LOAD_MS));

      const captured = await captureMap(2);
      const blob = await renderPostcard({
        capturedMap: captured,
        stamp: { year: currentYear },
        spot: spot
          ? {
              title: spot.title,
              photo: spot.photo,
              desc: spot.desc,
              scriptureRef: spot.scripture_refs?.[0],
            }
          : undefined,
        projectName: project.name,
        locale: resolveLocale(),
      });
      const url = URL.createObjectURL(blob);
      const yearLabel = currentYear < 0 ? `BC${-currentYear}` : `AD${currentYear}`;
      const filename = `trailpaint-postcard-${sanitizeFilename(spot?.title ?? project.name)}-${yearLabel}.png`;
      setState({ kind: 'ready', url, blob, filename });
    } catch (e) {
      console.error('Postcard render failed:', e);
      setState({ kind: 'error', msg: t('postcard.error') });
    } finally {
      // Always restore the user's view + overlay opacity, even on error / abort
      if (zoomChanged) {
        map.setView(oldCenter, oldZoom, { animate: false });
      }
      // Race-safe: user might have switched overlay while the postcard was
      // rendering — useOverlayLayer would have disposed the captured layer.
      // map.hasLayer() guards against setOpacity on a stale reference.
      if (dimmedOverlay && map.hasLayer(dimmedOverlay.layer)) {
        dimmedOverlay.layer.setOpacity(dimmedOverlay.origOpacity);
      }
    }
  };

  const handleDownload = () => {
    if (state.kind !== 'ready') return;
    const a = document.createElement('a');
    a.href = state.url;
    a.download = state.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleClose = () => {
    setState({ kind: 'idle' });
  };

  return (
    <>
      <button
        type="button"
        className={`postcard-button${state.kind === 'rendering' ? ' postcard-button--busy' : ''}`}
        onClick={handleClick}
        disabled={state.kind === 'rendering'}
        title={t('postcard.create')}
        aria-label={t('postcard.create')}
      >
        📮
      </button>

      {(state.kind === 'ready' || state.kind === 'rendering' || state.kind === 'error') && (
        <div
          className="postcard-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
          role="dialog"
          aria-modal="true"
          aria-label={t('postcard.preview.title')}
        >
          <div className="postcard-modal">
            {state.kind === 'rendering' && (
              <div className="postcard-modal__spinner">{t('postcard.rendering')}</div>
            )}
            {state.kind === 'error' && (
              <div className="postcard-modal__error">{state.msg}</div>
            )}
            {state.kind === 'ready' && (
              <>
                <img
                  className="postcard-modal__preview"
                  src={state.url}
                  alt={t('postcard.preview.title')}
                />
                <div className="postcard-modal__actions">
                  <button
                    type="button"
                    className="postcard-modal__btn postcard-modal__btn--primary"
                    onClick={handleDownload}
                  >
                    {t('postcard.download')}
                  </button>
                  <button
                    type="button"
                    className="postcard-modal__btn"
                    onClick={handleClose}
                  >
                    {t('postcard.close')}
                  </button>
                </div>
              </>
            )}
            {(state.kind === 'rendering' || state.kind === 'error') && (
              <button
                type="button"
                className="postcard-modal__btn"
                onClick={handleClose}
                style={{ marginTop: 16 }}
              >
                {t('postcard.close')}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
