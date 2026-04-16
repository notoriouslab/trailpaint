import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { leafletLayer } from 'protomaps-leaflet';
import { t, currentLocale } from '../i18n';
import { useProjectStore } from '../core/store/useProjectStore';
import { OVERLAYS } from './overlays';

/* ── Locale → Protomaps lang code (derived from app i18n, not navigator) ── */

const PROTOMAPS_LANG_MAP: Record<string, string> = {
  'zh-TW': 'zh-Hant',
  'zh': 'zh-Hant',
  'en': 'en',
  'ja': 'ja',
};
const PROTOMAPS_LANG = PROTOMAPS_LANG_MAP[currentLocale] ?? 'en';
const PROTOMAPS_KEY = import.meta.env.VITE_PROTOMAPS_KEY as string | undefined;

/* ── Basemap definitions (discriminated union) ── */

interface RasterBasemap {
  id: string;
  labelKey: 'basemap.voyager' | 'basemap.satellite' | 'basemap.topo' | 'basemap.dark';
  type: 'raster';
  url: string;
  attribution: string;
  maxZoom?: number;
}

interface VectorBasemap {
  id: string;
  labelKey: 'basemap.multilingual';
  type: 'vector';
  flavor: string;
}

type BasemapDef = RasterBasemap | VectorBasemap;

const BASEMAPS: BasemapDef[] = [
  {
    id: 'voyager',
    labelKey: 'basemap.voyager',
    type: 'raster',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  {
    id: 'satellite',
    labelKey: 'basemap.satellite',
    type: 'raster',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  {
    id: 'topo',
    labelKey: 'basemap.topo',
    type: 'raster',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; OSM',
    maxZoom: 17,
  },
  {
    id: 'dark',
    labelKey: 'basemap.dark',
    type: 'raster',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OSM &copy; CARTO',
  },
  // Vector tile: Protomaps with language support
  ...(PROTOMAPS_KEY
    ? [{
        id: 'multilingual',
        labelKey: 'basemap.multilingual' as const,
        type: 'vector' as const,
        flavor: 'light',
      }]
    : []),
];

export default function BasemapSwitcher() {
  const map = useMap();
  const [current, setCurrent] = useState('voyager');
  const [open, setOpen] = useState(false);
  const layerRef = useRef<L.Layer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent map drag/scroll when interacting with this control
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      L.DomEvent.disableClickPropagation(el);
      L.DomEvent.disableScrollPropagation(el);
    }
  }, []);

  // Overlay state (persisted in project store)
  const overlay = useProjectStore((s) => s.project.overlay);
  const setOverlay = useProjectStore((s) => s.setOverlay);
  const overlayId = overlay?.id ?? null;
  const overlayOpacity = overlay?.opacity ?? 0.5;
  const overlayRef = useRef<L.TileLayer | null>(null);

  // Initialize default tile layer on mount
  useEffect(() => {
    const defaultBm = BASEMAPS[0] as RasterBasemap;
    const layer = L.tileLayer(defaultBm.url, {
      attribution: defaultBm.attribution,
      maxZoom: defaultBm.maxZoom ?? 19,
      crossOrigin: true,
    }).addTo(map);
    (layer as L.TileLayer).setZIndex(0);
    layerRef.current = layer;
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map]);

  // Create / destroy overlay layer when selection changes
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

  // Update overlay opacity without recreating layer
  useEffect(() => {
    overlayRef.current?.setOpacity(overlayOpacity);
  }, [overlayOpacity]);

  const switchTo = (bm: BasemapDef) => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    let layer: L.Layer;
    if (bm.type === 'vector') {
      layer = leafletLayer({
        url: `https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=${encodeURIComponent(PROTOMAPS_KEY!)}`,
        flavor: bm.flavor,
        lang: PROTOMAPS_LANG,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a> Protomaps',
      }) as unknown as L.Layer;
    } else {
      layer = L.tileLayer(bm.url, {
        attribution: bm.attribution,
        maxZoom: bm.maxZoom ?? 19,
        crossOrigin: true,
      });
    }
    layer.addTo(map);
    if ('setZIndex' in layer && typeof layer.setZIndex === 'function') {
      (layer as L.TileLayer).setZIndex(0);
    }
    layerRef.current = layer;
    setCurrent(bm.id);
    setOpen(false);
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
            onClick={() => setOverlay(null)}
          >
            {t('overlay.none')}
          </button>
          {OVERLAYS.map((ov) => (
            <button
              key={ov.id}
              className={`basemap-switcher__option${overlayId === ov.id ? ' basemap-switcher__option--active' : ''}`}
              onClick={() => setOverlay({ id: ov.id, opacity: overlayOpacity })}
            >
              {t(ov.labelKey)}
            </button>
          ))}
          {overlayId && (
            <div className="basemap-switcher__slider-row">
              <span className="basemap-switcher__slider-label">{t('overlay.opacity')}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(overlayOpacity * 100)}
                onChange={(e) => setOverlay({ id: overlayId!, opacity: Number(e.target.value) / 100 })}
                className="basemap-switcher__slider"
              />
              <span className="basemap-switcher__slider-value">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
