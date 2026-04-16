import { Polyline, CircleMarker } from 'react-leaflet';
import { useProjectStore } from '../core/store/useProjectStore';
import { ROUTE_COLORS } from '../core/models/routes';

export default function DrawingPreview() {
  const mode = useProjectStore((s) => s.mode);
  const currentDrawing = useProjectStore((s) => s.currentDrawing);
  const routeCount = useProjectStore((s) => s.project.routes.length);

  if (mode !== 'drawRoute' || currentDrawing.length === 0) return null;

  const color = ROUTE_COLORS[routeCount % ROUTE_COLORS.length].stroke;

  return (
    <>
      {currentDrawing.length >= 2 && (
        <Polyline
          positions={currentDrawing}
          pathOptions={{ color, weight: 4, dashArray: '8 6', opacity: 0.7 }}
        />
      )}
      {currentDrawing.map((pt, i) => (
        <CircleMarker
          key={`draw-${i}`}
          center={pt}
          radius={5}
          pathOptions={{ color, fillColor: '#fff', fillOpacity: 1, weight: 2 }}
        />
      ))}
    </>
  );
}
