import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { leafletLayer } from 'protomaps-leaflet';
import { t, currentLocale } from '../i18n';

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
      });
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
    <div className="basemap-switcher">
      <button
        className="basemap-switcher__toggle"
        onClick={() => setOpen(!open)}
        title={t('basemap.switch')}
      >
        🗺️
      </button>
      {open && (
        <div className="basemap-switcher__menu">
          {BASEMAPS.map((bm) => (
            <button
              key={bm.id}
              className={`basemap-switcher__option${current === bm.id ? ' basemap-switcher__option--active' : ''}`}
              onClick={() => switchTo(bm)}
            >
              {t(bm.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
