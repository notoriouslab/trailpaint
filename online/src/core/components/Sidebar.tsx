import { useState } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import SpotList from './SpotList';
import SpotEditor from './SpotEditor';
import RouteEditor from './RouteEditor';
import ModeToolbar from './ModeToolbar';
import SearchBox from './SearchBox';
import SettingsPanel from './SettingsPanel';
import { polylineDistance, formatDistance } from '../utils/geo';
import { getRouteColor } from '../models/routes';
import { t } from '../../i18n';

interface SidebarProps {
  onFlyTo: (latlng: [number, number], zoom?: number) => void;
  onOpenExportPreview: () => void;
  onSave: () => void;
  onOpenImportWizard: () => void;
}

export default function Sidebar({ onFlyTo, onOpenExportPreview, onSave, onOpenImportWizard }: SidebarProps) {
  const spots = useProjectStore((s) => s.project.spots);
  const routes = useProjectStore((s) => s.project.routes);
  const selectedSpotId = useProjectStore((s) => s.selectedSpotId);
  const selectedRouteId = useProjectStore((s) => s.selectedRouteId);
  const sidebarOpen = useProjectStore((s) => s.sidebarOpen);
  const setSidebarOpen = useProjectStore((s) => s.setSidebarOpen);
  const setSelectedSpot = useProjectStore((s) => s.setSelectedSpot);
  const setSelectedRoute = useProjectStore((s) => s.setSelectedRoute);
  const updateSpot = useProjectStore((s) => s.updateSpot);
  const removeSpot = useProjectStore((s) => s.removeSpot);
  const swapSpots = useProjectStore((s) => s.swapSpots);
  const baseMode = useProjectStore((s) => s.baseMode);
  const clearBackgroundImage = useProjectStore((s) => s.clearBackgroundImage);

  const projectName = useProjectStore((s) => s.project.name);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const [showSettings, setShowSettings] = useState(false);

  const isImageMode = baseMode === 'image';
  const selectedSpot = spots.find((s) => s.id === selectedSpotId) ?? null;
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedSpot(id);
    const spot = spots.find((s) => s.id === id);
    if (spot) onFlyTo(spot.latlng);
  };

  const handleSearchSelect = (latlng: [number, number]) => {
    onFlyTo(latlng, 14);
  };

  const handleUndo = () => useProjectStore.temporal.getState().undo();
  const handleRedo = () => useProjectStore.temporal.getState().redo();

  return (
    <>
      <button
        className={`sidebar-toggle${sidebarOpen ? ' sidebar-toggle--open' : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`sidebar${sidebarOpen ? '' : ' sidebar--closed'}`}>
        <div className="sidebar__header">
          <span className="sidebar__logo">🌿</span>
          <input
            className="sidebar__project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Untitled"
          />
        </div>

        {/* Toolbar row 1 */}
        <div className="sidebar__toolbar">
          <button className="sidebar__tool-btn" onClick={onOpenExportPreview}>{t('app.export')}</button>
          <button className="sidebar__tool-btn" onClick={onSave}>{t('app.save')}</button>
          <button className="sidebar__tool-btn" onClick={onOpenImportWizard}>{t('app.import')}</button>
        </div>

        {/* Toolbar row 2 */}
        <div className="sidebar__toolbar sidebar__toolbar--secondary">
          <button className="sidebar__tool-btn" onClick={handleUndo} title={t('undo')}>↩</button>
          <button className="sidebar__tool-btn" onClick={handleRedo} title={t('redo')}>↪</button>
          {isImageMode && (
            <button className="sidebar__tool-btn" onClick={() => {
              const hasData = spots.length > 0 || routes.length > 0;
              if (!hasData || confirm(t('bg.clearConfirm'))) clearBackgroundImage();
            }} title={t('bg.backToMap')}>
              ↩ {t('bg.backToMap')}
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button
            className={`sidebar__tool-btn${showSettings ? ' sidebar__tool-btn--active' : ''}`}
            onClick={() => setShowSettings(!showSettings)}
          >⚙️</button>
        </div>

        {showSettings && <SettingsPanel />}

        {/* Search — map mode only */}
        {!isImageMode && <SearchBox onSelect={handleSearchSelect} />}

        <ModeToolbar />

        {/* Content */}
        {selectedSpot ? (
          <SpotEditor
            spot={selectedSpot}
            onUpdate={(patch) => updateSpot(selectedSpot.id, patch)}
            onDelete={() => removeSpot(selectedSpot.id)}
            onClose={() => setSelectedSpot(null)}
          />
        ) : selectedRoute ? (
          <RouteEditor
            route={selectedRoute}
            onClose={() => setSelectedRoute(null)}
          />
        ) : (
          <>
            <SpotList
              spots={spots}
              selectedSpotId={selectedSpotId}
              onSelect={handleSelect}
              onSwap={swapSpots}
            />
            {routes.length > 0 && (
              <div className="route-summary">
                <div className="route-summary__title">{t('route.listTitle')}</div>
                {routes.map((r) => {
                  const color = getRouteColor(r.color);
                  // Calculate route bounds center for flyTo
                  const lats = r.pts.map((p) => p[0]);
                  const lngs = r.pts.map((p) => p[1]);
                  const center: [number, number] = [
                    (Math.min(...lats) + Math.max(...lats)) / 2,
                    (Math.min(...lngs) + Math.max(...lngs)) / 2,
                  ];
                  return (
                    <div
                      key={r.id}
                      className="route-summary__item"
                      onClick={() => { setSelectedRoute(r.id); onFlyTo(center, 13); }}
                    >
                      <span className="route-summary__color" style={{ background: color.stroke }} />
                      <div className="route-summary__info">
                        {r.name && <span className="route-summary__name">{r.name}</span>}
                        <span className="route-summary__dist">{formatDistance(polylineDistance(r.pts))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
