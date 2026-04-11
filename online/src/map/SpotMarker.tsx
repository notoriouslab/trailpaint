import { useRef, useEffect, useCallback } from 'react';
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

/** Zoom-aware scale: linear, clamped 0.5–1.3, baseZoom=14 */
function getZoomScale(zoom: number): number {
  return Math.max(0.5, Math.min(1.3, 1 + (zoom - 14) * 0.12));
}

const MOBILE_MQ = '(max-width: 768px)';
const CARD_W_DESKTOP = 180;
const CARD_W_MOBILE = 150;

export default function SpotMarker({ spot }: { spot: Spot }) {
  const map = useMap();
  const selectedSpotId = useProjectStore((s) => s.selectedSpotId);
  const setSelectedSpot = useProjectStore((s) => s.setSelectedSpot);
  const updateSpot = useProjectStore((s) => s.updateSpot);
  const markerRef = useRef<L.Marker | null>(null);

  const selected = selectedSpotId === spot.id;
  const icon = getIcon(spot.iconId);

  const pinIcon = L.divIcon({
    className: 'spot-pin',
    html: `<div class="spot-pin__circle"><span>${escapeHtml(icon.emoji)}</span></div>`,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
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
        draggable
        ref={markerRef}
        eventHandlers={{
          dragend: onMarkerDragEnd,
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedSpot(spot.id);
          },
        }}
      />
      <CardOverlay
        spot={spot}
        selected={selected}
        map={map}
        onSelect={() => setSelectedSpot(spot.id)}
        onUpdateOffset={(offset) => updateSpot(spot.id, { cardOffset: offset })}
      />
    </>
  );
}

/* ── Card overlay: rendered as a portal in the map container ── */

interface CardOverlayProps {
  spot: Spot;
  selected: boolean;
  map: L.Map;
  onSelect: () => void;
  onUpdateOffset: (offset: { x: number; y: number }) => void;
}

function CardOverlay({ spot, selected, map, onSelect, onUpdateOffset }: CardOverlayProps) {
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

  // Card dragging
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    map.dragging.disable();
    dragRef.current = {
      mx: e.clientX, my: e.clientY,
      ox: spot.cardOffset.x, oy: spot.cardOffset.y,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      onUpdateOffset({
        x: dragRef.current.ox + (ev.clientX - dragRef.current.mx),
        y: dragRef.current.oy + (ev.clientY - dragRef.current.my),
      });
    };
    const onUp = () => {
      dragRef.current = null;
      map.dragging.enable();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);
  }, [map, spot.cardOffset, onUpdateOffset]);

  // Touch drag (parallel to mouse drag)
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // only single-finger drag
    e.stopPropagation();
    map.dragging.disable();
    const touch = e.touches[0];
    dragRef.current = {
      mx: touch.clientX, my: touch.clientY,
      ox: spot.cardOffset.x, oy: spot.cardOffset.y,
    };

    const onMove = (ev: TouchEvent) => {
      if (!dragRef.current) return;
      if (ev.touches.length > 1) {
        // Multi-finger: cancel drag, let map handle pinch-zoom
        cleanup();
        return;
      }
      ev.preventDefault();
      const t = ev.touches[0];
      onUpdateOffset({
        x: dragRef.current.ox + (t.clientX - dragRef.current.mx),
        y: dragRef.current.oy + (t.clientY - dragRef.current.my),
      });
    };
    const cleanup = () => {
      dragRef.current = null;
      map.dragging.enable();
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', cleanup);
      window.removeEventListener('touchcancel', cleanup);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', cleanup);
    window.addEventListener('touchcancel', cleanup);
  }, [map, spot.cardOffset, onUpdateOffset]);

  return createPortal(
    <div
      ref={wrapRef}
      className="spot-overlay"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
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
      <SpotCard spot={spot} selected={selected} onSelect={onSelect} />
    </div>,
    map.getContainer(),
  );
}
