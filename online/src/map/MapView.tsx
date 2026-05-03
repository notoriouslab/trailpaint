import { MapContainer, ZoomControl, useMapEvents, useMap } from 'react-leaflet';
import { useProjectStore } from '../core/store/useProjectStore';
import { useEffect } from 'react';
import SpotMarker from './SpotMarker';
import RouteLayer from './RouteLayer';
import DrawingPreview from './DrawingPreview';
import HandDrawnFilter from './HandDrawnFilter';
import BasemapSwitcher from './BasemapSwitcher';
import LocateButton from './LocateButton';
import FitAllButton from './FitAllButton';
import TimeSlider from './TimeSlider';
import MapToast from './MapToast';
import Watermark from './Watermark';
import { setMapInstance } from './useMapRef';
import 'leaflet/dist/leaflet.css';
import './MapView.css';


function MapClickHandler() {
  const mode = useProjectStore((s) => s.mode);
  const addSpot = useProjectStore((s) => s.addSpot);
  const addDrawingPoint = useProjectStore((s) => s.addDrawingPoint);
  const setSelectedSpot = useProjectStore((s) => s.setSelectedSpot);
  const setSelectedRoute = useProjectStore((s) => s.setSelectedRoute);

  useMapEvents({
    click(e) {
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
      switch (mode) {
        case 'select':
          setSelectedSpot(null);
          setSelectedRoute(null);
          break;
        case 'addSpot':
          addSpot(latlng);
          break;
        case 'drawRoute':
          addDrawingPoint(latlng);
          break;
      }
    },
  });
  return null;
}

function MapSync() {
  const map = useMap();
  const setMapView = useProjectStore((s) => s.setMapView);
  const pendingFlyTo = useProjectStore((s) => s.pendingFlyTo);
  const clearPendingFlyTo = useProjectStore((s) => s.clearPendingFlyTo);

  useEffect(() => {
    setMapInstance(map);
    const handler = () => {
      const c = map.getCenter();
      setMapView([c.lat, c.lng], map.getZoom());
    };
    map.on('moveend', handler);
    return () => {
      map.off('moveend', handler);
      setMapInstance(null);
    };
  }, [map, setMapView]);

  useEffect(() => {
    if (pendingFlyTo) {
      map.flyTo(pendingFlyTo.center, pendingFlyTo.zoom, { duration: 0.8 });
      clearPendingFlyTo();
    }
  }, [pendingFlyTo, map, clearPendingFlyTo]);

  return null;
}

function SpotMarkers() {
  const spots = useProjectStore((s) => s.project.spots);
  return <>{spots.map((spot) => <SpotMarker key={spot.id} spot={spot} />)}</>;
}

/** TimeSlider wired to the project store (Editor side). */
function MapTimeSlider() {
  const overlay = useProjectStore((s) => s.project.overlay);
  const setOverlay = useProjectStore((s) => s.setOverlay);
  const spots = useProjectStore((s) => s.project.spots);
  const spotsLatLngs = spots.map((s) => s.latlng);
  return (
    <TimeSlider
      overlayId={overlay?.id ?? null}
      spotsLatLngs={spotsLatLngs}
      onChange={(id) => {
        if (!id) setOverlay(null);
        else setOverlay({ id, opacity: overlay?.opacity ?? 0.5 });
      }}
    />
  );
}

export default function MapView() {
  const center = useProjectStore((s) => s.project.center);
  const zoom = useProjectStore((s) => s.project.zoom);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={3}
      maxZoom={18}
      zoomSnap={0.5}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={150}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <BasemapSwitcher />
      <LocateButton />
      <FitAllButton />
      <MapTimeSlider />
      <HandDrawnFilter />
      <MapClickHandler />
      <MapSync />
      <RouteLayer />
      <DrawingPreview />
      <SpotMarkers />
      <Watermark />
      <MapToast />
    </MapContainer>
  );
}
