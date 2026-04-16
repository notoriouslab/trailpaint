import { useEffect, useRef } from 'react';
import { usePlayerStore } from './usePlayerStore';
import { ICONS } from '../core/icons';

export default function SpotListPanel() {
  const project = usePlayerStore((s) => s.project)!;
  const activeIndex = usePlayerStore((s) => s.activeSpotIndex);
  const setActiveSpot = usePlayerStore((s) => s.setActiveSpot);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active spot
  useEffect(() => {
    if (activeIndex === null || activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIndex]);

  return (
    <div className="spot-panel">
      <div className="spot-panel__header">
        <h2 className="spot-panel__title">{project.name}</h2>
        <span className="spot-panel__count">{project.spots.length} 景點</span>
      </div>
      <div className="spot-panel__list" ref={listRef}>
        {project.spots.map((spot, i) => {
          const icon = ICONS.find((ic) => ic.id === spot.iconId);
          return (
            <button
              key={spot.id}
              className={`spot-panel__item${activeIndex === i ? ' spot-panel__item--active' : ''}`}
              onClick={() => { setPlaying(false); setActiveSpot(i); }}
            >
              <span className="spot-panel__num">{spot.num}</span>
              <span className="spot-panel__icon">{icon?.emoji ?? '📍'}</span>
              <div className="spot-panel__text">
                <span className="spot-panel__name">{spot.title}</span>
                {spot.desc && (
                  <span className="spot-panel__desc">
                    {spot.desc.length > 40 ? spot.desc.slice(0, 40) + '...' : spot.desc}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
