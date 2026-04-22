import { useState, useRef, useCallback, useEffect } from 'react';
import { t } from '../../i18n';

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

const TYPE_ICONS: Record<string, string> = {
  peak: '⛰️',
  mountain: '⛰️',
  volcano: '🌋',
  hill: '⛰️',
  national_park: '🌲',
  park: '🌳',
  nature_reserve: '🌿',
  water: '💧',
  river: '🏞️',
  lake: '💧',
  village: '🏘️',
  town: '🏘️',
  city: '🏙️',
  hamlet: '🏠',
  trail: '🥾',
  path: '🥾',
  bus_stop: '🚌',
  station: '🚉',
  parking: '🅿️',
  viewpoint: '🔭',
  camp_site: '⛺',
  shelter: '🛖',
  coordinate: '📌',
};

function getTypeIcon(type: string, cls: string): string {
  return TYPE_ICONS[type] || TYPE_ICONS[cls] || '📍';
}

function splitName(displayName: string): { name: string; address: string } {
  const parts = displayName.split(',').map((s) => s.trim());
  if (parts.length <= 1) return { name: displayName, address: '' };
  return {
    name: parts[0],
    address: parts.slice(1, 3).join(', '),
  };
}

/** Detect coordinate input like "25.0330, 121.5654" or "25.0330 121.5654" */
const COORD_RE = /^\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)\s*$/;

function parseCoords(input: string): [number, number] | null {
  const m = input.match(COORD_RE);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (!isFinite(lat) || !isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

interface SearchBoxProps {
  onSelect: (latlng: [number, number], name: string) => void;
  onAddSpot?: (latlng: [number, number], title: string) => void;
}

export default function SearchBox({ onSelect, onAddSpot }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup timer and abort on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    // Check for coordinate input (e.g. "25.0330, 121.5654")
    const coords = parseCoords(q);
    if (coords) {
      setResults([{
        display_name: `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`,
        lat: String(coords[0]),
        lon: String(coords[1]),
        type: 'coordinate',
        class: 'coordinate',
      }]);
      setSearched(true);
      setLoading(false);
      return;
    }

    // Abort previous request to prevent race condition
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSearched(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=0`,
      { headers: { 'Accept-Language': 'zh-TW,en' }, signal: controller.signal }
    )
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: unknown) => {
        setResults(Array.isArray(data) ? data as SearchResult[] : []);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setResults([]);
        setLoading(false);
      });
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    timerRef.current = setTimeout(() => search(value), 400);
  };

  const handleSelect = (r: SearchResult) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    if (!isFinite(lat) || !isFinite(lon)) return;
    const { name } = splitName(r.display_name);
    onSelect([lat, lon], r.display_name);
    // Coordinate input: also create a spot at that location
    if (r.type === 'coordinate' && onAddSpot) {
      onAddSpot([lat, lon], name);
    }
    setQuery('');
    setResults([]);
    setSearched(false);
  };

  const showDropdown = loading || (searched && query.trim().length >= 2);

  return (
    <div className="search-box">
      <div className="search-box__input-wrap">
        <span className="search-box__icon">🔍</span>
        <input
          className="search-box__input"
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          placeholder={t('search.placeholder')}
        />
        {query && (
          <button
            className="search-box__clear"
            onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
          >✕</button>
        )}
      </div>
      {showDropdown && (
        <div className="search-box__dropdown">
          {loading && (
            <div className="search-box__loading">
              <span className="search-box__spinner" />
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="search-box__empty">{t('search.noResult')}</div>
          )}
          {!loading && results.map((r, i) => {
            const { name, address } = splitName(r.display_name);
            const icon = getTypeIcon(r.type, r.class);
            return (
              <div
                key={i}
                className="search-box__item"
                onClick={() => handleSelect(r)}
              >
                <span className="search-box__item-icon">{icon}</span>
                <div className="search-box__item-text">
                  <div className="search-box__item-name">{name}</div>
                  {address && <div className="search-box__item-addr">{address}</div>}
                </div>
                {onAddSpot && (
                  <button
                    className="search-box__add-btn"
                    title={t('mode.addSpot')}
                    onClick={(e) => {
                      e.stopPropagation();
                      const lat = parseFloat(r.lat);
                      const lon = parseFloat(r.lon);
                      if (!isFinite(lat) || !isFinite(lon)) return;
                      onSelect([lat, lon], r.display_name); // Also fly to it
                      onAddSpot([lat, lon], name);
                      setQuery('');
                      setResults([]);
                      setSearched(false);
                    }}
                  >
                    ＋
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
