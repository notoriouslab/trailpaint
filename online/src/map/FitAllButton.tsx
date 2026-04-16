import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useProjectStore } from '../core/store/useProjectStore';
import { t } from '../i18n';

export default function FitAllButton() {
  const map = useMap();
  const spots = useProjectStore((s) => s.project.spots);
  const routes = useProjectStore((s) => s.project.routes);

  const handleFit = () => {
    const points: L.LatLngExpression[] = [];
    
    // Add all spot coordinates and their card positions
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const halfW = isMobile ? 100 / 2 : 120 / 2; // Match CARD_W in SpotMarker
    const estimatedH = 240; // Max estimated card height with photo/desc

    spots.forEach((s) => {
      points.push(s.latlng);
      // Also include the card's 4 corners if it has an offset
      try {
        const point = map.project(s.latlng);
        // Card top-center is at (offsetX, offsetY)
        // We need 4 corners:
        const corners = [
          L.point(s.cardOffset.x - halfW, s.cardOffset.y), // Top-left
          L.point(s.cardOffset.x + halfW, s.cardOffset.y), // Top-right
          L.point(s.cardOffset.x - halfW, s.cardOffset.y + estimatedH), // Bottom-left
          L.point(s.cardOffset.x + halfW, s.cardOffset.y + estimatedH), // Bottom-right
        ];

        corners.forEach(c => {
          const cardLatLng = map.unproject(point.add(c));
          points.push(cardLatLng);
        });
      } catch (e) {
        // Fallback
      }
    });
    
    // Add all route points
    routes.forEach((r) => {
      r.pts.forEach((pt) => points.push(pt));
    });

    if (points.length === 0) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [60, 60], // Add padding so labels aren't cut off
      maxZoom: 16,
      duration: 1, // Smooth animation
    });
  };

  if (spots.length === 0 && routes.length === 0) return null;

  return (
    <div className="fit-all-button">
      <button
        className="fit-all-button__btn"
        onClick={handleFit}
        title={t('map.fitAll')}
      >
        🏁
      </button>
    </div>
  );
}
