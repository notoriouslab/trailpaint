export interface Route {
  id: string;
  name: string;                  // display name (auto-filled via reverse geocode)
  pts: [number, number][];       // [lat, lng][]
  color: string;                 // ROUTE_COLORS id
  elevations: number[] | null;   // meters, same length as pts; null if no elevation data
}

export interface RouteColorDef {
  id: string;
  stroke: string;
  glow: string;
  hi: string;
  label: string;
}

export const ROUTE_COLORS: RouteColorDef[] = [
  { id: 'orange', stroke: '#e05a1a', glow: 'rgba(212,153,30,0.22)', hi: 'rgba(255,200,120,0.50)', label: '橘' },
  { id: 'blue',   stroke: '#2563eb', glow: 'rgba(37,99,235,0.18)',  hi: 'rgba(147,197,253,0.50)', label: '藍' },
  { id: 'green',  stroke: '#16a34a', glow: 'rgba(22,163,74,0.18)',  hi: 'rgba(134,239,172,0.50)', label: '綠' },
  { id: 'red',    stroke: '#dc2626', glow: 'rgba(220,38,38,0.18)',  hi: 'rgba(252,165,165,0.50)', label: '紅' },
  { id: 'purple', stroke: '#9333ea', glow: 'rgba(147,51,234,0.18)', hi: 'rgba(216,180,254,0.50)', label: '紫' },
];

export function getRouteColor(id: string): RouteColorDef {
  return ROUTE_COLORS.find((c) => c.id === id) ?? ROUTE_COLORS[0];
}
