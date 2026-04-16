import { useRef, useEffect, useCallback, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { createPortal } from 'react-dom';
import SpotCard from '../core/components/SpotCard';
import '../core/components/SpotCard.css';
import type { Spot } from '../core/models/types';
import { getIcon } from '../core/icons';
import { useProjectStore } from '../core/store/useProjectStore';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Zoom-aware scale: linear, clamped 0.5–1, baseZoom=14 */
function getZoomScale(zoom: number): number {
  return Math.max(0.5, Math.min(1, 1 + (zoom - 14) * 0.12));
}

const MOBILE_MQ = '(max-width: 768px)';
const CARD_W_DESKTOP = 120;
const CARD_W_MOBILE = 100;

export default function SpotMarker({ spot }: { spot: Spot }) {
  const map = useMap();
  const selectedSpotId = useProjectStore((s) => s.selectedSpotId);
  const setSelectedSpot = useProjectStore((s) => s.setSelectedSpot);
  const updateSpot = useProjectStore((s) => s.updateSpot);
  const markerRef = useRef<L.Marker | null>(null);

  const playing = useProjectStore((s) => s.playing);
  const selected = selectedSpotId === spot.id;
  const icon = getIcon(spot.iconId, spot.customEmoji);

  const opacity = playing ? (selected ? 1 : 0.3) : 1;

  const pinIcon = L.divIcon({
    className: `spot-pin${playing && !selected ? ' spot-pin--dimmed' : ''}`,
    html: `<div class="spot-pin__circle"><span>${escapeHtml(icon.emoji)}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const onMarkerDragEnd = useCallback(() => {
    const m = markerRef.current;
    if (!m) return;
    const pos = m.getLatLng();
    updateSpot(spot.id, { latlng: [pos.lat, pos.lng] });
  }, [spot.id, updateSpot]);

  return (
    <>
      <Marker
        position={spot.latlng}
        icon={pinIcon}
        opacity={opacity}
        draggable={!playing}
        ref={markerRef}
        eventHandlers={{
          dragend: onMarkerDragEnd,
          click: (e) => {
            if (playing) return;
            L.DomEvent.stopPropagation(e);
            setSelectedSpot(spot.id);
          },
        }}
      />
      <CardOverlay
        spot={spot}
        selected={selected}
        playing={playing}
        map={map}
        onSelect={() => setSelectedSpot(spot.id)}
        onUpdate={(patch) => updateSpot(spot.id, patch)}
        onUpdateOffset={(offset) => updateSpot(spot.id, { cardOffset: offset })}
      />
    </>
  );
}

/* ── Card overlay: rendered as a portal in the map container ── */

interface CardOverlayProps {
  spot: Spot;
  selected: boolean;
  playing: boolean;
  map: L.Map;
  onSelect: () => void;
  onUpdate: (patch: Partial<Spot>) => void;
  onUpdateOffset: (offset: { x: number; y: number }) => void;
}

function CardOverlay({ spot, selected, playing, map, onSelect, onUpdate, onUpdateOffset }: CardOverlayProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dragRef = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // Reposition card + line on every map move/zoom
  const reposition = useCallback(() => {
    const wrap = wrapRef.current;
    const line = lineRef.current;
    if (!wrap) return;

    const isMobile = window.matchMedia(MOBILE_MQ).matches;
    const halfW = isMobile ? CARD_W_MOBILE / 2 : CARD_W_DESKTOP / 2;
    const scale = getZoomScale(map.getZoom());

    const pt = map.latLngToContainerPoint(spot.latlng);
    wrap.style.transform = `translate(${pt.x + spot.cardOffset.x - halfW}px, ${pt.y + spot.cardOffset.y}px) scale(${scale})`;

    // Set CSS variable for pin circle scale
    map.getContainer().style.setProperty('--spot-scale', String(scale));

    // Connector line: divide by scale to compensate transform scale on the SVG
    if (line) {
      line.setAttribute('x1', String(halfW));
      line.setAttribute('y1', '0');
      line.setAttribute('x2', String(-spot.cardOffset.x / scale + halfW));
      line.setAttribute('y2', String(-spot.cardOffset.y / scale));
    }
  }, [map, spot.latlng, spot.cardOffset]);

  useEffect(() => {
    reposition();
    map.on('move zoom viewreset', reposition);
    // Listen for viewport resize (desktop ↔ mobile)
    const mq = window.matchMedia(MOBILE_MQ);
    const onResize = () => reposition();
    mq.addEventListener('change', onResize);
    return () => {
      map.off('move zoom viewreset', reposition);
      mq.removeEventListener('change', onResize);
    };
  }, [map, reposition]);

  const [isDragging, setIsDragging] = useState(false);


  // Unified Drag Handler
  useEffect(() => {
    if (!isDragging || !dragRef.current) return;

    const onMove = (clientX: number, clientY: number) => {
      if (!dragRef.current) return;
      onUpdateOffset({
        x: dragRef.current.ox + (clientX - dragRef.current.mx),
        y: dragRef.current.oy + (clientY - dragRef.current.my),
      });
    };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        setIsDragging(false);
        return;
      }
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchcancel', handleUp);
    window.addEventListener('blur', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchcancel', handleUp);
      window.removeEventListener('blur', handleUp);
      map.dragging.enable();
    };
  }, [isDragging, map, onUpdateOffset]);

  const onStart = (clientX: number, clientY: number) => {
    map.dragging.disable();
    dragRef.current = {
      mx: clientX, my: clientY,
      ox: spot.cardOffset.x, oy: spot.cardOffset.y,
    };
    setIsDragging(true);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onStart(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.stopPropagation();
    onStart(e.touches[0].clientX, e.touches[0].clientY);
  };



  const container = map.getContainer();
  if (!container) return null;

  return createPortal(
    <div
      ref={wrapRef}
      className={`spot-overlay${playing && !selected ? ' spot-overlay--dimmed' : ''}`}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={(e) => { 
        if (playing) return;
        e.stopPropagation(); 
        onSelect(); 
      }}
    >
      {/* Connector */}
      <svg className="spot-connector">
        <line
          ref={lineRef}
          stroke="rgba(100,50,10,0.55)"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
      </svg>
      <SpotCard spot={spot} selected={selected} onSelect={onSelect} onUpdate={onUpdate} />
    </div>,
    container,
  );
}
