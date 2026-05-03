import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { t } from '../i18n';
import { OVERLAYS, OVERLAY_GROUP_ORDER, OVERLAY_GROUP_LABEL_KEY } from '../map/overlays';
import type { OverlayDef } from '../map/overlays';
import { BASEMAPS, DEFAULT_BASEMAP_ID } from '../map/basemaps';
import type { BasemapDef } from '../map/basemaps';
import { createBasemapLayer } from '../map/basemapLayer';
import { useOverlayLayer } from '../map/eraOverlayLayer';

interface PlayerBasemapSwitcherProps {
  /** Currently selected overlay id, or null for none. Controlled by parent (shared with TimeSlider). */
  overlayId: string | null;
  /** Overlay opacity 0-1. */
  opacity: number;
  /** Called when user picks/clears an overlay or drags opacity. */
  onOverlayChange: (next: { id: string; opacity: number } | null) => void;
  /** Initial basemap id (resolved from project). Internal basemap state stays local. */
  initialBasemapId?: string;
}

/** Full basemap + overlay switcher for the Player (controlled overlay state for TimeSlider sharing) */
export default function PlayerBasemapSwitcher({
  overlayId,
  opacity,
  onOverlayChange,
  initialBasemapId,
}: PlayerBasemapSwitcherProps) {
  const map = useMap();

  const rawBasemapId = initialBasemapId ?? DEFAULT_BASEMAP_ID;
  const initBasemapId = BASEMAPS.some((b) => b.id === rawBasemapId) ? rawBasemapId : DEFAULT_BASEMAP_ID;

  const [current, setCurrent] = useState(initBasemapId);
  const [open, setOpen] = useState(false);
  const layerRef = useRef<L.Layer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cross-fade overlay layer (shared with TimeSlider via useOverlayLayer hook)
  useOverlayLayer({ map, overlayId, opacity });

  // Prevent map drag/scroll when interacting with this control
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  const applyBasemap = (bm: BasemapDef) => {
    if (layerRef.current) map.removeLayer(layerRef.current);
    const layer = createBasemapLayer(bm);
    layer.addTo(map);
    if ('setZIndex' in layer && typeof layer.setZIndex === 'function') {
      (layer as L.TileLayer).setZIndex(0);
    }
    layerRef.current = layer;
  };

  // Initialize basemap tile layer on mount
  useEffect(() => {
    const bm = BASEMAPS.find((b) => b.id === initBasemapId) ?? BASEMAPS[0];
    applyBasemap(bm);
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const switchTo = (bm: BasemapDef) => {
    applyBasemap(bm);
    setCurrent(bm.id);
    setOpen(false);
  };

  const handleSelectOverlay = (ov: OverlayDef) => {
    onOverlayChange({ id: ov.id, opacity });
    if (ov.bounds) {
      const b = L.latLngBounds(ov.bounds);
      if (!b.contains(map.getCenter())) {
        map.fitBounds(b);
      }
    }
  };

  return (
    <div className="basemap-switcher" ref={containerRef}>
      <button
        className={`basemap-switcher__toggle${overlayId ? ' basemap-switcher__toggle--overlay' : ''}`}
        onClick={() => setOpen(!open)}
        title={t('basemap.switch')}
      >
        🗺️
      </button>
      {open && (
        <div
          className="basemap-switcher__menu"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {BASEMAPS.map((bm) => (
            <button
              key={bm.id}
              className={`basemap-switcher__option${current === bm.id ? ' basemap-switcher__option--active' : ''}`}
              onClick={() => switchTo(bm)}
            >
              {t(bm.labelKey)}
            </button>
          ))}

          {/* Historical map overlay section */}
          <div className="basemap-switcher__separator">{t('overlay.title')}</div>
          <button
            className={`basemap-switcher__option${!overlayId ? ' basemap-switcher__option--active' : ''}`}
            onClick={() => onOverlayChange(null)}
          >
            {t('overlay.none')}
          </button>
          {OVERLAY_GROUP_ORDER.map((group) => {
            const items = OVERLAYS.filter((o) => o.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <div className="basemap-switcher__separator basemap-switcher__separator--sub">
                  {t(OVERLAY_GROUP_LABEL_KEY[group] as Parameters<typeof t>[0])}
                </div>
                {items.map((ov) => (
                  <button
                    key={ov.id}
                    className={`basemap-switcher__option${overlayId === ov.id ? ' basemap-switcher__option--active' : ''}`}
                    onClick={() => handleSelectOverlay(ov)}
                  >
                    {t(ov.labelKey)}
                  </button>
                ))}
              </div>
            );
          })}
          {overlayId && (
            <div className="basemap-switcher__slider-row">
              <span className="basemap-switcher__slider-label">{t('overlay.opacity')}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(opacity * 100)}
                onChange={(e) => onOverlayChange({ id: overlayId, opacity: Number(e.target.value) / 100 })}
                className="basemap-switcher__slider"
              />
              <span className="basemap-switcher__slider-value">
                {Math.round(opacity * 100)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
