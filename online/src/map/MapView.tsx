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
import PlaybackManager from './PlaybackManager';
import Watermark from './Watermark';
import { setMapInstance, getMapInstance } from './useMapRef';
import 'leaflet/dist/leaflet.css';
import './MapView.css';


function MapClickHandler() {
  const mode = useProjectStore((s) => s.mode);
  const addSpot = useProjectStore((s) => s.addSpot);
  const addDrawingPoint = useProjectStore((s) => s.addDrawingPoint);
  const setSelectedSpot = useProjectStore((s) => s.setSelectedSpot);
  const setSelectedRoute = useProjectStore((s) => s.setSelectedRoute);
  const playing = useProjectStore((s) => s.playing);
  const playMode = useProjectStore((s) => s.playMode);
  const nextSpot = useProjectStore((s) => s.nextSpot);

  useMapEvents({
    click(e) {
      if (playing && playMode === 'manual') {
        nextSpot();
        return;
      }
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
      if (map.off) map.off('moveend', handler);
      // Only clear global instance if it's still us (prevents race during mode switch)
      if (getMapInstance() === map) {
        setMapInstance(null);
      }
    };
  }, [map, setMapView]);

  useEffect(() => {
    if (pendingFlyTo) {
      map.flyTo(pendingFlyTo.center, pendingFlyTo.zoom, { duration: 1 });
      clearPendingFlyTo();
    }
  }, [pendingFlyTo, map, clearPendingFlyTo]);

  return null;
}

function SpotMarkers() {
  const spots = useProjectStore((s) => s.project.spots);
  return <>{spots.map((spot) => <SpotMarker key={spot.id} spot={spot} />)}</>;
}

function CursorHandler() {
  const mode = useProjectStore((s) => s.mode);
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.classList.remove('cursor-add-spot', 'cursor-draw-route');
    if (mode === 'addSpot') container.classList.add('cursor-add-spot');
    else if (mode === 'drawRoute') container.classList.add('cursor-draw-route');
  }, [mode, map]);

  return null;
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
      <HandDrawnFilter />
      <MapClickHandler />
      <MapSync />
      <CursorHandler />
      <PlaybackManager />
      <RouteLayer />
      <DrawingPreview />
      <SpotMarkers />
      <Watermark />
    </MapContainer>
  );
}
