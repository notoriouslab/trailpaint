/* ── Historical map overlay definitions (Academia Sinica 中研院) ── */

export interface OverlayDef {
  id: string;
  labelKey: 'overlay.jm200k1897' | 'overlay.jm20k1921' | 'overlay.corona1966';
  url: string;
  attribution: string;
  maxZoom: number;
}

export const OVERLAYS: OverlayDef[] = [
  {
    id: 'jm200k_1897',
    labelKey: 'overlay.jm200k1897',
    url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=JM200K_1897-png-{z}-{x}-{y}',
    attribution: '中央研究院人社中心GIS專題中心',
    maxZoom: 18,
  },
  {
    id: 'jm20k_1921',
    labelKey: 'overlay.jm20k1921',
    url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=JM20K_1921-jpg-{z}-{x}-{y}',
    attribution: '中央研究院人社中心GIS專題中心',
    maxZoom: 18,
  },
  {
    id: 'corona_1966',
    labelKey: 'overlay.corona1966',
    url: 'https://gis.sinica.edu.tw/tileserver/file-exists.php?img=Taiwan_Corona_1966-png-{z}-{x}-{y}',
    attribution: '中央研究院人社中心GIS專題中心',
    maxZoom: 18,
  },
];
