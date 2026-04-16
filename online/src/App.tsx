import { useCallback, useState, useEffect } from 'react';
import MapView from './map/MapView';
import ImageMapView from './map/ImageMapView';
import Sidebar from './core/components/Sidebar';
import ModeToolbar from './core/components/ModeToolbar';
import OnboardingOverlay from './core/components/OnboardingOverlay';
import ExportPreview from './core/components/ExportPreview';
import ImportWizard from './core/components/ImportWizard';
import FloatingActions from './core/components/FloatingActions';
import { captureMap, saveProject } from './map/ExportButton';
import { decodeShareLink } from './core/utils/shareLink';
import { flyTo, panBy, zoomBy } from './map/useMapRef';
import { useUndoRedoKeys } from './core/hooks/useUndoRedo';
import { useProjectStore } from './core/store/useProjectStore';
import { t } from './i18n';
import './core/components/Sidebar.css';
import './App.css';

const MAX_BG_SIZE = 10 * 1024 * 1024;

function loadImageFile(file: File) {
  if (file.size > MAX_BG_SIZE) {
    alert(t('bg.tooLarge'));
    return;
  }
  const state = useProjectStore.getState();
  const hasData = state.project.spots.length > 0 || state.project.routes.length > 0;
  if (hasData && !confirm(t('bg.switchConfirm'))) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      useProjectStore.getState().setBackgroundImage(
        reader.result as string,
        img.width,
        img.height,
      );
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
}

export default function App() {
  useUndoRedoKeys();
  const baseMode = useProjectStore((s) => s.baseMode);
  const sidebarOpen = useProjectStore((s) => s.sidebarOpen);
  const [dragOver, setDragOver] = useState(false);
  const [exportPreviewImage, setExportPreviewImage] = useState<HTMLImageElement | null>(null);
  const [importWizardOpen, setImportWizardOpen] = useState(false);

  // Handle share link on load
  useEffect(() => {
    if (!window.location.hash.startsWith('#share=')) return;
    decodeShareLink(window.location.hash).then((project) => {
      if (project) {
        useProjectStore.getState().importJSON(JSON.stringify(project));
      }
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }).catch(() => {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      alert(t('import.failed'));
    });
  }, []);

  const handleOpenExportPreview = useCallback(async () => {
    try {
      // Collapse sidebar so the map expands to full width before capture.
      // Pan the map left by half the sidebar width so the original composition
      // center stays in the middle of the now-wider map.
      if (useProjectStore.getState().sidebarOpen) {
        useProjectStore.getState().setSidebarOpen(false);
        // Wait for sidebar slide animation (250ms) + Leaflet resize settle
        await new Promise((r) => setTimeout(r, 350));
        panBy(-150, 0); // sidebar is 300px → shift left by half
        await new Promise((r) => setTimeout(r, 100));
      }
      const img = await captureMap(2);
      setExportPreviewImage(img);
    } catch (err) {
      console.error('Capture failed:', err);
      alert(t('export.failed'));
    }
  }, []);

  const handleAdjustView = useCallback(async (dx: number, dy: number, dZoom: number): Promise<HTMLImageElement> => {
    if (dx || dy) panBy(dx, dy);
    if (dZoom) zoomBy(dZoom);
    // Wait for tiles to load after adjustment
    await new Promise((r) => setTimeout(r, 400));
    const img = await captureMap(2);
    setExportPreviewImage(img);
    return img;
  }, []);

  const handleOpenImportWizard = useCallback(() => {
    setImportWizardOpen(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFile(file);
    }
  }, []);

  return (
    <div className="app">
      <Sidebar
        onFlyTo={flyTo}
        onOpenExportPreview={handleOpenExportPreview}
        onSave={saveProject}
        onOpenImportWizard={handleOpenImportWizard}
      />
      <div className="map-container">
        {baseMode === 'map' ? <MapView /> : <ImageMapView />}
        {!sidebarOpen && (
          <div className="floating-mode-toolbar">
            <ModeToolbar />
            <FloatingActions
              onExport={handleOpenExportPreview}
              onSave={saveProject}
              onImport={handleOpenImportWizard}
              onToggleSettings={() => useProjectStore.getState().setSidebarOpen(true)}
            />
          </div>
        )}
      </div>
      <OnboardingOverlay />
      {exportPreviewImage && (
        <ExportPreview
          baseImage={exportPreviewImage}
          onClose={() => setExportPreviewImage(null)}
          onAdjust={handleAdjustView}
        />
      )}
      {importWizardOpen && (
        <ImportWizard
          onClose={() => setImportWizardOpen(false)}
          onLoadImage={loadImageFile}
        />
      )}
    </div>
  );
}
