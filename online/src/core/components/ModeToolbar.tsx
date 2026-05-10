import type { Mode } from '../models/types';
import { useProjectStore } from '../store/useProjectStore';
import { t } from '../../i18n';

const MODES: { mode: Mode; icon: string; labelKey: 'mode.select' | 'mode.addSpot' | 'mode.drawRoute' }[] = [
  { mode: 'select', icon: '🖱️', labelKey: 'mode.select' },
  { mode: 'addSpot', icon: '📍', labelKey: 'mode.addSpot' },
  { mode: 'drawRoute', icon: '🖊️', labelKey: 'mode.drawRoute' },
];

export default function ModeToolbar() {
  const mode = useProjectStore((s) => s.mode);
  const setMode = useProjectStore((s) => s.setMode);
  const currentDrawing = useProjectStore((s) => s.currentDrawing);
  const finishRoute = useProjectStore((s) => s.finishRoute);
  const cancelDrawing = useProjectStore((s) => s.cancelDrawing);
  const connectSpotsAsRoute = useProjectStore((s) => s.connectSpotsAsRoute);
  const spots = useProjectStore((s) => s.project.spots);

  return (
    <div className="mode-toolbar">
      <div className="mode-toolbar__modes">
        {MODES.map((m) => (
          <button
            key={m.mode}
            className={`mode-toolbar__btn${mode === m.mode ? ' mode-toolbar__btn--active' : ''}`}
            onClick={() => setMode(m.mode)}
            title={t(m.labelKey)}
          >
            <span className="mode-toolbar__icon">{m.icon}</span>
            <span className="mode-toolbar__label">{t(m.labelKey)}</span>
          </button>
        ))}
      </div>

      {mode === 'drawRoute' && (
        <div className="mode-toolbar__draw-actions">
          <span className="mode-toolbar__hint">
            {currentDrawing.length === 0
              ? t('route.hintStart')
              : `${currentDrawing.length} ${t('route.hintPoints')}`}
          </span>
          <button
            className="mode-toolbar__action-btn mode-toolbar__action-btn--finish"
            onClick={finishRoute}
            disabled={currentDrawing.length < 2}
          >
            {t('route.finish')}
          </button>
          <button
            className="mode-toolbar__action-btn"
            onClick={connectSpotsAsRoute}
            disabled={spots.length < 2}
          >
            {t('route.connectSpots')}
          </button>
          <button
            className="mode-toolbar__action-btn"
            onClick={cancelDrawing}
          >
            {t('route.cancel')}
          </button>
        </div>
      )}
    </div>
  );
}
