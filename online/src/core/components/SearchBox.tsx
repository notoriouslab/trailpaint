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

interface SearchBoxProps {
  onSelect: (latlng: [number, number], name: string, addSpot: boolean) => void;
}

export default function SearchBox({ onSelect }: SearchBoxProps) {
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
    // Abort previous request to prevent race condition
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setSearched(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=0`,
      { headers: { 'Accept-Language': 'zh-TW,en', 'User-Agent': 'TrailPaint/1.0' }, signal: controller.signal }
    )
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data: unknown) => {
        setResults(Array.isArray(data) ? data as SearchResult[] : []);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        if (err instanceof DOMException && err.name === 'AbortError') return;
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

  const handleSelect = (r: SearchResult, isPinClick: boolean) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    if (!isFinite(lat) || !isFinite(lon)) return;
    onSelect([lat, lon], r.display_name, isPinClick);
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
                onClick={() => handleSelect(r, false)}
              >
                <span
                  className="search-box__item-icon"
                  style={{ cursor: 'copy', background: 'rgba(0,0,0,0.05)', borderRadius: '4px' }}
                  title="Add as spot"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(r, true);
                  }}
                >
                  {icon}
                </span>
                <div className="search-box__item-text">
                  <div className="search-box__item-name">{name}</div>
                  {address && <div className="search-box__item-addr">{address}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
