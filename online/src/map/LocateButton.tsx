import { useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { t } from '../i18n';

export default function LocateButton() {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [marker, setMarker] = useState<L.CircleMarker | null>(null);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const latlng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        map.flyTo(latlng, Math.max(map.getZoom(), 14), { duration: 0.8 });

        // Remove old marker
        if (marker) map.removeLayer(marker);

        // Add pulsing blue dot
        const dot = L.circleMarker(latlng, {
          radius: 8,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.6,
          weight: 2,
          className: 'locate-pulse',
        }).addTo(map);

        setMarker(dot);

        // Auto-remove after 10s
        setTimeout(() => {
          map.removeLayer(dot);
          setMarker((prev) => (prev === dot ? null : prev));
        }, 10000);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          alert(t('locate.denied'));
        } else {
          alert(t('locate.unavailable'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [map, marker]);

  return (
    <div className="locate-button">
      <button
        className={`locate-button__btn${locating ? ' locate-button__btn--active' : ''}`}
        onClick={handleLocate}
        title={t('locate.title')}
        disabled={locating}
      >
        {locating ? '⏳' : '◎'}
      </button>
    </div>
  );
}
