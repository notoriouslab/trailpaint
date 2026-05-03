import { MapContainer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import { usePlayerStore } from './usePlayerStore';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import PlayerBasemapSwitcher from './PlayerBasemapSwitcher';
import PlayerFitAll from './PlayerFitAll';
import ScriptureRefs from './ScriptureRefs';
import LocateButton from '../map/LocateButton';
import TimeSlider from '../map/TimeSlider';
import MapToast from '../map/MapToast';
import PostcardButton from './PostcardButton';
import { getOverlayZoomCap } from '../map/overlays';
import { HISTORY_SCALE, MODERN_TICK } from '../map/eraScales';
import { eraOpacity } from '../map/eraFade';
import { PhotoAttribution } from '../core/components/PhotoAttribution';
import type { Spot } from '../core/models/types';
import 'leaflet/dist/leaflet.css';
import '../map/MapView.css';

/** Fit map to all spots + route points on load */
function FitBounds({ overlayId }: { overlayId: string | null }) {
  const map = useMap();
  const project = usePlayerStore((s) => s.project);

  useEffect(() => {
    if (!project) return;
    const pts: [number, number][] = [
      ...project.spots.map((s) => s.latlng),
      ...project.routes.flatMap((r) => r.pts),
    ];
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 14);
      return;
    }
    const bounds = L.latLngBounds(pts);
    const cap = getOverlayZoomCap(overlayId);
    map.fitBounds(bounds, {
      padding: [40, 40],
      ...(cap !== undefined && { maxZoom: cap }),
    });
    // overlayId intentionally omitted — only fit on initial project load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, project]);

  return null;
}

/** Fly to active spot when it changes — offset north so popup has room above */
function FlyToActive({ overlayId }: { overlayId: string | null }) {
  const map = useMap();
  const project = usePlayerStore((s) => s.project);
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);

  useEffect(() => {
    if (activeIndex === null || activeIndex < 0 || !project) return;
    const spot = project.spots[activeIndex];
    if (!spot) return;
    const cap = getOverlayZoomCap(overlayId);
    let zoom = Math.max(map.getZoom(), 13);
    if (cap !== undefined) zoom = Math.min(zoom, cap);
    // Offset 120px north in screen coords so marker sits in lower half
    const px = map.project(spot.latlng, zoom);
    px.y -= 120;
    const target = map.unproject(px, zoom);
    // Clamp to valid Mercator range
    const safeLat = Math.max(-85, Math.min(85, target.lat));
    map.flyTo([safeLat, target.lng], zoom, { duration: 0.8 });
  }, [map, project, activeIndex, overlayId]);

  return null;
}

/** Marker that auto-opens its popup when active + applies era-fade opacity. */
function ActiveMarker({
  position, icon, active, opacity, children, onClick,
}: {
  position: [number, number];
  icon: L.DivIcon;
  active: boolean;
  opacity: number;
  children: React.ReactNode;
  onClick: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (!markerRef.current) return;
    if (active) {
      const t = setTimeout(() => markerRef.current?.openPopup(), 900);
      return () => clearTimeout(t);
    } else {
      markerRef.current.closePopup();
    }
  }, [active]);

  // Era fade — drive marker opacity from currentYear vs spot.era (T3)
  useEffect(() => {
    markerRef.current?.setOpacity(opacity);
  }, [opacity]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      eventHandlers={{ click: onClick }}
    >
      {children}
    </Marker>
  );
}

/** Popup body — isolated so the broken-image fallback has local state */
function SpotPopupContent({ spot }: { spot: Spot }) {
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => { setImgFailed(false); }, [spot.photo]);

  return (
    <div className="player-popup__body">
      <strong className="player-popup__title">{spot.title}</strong>
      {spot.photo && !imgFailed && (
        <div className="player-popup__img-wrap">
          <img
            src={spot.photo}
            alt={spot.title}
            className="player-popup__img"
            onError={() => setImgFailed(true)}
          />
          <PhotoAttribution meta={spot.photoMeta} />
        </div>
      )}
      {spot.photo && imgFailed && (
        <div className="player-popup__img-fallback">照片載入失敗</div>
      )}
      {spot.desc && <p className="player-popup__desc">{spot.desc}</p>}
      <ScriptureRefs refs={spot.scripture_refs} />
    </div>
  );
}

/** Simple numbered circle icon (cached to avoid re-creating on every render) */
const _iconCache = new Map<string, L.DivIcon>();
function spotIcon(num: number, active: boolean) {
  const key = `${num}-${active ? 1 : 0}`;
  const cached = _iconCache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${active ? '#b45309' : '#fef9e7'};
      color:${active ? '#fff' : '#7c3a0e'};
      border:2px solid #7c3a0e;
      display:flex;align-items:center;justify-content:center;
      font-family:Georgia,serif;font-size:13px;font-weight:bold;
      box-shadow:0 2px 6px rgba(0,0,0,0.2);
    ">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
  _iconCache.set(key, icon);
  return icon;
}

export default function PlayerMap() {
  const project = usePlayerStore((s) => s.project)!;
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);
  const setActiveSpot = usePlayerStore((s) => s.setActiveSpot);
  const setPlaying = usePlayerStore((s) => s.setPlaying);

  // Overlay state lifted up so PlayerBasemapSwitcher and TimeSlider stay in sync.
  // Player session-only — not written back to share link envelope.
  const [overlay, setOverlay] = useState<{ id: string; opacity: number } | null>(
    project.overlay ?? null,
  );

  // currentYear drives spot era fade. Initialised from the project's overlay (if any),
  // falling back to modern. TimeSlider mutates this on drag.
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const ovId = project.overlay?.id;
    if (ovId) {
      const tick = HISTORY_SCALE.find((t) => t.overlayId === ovId);
      if (tick) return tick.year;
    }
    return MODERN_TICK.year;
  });

  return (
    <MapContainer
      center={project.center}
      zoom={project.zoom}
      minZoom={3}
      maxZoom={18}
      zoomSnap={0.5}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <FitBounds overlayId={overlay?.id ?? null} />
      <FlyToActive overlayId={overlay?.id ?? null} />
      <PlayerBasemapSwitcher
        overlayId={overlay?.id ?? null}
        opacity={overlay?.opacity ?? 0.5}
        onOverlayChange={setOverlay}
        initialBasemapId={project.basemapId}
      />
      <PlayerFitAll />
      <LocateButton />
      <TimeSlider
        overlayId={overlay?.id ?? null}
        spotsLatLngs={project.spots.map((s) => s.latlng)}
        onChange={(tick) => {
          setCurrentYear(tick.year);
          if (!tick.overlayId) setOverlay(null);
          else setOverlay({ id: tick.overlayId, opacity: overlay?.opacity ?? 0.5 });
        }}
      />

      {/* Routes */}
      {project.routes.map((r) => (
        <Polyline
          key={r.id}
          positions={r.pts}
          pathOptions={{
            color: r.color,
            weight: 3,
            opacity: 0.8,
            dashArray: '8 6',
            lineCap: 'round',
          }}
        />
      ))}

      {/* Spots */}
      {project.spots.map((spot, i) => (
        <ActiveMarker
          key={spot.id}
          position={spot.latlng}
          icon={spotIcon(spot.num, activeIndex === i)}
          active={activeIndex === i}
          opacity={eraOpacity(spot.era, currentYear)}
          onClick={() => { setPlaying(false); setActiveSpot(i); }}
        >
          <Popup
            maxWidth={480}
            className="player-popup"
            autoPanPaddingTopLeft={[10, 64]}
            autoPanPaddingBottomRight={[10, 90]}
          >
            <SpotPopupContent spot={spot} />
          </Popup>
        </ActiveMarker>
      ))}
      <MapToast />
      <PostcardButton currentYear={currentYear} />
    </MapContainer>
  );
}
