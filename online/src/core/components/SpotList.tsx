import type { Spot } from '../models/types';
import { getIcon } from '../icons';
import { useProjectStore } from '../store/useProjectStore';
import { EXAMPLE_ROUTES, loadExampleRoute } from '../utils/sampleProject';
import { t } from '../../i18n';

interface SpotListProps {
  spots: Spot[];
  selectedSpotId: string | null;
  onSelect: (id: string) => void;
  onSwap: (index: number, direction: 'up' | 'down') => void;
}

export default function SpotList({ spots, selectedSpotId, onSelect, onSwap }: SpotListProps) {
  const importJSON = useProjectStore((s) => s.importJSON);
  const reorderSpots = useProjectStore((s) => s.reorderSpots);

  const handleDragStart = (e: React.DragEvent, index: number) => {
<<<<<<< HEAD
    e.dataTransfer.setData('text/plain', index.toString());
=======
    e.dataTransfer.setData('index', index.toString());
>>>>>>> 54551e3 (feat: enhance UI/UX and add guidebook playback functionality)
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
<<<<<<< HEAD
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
=======
    const sourceIndex = parseInt(e.dataTransfer.getData('index'), 10);
>>>>>>> 54551e3 (feat: enhance UI/UX and add guidebook playback functionality)
    if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      reorderSpots(sourceIndex, targetIndex);
    }
  };

  if (spots.length === 0) {
    return (
      <div className="spot-list__empty">
        {t('spot.empty').split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <select
          className="spot-list__sample-btn"
          value=""
          onChange={async (e) => {
            const name = e.target.value;
            if (!name) return;
            const json = await loadExampleRoute(name);
            if (json) importJSON(json);
            e.target.value = '';
          }}
        >
          <option value="">🌿 {t('spot.loadSample')}</option>
          {EXAMPLE_ROUTES.map((ex) => (
            <option key={ex.name} value={ex.name}>{ex.icon} {ex.name}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="spot-list">
      {spots.map((spot, i) => {
        const icon = getIcon(spot.iconId, spot.customEmoji);
        const active = spot.id === selectedSpotId;
        return (
          <div
            key={spot.id}
            className={`spot-list__item${active ? ' spot-list__item--active' : ''}`}
            onClick={() => onSelect(spot.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, i)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, i)}
          >
            <span className="spot-list__num" style={{ cursor: 'grab' }}>{spot.num}</span>
            <span className="spot-list__emoji">{icon.emoji}</span>
            <span className="spot-list__title">{spot.title}</span>
            <span className="spot-list__arrows">
              <button
                disabled={i === 0}
                onClick={(e) => { e.stopPropagation(); onSwap(i, 'up'); }}
              >▲</button>
              <button
                disabled={i === spots.length - 1}
                onClick={(e) => { e.stopPropagation(); onSwap(i, 'down'); }}
              >▼</button>
            </span>
          </div>
        );
      })}
    </div>
  );
}
