import { useCallback, useState, useEffect } from 'react';
import MapView from './map/MapView';
import ImageMapView from './map/ImageMapView';
import Sidebar from './core/components/Sidebar';
import ModeToolbar from './core/components/ModeToolbar';
import OnboardingOverlay from './core/components/OnboardingOverlay';
import ExportPreview from './core/components/ExportPreview';
import FloatingActions from './core/components/FloatingActions';
import { captureMap, saveProject, loadProject, importGpxFile } from './map/ExportButton';
import { decodeShareLink } from './core/utils/shareLink';
import { flyTo } from './map/useMapRef';
import { useUndoRedoKeys } from './core/hooks/useUndoRedo';
import { useProjectStore } from './core/store/useProjectStore';
import { t } from './i18n';
import './core/components/Sidebar.css';
import './App.css';

const MAX_BG_SIZE = 10 * 1024 * 1024; // 10MB (background can be larger than spot photos)

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
      const img = await captureMap(2);
      setExportPreviewImage(img);
    } catch (err) {
      console.error('Capture failed:', err);
      alert(t('export.failed'));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFile(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  return (
    <div
      className={`app${dragOver ? ' app--drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <Sidebar
        onFlyTo={flyTo}
        onOpenExportPreview={handleOpenExportPreview}
        onSave={saveProject}
        onLoad={loadProject}
        onImportGpx={importGpxFile}
        onUploadBg={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = () => {
            const file = input.files?.[0];
            if (file) loadImageFile(file);
          };
          input.click();
        }}
      />
      <div className="map-container">
        {baseMode === 'map' ? <MapView /> : <ImageMapView />}
        {/* Floating ModeToolbar for mobile when sidebar is closed */}
        {!sidebarOpen && (
          <div className="floating-mode-toolbar">
            <ModeToolbar />
            <FloatingActions
              onExport={handleOpenExportPreview}
              onSave={saveProject}
              onLoad={loadProject}
              onImportGpx={importGpxFile}
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
          onRecapture={captureMap}
        />
      )}
    </div>
  );
}
