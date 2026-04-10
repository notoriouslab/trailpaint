import { useRef, useEffect, useCallback } from 'react';
import type { Route } from '../models/routes';
import { getRouteColor } from '../models/routes';
import { cumulativeDistances, elevationStats, formatDistance, estimateTime, polylineDistance } from '../utils/geo';

interface ElevationProfileProps {
  route: Route;
  onHoverPoint?: (latlng: [number, number] | null) => void;
}

export default function ElevationProfile({ route, onHoverPoint }: ElevationProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elevations = route.elevations;
  const colorDef = getRouteColor(route.color);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !elevations) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dists = cumulativeDistances(route.pts);
    const stats = elevationStats(elevations);

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 8, right: 8, bottom: 20, left: 36 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const maxDist = dists[dists.length - 1] || 1;
    const eleRange = stats.max - stats.min || 1;
    const elePad = eleRange * 0.1;
    const minEle = stats.min - elePad;
    const maxEle = stats.max + elePad;
    const eleSpan = maxEle - minEle;

    const toX = (d: number) => pad.left + (d / maxDist) * plotW;
    const toY = (e: number) => pad.top + plotH - ((e - minEle) / eleSpan) * plotH;

    ctx.fillStyle = '#fdf8ef';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#e5d5c0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#8b6a40';
    ctx.font = '9px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const ele = minEle + (eleSpan / 4) * (4 - i);
      const y = pad.top + (plotH / 4) * i;
      ctx.fillText(`${Math.round(ele)}`, pad.left - 4, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xSteps = Math.min(4, Math.floor(maxDist));
    for (let i = 0; i <= xSteps; i++) {
      const d = (maxDist / (xSteps || 1)) * i;
      ctx.fillText(formatDistance(d), toX(d), h - pad.bottom + 4);
    }

    ctx.beginPath();
    ctx.moveTo(toX(dists[0]), toY(elevations[0]));
    for (let i = 1; i < elevations.length; i++) {
      ctx.lineTo(toX(dists[i]), toY(elevations[i]));
    }
    ctx.lineTo(toX(dists[dists.length - 1]), pad.top + plotH);
    ctx.lineTo(toX(dists[0]), pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = colorDef.glow;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toX(dists[0]), toY(elevations[0]));
    for (let i = 1; i < elevations.length; i++) {
      ctx.lineTo(toX(dists[i]), toY(elevations[i]));
    }
    ctx.strokeStyle = colorDef.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [elevations, route.pts, colorDef]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onHoverPoint || !elevations) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dists = cumulativeDistances(route.pts);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 36;
    const plotW = rect.width - padLeft - 8;
    const maxDist = dists[dists.length - 1] || 1;
    const dist = ((x - padLeft) / plotW) * maxDist;

    let closest = 0;
    let minDiff = Infinity;
    for (let i = 0; i < dists.length; i++) {
      const diff = Math.abs(dists[i] - dist);
      if (diff < minDiff) { minDiff = diff; closest = i; }
    }
    onHoverPoint(route.pts[closest]);
  }, [onHoverPoint, elevations, route.pts]);

  const handleMouseLeave = useCallback(() => {
    if (onHoverPoint) onHoverPoint(null);
  }, [onHoverPoint]);

  // Render nothing if no elevation data, but hooks are always called above
  if (!elevations) return null;

  const stats = elevationStats(elevations);
  const distKm = polylineDistance(route.pts);
  const time = estimateTime(distKm, stats.ascent);

  return (
    <div className="elevation-profile">
      <div className="elevation-profile__stats">
        <span>📏 {formatDistance(distKm)}</span>
        <span>⏱️ {time}</span>
        <span>↗ {stats.ascent}m</span>
        <span>↘ {stats.descent}m</span>
      </div>
      <canvas
        ref={canvasRef}
        className="elevation-profile__canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );
}
