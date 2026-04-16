import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { usePlayerStore } from './usePlayerStore';
import { OVERLAYS } from '../map/overlays';
import { t } from '../i18n';

export default function PlayerOverlay() {
  const map = useMap();
  const project = usePlayerStore((s) => s.project);

  // Initialize from project overlay setting, or null
  const defaultId = project?.overlay?.id ?? null;
  const defaultOpacity = project?.overlay?.opacity ?? 0.5;

  const [overlayId, setOverlayId] = useState<string | null>(defaultId);
  const [overlayOpacity, setOverlayOpacity] = useState(defaultOpacity);
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<L.TileLayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent map drag when interacting with controls
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  // Create / destroy overlay layer
  useEffect(() => {
    if (!overlayId) {
      overlayRef.current = null;
      return;
    }
    const ov = OVERLAYS.find((o) => o.id === overlayId);
    if (!ov) return;
    const layer = L.tileLayer(ov.url, {
      attribution: ov.attribution,
      maxZoom: ov.maxZoom,
      opacity: overlayOpacity,
      crossOrigin: true,
    }).addTo(map);
    layer.setZIndex(1);
    overlayRef.current = layer;
    return () => { map.removeLayer(layer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayId, map]);

  // Update opacity
  useEffect(() => {
    overlayRef.current?.setOpacity(overlayOpacity);
  }, [overlayOpacity]);

  return (
    <div className="player-overlay-ctrl" ref={containerRef}>
      <button
        className={`player-overlay-ctrl__toggle${overlayId ? ' player-overlay-ctrl__toggle--active' : ''}`}
        onClick={() => setOpen(!open)}
        title={t('overlay.title')}
      >
        🗺️
      </button>
      {open && (
        <div className="player-overlay-ctrl__menu">
          <div className="player-overlay-ctrl__header">{t('overlay.title')}</div>
          <button
            className={`player-overlay-ctrl__option${!overlayId ? ' player-overlay-ctrl__option--active' : ''}`}
            onClick={() => setOverlayId(null)}
          >
            {t('overlay.none')}
          </button>
          {OVERLAYS.map((ov) => (
            <button
              key={ov.id}
              className={`player-overlay-ctrl__option${overlayId === ov.id ? ' player-overlay-ctrl__option--active' : ''}`}
              onClick={() => setOverlayId(ov.id)}
            >
              {t(ov.labelKey)}
            </button>
          ))}
          {overlayId && (
            <div className="player-overlay-ctrl__slider-row">
              <span>{t('overlay.opacity')}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(overlayOpacity * 100)}
                onChange={(e) => setOverlayOpacity(Number(e.target.value) / 100)}
              />
              <span>{Math.round(overlayOpacity * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
