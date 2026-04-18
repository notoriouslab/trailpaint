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
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
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

  const renderItem = (spot: Spot, flatIdx: number) => {
    const icon = getIcon(spot.iconId);
    const active = spot.id === selectedSpotId;
    const pendingClass = spot.pendingLocation ? ' spot-list__item--pending' : '';
    return (
      <div
        key={spot.id}
        className={`spot-list__item${active ? ' spot-list__item--active' : ''}${pendingClass}`}
        onClick={() => onSelect(spot.id)}
        draggable
        onDragStart={(e) => handleDragStart(e, flatIdx)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, flatIdx)}
      >
        <span className="spot-list__num" style={{ cursor: 'grab' }}>{spot.num}</span>
        <span className="spot-list__emoji">{icon.emoji}</span>
        <span className="spot-list__title">{spot.title}</span>
        <span className="spot-list__arrows">
          <button
            disabled={flatIdx === 0}
            onClick={(e) => { e.stopPropagation(); onSwap(flatIdx, 'up'); }}
          >▲</button>
          <button
            disabled={flatIdx === spots.length - 1}
            onClick={(e) => { e.stopPropagation(); onSwap(flatIdx, 'down'); }}
          >▼</button>
        </span>
      </div>
    );
  };

  // 010 D5: group pendingLocation spots at the top so the user can find and
  // relocate them quickly. When no pending spots exist, fall back to the
  // flat list (no headers) to avoid adding chrome for the common case.
  const withIdx = spots.map((spot, i) => ({ spot, i }));
  const pending = withIdx.filter((x) => x.spot.pendingLocation);
  const located = withIdx.filter((x) => !x.spot.pendingLocation);

  if (pending.length === 0) {
    return (
      <div className="spot-list">
        {spots.map((spot, i) => renderItem(spot, i))}
      </div>
    );
  }

  return (
    <div className="spot-list">
      <div className="spot-list__group-header">
        {t('spot.pendingLocationGroup')} ({pending.length})
      </div>
      {pending.map(({ spot, i }) => renderItem(spot, i))}
      <div className="spot-list__group-header">
        {t('spot.locatedGroup')} ({located.length})
      </div>
      {located.map(({ spot, i }) => renderItem(spot, i))}
    </div>
  );
}
