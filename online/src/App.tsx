import { useCallback, useState } from 'react';
import MapView from './map/MapView';
import ImageMapView from './map/ImageMapView';
import Sidebar from './core/components/Sidebar';
import ModeToolbar from './core/components/ModeToolbar';
import OnboardingOverlay from './core/components/OnboardingOverlay';
import { exportPng, saveProject, loadProject, importGpxFile } from './map/ExportButton';
import { flyTo } from './map/useMapRef';
import { useUndoRedoKeys } from './core/hooks/useUndoRedo';
import { useProjectStore } from './core/store/useProjectStore';
import './core/components/Sidebar.css';
import './App.css';

function loadImageFile(file: File) {
  const state = useProjectStore.getState();
  const hasData = state.project.spots.length > 0 || state.project.routes.length > 0;
  if (hasData && !confirm('切換底圖會清除現有景點和路線，確定嗎？')) return;

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
        onExport={exportPng}
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
          </div>
        )}
      </div>
      <OnboardingOverlay />
    </div>
  );
}
